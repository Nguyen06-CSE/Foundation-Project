---
title: Từ Điển Dữ Liệu Chi Tiết (Data Dictionary)
sidebar_label: 📖 Từ điển Dữ liệu
sidebar_position: 3
---

# Từ Điển Dữ Liệu Chi Tiết (Data Dictionary)

Tài liệu này đặc tả chi tiết cấu trúc 26 bảng dữ liệu của hệ thống, bao gồm tên cột, kiểu dữ liệu PostgreSQL, ràng buộc nullability, khóa chính/ngoại và ý nghĩa nghiệp vụ.

> 🔒 **Cảnh báo Dữ liệu Nhạy Cảm**:
> Cột `users.hashed_password` lưu trữ chuỗi băm `bcrypt`. Tuyệt đối không được in ra file log, không đưa vào mã nguồn, và không serialize qua bất kỳ API response công khai nào.

---

## 1. Cụm Người Dùng & Học Thuật

### 1.1. Bảng `users`
Lưu trữ thông tin tài khoản người dùng, phân quyền vai trò và liên kết đơn vị học thuật.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa & Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK, Auto Increment | - | Khóa chính định danh người dùng |
| `username` | `VARCHAR(64)` | NOT NULL | UNIQUE, Index | - | Tên đăng nhập hệ thống |
| `email` | `VARCHAR(128)` | NOT NULL | UNIQUE, Index | - | Địa chỉ email trường học |
| `hashed_password` | `VARCHAR(256)` | NOT NULL | - | - | Mật khẩu mã hóa bằng thuật toán `bcrypt` |
| `full_name` | `VARCHAR(128)` | NULL | - | - | Họ và tên hiển thị đầy đủ |
| `role` | `VARCHAR(32)` | NOT NULL | - | `'student'` | Vai trò: `student`, `teacher`, `faculty_admin`, `school_admin`, `system_admin` |
| `avatar_url` | `VARCHAR(256)` | NULL | - | - | Đường dẫn ảnh đại diện |
| `faculty_id` | `INTEGER` | NULL | FK -> `faculties.id` | - | Khoa/Viện đào tạo trực thuộc |
| `class_id` | `INTEGER` | NULL | FK -> `classes.id` | - | Lớp sinh hoạt chuyên ngành |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm tạo tài khoản |

### 1.2. Bảng `faculties`
Danh mục Khoa/Viện đào tạo của trường.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính định danh Khoa |
| `code` | `VARCHAR(20)` | NOT NULL | UNIQUE | Mã Khoa (VD: `CNTT`, `KT`, `DTVT`) |
| `name` | `VARCHAR(150)` | NOT NULL | - | Tên đầy đủ của Khoa/Viện |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo bản ghi |

### 1.3. Bảng `classes`
Danh mục Lớp sinh hoạt / Lớp sinh viên thuộc Khoa.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính định danh Lớp |
| `faculty_id` | `INTEGER` | NOT NULL | FK -> `faculties.id` | Khóa ngoại liên kết tới Khoa |
| `code` | `VARCHAR(20)` | NOT NULL | UNIQUE | Mã lớp (VD: `KTPM2022`, `CNTT01`) |
| `name` | `VARCHAR(150)` | NOT NULL | - | Tên lớp sinh hoạt |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo lớp |

---

## 2. Cụm Tài Liệu & Lưu Trữ Tệp

