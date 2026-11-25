---
title: Lịch Sử Di Chuyển Lược Đồ (Alembic Migrations)
sidebar_label: 🔄 Lịch sử Migrations
sidebar_position: 5
---

# 🔄 LỊCH SỬ DI CHUYỂN LƯỢC ĐỒ (ALEMBIC MIGRATIONS)

Hệ thống cơ sở dữ liệu của **Foundation Project** được quản lý tiến hóa thông qua công cụ di chuyển lược đồ **Alembic**. Toàn bộ lịch sử DDL/DML migrations được lưu vết qua **17 bản migration**, đã được hợp nhất thành một nhánh duy nhất với HEAD hiện tại là `b3c4d5e6f7a8`.

> **Trạng thái triển khai:** `b3c4d5e6f7a8` mới tồn tại trong repository và đã được kiểm thử trên PostgreSQL disposable. Chưa chạy migration này lên Live DB. Chuỗi `alembic upgrade head` từ database trống hiện vẫn bị chặn bởi các migration cũ thiếu bảng (xem mục 4).

---

## 1. Chuỗi Tiến Hóa Lược Đồ

```
[ dae4972dff87 ] (Khởi tạo toàn bộ CSDL ban đầu)
       │
       ▼
[ f844331e6c1e ] (Thêm is_dissolving và dissolve_at vào workspaces)
       │
       ▼
[ 93f46eb359df ] (Thêm bảng workspace_tags quản lý thẻ nhóm)
       │
       ▼
[ 45ab664fbe54 ] (Khôi phục trigger PL/pgSQL update_document_search_vector)
       │
       ▼
[ d76927b437fe ] (Thêm activity tracking: download_logs, document_stats)
       │
       ▼
[ a1b2c3d4e5f6 ] (Thêm link vào notifications và tạo bảng user_todos)
       │
       ▼
[ c3d4e5f6a7b8 ] (Thêm Partial Unique Index uq_document_share_pending)
       │
       ├────────────────────────────────────────┐
       ▼                                        ▼
[ e4f5a6b7c8d9 ]                         [ 6a8f0b1c2d3e ]
(Thêm composite PK workspace_members)    (Index composite download_logs)
       │                                        │
       ▼                                        │
[ f5a6b7c8d9e0 ]                                │
(Drop duplicate GIN index documents)            │
       │                                        │
       └───────────────────┬────────────────────┘
                           ▼
                    [ b7c8d9e0f1a2 ] (Mergepoint: Fix FTS unaccent trigger & backfill)
                           │
                           ▼
                    [ c8d9e0f1a2b3 ] (Backfill 27 missing document_stats)
                           │
                           ▼
                    [ d9e0f1a2b3c4 ] (Map legacy tag, clear tags.workspace_id)
                           │
                           ▼
                    [ e0f1a2b3c4d5 ] (Batch 2: integrity normalization)
                           │
                           ▼
                    [ f1a2b3c4d5e6 ] (Normalize workspace_members permission)
                           │
                           ▼
                    [ a2b3c4d5e6f7 ] (Drop processing_jobs, trash_batches, trash_batch_id)
                           │
                           ▼
                    [ b3c4d5e6f7a8 ] (HEAD: shares status, bundle index, community stats, trigram guard)
```

---

## 2. Chi Tiết Từng Bản Migration

### 2.1. Bản migration 1: `dae4972dff87_init_full_db_elibrary.py`
- **Mã Revision**: `dae4972dff87` (Gốc, `down_revision = None`)
- **Nội dung DDL**: Khởi tạo cấu trúc các bảng cốt lõi: `users`, `faculties`, `classes`, `subjects`, `documents`, `document_versions`, `folders`, `tags`, `document_tags`, `folder_tags`, `workspaces`, `workspace_members`, `workspace_invitations`, `community_submissions`, `document_ratings`, `trash_batches`, `notes`, `favorites`, `processing_jobs`.
- **Chỉ mục ban đầu**: Thiết lập các chỉ mục B-Tree trên các trường khóa ngoại và cờ xóa mềm `is_deleted`.

### 2.2. Bản migration 2: `f844331e6c1e_add_is_dissolving_and_dissolve_at_to_.py`
- **Mã Revision**: `f844331e6c1e` (`down_revision = dae4972dff87`)
- **Mục đích**: Bổ sung cơ chế giải thể an toàn cho không gian làm việc nhóm.
- **Thay đổi DDL**: Thêm hai cột vào bảng `workspaces`:
  - `is_dissolving BOOLEAN NOT NULL DEFAULT false`
  - `dissolve_at TIMESTAMPTZ NULL`

