---
title: Baseline Tích Hợp Tính Năng Tài Liệu (Phase 0A)
sidebar_label: 📊 Baseline tích hợp
sidebar_position: 5
---

# 📊 BASELINE TÍCH HỢP TÍNH NĂNG TÀI LIỆU — PHASE 0A

Tài liệu này chấm mức độ tích hợp thực tế của các năng lực tài liệu dựa trên **code đang có**, **test đang có** và **baseline chạy thật ở Phase 0B**. Mục tiêu không phải ca ngợi tính năng, mà là chỉ ra chỗ nào đã dùng được, chỗ nào mới là khung code, và chỗ nào chưa có bằng chứng.

## 0. Phạm vi, thang điểm và quy ước bằng chứng

### 0.1. Phạm vi

| Nhóm | Nội dung được chấm |
|---|---|
| Upload | Upload cá nhân, upload nhóm, upload gói (bundle) nhiều file |
| Lưu trữ | Khử trùng lặp theo checksum, tái sử dụng file vật lý, local storage, R2 |
| Nội dung | Sinh Markdown, đồng bộ Markdown/thumbnail lên local hoặc R2 |
| Tra cứu | Full-text search, xếp hạng, snippet, phân quyền theo kho cá nhân/nhóm |
| Tổ chức | Tag cá nhân, tag nhóm, gắn tag cho tài liệu và bundle |
| Đo lường | View count, download count, trending score, thống kê theo thời gian |

### 0.2. Thang điểm 0–5

| Điểm | Ý nghĩa |
|---:|---|
| 0 | Chưa có code hoặc không chạy được |
| 1 | Có prototype, chưa nối vào luồng chính |
| 2 | Có code chạy được nhưng thiếu test hoặc thiếu xử lý lỗi nghiêm trọng |
| 3 | Tích hợp được vào luồng chính, còn khoảng trống rõ ràng về test/ownership/đồng thời |
| 4 | Tích hợp tốt, có test trực tiếp hoặc bằng chứng chạy thật, còn ít rủi ro đã biết |
| 5 | Hoàn thiện production: test đầy đủ, chịu lỗi, quan sát được, có kiểm soát đồng thời |

Điểm tổng là **trung bình cộng** của 10 năng lực, không trọng số. Độ tin cậy phản ánh chất lượng bằng chứng, không phản ánh mức độ quan trọng.

### 0.3. Quy ước

- **Code evidence**: đường dẫn + hàm/endpoint cụ thể.
- **Test evidence**: tên file/test và việc test đó thực sự kiểm tra gì (real DB, mocked DB, hay chỉ kiểm tra schema).
- **Runtime evidence**: kết quả chạy baseline 0B trên PostgreSQL tạm.
- Không đọc `.env`, không dùng database đang chạy, không dùng dữ liệu thật.

---

## 1. Kết luận điều hành

**Điểm tích hợp tổng: 3.3/5** — đủ để demo luồng tài liệu end-to-end, chưa đủ để gọi là production-hardened.

### Điểm mạnh có bằng chứng

1. **Luồng upload đã nối tương đối đầy đủ**: tạo document → checksum → lưu file → xử lý nền → activity log.
2. **Full-text search có nền tảng CSDL đúng**: trigger `unaccent` + `simple`, weight A/B/C, GIN index, scope cá nhân/nhóm.
3. **Baseline 0B chạy thật**: 48 câu answerable đạt Hit@5 = 0.896, MRR = 0.896; 0/6 câu forbidden bị rò rỉ; 0/6 câu no-evidence trả kết quả.
4. **Local storage có test thật**: ghi file, đọc URL tương đối, xóa file và kiểm tra refcount.

### Rủi ro lớn nhất

