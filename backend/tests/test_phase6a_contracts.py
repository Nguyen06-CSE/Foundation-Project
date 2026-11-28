"""Explicit Phase 6A retry and empty-file contract checks."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import BackgroundTasks
from io import BytesIO

from app.models.document import Document
from app.routers import document_insights
from app.routers import documents, groups
from app.services.file_service import local_storage_path


class RetryDB:
    def __init__(self, document):
        self.document = document
        self.statements = []

    async def get(self, model, doc_id):
        return self.document

    async def execute(self, statement, params=None):
        self.statements.append((str(statement), params))
        return SimpleNamespace(scalar_one_or_none=lambda: self.document)

    async def commit(self):
        return None
    def add(self, item):
        return None
    async def flush(self):
        return None


@pytest.mark.asyncio
async def test_retry_index_owner_personal_resets_attempts_and_error(monkeypatch):
    doc = Document(id=7, owner_id=1, workspace_id=None, is_deleted=False)
    db = RetryDB(doc)
    monkeypatch.setattr(document_insights.evidence_search, "run_info", AsyncMock(return_value={"status": "failed"}))
    result = await document_insights.retry_index(7, db, SimpleNamespace(id=1))
    assert result == {"status": "pending", "queued": True}
    sql = db.statements[0][0]
    assert "attempts=0" in sql and "last_error=NULL" in sql and "status='pending'" in sql


@pytest.mark.asyncio
async def test_retry_index_group_calls_write_permission(monkeypatch):
    doc = Document(id=8, owner_id=2, workspace_id=3, is_deleted=False)
    db = RetryDB(doc)
    permission = AsyncMock()
    monkeypatch.setattr(document_insights, "require_write_permission", permission)
    monkeypatch.setattr(document_insights.evidence_search, "run_info", AsyncMock(return_value={"status": "failed"}))
    await document_insights.retry_index(8, db, SimpleNamespace(id=1))
    permission.assert_awaited_once_with(db, 3, 1)


@pytest.mark.asyncio
async def test_retry_index_reader_or_revoked_is_rejected_without_queue_update(monkeypatch):
    doc = Document(id=9, owner_id=2, workspace_id=3, is_deleted=False)
    db = RetryDB(doc)
    monkeypatch.setattr(document_insights, "require_write_permission", AsyncMock(side_effect=HTTPException(403)))
    with pytest.raises(HTTPException) as exc:
        await document_insights.retry_index(9, db, SimpleNamespace(id=1))
    assert exc.value.status_code == 403
    assert not db.statements


@pytest.mark.asyncio
async def test_retry_index_non_failed_is_idempotent(monkeypatch):
    doc = Document(id=10, owner_id=1, workspace_id=None, is_deleted=False)
    db = RetryDB(doc)
    monkeypatch.setattr(document_insights.evidence_search, "run_info", AsyncMock(return_value={"status": "ready"}))
    assert await document_insights.retry_index(10, db, SimpleNamespace(id=1)) == {"status": "ready", "queued": False}
    assert not db.statements


def empty_upload(name="empty.md"):
    return UploadFile(filename=name, file=BytesIO(b""), headers={"content-type": "text/markdown"})


@pytest.mark.asyncio
async def test_upload_personal_empty_file_returns_http_400_empty_file(monkeypatch):
    monkeypatch.setattr(documents, "create_document_from_upload", AsyncMock(side_effect=ValueError("empty_file")))
    with pytest.raises(HTTPException) as exc:
        await documents.upload_document(BackgroundTasks(), "empty", None, None, None, [], None, empty_upload(), RetryDB(None), SimpleNamespace(id=1))
    assert exc.value.status_code == 400 and exc.value.detail["code"] == "EMPTY_FILE"


@pytest.mark.asyncio
async def test_upload_group_empty_file_returns_http_400_empty_file(monkeypatch):
    monkeypatch.setattr(groups, "create_document_from_upload", AsyncMock(side_effect=ValueError("empty_file")))
    monkeypatch.setattr(groups, "require_full_permission", AsyncMock())
    with pytest.raises(HTTPException) as exc:
        await groups.upload_group_document(3, BackgroundTasks(), "empty", None, None, [], None, empty_upload(), RetryDB(None), SimpleNamespace(id=1))
    assert exc.value.status_code == 400 and exc.value.detail["code"] == "EMPTY_FILE"


class BatchDB:
    def __init__(self):
        self.added, self.committed = [], False
    async def execute(self, query, params=None):
        class R:
            def scalars(self): return self
            def all(self): return []
            def first(self): return None
            def scalar_one_or_none(self): return None
            def scalar_one(self): return self.bundle
            def scalar(self): return 0
        result = R()
        result.bundle = self.added[0] if self.added else None
        return result
    def add(self, item): self.added.append(item)
    async def flush(self):
        for item in self.added:
            if getattr(item, "id", None) is None: item.id = 1
    async def commit(self): self.committed = True
    async def rollback(self): pass


@pytest.mark.asyncio
async def test_batch_personal_empty_file_returns_skipped_reason_empty_file(monkeypatch):
    db = BatchDB()
    monkeypatch.setattr(documents.DocumentOut, "model_validate", classmethod(lambda cls, value: SimpleNamespace(bundle_children_count=0)))
    result = await documents.upload_batch_documents(BackgroundTasks(), "bundle", None, "", None, [empty_upload()], db, SimpleNamespace(id=1))
    assert result["skipped"] == [{"filename": "empty.md", "reason": "empty_file"}]
    assert len(db.added) == 1 and db.committed


@pytest.mark.asyncio
async def test_batch_group_empty_file_returns_skipped_reason_empty_file(monkeypatch):
    db = BatchDB()
    monkeypatch.setattr(groups, "require_full_permission", AsyncMock())
    monkeypatch.setattr(groups.DocumentOut, "model_validate", classmethod(lambda cls, value: SimpleNamespace(bundle_children_count=0)))
    result = await groups.upload_group_batch_documents(3, BackgroundTasks(), "bundle", None, "", None, [empty_upload()], db, SimpleNamespace(id=1))
    assert result["skipped"] == [{"filename": "empty.md", "reason": "empty_file"}]
    assert len(db.added) == 1


@pytest.mark.asyncio
async def test_add_files_bundle_valid_then_empty_rolls_back_and_removes_object(monkeypatch, tmp_path):
    bundle = Document(id=4, owner_id=1, is_bundle=True, is_deleted=False, is_public=False, file_size=0, tags=[])
    db = RetryDB(bundle)
    db.rollback = AsyncMock()
    db.commit = AsyncMock()
    saved = tmp_path / "storage" / "1" / "valid.md"
    saved.parent.mkdir(parents=True)
    async def save(upload, owner):
        saved.write_bytes(await upload.read()); await upload.seek(0); return str(saved)
    monkeypatch.setattr(documents, "save_upload_file", save)
    with pytest.raises(HTTPException) as exc:
        await documents.add_files_to_bundle(4, BackgroundTasks(), [UploadFile(filename="valid.md", file=BytesIO(b"ok")), empty_upload()], db, SimpleNamespace(id=1))
    assert exc.value.status_code == 400 and exc.value.detail["code"] == "EMPTY_FILE"
    assert db.rollback.await_count == 1 and db.commit.await_count == 0
    assert not saved.exists() and bundle.file_size == 0
