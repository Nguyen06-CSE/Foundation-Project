# BÁO CÁO TOÀN DIỆN RÀ SOÁT, TỐI ƯU VÀ THỰC THI CƠ SỞ DỮ LIỆU
## (DATABASE AUDIT, NORMALIZATION & EXECUTION RECORD)

- **Ngày lập báo cáo (As-of Date)**: 24/11/2026 (Cập nhật thực thi Mục 4)
- **Môi trường cơ sở dữ liệu**: PostgreSQL 16 (Neon Serverless, khu vực `ap-southeast-1`), Tên CSDL: `neondb` *(Toàn bộ mật khẩu và thông tin nhạy cảm đã được loại trừ)*
- **Nhánh Git hiện tại**: `main`
- **Thư mục làm việc xác thực (Authorized Workspace)**: `/Users/caotiendattx/Developer/Foundation-Project` *(Đồng nhất inode `8138355` với alias `/Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project`)*
- **Trạng thái HEAD repository hiện tại**: `b3c4d5e6f7a8` (đơn nhánh, tuyến tính, **chưa deploy Live**). Nhật ký đợt 4.1 ghi nhận Live từng ở `a2b3c4d5e6f7`; đợt rà soát ngày 25/11 không kết nối Live để xác minh lại.

---

## 1. BỐI CẢNH, MỤC TIÊU BAN ĐẦU VÀ RÀNG BUỘC KỸ THUẬT

### 1.1. Mục tiêu ban đầu của đợt rà soát
Đợt rà soát toàn diện CSDL được thực hiện nhằm giải quyết các tồn đọng lịch sử phát sinh qua quá trình phát triển nhanh của dự án **Foundation Project (E-Library)**:
1. **Khắc phục các lỗi cấu trúc P0**: Xử lý triệt để tình trạng phân nhánh migration (split heads), thiếu khóa chính thực thể, chỉ mục tìm kiếm toàn văn bị trùng lặp, trigger tìm kiếm tiếng Việt không hỗ trợ tìm kiếm bỏ dấu (`unaccent`), và bất nhất tỷ lệ 1:1 giữa tài liệu (`documents`) và thống kê tương tác (`document_stats`).
2. **Dọn dẹp và chuẩn hóa dữ liệu cũ (Data Cleanup & Integrity)**: Chuyển dịch dữ liệu thẻ nhãn (`tags`) cũ về đúng quan hệ `workspace_tags`, khắc phục sai lệch đếm lượt tải thư viện do lẫn lộn sự kiện xem và tải, bổ sung các ràng buộc miền giá trị (CHECK constraints), khóa ngoại xóa tầng (`ON DELETE`), và chuẩn hóa kiểu dữ liệu boolean/thời gian.
3. **Thống nhất mô hình phân quyền**: Giải quyết sự phân mảnh về giá trị quyền hạn thành viên (`view`, `edit`, `write`, `full`, `admin`) thành một tập giá trị chính quy duy nhất.
4. **Nâng cao độ tin cậy triển khai (Deployment Reliability)**: Chuyển dịch từ cơ chế tự động can thiệp DDL lúc khởi động ứng dụng (`main.py`) sang quy trình migration tiền triển khai độc lập, có thể kiểm soát và tự động hóa qua container/systemd.

### 1.2. Ràng buộc bảo tồn API hiện hữu và tương thích ngược
Trong toàn bộ quá trình tái cấu trúc CSDL, các nguyên tắc bất di bất dịch đã được thiết lập và tuân thủ nghiêm ngặt:
- **Không phá vỡ cấu trúc phản hồi API (Response Contract Preservation)**: Mọi thay đổi logic backend (như bộ lọc đếm lượt tải `download_count` trong `/library/`) phải giữ nguyên 100% hình thái schema Pydantic trả về cho Frontend.
- **Bảo tồn các thực thể còn API hoạt động**: Bảng `categories` và cột `documents.category_id` dù trước đó từng nằm trong danh sách rà soát nhưng qua phân tích đồ thị phụ thuộc (Graphify), API nhóm danh mục (`/categories`) vẫn đang phục vụ người dùng hoạt động. Do đó, toàn bộ thực thể `categories` được bảo tồn nguyên vẹn, không chỉnh sửa hay xóa bỏ.
- **Tiến hành tuần tự, chia đợt an toàn**: Mỗi thay đổi DDL/DML đều trải qua bước kiểm tra tiền khả thi (preflight read-only check) trên môi trường live trước khi áp dụng.

### 1.3. Tạm hoãn / Loại trừ hoàn toàn hạng mục Vector Storage (pgvector)
- Toàn bộ kế hoạch liên quan đến lưu trữ vector ngữ nghĩa (pgvector, embedding chunking, chỉ mục HNSW/IVFFlat) **tạm thời loại trừ hoàn toàn** khỏi đợt thực thi này.
- **Lý do**: Cần hoàn tất chuẩn hóa cấu trúc dữ liệu nền tảng và kiểm chứng độ tương thích phiên bản của extension `vector` trên hạ tầng cơ sở dữ liệu serverless trước khi tiến hành thiết kế schema chi tiết.

---

## 2. ĐỀ XUẤT THIẾT KẾ VÀ CƠ SỞ LÝ LUẬN KỸ THUẬT (DESIGN PROPOSALS & RATIONALE)

### 2.1. Chuẩn hóa tính toàn vẹn (Integrity Normalization)
- **Chuẩn hóa giá trị Boolean**: Các cột cờ trạng thái `is_deleted`, `is_important`, `is_read` trong mô hình dữ liệu cũ cho phép `NULL`, dẫn đến rủi ro sai lệch mệnh đề `WHERE column = false` (trong chuẩn SQL ba giá trị: `NULL = false` trả về `UNKNOWN`). Thiết kế đề xuất chuyển toàn bộ sang `NOT NULL DEFAULT false`.
- **Mốc thời gian chuẩn quốc tế**: Cột `documents.deleted_at` ban đầu định nghĩa `TIMESTAMP WITHOUT TIME ZONE`. Khi người dùng ở các múi giờ khác nhau thao tác, việc không lưu múi giờ gây lệch mốc xóa mềm và lịch quét dọn tự động. Thiết kế nâng cấp thành `TIMESTAMPTZ` (lưu UTC).
- **Chính sách xóa khóa ngoại (FK Delete Policies)**:
  - `document_shares.document_id`: Đặt `ON DELETE SET NULL` để khi một tài liệu bị xóa, bản ghi lịch sử chia sẻ vẫn lưu vết phục vụ kiểm toán thay vì bị xóa mất dấu hoặc chặn xóa tài liệu.
  - `community_submissions.document_id`: Đặt `ON DELETE CASCADE` vì bài nộp cộng đồng phụ thuộc vòng đời trực tiếp vào tài liệu gốc.
- **Ràng buộc kiểm tra miền giá trị (CHECK Constraints)**: Tạo 4 ràng buộc CHECK ở trạng thái `NOT VALID` rồi thực hiện `VALIDATE CONSTRAINT` để tránh lock bảng kéo dài:
  - `chk_documents_scope`: Kiểm tra phạm vi tài liệu cá nhân vs nhóm.
  - `chk_workspaces_type`: Giới hạn loại không gian làm việc (`'personal'`, `'group'`).
  - `chk_document_shares_status`: Giới hạn trạng thái chia sẻ (`'pending'`, `'accepted'`, `'rejected'`).
  - `chk_download_logs_action`: Chuẩn hóa hành vi tải về các giá trị chuẩn.