### 2.3. Bản migration 3: `93f46eb359df_add_workspace_tags_table.py`
- **Mã Revision**: `93f46eb359df` (`down_revision = f844331e6c1e`)
- **Mục đích**: Phân tách không gian thẻ nhãn của nhóm khỏi thẻ cá nhân.
- **Thay đổi DDL**: Tạo mới bảng `workspace_tags` với khóa ngoại trỏ về `workspaces(id)` (`ON DELETE CASCADE`).

### 2.4. Bản migration 4: `45ab664fbe54_restore_fts_search_vector_trigger.py`
- **Mã Revision**: `45ab664fbe54` (`down_revision = 93f46eb359df`)
- **Mục đích**: Tự động hóa cập nhật chỉ mục tìm kiếm toàn văn Full-Text Search.
- **Thay đổi DDL**: Tạo hàm PL/pgSQL `update_document_search_vector()` và trigger `trg_documents_search_vector` tự động tính toán `search_vector` mỗi khi thêm mới hoặc sửa đổi `title`, `content` của tài liệu.

### 2.5. Bản migration 5: `d76927b437fe_add_activity_tracking.py`
- **Mã Revision**: `d76927b437fe` (`down_revision = 45ab664fbe54`)
- **Mục đích**: Theo dõi nhật ký tương tác và tính toán xu hướng học liệu.
- **Thay đổi DDL**: Tạo mới bảng `download_logs` và bảng tổng hợp `document_stats` (`views_count`, `downloads_count`, `trending_score`).

### 2.6. Bản migration 6: `a1b2c3d4e5f6_add_notifications_link_and_user_todos.py`
- **Mã Revision**: `a1b2c3d4e5f6` (`down_revision = d76927b437fe`)
- **Mục đích**: Hỗ trợ liên kết điều hướng thông báo và quản lý công việc cá nhân.
- **Thay đổi DDL**:
  - Thêm cột `link VARCHAR(255)` vào bảng `notifications`.
  - Tạo mới bảng `user_todos` phục vụ Personal Dashboard.

### 2.7. Bản migration 7: `c3d4e5f6a7b8_add_document_share_partial_unique_index.py`
- **Mã Revision**: `c3d4e5f6a7b8` (`down_revision = a1b2c3d4e5f6`)
- **Mục đích**: Ngăn chặn xung đột chia sẻ tài liệu trùng lặp.
- **Thay đổi DDL**:
  - Thêm các cột quản lý trạng thái chia sẻ vào `document_shares` (`status`, `expires_at`, `responded_at`).
  - Tạo chỉ mục duy nhất có điều kiện:
    ```sql
    CREATE UNIQUE INDEX uq_document_share_pending
    ON document_shares (from_user_id, to_user_id, source_document_id)
    WHERE status = 'pending' AND source_document_id IS NOT NULL;
    ```

### 2.8. Bản migration 8: `e4f5a6b7c8d9_add_workspace_members_primary_key.py`
- **Mã Revision**: `e4f5a6b7c8d9` (`down_revision = c3d4e5f6a7b8`)
- **Mục đích**: Khắc phục lỗi thiếu khóa chính trên bảng trung gian `workspace_members`.
- **Thay đổi DDL**:
  - Thêm ràng buộc khóa chính tổng hợp `PRIMARY KEY (workspace_id, user_id)`.

### 2.9. Bản migration 9: `f5a6b7c8d9e0_drop_duplicate_fts_gin_index.py`
- **Mã Revision**: `f5a6b7c8d9e0` (`down_revision = e4f5a6b7c8d9`)
- **Mục đích**: Loại bỏ chỉ mục GIN trùng lặp trên bảng `documents`.
- **Thay đổi DDL**:
  - Drop index `idx_document_search_vector`, giữ lại chỉ mục chính thức `ix_documents_search_vector` (giải phóng ~1.05 MB dung lượng index).

### 2.10. Bản migration 10 (Branch): `6a8f0b1c2d3e_add_download_logs_access_filter_index.py`
- **Mã Revision**: `6a8f0b1c2d3e` (`down_revision = c3d4e5f6a7b8`)
- **Mục đích**: Bổ sung chỉ mục hỗ trợ lọc log truy cập tài liệu người dùng.
- **Thay đổi DDL**:
  - Tạo composite index `ix_download_logs_user_action_created_document ON download_logs(user_id, action, created_at, document_id)`.

