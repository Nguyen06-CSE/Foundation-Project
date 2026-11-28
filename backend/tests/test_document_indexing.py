"""Focused Phase 1 tests for document chunking and the index worker."""

import asyncio
import json
import sys
import threading
import types
from unittest.mock import AsyncMock, Mock

import pytest

from app.services import chunking, index_worker


# ---------------------------------------------------------------------------
# chunking.collect / merge_sources
# ---------------------------------------------------------------------------


def test_markdown_headings_and_content_dedupe():
    markdown = (
        "# Giới thiệu\n\n"
        "Trí tuệ nhân tạo.\n\n"
        "## Chi tiết\n\n"
        "Học sâu.\n"
    )
    content = "Trí  tuệ nhân tạo.\n\nHọc sâu.\n\nChỉ có trong nội dung."

    chunks, coverage = chunking.merge_sources(markdown, content, [], "page")

    assert chunks == [
        {
            "body": "Trí tuệ nhân tạo.",
            "source": "markdown",
            "heading": "Giới thiệu",
            "location": {"section": "Giới thiệu"},
        },
        {
            "body": "Học sâu.",
            "source": "markdown",
            "heading": "Chi tiết",
            "location": {"section": "Chi tiết"},
        },
        {
            "body": "Chỉ có trong nội dung.",
            "source": "content",
            "heading": "",
            "location": {},
        },
    ]
    assert coverage == {"state": "full", "unit": "section", "read": 2, "total": 2}


def test_multiline_markdown_and_page_lines_are_deduped_from_content():
    markdown = "# Mục\n\nDòng một.\nDòng hai.\n"
    content = "Dòng một.\nDòng hai.\nDòng ba."

    chunks, _ = chunking.merge_sources(markdown, content, [], "page")

    assert [chunk["body"] for chunk in chunks] == ["Dòng một.\nDòng hai.", "Dòng ba."]
    assert chunks[1]["source"] == "content"

    chunks, _ = chunking.merge_sources("", content, [(1, "Dòng một.\nDòng hai.")], "page")

    assert [chunk["body"] for chunk in chunks] == ["Dòng một.\nDòng hai.", "Dòng ba."]
    assert chunks[1]["source"] == "content"


def test_page_text_is_deduped_against_markdown_but_new_lines_survive():
    markdown = "# Một\n\nDòng chung.\n"
    pages = [(1, "Dòng chung.\nDòng riêng của trang.")]

    chunks, coverage = chunking.merge_sources(markdown, "", pages, "page")

    assert [chunk["body"] for chunk in chunks] == ["Dòng chung.", "Dòng riêng của trang."]
    assert chunks[0]["source"] == "markdown"
    assert chunks[1] == {
        "body": "Dòng riêng của trang.",
        "source": "page",
        "heading": "",
        "location": {"page": 1},
    }
    assert coverage == {"state": "full", "unit": "page", "read": 1, "total": 1}


def test_vietnamese_long_paragraph_splits_on_word_boundaries():
    text = ("Tiếng Việt có dấu và nhiều khoảng trắng. " * 60).strip()

    pieces = list(chunking.paragraphs(text))

    assert len(pieces) > 1
    assert all(0 < len(piece) <= 1600 for piece in pieces)
    assert " ".join(pieces).split() == text.split()


def test_pdf_units_ocr_only_blank_pages_in_first_five(monkeypatch):
    class FakePage:
        def __init__(self, text):
            self.text = text

        def extract_text(self):
            return self.text

    class FakePdf:
        pages = [
            FakePage("Trang một"),
            FakePage(""),
            FakePage("Trang ba"),
            FakePage(""),
            FakePage("Trang năm"),
            FakePage(""),
        ]

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    ocr_calls = []

    def convert_from_path(path, first_page, last_page, dpi):
        ocr_calls.append((path, first_page, last_page, dpi))
        return [object()]

    monkeypatch.setitem(sys.modules, "pdfplumber", types.SimpleNamespace(open=lambda path: FakePdf()))
    monkeypatch.setitem(
        sys.modules,
        "pdf2image",
        types.SimpleNamespace(convert_from_path=convert_from_path),
    )
    monkeypatch.setitem(
        sys.modules,
        "pytesseract",
        types.SimpleNamespace(image_to_string=lambda image, lang: f"OCR {lang}"),
    )

    pages = list(chunking.units("fake.pdf", "pdf"))

    assert pages == [
        (1, "Trang một"),
        (2, "OCR vie+eng"),
        (3, "Trang ba"),
        (4, "OCR vie+eng"),
        (5, "Trang năm"),
        (6, ""),
    ]
    assert ocr_calls == [("fake.pdf", 2, 2, 200), ("fake.pdf", 4, 4, 200)]


