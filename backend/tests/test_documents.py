from types import SimpleNamespace


def test_upload_document_duplicate_checksum(client, monkeypatch):
    from app.routers import documents as documents_router
    from datetime import datetime, timezone

    async def fake_create_document_from_upload(*args, **kwargs):
        now = datetime.now(timezone.utc)
        return SimpleNamespace(id=1, owner_id=1, title="Doc", description=None, category_id=None, file_path="/tmp/doc.pdf", file_type="application/pdf", file_size=10, checksum="abc", content=None, metadata_=None, search_vector=None, is_important=False, created_at=now, updated_at=now)

    monkeypatch.setattr(documents_router, "create_document_from_upload", fake_create_document_from_upload)
    response = client.post(
        "/documents/upload",
        data={"title": "Doc"},
        files={"file": ("doc.pdf", b"abc", "application/pdf")},
    )
    assert response.status_code == 201