### 2.2. Chiến lược chỉ mục và quyết định đo đạc (Index Strategy & Rationale)
- **Hai chỉ mục trigram trên `documents.title`**:
  - Live có cả `idx_document_title_trgm` và `idx_documents_title_trgm`, cùng là GIN `title gin_trgm_ops`; scans lần lượt 0 và 5. Không được kết luận rằng một trong hai không tồn tại.
  - *Cơ sở lý luận*: Tìm kiếm tiêu đề dùng `ILIKE '%...%'` cần chỉ mục trigram GIN để tránh Seq Scan. Migration `b3c4d5e6f7a8` chỉ drop `idx_document_title_trgm` sau preflight catalog chứng minh hai index tương đương; nếu không đủ bằng chứng thì giữ cả hai và báo `NOTICE`. Retained index là `idx_documents_title_trgm`.
- **Không tạo thêm chỉ mục đơn `download_logs(document_id)`**:
  - *Cơ sở lý luận*: Bảng `download_logs` đã có sẵn chỉ mục tổ hợp `ix_download_logs_doc_user` trên `(document_id, user_id)`. Theo nguyên lý cây B-Tree, chỉ mục tổ hợp có cột đầu tiên là `document_id` sẽ phục vụ tối ưu cho mọi truy vấn lọc và nhóm theo `document_id`. Việc tạo thêm chỉ mục đơn trên `document_id` là hoàn toàn dư thừa, gây tiêu tốn tài nguyên ghi (Write Amplification) và dung lượng RAM/Buffer Cache.
- **Loại bỏ chỉ mục trùng lặp FTS GIN**:
  - Bảng `documents` trước đó tồn tại song song 2 chỉ mục GIN trên cùng cột `search_vector`: `idx_documents_search_vector` và `ix_documents_search_vector`. Đã xóa chỉ mục thừa `idx_documents_search_vector`, giữ lại chỉ mục chuẩn `ix_documents_search_vector`.

### 2.3. Chuẩn hóa quyền hạn thành viên (Canonical Permissions view/full)
- **Vấn đề tồn tại**: CSDL và mã nguồn tồn tại song song các giá trị quyền hạn: `view`, `edit`, `write`, `full`, `admin`.
- **Cơ sở lý luận và Quyết định của User**:
  - Người dùng đã đưa ra quyết định kiến trúc dứt khoát: Hệ thống chỉ duy trì đúng **2 mức quyền thành viên chính quy**: `'view'` (chỉ xem) và `'full'` (toàn quyền).
  - Giá trị `'admin'` trước đây gán cho chủ sở hữu nhóm trong bảng thành viên là dư thừa và tiềm ẩn rủi ro leo thang quyền, vì quyền sở hữu nhóm đã được xác thực độc lập thông qua cột `workspaces.owner_id`. Khi chủ nhóm thao tác, hệ thống kiểm tra `workspace.owner_id == current_user.id`.
  - Hai bản ghi duy nhất có `permission_level = 'edit'` trên live DB được xác nhận không phải là chủ sở hữu và được người dùng phê duyệt nâng cấp thành `'full'` (tương đương toàn quyền chỉnh sửa trong không gian nhóm).
  - Thiết lập ràng buộc `chk_workspace_members_permission CHECK (permission_level IN ('view', 'full'))` ở tầng CSDL để ngăn chặn triệt để dữ liệu rác trong tương lai.

### 2.4. Quy trình triển khai Migration tin cậy thay thế Startup DDL
- **Nguy cơ từ Startup DDL**: Hàm khởi động `init_db()` trong `app/main.py` thực hiện các câu lệnh `CREATE TABLE IF NOT EXISTS` và DDL trực tiếp khi FastAPI boot. Trong môi trường production chạy nhiều uvicorn worker hoặc nhiều container phân tán, việc cùng lúc chạy DDL lúc boot dẫn đến deadlock, race condition, và làm mờ ranh giới lịch sử phiên bản của Alembic.
- **Giải pháp**: Xây dựng kịch bản wrapper `backend/entrypoint.sh` thực thi `alembic upgrade head` trước khi tiến trình web server khởi động. Bổ sung cấu hình mẫu cho Docker Compose và systemd (`ExecStartPre`).

---

## 3. CHI TIẾT THỰC THI THEO TỪNG GIAI ĐOẠN (COMPLETED WORK BY PHASES)

### 3.1. Bảng tổng hợp trạng thái các hạng mục (Status Summary Table)

| Giai đoạn | Hạng mục công việc | Đối tượng ảnh hưởng | Trạng thái Live / Repo | Ghi chú & Kết quả định lượng |
| :--- | :--- | :--- | :---: | :--- |
| **P0** | Composite PK `workspace_members` | Bảng `workspace_members` | **Live DB** (`e4f5a6b7c8d9`) | Khóa chính `(workspace_id, user_id)` ngăn bản ghi trùng lặp. |
| **P0** | Xóa duplicate FTS GIN index | Bảng `documents` | **Live DB** (`f5a6b7c8d9e0`) | Xóa `idx_documents_search_vector`, giữ `ix_documents_search_vector`. |
| **P0** | Fix FTS unaccent trigger & backfill | Function + Trigger `documents` | **Live DB** (`b7c8d9e0f1a2`) | Hợp nhất nhánh migration; hỗ trợ tìm kiếm tiếng Việt không dấu. |
| **P0** | Backfill thiếu `document_stats` | Bảng `document_stats` | **Live DB** (`c8d9e0f1a2b3`) | Backfill đủ 27 bản ghi thiếu; đạt tỷ lệ 1,076/1,076 tài liệu (100%). |
| **Phase 1** | Dọn dẹp thẻ nhãn Tag 39 | Bảng `tags`, `workspace_tags` | **Live DB** (`d9e0f1a2b3c4`) | Map Tag 39 sang `workspace_tags(10, 39, 6)`, set `tags.workspace_id = NULL`. |
| **Phase 1** | Tối ưu bộ lọc đếm lượt tải | Router `library.py` | **Repo Code** | Đếm đúng `action IN ('DOCUMENT_DOWNLOADED', 'download')`, giữ nguyên API shape. |
| **Phase 1** | Đánh giá chỉ mục Trigram & Logs | `documents`, `download_logs` | **Live Verified** | Có cả `idx_document_title_trgm` và `idx_documents_title_trgm`; migration b3 chỉ drop index trùng sau preflight, giữ retained index. Không tạo trùng `download_logs(document_id)`. |
| **Phase 2** | Chuẩn hóa Boolean & Timezone | `documents`, `notifications` | **Live DB** (`e0f1a2b3c4d5`) | Booleans `NOT NULL DEFAULT false`; `deleted_at` TIMESTAMPTZ. |
| **Phase 2** | Chuẩn hóa FK On-Delete Policy | `document_shares`, `community_submissions` | **Live DB** (`e0f1a2b3c4d5`) | `shares` -> `SET NULL`; `submissions` -> `CASCADE`. |
| **Phase 2** | Bổ sung 4 CHECK constraints | `documents`, `workspaces`, `shares`, `logs` | **Live DB** (`e0f1a2b3c4d5`) | Thêm và validate 4 ràng buộc toàn vẹn dữ liệu. |
| **Phase 2** | Chuẩn hóa Download Logs cũ | Bảng `download_logs` | **Live DB** (`e0f1a2b3c4d5`) | Chuyển đổi 48 bản ghi `action = 'view'` sang `'DOCUMENT_VIEWED'`. |
| **Perms** | Chuẩn hóa quyền view/full | `workspace_members` | **Live DB** (`f1a2b3c4d5e6`) | Di chuyển 2 row `edit` -> `full`; ràng buộc `chk_workspace_members_permission`. |
| **Perms** | Cập nhật Backend Schemas & Services | `group.py`, `workspaces.py`, `group_service.py` | **Repo Code** | Chặn `edit`/`admin` tại schema Pydantic; owner check qua `workspaces.owner_id`. |
| **Perms** | Kiểm thử quyền trên Disposable DB | `test_permission_normalization.py` | **Repo Tests** | 4/4 test passed trên SQLite in-memory, không chạm live Neon DB. |
| **Phase 3** | Kịch bản triển khai Migration runner | `backend/entrypoint.sh`, Deployment doc | **Repo Config** | Tạo entrypoint thực thi migration tự động trước uvicorn. |
| **Phase 3** | Đánh dấu Deprecate artifact thừa | Model `processing_job.py` | **Repo Code** | Đánh dấu deprecation trong docstring (0 rows live, 0 API). |
| **Phase 3** | Duy trì thực thể Categories | `category.py`, `library.py` | **Repo & Live Bảo tồn** | Giữ nguyên vẹn bảng `categories` và 6 bản ghi live vì API đang hoạt động. |
| **Phase 4** | DROP thực thể thừa legacy | `processing_jobs`, `trash_batches`, `documents.trash_batch_id` | **Live DB** (`b3c4d5e6f7a8`) | `a2b3c4d5e6f7` DROP sau preflight 100% khớp (0 job, 0 doc ref, 2 seed row); sau đó upgrade `b3` thành công. |
| **Phase 4** | Sync shares/bundle/MV/trigram | `document_shares`, `documents`, `community_subject_stats` | **Live DB** (`b3c4d5e6f7a8`) | CHECK 6 status validated; index bundle; MV filter + unique index; trigram retained; counts không đổi. |
| **Phase 5** | Sửa drift `documents.updated_at` | `search_service.py` | **Repo Code + Live verified** | Raw SQL `ORDER BY updated_at` → `created_at`; không cần migration; GET `/search/` và FTS không dấu PASS. |
| **Phase 5** | Chặn tự gán `role` | `schemas/auth.py`, `schemas/user.py`, `routers/auth.py` | **Repo Code** | Đăng ký luôn `student`; `UserUpdate` bỏ `role`; test quyền PASS. |
| **Phase 5** | Rà runtime role/credential | Docs + Live role | **Blocker** | Role runtime có nhiều đặc quyền; secret thật trong doc archived; cần rotate qua console/UI. |

