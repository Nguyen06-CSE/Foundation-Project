#!/usr/bin/env python3
"""Baseline tìm kiếm toàn văn (Phase 0B) trên PostgreSQL tạm.

Runner này cố ý *không* dùng database đang chạy của ứng dụng:

1. Khởi tạo một PostgreSQL cluster tạm bằng ``initdb``/``pg_ctl``.
2. Tạo schema từ chính model SQLAlchemy của ứng dụng.
3. Cài đúng trigger ``update_document_search_vector`` của migration
   ``b7c8d9e0f1a2`` (unaccent + simple, weight A/B/C).
4. Trích xuất text từ 30 file fixture bằng ``file_processor.extract_text``
   (PDF text layer, OCR fallback, DOCX, PPTX).
5. Chạy ``SearchService.full_text_search`` với từng câu hỏi, đo Hit@k,
   MRR@k, rò rỉ quyền và false-positive cho câu không có căn cứ.

Chạy từ thư mục gốc repo:

    .venv/bin/python backend/tests/evaluation/generate_corpus.py
    .venv/bin/python backend/tests/evaluation/run_baseline.py

Kết quả mặc định ghi vào ``backend/tests/evaluation/reports/``.
"""

from __future__ import annotations

import argparse
import asyncio
import atexit
import hashlib
import json
import os
import re
import shutil
import socket
import statistics
import subprocess
import sys
import tempfile
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

