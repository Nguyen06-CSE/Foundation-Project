"""Unit tests cho benchmark Phase 2B (không cần DB, API hay đọc .env)."""

import sys
from pathlib import Path

import pytest

EVAL_DIR = Path(__file__).resolve().parent
for _path in (str(EVAL_DIR), str(EVAL_DIR.parents[1])):
    if _path not in sys.path:
        sys.path.insert(0, _path)

import run_hybrid_benchmark as bench  # noqa: E402


def test_chunks_from_synthetic_text_are_deterministic_and_bounded():
    text = "Đoạn một về cơ sở dữ liệu.\n\nĐoạn hai về mạng máy tính."

    first = bench.chunks_from_text(text)
    second = bench.chunks_from_text(text)

    assert first == second
    assert [chunk["body"] for chunk in first] == [
        "Đoạn một về cơ sở dữ liệu.",
        "Đoạn hai về mạng máy tính.",
    ]
    assert all(len(chunk["body"]) <= bench.MAX_CHUNK_CHARS for chunk in first)
    assert bench.chunks_from_text("") == []


@pytest.mark.asyncio
async def test_cached_embeddings_reuses_vectors_on_rerun(tmp_path, monkeypatch):
    calls = []

    async def fake_provider(texts):
        calls.append(list(texts))
        return [[float(len(text)), 1.0] for text in texts]

    monkeypatch.setattr(bench, "_call_provider", fake_provider)
    cache = tmp_path / "vectors.json"

    first = await bench.cached_embeddings(["a", "b"], model="m1", cache_path=cache)
    second = await bench.cached_embeddings(["b", "a"], model="m1", cache_path=cache)

    assert first == {"a": [1.0, 1.0], "b": [1.0, 1.0]}
    assert second == first
    assert calls == [["a", "b"]]


@pytest.mark.asyncio
async def test_cached_embeddings_rejects_offline_cache_miss(tmp_path, monkeypatch):
    async def unexpected(texts):
        raise AssertionError("không được gọi API khi --offline")

    monkeypatch.setattr(bench, "_call_provider", unexpected)
    with pytest.raises(RuntimeError, match="--offline"):
        await bench.cached_embeddings(
            ["chưa có"], model="m1", cache_path=tmp_path / "vectors.json", offline=True
        )


@pytest.mark.asyncio
async def test_cached_embeddings_invalidates_when_model_changes(tmp_path, monkeypatch):
    calls = []

    async def fake_provider(texts):
        calls.append(list(texts))
        return [[1.0, 0.0] for _ in texts]

    monkeypatch.setattr(bench, "_call_provider", fake_provider)
    cache = tmp_path / "vectors.json"

    await bench.cached_embeddings(["a"], model="m1", cache_path=cache)
    await bench.cached_embeddings(["a"], model="m2", cache_path=cache)

    assert calls == [["a"], ["a"]]


def test_summarize_reports_hit_leaks_and_latency_percentiles():
    rows = [
        {
            "type": "answerable",
            "hit@1": True, "hit@3": True, "hit@5": True,
            "mrr": 1.0, "citation_hit": True,
            "leaked_ids": [], "leaked_any": False,
            "denied_ids": [], "false_positive": False,
            "latency_ms": 1.0,
        },
        {
            "type": "forbidden",
            "hit@1": None, "hit@3": None, "hit@5": None,
            "mrr": None, "citation_hit": None,
            "leaked_ids": ["E01"], "leaked_any": True,
            "denied_ids": ["E01"], "false_positive": False,
            "latency_ms": 3.0,
        },
        {
            "type": "no_evidence",
            "hit@1": None, "hit@3": None, "hit@5": None,
            "mrr": None, "citation_hit": None,
            "leaked_ids": [], "leaked_any": False,
            "denied_ids": [], "false_positive": False,
            "latency_ms": 2.0,
        },
    ]

    summary = bench.summarize(rows, 5)

    assert summary["answerable"]["hit@5"] == 1.0
    assert summary["answerable"]["mrr"] == 1.0
    assert summary["forbidden"]["queries_with_leak"] == 1
    assert summary["forbidden"]["leaked_result_count"] == 1
    assert summary["scope"]["denied_result_count"] == 1
    assert summary["no_evidence"]["false_positive_rate"] == 0.0
    assert summary["latency_ms"]["p50"] == 2.0
    assert summary["latency_ms"]["p95"] == 3.0


def test_permission_flags_detect_forbidden_and_denied_documents():
    manifest = {
        "documents": [
            {"id": "D1", "owner": "u1", "workspace": None},
            {"id": "D2", "owner": "u2", "workspace": None},
        ],
        "workspaces": {},
    }
    question = {"user": "u1", "type": "forbidden", "forbidden_doc_ids": ["D2"]}

    leaked, denied, false_positive = bench.permission_flags(["D1", "D2"], question, manifest)

    assert leaked == ["D2"]
    assert denied == ["D2"]
    assert false_positive is False


def test_keyword_explain_sql_uses_permission_scope_and_analyze_prefix():
    sql = bench.keyword_sql(1, [11, 12], 5)

    assert "d.workspace_id IN (11,12)" in sql
    assert "d.owner_id=:uid" in sql
    assert ":size" in sql
    assert bench.explain_sql(sql).startswith("EXPLAIN (ANALYZE, BUFFERS) SELECT")