| Ưu tiên | Rủi ro | Bằng chứng |
|---|---|---|
| P0 | Upload cá nhân nhận `workspace_id` nhưng không kiểm tra membership | `backend/app/routers/documents.py` → `upload_document()` truyền thẳng `workspace_id` vào `create_document_from_upload()`; không có `require_member`/`require_full_permission`. |
| P0 | Gắn tag không kiểm tra tag thuộc đúng owner/workspace | `document_service.create_document_from_upload()` và `PATCH /documents/{id}/tags` chỉ `select(Tag).where(Tag.id.in_(...))`; group batch upload cũng không lọc `workspace_id`. |
| P0 | Kiểm tra trùng checksum không nguyên tử | Kiểm tra `SELECT` rồi `INSERT` nhưng không có unique constraint trên `(checksum, owner_id, workspace_id)`. |
| P1 | R2 và Markdown gần như không có test | Không có test nào chạm `upload_bytes_to_r2`, `download_r2_to_temp_file`, `generate_markdown`. |
| P1 | PDF mixed mất trang scan khi index | `extract_text()` chỉ OCR khi **toàn bộ** PDF không có text layer; baseline 0B cho thấy token recall của `pdf_mixed` chỉ 0.518. |
| P1 | View count có thể mất cập nhật khi đồng thời | `_do_log_activity()` dùng `stats.view_count += 1` (read-modify-write) không khóa. |
| P2 | FTS chưa xử lý token kiểu `Wi-Fi` / `wifi` | Baseline 0B miss câu EQ04 vì `Wi-Fi` tách thành `wi` + `fi`. |

---

## 2. Bảng điểm tổng hợp

| # | Năng lực | Điểm | Độ tin cậy | Kết luận ngắn |
|---:|---|---:|---|---|
| 1 | Upload cá nhân | 4/5 | Trung bình | Chạy được; test route còn mock; thiếu kiểm tra `workspace_id`. |
| 2 | Upload nhóm | 3/5 | Trung bình thấp | Có `require_full_permission`; thiếu test route; tag chưa scoped. |
| 3 | Upload gói (bundle) | 3/5 | Thấp | Tạo cha/con, skip trùng, dọn file lỗi; chưa có test upload thật. |
| 4 | CAS / khử trùng lặp | 3/5 | Trung bình | Có SHA-256 + single-instance; không phải CAS thật; có race. |
| 5 | Local storage | 4/5 | Cao | Có test ghi/đọc/xóa thật; thiếu kiểm soát path/quota ở tầng storage. |
| 6 | R2 storage | 2/5 | Thấp | Có code path; không test; lỗi bị nuốt, không retry. |
| 7 | Markdown local/R2 | 3/5 | Thấp | Có sinh và đồng bộ; phụ thuộc `anydoc`; không test. |
| 8 | Full-text search | 4/5 | Cao | Có migration/trigger/scope + baseline thật; còn giới hạn token hóa và PDF mixed. |
| 9 | Tags | 3/5 | Trung bình thấp | CRUD cá nhân/nhóm có; assignment thiếu ownership; test chỉ status code. |
| 10 | View count / trending | 4/5 | Trung bình | Near-real-time + scheduler; thiếu test thật; có race và endpoint stats chưa auth. |
| | **Tổng** | **3.3/5** | | **Demo-ready, chưa production-ready.** |

---

## 3. Chi tiết từng năng lực

### 3.1. Upload cá nhân — 4/5

**Code evidence**

- `POST /documents/upload` tại `backend/app/routers/documents.py` nhận `title`, `description`, `workspace_id`, `tag_ids`, file; gọi `create_document_from_upload()`.
- `backend/app/services/document_service.py`:
  - tính SHA-256 bằng `checksum_for_file()`;
  - kiểm tra bản active/trash trùng checksum;
  - tái sử dụng `file_path`, `thumbnail_path`, `markdown_path`, `content` nếu đã có file cùng checksum;
  - tạo `Document`, gắn tag, `flush()`.
- Sau commit, router đẩy `_process_document_background()` và `_log_activity(UPLOADED)` vào `BackgroundTasks`.

**Test evidence**

- `backend/tests/test_documents.py::test_upload_document_duplicate_checksum`: **mock toàn bộ** `create_document_from_upload`, chỉ kiểm tra route trả 201. Không chứng minh logic checksum.
- `test_document_out_schema_stats`: chỉ kiểm tra schema `DocumentOut`.
- `test_storage_dedup.py::test_local_storage_save_and_url`: test thật cho lưu local, không test route upload.

**Khoảng trống**

- `workspace_id` là form field tuỳ chọn nhưng **không có kiểm tra membership**. Người dùng có thể gửi `workspace_id` của nhóm mình không thuộc về và tạo tài liệu trong đó.
- `tag_ids` không được lọc theo `owner_id`/`workspace_id`; có thể gắn tag của người khác/nhóm khác nếu biết ID.
- Kiểm tra trùng checksum là check-then-insert, không có ràng buộc DB chống race.
- Chưa có test tích hợp upload thật (file → DB → storage → background).

