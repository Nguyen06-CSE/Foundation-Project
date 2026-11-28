"""Contract tests for GET /search/full?mode=keyword|hybrid and evidence retrieval."""

import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.routers import search as search_router
from app.services import evidence_search
from app.services.search_service import SearchService


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return self.rows


class FakeDB:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []

    async def execute(self, statement, params=None):
        self.calls.append((" ".join(str(statement).split()), params))
        return FakeResult(self.rows)


def _row(**overrides):
    row = {
        "total": 1,
        "id": 7,
        "title": "Học máy",
        "workspace_id": None,
        "chunk_id": 11,
        "document_id": 7,
        "run_id": 2,
        "text": "Học máy là lĩnh vực nghiên cứu thuật toán.",
        "heading": "Mở đầu",
        "source": "markdown",
        "location": {"section": "Mở đầu"},
        "title_rank": 1,
        "content_rank": 2,
        "semantic_rank": 3,
        "score": 0.048,
    }
    row.update(overrides)
    return row


def _hybrid_result(**overrides):
    result = {
        "items": [{
            "id": 7,
            "type": "personal_doc",
            "title": "Học máy",
            "subtitle": "Tài liệu • Kho cá nhân",
            "url": "/personal/documents/7?tab=content&chunk=11&q=hoc",
            "snippet": "Học máy là lĩnh vực nghiên cứu thuật toán.",
            "citation": {
                "chunk_id": 11,
                "document_id": 7,
                "run_id": 2,
                "text": "Học máy là lĩnh vực nghiên cứu thuật toán.",
                "heading": "Mở đầu",
                "source": "markdown",
                "location": {"section": "Mở đầu"},
            },
        }],
        "total": 1,
        "page": 2,
        "page_size": 5,
        "fallback": True,
    }
    result.update(overrides)
    return result


def test_full_search_hybrid_returns_citation_and_fallback(client, monkeypatch):
    calls = {}

    async def fake_hybrid(db, uid, query, page, page_size):
        calls.update(uid=uid, query=query, page=page, page_size=page_size)
        return _hybrid_result()

    monkeypatch.setattr(search_router.evidence_search, "search", fake_hybrid)

    response = client.get(
        "/search/full",
        params={"q": "học máy", "mode": "hybrid", "page": 2, "page_size": 5},
    )

    assert response.status_code == 200
    body = response.json()
    assert calls == {"uid": 1, "query": "học máy", "page": 2, "page_size": 5}
    assert body["fallback"] is True
    assert body["items"][0]["citation"]["chunk_id"] == 11
    assert body["items"][0]["url"].endswith("chunk=11&q=hoc")


def test_full_search_defaults_to_keyword_without_fallback(client, monkeypatch):
    async def fake_keyword(db, query, user_id, page=1, page_size=20):
        return {"items": [], "total": 0, "page": page, "page_size": page_size}

    hybrid = AsyncMock()
    monkeypatch.setattr(SearchService, "full_text_search", fake_keyword)
    monkeypatch.setattr(search_router.evidence_search, "search", hybrid)

    response = client.get("/search/full", params={"q": "học máy"})

    assert response.status_code == 200
    assert response.json()["fallback"] is False
    hybrid.assert_not_called()


def test_full_search_rejects_unknown_mode(client):
    response = client.get("/search/full", params={"q": "học máy", "mode": "semantic"})

    assert response.status_code == 422


def test_full_search_explicit_fields_contract(client, monkeypatch):
    search = AsyncMock(return_value=_hybrid_result())
    monkeypatch.setattr(evidence_search, "search", search)
    response = client.get('/search/full?q=Docker&match_fields=title&match_fields=content')
    assert response.status_code == 200
    assert search.call_args.args[-1] == ['title', 'content']
    assert client.get('/search/full?q=Docker&match_fields=unknown').status_code == 422


@pytest.mark.asyncio
async def test_explicit_lexical_filters_skip_embedding_and_return_true_provenance(monkeypatch):
    embed = AsyncMock()
    monkeypatch.setattr(evidence_search, "vectors", embed)
    db = FakeDB([_row(semantic_rank=None)])
    result = await evidence_search.search(db, 42, 'Docker', 1, 20, ['title', 'content'])
    embed.assert_not_called()
    assert result['fallback'] is False
    assert result['items'][0]['match']['methods'] == ['lexical_title', 'lexical_content']
    assert db.calls[0][1]['title_enabled'] is True
    assert db.calls[0][1]['content_enabled'] is True


@pytest.mark.asyncio
async def test_semantic_only_failure_does_not_silently_enable_other_fields(monkeypatch):
    monkeypatch.setattr(evidence_search, "vectors", AsyncMock(return_value=[]))
    db = FakeDB([_row(id=None, total=0)])
    result = await evidence_search.search(db, 42, 'Docker', 1, 20, ['semantic'])
    assert result['items'] == []
    assert result['unavailable_match_fields'] == ['semantic']
    assert db.calls[0][1]['title_enabled'] is False
    assert db.calls[0][1]['content_enabled'] is False


