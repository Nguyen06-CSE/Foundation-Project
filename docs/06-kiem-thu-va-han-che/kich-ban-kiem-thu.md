---
title: Ma Trận Ca Kiểm Thử Trọng Yếu (Test Cases Matrix)
sidebar_label: 📑 Ma trận Test Cases
sidebar_position: 3
---

# 📑 MA TRẬN CA KIỂM THỬ TRỌNG YẾU (TEST CASES MATRIX)

Tài liệu này tổng hợp các ca kiểm thử then chốt của hệ thống, được ánh xạ trực tiếp từ các luồng nghiệp vụ cốt lõi và các tệp kiểm thử tự động trong `backend/tests/`.

---

## 1. 🔐 Phân Hệ Xác Thực & Phân Quyền (Authentication & RBAC)

### TC-AUTH-01: Đăng ký tài khoản mới hợp lệ
- **Mục tiêu**: Xác minh việc tạo tài khoản, băm mật khẩu `bcrypt` và không làm lộ mật khẩu thô trong response.
- **Dữ liệu đầu vào**: `POST /auth/register` với `{ username: "sv_test", email: "sv_test@edu.vn", password: "Password123!", role: "student" }`.
- **Kết quả kỳ vọng**: HTTP 201 Created; trường `hashed_password` không xuất hiện; bản ghi trong CSDL có mật khẩu được mã hóa.

### TC-AUTH-02: Đăng nhập sai mật khẩu
- **Mục tiêu**: Kiểm tra phản hồi bảo mật khi nhập sai thông tin xác thực.
- **Dữ liệu đầu vào**: `POST /auth/login` với mật khẩu không chính xác.
- **Kết quả kỳ vọng**: HTTP 401 Unauthorized; thông báo lỗi tiếng Việt thân thiện.

---

## 2. 📦 Phân Hệ Lưu Trữ & Khử Trùng Lặp (Storage & Deduplication)

### TC-STOR-01: Tải lên tệp tin hợp lệ lần đầu
- **Mục tiêu**: Tệp tin được ghi vào thư mục đĩa cứng `backend/storage/{owner_id}/`, mã checksum SHA-256 được lưu vào CSDL.
- **Dữ liệu đầu vào**: `POST /documents/upload` kèm tệp `tailieu.pdf`.
- **Kết quả kỳ vọng**: HTTP 201 Created; tệp vật lý xuất hiện trên ổ đĩa; bản ghi `documents` lưu chính xác `checksum`.

### TC-STOR-02: Tải lên tệp tin trùng lặp nội dung byte-for-byte
- **Mục tiêu**: Xác thực cơ chế khử trùng lặp (Single Instance Storage).
- **Các bước thực hiện**:
  1. Người dùng A tải lên tệp `sample.pdf` (checksum: `abcd...1234`).
  2. Người dùng A tải lên tiếp một tệp khác có nội dung giống hệt nhưng đổi tên thành `copy.pdf`.
- **Kết quả kỳ vọng**:
  - Không có thêm bất kỳ tệp vật lý mới nào được tạo trên đĩa cứng.
  - Cả 2 bản ghi trong bảng `documents` đều trỏ chung vào cùng một `file_path`.
  - Checksum của 2 bản ghi hoàn toàn giống nhau.

---

## 3. 👥 Phân Hệ Không Gian Làm Việc Nhóm (Workspaces)

### TC-WS-01: Thành viên thường không được kích hoạt giải thể nhóm
- **Mục tiêu**: Xác minh quyền hạn của vai trò `member` trong không gian làm việc.
- **Dữ liệu đầu vào**: Người dùng có `role = 'member'` gửi `POST /workspaces/{id}/dissolve`.
- **Kết quả kỳ vọng**: HTTP 403 Forbidden ("Chỉ Trưởng nhóm mới có quyền giải thể").

### TC-WS-02: Trưởng nhóm kích hoạt giải thể thành công
- **Dữ liệu đầu vào**: Người dùng có `role = 'owner'` gửi `POST /workspaces/{id}/dissolve`.
- **Kết quả kỳ vọng**: HTTP 200 OK; trường `is_dissolving = true` và `dissolve_at = now() + 7 days`.

---

## 4. 🏛️ Phân Hệ Kho Học Liệu Số (Community Library)

### TC-LIB-01: Sinh viên nộp tài liệu vào hàng đợi kiểm duyệt
- **Dữ liệu đầu vào**: `POST /library/submit` với `source_document_id = 10`, `subject_id = 5`.
- **Kết quả kỳ vọng**: HTTP 201 Created; bản ghi `community_submissions` được tạo với `status = 'pending'`.

### TC-LIB-02: Quản trị viên phê duyệt hồ sơ học liệu
- **Dữ liệu đầu vào**: Admin gửi `POST /library/admin/submissions/{id}/approve`.
- **Kết quả kỳ vọng**:
  - `community_submissions.status` chuyển thành `approved`.
  - Một bản ghi `documents` mới được tạo với `is_community_shared = true`.
  - Người nộp nhận được thông báo chúc mừng qua hệ thống Notification.

---

## 5. 🔍 Phân Hệ Tìm Kiếm Toàn Văn (Full-Text Search)

### TC-SRCH-01: Tìm kiếm từ khóa tiếng Việt không dấu
- **Mục tiêu**: Tìm kiếm tài liệu có tiêu đề "Cơ sở dữ liệu" bằng từ khóa "co so du lieu".
- **Dữ liệu đầu vào**: `GET /documents/search?q=co so du lieu`.
- **Kết quả kỳ vọng**: Tài liệu "Cơ sở dữ liệu" xuất hiện trong danh sách kết quả nhờ cấu hình FTS `'simple'`; độ trễ truy vấn < 100ms.
