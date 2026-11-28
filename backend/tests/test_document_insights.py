"""Phase 3 contracts for verbatim evidence, citations, and active-run access."""

import json
from pathlib import Path
import pytest
from fastapi import HTTPException
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.routers import document_insights
from app.services import evidence_search, evidence_text


def citation(body, chunk_id=11, heading="Cây"):
    return {
        "chunk_id": chunk_id,
        "document_id": 7,
        "run_id": 2,
        "text": body,
        "heading": heading,
        "source": "markdown",
        "location": {"section": heading},
        "url": f"/personal/documents/7?tab=content&chunk={chunk_id}",
    }


@pytest.mark.parametrize("doc_id,question,expected", [
    ("C01", "Khóa chính dùng để làm gì?", "Khóa chính là một cột hoặc tổ hợp cột dùng để xác định duy nhất mỗi hàng trong bảng."),
    ("C02", "Mô hình OSI gồm bao nhiêu lớp?", "Mô hình OSI gồm bảy lớp, từ lớp vật lý đến lớp ứng dụng."),
    ("C03", "Học có giám sát sử dụng dữ liệu nào?", "Học có giám sát sử dụng dữ liệu đã gán nhãn để huấn luyện mô hình."),
    ("C04", "Mã hóa đối xứng dùng khóa gì?", "Mã hóa đối xứng dùng cùng một khóa cho mã hóa và giải mã."),
    ("C05", "Hàm groupby dùng để làm gì?", "Hàm groupby dùng để nhóm dữ liệu theo một hoặc nhiều cột."),
    ("C06", "Docker image là gì?", "Docker image là khuôn mẫu chỉ đọc để tạo container."),
    ("C01", "Cơ sở dữ liệu được phát minh năm nào?", None),
    ("C02", "Mô hình OSI có bao nhiêu tầng vật lý?", None),
    ("C03", "Học có giám sát do ai phát minh?", None),
])
def test_phase0_corpus_extract_or_abstain(doc_id, question, expected):
    manifest = json.loads((Path(__file__).parent / "evaluation/manifest.json").read_text())
    body = next(doc["text"] for doc in manifest["documents"] if doc["id"] == doc_id)
    result = evidence_text.answer(question, [citation(body)])
    assert result["answer"] == expected
    assert result["status"] == ("answered" if expected else "insufficient")
    if expected:
        assert result["answer"] in result["citations"][0]["text"]


def test_directional_answer_preserves_binary_search_tree_condition():
    source = citation("Trong cây tìm kiếm nhị phân, giá trị lớn nhất nằm ở nhánh phải.")
    result = evidence_text.answer("Giá trị lớn nhất đi vào phía bên nào của cây nhị phân?", [source])
    assert result == {"status": "answered", "answer": source["text"], "citations": [source]}
    assert result["answer"] in source["text"]


def test_directional_answer_includes_previous_condition_for_pronoun():
    source = citation("Trong cây tìm kiếm nhị phân, giá trị lớn nhất là nút ngoài cùng. Nó nằm ở nhánh phải.")
    result = evidence_text.answer("Giá trị lớn nhất ở phía nào của cây nhị phân?", [source])
    assert result["status"] == "answered"
    assert result["answer"] == source["text"]


@pytest.mark.parametrize("body", [
    "Cây nhị phân có nhánh trái và nhánh phải.",
    "Cây nhị phân có hai nút con. Giá trị lớn nhất chưa được xác định.",
    "Không thể xác định giá trị lớn nhất ở nhánh phải của cây nhị phân.",
])
def test_directional_question_rejects_related_but_unsupported_text(body):
    result = evidence_text.answer("Giá trị lớn nhất ở phía nào của cây nhị phân?", [citation(body)])
    assert result["status"] == "insufficient"
    assert result["answer"] is None
    assert result["citations"] == []


def test_count_and_year_questions_need_the_requested_fact():
    source = citation("Mô hình OSI gồm bảy lớp, từ lớp vật lý đến lớp ứng dụng.")
    assert evidence_text.answer("Mô hình OSI gồm bao nhiêu lớp?", [source])["status"] == "answered"
    assert evidence_text.answer("Mô hình OSI có bao nhiêu tầng vật lý?", [source])["status"] == "insufficient"
    assert evidence_text.answer("Mô hình OSI ra đời năm nào?", [source])["status"] == "insufficient"