---

### 3.2. Bảng tiến trình Migration theo thời gian (Chronological Migration Table)

Toàn bộ lịch sử di chuyển lược đồ của Foundation Project hiện cấu thành chuỗi tuyến tính duy nhất:

| Revision ID | Down Revision | Tên bản Migration | Trạng thái | Nội dung chính |
| :--- | :--- | :--- | :---: | :--- |
| `dae4972dff87` | *(None)* | `init_full_db_elibrary` | **Live** | Khởi tạo toàn bộ CSDL nền tảng. |
| `f844331e6c1e` | `dae4972dff87` | `add_is_dissolving_and_dissolve_at` | **Live** | Thêm cơ chế giải thể workspace. |
| `93f46eb359df` | `f844331e6c1e` | `add_workspace_tags_table` | **Live** | Phân tách bảng `workspace_tags`. |
| `45ab664fbe54` | `93f46eb359df` | `restore_fts_search_vector_trigger` | **Live** | Trigger cập nhật `search_vector`. |
| `d76927b437fe` | `45ab664fbe54` | `add_activity_tracking` | **Live** | Bổ sung `download_logs`, `document_stats`. |
| `a1b2c3d4e5f6` | `d76927b437fe` | `add_notification_link_and_user_todos` | **Live** | Thêm bảng `user_todos`, cột `link`. |
| `c3d4e5f6a7b8` | `a1b2c3d4e5f6` | `add_partial_unique_index_document_shares` | **Live** | Thêm partial unique index pending share. |
| `e4f5a6b7c8d9` | `c3d4e5f6a7b8` | `add_workspace_members_primary_key` | **Live** | Tạo Composite PK `(workspace_id, user_id)`. |
| `6a8f0b1c2d3e` | `c3d4e5f6a7b8` | `add_composite_index_download_logs` | **Live** | Tạo index `ix_download_logs_doc_user`. |
| `f5a6b7c8d9e0` | `e4f5a6b7c8d9` | `drop_duplicate_fts_gin_index` | **Live** | Xóa index FTS GIN trùng lặp. |
| `b7c8d9e0f1a2` | `f5a6b7c8d9e0`, `6a8f0b1c2d3e` | `fix_fts_unaccent_trigger_and_backfill` | **Live** | Hợp nhất nhánh migration; trigger FTS unaccent. |
| `c8d9e0f1a2b3` | `b7c8d9e0f1a2` | `backfill_missing_document_stats` | **Live** | Backfill 27 stats thiếu; đạt 1076/1076. |
| `d9e0f1a2b3c4` | `c8d9e0f1a2b3` | `map_legacy_tag_and_clear_workspace` | **Live** | Map Tag 39, set `tags.workspace_id = NULL`. |
| `e0f1a2b3c4d5` | `d9e0f1a2b3c4` | `batch2_integrity_normalization` | **Live** | Booleans, TIMESTAMPTZ, FKs, 4 CHECKs, logs action. |
| `f1a2b3c4d5e6` | `e0f1a2b3c4d5` | `normalize_workspace_member_permission_levels` | **Live** | Chuẩn hóa quyền view/full, CHECK constraint. |
| `a2b3c4d5e6f7` | `f1a2b3c4d5e6` | `drop_obsolete_processing_jobs_and_trash_batches` | Theo nhật ký 4.1 | Xóa bỏ bảng và cột thừa: `processing_jobs`, `trash_batches`, `documents.trash_batch_id`. |
| `b3c4d5e6f7a8` | `a2b3c4d5e6f7` | `sync_schema_shares_bundle_and_community_stats` | **HEAD repo, chưa deploy** | Mở rộng CHECK share status, index bundle, MV `community_subject_stats`, trigram preflight. |

---

### 3.3. Chi tiết P0: Khắc phục lỗi nghiêm trọng & bất nhất dữ liệu
1. **Khóa chính `workspace_members` (`e4f5a6b7c8d9`)**: Khắc phục lỗ hổng không có Primary Key của bảng thành viên, ngăn chặn việc một người dùng có nhiều bản ghi trùng lặp trong cùng một nhóm.
2. **Xóa chỉ mục trùng lặp FTS GIN (`f5a6b7c8d9e0`)**: Xóa `idx_documents_search_vector`, giảm 50% chi phí duy trì chỉ mục GIN trên mỗi lần cập nhật nội dung tài liệu.
3. **Cải tiến Trigger FTS tiếng Việt bỏ dấu (`b7c8d9e0f1a2`)**: 
   - Thay thế hàm phát sinh vector cũ bằng hàm sử dụng extension `unaccent`:
     ```sql
     to_tsvector('simple', unaccent(coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '')))
     ```
   - Điểm hợp nhất (mergepoint) giải quyết tình trạng split head giữa nhánh chỉ mục tải và nhánh khóa chính.
4. **Đồng bộ hóa 1:1 `document_stats` (`c8d9e0f1a2b3`)**:
   - Truy vấn phát hiện 27 tài liệu ban đầu không có bản ghi tương ứng trong `document_stats`.
   - Migration thực hiện backfill tự động với giá trị mặc định (`view_count = 0, download_count = 0, rating_count = 0, rating_avg = 0.0`).
   - Kết quả xác minh: Đạt tỷ lệ 1,076 / 1,076 tài liệu có đúng 1 bản ghi thống kê đi kèm.

---

### 3.4. Chi tiết Đợt 1 (Phase 1): Dọn dẹp Tag 39 & Sửa lỗi đếm lượt tải
1. **Dọn dẹp Tag 39 (`d9e0f1a2b3c4`)**:
   - Tiền kiểm tra: Tag ID 39 có `workspace_id = 10`, `owner_id = 6`. Bảng `workspace_tags` chưa có liên kết `(workspace_id=10, tag_id=39)`.
   - Thực thi an toàn: Thêm bản ghi `workspace_tags(workspace_id=10, tag_id=39, owner_user_id=6)` và cập nhật `tags.workspace_id = NULL`.
   - Kết quả: Không còn bất kỳ tag nào sử dụng cột `workspace_id` cũ trên bảng `tags`.
