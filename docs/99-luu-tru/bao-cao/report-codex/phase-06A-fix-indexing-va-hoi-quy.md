# Phase 6A — Sửa lập chỉ mục và hồi quy

Ngày kiểm tra: 2026-11-28

## Phạm vi đã thực hiện

Đã xử lý phần nền tảng của FIX-01, FIX-02 và một phần FIX-03:

Lượt sửa cuối bổ sung:

- `backend/app/routers/document_insights.py::retry_index` kiểm tra chủ tài liệu cá nhân hoặc `require_write_permission` cho tài liệu nhóm; reader/revoked user không thể mutate queue. Khi retry `failed`, `attempts` reset về `0`, `next_attempt=now()` và `last_error=NULL`.
- `backend/app/routers/documents.py::add_files_to_bundle` trả HTTP 400 `detail.code=EMPTY_FILE` nếu request chứa file rỗng; transaction rollback và không tăng dung lượng/không tạo child.

- `backend/app/services/chunking.py` dùng resolver local storage chung thay vì diễn giải key tương đối theo current working directory.
- `backend/app/services/file_service.py` ghi/đọc local storage và thư mục tạm dưới `ROOT_DIR`; đường dẫn tuyệt đối vẫn được giữ nguyên.
- `create_document_from_upload` từ chối file 0 byte trước duplicate lookup và trước khi lưu object/tạo document.
- Upload batch cá nhân/nhóm trả từng file rỗng là `reason=empty_file`; file rỗng không tạo child, không lưu object và không enqueue index.
- Add-files vào bundle bỏ qua file rỗng trước khi lưu object/tạo child.
- Worker có `INDEX_MAX_RETRIES` mặc định 5; trước giới hạn giữ `retry` + exponential backoff, đến giới hạn chuyển `failed` và không được queue lại.
- Log worker không ghi body; log thêm `document_id`, `stage`, `attempt`, `outcome` và HTTP status đã làm sạch.
- Upload đơn cá nhân/nhóm trả HTTP 400 với mã `EMPTY_FILE`.
- Bổ sung `POST /documents/{document_id}/index-retry` để retry có kiểm soát một run `failed`; không tạo run/API trùng.

## Nguyên nhân đã xác định

`file_path` được lưu dạng `storage/<owner>/<uuid>`. Worker lại gọi `Path(key)` và thư mục tạm tương đối. Vì vậy chạy từ repository root và chạy từ `backend/` có thể trỏ tới hai filesystem khác nhau, gây `OSError` khi rendition/original không tồn tại ở current working directory. R2 key và local path cũng bị trộn trong cùng phép thử path.

Nguồn lập chỉ mục hiện được ưu tiên theo thứ tự Markdown, trang/slide từ file gốc, rồi `document.content`; nguồn thiếu được phép fallback. `coverage` được lưu khi có trang/slide và trạng thái `partial` không bị công bố như `full`. Khi không có nguồn đọc được, `collect` vẫn phát ra `OSError` để run không publish index rỗng.

## Bằng chứng kiểm tra

Lệnh:

```text
./.venv/bin/python -m pytest -q backend/tests/test_document_indexing.py
```

Kết quả trước lượt này: `17 passed`.

Lệnh bổ sung:

```text
./.venv/bin/python -m pytest -q backend/tests/test_document_indexing.py backend/tests/test_document_insights.py backend/tests/test_embedding_service.py backend/tests/test_hybrid_search.py backend/tests/test_phase4_suggestions.py backend/tests/test_phase5_interest_counts.py backend/tests/test_document_preview_and_summary.py
```

Kết quả lượt đầu: `80 passed` (12 warning deprecation từ dependency/framework).

Lệnh sau lượt sửa:

```text
./.venv/bin/python -m pytest -q backend/tests/test_document_indexing.py backend/tests/test_document_insights.py backend/tests/test_embedding_service.py backend/tests/test_hybrid_search.py backend/tests/test_phase4_suggestions.py backend/tests/test_phase5_interest_counts.py backend/tests/test_document_preview_and_summary.py backend/tests/test_documents.py
```

Kết quả lượt trước: `82 passed` (12 warning deprecation, không có failure).

Test mới trong `backend/tests/test_phase6a_contracts.py` (9 test):
`test_retry_index_owner_personal_resets_attempts_and_error`,
`test_retry_index_group_calls_write_permission`,
`test_retry_index_reader_or_revoked_is_rejected_without_queue_update`,
`test_retry_index_non_failed_is_idempotent`,
`test_upload_personal_empty_file_returns_http_400_empty_file`,
`test_upload_group_empty_file_returns_http_400_empty_file`,
`test_batch_personal_empty_file_returns_skipped_reason_empty_file`,
`test_batch_group_empty_file_returns_skipped_reason_empty_file`,
`test_add_files_bundle_valid_then_empty_rolls_back_and_removes_object`.

