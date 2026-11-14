---
title: Danh Mục Ca Kiểm Thử (Test Cases)
sidebar_label: 📋 Danh mục Test Cases
sidebar_position: 4
---

# Danh Mục Ca Kiểm Thử Trọng Yếu (Test Cases Matrix)

Tài liệu này chuẩn hóa các ca kiểm thử (Test Cases) trọng yếu của hệ thống **Foundation Project**, được ánh xạ trực tiếp từ 6 [Use Cases Nghiệp Vụ Cốt Lõi](../requirements/use-cases/README.md) và 10 phân hệ tính năng.

---

## 1. 🔐 Phân Hệ Xác Thực & Danh Tính (Authentication)

### TC-AUTH-01: Đăng ký tài khoản mới hợp lệ
- **Ánh xạ**: Use Case Đăng ký / `routers/auth.py`
- **Điều kiện tiên quyết**: `username` và `email` chưa từng tồn tại trong hệ thống.
- **Các bước thực hiện**:
  1. Gửi `POST /auth/register` với payload `{ "username": "student_test", "email": "student_test@school.edu.vn", "password": "SecurePassword123!", "role": "student" }`.
- **Kết quả kỳ vọng**:
  - Mã phản hồi: `200 OK` hoặc `201 Created`.
  - Body trả về thông tin người dùng có `id`, `username`, `email`.
  - Trường `hashed_password` **không** xuất hiện trong response.
  - Mật khẩu trong DB được mã hóa bằng thuật toán `bcrypt`.
- **Mã kiểm thử tự động**: `backend/tests/test_auth.py::test_register_and_login`.

### TC-AUTH-02: Đăng nhập sai mật khẩu
- **Ánh xạ**: Bảo mật xác thực
- **Điều kiện tiên quyết**: Tài khoản `student_test` đã tồn tại.
- **Các bước thực hiện**:
  1. Gửi `POST /auth/login` với `{ "username": "student_test", "password": "WrongPassword!" }`.
- **Kết quả kỳ vọng**:
  - Mã phản hồi: `401 Unauthorized`.
  - Body chứa thông báo lỗi tiếng Việt: `{"detail": "Sai tên đăng nhập hoặc mật khẩu"}`.

---

## 2. 📄 Phân Hệ Quản Lý Tài Liệu & Lưu Trữ (Documents & Storage)

### TC-DOC-01: Tải lên tài liệu cá nhân thành công
- **Ánh xạ**: [UC01 — Tải Lên & Chống Trùng Lặp](../requirements/use-cases/UC01_UPLOAD_AND_DEDUPLICATION.md)
- **Điều kiện tiên quyết**: Đã đăng nhập, có Bearer token hợp lệ.
- **Các bước thực hiện**:
  1. Gửi `POST /documents/upload` kèm file PDF `giaotrinh_csdl.pdf` và các trường `title="Giáo trình CSDL"`.
- **Kết quả kỳ vọng**:
  - Mã phản hồi: `201 Created` hoặc `200 OK`.
  - Bản ghi `Document` được tạo với `owner_id = current_user.id`, `is_deleted = false`.
  - File được lưu trữ vật lý trên đĩa hoặc Cloudflare R2 với tên file duy nhất (UUID).
- **Mã kiểm thử tự động**: `backend/tests/test_documents.py::test_upload_document`.

### TC-DEDUP-01: Chống nhân bản file lưu trữ bằng mã băm SHA-256
- **Ánh xạ**: [ADR-005 — Cơ Chế Khử Trùng Lặp Lưu Trữ](../system-architecture/adr/ADR-005-SHA256-DEDUPLICATION.md)
- **Điều kiện tiên quyết**: Tệp tin `tailieu_a.pdf` đã được tải lên trước đó.
- **Các bước thực hiện**:
  1. Người dùng thứ hai tải lên một tệp tin khác tên nhưng có nội dung byte hoàn toàn trùng khớp.
- **Kết quả kỳ vọng**:
  - Hệ thống tính toán mã băm SHA-256 của file tải lên và tìm thấy bản ghi có sẵn `file_hash`.
  - Bản ghi mới được tạo cho User 2 nhưng trỏ chung thuộc tính `file_path` tới tệp tin đã lưu.
  - Dung lượng lưu trữ vật lý không bị nhân đôi.
- **Mã kiểm thử tự động**: `backend/tests/test_storage_dedup.py::test_storage_deduplication`.

---

## 3. 🔗 Phân Hệ Chia Sẻ Tài Liệu (Document Sharing & RBAC)

### TC-SHARE-01: Giảng viên chia sẻ tài liệu cho Sinh viên (Tự động duyệt)
- **Ánh xạ**: [UC03 — Cơ Chế Phân Bản & Chia Sẻ](../requirements/use-cases/UC03_DOCUMENT_FORKING_AND_SHARING.md)
- **Điều kiện tiên quyết**: Giảng viên (`role = teacher`, rank=2) sở hữu tài liệu; Sinh viên (`role = student`, rank=1) đã có tài khoản.
- **Các bước thực hiện**:
  1. Giảng viên gọi `POST /shares` với `{ "document_id": 10, "to_user_id": student_id }`.
- **Kết quả kỳ vọng**:
  - Do `role_rank(teacher) > role_rank(student)`, điều kiện `is_auto_accept()` trả về `True`.
  - Bản ghi `document_shares` được tạo với trạng thái ngay lập tức là `accepted`.
  - Sinh viên truy cập `GET /shares/received` thấy tài liệu ngay mà không cần thao tác phê duyệt thủ công.