def test_collect_pdf_mixed_pages_reports_partial_coverage(tmp_path, monkeypatch):
    markdown = tmp_path / "doc.md"
    markdown.write_text("# Trang\n\nAlpha\n", encoding="utf-8")
    original = tmp_path / "doc.pdf"
    original.write_bytes(b"%PDF")
    monkeypatch.setattr(
        chunking,
        "units",
        lambda path, group: iter([(1, "Alpha"), (2, ""), (3, "Gamma")]),
    )

    chunks, coverage = chunking.collect(
        {
            "markdown_path": str(markdown),
            "content": "Gamma\n\nChỉ có trong nội dung.",
            "file_path": str(original),
            "file_type": "application/pdf",
        }
    )

    assert [chunk["body"] for chunk in chunks] == ["Alpha", "Gamma", "Chỉ có trong nội dung."]
    assert chunks[0]["source"] == "markdown"
    assert chunks[0]["location"] == {"section": "Trang", "page": 1}
    assert chunks[1]["source"] == "page"
    assert chunks[1]["location"] == {"page": 3}
    assert chunks[2]["source"] == "content"
    assert coverage == {"state": "partial", "unit": "page", "read": 2, "total": 3}


def test_collect_falls_back_to_content_when_markdown_is_missing(tmp_path):
    chunks, coverage = chunking.collect(
        {
            "markdown_path": None,
            "content": "Nội dung duy nhất.",
            "file_path": str(tmp_path / "missing.txt"),
            "file_type": "text/plain",
        }
    )

    assert [chunk["body"] for chunk in chunks] == ["Nội dung duy nhất."]
    assert chunks[0]["source"] == "content"
    assert coverage == {"state": "full", "unit": "section", "read": 1, "total": 1}


def test_collect_extracts_original_text_when_no_rendition_exists(tmp_path, monkeypatch):
    original = tmp_path / "doc.txt"
    original.write_text("nguồn", encoding="utf-8")
    monkeypatch.setattr(
        chunking,
        "extract_text",
        lambda path, file_type: "Văn bản trích xuất từ tệp gốc.",
    )

    chunks, coverage = chunking.collect(
        {
            "markdown_path": None,
            "content": "",
            "file_path": str(original),
            "file_type": "text/plain",
        }
    )

    assert [chunk["body"] for chunk in chunks] == ["Văn bản trích xuất từ tệp gốc."]
    assert chunks[0]["source"] == "content"
    assert coverage == {"state": "full", "unit": "section", "read": 1, "total": 1}


def test_collect_raises_when_no_source_is_readable(tmp_path, monkeypatch):
    monkeypatch.setattr(chunking, "download_r2_to_temp_file", lambda key: None)
    with pytest.raises(OSError, match="Không đọc được tệp nguồn"):
        chunking.collect(
            {
                "markdown_path": None,
                "content": "",
                "file_path": str(tmp_path / "missing.pdf"),
                "file_type": "application/pdf",
            }
        )


def test_local_storage_path_is_independent_of_worker_cwd():
    from app.core.config import ROOT_DIR

    path = chunking.local_storage_path("storage/1085/sample.pdf")

    assert path == ROOT_DIR / "storage/1085/sample.pdf"
    assert path.is_absolute()


# ---------------------------------------------------------------------------
# index_worker.step
# ---------------------------------------------------------------------------


class FakeResult:
    def __init__(self, rows=None, scalar=None):
        self.rows = rows or []
        self.value = scalar

    def mappings(self):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def all(self):
        return self.rows

    def scalar(self):
        return self.value

    def scalars(self):
        return self


class FakeNested:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


