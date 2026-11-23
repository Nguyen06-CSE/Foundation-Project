---
title: Kiến Trúc Bảo Mật & Kiểm Soát Truy Cập (Security & RBAC)
sidebar_label: 🛡️ Bảo mật & Phân quyền
sidebar_position: 6
---

# 🛡️ KIẾN TRÚC BẢO MẬT & KIỂM SOÁT TRUY CẬP (SECURITY & RBAC)

Hệ thống **Foundation Project** áp dụng kiến trúc bảo mật đa tầng nhằm bảo vệ tài sản số của trường đại học, ngăn chặn truy cập trái phép và tuân thủ các nguyên tắc thiết kế an toàn của OWASP.

---

## 1. Cơ Chế Xác Thực Danh Tính (Authentication)

### 1.1. Băm Mật Khẩu với Thuật Toán Bcrypt
- Mật khẩu của người dùng tuyệt đối không bao giờ được lưu trữ dưới dạng văn bản thô (Plaintext).
- Hệ thống sử dụng thư viện `passlib` kết hợp giải thuật **Bcrypt** với hệ số chi phí (Work Factor / Salt Rounds) là `12`.
- Thuật toán Bcrypt tự động bổ sung chuỗi muối ngẫu nhiên (Cryptographic Salt) cho mỗi mật khẩu, vô hiệu hóa hoàn toàn các hình thức tấn công bằng bảng cầu vồng (Rainbow Table).

### 1.2. Xác Thực Phiên Bằng JSON Web Token (JWT)
- Áp dụng chuẩn mở **RFC 7519**.
- Khi người dùng đăng nhập thành công qua `POST /auth/login`, hệ thống trả về mã `access_token` được ký điện tử bằng thuật toán `HS256` với khóa bí mật `SECRET_KEY`.
- Cấu trúc Payload của Token:
  ```json
  {
    "sub": "user_id_123",
    "role": "student",
    "exp": 1735689600
  }
  ```
- Thời hạn sống của Token được cấu hình hợp lý (mặc định 24 giờ cho môi trường phát triển local) để đảm bảo cân bằng giữa tính tiện lợi và an toàn.

---

## 2. Mô Hình Phân Quyền Hai Cấp Độ (Two-Tier Authorization)

Hệ thống kết hợp chặt chẽ giữa **Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC)** và **Kiểm soát truy cập mức đối tượng (Object-Level Access Control)**:

```
[ Request Đến API ] ──► [ Cấp 1: Kiểm Tra RBAC ] ──► [ Cấp 2: Kiểm Tra Object-Level ] ──► [ Thực Thi ]
                        (Admin / Teacher / Student)   (Kiểm tra owner_id, workspace_member)
```

### 2.1. Cấp 1: RBAC Hệ Thống
- Sử dụng hàm phụ thuộc `verify_faculty_access` và `is_admin`:
  - `admin`: Có quyền truy cập các endpoints quản trị (`/library/admin/*`, quản lý danh mục môn học, người dùng).
  - `teacher`: Có quyền phê duyệt các tài liệu nộp vào Khoa/Môn học mà mình giảng dạy.
  - `student`: Quyền sử dụng tiêu chuẩn các chức năng học tập.

### 2.2. Cấp 2: Object-Level Authorization
Ngay cả khi một người dùng có vai trò `student` hợp lệ, họ không được phép xem hoặc xóa tài liệu của sinh viên khác:
- **Tài liệu cá nhân**: Kiểm tra `document.owner_id == current_user.id`.
- **Tài liệu nhóm**: Kiểm tra bản ghi liên kết trong bảng `workspace_members` để xác định người dùng có thuộc nhóm và có vai trò phù hợp (`owner`/`admin`/`member`) hay không.
- **Tài liệu học liệu cộng đồng**: Tài liệu ở trạng thái `pending` chỉ có thể được xem bởi chính người nộp hoặc người duyệt có thẩm quyền.

---

## 3. Phòng Ngừa Các Lỗ Hổng Web Phổ Biến

1. **SQL Injection**: 100% truy vấn dữ liệu được thực hiện thông qua SQLAlchemy ORM với cơ chế Parameterized Queries, loại bỏ hoàn toàn việc ghép chuỗi SQL thủ công.
2. **Cross-Origin Resource Sharing (CORS)**: Cấu hình `CORSMiddleware` chặt chẽ, chỉ cho phép các nguồn gốc được chỉ định rõ trong danh sách `CORS_ORIGINS` (như `http://localhost:5173`).
3. **Cross-Site Scripting (XSS)**: React tự động xử lý ký tự đặc biệt (HTML Entity Escaping) trước khi đưa dữ liệu vào Virtual DOM. Đối với nội dung Markdown, các thẻ HTML nguy hiểm (như `<script>`) bị loại bỏ thông qua trình dựng an toàn.