- **Mã kiểm thử tự động**: `backend/tests/test_shares.py::test_teacher_to_student_auto_accept`.

### TC-SHARE-02: Sinh viên chia sẻ cho Giảng viên (Chờ phê duyệt)
- **Ánh xạ**: [UC03 — Cơ Chế Phân Bản & Chia Sẻ](../requirements/use-cases/UC03_DOCUMENT_FORKING_AND_SHARING.md)
- **Điều kiện tiên quyết**: Sinh viên sở hữu tài liệu bài tập; Giảng viên là người nhận.
- **Các bước thực hiện**:
  1. Sinh viên gọi `POST /shares` gửi tài liệu cho giảng viên.
- **Kết quả kỳ vọng**:
  - Do `role_rank(student) < role_rank(teacher)`, trạng thái chia sẻ là `pending`.
  - Giảng viên nhận thông báo và tài liệu xuất hiện trong danh sách chờ duyệt `GET /shares/pending`.
  - Giảng viên gọi `POST /shares/{id}/accept` để nhận tài liệu hoặc `POST /shares/{id}/reject` để từ chối.
- **Mã kiểm thử tự động**: `backend/tests/test_shares.py::test_student_to_teacher_pending_flow`.

### TC-SHARE-03: Ngăn chặn gửi trùng lặp yêu cầu chia sẻ đang chờ
- **Ánh xạ**: Tính toàn vẹn dữ liệu
- **Điều kiện tiên quyết**: Yêu cầu chia sẻ giữa User A và User B cho Document 10 đang ở trạng thái `pending`.
- **Các bước thực hiện**:
  1. User A cố tình gửi tiếp một yêu cầu chia sẻ nữa cho Document 10 tới User B.
- **Kết quả kỳ vọng**:
  - Mã phản hồi: `400 Bad Request` hoặc `409 Conflict`.
  - Nhờ chỉ mục `uq_document_shares_pending`, CSDL không phát sinh bản ghi rác trùng lặp.
- **Mã kiểm thử tự động**: `backend/tests/test_shares.py::test_duplicate_pending_share_prevented`.

---

## 4. 🔍 Phân Hệ Tìm Kiếm Toàn Văn (Full-Text Search)

### TC-FTS-01: Tìm kiếm toàn văn qua PostgreSQL `tsvector`
- **Ánh xạ**: [UC04 — Tìm Kiếm Toàn Văn & Xem Trước](../requirements/use-cases/UC04_FULLTEXT_SEARCH_AND_PREVIEW.md)
- **Điều kiện tiên quyết**: Tài liệu có tiêu đề *"Nhập môn Trí tuệ Nhân tạo"* và mô tả *"Bài giảng Machine Learning căn bản"*.
- **Các bước thực hiện**:
  1. Gửi truy vấn `GET /search/full?q=machine+learning`.
- **Kết quả kỳ vọng**:
  - Cột `search_vector` tự động khớp với từ khóa qua toán tử `@@ plainto_tsquery()`.
  - Phản hồi trả về tài liệu khớp cùng điểm xếp hạng độ tương đồng `ts_rank`.
- **Mã kiểm thử tự động**: `backend/tests/test_search.py::test_full_text_search`.

---

## 5. 🗑️ Phân Hệ Thùng Rác & Khôi Phục (Trash Lifecycle)

### TC-TRASH-01: Xóa mềm và khôi phục tài liệu
- **Ánh xạ**: [UC05 — Vòng Đời Thùng Rác](../requirements/use-cases/UC05_TRASH_LIFECYCLE_AND_PURGE.md)
- **Các bước thực hiện**:
  1. Gọi `DELETE /documents/{id}` để xóa tài liệu.
  2. Kiểm tra `GET /documents/` (tài liệu biến mất khỏi kho cá nhân).
  3. Kiểm tra `GET /trash/` (tài liệu xuất hiện trong thùng rác, `is_deleted = true`).
  4. Gọi `POST /trash/{id}/restore` để khôi phục.
- **Kết quả kỳ vọng**:
  - Tài liệu trở lại kho cá nhân với `is_deleted = false`, nguyên vẹn toàn bộ tags và notes.
- **Mã kiểm thử tự động**: `backend/tests/test_documents.py::test_soft_delete_and_restore`.

---

## 6. 🏛️ Phân Hệ Thư Viện Cộng Đồng (Community Library)

### TC-LIB-01: Đóng góp học liệu & Cập nhật bộ đếm môn học chính xác
- **Ánh xạ**: [UC02 — Nộp Duyệt & Xuất Bản Thư Viện](../requirements/use-cases/UC02_COMMUNITY_SUBMISSION_AND_APPROVAL.md)
- **Các bước thực hiện**:
  1. Sinh viên nộp tài liệu lên Khoa CNTT, Môn Cấu trúc dữ liệu qua `POST /library/submit`.
  2. Faculty Admin duyệt yêu cầu qua `POST /library/admin/submissions/{id}/approve`.
  3. Gọi `GET /library/faculties/` để kiểm tra `document_count`.
- **Kết quả kỳ vọng**:
  - Tài liệu được đánh dấu `is_public = true`.
  - Bộ đếm `document_count` của Khoa CNTT và Môn Cấu trúc dữ liệu tăng thêm đúng 1 đơn vị.
- **Mã kiểm thử tự động**: `backend/tests/test_library_counts.py::test_library_document_counts`.
