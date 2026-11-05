# Community 32

> 21 nodes · cohesion 0.16

## Key Concepts

- **_process_document_background()** (15 connections) — `backend/app/routers/documents.py`
- **upload_group_batch_documents()** (13 connections) — `backend/app/routers/groups.py`
- **file_processor.py** (13 connections) — `backend/app/services/file_processor.py`
- **upload_group_document()** (11 connections) — `backend/app/routers/groups.py`
- **get_file_group()** (11 connections) — `backend/app/services/file_processor.py`
- **create_thumbnail()** (8 connections) — `backend/app/services/file_processor.py`
- **extract_text()** (7 connections) — `backend/app/services/file_processor.py`
- **extract_first_image_from_markdown()** (5 connections) — `backend/app/services/file_processor.py`
- **generate_markdown()** (5 connections) — `backend/app/services/file_processor.py`
- **_ocr_pdf()** (4 connections) — `backend/app/services/file_processor.py`
- **_ocr_image()** (3 connections) — `backend/app/services/file_processor.py`
- **logging** (3 connections)
- **UploadFile** (2 connections)
- **Path** (2 connections)
- **re** (2 connections)
- **Chạy nền: extract text + tạo thumbnail + generate markdown, hỗ trợ file lưu…** (1 connections) — `backend/app/routers/documents.py`
- **Extract text từ file.** (1 connections) — `backend/app/services/file_processor.py`
- **Convert file sang Markdown. Với file text/code thì bọc trong block code.** (1 connections) — `backend/app/services/file_processor.py`
- **Tạo thumbnail JPG. Trả về đường dẫn tương đối hoặc None nếu không hỗ trợ. -…** (1 connections) — `backend/app/services/file_processor.py`
- **OCR tối đa 5 trang đầu của PDF scan** (1 connections) — `backend/app/services/file_processor.py`
- **Tìm ảnh đầu tiên trong file Markdown (nếu có). Hỗ trợ cả cú pháp Markdown…** (1 connections) — `backend/app/services/file_processor.py`

## Relationships

- [Community 9](Community_9.md) (20 shared connections)
- [Community 3](Community_3.md) (17 shared connections)
- [Community 15](Community_15.md) (2 shared connections)
- [Community 5](Community_5.md) (2 shared connections)
- [Community 24](Community_24.md) (1 shared connections)
- [Community 12](Community_12.md) (1 shared connections)
- [Community 29](Community_29.md) (1 shared connections)

## Source Files

- `backend/app/routers/documents.py`
- `backend/app/routers/groups.py`
- `backend/app/services/file_processor.py`

## Audit Trail

- EXTRACTED: 59 (77%)
- INFERRED: 18 (23%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*