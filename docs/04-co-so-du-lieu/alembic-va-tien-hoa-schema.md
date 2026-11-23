---
title: Lịch Sử Di Chuyển Lược Đồ (Alembic Migrations)
sidebar_label: 🔄 Lịch sử Migrations
sidebar_position: 5
---

# 🔄 LỊCH SỬ DI CHUYỂN LƯỢC ĐỒ (ALEMBIC MIGRATIONS)

Hệ thống cơ sở dữ liệu của **Foundation Project** được quản lý tiến hóa thông qua công cụ di chuyển lược đồ **Alembic**. Toàn bộ lịch sử DDL được lưu vết thành chuỗi **7 bản migration tuyến tính**, tuyệt đối không bị phân nhánh (no branching).

---

## 1. Chuỗi Tiến Hóa Lược Đồ Tuyến Tính

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