class FakeDB:
    def __init__(self, row=None, has_chunks=False, batch=None):
        self.row = row
        self.has_chunks = has_chunks
        self.batch = batch or []
        self.executed = []
        self.scalar_calls = []

    async def execute(self, query, params=None):
        sql = " ".join(str(query).split())
        self.executed.append((sql, params))
        if "FROM document_index_runs r JOIN documents d" in sql:
            return FakeResult([self.row] if self.row else [])
        if "SELECT id,body FROM document_chunks" in sql:
            return FakeResult(self.batch)
        return FakeResult()

    async def scalar(self, query, params=None):
        sql = " ".join(str(query).split())
        self.scalar_calls.append((sql, params))
        if "SELECT EXISTS" in sql:
            return self.has_chunks
        return None

    def begin_nested(self):
        return FakeNested()


class FakeBegin:
    def __init__(self, db):
        self.db = db

    async def __aenter__(self):
        return self.db

    async def __aexit__(self, *exc):
        return False


class FakeSessionFactory:
    def __init__(self, db):
        self.db = db

    def begin(self):
        return FakeBegin(self.db)


def _row(model="test-model"):
    return {
        "id": 7,
        "document_id": 1085,
        "model": model,
        "attempts": 0,
        "checksum": "checksum-v1",
        "file_path": "/tmp/source.pdf",
        "content": "Nội dung",
        "markdown_path": None,
        "file_type": "application/pdf",
    }


@pytest.mark.asyncio
async def test_step_selection_guards_stale_checksum_deleted_and_skip_locked(monkeypatch):
    db = FakeDB(row=None)
    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))

    assert await index_worker.step() is False

    selection = next(sql for sql, _ in db.executed if "FROM document_index_runs r JOIN documents d" in sql)
    assert "r.status IN ('pending','retry')" in selection
    assert "d.checksum=r.checksum" in selection
    assert "NOT d.is_deleted" in selection
    assert "FOR UPDATE OF r SKIP LOCKED" in selection


@pytest.mark.asyncio
async def test_scoped_worker_does_not_claim_other_documents(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(index_worker, 'AsyncSessionLocal', FakeSessionFactory(db))
    assert await index_worker.step(1083) is False
    sql, params = db.executed[0]
    assert 'OR d.id=:document_id' in sql
    assert params == {'document_id': 1083}


@pytest.mark.asyncio
async def test_step_reuses_existing_chunks_without_recollecting(monkeypatch):
    db = FakeDB(row=_row(), has_chunks=True)
    collect = Mock(side_effect=AssertionError("collect must not run"))
    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))
    monkeypatch.setattr(index_worker, "collect", collect)

    assert await index_worker.step() is True

    collect.assert_not_called()
    sqls = [sql for sql, _ in db.executed] + [sql for sql, _ in db.scalar_calls]
    assert not any(sql.startswith("INSERT INTO document_chunks") for sql in sqls)
    assert any("deactivated AS" in sql and "SET is_active=false" in sql for sql in sqls)
    assert any("SET is_active=true" in sql and "status=CASE" in sql for sql in sqls)


@pytest.mark.asyncio
async def test_step_collects_and_inserts_chunks_once(monkeypatch):
    db = FakeDB(row=_row(), has_chunks=False)
    chunks = [
        {
            "body": "Đoạn văn.",
            "heading": "Mục",
            "source": "markdown",
            "location": {"section": "Mục"},
        }
    ]
    coverage = {"state": "full", "unit": "section", "read": 1, "total": 1}
    collect = Mock(return_value=(chunks, coverage))
    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))
    monkeypatch.setattr(index_worker, "collect", collect)

    assert await index_worker.step() is True

    collect.assert_called_once()
    insert = next(
        (sql, params) for sql, params in db.executed if sql.startswith("INSERT INTO document_chunks")
    )
    assert insert[1] == [
        {
            "body": "Đoạn văn.",
            "heading": "Mục",
            "source": "markdown",
            "location": json.dumps({"section": "Mục"}),
            "id": 7,
            "ordinal": 0,
        }
    ]
    assert any(
        "UPDATE document_index_runs SET coverage" in sql and params["coverage"] == json.dumps(coverage)
        for sql, params in db.executed
    )


