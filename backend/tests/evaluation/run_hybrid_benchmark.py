#!/usr/bin/env python3
"""Benchmark keyword / vector / RRF hybrid retrieval on the Phase 0 corpus.

Chỉ dùng ``manifest.json`` + ``questions.json`` tổng hợp, PostgreSQL tạm và
``embedding_service`` đã cấu hình. Không đọc trực tiếp nội dung ``.env``, không
chạm database đang dùng của ứng dụng và không sửa thuật toán retrieval.

Chạy từ thư mục gốc repo:

    backend/.venv/bin/python backend/tests/evaluation/run_hybrid_benchmark.py

Vector được cache theo ``model_key()`` trong ``.runtime/phase2/vectors.json``;
chạy lại không gọi API trừ khi ``--refresh-vectors``. Khi không có pgvector,
script vẫn chạy keyword + EXPLAIN và ghi rõ lý do vector/hybrid unavailable.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable

EVAL_DIR = Path(__file__).resolve().parent
BACKEND_DIR = EVAL_DIR.parents[1]
for _path in (str(BACKEND_DIR), str(EVAL_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

import run_baseline as baseline  # noqa: E402

DEFAULT_K = 5
BATCH_SIZE = 32
MAX_CHUNK_CHARS = 1200

# DDL từ migration ea41b38547bc + f2c3d4e5a6b7 (benchmark-only, không sửa migration).
INDEX_DDL = (
    """CREATE TABLE document_index_runs (
      id bigserial PRIMARY KEY, document_id integer NOT NULL REFERENCES documents ON DELETE CASCADE,
      checksum text NOT NULL, model text NOT NULL DEFAULT '', processor integer NOT NULL DEFAULT 1,
      status text NOT NULL DEFAULT 'pending', is_active boolean NOT NULL DEFAULT false,
      attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
      last_error text, coverage jsonb NOT NULL DEFAULT '{}', summary jsonb
    )""",
    "CREATE UNIQUE INDEX uq_document_active_run ON document_index_runs(document_id) WHERE is_active",
    "CREATE INDEX ix_document_run_lookup ON document_index_runs(document_id,id DESC)",
    """CREATE TABLE document_chunks (
      id bigserial PRIMARY KEY, run_id bigint NOT NULL REFERENCES document_index_runs ON DELETE CASCADE,
      ordinal integer NOT NULL, body text NOT NULL, heading text NOT NULL, source text NOT NULL,
      location jsonb NOT NULL, search_vector tsvector NOT NULL, embedding vector,
      UNIQUE(run_id,ordinal)
    )""",
    "CREATE INDEX ix_chunk_fts ON document_chunks USING gin(search_vector)",
)

VECTOR_SQL = """
WITH visible AS ({visible}),
ranked AS (
  SELECT DISTINCT ON (d.id) d.id, c.id AS chunk_id,
         c.embedding <=> CAST(:vec AS vector) AS distance
  FROM visible d
  JOIN document_index_runs r ON r.document_id=d.id AND r.checksum=d.checksum
       AND r.is_active AND r.model=:model
  JOIN document_chunks c ON c.run_id=r.id
  WHERE c.embedding IS NOT NULL
  ORDER BY d.id,distance,c.id
)
SELECT id FROM ranked ORDER BY distance,id LIMIT :size
"""


# ---------------------------------------------------------------------------
# Tiện ích dùng cả trong benchmark và test
# ---------------------------------------------------------------------------


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _save_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _checksum(doc: dict[str, Any]) -> str:
    return doc.get("sha256") or hashlib.sha256(
        f"{doc['id']}:{doc['title']}:{doc['description']}".encode("utf-8")
    ).hexdigest()


def chunks_from_text(text: str) -> list[dict[str, Any]]:
    """Chunk tổng hợp, deterministic — chỉ để seed pgvector trong benchmark."""
    chunks: list[dict[str, Any]] = []
    for block in re.split(r"\n\s*\n", (text or "").strip()):
        body = " ".join(block.split())
        while len(body) > MAX_CHUNK_CHARS:
            cut = body.rfind(" ", 0, MAX_CHUNK_CHARS)
            cut = cut if cut > 0 else MAX_CHUNK_CHARS
            chunks.append({"body": body[:cut], "heading": "", "source": "synthetic", "location": {}})
            body = body[cut:].lstrip()
        if body:
            chunks.append({"body": body, "heading": "", "source": "synthetic", "location": {}})
    return chunks


def provider_model_key() -> str:
    from app.services import embedding_service

    return embedding_service.model_key()


async def _call_provider(texts: list[str]) -> list[list[float]]:
    """Gọi embedding_service đã cấu hình; không đọc/hiện giá trị cấu hình."""
    from app.services import embedding_service

    return await embedding_service.embed(texts)


async def cached_embeddings(
    texts: list[str],
    *,
    model: str,
    cache_path: Path,
    offline: bool = False,
    refresh: bool = False,
) -> dict[str, list[float]]:
    """Trả về vector theo sha(text), lưu sau mỗi batch để không tốn API khi rerun."""
    cache = _load_json(cache_path)
    if refresh or cache.get("model") != model:
        cache = {"model": model, "vectors": {}}
    vectors: dict[str, list[float]] = cache["vectors"]
    missing = list(dict.fromkeys(text for text in texts if sha(text) not in vectors))

    for start in range(0, len(missing), BATCH_SIZE):
        batch = missing[start:start + BATCH_SIZE]
        if offline:
            raise RuntimeError(
                f"Thiếu {len(missing)} vector trong {cache_path}; chạy lại không có --offline "
                f"để gọi embedding_service, hoặc dùng đúng model_key ({model})."
            )
        embedded = await _call_provider(batch)
        if len(embedded) != len(batch):
            raise RuntimeError("embedding_service trả sai số lượng vector")
        for text, vector in zip(batch, embedded):
            vectors[sha(text)] = vector
        cache["model"] = model
        _save_json(cache_path, cache)

    if missing and not offline:
        _save_json(cache_path, cache)
    return {text: vectors[sha(text)] for text in dict.fromkeys(texts)}


def explain_sql(sql: str) -> str:
    return "EXPLAIN (ANALYZE, BUFFERS) " + " ".join(sql.split())


def summarize(rows: list[dict[str, Any]], k: int) -> dict[str, Any]:
    answerable = [row for row in rows if row["type"] == "answerable"]
    forbidden = [row for row in rows if row["type"] == "forbidden"]
    no_evidence = [row for row in rows if row["type"] == "no_evidence"]
    latencies = [row["latency_ms"] for row in rows]
    return {
        "n": len(rows),
        "answerable": {
            "n": len(answerable),
            "hit@1": baseline._rate(row["hit@1"] for row in answerable),
            "hit@3": baseline._rate(row["hit@3"] for row in answerable),
            f"hit@{k}": baseline._rate(row[f"hit@{k}"] for row in answerable),
            "mrr": baseline._mean([row["mrr"] for row in answerable]),
            "citation_hit": baseline._rate(row["citation_hit"] for row in answerable),
        },
        "forbidden": {
            "n": len(forbidden),
            "queries_with_leak": sum(1 for row in forbidden if row["leaked_any"]),
            "leaked_result_count": sum(len(row["leaked_ids"]) for row in forbidden),
            "leak_rate": baseline._rate(row["leaked_any"] for row in forbidden),
        },
        "no_evidence": {
            "n": len(no_evidence),
            "false_positive_rate": baseline._rate(row["false_positive"] for row in no_evidence),
        },
        "scope": {
            "queries": len(rows),
            "queries_with_denied_results": sum(1 for row in rows if row["denied_ids"]),
            "denied_result_count": sum(len(row["denied_ids"]) for row in rows),
        },
        "latency_ms": {
            "p50": baseline._percentile(latencies, 50),
            "p95": baseline._percentile(latencies, 95),
            "max": round(max(latencies), 2) if latencies else None,
        },
    }


def permission_flags(
    ranked_corpus: list[str],
    question: dict[str, Any],
    manifest: dict[str, Any],
) -> tuple[list[str], list[str], bool]:
    docs = {doc["id"]: doc for doc in manifest["documents"]}
    forbidden = set(question["forbidden_doc_ids"])
    leaked = [doc_id for doc_id in ranked_corpus if doc_id in forbidden]
    denied = [
        doc_id
        for doc_id in ranked_corpus
        if not baseline._accessible(docs[doc_id], question["user"], manifest["workspaces"])
    ]
    false_positive = question["type"] == "no_evidence" and bool(ranked_corpus)
    return leaked, denied, false_positive


def keyword_sql(uid: int, accessible_ws: list[int], k: int) -> str:
    scope = "(d.workspace_id IS NULL AND d.owner_id=:uid)"
    if accessible_ws:
        ids = ",".join(str(int(value)) for value in accessible_ws)
        scope = f"({scope} OR d.workspace_id IN ({ids}))"
    return f"""
        SELECT d.id, ts_rank(d.search_vector,
                 websearch_to_tsquery('simple',unaccent(:q))) AS rank
        FROM documents d
        WHERE NOT d.is_deleted AND ({scope})
          AND d.search_vector @@ websearch_to_tsquery('simple',unaccent(:q))
        ORDER BY rank DESC,d.id LIMIT :size
    """


def vector_sql() -> str:
    from app.services.evidence_search import _VISIBLE

    return VECTOR_SQL.format(visible=_VISIBLE)


class CapturingDB:
    """Ủy quyền AsyncSession và giữ lại SQL/params thật của evidence_search."""

    def __init__(self, session: Any) -> None:
        self.session = session
        self.captured: list[tuple[str, dict[str, Any]]] = []

    async def execute(self, statement: Any, params: dict[str, Any] | None = None) -> Any:
        self.captured.append((" ".join(str(statement).split()), dict(params or {})))
        return await self.session.execute(statement, params)


async def measure(
    name: str,
    searcher: Callable[[dict[str, Any], int], Awaitable[dict[str, Any]]],
    questions: list[dict[str, Any]],
    manifest: dict[str, Any],
    db_ids: dict[str, int],
    corpus_by_db: dict[int, str],
    users: dict[str, Any],
    k: int,
    explain_ids: set[str],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    rows: list[dict[str, Any]] = []
    explain_payloads: dict[str, dict[str, Any]] = {}
    warm = questions[0]
    await searcher(warm, users[warm["user"]]["id"])

    for question in questions:
        uid = users[question["user"]]["id"]
        started = time.perf_counter()
        result = await searcher(question, uid)
        latency_ms = (time.perf_counter() - started) * 1000

        ranked_db = result["ids"]
        ranked_corpus = [corpus_by_db[doc_id] for doc_id in ranked_db]
        gold = {db_ids[doc_id] for doc_id in question["gold_doc_ids"]}
        citation_db = db_ids.get((question.get("citation") or {}).get("doc_id") or "")
        citation_hit = bool(citation_db and citation_db in set(ranked_db))
        leaked, denied, false_positive = permission_flags(ranked_corpus, question, manifest)

        hit_at = [any(doc_id in gold for doc_id in ranked_db[:limit]) for limit in (1, 3, k)]
        row = {
            "id": question["id"],
            "split": question["split"],
            "type": question["type"],
            "user": question["user"],
            "query": question["query"],
            "top_ids": ranked_corpus,
            "gold": question["gold_doc_ids"],
            "forbidden": question["forbidden_doc_ids"],
            "citation_hit": citation_hit if question["type"] == "answerable" else None,
            "hit@1": hit_at[0] if question["type"] == "answerable" else None,
            "hit@3": hit_at[1] if question["type"] == "answerable" else None,
            f"hit@{k}": hit_at[2] if question["type"] == "answerable" else None,
            "mrr": baseline._mrr(ranked_db, gold, k) if question["type"] == "answerable" else None,
            "leaked_ids": leaked,
            "leaked_any": question["type"] == "forbidden" and bool(leaked),
            "denied_ids": denied,
            "false_positive": false_positive,
            "fallback": result.get("fallback"),
            "latency_ms": round(latency_ms, 2),
        }
        rows.append(row)
        if question["id"] in explain_ids and result.get("sql"):
            explain_payloads[question["id"]] = {
                "sql": result["sql"],
                "params": result.get("params", {}),
            }

    print(f"[bench] {name}: {len(rows)} queries, p50={summarize(rows, k)['latency_ms']['p50']}ms")
    return {"available": True, "summary": summarize(rows, k), "queries": rows}, explain_payloads


async def explain_queries(
    engine: Any,
    method: str,
    payloads: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    from sqlalchemy import text

    plans = []
    for query_id, payload in sorted(payloads.items()):
        params = payload["params"]
        async with engine.connect() as conn:
            result = await conn.execute(
                text(explain_sql(payload["sql"])),
                params,
            )
            plan = [row[0] for row in result.all()]
        plans.append({
            "method": method,
            "query_id": query_id,
            "sql": " ".join(payload["sql"].split()),
            "param_keys": sorted(params),
            "plan": plan,
        })
    return plans


# ---------------------------------------------------------------------------
# Setup PostgreSQL tạm + seed chunk/embedding
# ---------------------------------------------------------------------------


async def create_index_schema(engine: Any) -> tuple[bool, str | None]:
    from sqlalchemy import text

    try:
        async with engine.begin() as conn:
            await conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
            for ddl in INDEX_DDL:
                await conn.exec_driver_sql(ddl)
            version = (await conn.execute(text(
                "SELECT extversion FROM pg_extension WHERE extname='vector'"
            ))).scalar_one()
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"
    return True, str(version)


async def seed_index(
    engine: Any,
    manifest: dict[str, Any],
    db_ids: dict[str, int],
    model: str,
    vectors: dict[str, list[float]],
) -> int:
    from sqlalchemy import text

    by_doc: dict[str, list[dict[str, Any]]] = {}
    for doc in manifest["documents"]:
        if doc["format"] == "bundle":
            continue
        by_doc[doc["id"]] = chunks_from_text(doc["text"])

    count = 0
    async with engine.begin() as conn:
        for doc in manifest["documents"]:
            chunks = by_doc.get(doc["id"]) or []
            if not chunks:
                continue
            run_id = (await conn.execute(text("""
                INSERT INTO document_index_runs(document_id,checksum,model,status,is_active,coverage)
                VALUES (:doc,:checksum,:model,'ready',true,cast(:coverage as jsonb)) RETURNING id
            """), {
                "doc": db_ids[doc["id"]],
                "checksum": _checksum(doc),
                "model": model,
                "coverage": json.dumps({"state": "full", "unit": "section", "read": len(chunks), "total": len(chunks)}),
            })).scalar_one()
            await conn.execute(text("""
                INSERT INTO document_chunks
                    (run_id,ordinal,body,heading,source,location,search_vector,embedding)
                VALUES (:run_id,:ordinal,:body,:heading,:source,cast(:location as jsonb),
                        to_tsvector('simple',unaccent(:body)),cast(:embedding as vector))
            """), [{
                "run_id": run_id,
                "ordinal": ordinal,
                "body": chunk["body"],
                "heading": chunk["heading"],
                "source": chunk["source"],
                "location": json.dumps(chunk["location"]),
                "embedding": json.dumps(vectors[chunk["body"]]),
            } for ordinal, chunk in enumerate(chunks)])
            count += len(chunks)
    return count


async def accessible_workspaces(engine: Any, manifest: dict[str, Any]) -> dict[str, list[int]]:
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.services.search_service import SearchService

    result: dict[str, list[int]] = {}
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        for key, user in manifest["users"].items():
            result[key] = await SearchService._get_accessible_workspace_ids(db, user["id"])
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def _dataset() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest_path = EVAL_DIR / "manifest.json"
    questions_path = EVAL_DIR / "questions.json"
    if not manifest_path.exists() or not questions_path.exists():
        raise SystemExit(
            "Thiếu manifest.json/questions.json. Chạy trước:\n"
            "  backend/.venv/bin/python backend/tests/evaluation/generate_corpus.py"
        )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    questions = json.loads(questions_path.read_text(encoding="utf-8"))["questions"]
    return manifest, questions


async def run(args: argparse.Namespace) -> dict[str, Any]:
    manifest, questions = _dataset()
    dataset_hash = manifest["dataset_hash"]
    if args.expect_dataset_hash and dataset_hash != args.expect_dataset_hash:
        raise SystemExit(f"Dataset hash không khớp: {dataset_hash}")

    k = args.k
    cache_path = args.cache_dir / "vectors.json"
    pg = None
    admin_engine = None
    benchmark_schema = None
    engine = None
    try:
        if args.configured_database:
            from sqlalchemy import text
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy.pool import NullPool
            from app.core.config import settings

            benchmark_schema = f"phase2_bench_{uuid.uuid4().hex[:12]}"
            admin_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
            async with admin_engine.begin() as conn:
                await conn.execute(text(f'CREATE SCHEMA "{benchmark_schema}"'))
            engine = await baseline._prepare_database(
                settings.DATABASE_URL,
                execution_options={"schema_translate_map": {None: benchmark_schema}},
                search_path=benchmark_schema,
            )
            isolation = f"temporary schema {benchmark_schema}, dropped after run"
            print(f"[pg] Schema tạm {benchmark_schema} trên PostgreSQL đã cấu hình")
        else:
            pg = baseline.TempPostgres(keep=args.keep_cluster, bindir=args.pg_bindir)
            print(f"[pg] Cluster tạm tại {pg.root} (port {pg.port})")
            pg.start()
            engine = await baseline._prepare_database(pg.url)
            isolation = "temporary cluster, removed after run"
        db_ids, _ = await baseline._seed(engine, manifest)
        corpus_by_db = {db_id: corpus_id for corpus_id, db_id in db_ids.items()}
        from sqlalchemy import text
        async with engine.connect() as conn:
            pg_version = (await conn.execute(text("SHOW server_version"))).scalar_one()

        model = provider_model_key()
        pgvector_ok, pgvector_reason = await create_index_schema(engine)
        if not pgvector_ok and args.require_pgvector:
            raise SystemExit(f"--require-pgvector: {pgvector_reason}")

        explain_ids = {
            next(q["id"] for q in questions if q["split"] == split and q["type"] == "answerable")
            for split in ("calibration", "evaluation")
        }
        ws_by_user = await accessible_workspaces(engine, manifest)
        from sqlalchemy.ext.asyncio import async_sessionmaker
        from app.services.search_service import SearchService
        session_factory = async_sessionmaker(engine, expire_on_commit=False)

        keyword_db = session_factory()
        try:
            async def keyword_searcher(question: dict[str, Any], uid: int) -> dict[str, Any]:
                result = await SearchService.full_text_search(
                    keyword_db, question["query"], uid, page=1, page_size=k
                )
                return {
                    "ids": [item.id for item in result["items"]],
                    "sql": keyword_sql(uid, ws_by_user[question["user"]], k),
                    "params": {"q": question["query"], "uid": uid, "size": k},
                }

            keyword, keyword_explains = await measure(
                "keyword", keyword_searcher, questions, manifest, db_ids, corpus_by_db,
                manifest["users"], k, explain_ids,
            )
        finally:
            await keyword_db.close()
        explains = await explain_queries(engine, "keyword", keyword_explains)

        reports: dict[str, Any] = {"keyword": keyword}
        vector_status = "unavailable"
        reason = pgvector_reason or "unknown"
        if not model:
            reason = "embedding_service chưa có model_key(); cần cấu hình provider hợp lệ"
        elif not pgvector_ok:
            reason = f"pgvector chưa sẵn sàng trong cluster tạm: {pgvector_reason}"
        else:
            from app.services import evidence_search

            try:
                query_texts = [q["query"] for q in questions]
                chunk_texts = [
                    chunk["body"]
                    for doc in manifest["documents"] if doc["format"] != "bundle"
                    for chunk in chunks_from_text(doc["text"])
                ]
                vectors = await cached_embeddings(
                    query_texts + chunk_texts,
                    model=model,
                    cache_path=cache_path,
                    offline=args.offline,
                    refresh=args.refresh_vectors,
                )
                chunk_count = await seed_index(engine, manifest, db_ids, model, vectors)
                print(f"[db] {chunk_count} synthetic chunks seeded")
            except Exception as exc:
                reason = f"Không chuẩn bị được vector/chunk: {type(exc).__name__}: {exc}"
            else:
                # Không đổi thuật toán: chỉ thay transport provider bằng vector đã cache.
                async def cached_provider(inputs: list[str]) -> list[list[float]]:
                    return [vectors[text] for text in inputs]

                evidence_search.vectors = cached_provider

                vector_conn = await engine.connect()
                hybrid_db = session_factory()
                try:
                    async def vector_searcher(question: dict[str, Any], uid: int) -> dict[str, Any]:
                        params = {
                            "uid": uid,
                            "vec": json.dumps(vectors[question["query"]]),
                            "model": model,
                            "size": k,
                        }
                        result = await vector_conn.execute(text(vector_sql()), params)
                        return {
                            "ids": [row[0] for row in result.all()],
                            "sql": vector_sql(),
                            "params": params,
                        }

                    async def hybrid_searcher(question: dict[str, Any], uid: int) -> dict[str, Any]:
                        captured = CapturingDB(hybrid_db)
                        result = await evidence_search.search(
                            captured, uid, question["query"], 1, k
                        )
                        sql, params = captured.captured[-1]
                        return {
                            "ids": [item["id"] for item in result["items"]],
                            "fallback": result["fallback"],
                            "sql": sql,
                            "params": params,
                        }

                    vector, vector_explains = await measure(
                        "vector", vector_searcher, questions, manifest, db_ids, corpus_by_db,
                        manifest["users"], k, explain_ids,
                    )
                    hybrid, hybrid_explains = await measure(
                        "hybrid", hybrid_searcher, questions, manifest, db_ids, corpus_by_db,
                        manifest["users"], k, explain_ids,
                    )
                finally:
                    await vector_conn.close()
                    await hybrid_db.close()
                reports["vector"] = vector
                reports["hybrid"] = hybrid
                for method, payloads in (("vector", vector_explains), ("hybrid", hybrid_explains)):
                    explains.extend(await explain_queries(engine, method, payloads))
                vector_status = "ok"
        if "vector" not in reports:
            unavailable = {"available": False, "reason": reason}
            reports["vector"] = unavailable
            reports["hybrid"] = unavailable

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "environment": {
                "postgres_version": pg_version,
                "python": sys.version.split()[0],
                "k": k,
                "pgvector": vector_status,
                "pgvector_reason": None if vector_status == "ok" else reason,
                "vector_cache": str(cache_path),
                "embedding": "app.services.embedding_service (cached by model_key)",
                "isolated_cluster": isolation,
            },
            "dataset": {
                "version": manifest["dataset_version"],
                "dataset_hash": dataset_hash,
                "documents": len(manifest["documents"]),
                "questions": len(questions),
                "splits": manifest["summary"]["splits"],
            },
            "methods": reports,
            "explain": explains,
            "limitations": [
                "Chỉ 30 tài liệu/60 câu tổng hợp; không phải dữ liệu thật.",
                "Latency đo retrieval, không tính chi phí gọi embedding (vector đã cache).",
                "EXPLAIN chạy trên cùng SQL/params với truy vấn benchmark; PLAN có thể đổi theo hardware.",
                "Khi pgvector khuyết, vector/hybrid bị bỏ qua và ghi unavailable.",
            ],
        }
    finally:
        if engine is not None:
            await engine.dispose()
        if admin_engine is not None and benchmark_schema is not None:
            from sqlalchemy import text
            async with admin_engine.begin() as conn:
                await conn.execute(text(f'DROP SCHEMA IF EXISTS "{benchmark_schema}" CASCADE'))
            await admin_engine.dispose()
        if pg is not None:
            pg.stop()


def markdown(report: dict[str, Any], k: int) -> str:
    lines: list[str] = []
    add = lines.append
    env = report["environment"]
    add("# Benchmark tìm kiếm keyword / vector / RRF hybrid — Phase 2B")
    add("")
    add(f"- Thời điểm: `{report['generated_at']}`")
    add(f"- PostgreSQL: `{env['postgres_version']}`; pgvector: `{env['pgvector']}`")
    if env["pgvector_reason"]:
        reason = " ".join(env["pgvector_reason"].split())
        add(f"- Lý do vector/hybrid unavailable: `{reason}`")
    add(f"- Dataset: `{report['dataset']['version']}` — `{report['dataset']['dataset_hash'][:16]}…`")
    add(f"- Top-{k}, 30 tài liệu / 60 câu; retrieval-only latency (embedding đã cache)")
    add("")
    add(f"## So sánh top-{k}")
    add("")
    add(f"| Method | Hit@1 | Hit@3 | Hit@{k} | MRR@{k} | Citation@{k} | p50 (ms) | p95 (ms) |")
    add("|---|---:|---:|---:|---:|---:|---:|---:|")
    for method in ("keyword", "vector", "hybrid"):
        data = report["methods"][method]
        if not data.get("available"):
            add(f"| {method} | — | — | — | — | — | — | — |")
            continue
        a = data["summary"]["answerable"]
        latency = data["summary"]["latency_ms"]
        add(
            f"| {method} | {a['hit@1']:.3f} | {a['hit@3']:.3f} | {a[f'hit@{k}']:.3f} | "
            f"{a['mrr']:.3f} | {a['citation_hit']:.3f} | {latency['p50']} | {latency['p95']} |"
        )
    add("")
    add("## Rò rỉ quyền / false positive")
    add("")
    add("| Method | Forbidden leak | Denied results | No-evidence FP |")
    add("|---|---:|---:|---:|")
    for method in ("keyword", "vector", "hybrid"):
        data = report["methods"][method]
        if not data.get("available"):
            add(f"| {method} | — | — | — |")
            continue
        f = data["summary"]["forbidden"]
        scope = data["summary"]["scope"]
        n = data["summary"]["no_evidence"]
        add(
            f"| {method} | {f['queries_with_leak']}/{f['n']} ({f['leaked_result_count']} items) | "
            f"{scope['denied_result_count']} | {n['false_positive_rate']} |"
        )
    add("")
    add("## EXPLAIN (ANALYZE, BUFFERS)")
    add("")
    if not report["explain"]:
        add("Không có plan nào; xem `pgvector_reason` ở phần đầu.")
    for plan in report["explain"]:
        add(f"### {plan['method']} — `{plan['query_id']}`")
        add("")
        add("SQL:")
        add("")
        add("```sql")
        add(plan["sql"].strip())
        add("```")
        add("")
        add("Plan:")
        add("")
        add("```text")
        add("\n".join(line.strip() for line in plan["plan"]))
        add("```")
        add("")
    add("## Ghi chú phương pháp")
    add("")
    for note in report["limitations"]:
        add(f"- {note}")
    add("- Keyword dùng `SearchService.full_text_search`; hybrid dùng `evidence_search.search` nguyên vẹn.")
    add("- Vector-only dùng branch semantic của hybrid, scope `evidence_search._VISIBLE`.")
    add("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--k", type=int, default=DEFAULT_K, help="Top-k (mặc định 5)")
    parser.add_argument("--pg-bindir", help="Thư mục chứa initdb/pg_ctl")
    parser.add_argument("--keep-cluster", action="store_true", help="Giữ cluster tạm để debug")
    parser.add_argument("--expect-dataset-hash", help="Fail nếu manifest không khớp hash")
    parser.add_argument("--out-dir", type=Path, default=EVAL_DIR / "reports", help="Thư mục ghi reports")
    parser.add_argument("--cache-dir", type=Path, default=EVAL_DIR / ".runtime" / "phase2", help="Thư mục cache vector")
    parser.add_argument("--offline", action="store_true", help="Chỉ dùng vector đã cache, không gọi API")
    parser.add_argument("--refresh-vectors", action="store_true", help="Bắt buộc gọi lại embedding_service")
    parser.add_argument("--require-pgvector", action="store_true", help="Fail nếu pgvector không có")
    parser.add_argument(
        "--configured-database",
        action="store_true",
        help="Dùng schema tạm tự xóa trên PostgreSQL trong Settings",
    )
    args = parser.parse_args()
    if args.k < 1:
        raise SystemExit("--k phải >= 1")

    report = asyncio.run(run(args))
    out_dir = args.out_dir if args.out_dir.is_absolute() else EVAL_DIR / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "hybrid_benchmark.json"
    md_path = out_dir / "hybrid_benchmark.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(markdown(report, args.k), encoding="utf-8")

    print("\n=== KẾT QUẢ BENCHMARK ===")
    for method in ("keyword", "vector", "hybrid"):
        data = report["methods"][method]
        if not data.get("available"):
            print(f"{method}: unavailable — {' '.join(data['reason'].split())}")
            continue
        a = data["summary"]["answerable"]
        latency = data["summary"]["latency_ms"]
        leak = data["summary"]["forbidden"]["queries_with_leak"]
        print(
            f"{method}: hit@5={a['hit@5']:.3f} mrr={a['mrr']:.3f} "
            f"p50={latency['p50']}ms p95={latency['p95']}ms leak={leak}"
        )
    print(f"Đã ghi: {json_path}")
    print(f"Đã ghi: {md_path}")


if __name__ == "__main__":
    main()