**Kết luận**: luồng chính dùng được, nhưng đây là endpoint cần siết quyền trước khi coi là hoàn thiện.

### 3.2. Upload nhóm — 3/5

**Code evidence**

- `POST /groups/{group_id}/documents/upload` tại `backend/app/routers/groups.py` gọi `require_full_permission()` trước khi tạo document.
- `POST /groups/{group_id}/documents/upload-batch` cũng gọi `require_full_permission()`.
- Document nhóm được tạo với `workspace_id=group_id`; checksum trùng được kiểm tra theo workspace.
- `GET /groups/{group_id}/documents/{document_id}` gọi `require_member()` trước khi trả dữ liệu.

**Test evidence**

- `backend/tests/test_permission_normalization.py::test_require_write_permission_logic` kiểm tra logic owner/`full`/`view` nhưng **monkeypatch** `require_member`; không đi qua route upload nhóm.
- `test_permission_normalization.py::test_disposable_db_chk_workspace_members_permission` kiểm tra CHECK constraint `view|full` trên SQLite in-memory, không kiểm tra upload.
- Không có test nào gọi `/groups/{id}/documents/upload` hoặc `/upload-batch`.

**Khoảng trống**

- Upload batch nhóm lấy tag bằng `select(Tag).where(Tag.id.in_(tag_ids_list))`, **không lọc `Tag.workspace_id == group_id`**. Người có quyền full trong nhóm A có thể gắn tag của nhóm B hoặc tag cá nhân vào tài liệu nhóm A.
- Upload đơn nhóm dùng chung `create_document_from_upload()`, nên cũng dính lỗi tag không scoped.
- Bundle nhóm không gán `tags=tags_list` cho các document con (khác với bundle cá nhân).
- Chưa có test thật cho phân quyền route, cleanup file khi lỗi, hay skip file trùng.

**Kết luận**: quyền ở mức route đã có, nhưng tính nhất quán tag và test tích hợp chưa đủ.

### 3.3. Upload gói (bundle) — 3/5

**Code evidence**

- `POST /documents/upload-batch` và `POST /groups/{group_id}/documents/upload-batch`:
  - tạo document cha `is_bundle=True`, `file_path="__bundle__"`, `file_type="application/bundle"`;
  - tạo từng document con với `bundle_parent_id=bundle.id`;
  - skip file trùng active/trash;
  - tái sử dụng file vật lý nếu checksum đã tồn tại;
  - cộng `bundle.file_size` cho file mới;
  - rollback và `_safe_remove()` các file đã lưu nếu lỗi.
- `GET /documents/{id}` và `GET /groups/{id}/documents/{id}` trả `bundle_children_count`.
- `GET /documents/{bundle_id}/children` và route nhóm tương ứng trả danh sách con.
- `PATCH /documents/{id}/tags` lan tag từ bundle cha xuống con (chỉ personal).

**Test evidence**

- `backend/tests/test_dashboard.py::test_dashboard_summary_bundle_counting` **mock** `get_dashboard_summary`, nên chỉ kiểm tra contract của mock, không kiểm tra SQL đếm bundle thật.
- Không có test upload bundle thật; không có test rollback/cleanup; không có test tag propagation.

**Khoảng trống**

- Group bundle không gán tag cho child tại thời điểm tạo.
- `bundle.file_size` chỉ cộng file mới; file tái sử dụng CAS không được tính, nên dung lượng bundle có thể thấp hơn thực tế.
- Mọi bundle dùng chung `checksum="bundle"`; không có ràng buộc duy nhất, dễ gây nhầm nếu sau này query theo checksum.
- `add-files` endpoint cần kiểm tra thêm quyền/ownership và test.

**Kết luận**: mô hình cha/con đã có và dùng được, nhưng thiếu test và còn lệch hành vi giữa personal/group.

### 3.4. CAS / khử trùng lặp theo checksum — 3/5

**Code evidence**

- `backend/app/utils/checksum.py::compute_file_checksum` dùng SHA-256, đọc theo chunk.
- `document_service.create_document_from_upload()`:
  - chặn trùng trong cùng scope (personal owner hoặc workspace);
  - tìm bất kỳ document nào cùng checksum để tái sử dụng `file_path` (single-instance storage);
  - trả lỗi `duplicate_document:{id}` hoặc `in_trash:{id}:{title}`.