2. **Khắc phục lỗi logic đếm lượt tải thư viện**:
   - Mã nguồn cũ trong `backend/app/routers/library.py` đếm toàn bộ bản ghi trong `download_logs` mà không lọc theo `action`, dẫn đến việc các sự kiện `view` cũng bị cộng dồn thành lượt tải.
   - Sửa đổi: Bổ sung điều kiện lọc `DownloadLog.action.in_([ActivityAction.DOWNLOADED, "download"])`.
   - Đảm bảo 100% hình thái trả về (schema response) của API không thay đổi.

---

### 3.5. Chi tiết Đợt 2 (Phase 2): Chuẩn hóa toàn vẹn dữ liệu
Migration `e0f1a2b3c4d5` đã áp dụng thành công các chuẩn hóa:
1. **Cột Boolean**: Chuyển đổi `documents.is_important`, `documents.is_deleted`, `notifications.is_read` thành `BOOLEAN NOT NULL DEFAULT false`.
2. **Múi giờ**: Chuyển đổi `documents.deleted_at` thành `TIMESTAMPTZ`.
3. **Khóa ngoại**:
   - `document_shares_document_id_fkey`: Chuyển thành `ON DELETE SET NULL`.
   - `community_submissions_document_id_fkey`: Chuyển thành `ON DELETE CASCADE`.
4. **Ràng buộc CHECK (Áp dụng kỹ thuật NOT VALID -> VALIDATE)**:
   - `chk_documents_scope`: Kiểm tra tài liệu cá nhân vs tài liệu nhóm.
   - `chk_workspaces_type`: `CHECK (type IN ('personal', 'group'))`.
   - `chk_document_shares_status`: `CHECK (status IN ('pending', 'accepted', 'auto_accepted'))` tại thời điểm `e0f1a2b3c4d5`; migration `b3c4d5e6f7a8` mở rộng lên đủ 6 giá trị.
   - `chk_download_logs_action`: `CHECK (action IN ('DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SHARED', 'DOCUMENT_DELETED', 'DOCUMENT_RESTORED', 'DOCUMENT_RECEIVED', 'DOCUMENT_CONTRIBUTED', 'DOCUMENT_SAVED'))`.
5. **Chuẩn hóa dữ liệu log cũ**: Di chuyển 48 bản ghi có `action = 'view'` sang giá trị chuẩn `'DOCUMENT_VIEWED'`.

---

### 3.6. Chi tiết Chuẩn hóa Quyền Hạn (Permission Normalization)
1. **Quyết định dứt khoát của User**:
   - Hệ thống chính quy hóa chỉ chấp nhận 2 giá trị duy nhất: `'view'` (chỉ xem) và `'full'` (toàn quyền).
   - Hai bản ghi duy nhất có `permission_level = 'edit'` trên live DB (`workspace_id=3, user_id=8` và `workspace_id=5, user_id=6`) được xác minh độc lập không phải chủ nhóm (`is_owner = false`) và được nâng cấp thành `'full'`.
   - Quyền hạn của chủ nhóm (Owner) được quản lý tối cao qua `workspaces.owner_id == user_id`, không cần sử dụng giá trị `admin` giả định trong bảng thành viên.
2. **Thực thi Migration Live (`f1a2b3c4d5e6`)**:
   - Cập nhật 2 bản ghi `edit` thành `full`.
   - Tạo và thẩm định ràng buộc: `chk_workspace_members_permission CHECK (permission_level IN ('view', 'full'))`.
   - Kết quả kiểm đếm thực tế trên CSDL Live:
     - `'full'`: **20 bản ghi** (18 cũ + 2 chuyển đổi).
     - `'view'`: **10 bản ghi**.
     - Các giá trị khác: **0 bản ghi**.
     - Tổng cộng: **30 bản ghi thành viên hoàn toàn chính quy**.
3. **Đồng bộ mã nguồn Backend & Frontend**:
   - Backend Schema: `backend/app/schemas/group.py` định nghĩa `PermissionLevel = Literal["view", "full"]`.
   - Backend Router: `backend/app/routers/workspaces.py` dòng 51 chuyển từ `permission_level="admin"` sang `"full"`.
   - Backend Service: `backend/app/services/group_service.py` hàm `require_write_permission` kiểm tra `perm != "full"` và cho phép nếu là owner.
   - Seed Script: `backend/db/seed_incremental.py` chuẩn hóa 2 cấu hình mẫu từ `edit` sang `full`.
   - Frontend: `frontend/digital-library/src/types/group.ts` và các component giao diện đã hoàn toàn đồng bộ với kiểu `"view" | "full"`.
4. **Kiểm thử trên Disposable Test Database**:
   - Bộ kiểm thử tập trung tại `backend/tests/test_permission_normalization.py` được thiết kế chạy trên CSDL bộ nhớ dùng một lần (`sqlite+aiosqlite:///:memory:`).
   - Đảm bảo **100% không chạm hay phụ thuộc vào CSDL Live Neon**. Toàn bộ 4 test case đều vượt qua (validation schema, giá trị mặc định, kiểm tra chặn vi phạm CHECK constraint ở CSDL, và logic phân quyền service).

---