### 2.1. Bảng `documents`
Thực thể trung tâm quản lý tài liệu, phân bản, gom nhóm (bundle) và thùng rác.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính tài liệu |
| `owner_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người sở hữu tài liệu |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | - | Không gian nhóm (NULL nếu là kho cá nhân) |
| `category_id` | `INTEGER` | NULL | FK -> `categories.id` | - | Chuyên mục tài liệu |
| `subject_id` | `INTEGER` | NULL | FK -> `subjects.id` | - | Môn học (đối với tài liệu thư viện) |
| `bundle_parent_id`| `INTEGER` | NULL | FK -> `documents.id` | - | ID tài liệu cha (nếu tài liệu này nằm trong 1 bundle) |
| `source_document_id`| `INTEGER` | NULL | FK -> `documents.id` | - | Tài liệu gốc (khi copy/fork về cá nhân) |
| `trash_batch_id` | `INTEGER` | NULL | FK -> `trash_batches.id` | - | Đợt xóa vào thùng rác |
| `is_bundle` | `BOOLEAN` | NOT NULL | - | `False` | Cờ đánh dấu tài liệu là một bundle (gói nhiều file) |
| `title` | `VARCHAR(255)`| NOT NULL | Index | - | Tiêu đề hiển thị của tài liệu |
| `description` | `TEXT` | NULL | - | - | Mô tả chi tiết hoặc tóm tắt tài liệu |
| `file_name` | `VARCHAR(255)`| NOT NULL | - | - | Tên file vật lý trên đĩa / S3 |
| `original_name`| `VARCHAR(255)`| NULL | - | - | Tên file gốc người dùng tải lên |
| `file_path` | `VARCHAR(500)`| NOT NULL | - | - | Đường dẫn tương đối hoặc Cloudflare R2 key |
| `file_size` | `INTEGER` | NOT NULL | - | - | Kích thước file tính bằng byte |
| `mime_type` | `VARCHAR(100)`| NOT NULL | - | - | MIME type (VD: `application/pdf`) |
| `file_hash` | `VARCHAR(64)` | NULL | Index | - | Mã băm SHA-256 phục vụ deduplication |
| `thumbnail_path`| `VARCHAR(500)`| NULL | - | - | Đường dẫn ảnh thumbnail xem trước |
| `search_vector` | `TSVECTOR` | NULL | GIN Index | - | Vector từ khóa tìm kiếm toàn văn FTS |
| `is_public` | `BOOLEAN` | NULL | - | `False` | Trạng thái công khai trong thư viện trường |
| `is_deleted` | `BOOLEAN` | NOT NULL | Index | `False` | Cờ xóa mềm (True nếu ở trong thùng rác) |
| `deleted_at` | `DATETIME` | NULL | - | - | Thời điểm chuyển vào thùng rác |
| `permanent_delete_at`| `DATETIME` | NULL | - | - | Thời hạn xóa vĩnh viễn (mặc định sau 30 ngày) |
| `view_count` | `INTEGER` | NOT NULL | - | `0` | Tổng số lượt xem trực tuyến |
| `download_count`| `INTEGER` | NOT NULL | - | `0` | Tổng số lượt tải về máy |
| `created_at` | `DATETIME` | NOT NULL | Index | `utcnow` | Thời điểm tải lên |
| `updated_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm cập nhật cuối |

### 2.2. Bảng `document_versions`
Theo dõi lịch sử các phiên bản tệp tin được cập nhật.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính phiên bản |
| `document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | Tài liệu tương ứng |
| `version_number`| `INTEGER` | NOT NULL | - | Số thứ tự phiên bản (1, 2, 3...) |
| `file_path` | `VARCHAR(500)`| NOT NULL | - | Đường dẫn tệp tin của phiên bản này |
| `file_size` | `INTEGER` | NULL | - | Kích thước tệp tin (byte) |
| `uploaded_by` | `INTEGER` | NULL | FK -> `users.id` | Người đăng tải phiên bản |
| `change_log` | `TEXT` | NULL | - | Ghi chú các thay đổi trong phiên bản |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo phiên bản |

### 2.3. Bảng `document_stats`
Bảng tổng hợp thống kê tương tác thời gian thực cho tài liệu.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `document_id` | `INTEGER` | NOT NULL | PK, FK -> `documents.id` | - | Khóa chính đồng thời là khóa ngoại tới `documents` |
| `view_count` | `INTEGER` | NOT NULL | - | `0` | Số lượt xem tài liệu |
| `download_count`| `INTEGER` | NOT NULL | - | `0` | Số lượt tải tài liệu |
| `share_count` | `INTEGER` | NOT NULL | - | `0` | Số lần được chia sẻ |
| `fork_count` | `INTEGER` | NOT NULL | - | `0` | Số lần người dùng sao chép về kho riêng |
| `rating_count` | `INTEGER` | NOT NULL | - | `0` | Số lượng lượt đánh giá sao |
| `rating_avg` | `FLOAT` | NOT NULL | - | `0.0` | Điểm đánh giá trung bình (1.0 đến 5.0) |
| `last_viewed_at`| `DATETIME` | NULL | - | - | Thời điểm xem gần nhất |
| `updated_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm cập nhật thống kê |