- `file_service.remove_file_if_unreferenced()` chỉ xóa vật lý khi không còn document nào tham chiếu `file_path`/`thumbnail_path`/`markdown_path`.

**Test evidence**

- `test_documents.py::test_upload_document_duplicate_checksum` mock service → không kiểm tra dedupe thật.
- `test_storage_dedup.py::test_remove_file_if_unreferenced` mock DB và `safe_remove` → kiểm tra nhánh refcount, không kiểm tra storage thật.
- `test_storage_dedup.py::test_local_storage_save_and_url` test thật local save/remove.
- Baseline 0B có 3 cặp file trùng byte (C14/C01, C15/C02, E08/E07), xác nhận manifest/checksum; không chạy qua endpoint upload.

**Khoảng trống**

- **Không phải content-addressed storage thật**: tên file vẫn là UUID, không phải hash; “CAS” ở đây là single-instance storage theo checksum.
- **Race condition**: hai request cùng checksum có thể cùng vượt qua `SELECT` rồi cùng `INSERT`; DB chưa có unique constraint trên `(checksum, owner_id, workspace_id)`.
- Query tái sử dụng file vật lý không giới hạn tenant; đây là chủ ý để dedupe, nhưng cần đảm bảo quyền đọc file luôn được kiểm tra ở endpoint (hiện `get_document_file()` có kiểm tra).
- Không có test đồng thời hoặc test tích hợp upload thật.

**Kết luận**: tiết kiệm dung lượng tốt cho demo, nhưng chưa đủ chắc cho môi trường nhiều người dùng đồng thời.

### 3.5. Local storage — 4/5

**Code evidence**

- `backend/app/services/file_service.py::save_upload_file()`: mặc định `STORAGE_BACKEND=local` hoặc không có `s3_client` → ghi `storage/{owner_id}/{uuid}{ext}`.
- `get_file_url()` trả URL tương đối khi local.
- `safe_remove()` xóa local và R2 (nếu cloud).
- `remove_file_if_unreferenced()` bảo vệ file dùng chung.
- Router file (`GET /documents/{id}/file`) đọc local trước, fallback R2, có kiểm tra quyền.

**Test evidence**

- `test_storage_dedup.py::test_local_storage_save_and_url`: ghi file thật vào `storage/999/...`, đọc lại byte-for-byte, lấy URL tương đối, xóa và xác nhận file biến mất. Đây là test thật có giá trị.
- `test_remove_file_if_unreferenced`: mock DB/safe_remove, chỉ kiểm tra logic refcount.

**Khoảng trống**

- Chưa kiểm soát quota ở tầng storage; quota chỉ hiển thị ở dashboard.
- `upload_bytes_to_r2()` khi local ghi theo `clean_key` (chỉ `lstrip("/")`), không chuẩn hóa `..`; callers hiện truyền path nội bộ, nhưng nên phòng thủ.
- Chưa có test cho file lớn, file lỗi giữa chừng, hoặc cleanup sau rollback.

**Kết luận**: nền local storage đủ tốt cho demo và có test thật; cần thêm phòng thủ path/quota.

### 3.6. R2 storage — 2/5

**Code evidence**

- `file_service.py`: `save_upload_file()` dùng `s3_client.put_object` khi cloud; `upload_bytes_to_r2()`; `download_file_from_r2()`; `download_r2_to_temp_file()`; `get_file_url()` trả `MINIO_PUBLIC_URL`/R2 URL; `safe_remove()` xóa object.
- `documents.py::_process_document_background()` tải file từ R2 về temp nếu không có local, xử lý, rồi upload thumbnail/Markdown lên R2.
- `get_document_file()` stream object từ R2 nếu local không có.

**Test evidence**

- **Không có test nào** cho R2: không mock `s3_client`, không test path normalization, không test fallback, không test lỗi upload.
- Baseline 0B chạy local, không chạm R2.

**Khoảng trống**

- `upload_bytes_to_r2()` nuốt exception và chỉ log warning; endpoint vẫn trả thành công dù Markdown/thumbnail chưa lên R2.
- Không có retry/outbox/đánh dấu trạng thái đồng bộ.
- Không có test cấu hình thiếu bucket/key.
- `doc.markdown_path` vẫn là path local sau khi upload R2; cần đảm bảo các consumer khác hiểu đúng.