@pytest.mark.asyncio
async def test_step_embeds_missing_chunks_in_configured_batches(monkeypatch):
    model = "provider|embed-v1|2"
    db = FakeDB(
        row=_row(model=model),
        has_chunks=True,
        batch=[{"id": 21, "body": "Đoạn một"}, {"id": 22, "body": "Đoạn hai"}],
    )
    embed = AsyncMock(side_effect=[[[0.1, 0.2]], [[0.3, 0.4]]])
    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))
    monkeypatch.setattr(index_worker.embedding_service, "model_key", lambda: model)
    monkeypatch.setattr(index_worker.embedding_service, "embed", embed)
    monkeypatch.setattr(index_worker.settings, "EMBEDDING_BATCH_SIZE", 1)

    assert await index_worker.step() is True

    assert [call.args[0] for call in embed.await_args_list] == [["Đoạn một"], ["Đoạn hai"]]
    updates = [params for sql, params in db.executed if sql.startswith("UPDATE document_chunks SET embedding")]
    assert updates == [
        [{"id": 7, "chunk_id": 21, "embedding": json.dumps([0.1, 0.2])}],
        [{"id": 7, "chunk_id": 22, "embedding": json.dumps([0.3, 0.4])}],
    ]


@pytest.mark.asyncio
async def test_step_marks_run_retry_after_collection_error(monkeypatch):
    db = FakeDB(row=_row(), has_chunks=False)

    def fail_collect(row):
        raise ValueError("boom")

    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))
    monkeypatch.setattr(index_worker, "collect", fail_collect)

    assert await index_worker.step() is True

    retry = next(
        (sql, params)
        for sql, params in db.executed
        if "SET status=CASE" in sql
    )
    assert "attempts=attempts+1" in retry[0]
    assert "next_attempt=now()+make_interval" in retry[0]
    assert retry[1]["id"] == 7
    assert retry[1]["error"] == "ValueError"
    assert retry[1]["max_retries"] == 5
    assert not any(sql.startswith("INSERT INTO document_chunks") for sql, _ in db.executed)


@pytest.mark.asyncio
async def test_step_marks_run_failed_at_retry_limit(monkeypatch):
    db = FakeDB(row={**_row(), "attempts": 4}, has_chunks=False)
    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))
    monkeypatch.setattr(index_worker, "collect", Mock(side_effect=OSError("source unavailable")))

    assert await index_worker.step() is True

    failed = next((sql, params) for sql, params in db.executed if "SET status=CASE" in sql)
    assert "'failed'" in failed[0]
    assert failed[1]["max_retries"] == 5


@pytest.mark.asyncio
async def test_failed_run_is_not_claimed(monkeypatch):
    db = FakeDB(row=None)
    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))

    assert await index_worker.step() is False
    selection = next(sql for sql, _ in db.executed if "FROM document_index_runs r JOIN documents d" in sql)
    assert "status IN ('pending','retry')" in selection


class ClaimingDB(FakeDB):
    """Minimal stand-in for a row lock: the first worker claims the only row."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.claimed = False

    async def execute(self, query, params=None):
        sql = " ".join(str(query).split())
        if "FROM document_index_runs r JOIN documents d" in sql:
            self.executed.append((sql, params))
            if self.claimed:
                return FakeResult([])
            self.claimed = True
            return FakeResult([self.row])
        return await super().execute(query, params)


@pytest.mark.asyncio
async def test_two_workers_only_one_claims_the_run(monkeypatch):
    db = ClaimingDB(row=_row(), has_chunks=False)
    started = threading.Event()
    release = threading.Event()
    calls = []

    def blocking_collect(row):
        calls.append(row["id"])
        started.set()
        release.wait(timeout=5)
        return [], {"state": "unknown", "unit": "page", "read": 0, "total": 0}

    monkeypatch.setattr(index_worker, "AsyncSessionLocal", FakeSessionFactory(db))
    monkeypatch.setattr(index_worker, "collect", blocking_collect)

    first = asyncio.create_task(index_worker.step())
    await asyncio.to_thread(started.wait, 5)

    second = asyncio.create_task(index_worker.step())
    assert await second is False

    release.set()
    assert await first is True
    assert calls == [7]
