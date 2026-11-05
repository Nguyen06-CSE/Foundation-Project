# API Endpoints: System Enhancements (2026)

Tài liệu chi tiết về các RESTful API endpoints mới và nâng cấp trong hệ thống. Tất cả các endpoint đều yêu cầu xác thực JWT Bearer Token (`Authorization: Bearer <token>`) trừ khi có ghi chú khác.

---

## 1. Nhóm API Thông Báo (Notifications)

Router file: `backend/app/routers/notifications.py` (Base path: `/notifications`)

### 1.1. Lấy danh sách thông báo
`GET /notifications/`

- **Query Parameters**:
  - `unread_only` (bool, default `False`): Chỉ lấy thông báo chưa đọc.
  - `types` (string, optional): Lọc theo danh sách type, phân tách bởi dấu phẩy (vd: `community_submission_received,todo_due`).
  - `limit` (int, default `50`): Số lượng tối đa trả về.
- **Response**: `200 OK` — `List[NotificationOut]`
  ```json
  [
    {
      "id": 102,
      "user_id": 5,
      "type": "community_submission_received",
      "document_id": 48,
      "message": "Nguyễn Văn A đóng góp tài liệu chờ duyệt: Giáo trình Cấu trúc dữ liệu",
      "link": "/library/admin/submissions?status=pending&highlight_submission=12",
      "is_read": false,
      "created_at": "2026-11-05T08:30:00Z"
    }
  ]
  ```

### 1.2. Đếm số thông báo chưa đọc
`GET /notifications/unread-count`

- **Mô tả**: Endpoint siêu nhẹ (chỉ đếm `COUNT(id)` với `is_read = False`) dùng cho chuông thông báo trên Header và badge Sidebar.
- **Response**: `200 OK`
  ```json
  {
    "unread_count": 3
  }
  ```

### 1.3. Đánh dấu tất cả thông báo là đã đọc
`POST /notifications/mark-all-read`

- **Response**: `200 OK`
  ```json
  {
    "updated_count": 3
  }
  ```

### 1.4. Đánh dấu một thông báo đã đọc
`PATCH /notifications/{notification_id}/read`

- **Response**: `200 OK` — `NotificationOut`

---

## 2. Nhóm API Việc Cần Làm (Personal To-Do)

Router file: `backend/app/routers/todos.py` (Base path: `/todos`)

### 2.1. Lấy danh sách việc cần làm
`GET /todos/`

- **Query Parameters**:
  - `status` (string, default `"all"`, enum: `all`, `pending`, `completed`, `overdue`).
- **Response**: `200 OK` — `List[TodoOut]`
  ```json
  [
    {
      "id": 8,
      "user_id": 5,
      "title": "Đọc tài liệu Mạng máy tính Chương 3",
      "description": "Chuẩn bị trước câu hỏi cho buổi thảo luận nhóm thứ 6",
      "task_type": "read_doc",
      "target_document_id": 42,
      "target_workspace_id": null,
      "custom_link": null,
      "start_at": "2026-11-05T09:00:00Z",
      "due_at": "2026-11-05T11:00:00Z",
      "is_completed": false,
      "completed_at": null,
      "created_at": "2026-11-04T15:20:00Z",
      "updated_at": "2026-11-04T15:20:00Z",
      "target_document_title": "Slide Mạng máy tính Ch3.pdf",
      "target_workspace_name": null
    }
  ]
  ```

### 2.2. Tạo việc cần làm mới
`POST /todos/`

- **Request Body**: `TodoCreate` (JSON)
  ```json
  {
    "title": "Gửi đề cương môn học lên nhóm",
    "description": "Tải file PDF từ kho cá nhân gửi vào không gian nhóm",
    "task_type": "upload_group_doc",
    "target_workspace_id": 3,
    "start_at": "2026-11-05T14:00:00Z",
    "due_at": "2026-11-05T17:00:00Z"
  }
  ```
- **Validation**:
  - `title` không được để trống (1 - 255 ký tự).
  - Nếu có cả `start_at` và `due_at`, yêu cầu `due_at >= start_at` (bắn `422 Unprocessable Entity` nếu vi phạm).
- **Response**: `201 Created` — `TodoOut`

### 2.3. Cập nhật việc cần làm
`PATCH /todos/{todo_id}`

- **Request Body**: `TodoUpdate` (JSON — tất cả các trường đều optional)
  ```json
  {
    "is_completed": true
  }
  ```
- **Logic**:
  - Khi `is_completed = true` và `completed_at` chưa có, backend tự động gán `completed_at = now()`.
  - Nếu đổi `is_completed = false`, tự động reset `completed_at = None`.
- **Response**: `200 OK` — `TodoOut`

### 2.4. Xóa việc cần làm
`DELETE /todos/{todo_id}`

- **Response**: `204 No Content`

---

## 3. Nhóm API Thao Tác Hàng Loạt (Bulk Document Actions)

### 3.1. Xóa hàng loạt tài liệu cá nhân
`POST /documents/bulk-delete` (File: `backend/app/routers/documents.py`)

- **Request Body**:
  ```json
  {
    "document_ids": [10, 11, 15]
  }
  ```
