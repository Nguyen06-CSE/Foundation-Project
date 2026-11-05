# Community 24

> 27 nodes · cohesion 0.11

## Key Concepts

- **schemas/document.py** (18 connections) — `backend/app/schemas/document.py`
- **DocumentOut** (14 connections) — `backend/app/schemas/document.py`
- **safe_remove()** (11 connections) — `backend/app/services/file_service.py`
- **test_storage_dedup.py** (10 connections) — `backend/tests/test_storage_dedup.py`
- **BaseModel** (7 connections)
- **get_file_url()** (7 connections) — `backend/app/services/file_service.py`
- **DocumentUpdate** (6 connections) — `backend/app/schemas/document.py`
- **test_local_storage_save_and_url()** (6 connections) — `backend/tests/test_storage_dedup.py`
- **test_documents.py** (5 connections) — `backend/tests/test_documents.py`
- **BatchUploadOut** (4 connections) — `backend/app/schemas/document.py`
- **DocumentBase** (4 connections) — `backend/app/schemas/document.py`
- **DocumentTagsUpdate** (4 connections) — `backend/app/schemas/document.py`
- **PaginatedDocuments** (4 connections) — `backend/app/schemas/document.py`
- **.convert_to_public_url()** (3 connections) — `backend/app/schemas/document.py`
- **DocumentCreate** (2 connections) — `backend/app/schemas/document.py`
- **DocumentOwnerOut** (2 connections) — `backend/app/schemas/document.py`
- **SkippedFileOut** (2 connections) — `backend/app/schemas/document.py`
- **test_document_out_schema_stats()** (2 connections) — `backend/tests/test_documents.py`
- **test_upload_document_duplicate_checksum()** (2 connections) — `backend/tests/test_documents.py`
- **test_personal_documents_filter_isolation()** (2 connections) — `backend/tests/test_storage_dedup.py`
- **Helper chuẩn hóa file_key thành URL gửi về Frontend. - Cloud: URL Cloudflare R2…** (1 connections) — `backend/app/services/file_service.py`
- **Xóa file an toàn: xóa trên Cloudflare R2 (nếu ở cloud) và xóa file local (nếu…** (1 connections) — `backend/app/services/file_service.py`
- **fake_create_document_from_upload()** (1 connections) — `backend/tests/test_documents.py`
- **Xác nhận khi không truyền workspace_id thì câu truy vấn lọc workspace_id IS NULL** (1 connections) — `backend/tests/test_storage_dedup.py`
- **Xác nhận khi chạy ở chế độ local thì file được ghi vào đĩa local và URL trả về…** (1 connections) — `backend/tests/test_storage_dedup.py`
- *... and 2 more nodes in this community*

## Relationships

- [Community 9](Community_9.md) (21 shared connections)
- [Community 3](Community_3.md) (9 shared connections)
- [Community 15](Community_15.md) (5 shared connections)
- [Community 13](Community_13.md) (4 shared connections)
- [Community 5](Community_5.md) (2 shared connections)
- [Community 12](Community_12.md) (2 shared connections)
- [Community 32](Community_32.md) (1 shared connections)
- [Community 57](Community_57.md) (1 shared connections)
- [Community 29](Community_29.md) (1 shared connections)

## Source Files

- `backend/app/schemas/document.py`
- `backend/app/services/file_service.py`
- `backend/tests/test_documents.py`
- `backend/tests/test_storage_dedup.py`

## Audit Trail

- EXTRACTED: 73 (87%)
- INFERRED: 11 (13%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*