@pytest.mark.asyncio
async def test_vectors_returns_provider_output_and_swallows_provider_errors(monkeypatch):
    monkeypatch.setattr(
        evidence_search.embedding_service,
        "embed",
        AsyncMock(return_value=[[0.1, 0.2]]),
    )
    assert await evidence_search.vectors(["học máy"]) == [[0.1, 0.2]]

    async def fail(inputs):
        raise httpx.HTTPError("provider down")

    monkeypatch.setattr(evidence_search.embedding_service, "embed", fail)
    assert await evidence_search.vectors(["học máy"]) == []


@pytest.mark.asyncio
async def test_hybrid_search_uses_semantic_vectors_without_fallback(monkeypatch):
    monkeypatch.setattr(evidence_search, "vectors", AsyncMock(return_value=[[0.1, 0.2]]))
    monkeypatch.setattr(
        evidence_search.embedding_service,
        "model_key",
        lambda: "https://provider.example/v1|embed-v1|2",
    )
    db = FakeDB([_row()])

    result = await evidence_search.search(db, 42, "học máy", 2, 10)

    sql, params = db.calls[0]
    assert result["fallback"] is False
    assert result["total"] == 1
    assert result["page"] == 2
    assert result["page_size"] == 10
    assert params["offset"] == 10
    assert params["size"] == 10
    assert params["vec"] == json.dumps([0.1, 0.2])
    assert params["model"] == "https://provider.example/v1|embed-v1|2"
    assert "c.embedding <=> CAST(:vec AS vector)" in sql
    assert "r.model=:model" in sql

    item = result["items"][0]
    assert item["citation"] == {
        "chunk_id": 11,
        "document_id": 7,
        "run_id": 2,
        "text": "Học máy là lĩnh vực nghiên cứu thuật toán.",
        "heading": "Mở đầu",
        "source": "markdown",
        "location": {"section": "Mở đầu"},
        "url": "/personal/documents/7?tab=content&chunk=11",
    }
    assert "/personal/documents/7?tab=content&chunk=11&q=" in item["url"]


@pytest.mark.asyncio
async def test_hybrid_search_falls_back_to_lexical_when_provider_is_unavailable(monkeypatch):
    monkeypatch.setattr(evidence_search, "vectors", AsyncMock(return_value=[]))
    db = FakeDB([
        _row(total=2, id=10, title="Tài liệu một", chunk_id=None, document_id=10,
             run_id=None, text=None, heading=None, source=None, location=None),
        _row(total=2, id=11, title="Tài liệu nhóm", workspace_id=5, chunk_id=7,
             document_id=11),
    ])

    result = await evidence_search.search(db, 42, "học máy", 2, 10)

    sql, params = db.calls[0]
    assert result["fallback"] is True
    assert result["total"] == 2
    assert [item["id"] for item in result["items"]] == [10, 11]
    assert result["items"][0]["citation"] is None
    assert result["items"][1]["citation"]["chunk_id"] == 7
    assert params["vec"] is None
    assert "SELECT NULL::integer document_id" in sql
    assert "CAST(:vec AS vector)" not in sql


@pytest.mark.asyncio
async def test_hybrid_search_groups_rrf_scores_by_document(monkeypatch):
    monkeypatch.setattr(evidence_search, "vectors", AsyncMock(return_value=[[0.1, 0.2]]))
    monkeypatch.setattr(evidence_search.embedding_service, "model_key", lambda: "provider|model|2")
    db = FakeDB([_row()])

    await evidence_search.search(db, 42, "học máy", 1, 20)

    sql = db.calls[0][0]
    assert "DISTINCT ON (document_id)" in sql
    assert "DISTINCT ON(document_id)" in sql
    assert "FULL JOIN semantic s USING(document_id)" in sql
    assert "coalesce(1.0/(60+b.semantic_rank),0) AS score" in sql
    assert sql.count("row_number() OVER") == 3
    assert "WHERE distance <= 1-CAST(:min_similarity AS double precision)" in sql
    assert "SELECT count(*) AS total FROM fused" in sql
    assert "ORDER BY score DESC,id LIMIT :size OFFSET :offset" in sql
    assert "LIMIT 100" in sql


@pytest.mark.asyncio
async def test_hybrid_search_visibility_is_scoped_to_owner_and_group_members(monkeypatch):
    monkeypatch.setattr(evidence_search, "vectors", AsyncMock(return_value=[]))
    db = FakeDB([_row(total=0, id=None, chunk_id=None, document_id=None)])

    await evidence_search.search(db, 42, "học máy", 1, 20)

    sql = db.calls[0][0]
    assert "WITH visible AS" in sql
    assert "NOT d.is_deleted" in sql
    assert "NOT coalesce(d.is_public,false)" in sql
    assert "d.workspace_id IS NULL AND d.owner_id=:uid" in sql
    assert "w.type='group'" in sql
    assert "w.owner_id=:uid" in sql
    assert "m.workspace_id=w.id AND m.user_id=:uid" in sql