**Kết luận**: code path tồn tại nhưng chưa có bằng chứng vận hành; không nên tuyên bố “hỗ trợ R2 hoàn chỉnh” trong báo cáo.

### 3.7. Markdown local/R2 — 3/5

**Code evidence**

- `backend/app/services/file_processor.py::generate_markdown()`:
  - file text/code: bọc trong code block có lexer;
  - file khác: `anydoc.to_markdown()`;
  - ghi `storage/markdowns/{doc_id}.md`.
- `_process_document_background()` gọi `generate_markdown()` trong executor, lưu `doc.markdown_path`, upload Markdown lên R2 nếu cloud.
- Nếu không tạo được thumbnail từ file gốc, lấy ảnh đầu tiên từ Markdown (`extract_first_image_from_markdown`).

**Test evidence**

- Không có test cho `generate_markdown`, `extract_first_image_from_markdown`, hay sync R2.
- Baseline 0B dùng `extract_text()`, không dùng Markdown; vì vậy không đo được chất lượng Markdown.

**Khoảng trống**

- Phụ thuộc `anydoc`; nếu thiếu package hoặc format lạ, chỉ log warning và `markdown_path=None`.
- Không có retry khi R2 upload thất bại.
- Markdown không được dùng làm nguồn cho FTS; FTS dùng `Document.content`. Đây là lựa chọn kiến trúc, nhưng cần nói rõ để tránh hiểu nhầm.
- Chưa có test cho PDF scan/mixed, DOCX/PPTX, file text.

**Kết luận**: có pipeline, nhưng là “best effort” chứ chưa phải tính năng được đảm bảo.

### 3.8. Full-text search — 4/5

**Code evidence**

- Migration `alembic/versions/b7c8d9e0f1a2_fix_fts_unaccent_trigger_and_backfill.py`:
  - `CREATE EXTENSION unaccent`;
  - function `update_document_search_vector()` dùng `to_tsvector('simple', unaccent(...))`;
  - weight title A, description B, content C;
  - trigger `trg_documents_search_vector` trước INSERT/UPDATE;
  - backfill toàn bộ document.
- `backend/app/models/document.py` có `search_vector` và GIN index `ix_documents_search_vector`.
- `SearchService.full_text_search()`:
  - `websearch_to_tsquery('simple', unaccent(query))`;
  - `search_vector @@ ts_query`;
  - `ORDER BY ts_rank(...) DESC`;
  - scope `(workspace_id IS NULL AND owner_id=user) OR (workspace_id IN accessible_ws_ids)`;
  - snippet lấy từ `content`, fallback `description`.
- `GET /search/full` gọi service này. `GET /search` (legacy) dùng `search_documents()` với FTS **hoặc** `LIKE` và `ORDER BY created_at`, không xếp hạng theo `ts_rank`.

**Test evidence**

- `backend/tests/test_search.py`: nhiều test mocked DB, có giá trị kiểm tra SQL predicate/scope, URL, snippet, fallback, pagination.
- `backend/tests/test_search_unaccent_integration.py`: test **real DB** cho trigger/unaccent và `search_documents()`, nhưng chỉ chạy khi có `TEST_DATABASE_URL`; không test `full_text_search()`.
- Baseline 0B: chạy `full_text_search()` thật trên PostgreSQL tạm, 60 câu, có scope.

**Kết quả baseline 0B**

| Tập | Answerable | Hit@1 | Hit@3 | Hit@5 | MRR@5 | Citation@5 | Forbidden leak | No-evidence FP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Calibration | 24 | 0.917 | 0.917 | 0.917 | 0.917 | 0.917 | 0/3 | 0.000 |
| Evaluation | 24 | 0.875 | 0.875 | 0.875 | 0.875 | 0.875 | 0/3 | 0.000 |
| **Tổng** | **48** | **0.896** | **0.896** | **0.896** | **0.896** | **0.896** | **0/6** | **0.000** |

- 0/60 query trả kết quả ngoài quyền; 0 kết quả ngoài quyền.
- 6/6 câu forbidden tìm thấy tài liệu cấm khi **bỏ scope** → fixture thực sự kiểm tra được rò rỉ.
- Latency local: median ~1.9 ms, p95 ~2.9 ms (các lần chạy dao động khoảng 1.8–2.0 ms / 2.3–3.4 ms).
- 5 câu miss: 4 câu hỏi trang 2 của PDF mixed (không được OCR), 1 câu do `Wi-Fi` tách token `wi` + `fi` trong khi query dùng `wifi`.

