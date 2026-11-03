# Tài liệu kỹ thuật: Nâng cấp Hệ thống Quản trị, Thông báo, Việc cần làm, Thao tác hàng loạt & Quản lý Nhãn (2026)

> **Cập nhật lần cuối**: 03/11/2026  
> **Phạm vi**: Backend (FastAPI + SQLAlchemy Async + APScheduler) & Frontend (React 19 + TypeScript + TanStack Query + Tailwind CSS)

---

## Mục lục

1. [Tổng quan 5 hạng mục nâng cấp](#1-tổng-quan-5-hạng-mục-nâng-cấp)
2. [YC1: Tích hợp Quản lý Kho học liệu trên Sidebar cho `_admin`](#2-yc1-tích-hợp-quản-lý-kho-học-liệu-trên-sidebar-cho-_admin)
3. [YC2: Thông báo Đóng góp học liệu & Điều hướng Deep-link](#3-yc2-thông-báo-đóng-góp-học-liệu--điều-hướng-deep-link)
4. [YC3: Hệ thống Việc cần làm (Personal To-Do) & Đổi màu theo hạn](#4-yc3-hệ-thống-việc-cần-làm-personal-to-do--đổi-màu-theo-hạn)
5. [YC4: Tích chọn nhiều tài liệu & Thao tác hàng loạt (Bulk Actions)](#5-yc4-tích-chọn-nhiều-tài-liệu--thao-tác-hàng-loạt-bulk-actions)
6. [YC5: Trang Quản lý Nhãn (Tags Management) chuyên biệt trên Sidebar](#6-yc5-trang-quản-lý-nhãn-tags-management-chuyên-biệt-trên-sidebar)
7. [Cấu trúc Database & Migration](#7-cấu-trúc-database--migration)
8. [Danh sách API Endpoints mới / cập nhật](#8-danh-sách-api-endpoints-mới--cập-nhật)

---

## 1. Tổng quan 5 hạng mục nâng cấp

| Mã | Hạng mục | Đường dẫn chính | Mô tả tóm tắt |
|---|---|---|---|
| **YC1** | Sidebar Quản trị kho học liệu | `/library/admin` | Tự động hiển thị mục **Quản lý kho học liệu** kèm badge số bài chờ duyệt khi role chứa `_admin` (`system_admin`, `school_admin`, `faculty_admin`). |
| **YC2** | Thông báo đóng góp cho Admin | `/personal` -> `/library/admin/submissions` | Khi người dùng gửi đóng góp học liệu, tạo thông báo `community_submission_received` có `link` deep-link; nhấn vào tự động đánh dấu đã đọc, mở danh sách chờ duyệt và cuộn/highlight đúng thẻ yêu cầu. |
| **YC3** | Quản lý Việc cần làm (To-Do) | `/personal` (Tab *Việc cần làm*) | Thêm/sửa/xóa/hoàn thành việc cần làm (đọc tài liệu, gửi tài liệu lên nhóm, xem tài liệu nhóm, tùy chỉnh) có ngày & khung giờ (`start_at` – `due_at`), tự động đổi màu theo hạn và nhắc hạn qua APScheduler. |
| **YC4** | Tích chọn nhiều tài liệu (Bulk Actions) | `/personal/documents`, `/groups/{id}` | Hỗ trợ tích chọn nhiều tài liệu trên cả 3 chế độ xem (Grid, List, Detail) để **Tải xuống (.zip)**, **Đóng góp hàng loạt** hoặc **Xóa hàng loạt** qua thanh công cụ nổi `DocumentBulkActionBar`. |
| **YC5** | Trang Quản lý Nhãn trên Sidebar | `/personal/tags` | Tab chuyên biệt trên Sidebar giúp thống kê số tài liệu/thư mục theo từng nhãn, tạo mới với bảng màu, đổi tên/đổi màu trực tiếp, gộp nhãn (merge) và xóa hàng loạt. |

---

## 2. YC1: Tích hợp Quản lý Kho học liệu trên Sidebar cho `_admin`

### 2.1. Chuẩn hóa kiểm tra quyền Admin
Để xử lý đồng nhất cả tên role chuẩn (`system_admin`, `school_admin`, `faculty_admin`) và dữ liệu legacy (`sysadmin`, `schooladmin`), hệ thống bổ sung bộ helper dùng chung:

- **Backend**: `backend/app/core/roles.py`
  - `norm_role(role)` -> chuẩn hóa role về hậu tố `_admin`.
  - `is_admin(role)` -> kiểm tra chuỗi sau chuẩn hóa kết thúc bằng `_admin`.
  - `is_global_admin(role)` -> kiểm tra quyền quản trị toàn trường/hệ thống (`system_admin`, `school_admin`).
- **Frontend**: `frontend/digital-library/src/utils/roles.ts`
  - `isAdminRole(role)` và `isGlobalAdminRole(role)`.

### 2.2. Hiển thị trên Sidebar & ProtectedRoute
- **File**: `frontend/digital-library/src/components/shared/layout/Sidebar.tsx`
  - Khi `isAdminRole(user?.role)` là `true`, hiển thị phân khu **Quản trị** với mục **Quản lý kho học liệu** dẫn tới `/library/admin`.
  - Truy vấn số lượng bài đóng góp `status=pending` (refetch mỗi 60 giây) để hiển thị badge đỏ ngay trên Sidebar.
  - Bổ sung prop `end` cho `NavLink` của `/library` để tránh sáng trùng cả 2 tab khi đang ở `/library/admin`.
- **File**: `frontend/digital-library/src/components/auth/ProtectedRoute.tsx` & `src/App.tsx`
  - Hỗ trợ kiểm tra quy ước wildcard `*_admin` cho toàn bộ nhánh `/library/admin/*`.

---

## 3. YC2: Thông báo Đóng góp học liệu & Điều hướng Deep-link

### 3.1. Luồng hoạt động
```
Sinh viên/Giảng viên gửi đóng góp (POST /library/submissions/ hoặc /submissions/bulk)
  │
  ├─► Lưu bản ghi CommunitySubmission (status = "pending")
  ├─► Tìm tất cả Admin hợp lệ:
  │     - faculty_admin cùng khoa với môn học (User.faculty_id == subject.faculty_id)
  │     - Hoặc thuộc nhóm GLOBAL_ADMIN (system_admin, school_admin)
  └─► Tạo Notification:
        - type = "community_submission_received"
        - link = "/library/admin/submissions?status=pending&highlight_submission={submission.id}"
```

Khi Admin nhấn vào thông báo tại tab **Thông báo** ở `/personal` (hoặc chuông thông báo trên `Header`):
1. Gọi `PATCH /notifications/{id}/read` để đánh dấu đã đọc.
2. Điều hướng tới `notif.link` (`/library/admin/submissions?status=pending&highlight_submission={id}`).
3. Trang `LibraryAdminSubmissions.tsx` tự động đọc query `?status=pending` và kích hoạt hook `useHighlightElement("highlight_submission")` để cuộn mượt tới thẻ `id="submission-{id}"` và nhấp nháy viền nổi bật.
4. Khi một Admin duyệt hoặc từ chối bài đóng góp, hệ thống tự động đánh dấu đã đọc các thông báo `community_submission_received` tương ứng của các Admin khác để tránh tồn đọng thông báo cũ.

---

## 4. YC3: Hệ thống Việc cần làm (Personal To-Do) & Đổi màu theo hạn

### 4.1. Phân loại công việc (`task_type`)
1. `read_doc`: Đọc tài liệu cá nhân (kèm bộ chọn tài liệu cá nhân -> điều hướng `/personal/documents/{id}`).
2. `upload_group_doc`: Gửi tài liệu lên nhóm (kèm bộ chọn nhóm -> điều hướng `/groups/{group_id}`).
3. `view_group_doc`: Xem tài liệu trong nhóm (kèm bộ chọn nhóm & tài liệu -> điều hướng `/groups/{group_id}/documents/{doc_id}`).
4. `custom`: Công việc tự do (cho phép gắn link tùy chọn).

### 4.2. Quy tắc đổi màu theo khung giờ & hạn (`src/utils/todoStatus.ts`)
Giao diện `DashboardUpdates.tsx` tự động tính toán lại trạng thái mỗi **60 giây** mà không cần tải lại trang:

| Trạng thái | Điều kiện | Màu sắc hiển thị | Nhãn badge |
|---|---|---|---|
| **Hoàn thành** (`done`) | `is_completed === true` | Xám nhạt (`bg-gray-50`, gạch ngang tiêu đề) | *Đã xong* |
| **Quá hạn** (`overdue`) | `now > due_at` | Đỏ (`bg-red-50/90 border-red-300 text-red-700`) | *Quá hạn* |
| **Sắp đến hạn** (`due_soon`) | `0 < due_at - now <= 60 phút` | Cam nhấp nháy (`bg-orange-50/90 border-orange-300 animate-pulse`) | *Sắp đến hạn (< 1h)* |
| **Trong ngày / Đang diễn ra** (`today`) | Cùng ngày hôm nay hoặc `start_at <= now <= due_at` | Vàng hổ phách (`bg-amber-50/80 border-amber-200 text-amber-700`) | *Trong ngày* |
| **Sắp tới** (`upcoming`) | Còn hơn 1 ngày hoặc không đặt hạn | Xanh dương nhẹ (`bg-sky-50/40 border-sky-200/80`) | *Sắp tới* |

### 4.3. Cronjob nhắc hạn tự động
- **File**: `backend/app/jobs/scheduler.py` (`remind_due_todos`)
- Chạy định kỳ mỗi **5 phút**, quét các công việc chưa hoàn thành (`is_completed == False`, `reminded_at == None`) có `due_at` nằm trong khoảng 30 phút tới (hoặc vừa quá hạn trong 30 phút), tạo thông báo `todo_due` dẫn tới `/personal?highlight_todo={id}` và đánh dấu `reminded_at`.

---

## 5. YC4: Tích chọn nhiều tài liệu & Thao tác hàng loạt (Bulk Actions)

### 5.1. Giao diện tích chọn
- Áp dụng tại **Kho cá nhân** (`/personal/documents` -> `PersonalDocumentsSection.tsx`) và **Kho nhóm** (`/groups/{group_id}` -> `GroupDocumentsSection.tsx`).
- Hỗ trợ tích chọn trên cả **3 chế độ hiển thị**:
  - **Grid View**: Checkbox nổi góc trên phải của `DocumentCard` và `LocalGroupDocumentCard` (hiện khi hover hoặc khi đã chọn, kèm viền `ring-2 ring-primary-500`).
  - **List View** (`DocumentListView.tsx`): Checkbox đầu mỗi dòng tài liệu.
  - **Detail View** (`DocumentDetailView.tsx`): Checkbox bên trái mỗi thẻ chi tiết.
- Nút **Chọn nhiều / Chọn tất cả** ngay trên thanh tiêu đề danh sách tài liệu.

### 5.2. Thanh công cụ nổi (`DocumentBulkActionBar.tsx`)
Khi có ít nhất 1 tài liệu được chọn (`selectedCount > 0`), thanh công cụ nổi xuất hiện ở đáy màn hình với các tác vụ:
1. **Tải xuống (.zip)**: Gọi `POST /documents/bulk-download` hoặc `POST /groups/{id}/documents/bulk-download`, nén stream `zipfile` trực tiếp từ đĩa/Cloudflare R2 và tải về máy.
2. **Đóng góp hàng loạt**: Mở `ContributeModal` ở chế độ nhiều tài liệu (`documents={bulkContributeDocs}`), gửi 1 request `POST /library/submissions/bulk` để đóng góp tất cả tài liệu đã chọn vào cùng Khoa/Môn học và gộp thông báo cho Admin.
3. **Xóa hàng loạt**: Chuyển toàn bộ tài liệu đã chọn vào thùng rác (`POST /documents/bulk-delete` hoặc `POST /groups/{id}/documents/bulk-delete`). Tại kho nhóm, nút Xóa chỉ hiển thị khi người dùng có quyền `owner` hoặc `full`.

---

## 6. YC5: Trang Quản lý Nhãn (Tags Management) chuyên biệt trên Sidebar

- **Đường dẫn**: `/personal/tags` (hiển thị mục **Quản lý nhãn** trên Sidebar).
- **Component**: `frontend/digital-library/src/pages/personal/TagsManagementPage.tsx`
- **Tính năng chính**:
  - **Thống kê trực quan**: Hiển thị tổng số nhãn, số nhãn đang gắn trên tài liệu/thư mục, số nhãn chưa sử dụng.
  - **Tạo nhãn mới với bảng màu**: Chọn nhanh từ 9 màu preset hoặc mã màu tùy chọn; backend kiểm tra trùng tên không phân biệt hoa thường (`409 Conflict`).
  - **Sửa trực tiếp (Inline Edit)**: Đổi tên và màu sắc trực tiếp trên từng thẻ nhãn.
  - **Gộp nhãn (Merge Tags)**: Chọn nhiều nhãn nguồn và gộp vào 1 nhãn đích (`POST /tags/merge`) — tự động chuyển toàn bộ liên kết `DocumentTag` và `FolderTag` sang nhãn đích mà không làm trùng lặp bản ghi.
  - **Xem tài liệu theo nhãn**: Nhấn vào số lượng tài liệu trên thẻ nhãn sẽ chuyển sang `/personal/documents?tag={tag.id}` và tự động kích hoạt bộ lọc theo nhãn đó.

---

## 7. Cấu trúc Database & Migration

File migration: `alembic/versions/a1b2c3d4e5f6_add_notifications_link_and_user_todos.py` (kèm cơ chế tự động kiểm tra và tạo bảng/cột khi khởi động tại `backend/app/main.py`):

1. **Bảng `notifications` (cập nhật)**:
   - Mở rộng cột `type` lên `VARCHAR(50)`.
   - Thêm cột `link VARCHAR(255) NULL` để lưu đường dẫn điều hướng deep-link.
2. **Bảng `user_todos` (mới)**:
   - `id` (`SERIAL PRIMARY KEY`)
   - `user_id` (`INTEGER FK -> users.id ON DELETE CASCADE`)
   - `title` (`VARCHAR(255) NOT NULL`), `description` (`TEXT NULL`)
   - `task_type` (`VARCHAR(50) NOT NULL DEFAULT 'custom'`)
   - `target_document_id` (`INTEGER FK -> documents.id ON DELETE SET NULL`)
   - `target_workspace_id` (`INTEGER FK -> workspaces.id ON DELETE SET NULL`)
   - `custom_link` (`VARCHAR(255) NULL`)
   - `start_at` (`TIMESTAMPTZ NULL`), `due_at` (`TIMESTAMPTZ NULL`)
   - `is_completed` (`BOOLEAN NOT NULL DEFAULT FALSE`), `completed_at` (`TIMESTAMPTZ NULL`)
   - `reminded_at` (`TIMESTAMPTZ NULL`), `created_at`, `updated_at`

---

## 8. Danh sách API Endpoints mới / cập nhật

| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/notifications/` | Lấy danh sách thông báo (hỗ trợ `?unread_only=true&types=...`, sắp xếp mới nhất trước). |
| `GET` | `/notifications/unread-count` | Đếm nhanh số thông báo chưa đọc hiển thị trên Header & Sidebar. |
| `POST` | `/notifications/mark-all-read` | Đánh dấu tất cả thông báo của người dùng là đã đọc. |
| `GET` | `/todos/` | Lấy danh sách việc cần làm (lọc theo `status=all\|pending\|completed\|overdue`). |
| `POST` | `/todos/` | Tạo việc cần làm mới (kiểm tra `due_at >= start_at`). |
| `PATCH` | `/todos/{todo_id}` | Cập nhật nội dung, khung giờ hoặc trạng thái hoàn thành (`is_completed`). |
| `DELETE` | `/todos/{todo_id}` | Xóa việc cần làm. |
| `POST` | `/documents/bulk-delete` | Xóa mềm nhiều tài liệu cá nhân cùng lúc. |
| `POST` | `/documents/bulk-download` | Nén và tải xuống nhiều tài liệu cá nhân dưới dạng `.zip`. |
| `POST` | `/groups/{group_id}/documents/bulk-delete` | Xóa mềm nhiều tài liệu nhóm cùng lúc. |
| `POST` | `/groups/{group_id}/documents/bulk-download` | Nén và tải xuống nhiều tài liệu nhóm dưới dạng `.zip`. |
| `POST` | `/library/submissions/bulk` | Đóng góp hàng loạt nhiều tài liệu vào kho học liệu cộng đồng. |
| `GET` | `/tags/stats` | Lấy danh sách nhãn kèm `document_count`, `folder_count`, `total_usage`. |
| `POST` | `/tags/merge` | Gộp nhiều nhãn nguồn (`source_tag_ids`) vào một nhãn đích (`target_tag_id`). |