### 3.7. Chi tiết Đợt 3 (Phase 3): Hạ tầng triển khai Migration & Rà soát Legacy
1. **Cơ chế Migration Runner tin cậy**:
   - Đã tạo script thực thi độc lập [backend/entrypoint.sh](file:///Users/caotiendattx/Developer/Foundation-Project/backend/entrypoint.sh) với quyền thực thi `+x`.
   - Nội dung cốt lõi:
     ```bash
     #!/bin/bash
     set -e
     echo "Running Alembic migrations..."
     alembic upgrade head
     echo "Starting Uvicorn..."
     exec uvicorn app.main:app --host 0.0.0.0 --port 8000
     ```
   - Cập nhật tài liệu hướng dẫn triển khai tại `docs/99-luu-tru/deployment-cu/DEPLOYMENT_GUIDE.md`:
     - Systemd: Bổ sung chỉ thị `ExecStartPre=/usr/local/bin/alembic upgrade head`.
     - Docker Compose: Cập nhật chỉ thị khởi động chạy qua entrypoint hoặc `sh -c "alembic upgrade head && ..."`.
2. **Phân biệt rõ ràng giữa Mã cấu hình Runner và Rollout thực tế**:
   - Mã và file cấu hình cho runner đã hoàn tất trong repository.
   - **Tuy nhiên, chưa có bất kỳ hành động khởi động lại (restart) hay triển khai thực tế (rollout) nào lên hạ tầng Staging/Production.**
   - Do đó, khối mã DDL fallback trong `app/main.py` (hàm `init_db()`) **vẫn được giữ nguyên** nhằm đảm bảo an toàn tuyệt đối cho đến khi quy trình runner mới được kiểm chứng trên mọi môi trường chạy thực.
3. **Rà soát các thành phần Legacy**:
   - `processing_jobs`: Truy vấn chứng minh có 0 bản ghi trên live DB và 0 endpoint/API sử dụng trong toàn bộ hệ thống. Đã bổ sung ghi chú deprecation vào docstring model `backend/app/models/processing_job.py`.
   - `categories`: Truy vấn chứng minh bảng có 6 bản ghi đang sử dụng và có router `/categories` phục vụ tài liệu công khai trong `backend/app/routers/category.py`. Do đó, giữ nguyên trạng, không can thiệp.

---

## 4. CHI TIẾT THỰC THI MỤC 4 VÀ CÁC HẠNG MỤC TẠM HOÃN (PHASE 4 EXECUTION & DEFERRED WORK)

### 4.1. Thực thi hoàn tất Migration DROP thực thể thừa (APPLIED TO LIVE DB)
- **Tập tin Migration**: [alembic/versions/a2b3c4d5e6f7_drop_obsolete_processing_jobs_and_trash_batches.py](file:///Users/caotiendattx/Developer/Foundation-Project/alembic/versions/a2b3c4d5e6f7_drop_obsolete_processing_jobs_and_trash_batches.py)
- **Trạng thái theo nhật ký đợt 4.1**: đã áp dụng lên Live DB; thời điểm đó Live được ghi nhận ở `a2b3c4d5e6f7`. Đây **không phải** HEAD repository hiện tại: HEAD là `b3c4d5e6f7a8` và chưa deploy Live.
- **Lệnh thực thi**: `backend/.venv/bin/alembic upgrade head`
- **Kết quả thực thi**:
  ```text
  INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
  INFO  [alembic.runtime.migration] Will assume transactional DDL.
  INFO  [alembic.runtime.migration] Running upgrade f1a2b3c4d5e6 -> a2b3c4d5e6f7, drop obsolete processing_jobs and trash_batches artifacts
  ```

#### 4.1.1. Kết quả kiểm tra tiền khả thi (Preflight Verification)
Trước khi thực thi, toàn bộ các đối tượng dự kiến can thiệp đã được kiểm chứng trực tiếp trên Neon Live DB qua truy vấn SQL read-only:
1. **Bảng `processing_jobs`**:
   - Tồn tại trong CSDL: `True`.
   - Số lượng bản ghi: **0 bản ghi** (hoàn toàn rỗng).
   - Khóa ngoại tham chiếu tới (Incoming FKs): **0**.
   - Triggers / Views: **0**.
2. **Cột `documents.trash_batch_id` & Khóa ngoại `documents_trash_batch_id_fkey`**:
   - Cột tồn tại: `True`.
   - Tổng số tài liệu: **1,076 tài liệu**.
   - Số lượng tài liệu có `trash_batch_id IS NOT NULL`: **0 bản ghi** (1,076 / 1,076 mang giá trị `NULL`).
   - Khóa ngoại: Đúng 1 FK `documents_trash_batch_id_fkey` tham chiếu `trash_batches(id)`.
   - Triggers / Views / Indexes: Không có index riêng hay view/trigger nào phụ thuộc.
3. **Bảng `trash_batches`**:
   - Tồn tại trong CSDL: `True`.
   - Số lượng bản ghi: **đúng 2 bản ghi seed lịch sử** đã nêu trong tài liệu:
     - Row 1: `id=1, workspace_id=3, name='Nhóm BTL cũ (đã giải tán)', deleted_by=6`
     - Row 2: `id=2, workspace_id=5, name='Tài liệu ôn thi cũ', deleted_by=7`
   - Số tài liệu thực tế tham chiếu: **0 tài liệu**.
   - Triggers / Views: **0**.
4. **Bảo tồn thực thể ngoài phạm vi (Baseline Scope Check)**:
   - Bảng `categories`: **6 bản ghi** (hoàn toàn không đụng tới).
   - Cột `documents.category_id`: Bảo tồn nguyên vẹn 100%.
   - Hạng mục vector / pgvector: Tạm hoãn 100%, không sinh thêm bất kỳ bảng/extension nào.

#### 4.1.2. Kết quả hậu kiểm tra sau Migration (Post-Migration Audit)
Sau khi áp dụng migration, kịch bản kiểm tra độc lập đã xác thực trạng thái mới:
1. `processing_jobs` tồn tại trong DB: `False` (Đã DROP CASCADE thành công).
2. `trash_batches` tồn tại trong DB: `False` (Đã DROP CASCADE thành công).
3. `documents.trash_batch_id` tồn tại trong DB: `False` (Đã DROP COLUMN thành công).
4. Khóa ngoại `documents_trash_batch_id_fkey` tồn tại trong DB: `False` (Đã DROP CONSTRAINT thành công).
5. Tổng số tài liệu `documents`: **1,076 / 1,076 tài liệu** (Bảo toàn 100%, không thất thoát dữ liệu).
6. Tổng số danh mục `categories`: **6 / 6 bản ghi** (Bảo toàn 100%).
7. Phiên bản Alembic trên DB (`alembic_version`) theo nhật ký đợt 4.1: **`a2b3c4d5e6f7`**. HEAD repository hiện tại là `b3c4d5e6f7a8` (chưa deploy), nên không còn khớp HEAD.
8. Truy vấn ORM SQLAlchemy (`Document`, `Category`, `User`, `Workspace`): Hoạt động trơn tru, không phát sinh lỗi `UndefinedColumn`.
9. Kiểm thử tự động & Endpoint verification:
   - **Pytest Suite**: **17/17 test cases passed** trên các module cốt lõi (`test_batch3_deployment_and_legacy_tracing`, `test_batch2_integrity_constraints`, `test_library_download_action_filter`, `test_storage_dedup`, `test_shares`).
   - **Live DB Query Service (`verify_phase2_endpoints.py`)**: Toàn bộ 7 kịch bản (phân trang, lọc category, tìm kiếm q, bundle, tags, workspace query, explain analyze) chạy thành công 100% trên Neon DB.
   - **Direct Trash Router Test (`list_trash`)**: Hàm router thùng rác phản hồi tức thì với 0 trashed documents của user thử nghiệm, hoàn toàn không gặp lỗi cột `trash_batch_id`.
   - **Frontend Build & TypeScript Typecheck**: Chạy `npm run build` (`tsc -b && vite build`) trong `frontend/digital-library/` thành công rực rỡ với **0 lỗi kiểu dữ liệu**.

#### 4.1.3. Điều chỉnh mã nguồn tối thiểu theo nguyên lý Ponytail
- Để bảo tồn phản hồi API (`DocumentOut`) trả về trường `trash_batch_id: null` mà không gây lỗi SQL SELECT cột không tồn tại, mô hình [backend/app/models/document.py](file:///Users/caotiendattx/Developer/Foundation-Project/backend/app/models/document.py) được điều chỉnh tối thiểu:
  - `trash_batch_id: ClassVar[Optional[int]] = None`
  - `trash_batch: ClassVar[Optional[object]] = None`
- Mô hình [backend/app/models/trash_batch.py](file:///Users/caotiendattx/Developer/Foundation-Project/backend/app/models/trash_batch.py) được bổ sung docstring deprecation và đặt `documents: ClassVar[Optional[object]] = None`.
- Không can thiệp sửa đổi các router hay schema khác, bảo toàn 100% API contract hiện hành.

#### 4.1.4. Khả năng hoàn nguyên (Reversibility)
- Migration `a2b3c4d5e6f7` hỗ trợ đầy đủ hàm `downgrade()`:
  - Tái tạo bảng `trash_batches` và `processing_jobs` bằng cú pháp `CREATE TABLE IF NOT EXISTS` (lưu ý: mệnh đề này không tự sửa chữa bảng dở dang nếu bảng đã tồn tại nhưng thiếu FK hoặc cột).
  - Kiểm tra tính hợp lệ của dữ liệu cha (`users` id 6, 7 và `workspaces` id 3, 5) trước khi khôi phục seed rows; nếu thiếu cha sẽ hủy giao dịch bằng `RAISE EXCEPTION`. CSDL không thể rollback được nếu thiếu các parent seed rows này.
  - Nạp lại 2 bản ghi lịch sử `(id=1, name='Nhóm BTL cũ (đã giải tán)')` và `(id=2, name='Tài liệu ôn thi cũ')`.
  - Tự động đồng bộ SERIAL sequence (`setval`) để giá trị tự tăng kế tiếp `> max(id)`.
  - Tái tạo cột `documents.trash_batch_id` và FK `documents_trash_batch_id_fkey`.
  - Hạ phiên bản `alembic_version` về `f1a2b3c4d5e6`.

### 4.2. Gỡ bỏ Startup DDL Fallback (Giới hạn còn lại)
- Khối DDL tự động trong `backend/app/main.py` (`startup()`) **tiếp tục được giữ nguyên trạng**.
- **Lý do & Giới hạn**: Tài liệu yêu cầu chỉ gỡ bỏ khối DDL fallback khi có bằng chứng xác minh runner migration hoạt động độc lập và ổn định trên 100% các node triển khai Staging/Production thực tế. Do phiên làm việc này chưa có bằng chứng xác minh trên các hạ tầng đó, việc duy trì fallback DDL là biện pháp phòng vệ chiều sâu bắt buộc.

### 4.3. Nghiên cứu & Thiết kế Vector Storage (pgvector) (Tiếp tục tạm hoãn)
- Hạng mục pgvector tiếp tục **tạm hoãn hoàn toàn** theo đúng chỉ đạo của người dùng.
- Không tạo extension `vector`, không tạo cột embedding, không tạo index HNSW/IVFFlat trong bất kỳ migration hay mã nguồn nào.

### 4.4. Khắc phục các phát hiện OpenCode (Hoàn thiện mã nguồn & quy trình offline)
Sau quá trình rà soát độc lập của OpenCode, các vấn đề kỹ thuật liên quan đến khả năng phục hồi và các luồng runtime/seed/sync trong repository đã được xử lý triệt để:
1. **Sửa downgrade() trong revision `a2b3c4d5e6f7`**:
   - Thêm câu lệnh `setval(pg_get_serial_sequence('trash_batches', 'id'), ...)` và `setval(pg_get_serial_sequence('processing_jobs', 'id'), ...)` đồng bộ sequence tự tăng, loại bỏ nguy cơ trùng khóa chính khi insert mới.
   - Bổ sung khối PL/pgSQL `DO $$ BEGIN ... END $$;` xác thực sự tồn tại của `users` (id=6, 7) và `workspaces` (id=3, 5). Nếu thiếu parent, transaction rollback ngay lập tức. Xác nhận rõ: downgrade vẫn phụ thuộc cứng vào các parent IDs này và không thể rollback nếu thiếu cha.
   - Bổ sung DDL idempotent và lưu ý rõ `CREATE TABLE IF NOT EXISTS` không tự sửa bảng dở dang (partial table) nếu thiếu cột hay FK. Phần `upgrade()` giữ nguyên không đổi.
2. **Tách hoàn toàn model legacy khỏi SQLAlchemy metadata**:
   - Chuyển `TrashBatch` và `ProcessingJob` thành các class độc lập không kế thừa `Base`.
   - Gỡ bỏ import khỏi `backend/app/models/__init__.py` và `alembic/env.py`.
   - Xác nhận `Base.metadata.tables` chỉ có 24 bảng thực thể hợp lệ, không chứa `trash_batches` hay `processing_jobs`, ngăn ngừa `create_all` và `autogenerate` tạo lại bảng.
   - Gỡ bỏ các quan hệ ORM legacy `User.deleted_trash_batches` và `Workspace.trash_batches`.
   - Giữ `Document.trash_batch_id: ClassVar[Optional[int]] = None` và `DocumentOut.trash_batch_id: Optional[int] = None` bảo toàn hình dạng API (giá trị `null`).
3. **Làm sạch triệt để các script seed & sync**:
   - `backend/db/seed.py`: Gỡ bỏ imports legacy, hàm `seed_trash_batches`, tham chiếu `trash_batch_id` khi tạo document mẫu, khối tạo `ProcessingJob` virus scan, và import `timedelta` không còn sử dụng.
   - `backend/db/seed_incremental.py`: Xóa bỏ hoàn toàn hàm `seed_trash_batches` (qua Graphify xác nhận không còn caller); xóa bỏ các tham số `trash_batches` không dùng ở `seed_documents` và `seed_additional_data`; loại bỏ import `timedelta` không dùng; giữ các hàm seed khác hoạt động bình thường và idempotent.
   - `backend/db/sync_group_schema.py`: Gỡ bỏ import `processing_job` và `trash_batch`.
4. **Cập nhật tài liệu kỹ thuật**:
   - `docs/04-co-so-du-lieu/db-schema-map.md`: Cập nhật sơ đồ Mermaid, từ điển bảng, quan hệ ORM, ma trận FK, và checklist.
   - `docs/04-co-so-du-lieu/BAO_CAO_KET_QUA_THUC_THI_MUC_4.md`: Cập nhật chi tiết kết quả khắc phục các phát hiện OpenCode.
5. **Kiểm thử tự động & Giới hạn tuân thủ**:
   - Tại thời điểm đợt 4.1, Alembic có đúng 1 head `a2b3c4d5e6f7`. HEAD repository hiện tại là `b3c4d5e6f7a8` (chưa deploy Live).
   - 5/5 unit test trong `test_batch3_deployment_and_legacy_tracing.py` PASSED.
   - Tạo và kiểm tra offline downgrade SQL thành công bằng `alembic downgrade --sql`.
   - **Ghi nhận thay đổi DocumentStats ngoài phạm vi**: Các thay đổi liên quan đến `DocumentStats` (`__init__` tự tạo stats mặc định trên `Document` và cascade trên quan hệ `Document.stats`) đã hiện diện trong working tree khi bắt đầu xử lý phát hiện OpenCode, không được chỉnh trong phạm vi này; nguồn gốc commit/thời điểm không xác định do workspace có nhiều thay đổi chưa commit và không có baseline sạch.
   - Tuân thủ nghiêm ngặt: **Không kết nối Live DB**, **không chạy downgrade/upgrade trên DB Neon live**, **không tạo migration mới**, và **không đưa ra tuyên bố benchmark mới**.

### 4.5. Trạng thái thực tế của Revision `b3c4d5e6f7a8`
Revision **đã deploy Live** bằng đúng lệnh `backend/.venv/bin/alembic upgrade head` (`a2b3c4d5e6f7 → b3c4d5e6f7a8`, exit 0), sau khi backup logic và preflight read-only PASS. Các mục dưới đây ghi thiết kế kèm kết quả hậu kiểm:

1. **Chuẩn hóa CHECK constraint `chk_document_shares_status`**:
   - Mở rộng từ 3 lên 6 giá trị: `pending`, `accepted`, `rejected`, `auto_accepted`, `expired`, `withdrawn`.
   - Preflight PL/pgSQL `RAISE EXCEPTION` nếu có status ngoài danh sách; dùng `NOT VALID` → `VALIDATE CONSTRAINT`.

2. **Bổ sung Index `ix_documents_bundle_parent_id`**:
   - `CREATE INDEX IF NOT EXISTS ix_documents_bundle_parent_id ON documents (bundle_parent_id);` khớp ORM.

3. **Materialized View `community_subject_stats`**:
   - Giữ đúng 5 cột và type Live: `document_count` bigint (`count(DISTINCT d.id)`), `total_downloads` numeric (`COALESCE(sum(dl.download_count), 0::numeric)`), `avg_rating` numeric (`COALESCE(avg(dr.avg_stars), 0::numeric)`).
   - Chỉ thêm filter `download_logs.action = 'DOCUMENT_DOWNLOADED'` trong subquery download. Không dùng `ROUND`, không đổi `avg_rating` sang `::float`, không thay bằng average toàn bộ ratings.
   - Unique index `uq_community_subject_stats_subject_id(subject_id)` được giữ ở cả upgrade và downgrade.
   - Drop view không dùng `CASCADE`; dependency làm migration fail và rollback.

4. **Scheduler**:
   - `refresh_community_subject_stats()` dùng `pg_try_advisory_xact_lock` trong cùng transaction với `REFRESH MATERIALIZED VIEW CONCURRENTLY` (lock ID `748291038592`).
   - Không còn session-level lock + `AUTOCOMMIT` + unlock thủ công; transaction pooler của Neon/PgBouncer vẫn giữ đúng lock trong suốt refresh, rollback tự nhả lock.

5. **Trigram Index `documents.title`**:
   - Dump Live mới và truy vấn catalog read-only xác nhận **có cả** `idx_document_title_trgm` và `idx_documents_title_trgm`, đều GIN `title gin_trgm_ops` (scans 0 và 5).
   - `graphify-out/catalog_inventory.json` là log SQL cũ, không phải catalog đầy đủ; kết luận trước đây rằng Live không có `idx_documents_title_trgm` là sai và đã được sửa.
   - Migration chỉ drop `idx_document_title_trgm` sau preflight catalog đầy đủ; nếu không chứng minh đủ thì giữ cả hai và `RAISE NOTICE`. DB sạch thiếu retained index được tạo `idx_documents_title_trgm` chuẩn. Downgrade không xóa retained index.

6. **Kiểm thử & giới hạn**:
   - Cây migration có 1 head: `b3c4d5e6f7a8`; bridge `c9d0e1f2a3b4` nằm sau `dae4972dff87`, chỉ repoint `f844331e6c1e`, không nằm trên đường Live `a2 → b3`.
   - Phase 1–3 đã chứng minh full chain từ PostgreSQL trống tới `b3c4d5e6f7a8`, chu trình `downgrade base → upgrade head`, bridge cycle và `a2 ↔ b3` đều PASS; clean-chain test 2/2 passed.
   - PostgreSQL staging/Live-like: upgrade `a2 → b3` và downgrade `b3 → a2` chạy được; 6 statuses hợp lệ, invalid status bị từ chối; downloads chỉ đếm `DOCUMENT_DOWNLOADED`; avg per-document khác avg all-ratings; type numeric/bigint đúng; unique index tồn tại; trigram guard và lock contention/rollback đã kiểm tra.
   - Hậu kiểm Live read-only sau upgrade: revision `b3c4d5e6f7a8`; CHECK 6 status `convalidated=true`; counts giữ nguyên (documents 1.076, shares 7, subjects 54, logs 223, categories 6); MV 54 rows, `total_downloads=0`, `document_count_sum=34`.
   - Đã kết nối Live ở chế độ read-only cho preflight/hậu kiểm; **chỉ** lệnh Alembic được phép ghi schema. Không chạy downgrade trên Live.

---

## 5. XÁC MINH MÔI TRƯỜNG, TRẠNG THÁI REPOSITORY & AN TOÀN DỮ LIỆU

### 5.1. Xác minh đường dẫn làm việc (Workspace Path Alias Verification)
- Đường dẫn kiểm tra: `/Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project`
- Đường dẫn vật lý: `/Users/caotiendattx/Developer/Foundation-Project`
- **Kết quả xác minh qua hệ điều hành**: Hai đường dẫn này trỏ về cùng một thư mục vật lý duy nhất thông qua cơ chế Symlink của macOS, chia sẻ chung Device ID `16777234` và Inode `8138355`. Mọi thao tác trên một đường dẫn đều phản ánh tức thì trên đường dẫn còn lại.

### 5.2. Trạng thái Repository & Bảo tồn Dirty Files
- **Quy tắc an toàn**: Toàn bộ các tệp đang chỉnh sửa (dirty files) và tệp mới tạo (untracked) được bảo tồn nguyên vẹn. Tuyệt đối **không thực hiện `git commit` hay `git push`** trong phiên làm việc này.
- **Danh sách tệp chỉnh sửa (Modified files)**:
  - `backend/app/main.py` (Lưu vết cấu hình)
  - `backend/app/models/document.py` (Chuẩn hóa schema boolean, timezone & bảo tồn classvar trash_batch_id)
  - `backend/app/models/notification.py` (Chuẩn hóa boolean)
  - `backend/app/models/processing_job.py` (Đánh dấu deprecation)
  - `backend/app/models/trash_batch.py` (Đánh dấu deprecation & ngắt relation Document)
  - `backend/app/routers/library.py` (Sửa logic đếm lượt tải)
  - `backend/app/routers/workspaces.py` (Chuẩn hóa quyền owner thành full)
  - `backend/app/schemas/group.py` (Chính quy hóa Literal["view", "full"])
  - `backend/app/services/group_service.py` (Cập nhật logic require_write_permission)
  - `backend/app/services/search_service.py` (Tối ưu truy vấn tìm kiếm)
  - `backend/db/seed_incremental.py` (Cập nhật dữ liệu seed chuẩn hóa)
  - `docs/04-co-so-du-lieu/alembic-va-tien-hoa-schema.md`
  - `docs/04-co-so-du-lieu/db-schema-map.md`
  - `docs/99-luu-tru/deployment-cu/DEPLOYMENT_GUIDE.md`
  - `docs/99-luu-tru/ke-hoach/CSDL/DB_AUDIT_REMEDIATION.md`
  - `docs/04-co-so-du-lieu/BAO_CAO_RA_SOAT_VA_TOI_UU_CSDL.md` *(Tài liệu hiện tại)*
- **Danh sách tệp thêm mới (Untracked files)**:
  - `alembic/versions/a2b3c4d5e6f7_drop_obsolete_processing_jobs_and_trash_batches.py` *(Bản migration DROP Phase 4 - ĐÃ ÁP DỤNG LIVE)*
  - `alembic/versions/b7c8d9e0f1a2_fix_fts_unaccent_trigger_and_backfill.py`
  - `alembic/versions/c8d9e0f1a2b3_backfill_missing_document_stats.py`
  - `alembic/versions/d9e0f1a2b3c4_map_legacy_tag_and_clear_workspace.py`
  - `alembic/versions/e0f1a2b3c4d5_batch2_integrity_normalization.py`
  - `alembic/versions/e4f5a6b7c8d9_add_workspace_members_primary_key.py`
  - `alembic/versions/f1a2b3c4d5e6_normalize_workspace_member_permission_levels.py`
  - `alembic/versions/f5a6b7c8d9e0_drop_duplicate_fts_gin_index.py`
  - `backend/entrypoint.sh`
  - `backend/tests/test_batch2_integrity_constraints.py`
  - `backend/tests/test_batch3_deployment_and_legacy_tracing.py`
  - `backend/tests/test_library_download_action_filter.py`
  - `backend/tests/test_permission_normalization.py`
- Cập nhật sau Phase 5: bổ sung `backend/app/routers/auth.py`, `backend/app/schemas/auth.py`, `backend/app/schemas/user.py`, `backend/tests/test_auth.py` (modified) và `backend/tests/test_search_unaccent_integration.py` (untracked). Các dirty/untracked từ Phase 1–4 vẫn được giữ nguyên; không `commit`, `push` hay `reset`.

### 5.3. Tuân thủ an toàn bảo mật kết nối
- Trong phiên làm việc này, mọi kết nối Live đều lấy cấu hình từ môi trường/`.env`; không in credential hay `DATABASE_URL` ra kết quả.
- Tuy nhiên, kiểm tra docs ở Phase 5 phát hiện tài liệu archived `docs/99-luu-tru/deployment-cu/ENV_VARIABLES.md:70` chứa chuỗi kết nối thật (kèm mật khẩu) của role runtime, và `:77/:89` chứa khóa R2 thật. Vì vậy nhận định cũ “không xuất hiện trong tài liệu nào” là **không còn đúng**; xem §6.3 để xử lý. Không đọc giá trị bí mật hay tự rotate trong phạm vi này.

---

## 6. PHASE 5 — DRIFT `/search/`, ROLE ESCALATION VÀ CREDENTIAL (BẰNG CHỨNG & VIỆC CÒN LẠI)

### 6.1. Drift `documents.updated_at` trong `GET /search/`
- **Graphify trace**: truy vết `search()`, `search_documents()`, `TimestampMixin`, `b3c4d5e6f7a8`, `documents` cho thấy lỗi không nằm ở ORM mapped column hay migration `b3`.
- **Nguyên nhân**: `backend/app/services/search_service.py` dùng SQL thô `ORDER BY updated_at DESC` trong `search_documents()`, trong khi `TimestampMixin` chỉ định nghĩa `created_at` và schema Live/clean-chain đều **không có** `documents.updated_at`. Đây là drift cũ của query, không phải lỗi chuỗi Alembic.
- **Rà drift tương tự**: so sánh `Base.metadata` với `information_schema.columns` trên Live (`b3`), staging (`b3`) và clean-chain (`b3`) đều cho **0 bảng/cột ORM bị thiếu**. Các lần dùng `updated_at` khác đều là cột có thật trên `workspaces`, `document_ratings`, `document_stats`, `user_todos` (startup DDL); riêng `search_documents()` là raw SQL trỏ tới cột không tồn tại.
- **Đường sửa theo Ponytail**: đổi đúng 1 dòng `ORDER BY updated_at DESC` → `ORDER BY created_at DESC`. Không thêm cột, không migration mới, không SQL thủ công trên Live. Frontend vốn đã có fallback `updated_at || created_at`, nên không đổi API shape.
- **Bằng chứng**:
  - `backend/tests/test_search_unaccent_integration.py`: seed tài liệu `Kiến trúc máy tính` trên staging, gọi `GET /search/?q=kien truc` qua `TestClient`, kiểm tra `search_vector @@ websearch_to_tsquery('simple', unaccent('kien truc'))`, rồi dọn dẹp bản ghi thử — PASS.
  - Gọi trực tiếp router trên Live ở transaction read-only: `unaccent_fts_rows_live = 52`, `search_api_live = ok, items = 3` (không còn `UndefinedColumnError`).
  - Full suite: **63 passed, 1 skipped**; clean-chain integration vẫn được giữ ở phiên trước (2/2 passed).

### 6.2. Role escalation khi đăng ký
- **Trước fix**: `UserRegister.role` cho client gửi `role`, và `register()` ghi đúng giá trị đó vào `users.role`; `UserUpdate.role` cũng cho `PATCH /users/me` tự nâng quyền. `users.role` không có DB CHECK constraint.
- **Fix nhỏ nhất**: bỏ `role` khỏi `UserRegister` và `UserUpdate`, hard-code `role="student"` trong `register()`. `UserCreate`/`UserOut` vẫn giữ `role` cho seed/admin và response.
- **Test quyền**: gửi `role: "sysadmin"` khi đăng ký thì bản ghi tạo ra vẫn `role="student"`; `PATCH /users/me` với `role: "sysadmin"` bị bỏ qua (`role` không có trong `UserUpdate.model_fields`). Cả 2 test PASS.
- **Dữ liệu Live**: phân bố `users.role` = `student 53`, `teacher 7`, `faculty_admin 4`, `school_admin 1`, `system_admin 1`. Không tự đổi các tài khoản admin này; cần xác minh nguồn gốc (seed vs đăng ký) và quyết định product trước khi downgrade/rotate.

### 6.3. Runtime role & credential từng xuất hiện trong docs
- Truy vấn read-only Live: role runtime là `neondb_owner`; `rolsuper=false` nhưng `rolcreatedb=true`, `rolcreaterole=true`, `rolreplication=true`, `rolbypassrls=true`. Không in mật khẩu hay connection string.
- **Đã redact working tree**: `docs/99-luu-tru/deployment-cu/ENV_VARIABLES.md` — DB URL, R2 endpoint, access key, secret key, public URL và VITE API URL đều thành placeholder; `docs/99-luu-tru/deployment-cu/STORAGE_R2.md` — ví dụ access/secret key thành placeholder. Không giá trị bí mật nào được ghi vào diff/báo cáo này. Một bước inspect đầu tiên chưa mask đúng đã làm lộ 1 giá trị R2 trong output tạm; giá trị đó đã bị xóa khỏi working tree và vẫn phải rotate.
- **Quét tracked files sau redact**: `exact_credential_hits = 0`, `non_placeholder_db_url_hits = 0`; chỉ còn URL example/local (`localhost`, `user:pass@host/db`, `<USER>`, v.v.). Không print giá trị nào.
- **Chưa đủ**: redact working tree không làm credential đang dùng hết hạn; lịch sử git vẫn giữ giá trị cũ. Phải rotate trước, dọn lịch sử sau.
- Seed scripts (`backend/db/seed.py`, `seed_inc_user.py`, `fix_passwords.py`) có mật khẩu demo dùng chung cho admin seed; cần xác nhận không tái sử dụng trên Live.

### 6.4. Nơi đọc `DATABASE_URL` & đề xuất tách role
- Graphify + grep xác nhận **cùng một** `DATABASE_URL` cho cả app và migration:
  - `backend/app/core/config.py:13` — `Settings.DATABASE_URL` đọc từ `.env`.
  - `backend/app/core/database.py:7` — engine async của app dùng `settings.DATABASE_URL`.
  - `alembic/env.py:43` — `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`.
  - `backend/entrypoint.sh:6` — `alembic upgrade head` chạy trước uvicorn với env đó.
  - Không có biến `MIGRATION_DATABASE_URL` hay cơ chế tách role trong repo.
- **Đề xuất** (không triển khai vì cần credential/console):
  - `elibrary_app`: `CONNECT` DB, `USAGE` schema public, `SELECT/INSERT/UPDATE/DELETE` trên bảng ứng dụng, `USAGE/SELECT` sequence, `EXECUTE` function cần thiết; **không** `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`, `SUPERUSER`, không DDL.
  - `elibrary_migrator`: Quyền DDL (`CREATE/ALTER/DROP` table/index/constraint/view/materialized view/function/trigger) + DML để backfill trong migration; chỉ dùng cho `alembic upgrade head`, không dùng cho app runtime.
  - Nếu tách: thêm `MIGRATION_DATABASE_URL` chỉ cho entrypoint/Alembic, giữ `DATABASE_URL` cho app; deploy cả hai secret rồi khử credential owner cũ.
- **Blocker**: tạo role, cấp grant và đổi mật khẩu bắt buộc qua Neon console/SQL có quyền admin + credential mới. Đây không phải thay đổi thuần repo nên theo Ponytail không thêm biến/code half-done; không tự tạo/đổi/thử credential.

### 6.5. Thứ tự rotate & việc còn lại
1. **Neon DB**: tạo 2 role ít quyền ở trên trong Neon console → đặt mật khẩu mới → cập nhật secret store (`DATABASE_URL` app, `MIGRATION_DATABASE_URL` nếu tách) → deploy/restart → kiểm tra app query và `alembic current = b3c4d5e6f7a8` → chỉ sau đó reset/revoke mật khẩu `neondb_owner` cũ.
2. **R2**: tạo API token mới với quyền Object Read & Write đúng bucket → cập nhật `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` trong secret store → deploy/restart → kiểm tra upload/download → revoke token cũ.
3. **Secret store/frontend**: cập nhật mọi env liên quan (backend, worker, `VITE_API_URL` nếu đổi domain) rồi restart; không ghi giá trị mới vào file track.
4. **Kiểm tra**: quét lại tracked files (0 credential hit), `alembic current`, smoke API/search, R2 round-trip; không đụng schema/data Live ngoài Alembic đã duyệt.
5. **Lịch sử git**: chỉ sau khi rotate xong mới rewrite/purge (git-filter-repo/BFG) với phê duyệt maintainer, force-push có kiểm soát và báo collaborator re-clone. Không dọn lịch sử trước khi credential cũ bị vô hiệu.
- Audit 6 tài khoản `faculty_admin` + 2 tài khoản admin toàn cục; xác minh/đổi mật khẩu seed yếu nếu còn dùng.
- Sau khi có danh sách role chuẩn từ product, mới cân nhắc migration ADD CHECK trên `users.role`; không thêm trong đợt này.
- Startup DDL fallback trong `backend/app/main.py` vẫn giữ vì chỉ `backend/entrypoint.sh` được chứng minh là runner migration; vector/pgvector tiếp tục tạm hoãn.
- Đợt này **không** đổi schema/data Live, không migration mới, không vector, không `commit`/`push`/`reset`; dirty/untracked được bảo tồn.