**Khoảng trống**

- `simple` không tách từ ghép tiếng Việt, không có synonym, không có `pg_trgm`.
- `Wi-Fi`/`wifi`, dấu gạch nối, viết tắt là điểm yếu token hóa.
- PDF mixed chỉ OCR khi toàn bộ PDF không có text layer → mất nội dung trang scan.
- `/search` legacy không dùng `ts_rank`; cần thống nhất API hoặc ghi rõ.
- Chưa có test real DB mặc định cho `full_text_search()`; 0B là runner riêng.

**Kết luận**: đây là năng lực mạnh nhất của hệ thống, với bằng chứng chạy thật; vẫn cần cải thiện token hóa và OCR từng trang.

### 3.9. Tags — 3/5

**Code evidence**

- `backend/app/routers/tags.py`: list/stats/create/get by name/merge/update/delete, tất cả lọc `Tag.owner_id == current_user.id`.
- `backend/app/routers/groups.py`: list group tags (member), create/update/delete group tags (full permission), add/remove tag cho document nhóm (full permission).
- `backend/app/routers/workspace_tags.py`: list/import/create/update/delete workspace tags.
- `PATCH /documents/{id}/tags`: thay tag cá nhân; nếu là bundle thì lan xuống child.
- Upload cá nhân/bundle cá nhân gán `tags_list`; group bundle không gán cho child.

**Test evidence**

- `backend/tests/test_categories_tags.py` chỉ assert `GET /categories/` và `GET /tags/` trả 200.
- Không có test cho merge, update/delete, tag assignment, tag ownership, workspace tag.
- Baseline 0B seed 47 tag và gắn vào document; FTS không dùng tag nên không đo tag filtering.

**Khoảng trống**

- `document_service.create_document_from_upload()` và `PATCH /documents/{id}/tags` chỉ kiểm tra tag tồn tại, **không kiểm tra owner/workspace**. Đây là lỗi ownership.
- Group batch upload không lọc tag theo `workspace_id`.
- `workspace_tags.py::get_workspace_or_404()` có `TODO: Check user là member của workspace`; các endpoint workspace tag hiện chưa được bảo vệ đúng.
- Group bundle không gán tag cho child; personal bundle có.
- FTS không search theo tag; nếu muốn lọc tag phải bổ sung.

**Kết luận**: CRUD có, nhưng quyền sở hữu tag là khoảng trống P0.

### 3.10. View count / trending — 4/5

**Code evidence**

- `document_service._do_log_activity()`:
  - dedupe theo `(document_id, user_id, action)` trong cửa sổ phút;
  - tạo `DownloadLog`;
  - bump ngay `DocumentStats.view_count`/`download_count`/`save_count`/`share_count`;
  - cập nhật `trending_score` và `last_activity_at`;
  - commit session.
- `GET /documents/{id}` và `GET /groups/{id}/documents/{id}` log `VIEWED` với dedupe 30 phút.
- `GET /documents/{id}/file` log `VIEWED`/`DOWNLOADED`; view dedupe 30 phút, download không dedupe.
- `scheduler.refresh_document_stats()` chạy mỗi giờ: lấy document có activity trong 48h, đếm lại từ `DownloadLog`, tính `weighted = views*1 + downloads*2 + saves*3 + shares*2`, recency, `score = weighted / (age_hours+2)^1.5 * recency`, upsert `DocumentStats`.
- `GET /documents/{id}/stats` trả stats; list `sort=trending` dùng `trending_score`.

**Test evidence**

- `test_activity_sorting.py::test_list_documents_trending_sort_order` dùng `fake_session`, kiểm tra response shape/sort, không kiểm tra increment thật.
- `test_document_out_schema_stats` chỉ kiểm tra schema.
- Không có test real DB cho `_do_log_activity` hay `refresh_document_stats`.

**Khoảng trống**