Lệnh chạy riêng test mới: `9 passed`. Lệnh hồi quy cũ + test mới: kết quả `91 passed` (12 warning deprecation, không có failure). Các test retry kiểm tra trực tiếp status, quyền, SQL mutation/không mutation; test upload kiểm tra HTTP 400 và mã `EMPTY_FILE`; hai test batch gọi handler thật và kiểm tra `skipped`; test bundle gọi handler thật với `[valid, empty]`, kiểm tra rollback, không commit, dung lượng không đổi và object local bị xóa. Cleanup bundle dùng `_safe_remove`, abstraction này xử lý local path qua resolver và R2 khi cấu hình cloud.

Các fixture đã bao phủ Markdown + content dedupe, Markdown mất, file gốc mất, extract text fallback, PDF coverage partial, nguồn không đọc được, retry khi collect lỗi, reuse chunk, batch embedding và lock hai worker. Test mới xác nhận key tương đối được resolve thành absolute path dưới `ROOT_DIR`.

## Chưa hoàn tất / không đánh dấu PASS

- Chưa truy vấn trực tiếp metadata tài liệu #1085 hoặc chạy worker trên database thật; chưa in nội dung tài liệu hay secret.
- Chưa xác nhận cùng một run qua database thật với `attempts`, `next_attempt`, `last_error`, backoff và terminal state.
- Chưa kiểm tra mọi luồng upload bằng integration test/database disposable; đặc biệt contract HTTP batch cần chạy lại.
- Chưa chạy lại semantic search, Q&A, summary, tag, related, browser và ma trận ba vai trò.
- Chưa chạy full backend suite hoặc frontend build.

Trạng thái kiểm chứng DB thật #1085: **BLOCKED**. Kết nối bằng `PYTHONPATH=backend .venv/bin/python` qua `AsyncSessionLocal` thất bại ở DNS (`gaierror: [Errno 8] nodename nor servname provided, or not known`); không in endpoint/URL. Vì vậy chưa chạy `SELECT 1`, chưa đọc revision/metadata và chưa chạy worker từ repository root hoặc `backend/`. Không có content/body/API key nào được in.

Không tự đánh dấu nghiệm thu toàn bộ Phase 6A. Các thay đổi không liên quan trong working tree được giữ nguyên.

## Kết luận lượt này

Theo quyết định người dùng ngày 2026-11-28, nghiệm thu DB thật/worker #1085 và hồi quy AI được hoãn đến sau Phase 6B, khi PostgreSQL local được cài. Lịch sử Neon/DNS bên dưới được giữ làm bằng chứng, nhưng không còn là công việc cần xử lý trong Phase 6B.

- FIX-01: FAIL — chưa có bằng chứng database thật và tài liệu #1085 sau khi chạy worker từ hai thư mục.
- FIX-02: PASS ở mức code/test tự động; chưa PASS vận hành database thật.
- FIX-03: PASS ở mức code/test tự động cho các luồng đã có; add-files bundle nay trả 400 `EMPTY_FILE` thay vì bỏ qua âm thầm. Chưa PASS API/database integration cho đủ năm luồng upload.
- Hồi quy AI: FAIL/BLOCKED — chưa có tài liệu `ready` và embedding thật để đánh giá.
- Phase 6A: FAIL — chưa đủ minh chứng bắt buộc.

## Nghiệm thu vận hành DB thật

Đã rà soát cách khởi động local trong README/entrypoint. Repo không có Docker Compose/Makefile; Neon là DB được user chỉ định. Kết nối read-only qua app config bị chặn DNS như trên. `alembic heads` cục bộ trả `f2c3d4e5a6b7 (head)`; current revision trên Neon **UNKNOWN/BLOCKED** vì chưa kết nối được. Không chạy migration.

```text
PYTHONPATH=backend .venv/bin/python -c '<read-only SELECT 1 via AsyncSessionLocal>' -> DNS gaierror
alembic heads -> f2c3d4e5a6b7 (head)
```

Vì Neon không phân giải được trong sandbox, chưa chạy `alembic upgrade head`, chưa truy vấn #1085, chưa chạy worker từ repository root/backend và chưa gọi hồi quy API thật. Không đọc/in `DATABASE_URL`, secret, content hoặc chunk body.

| Hạng mục vận hành | Kết quả |
|---|---|
| DB local/read-only metadata #1085 | BLOCKED — PostgreSQL không chạy |
| Worker root/backend, active run/chunks/embeddings | BLOCKED — không có DB |
| Keyword/unaccent/hybrid/semantic thật | BLOCKED — chưa có ready document |
| Q&A, citation, summary, tags, related | BLOCKED — chưa có ready document |
| Preview/stats/quyền owner-reader-revoked thật | BLOCKED — chưa có app/DB và tài khoản vận hành |
| Upload integration DB thật | BLOCKED — chỉ có test handler/fake DB |

Kết luận: Phase 6A vẫn **FAIL/BLOCKED**, không đủ điều kiện đánh dấu PASS.

Frontend build:

```text
cd frontend/digital-library && npm run build
```

Kết quả: thành công; chỉ có cảnh báo Vite config native và một số chunk lớn.