### 2.4. Bảng `processing_jobs`
Theo dõi các tác vụ xử lý tài liệu chạy nền (tạo thumbnail, sinh text FTS).

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính tác vụ |
| `document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | - | Tài liệu đang được xử lý |
| `job_type` | `VARCHAR(50)` | NOT NULL | - | - | Loại tác vụ: `thumbnail`, `fts_extract`, `preview` |
| `status` | `VARCHAR(20)` | NULL | - | `'pending'` | Trạng thái: `pending`, `processing`, `completed`, `failed` |
| `error_message` | `TEXT` | NULL | - | - | Chi tiết thông điệp lỗi nếu tác vụ thất bại |
| `created_at` | `DATETIME` | NULL | - | - | Thời điểm khởi tạo tác vụ |
| `updated_at` | `DATETIME` | NOT NULL | - | - | Thời điểm cập nhật trạng thái |

---

## 3. Cụm Phân Loại & Cây Thư Mục

### 3.1. Bảng `folders`
Quản lý cây thư mục lồng nhau của cá nhân hoặc trong workspace.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính thư mục |
| `owner_id` | `INTEGER` | NOT NULL | FK -> `users.id` | Người sở hữu thư mục |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | Không gian nhóm chứa thư mục |
| `parent_id` | `INTEGER` | NULL | FK -> `folders.id` | Thư mục cha (NULL nếu là thư mục gốc) |
| `name` | `VARCHAR(255)` | NOT NULL | - | Tên hiển thị của thư mục |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo thư mục |

### 3.2. Bảng `tags`
Hệ thống thẻ nhãn phân loại tài liệu.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính thẻ tag |
| `owner_id` | `INTEGER` | NULL | FK -> `users.id` | Người tạo tag |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | Không gian nhóm (NULL nếu là tag cá nhân) |
| `name` | `VARCHAR(64)` | NOT NULL | - | Tên thẻ tag |
| `color` | `VARCHAR(16)` | NULL | - | Mã màu HEX đại diện cho tag (VD: `#3B82F6`) |
| `parent_id` | `INTEGER` | NULL | FK -> `tags.id` | Thẻ tag cha (hỗ trợ phân cấp tag) |

### 3.3. Bảng `categories`
Danh mục phân loại môn học và lĩnh vực tài liệu.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính danh mục |
| `owner_id` | `INTEGER` | NULL | FK -> `users.id` | Người tạo |
| `name` | `VARCHAR(128)` | NOT NULL | - | Tên chuyên mục |
| `parent_id` | `INTEGER` | NULL | FK -> `categories.id` | Chuyên mục cha |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo |

### 3.4. Bảng `subjects`
Môn học thuộc Khoa phục vụ phân loại trong Thư viện cộng đồng.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính môn học |
| `faculty_id` | `INTEGER` | NOT NULL | FK -> `faculties.id` | Khoa quản lý môn học |
| `code` | `VARCHAR(20)` | NOT NULL | - | Mã môn học (VD: `INT1340`) |
| `name` | `VARCHAR(150)` | NOT NULL | - | Tên đầy đủ của môn học |
| `description` | `TEXT` | NULL | - | Mô tả môn học |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo bản ghi |