- **Logic**:
  - Kiểm tra quyền sở hữu `owner_id == current_user.id`.
  - Xóa mềm: gán `is_deleted = True, deleted_at = now()`.
  - Nếu tài liệu là Bundle (`is_bundle = True`), cascade xóa mềm toàn bộ con thuộc bundle.
- **Response**: `200 OK`
  ```json
  {
    "deleted_count": 3,
    "skipped_ids": [],
    "succeeded": [10, 11, 15],
    "failed": []
  }
  ```

### 3.2. Tải nén hàng loạt tài liệu cá nhân (.zip)
`POST /documents/bulk-download` (File: `backend/app/routers/documents.py`)

- **Request Body**: `{"document_ids": [10, 11, 15]}` (tối đa 50 tài liệu/lần).
- **Response**: `StreamingResponse` (`media_type="application/zip"`).
- **Header**: `Content-Disposition: attachment; filename=tai_lieu_ca_nhan.zip`.
- **Logic**:
  - Đọc file từ ổ đĩa local hoặc tải từ Cloudflare R2 qua `download_file_from_r2`.
  - Xử lý trùng tên file: tự động đánh số `Tên file (1).pdf` tránh ghi đè trong file nén.
  - Tự động gom file con của Bundle vào thư mục con cùng tên Bundle trong file ZIP.

### 3.3. Xóa hàng loạt tài liệu nhóm
`POST /groups/{group_id}/documents/bulk-delete` (File: `backend/app/routers/groups.py`)

- **Request Body**: `{"document_ids": [20, 21]}`.
- **Phân quyền**: Yêu cầu quyền `owner` hoặc `full` trong nhóm.
- **Response**: `200 OK` (`deleted_count`, `skipped_ids`).

### 3.4. Tải nén hàng loạt tài liệu nhóm (.zip)
`POST /groups/{group_id}/documents/bulk-download` (File: `backend/app/routers/groups.py`)

- **Request Body**: `{"document_ids": [20, 21]}`.
- **Phân quyền**: Yêu cầu là thành viên hợp lệ của nhóm.
- **Response**: `StreamingResponse` nén `.zip`.

### 3.5. Đóng góp hàng loạt vào Kho học liệu cộng đồng
`POST /library/submissions/bulk` (File: `backend/app/routers/library.py`)

- **Request Body**: `BulkSubmissionCreate`
  ```json
  {
    "source_document_ids": [14, 18, 22],
    "subject_id": 9,
    "academic_year": "2024-2025",
    "doc_type": "Giáo trình",
    "note": "Bộ tài liệu học phần Công nghệ phần mềm"
  }
  ```
- **Logic**:
  - Bỏ qua các tài liệu đã có trạng thái `pending` trong bảng `community_submissions` (chống spam trùng).
  - Cho phép đóng góp cả tài liệu cá nhân thuộc sở hữu của user hoặc tài liệu thuộc nhóm mà user là thành viên.
  - Tạo các bản ghi `CommunitySubmission` có trạng thái `pending`.
  - Gộp thông báo: Nếu nộp $N > 1$ file, chỉ gửi **1 thông báo tổng hợp** đến các Admin liên quan: `"{name} đóng góp N tài liệu mới chờ duyệt ({subject_name})"`.
- **Response**: `200 OK`
  ```json
  {
    "submitted_count": 3,
    "skipped_ids": [],
    "succeeded": [14, 18, 22],
    "failed": []
  }
  ```

---

## 4. Nhóm API Quản Lý Nhãn (Tags Management)

Router file: `backend/app/routers/tags.py` (Base path: `/tags`)

### 4.1. Thống kê số lượng sử dụng nhãn
`GET /tags/stats`

- **Response**: `200 OK` — `List[TagStatsOut]`
  ```json
  [
    {
      "id": 1,
      "name": "Giáo trình",
      "color": "#3B82F6",
      "user_id": 5,
      "document_count": 14,
      "folder_count": 2,
      "total_usage": 16,
      "created_at": "2026-10-10T10:00:00Z"
    }
  ]
  ```

### 4.2. Tạo nhãn mới (Chống trùng tên không phân biệt hoa thường)
`POST /tags/`

- **Request Body**: `TagCreate` (`name: string`, `color?: string`).
- **Logic**: So khớp `LOWER(name) == LOWER(payload.name)`. Nếu đã tồn tại nhãn cùng tên của user, trả về lỗi `409 Conflict` kèm thông báo: `"Bạn đã có nhãn mang tên này"`.
- **Response**: `201 Created` — `TagOut`

### 4.3. Gộp nhiều nhãn (Merge Tags)
`POST /tags/merge`

- **Request Body**:
  ```json
  {
    "source_tag_ids": [2, 3],
    "target_tag_id": 1
  }
  ```
- **Logic**:
  - Xác thực tất cả `source_tag_ids` và `target_tag_id` đều thuộc quyền sở hữu của user.
  - Chuyển toàn bộ liên kết `document_tags` và `folder_tags` sang `target_tag_id`, tự động loại bỏ trùng lặp.
  - Xóa các nhãn nguồn `source_tag_ids`.
- **Response**: `200 OK`
  ```json
  {
    "message": "Gộp nhãn thành công",
    "target_tag_id": 1,
    "merged_count": 2
  }
  ```