- `stats.view_count += 1` là read-modify-write, có thể mất cập nhật khi nhiều request đồng thời.
- `unique_viewers` chỉ được set khi tạo row; các view sau không tăng ngay, phải chờ scheduler.
- `GET /documents/{id}/stats` không kiểm tra quyền truy cập tài liệu.
- `_do_log_activity()` commit ngay trong hàm; nếu tái sử dụng với request session sẽ commit ngoài ý muốn (hiện `log_activity()` tạo session riêng nên rủi ro thấp).
- Scheduler chỉ quét document có activity trong 48h; đúng cho cập nhật, nhưng không tự sửa dữ liệu cũ nếu không có activity mới.

**Kết luận**: số liệu gần đúng và có cơ chế recompute; cần khóa/atomic update và test thật.

---

## 4. Ma trận bằng chứng code ↔ test

| Năng lực | Code chính | Test hiện có | Mức bằng chứng |
|---|---|---|---|
| Upload cá nhân | `routers/documents.py`, `services/document_service.py` | `test_documents.py` (mock service) | Mock, chưa end-to-end |
| Upload nhóm | `routers/groups.py` | `test_permission_normalization.py` (mock helper) | Mock helper, chưa route |
| Bundle | `routers/documents.py`, `routers/groups.py` | `test_dashboard.py` (mock service) | Hợp đồng mock, chưa upload |
| CAS/dedupe | `utils/checksum.py`, `services/document_service.py`, `services/file_service.py` | `test_storage_dedup.py` (1 test thật, 1 mock) | Một phần thật |
| Local storage | `services/file_service.py` | `test_local_storage_save_and_url` | **Thật** |
| R2 | `services/file_service.py`, `routers/documents.py` | Không có | **Không có** |
| Markdown | `services/file_processor.py`, `_process_document_background` | Không có | **Không có** |
| FTS | `services/search_service.py`, migration `b7c8…`, model | `test_search.py` (mock), `test_search_unaccent_integration.py` (real, cần DB), **0B runner** | **Thật qua 0B** |
| Tags | `routers/tags.py`, `routers/groups.py`, `routers/workspace_tags.py` | `test_categories_tags.py` (status 200) | Rất mỏng |
| View count | `services/document_service.py`, `jobs/scheduler.py`, `routers/stats.py` | `test_activity_sorting.py` (fake session) | Mock |

---

## 5. Baseline 0B — bằng chứng chạy thật

### 5.1. Thành phần corpus

| Loại | Số lượng | Ghi chú |
|---|---:|---|
| PDF text | 6 | Có text layer, trích xuất trực tiếp |
| PDF scan | 4 | Không text layer, OCR `vie+eng` |
| PDF mixed | 4 | Trang 1 text, trang 2 scan |
| DOCX | 8 | `python-docx` |
| PPTX | 6 | `python-pptx` |
| Bundle | 2 | Chỉ metadata cha, có child |
| **Tổng tài liệu** | **30** | 15 calibration + 15 evaluation |
| Câu hỏi | 60 | 48 answerable, 6 forbidden, 6 no-evidence |

- 3 cặp trùng byte: C14/C01, C15/C02, E08/E07.
- Quyền: `sv_an` và `sv_binh`; G1/G2 có member chéo; G3 chỉ `sv_binh`.
- Mọi citation có `quote` nằm trong text kỳ vọng và `location` khớp segment; generator assert điều này trước khi ghi manifest.

### 5.2. Kết quả trích xuất

| Format | Số tài liệu | Token recall trung bình | Thấp nhất |
|---|---:|---:|---:|
| bundle | 2 | 1.000 | 1.000 |
| docx | 8 | 1.000 | 1.000 |
| pdf_mixed | 4 | 0.518 | 0.473 |
| pdf_scan | 4 | 1.000 | 1.000 |
| pdf_text | 6 | 1.000 | 1.000 |
| pptx | 6 | 1.000 | 1.000 |

Diễn giải: OCR scan đạt recall 1.000 trên corpus tổng hợp (chữ rõ, font chuẩn). PDF mixed mất khoảng một nửa nội dung vì trang scan không được OCR. Đây là giới hạn code, không phải lỗi corpus.

### 5.3. Kết quả truy hồi

- **Hit@1 = 0.896**, **Hit@5 = 0.896**, **MRR@5 = 0.896** trên 48 câu answerable.
- **Forbidden leak = 0/6**; **unscoped retrieval = 1.000** (kiểm tra fixture).
- **No-evidence false positive = 0.000**.
- **Scope leak = 0 query / 0 kết quả**.
- **Latency**: median ~1.9 ms, p95 ~2.9 ms trên PostgreSQL tạm local (xem `reports/baseline.json` để có số chính xác của lần chạy).