### 3.5. Bảng liên kết `document_tags`, `folder_tags`, `workspace_tags`
- `document_tags`: Liên kết N-N giữa `document_id` (PK, FK) và `tag_id` (PK, FK).
- `folder_tags`: Liên kết N-N giữa `folder_id` (PK, FK) và `tag_id` (PK, FK).
- `workspace_tags`: Quản lý thẻ tag riêng biệt được gán quyền sử dụng trong nhóm `workspace_id`.

---

## 4. Cụm Không Gian Nhóm & Tương Tác Cộng Đồng

### 4.1. Bảng `workspaces`
Không gian nhóm làm việc và học tập.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính không gian nhóm |
| `owner_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Trưởng nhóm sở hữu |
| `name` | `VARCHAR(128)` | NOT NULL | - | - | Tên nhóm |
| `description` | `TEXT` | NULL | - | - | Mô tả mục tiêu của nhóm |
| `type` | `VARCHAR(32)` | NOT NULL | - | `'group'` | Loại không gian |
| `ref_faculty_id` | `INTEGER` | NULL | FK -> `faculties.id` | - | Khoa liên kết |
| `ref_class_id` | `INTEGER` | NULL | FK -> `classes.id` | - | Lớp học liên kết |
| `default_role` | `VARCHAR(32)` | NOT NULL | - | `'view'` | Quyền mặc định cho thành viên mới (`view`, `edit`) |
| `is_dissolving` | `BOOLEAN` | NOT NULL | - | `False` | Cờ đánh dấu nhóm đang trong quá trình giải tán |
| `dissolve_at` | `DATETIME` | NULL | - | - | Hạn cuối giải tán hoàn toàn nhóm |
| `is_deleted` | `BOOLEAN` | NOT NULL | - | `False` | Cờ xóa mềm nhóm |
| `deleted_at` | `DATETIME` | NULL | - | - | Thời điểm chuyển nhóm vào thùng rác |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm thành lập nhóm |

### 4.2. Bảng `workspace_members`
Danh sách thành viên tham gia nhóm và quyền hạn.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `workspace_id` | `INTEGER` | NOT NULL | PK, FK -> `workspaces.id` | - | ID nhóm |
| `user_id` | `INTEGER` | NOT NULL | PK, FK -> `users.id` | - | ID thành viên |
| `role` | `VARCHAR(32)` | NOT NULL | - | `'view'` | Quyền trong nhóm (`owner`, `admin`, `edit`, `view`) |
| `joined_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm gia nhập nhóm |

### 4.3. Bảng `workspace_invitations`
Quản lý lời mời tham gia nhóm.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính lời mời |
| `workspace_id` | `INTEGER` | NOT NULL | FK -> `workspaces.id` | - | Nhóm mời tham gia |
| `invited_by` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người gửi lời mời |
| `invited_user_id`| `INTEGER` | NOT NULL | FK -> `users.id` | - | Người nhận lời mời |
| `status` | `VARCHAR(20)` | NOT NULL | - | `'pending'` | Trạng thái: `pending`, `accepted`, `rejected`, `cancelled` |
| `role` | `VARCHAR(32)` | NULL | - | `'view'` | Quyền hạn chỉ định khi gia nhập |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm gửi lời mời |
| `expires_at` | `DATETIME` | NULL | - | - | Thời điểm hết hạn của lời mời |

### 4.4. Bảng `document_shares`
Quản lý luồng chia sẻ tài liệu trực tiếp giữa các người dùng.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính bản ghi chia sẻ |
| `document_id` | `INTEGER` | NULL | FK -> `documents.id` | - | Tài liệu được chia sẻ |
| `source_document_id` | `INTEGER` | NULL | FK -> `documents.id` | - | Tài liệu gốc ban đầu |
| `from_user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người gửi chia sẻ |
| `to_user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người nhận chia sẻ |
| `source_workspace_id`| `INTEGER` | NULL | FK -> `workspaces.id` | - | Nhóm xuất phát (nếu có) |
| `share_type` | `VARCHAR(20)` | NOT NULL | - | `'direct'` | Hình thức: `direct` (trực tiếp), `group` (nhóm) |
| `status` | `VARCHAR(20)` | NOT NULL | - | `'pending'` | Trạng thái: `pending`, `accepted`, `rejected`, `withdrawn` |
| `note` | `TEXT` | NULL | - | - | Lời nhắn gửi kèm khi chia sẻ |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm gửi |
| `responded_at` | `DATETIME` | NULL | - | - | Thời điểm người nhận phản hồi (chấp nhận/từ chối) |