def test_summary_preserves_section_order_and_deduplicates_same_claim():
    sources = [
        citation("Cơ sở dữ liệu lưu thông tin có cấu trúc.", 11, "Giới thiệu"),
        citation("Cơ sở dữ liệu lưu thông tin có cấu trúc.", 12, "Mô hình"),
        citation("Giao dịch đảm bảo tính nguyên tử và nhất quán.", 13, "Giao dịch"),
    ]
    items = evidence_text.summarize(sources)
    assert [item["text"] for item in items] == [sources[0]["text"], sources[2]["text"]]
    assert [item["citation"]["chunk_id"] for item in items] == [11, 13]


def test_citation_url_points_to_personal_or_group_chunk():
    personal = dict(citation("Nội dung."), workspace_id=None)
    group = dict(citation("Nội dung."), workspace_id=9)
    assert evidence_search.cite(personal)["url"] == "/personal/documents/7?tab=content&chunk=11"
    assert evidence_search.cite(group)["url"] == "/groups/9/documents/7?tab=content&chunk=11"


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def scalar_one_or_none(self):
        return self.rows[0] if self.rows else None

    def __iter__(self):
        return iter(self.rows)


class FakeDB:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []

    async def execute(self, statement, params):
        self.calls.append((str(statement), params))
        return FakeResult(next(self.responses))

    async def commit(self):
        self.committed = True


@pytest.mark.asyncio
async def test_chunk_access_requires_current_visible_active_run():
    db = FakeDB([[]])
    assert await evidence_search.chunks(db, 4, 7, 11) == []
    sql, params = db.calls[-1]
    assert "WITH visible AS" in sql
    assert "r.is_active AND r.checksum=d.checksum" in sql
    assert "d.id=:doc AND c.id=:chunk" in sql
    assert params == {"uid": 4, "doc": 7, "chunk": 11}


@pytest.mark.asyncio
async def test_invisible_document_is_404():
    with pytest.raises(HTTPException) as error:
        await evidence_search.run_info(FakeDB([[]]), 4, 7)
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_question_pending_is_not_insufficient_evidence(monkeypatch):
    embed = AsyncMock()
    monkeypatch.setattr(evidence_search, 'vectors', embed)
    db = FakeDB([[{'run_id': None, 'status': 'pending'}]])
    result = await evidence_search.question(db, 4, 7, 'Docker image là gì?')
    assert result == {'status': 'not_ready', 'answer': None, 'citations': [], 'index_status': 'pending'}
    embed.assert_not_called()


@pytest.mark.asyncio
async def test_question_returns_cited_original_sentence(monkeypatch):
    monkeypatch.setattr(evidence_search, "vectors", AsyncMock(return_value=[]))
    source = dict(citation("Trong cây tìm kiếm nhị phân, giá trị lớn nhất nằm ở nhánh phải."), workspace_id=None)
    info = {"id": 7, "workspace_id": None, "run_id": 2, "summary": None,
            "coverage": {"state": "full", "unit": "section", "read": 1, "total": 1}, "status": "ready"}
    db = FakeDB([[info], [source]])
    result = await evidence_search.question(db, 4, 7, "Giá trị lớn nhất ở phía nào của cây nhị phân?")
    assert result["status"] == "answered"
    assert result["answer"] == source["text"]
    assert result["citations"][0]["url"] == "/personal/documents/7?tab=content&chunk=11"
    assert all("WITH visible AS" in sql for sql, _ in db.calls)


@pytest.mark.asyncio
async def test_summary_caches_source_and_partial_coverage():
    coverage = {"state": "partial", "unit": "page", "read": 5, "total": 40}
    info = {"id": 7, "workspace_id": 9, "run_id": 2, "summary": None,
            "coverage": coverage, "status": "ready"}
    source = dict(citation("Giao dịch đảm bảo tính nguyên tử và nhất quán."), workspace_id=9)
    db = FakeDB([[info], [source], [coverage]])
    result = await evidence_search.summary(db, 4, 7)
    assert result["coverage"] == coverage
    assert result["items"][0]["text"] == source["text"]
    assert result["items"][0]["citation"]["url"] == "/groups/9/documents/7?tab=content&chunk=11"
    assert db.committed
    assert "r.is_active AND r.document_id=d.id AND r.checksum=d.checksum" in db.calls[-1][0]

    cached = FakeDB([[dict(info, summary=result["items"]) ]])
    assert await evidence_search.summary(cached, 4, 7) == result
    assert len(cached.calls) == 1


@pytest.mark.asyncio
async def test_chunk_route_rejects_stale_citation():
    info = {"id": 7, "workspace_id": None, "run_id": 2, "summary": None,
            "coverage": {}, "status": "ready"}
    db = FakeDB([[info], []])
    with pytest.raises(HTTPException) as error:
        await document_insights.chunk(7, 99, db, SimpleNamespace(id=4))
    assert error.value.status_code == 404
    assert error.value.detail == "Đoạn trích không còn hiệu lực"