EVAL_DIR = Path(__file__).resolve().parent
BACKEND_DIR = EVAL_DIR.parents[1]
REPO_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DEFAULT_K = 5
FTS_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', unaccent(coalesce(NEW.title, ''))), 'A') ||
        setweight(to_tsvector('simple', unaccent(coalesce(NEW.description, ''))), 'B') ||
        setweight(to_tsvector('simple', unaccent(coalesce(NEW.content, ''))), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

FTS_TRIGGER_SQL = """
CREATE TRIGGER trg_documents_search_vector
BEFORE INSERT OR UPDATE OF title, description, content
ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_search_vector();
"""

MIME_BY_FORMAT = {
    "pdf_text": "application/pdf",
    "pdf_scan": "application/pdf",
    "pdf_mixed": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


# ---------------------------------------------------------------------------
# Tiện ích
# ---------------------------------------------------------------------------


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _norm_tokens(value: str) -> list[str]:
    value = unicodedata.normalize("NFD", value or "").lower()
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    value = value.replace("đ", "d")
    return re.findall(r"[a-z0-9]+", value)


def _token_recall(expected: str, extracted: str) -> float:
    expected_tokens = set(_norm_tokens(expected))
    if not expected_tokens:
        return 1.0
    extracted_tokens = set(_norm_tokens(extracted))
    return len(expected_tokens & extracted_tokens) / len(expected_tokens)


def _percentile(values: list[float], pct: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int(round((pct / 100) * (len(ordered) - 1)))))
    return round(ordered[index], 2)


def _mean(values: list[float]) -> float | None:
    return round(statistics.fmean(values), 4) if values else None


def _rate(values: Iterable[bool]) -> float | None:
    values = list(values)
    return round(sum(1 for v in values if v) / len(values), 4) if values else None


def _json_default(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Không serialize được {type(value)!r}")


# ---------------------------------------------------------------------------
# PostgreSQL tạm
# ---------------------------------------------------------------------------


class TempPostgres:
    def __init__(self, *, keep: bool = False, bindir: str | None = None) -> None:
        self.keep = keep
        self.bindir = Path(bindir or self._detect_bindir())
        self.root = Path(tempfile.mkdtemp(prefix="foundation-eval-pg-"))
        self.data = self.root / "data"
        self.port = _free_port()
        self.started = False
        self.stopped = False
        self.url = f"postgresql+asyncpg://postgres@127.0.0.1:{self.port}/evaluation"
        atexit.register(self.stop)

    @staticmethod
    def _detect_bindir() -> str:
        bindir = shutil.which("pg_config")
        if bindir:
            result = subprocess.run([bindir, "--bindir"], capture_output=True, text=True, check=False)
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        for candidate in (
            "/opt/homebrew/opt/postgresql@18/bin",
            "/opt/homebrew/opt/postgresql/bin",
            "/usr/local/opt/postgresql@18/bin",
            "/usr/lib/postgresql/18/bin",
        ):
            if Path(candidate, "initdb").exists():
                return candidate
        raise RuntimeError("Không tìm thấy initdb/pg_ctl; cài PostgreSQL hoặc truyền --pg-bindir")

    def _run(self, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(list(args), capture_output=True, text=True, check=False)
        if check and result.returncode != 0:
            raise RuntimeError(
                f"Lệnh thất bại ({result.returncode}): {' '.join(args)}\n"
                f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
            )
        return result

    def start(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self._run(
            str(self.bindir / "initdb"),
            "-D", str(self.data),
            "-A", "trust",
            "-U", "postgres",
            "--no-locale",
            "--encoding=UTF8",
        )
        self._run(
            str(self.bindir / "pg_ctl"),
            "-D", str(self.data),
            "-l", str(self.root / "postgres.log"),
            "-o",
            f"-p {self.port} -c listen_addresses=127.0.0.1 "
            f"-c unix_socket_directories={self.root}",
            "-w",
            "start",
        )
        self.started = True
        self._run(
            str(self.bindir / "createdb"),
            "-h", "127.0.0.1",
            "-p", str(self.port),
            "-U", "postgres",
            "evaluation",
        )

    def stop(self) -> None:
        if self.stopped:
            return
        self.stopped = True
        if self.started:
            try:
                self._run(
                    str(self.bindir / "pg_ctl"),
                    "-D", str(self.data),
                    "-m", "fast",
                    "-w",
                    "stop",
                    check=False,
                )
            except Exception:
                pass
        if self.keep and self.root.exists():
            print(f"[pg] Giữ cluster tạm để debug: {self.root}")
        else:
            shutil.rmtree(self.root, ignore_errors=True)


# ---------------------------------------------------------------------------
# Trích xuất text
# ---------------------------------------------------------------------------

_EXTRACTOR = None
_EXTRACTOR_TMP: tempfile.TemporaryDirectory[str] | None = None


def _load_extractor():
    """Import file_processor mà không tạo storage/ ngoài thư mục cho phép."""
    global _EXTRACTOR, _EXTRACTOR_TMP
    if _EXTRACTOR is not None:
        return _EXTRACTOR
    _EXTRACTOR_TMP = tempfile.TemporaryDirectory(prefix="foundation-eval-extract-")
    cwd = Path.cwd()
    try:
        os.chdir(_EXTRACTOR_TMP.name)
        from app.services.file_processor import extract_text

        _EXTRACTOR = extract_text
    finally:
        os.chdir(cwd)
    return _EXTRACTOR


def _pdf_layer_stats(path: Path) -> tuple[int, int]:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        texts = [(page.extract_text() or "").strip() for page in pdf.pages]
    text_pages = sum(1 for text in texts if text)
    return text_pages, len(texts) - text_pages


def _extract_document(doc: dict[str, Any]) -> dict[str, Any]:
    fmt = doc["format"]
    if fmt == "bundle":
        return {
            "content": doc["description"],
            "chars": len(doc["description"]),
            "text_pages": 0,
            "scanned_pages": 0,
            "ocr_used": False,
            "extractor": "bundle_description",
        }

    path = EVAL_DIR / doc["file"]
    extract_text = _load_extractor()
    mime = MIME_BY_FORMAT[doc["format"]]
    content = extract_text(str(path), mime) or ""
    text_pages = scanned_pages = 0
    if fmt.startswith("pdf_"):
        text_pages, scanned_pages = _pdf_layer_stats(path)
    ocr_used = fmt == "pdf_scan" or (fmt == "pdf_text" and text_pages == 0)
    return {
        "content": content,
        "chars": len(content),
        "text_pages": text_pages,
        "scanned_pages": scanned_pages,
        "ocr_used": ocr_used,
        "extractor": "app.services.file_processor.extract_text",
    }


# ---------------------------------------------------------------------------
# Seed database
# ---------------------------------------------------------------------------


async def _prepare_database(
    url: str,
    *,
    connect_args: dict[str, Any] | None = None,
    execution_options: dict[str, Any] | None = None,
    search_path: str | None = None,
):
    from sqlalchemy import event
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    from app.models import Base

    engine = create_async_engine(
        url,
        poolclass=NullPool,
        connect_args=connect_args or {},
        execution_options=execution_options or {},
    )
    if search_path:
        if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", search_path):
            raise ValueError("search_path benchmark không hợp lệ")

        @event.listens_for(engine.sync_engine, "connect")
        def _set_search_path(dbapi_connection, _record):
            cursor = dbapi_connection.cursor()
            cursor.execute(f'SET search_path TO "{search_path}", public')
            cursor.close()
    async with engine.begin() as conn:
        await conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS unaccent")
        await conn.run_sync(Base.metadata.create_all)
        await conn.exec_driver_sql(FTS_FUNCTION_SQL)
        await conn.exec_driver_sql("DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents")
        await conn.exec_driver_sql(FTS_TRIGGER_SQL)
    return engine


def _build_document_rows(manifest: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int], dict[str, Any]]:
    documents = manifest["documents"]
    db_id_by_corpus: dict[str, int] = {}
    extractions: dict[str, Any] = {}
    for index, doc in enumerate(documents, start=1):
        db_id_by_corpus[doc["id"]] = index
        extraction = _extract_document(doc)
        extractions[doc["id"]] = extraction

    rows: list[dict[str, Any]] = []
    for doc in documents:
        db_id = db_id_by_corpus[doc["id"]]
        extraction = extractions[doc["id"]]
        is_bundle = doc["format"] == "bundle"
        checksum = doc.get("sha256") or hashlib.sha256(
            f"{doc['id']}:{doc['title']}:{doc['description']}".encode("utf-8")
        ).hexdigest()
        file_path = (
            "__bundle__"
            if is_bundle
            else str((Path("tests") / "evaluation" / doc["file"]).as_posix())
        )
        rows.append(
            {
                "id": db_id,
                "owner_id": doc["owner_id"],
                "workspace_id": doc["workspace_id"],
                "title": doc["title"],
                "description": doc["description"],
                "file_path": file_path,
                "file_type": None if is_bundle else MIME_BY_FORMAT[doc["format"]],
                "file_size": int(doc.get("size") or 0),
                "checksum": checksum,
                "content": extraction["content"],
                "is_important": False,
                "is_deleted": False,
                "is_orphaned": False,
                "is_public": False,
                "is_bundle": is_bundle,
                "bundle_parent_id": None,
            }
        )

    # Gắn children vào bundle cha sau khi insert để tránh FK check theo từng row.
    bundle_links = [
        (db_id_by_corpus[child], db_id_by_corpus[doc["id"]])
        for doc in documents
        if doc["format"] == "bundle"
        for child in doc["bundle_children"]
    ]
    return rows, db_id_by_corpus, extractions, bundle_links


async def _seed(engine, manifest: dict[str, Any]) -> tuple[dict[str, int], dict[str, Any]]:
    from app.models import Document, Tag, User, Workspace, WorkspaceMember
    from app.models.document_tag import document_tags

    users = manifest["users"]
    workspaces = manifest["workspaces"]

    async with engine.begin() as conn:
        await conn.execute(
            User.__table__.insert(),
            [
                {
                    "id": user["id"],
                    "username": key,
                    "email": f"{key}@example.test",
                    "password_hash": "not-a-real-hash",
                    "full_name": user["name"],
                    "role": "student",
                }
                for key, user in users.items()
            ],
        )
        await conn.execute(
            Workspace.__table__.insert(),
            [
                {
                    "id": workspace["id"],
                    "type": "group",
                    "name": workspace["name"],
                    "description": f"Không gian tổng hợp cho {workspace['name']}",
                    "owner_id": users[workspace["owner"]]["id"],
                    "default_member_permission": "view",
                    "is_deleted": False,
                    "is_dissolving": False,
                }
                for workspace in workspaces.values()
            ],
        )
        member_rows = []
        for workspace in workspaces.values():
            for member_key, permission in workspace["members"].items():
                member_rows.append(
                    {
                        "workspace_id": workspace["id"],
                        "user_id": users[member_key]["id"],
                        "permission_level": permission,
                    }
                )
        if member_rows:
            await conn.execute(WorkspaceMember.__table__.insert(), member_rows)

        document_rows, db_id_by_corpus, extractions, bundle_links = _build_document_rows(manifest)
        await conn.execute(Document.__table__.insert(), document_rows)
        if bundle_links:
            from sqlalchemy import update

            for child_id, parent_id in bundle_links:
                await conn.execute(
                    update(Document.__table__)
                    .where(Document.__table__.c.id == child_id)
                    .values(bundle_parent_id=parent_id)
                )

        tag_cache: dict[tuple[str, int | None, int | None], int] = {}
        tag_rows: list[dict[str, Any]] = []
        links: list[dict[str, int]] = []
        for doc in manifest["documents"]:
            workspace_id = doc["workspace_id"]
            owner_id = None if workspace_id else doc["owner_id"]
            for name in doc["tags"]:
                key = (name, workspace_id, owner_id)
                if key not in tag_cache:
                    tag_cache[key] = len(tag_rows) + 1
                    tag_rows.append(
                        {
                            "id": tag_cache[key],
                            "owner_id": owner_id,
                            "workspace_id": workspace_id,
                            "name": name,
                            "color": "#2563eb",
                        }
                    )
                links.append(
                    {"document_id": db_id_by_corpus[doc["id"]], "tag_id": tag_cache[key]}
                )
        if tag_rows:
            await conn.execute(Tag.__table__.insert(), tag_rows)
            await conn.execute(document_tags.insert(), links)

    return db_id_by_corpus, {"documents": len(document_rows), "tags": len(tag_rows), "extractions": extractions}


# ---------------------------------------------------------------------------
# Đánh giá
# ---------------------------------------------------------------------------


def _accessible(doc: dict[str, Any], user_key: str, workspaces: dict[str, Any]) -> bool:
    if doc["workspace"] is None:
        return doc["owner"] == user_key
    workspace = workspaces[doc["workspace"]]
    return workspace["owner"] == user_key or user_key in workspace["members"]


def _rank_ids(result: dict[str, Any]) -> list[int]:
    return [item.id for item in result["items"]]


def _mrr(ranked: list[int], gold: set[int], k: int) -> float:
    for index, doc_id in enumerate(ranked[:k], start=1):
        if doc_id in gold:
            return 1.0 / index
    return 0.0


async def _naive_unscoped(engine, query: str, k: int) -> list[int]:
    from sqlalchemy import text

    sql = text(
        """
        WITH tsq AS (
            SELECT websearch_to_tsquery('simple', unaccent(:query)) AS q
        )
        SELECT d.id
        FROM documents d, tsq
        WHERE d.is_deleted = false
          AND d.search_vector @@ tsq.q
        ORDER BY ts_rank(d.search_vector, tsq.q) DESC, d.id ASC
        LIMIT :k
        """
    )
    async with engine.connect() as conn:
        result = await conn.execute(sql, {"query": query, "k": k})
        return [row[0] for row in result.all()]


async def _evaluate(engine, manifest: dict[str, Any], questions: list[dict[str, Any]], k: int) -> dict[str, Any]:
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from sqlalchemy.pool import NullPool

    from app.services.search_service import SearchService

    db_id_by_corpus: dict[str, int] = {}
    corpus_id_by_db: dict[int, str] = {}
    documents = manifest["documents"]
    for index, doc in enumerate(documents, start=1):
        db_id_by_corpus[doc["id"]] = index
        corpus_id_by_db[index] = doc["id"]
    docs_by_corpus = {doc["id"]: doc for doc in documents}
    users = manifest["users"]
    workspaces = manifest["workspaces"]

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    rows: list[dict[str, Any]] = []
    # Làm nóng cache/plan trước khi đo latency.
    async with session_factory() as db:
        await SearchService.full_text_search(db, "khởi động", users["sv_an"]["id"], page=1, page_size=k)

    async with session_factory() as db:
        for question in questions:
            started = time.perf_counter()
            result = await SearchService.full_text_search(
                db,
                question["query"],
                users[question["user"]]["id"],
                page=1,
                page_size=k,
            )
            elapsed_ms = (time.perf_counter() - started) * 1000
            ranked = _rank_ids(result)
            ranked_corpus = [corpus_id_by_db[doc_id] for doc_id in ranked]

            gold = {db_id_by_corpus[doc_id] for doc_id in question["gold_doc_ids"]}
            forbidden = {db_id_by_corpus[doc_id] for doc_id in question["forbidden_doc_ids"]}
            hit_at = [any(doc_id in gold for doc_id in ranked[:limit]) for limit in (1, 3, k)]
            citation_id = (question.get("citation") or {}).get("doc_id")
            citation_db = db_id_by_corpus.get(citation_id) if citation_id else None
            leaked = [doc_id for doc_id in ranked if doc_id in forbidden]
            denied = [
                doc_id
                for doc_id in ranked
                if not _accessible(docs_by_corpus[corpus_id_by_db[doc_id]], question["user"], workspaces)
            ]

            unscoped_rank = (
                await _naive_unscoped(engine, question["query"], k)
                if question["type"] == "forbidden"
                else []
            )
            unscoped_forbidden = [doc_id for doc_id in unscoped_rank if doc_id in forbidden]

            rows.append(
                {
                    "id": question["id"],
                    "split": question["split"],
                    "type": question["type"],
                    "user": question["user"],
                    "query_style": question["query_style"],
                    "query": question["query"],
                    "top_ids": ranked_corpus,
                    "top_titles": [item.title for item in result["items"]],
                    "top_snippets": [item.snippet for item in result["items"]],
                    "gold": question["gold_doc_ids"],
                    "forbidden": question["forbidden_doc_ids"],
                    "hit@1": hit_at[0] if question["type"] == "answerable" else None,
                    "hit@3": hit_at[1] if question["type"] == "answerable" else None,
                    f"hit@{k}": hit_at[2] if question["type"] == "answerable" else None,
                    "mrr": round(_mrr(ranked, gold, k), 4) if question["type"] == "answerable" else None,
                    "citation_hit": (
                        bool(citation_db and citation_db in ranked)
                        if question["type"] == "answerable"
                        else None
                    ),
                    "leaked_forbidden_ids": [corpus_id_by_db[doc_id] for doc_id in leaked],
                    "leaked_any": bool(leaked) if question["type"] == "forbidden" else None,
                    "unscoped_forbidden_ids": [corpus_id_by_db[doc_id] for doc_id in unscoped_forbidden],
                    "unscoped_retrieved": bool(unscoped_forbidden) if question["type"] == "forbidden" else None,
                    "denied_ids": [corpus_id_by_db[doc_id] for doc_id in denied],
                    "false_positive": bool(ranked) if question["type"] == "no_evidence" else None,
                    "latency_ms": round(elapsed_ms, 2),
                }
            )

    def summarize(split_rows: list[dict[str, Any]]) -> dict[str, Any]:
        answerable = [row for row in split_rows if row["type"] == "answerable"]
        forbidden = [row for row in split_rows if row["type"] == "forbidden"]
        no_evidence = [row for row in split_rows if row["type"] == "no_evidence"]
        latencies = [row["latency_ms"] for row in split_rows]
        return {
            "answerable": {
                "n": len(answerable),
                "hit@1": _rate(row["hit@1"] for row in answerable),
                "hit@3": _rate(row["hit@3"] for row in answerable),
                f"hit@{k}": _rate(row[f"hit@{k}"] for row in answerable),
                "mrr": _mean([row["mrr"] for row in answerable]),
                "citation_hit": _rate(row["citation_hit"] for row in answerable),
            },
            "forbidden": {
                "n": len(forbidden),
                "queries_with_leak": sum(1 for row in forbidden if row["leaked_any"]),
                "leak_rate": _rate(row["leaked_any"] for row in forbidden),
                "unscoped_retrieval_rate": _rate(row["unscoped_retrieved"] for row in forbidden),
            },
            "no_evidence": {
                "n": len(no_evidence),
                "false_positive_rate": _rate(row["false_positive"] for row in no_evidence),
            },
            "scope": {
                "queries": len(split_rows),
                "queries_with_denied_results": sum(1 for row in split_rows if row["denied_ids"]),
                "denied_result_count": sum(len(row["denied_ids"]) for row in split_rows),
            },
            "latency_ms": {
                "median": round(statistics.median(latencies), 2) if latencies else None,
                "p95": _percentile(latencies, 95),
                "max": round(max(latencies), 2) if latencies else None,
            },
        }

    summary = {
        "calibration": summarize([row for row in rows if row["split"] == "calibration"]),
        "evaluation": summarize([row for row in rows if row["split"] == "evaluation"]),
    }
    summary["overall"] = summarize(rows)
    return {"summary": summary, "queries": rows}


# ---------------------------------------------------------------------------
# Báo cáo
# ---------------------------------------------------------------------------


def _extraction_summary(manifest: dict[str, Any], extractions: dict[str, Any]) -> dict[str, Any]:
    by_format: dict[str, list[float]] = defaultdict(list)
    details: list[dict[str, Any]] = []
    for doc in manifest["documents"]:
        extraction = extractions[doc["id"]]
        recall = _token_recall(doc["text"], extraction["content"])
        by_format[doc["format"]].append(recall)
        details.append(
            {
                "id": doc["id"],
                "format": doc["format"],
                "chars": extraction["chars"],
                "expected_chars": len(doc["text"]),
                "token_recall": round(recall, 4),
                "text_pages": extraction["text_pages"],
                "scanned_pages": extraction["scanned_pages"],
                "ocr_used": extraction["ocr_used"],
                "extractor": extraction["extractor"],
            }
        )
    return {
        "by_format": {
            fmt: {
                "documents": len(values),
                "mean_token_recall": _mean(values),
                "min_token_recall": round(min(values), 4),
            }
            for fmt, values in sorted(by_format.items())
        },
        "documents": details,
    }


def _markdown_report(report: dict[str, Any], k: int) -> str:
    lines: list[str] = []
    add = lines.append
    add("# Baseline tìm kiếm toàn văn — Phase 0B")
    add("")
    add(f"- Thời điểm chạy: `{report['generated_at']}`")
    add(f"- PostgreSQL: `{report['environment']['postgres_version']}`")
    add(f"- Dataset: `{report['dataset']['version']}` — `{report['dataset']['dataset_hash'][:16]}…`")
    add(f"- 30 tài liệu / 60 câu hỏi; Hit@{k}, MRR@{k}")
    add("")
    add("## Tổng hợp")
    add("")
    add(f"| Tập | Answerable | Hit@1 | Hit@3 | Hit@{k} | MRR@{k} | Citation@{k} | Forbidden leak | No-evidence FP |")
    add("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for split in ("calibration", "evaluation", "overall"):
        s = report["baseline"]["summary"][split]
        a = s["answerable"]
        f = s["forbidden"]
        n = s["no_evidence"]
        add(
            f"| {split} | {a['n']} | {a['hit@1']:.3f} | {a['hit@3']:.3f} | "
            f"{a[f'hit@{k}']:.3f} | {a['mrr']:.3f} | {a['citation_hit']:.3f} | "
            f"{f['queries_with_leak']}/{f['n']} | {n['false_positive_rate']:.3f} |"
        )
    add("")
    add("## Hiệu năng")
    add("")
    latency = report["baseline"]["summary"]["overall"]["latency_ms"]
    add(
        f"- `full_text_search`: median **{latency['median']} ms**, "
        f"p95 **{latency['p95']} ms**, max **{latency['max']} ms** cho một query."
    )
    add("")
    add("## Rò rỉ quyền")
    add("")
    scope = report["baseline"]["summary"]["overall"]["scope"]
    add(
        f"- Query có kết quả ngoài quyền: **{scope['queries_with_denied_results']}/{scope['queries']}**; "
        f"tổng kết quả ngoài quyền: **{scope['denied_result_count']}**."
    )
    unscoped = report["baseline"]["summary"]["overall"]["forbidden"]["unscoped_retrieval_rate"]
    add(
        f"- Tỷ lệ câu forbidden tìm thấy tài liệu cấm khi bỏ scope (kiểm tra fixture): **{unscoped:.3f}**."
    )
    add("")
    add("## Trích xuất văn bản")
    add("")
    add("| Format | Số tài liệu | Token recall trung bình | Thấp nhất |")
    add("|---|---:|---:|---:|")
    for fmt, stats in report["corpus"]["extraction"]["by_format"].items():
        add(
            f"| {fmt} | {stats['documents']} | {stats['mean_token_recall']:.3f} | "
            f"{stats['min_token_recall']:.3f} |"
        )
    add("")
    add("## Câu hỏi không đạt")
    add("")
    misses = [
        row
        for row in report["queries"]
        if (row["type"] == "answerable" and not row[f"hit@{k}"])
        or (row["type"] == "forbidden" and row["leaked_any"])
        or (row["type"] == "no_evidence" and row["false_positive"])
    ]
    if not misses:
        add("Không có câu hỏi nào không đạt theo định nghĩa baseline.")
    else:
        add("| ID | Loại | Query | Top IDs | Gold/Forbidden | Ghi chú |")
        add("|---|---|---|---|---|---|")
        for row in misses:
            expected = row["gold"] if row["type"] == "answerable" else row["forbidden"]
            add(
                f"| {row['id']} | {row['type']} | {row['query']} | "
                f"{', '.join(row['top_ids']) or '—'} | {', '.join(expected) or '—'} | "
                f"{'FP' if row['type'] == 'no_evidence' else 'miss/leak'} |"
            )
    add("")
    add("## Ghi chú phương pháp")
    add("")
    add("- Chỉ số được tính trên top-k của `SearchService.full_text_search`, đúng scope cá nhân/nhóm.")
    add("- Câu `forbidden` đo rò rỉ tài liệu ngoài quyền; câu `no_evidence` đo false-positive vì corpus không có đáp án.")
    add("- `unscoped_retrieval_rate` chạy cùng truy vấn FTS nhưng bỏ điều kiện quyền, để xác nhận fixture thực sự chứa tài liệu cấm.")
    add("- Baseline dùng PostgreSQL tạm, schema từ model và trigger `b7c8d9e0f1a2`; không kết nối database đang chạy.")
    add("")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


async def _main_async(args: argparse.Namespace) -> dict[str, Any]:
    manifest_path = EVAL_DIR / "manifest.json"
    questions_path = EVAL_DIR / "questions.json"
    if not manifest_path.exists() or not questions_path.exists():
        raise SystemExit(
            "Thiếu manifest.json/questions.json. Chạy trước:\n"
            "  .venv/bin/python backend/tests/evaluation/generate_corpus.py"
        )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    questions = json.loads(questions_path.read_text(encoding="utf-8"))["questions"]

    expected_hash = manifest.get("dataset_hash")
    if expected_hash and args.expect_dataset_hash and expected_hash != args.expect_dataset_hash:
        raise SystemExit(f"Dataset hash không khớp: {expected_hash} != {args.expect_dataset_hash}")

    k = args.k
    pg = TempPostgres(keep=args.keep_cluster, bindir=args.pg_bindir)
    print(f"[pg] Khởi tạo cluster tạm tại {pg.root} (port {pg.port})")
    pg.start()
    engine = None
    try:
        print("[db] Tạo schema + trigger FTS chuẩn")
        engine = await _prepare_database(pg.url)
        db_id_by_corpus, seed_info = await _seed(engine, manifest)
        print(
            f"[db] Seed {seed_info['documents']} tài liệu, {seed_info['tags']} tag; "
            f"{len(db_id_by_corpus)} ánh xạ ID"
        )

        async with engine.connect() as conn:
            from sqlalchemy import text

            version = (await conn.execute(text("SHOW server_version"))).scalar_one()
            index_count = (
                await conn.execute(
                    text(
                        "SELECT count(*) FROM pg_indexes "
                        "WHERE tablename = 'documents' AND indexdef ILIKE '%gin%search_vector%'"
                    )
                )
            ).scalar_one()
            vector_count = (
                await conn.execute(
                    text("SELECT count(*) FROM documents WHERE search_vector IS NOT NULL")
                )
            ).scalar_one()

        print(f"[db] PostgreSQL {version}; {vector_count} search_vector; {index_count} GIN index")
        print("[eval] Chạy 60 câu hỏi qua SearchService.full_text_search")
        baseline = await _evaluate(engine, manifest, questions, k)

        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "environment": {
                "postgres_version": version,
                "python": sys.version.split()[0],
                "k": k,
                "isolated_cluster": "temporary cluster, removed after run",
                "search_index": "GIN(search_vector), trigger b7c8d9e0f1a2",
                "extractor": "app.services.file_processor.extract_text",
            },
            "dataset": {
                "version": manifest["dataset_version"],
                "dataset_hash": manifest["dataset_hash"],
                "documents": len(manifest["documents"]),
                "questions": len(questions),
                "splits": manifest["summary"]["splits"],
                "formats": manifest["summary"]["formats"],
            },
            "corpus": {
                "extraction": _extraction_summary(manifest, seed_info["extractions"]),
                "documents": [
                    {
                        "id": doc["id"],
                        "format": doc["format"],
                        "split": doc["split"],
                        "owner": doc["owner"],
                        "workspace": doc["workspace"],
                        "duplicate_of": doc["duplicate_of"],
                        "bundle_children": doc["bundle_children"],
                        "tags": doc["tags"],
                        "view_count": doc["view_count"],
                    }
                    for doc in manifest["documents"]
                ],
            },
            "database": {
                "documents": seed_info["documents"],
                "tags": seed_info["tags"],
                "search_vectors": vector_count,
                "gin_indexes": index_count,
            },
            "baseline": baseline,
            "queries": baseline["queries"],
        }
        return report
    finally:
        if engine is not None:
            await engine.dispose()
        pg.stop()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--k", type=int, default=DEFAULT_K, help="Số kết quả lấy cho mỗi câu (mặc định 5)")
    parser.add_argument("--pg-bindir", help="Thư mục chứa initdb/pg_ctl (mặc định: pg_config --bindir)")
    parser.add_argument("--keep-cluster", action="store_true", help="Giữ cluster tạm sau khi chạy để debug")
    parser.add_argument(
        "--expect-dataset-hash",
        help="Fail nếu manifest.json không khớp hash (dùng cho CI)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=EVAL_DIR / "reports",
        help="Thư mục ghi baseline.json/baseline.md",
    )
    args = parser.parse_args()
    if args.k < 1:
        raise SystemExit("--k phải >= 1")

    report = asyncio.run(_main_async(args))
    out_dir = args.out_dir if args.out_dir.is_absolute() else EVAL_DIR / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "baseline.json"
    md_path = out_dir / "baseline.md"
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, default=_json_default) + "\n",
        encoding="utf-8",
    )
    md_path.write_text(_markdown_report(report, args.k), encoding="utf-8")

    summary = report["baseline"]["summary"]["overall"]
    print("\n=== KẾT QUẢ BASELINE ===")
    print(
        f"Answerable: n={summary['answerable']['n']} "
        f"Hit@1={summary['answerable']['hit@1']:.3f} "
        f"Hit@3={summary['answerable']['hit@3']:.3f} "
        f"Hit@{args.k}={summary['answerable'][f'hit@{args.k}']:.3f} "
        f"MRR={summary['answerable']['mrr']:.3f}"
    )
    print(
        f"Forbidden leaks: {summary['forbidden']['queries_with_leak']}/{summary['forbidden']['n']} "
        f"(unscoped retrieval={summary['forbidden']['unscoped_retrieval_rate']:.3f})"
    )
    print(f"No-evidence false positives: {summary['no_evidence']['false_positive_rate']:.3f}")
    print(
        f"Scope: {summary['scope']['queries_with_denied_results']} query có kết quả ngoài quyền, "
        f"{summary['scope']['denied_result_count']} kết quả"
    )
    print(f"Latency: median={summary['latency_ms']['median']}ms p95={summary['latency_ms']['p95']}ms")
    print(f"\nĐã ghi: {json_path}")
    print(f"Đã ghi: {md_path}")


if __name__ == "__main__":
    main()
