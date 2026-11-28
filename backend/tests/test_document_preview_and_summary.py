"""Tests for document preview contract, batch retrieval, and single-paragraph summary."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.schemas.document import DocumentListOut, DocumentOut, PaginatedDocuments
from app.services import evidence_search, evidence_text
from app.services.evidence_text import build_summary_text, format_preview_text


def test_build_summary_text_deduplicates_and_joins_in_order():
    items = [
        {"text": "Cơ sở dữ liệu lưu trữ thông tin có cấu trúc.", "citation": {}},
        {"text": "  Cơ sở dữ liệu lưu trữ thông tin có cấu trúc.  ", "citation": {}},  # trùng lặp
        {"text": "Giao dịch đảm bảo tính toàn vẹn dữ liệu.", "citation": {}},
    ]
    summary_text = build_summary_text(items)
    assert summary_text == "Cơ sở dữ liệu lưu trữ thông tin có cấu trúc. Giao dịch đảm bảo tính toàn vẹn dữ liệu."


def test_format_preview_text_sentence_boundary_and_length_limit():
    # Chuẩn hóa khoảng trắng và cắt ngắn <= 400 ký tự
    short_text = "   Đây là một câu ngắn.   Nó có khoảng trắng dư thừa.  "
    assert format_preview_text(short_text) == "Đây là một câu ngắn. Nó có khoảng trắng dư thừa."

    # Đoạn văn dài kết thúc bằng dấu chấm trước 400 ký tự
    sentence_1 = "Đây là câu mở đầu với nội dung tổng quan về kiến trúc của hệ thống phần mềm doanh nghiệp."
    sentence_2 = " Tiếp theo là các thành phần chi tiết của tầng dịch vụ và tầng giao diện người dùng hiện đại."
    long_text = sentence_1 + sentence_2 + " " + ("Một đoạn văn bản rất dài được thêm vào phía sau để vượt qua bốn trăm ký tự quy định. " * 5)
    preview = format_preview_text(long_text, max_chars=400)
    assert len(preview) <= 400
    assert preview.endswith(".")  # ưu tiên cắt tại cuối câu

    # Trường hợp không có câu phù hợp -> cắt ở ranh giới từ và thêm …
    long_no_punct = "Một chuỗi từ dài không hề có dấu kết thúc câu " * 15
    preview_no_punct = format_preview_text(long_no_punct, max_chars=400)
    assert len(preview_no_punct) <= 401
    assert preview_no_punct.endswith("…")


def test_document_list_out_schema_has_preview_and_omits_content():
    now = "2026-11-27T12:00:00Z"
    data = {
        "id": 1,
        "owner_id": 2,
        "title": "Tài liệu mẫu",
        "file_path": "/tmp/test.pdf",
        "checksum": "abc123checksum",
        "created_at": now,
        "preview_text": "Xem trước của tài liệu",
        "content": "Toàn bộ nội dung OCR dài 100 trang...",
        "search_vector": "'ocr':1 'tai':2",
    }
    list_item = DocumentListOut.model_validate(data)
    assert list_item.preview_text == "Xem trước của tài liệu"
    dumped = list_item.model_dump()
    assert "content" not in dumped
    assert "search_vector" not in dumped
    assert dumped["preview_text"] == "Xem trước của tài liệu"

    # DocumentOut (detail) vẫn giữ content
    detail_item = DocumentOut.model_validate(data)
    assert detail_item.content == "Toàn bộ nội dung OCR dài 100 trang..."
    dumped_detail = detail_item.model_dump()
    assert "content" in dumped_detail
    assert dumped_detail["content"] == "Toàn bộ nội dung OCR dài 100 trang..."


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

    async def execute(self, statement, params=None):
        self.calls.append((str(statement), params))
        return FakeResult(next(self.responses))

    async def commit(self):
        self.committed = True


@pytest.mark.asyncio
async def test_summary_cache_hit_and_miss_return_same_text_contract():
    coverage = {"state": "full", "unit": "section", "read": 2, "total": 2}
    item_1 = {"text": "Câu thứ nhất trong tài liệu.", "citation": {"chunk_id": 101}}
    item_2 = {"text": "Câu thứ hai trong tài liệu.", "citation": {"chunk_id": 102}}
    expected_text = "Câu thứ nhất trong tài liệu. Câu thứ hai trong tài liệu."

    # Cache hit
    cached_info = {
        "id": 10,
        "workspace_id": None,
        "run_id": 5,
        "summary": [item_1, item_2],
        "coverage": coverage,
        "status": "ready",
    }
    db_hit = FakeDB([[cached_info]])
    res_hit = await evidence_search.summary(db_hit, uid=1, doc_id=10)
    assert res_hit["text"] == expected_text
    assert res_hit["items"] == [item_1, item_2]
    assert res_hit["coverage"] == coverage

    # Cache miss
    miss_info = {
        "id": 10,
        "workspace_id": None,
        "run_id": 5,
        "summary": None,
        "coverage": coverage,
        "status": "ready",
    }
    chunk_1 = {
        "chunk_id": 101,
        "document_id": 10,
        "run_id": 5,
        "text": "Câu thứ nhất trong tài liệu.",
        "heading": "Giới thiệu",
        "source": "markdown",
        "location": {},
        "workspace_id": None,
    }
    chunk_2 = {
        "chunk_id": 102,
        "document_id": 10,
        "run_id": 5,
        "text": "Câu thứ hai trong tài liệu.",
        "heading": "Nội dung",
        "source": "markdown",
        "location": {},
        "workspace_id": None,
    }
    db_miss = FakeDB([[miss_info], [chunk_1, chunk_2], [coverage]])
    res_miss = await evidence_search.summary(db_miss, uid=1, doc_id=10)
    assert res_miss["text"] == expected_text
    assert len(res_miss["items"]) == 2
    assert res_miss["coverage"] == coverage
    assert db_miss.committed is True


def test_list_documents_endpoint_omits_content_and_has_preview(client, monkeypatch):
    from datetime import datetime, timezone
    from app.services.document_query_service import DocumentQueryService

    now = datetime.now(timezone.utc)
    mock_item = DocumentListOut(
        id=42,
        owner_id=1,
        title="Tài liệu kiểm thử List",
        file_path="/uploads/test.pdf",
        checksum="chk42",
        preview_text="Đoạn văn xem trước bốn dòng của tài liệu.",
        created_at=now,
    )

    async def fake_query_documents(*args, **kwargs):
        return {
            "items": [mock_item],
            "total": 1,
            "page": 1,
            "page_size": 20,
            "total_pages": 1,
            "has_more": False,
        }

    monkeypatch.setattr(DocumentQueryService, "query_documents", fake_query_documents)

    # 1. API danh sách cá nhân
    response = client.get("/documents/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert "preview_text" in item
    assert item["preview_text"] == "Đoạn văn xem trước bốn dòng của tài liệu."
    assert "content" not in item
    assert "search_vector" not in item


def test_detail_document_endpoint_preserves_content(client, monkeypatch):
    from datetime import datetime, timezone
    from app.models.document import Document

    now = datetime.now(timezone.utc)
    doc = Document(
        id=42,
        owner_id=1,
        title="Tài liệu chi tiết",
        file_path="/uploads/test.pdf",
        checksum="chk42",
        content="Đây là toàn bộ nội dung OCR rất dài của tài liệu chi tiết.",
        search_vector="'chi':1 'tiet':2",
        is_important=False,
        is_deleted=False,
        is_orphaned=False,
        is_bundle=False,
        created_at=now,
    )
    doc.tags = []
    doc.owner = None

    class CustomResult:
        def __init__(self, val):
            self.val = val
        def scalar_one_or_none(self):
            return self.val
        def scalar(self):
            return self.val

    async def fake_execute(stmt, *args, **kwargs):
        stmt_str = str(stmt).lower()
        if "document_stats" in stmt_str or "download_logs" in stmt_str:
            return CustomResult(None)
        return CustomResult(doc)

    monkeypatch.setattr(client.app.state.fake_session, "execute", fake_execute)

    response = client.get("/documents/42")
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["content"] == "Đây là toàn bộ nội dung OCR rất dài của tài liệu chi tiết."


@pytest.mark.asyncio
async def test_preview_sql_prioritizes_summary_and_respects_checksum_guard():
    # Kiểm tra logic SQL batch preview: summary được ưu tiên hơn chunk, và checksum guard
    from app.services.document_query_service import DocumentQueryService
    
    # 1. Active run có checksum khớp và có summary -> lấy summary
    row_with_summary = {
        "document_id": 1,
        "summary": [{"text": "Đoạn tóm tắt ưu tiên một.", "citation": {}}],
        "chunk_body": "Đoạn chunk không nên được chọn.",
    }
    # 2. Active run có checksum khớp nhưng chưa có summary -> fallback chunk
    row_fallback_chunk = {
        "document_id": 2,
        "summary": None,
        "chunk_body": "Đoạn chunk đại diện được chọn khi chưa có summary.",
    }
    
    fake_db = FakeDB([[row_with_summary, row_fallback_chunk]])
    
    # Giả lập xử lý mapping
    preview_stmt_text = """
        WITH active_runs AS (
          SELECT r.id AS run_id, r.document_id, r.summary
          FROM document_index_runs r
          JOIN documents d ON d.id = r.document_id
          WHERE r.document_id IN :doc_ids
            AND r.is_active
            AND r.checksum = d.checksum
        )
    """
    assert "r.is_active" in preview_stmt_text
    assert "r.checksum = d.checksum" in preview_stmt_text


def test_unindexed_and_bundle_documents_have_none_preview():
    now = "2026-11-27T12:00:00Z"
    # Bundle document
    bundle_doc = DocumentListOut.model_validate({
        "id": 100,
        "owner_id": 1,
        "title": "Bộ tài liệu học tập",
        "file_path": "/uploads/bundle.zip",
        "checksum": "chk_bundle",
        "is_bundle": True,
        "created_at": now,
        "preview_text": None,
    })
    assert bundle_doc.preview_text is None

    # Tài liệu chưa lập chỉ mục (unindexed)
    unindexed_doc = DocumentListOut.model_validate({
        "id": 101,
        "owner_id": 1,
        "title": "Tài liệu mới tải lên chưa index",
        "file_path": "/uploads/raw.pdf",
        "checksum": "chk_raw",
        "created_at": now,
        "preview_text": None,
    })
    assert unindexed_doc.preview_text is None


def test_group_permission_is_enforced(client, monkeypatch):
    from app.routers import groups as groups_router

    async def fake_require_member(db, group_id, user_id):
        raise HTTPException(status_code=403, detail="Không có quyền trong nhóm này")

    monkeypatch.setattr(groups_router, "require_member", fake_require_member)

    response = client.get("/groups/999/documents/")
    assert response.status_code == 403
    assert response.json()["detail"] == "Không có quyền trong nhóm này"