### 2.11. Bản migration 11 (Mergepoint): `b7c8d9e0f1a2_fix_fts_unaccent_trigger_and_backfill.py`
- **Mã Revision**: `b7c8d9e0f1a2` (`merges = 6a8f0b1c2d3e, f5a6b7c8d9e0`)
- **Mục đích**: Khắc phục xung đột trigger FTS và hỗ trợ tìm kiếm tiếng Việt không dấu (accent-insensitive).
- **Thay đổi DDL / DML**:
  - Bảo đảm extension `unaccent` tồn tại.
  - Drop trigger và function xung đột `tsvector_update`.
  - Cài đặt trigger duy nhất `trg_documents_search_vector` vector hóa đồng bộ `title (A), description (B), content (C)` sử dụng cấu hình `unaccent('simple')`.
  - Backfill lại toàn bộ search vector cho 1,076 documents trên live DB.

### 2.12. Bản migration 12: `c8d9e0f1a2b3_backfill_missing_document_stats.py`
- **Mã Revision**: `c8d9e0f1a2b3` (`down_revision = b7c8d9e0f1a2`)
- **Mục đích**: Khắc phục 27 bản ghi `document_stats` bị thiếu đối với tài liệu chưa từng phát sinh tương tác.
- **Thay đổi DML**:
  - Thực thi idempotent backfill `INSERT INTO document_stats ... SELECT ... ON CONFLICT (document_id) DO NOTHING` với các giá trị mặc định chuẩn xác (counts=0, score=0.0, last_activity=NULL, updated_at=created_at).
  - Đưa tỷ lệ bao phủ thống kê lên 100% (1,076 documents == 1,076 document_stats).

### 2.13. Bản migration 13: `d9e0f1a2b3c4_map_legacy_tag_and_clear_workspace.py`
- **Mã Revision**: `d9e0f1a2b3c4` (`down_revision = c8d9e0f1a2b3`)
- **Mục đích**: Chuẩn hoá quan hệ tag - workspace (Batch 1 DB Remediation: B1.1).
- **Thay đổi DML**:
  - Chuyển mapping tag legacy 39 (workspace 10, owner 6) sang bảng chuẩn `workspace_tags` với `ON CONFLICT (workspace_id, tag_id) DO NOTHING`.
  - Cập nhật `tags.workspace_id = NULL` đối với tag 39, đưa số lượng tag chứa legacy `workspace_id` về 0.

### 2.14. Bản migration 14: `e0f1a2b3c4d5_batch2_integrity_normalization.py`
- **Mã Revision**: `e0f1a2b3c4d5` (`down_revision = d9e0f1a2b3c4`)
- **Mục đích**: Chuẩn hoá toàn vẹn dữ liệu Đợt 2 (Batch 2: P2 Integrity Normalization).
- **Thay đổi DDL / DML**:
  - **Nullable booleans**: Chuẩn hoá `documents.is_deleted`, `documents.is_important` và `notifications.is_read` sang `NOT NULL DEFAULT false`.
  - **Timestamps**: Chuẩn hoá `documents.deleted_at` sang `TIMESTAMPTZ` đồng bộ toàn hệ thống.
  - **Khắc phục drift FK Delete Policies**:
    - `document_shares` (`source_document_id`, `document_id`) chuyển từ `NO ACTION` sang `ON DELETE SET NULL` (khớp ORM).
    - `community_submissions.subject_id` chuyển từ `RESTRICT` sang `ON DELETE CASCADE` (khớp ORM).
  - **Chuẩn hoá action download_logs**: Cập nhật 48 bản ghi legacy `action='view'` sang `DOCUMENT_VIEWED`.
  - **CHECK Constraints**:
    - `chk_documents_scope`: Cấm document vừa `is_public=true` vừa có `workspace_id IS NOT NULL`.
    - `chk_workspaces_type`: Ràng buộc `type IN ('group', 'faculty', 'class')`.
    - `chk_document_shares_status`: Ràng buộc `status IN ('pending', 'accepted', 'auto_accepted')`.
    - `chk_download_logs_action`: Ràng buộc 9 hành vi hợp lệ của `ActivityAction`.

### 2.15. Bản migration 15: `f1a2b3c4d5e6_normalize_workspace_member_permission_levels.py`
- **Mã Revision**: `f1a2b3c4d5e6` (`down_revision = e0f1a2b3c4d5`)
- **Mục đích**: Chuẩn hoá `workspace_members.permission_level` về `view` / `full`.
- **Thay đổi DDL / DML**:
  - Chuyển các dòng `permission_level = 'edit'` sang `'full'`.
  - Thêm CHECK `chk_workspace_members_permission` (`view`, `full`) theo chuỗi `NOT VALID` → `VALIDATE CONSTRAINT`.