> 💡 **Chỉ mục Partial Unique Index**: Bảng `document_shares` thiết lập chỉ mục `uq_document_shares_pending` trên `(document_id, to_user_id)` với điều kiện `status = 'pending'`, đảm bảo không thể gửi trùng lặp yêu cầu chia sẻ cho cùng một tài liệu khi yêu cầu trước chưa được phản hồi.

### 4.5. Bảng `community_submissions`
Hồ sơ đề xuất gửi duyệt tài liệu lên Thư viện cộng đồng học thuật.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính hồ sơ gửi duyệt |
| `source_document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | - | Tài liệu cá nhân được gửi duyệt |
| `published_document_id` | `INTEGER` | NULL | FK -> `documents.id` | - | Tài liệu công khai sau khi được duyệt |
| `submitter_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người nộp tài liệu |
| `subject_id` | `INTEGER` | NOT NULL | FK -> `subjects.id` | - | Môn học đăng ký xuất bản |
| `academic_year` | `VARCHAR(50)` | NULL | - | - | Năm học áp dụng (VD: `2025-2026`) |
| `doc_type` | `VARCHAR(50)` | NULL | - | - | Phân loại học liệu (Giáo trình, Đề thi, Slide bài giảng) |
| `note` | `TEXT` | NULL | - | - | Ghi chú gửi Ban Quản Trị |
| `status` | `VARCHAR(20)` | NOT NULL | - | `'pending'` | Trạng thái: `pending`, `approved`, `rejected` |
| `reviewed_by` | `INTEGER` | NULL | FK -> `users.id` | - | Cán bộ/Admin phê duyệt |
| `reviewed_at` | `DATETIME` | NULL | - | - | Thời điểm phê duyệt |
| `rejection_reason` | `TEXT` | NULL | - | - | Lý do từ chối (nếu bị reject) |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm nộp hồ sơ |

### 4.6. Bảng `document_ratings`
Đánh giá sao và phản hồi chất lượng học liệu.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính đánh giá |
| `document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | Tài liệu được đánh giá |
| `user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | Người đánh giá (Mỗi user chỉ đánh giá 1 lần/tài liệu) |
| `rating` | `INTEGER` | NOT NULL | - | Số sao đánh giá từ 1 đến 5 |
| `comment` | `TEXT` | NULL | - | Nội dung bình luận nhận xét |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm gửi đánh giá |

---

## 5. Cụm Hoạt Động & Cá Nhân Hóa

### 5.1. Bảng `notes`
Ghi chú riêng tư gắn liền với tài liệu.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính ghi chú |
| `user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | Người tạo ghi chú |
| `document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | Tài liệu được ghi chú |
| `content` | `TEXT` | NOT NULL | - | Nội dung ghi chú (hỗ trợ văn bản hoặc định dạng markdown) |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm tạo |

### 5.2. Bảng `favorites`
Danh sách tài liệu yêu thích của từng người dùng.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính bản ghi yêu thích |
| `user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | Người dùng đánh dấu thích |
| `document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | Tài liệu được yêu thích |