### 5.4. Các câu miss và nguyên nhân

| ID | Query | Nguyên nhân |
|---|---|---|
| CQ10 | `bieu do duong xu huong thoi gian` | Nội dung nằm ở trang 2 PDF mixed; trang scan không được index. |
| CQ12 | `volume lưu dữ liệu bền vững` | Cùng nguyên nhân PDF mixed. |
| EQ10 | `màu sắc dashboard độ tương phản người mù màu` | Cùng nguyên nhân PDF mixed. |
| EQ12 | `secret lưu thông tin nhạy cảm mật khẩu` | Cùng nguyên nhân PDF mixed. |
| EQ04 | `wpa3 giao thuc bao mat wifi hien dai` | `Wi-Fi` trong tài liệu tách thành `wi` + `fi`; query `wifi` không khớp. |

### 5.5. Cách tái lập

```bash
.venv/bin/python backend/tests/evaluation/run_baseline.py
```

Chi tiết trong `backend/tests/evaluation/README.md`, kết quả máy đọc tại `backend/tests/evaluation/reports/baseline.json`, bản tóm tắt tại `backend/tests/evaluation/reports/baseline.md`.

---

## 6. Khuyến nghị ưu tiên

### P0 — trước khi coi là hoàn thiện bảo mật

1. **Chặn upload vào nhóm không thuộc quyền**: bỏ `workspace_id` khỏi endpoint cá nhân hoặc gọi `require_full_permission()` khi có `workspace_id`.
2. **Scoped tag assignment**: mọi truy vấn tag phải lọc `owner_id`/`workspace_id`; thêm test gắn tag chéo.
3. **Bảo vệ workspace tags**: thay `TODO` trong `workspace_tags.get_workspace_or_404()` bằng kiểm tra member/full.
4. **Chống race dedupe**: thêm unique constraint/index trên `(checksum, owner_id, workspace_id)` hoặc dùng transaction advisory lock/upsert.

### P1 — trước khi coi là production-ready

5. Test tích hợp thật cho upload cá nhân/nhóm/bundle: file → storage → DB → background → search.
6. Test R2 bằng mock S3/MinIO; không nuốt lỗi upload, có retry/outbox.
7. Test Markdown cho PDF text/scan/mixed, DOCX, PPTX; đánh dấu trạng thái nếu thất bại.
8. OCR từng trang PDF khi trang đó không có text layer, thay vì chỉ OCR khi toàn bộ PDF rỗng.
9. Thêm auth cho `GET /documents/{id}/stats`; cân nhắc quyền member nhóm.
10. Atomic increment view count (`UPDATE ... SET view_count = view_count + 1`) và cập nhật `unique_viewers` đúng cách.

### P2 — cải thiện chất lượng dài hạn

11. Chuẩn hóa token `Wi-Fi`/`wifi`, viết tắt, gạch nối; thêm `pg_trgm`/synonym.
12. Thống nhất `/search` và `/search/full`, tránh client dùng nhầm đường không xếp hạng.
13. Lan tag nhất quán cho group bundle; tính đúng `bundle.file_size` khi tái sử dụng CAS.
14. Đưa baseline 0B vào CI với PostgreSQL disposable và ngưỡng regression (Hit@5, leak = 0, FP = 0).

---

## 7. Kết luận

Hệ thống đã có một **luồng tài liệu end-to-end tương đối hoàn chỉnh** cho demo: upload cá nhân/nhóm/bundle, lưu local, xử lý nền, tìm kiếm full-text có phân quyền, tag và thống kê lượt xem. Điểm mạnh lớn nhất là FTS có nền tảng CSDL đúng và lần đầu có **bằng chứng chạy thật** với corpus tiếng Việt 30 tài liệu/60 câu hỏi.

Điểm yếu lớn nhất không nằm ở tính năng mà ở **ranh giới quyền và bằng chứng kiểm thử**: upload có thể ghi vào nhóm không thuộc quyền, tag chưa được scoped, R2/Markdown gần như chưa được test, và một số test hiện tại chỉ kiểm tra mock/schema. Vì vậy, mức 3.3/5 là đánh giá trung thực: **dùng được cho bảo vệ đồ án và demo, nhưng cần xử lý P0/P1 trước khi triển khai thật**.