### 2.16. Bản migration 16: `a2b3c4d5e6f7_drop_obsolete_processing_jobs_and_trash_batches.py`
- **Mã Revision**: `a2b3c4d5e6f7` (`down_revision = f1a2b3c4d5e6`)
- **Mục đích**: Dọn artifact legacy `processing_jobs`, `trash_batches`, `documents.trash_batch_id`.
- **Thay đổi DDL**: Drop FK/cột `documents.trash_batch_id`, drop hai bảng legacy.
- **Lưu ý**: Downgrade phụ thuộc cứng vào các parent seed `users.id` 6/7 và `workspaces.id` 3/5; nếu thiếu thì `RAISE EXCEPTION` và rollback.

### 2.17. Bản migration 17 (HEAD): `b3c4d5e6f7a8_sync_schema_shares_bundle_and_community_stats.py`
- **Mã Revision**: `b3c4d5e6f7a8` (`down_revision = a2b3c4d5e6f7`)
- **Mục đích**: Đồng bộ CHECK trạng thái chia sẻ, index bundle, materialized view thống kê cộng đồng và xử lý index trigram trùng.
- **Thay đổi DDL / DML**:
  - `chk_document_shares_status`: mở rộng đủ 6 trạng thái (`pending`, `accepted`, `rejected`, `auto_accepted`, `expired`, `withdrawn`) với preflight `RAISE EXCEPTION` nếu dữ liệu cũ không hợp lệ.
  - `ix_documents_bundle_parent_id`: tạo index cho `documents.bundle_parent_id`.
  - **Trigram preflight**: chỉ drop `idx_document_title_trgm` sau khi chứng minh bằng catalog rằng cả hai index hợp lệ, cùng bảng/cột/opclass/predicate/expression/access method/options và không gắn constraint. Retained index là `idx_documents_title_trgm` GIN `title gin_trgm_ops`. Nếu thiếu retained index trên DB sạch thì tạo chuẩn; nếu không chứng minh đủ thì giữ cả hai và `RAISE NOTICE`.
  - **`community_subject_stats`**: giữ đúng 5 cột và type Live (`document_count` bigint, `total_downloads` numeric, `avg_rating` numeric), giữ công thức `count(DISTINCT d.id)`, `COALESCE(sum(dl.download_count), 0::numeric)`, `COALESCE(avg(dr.avg_stars), 0::numeric)`; chỉ thêm filter `download_logs.action = 'DOCUMENT_DOWNLOADED'` trong subquery download. Không dùng `CASCADE` khi drop view.
  - **Unique index**: `uq_community_subject_stats_subject_id(subject_id)` được giữ ở cả upgrade và downgrade để phục vụ `REFRESH ... CONCURRENTLY`.
- **Downgrade**: khôi phục đúng definition Live (không filter action), giữ unique index, tạo lại `idx_document_title_trgm` nếu thiếu và không đụng `idx_documents_title_trgm`.

---

## 3. Cẩm Nang Vận Hành Alembic An Toàn

```bash
# Xem phiên bản hiện tại của Database
alembic current

# Xem lịch sử toàn bộ các bản migration
alembic history --verbose

# Nâng cấp CSDL lên bản mới nhất
alembic upgrade head

# Hạ cấp về bản trước đó 1 bước (khi cần rollback)
alembic downgrade -1
```

---

## 4. Hiện Trạng Kiểm Thử Chuỗi Migration

- **Đã kiểm thử trên PostgreSQL 18.6 disposable:** dựng schema từ dump Live (schema-only), stamp `a2b3c4d5e6f7`, chạy upgrade `b3c4d5e6f7a8`, kiểm tra MV/type/index/CHECK, chạy downgrade về `a2b3c4d5e6f7`.
- **Kết quả chính:** `document_count` bigint; `total_downloads` numeric và chỉ đếm `DOCUMENT_DOWNLOADED`; `avg_rating` numeric theo trung bình của trung bình từng document (không phải average toàn bộ ratings); unique index tồn tại; drop view có dependency bị fail và rollback, không CASCADE; trigram preflight drop đúng index trùng và giữ index retained.
- **Chưa chạy trên Live DB.** Không có kết nối Live, không chạy migration/downgrade trên Neon trong đợt này.
- **Blocker của chuỗi từ DB trống:** `alembic upgrade head` từ database rỗng hiện dừng ở `f844331e6c1e` vì bảng `folders` không được tạo bởi migration `dae4972dff87` (bảng này chỉ có trong ORM/`create_all`/dump Live). Các bảng `subjects`, `document_ratings`, `community_submissions` cũng không có migration tạo tương ứng. Việc sửa các migration cũ nằm ngoài phạm vi đợt này; chuỗi `a2 -> b3` chỉ được xác minh trên schema Live-like disposable.