### 5.3. Bảng `download_logs`
Nhật ký kiểm toán truy cập tải xuống tài liệu.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính bản ghi nhật ký |
| `user_id` | `INTEGER` | NULL | FK -> `users.id` | Người tải (NULL nếu là khách vãng lai) |
| `document_id` | `INTEGER` | NOT NULL | FK -> `documents.id` | Tài liệu được tải |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | Tải trong phạm vi nhóm (nếu có) |
| `ip_address` | `VARCHAR(45)` | NULL | - | Địa chỉ IP của máy khách (hỗ trợ IPv4 và IPv6) |
| `user_agent` | `VARCHAR(255)`| NULL | - | Trình duyệt / Ứng dụng client gửi yêu cầu |
| `source` | `VARCHAR(30)` | NOT NULL | - | Nguồn tải (`personal`, `group`, `community`) |
| `created_at` | `DATETIME` | NOT NULL | Index | Thời điểm tải tệp |

### 5.4. Bảng `notifications`
Thông báo gửi tới người dùng.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính thông báo |
| `user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người nhận thông báo |
| `type` | `VARCHAR(50)` | NOT NULL | - | - | Loại: `share`, `invite`, `submission_approved`, `system` |
| `title` | `VARCHAR(255)` | NOT NULL | - | - | Tiêu đề thông báo |
| `message` | `TEXT` | NOT NULL | - | - | Nội dung chi tiết |
| `link` | `VARCHAR(255)` | NULL | - | - | Đường dẫn điều hướng khi người dùng nhấn vào thông báo |
| `is_read` | `BOOLEAN` | NOT NULL | Index | `False` | Trạng thái đã đọc hay chưa |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | - | Nhóm liên quan (nếu có) |
| `document_id` | `INTEGER` | NULL | FK -> `documents.id` | - | Tài liệu liên quan (nếu có) |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm phát sinh thông báo |

### 5.5. Bảng `trash_batches`
Quản lý đợt xóa theo lô vào thùng rác.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | Khóa chính đợt xóa |
| `deleted_by` | `INTEGER` | NOT NULL | FK -> `users.id` | Người thực hiện hành vi xóa |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | Nhóm tương ứng (NULL nếu là kho cá nhân) |
| `original_folder_id`| `INTEGER` | NULL | - | Thư mục ban đầu chứa tài liệu trước khi xóa |
| `item_count` | `INTEGER` | NOT NULL | - | Số lượng tài liệu nằm trong đợt xóa này |
| `created_at` | `DATETIME` | NOT NULL | - | Thời điểm thực hiện xóa |

### 5.6. Bảng `user_todos`
Quản lý công việc cá nhân (Todos) gắn với tài liệu học tập.

| Tên cột | Kiểu dữ liệu | Bắt buộc | Khóa | Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | NOT NULL | PK | - | Khóa chính công việc |
| `user_id` | `INTEGER` | NOT NULL | FK -> `users.id` | - | Người tạo công việc |
| `title` | `VARCHAR(255)` | NOT NULL | - | - | Tiêu đề việc cần làm |
| `note` | `TEXT` | NULL | - | - | Ghi chú bổ sung |
| `task_type` | `VARCHAR(30)` | NOT NULL | - | `'custom'` | Loại việc (`custom`, `review`, `assignment`) |
| `document_id` | `INTEGER` | NULL | FK -> `documents.id` | - | Tài liệu liên quan |
| `workspace_id` | `INTEGER` | NULL | FK -> `workspaces.id` | - | Nhóm liên quan |
| `start_at` | `DATETIME` | NULL | - | - | Thời điểm bắt đầu |
| `due_at` | `DATETIME` | NULL | - | - | Hạn chót hoàn thành |
| `priority` | `VARCHAR(10)` | NOT NULL | - | `'normal'` | Mức độ ưu tiên (`low`, `normal`, `high`, `urgent`) |
| `remind_before_minutes`| `INTEGER` | NULL | - | `30` | Nhắc nhở trước X phút qua thông báo |
| `reminded_at` | `DATETIME` | NULL | - | - | Thời điểm hệ thống đã gửi thông báo nhắc |
| `completed_at` | `DATETIME` | NULL | - | - | Thời điểm đánh dấu hoàn thành |
| `created_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm tạo |
| `updated_at` | `DATETIME` | NOT NULL | - | `utcnow` | Thời điểm sửa đổi |
