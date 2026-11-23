---
title: Cơ Chế Xác Thực & Phân Quyền API
sidebar_label: 🔐 Xác thực & Phân quyền
sidebar_position: 3
---

# Cơ Chế Xác Thực & Phân Quyền API (Authentication & Authorization)

Tài liệu này đặc tả chi tiết cơ chế bảo mật, vòng đời JSON Web Token (JWT) và kiến trúc kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC) áp dụng cho mọi giao dịch API trong Foundation Project.

> Xem thêm chi tiết tại [Kiến Trúc An Ninh Bảo Mật](../03-kien-truc/bao-mat-va-phan-quyen.md).

---

## 1. Chuẩn Xác Thực Bearer Token (JWT RFC 7519)

Hệ thống sử dụng cơ chế xác thực không lưu phiên (Stateless Authentication) dựa trên chuẩn JSON Web Token:

- **Thuật toán mã hóa**: `HS256` (HMAC SHA-256).
- **Khóa ký bí mật**: Cấu hình thông qua biến môi trường `JWT_SECRET_KEY`.
- **Thời hạn hiệu lực**: Cấu hình qua biến `ACCESS_TOKEN_EXPIRE_MINUTES` (mặc định: `60` phút).
- **Cấu trúc Payload Token**:
  ```json
  {
    "sub": "42",
    "exp": 1731580800
  }
  ```
  - `sub`: ID duy nhất của người dùng (`User.id`) dưới dạng chuỗi số.
  - `exp`: Thời điểm hết hạn token tính theo Unix Epoch Timestamp (giây).

---

## 2. Tiêu Chuẩn HTTP Header

Mọi yêu cầu đến các endpoint được bảo vệ (Protected Endpoints) bắt buộc phải đính kèm token trong tiêu đề HTTP:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

**Ví dụ:**
```http
GET /documents/ HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMiIsImV4cCI6MTczMTU4MDg...
```

Nếu thiếu Header hoặc token sai/hết hạn, server phản hồi ngay lập tức với mã lỗi:
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
Content-Type: application/json

{
  "detail": "Không xác thực được người dùng"
}
```

---

## 3. Các Luồng Xác Thực Nghiệp Vụ

### 3.1. Luồng Đăng Ký Tài Khoản (`POST /auth/register`)
- **Yêu cầu**: Không cần token.
- **Request Body**:
  ```json
  {
    "username": "nguyenvana",
    "email": "nguyenvana@school.edu.vn",
    "password": "SecurePassword123!",
    "full_name": "Nguyễn Văn A",
    "role": "student"
  }
  ```
- **Xử lý**:
  - Mã hóa mật khẩu một chiều bằng thuật toán `bcrypt` (độ dài muối mặc định).
  - Kiểm tra tính duy nhất của `username` và `email`.
  - Phản hồi thông tin người dùng mới tạo (loại trừ trường `hashed_password`).

### 3.2. Luồng Đăng Nhập (`POST /auth/login`)
- **Yêu cầu**: Không cần token.
- **Request Body**:
  ```json
  {
    "username": "nguyenvana",
    "password": "SecurePassword123!"
  }
  ```
- **Xử lý**:
  - Tìm kiếm người dùng theo `username` (hoặc `email`).
  - Kiểm tra mật khẩu băm thông qua `pwd_context.verify(password, hashed_password)`.
  - Ký và phát hành access token mới.
- **Phản hồi thành công (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
  }
  ```

### 3.3. Luồng Kiểm Tra Danh Tính Người Dùng Hiện Tại (`GET /auth/me` hoặc `GET /users/me`)
- **Yêu cầu**: Cần Bearer token hợp lệ.
- **Phản hồi**: Toàn bộ thông tin hồ sơ người dùng (`id`, `username`, `email`, `full_name`, `role`, `created_at`, `status`).

---

## 4. Các Tầng Kiểm Soát Quyền Hạn (Authorization)

FastAPI triển khai cơ chế Dependency Injection (`Depends`) tại tầng router để bảo vệ tài nguyên:

### 4.1. `get_current_user` (Bắt Buộc Xác Thực)
```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User: ...
```
- Dùng cho các endpoint cá nhân: upload tài liệu, ghi chú, xem thông báo, quản lý thư mục, quản lý công việc (todos).

### 4.2. `get_optional_user` (Xác Thực Tùy Chọn)
```python
async def get_optional_user(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]: ...
```
- Dùng cho các trang tra cứu công khai (Community Library, Tìm kiếm tài liệu công khai):
  - Khách vãng lai (`current_user = None`): Chỉ xem được tài liệu có `is_public = true`.
  - Người dùng đã đăng nhập: Được bổ sung trạng thái cá nhân hóa (đã yêu thích hay chưa, đã tải hay chưa).

### 4.3. Phân Cấp Vai Trò (Role Hierarchy & Normalization)
Được chuẩn hóa thông qua mô-đun `app/core/roles.py`:

```mermaid
graph TD
    SA["System Admin / School Admin (Cấp 4)"] --> FA["Faculty Admin (Cấp 3)"]
    FA --> TC["Teacher (Cấp 2)"]
    TC --> ST["Student (Cấp 1)"]
```

| Tên vai trò (`role`) | Thứ bậc (`role_rank`) | Quyền hạn tiêu biểu |
| :--- | :--- | :--- |
| `system_admin` / `school_admin` | **4** | Toàn quyền kiểm trị hệ thống, duyệt tài nguyên trên mọi Khoa, quản lý mọi nhóm và tài liệu. |
| `faculty_admin` | **3** | Quản trị tài liệu, chuyên ngành và môn học thuộc phạm vi Khoa phụ trách (`verify_faculty_access`). |
| `teacher` | **2** | Đăng tải học liệu, tạo nhóm lớp học tập, phê duyệt bài tập nhóm. |
| `student` | **1** | Sử dụng kho tài liệu cá nhân, tra cứu thư viện chung, tham gia nhóm được mời. |

### 4.4. Quy Tắc Duyệt Chia Sẻ Tự Động (Auto-Accept Sharing)
Hệ thống sử dụng nguyên lý so sánh thứ bậc:
```python
def is_auto_accept(sender_role: Optional[str], recipient_role: Optional[str]) -> bool:
    return role_rank(sender_role) > role_rank(recipient_role)
```
- Khi Giảng viên (`rank=2`) chia sẻ tài liệu cho Sinh viên (`rank=1`), tài liệu tự động xuất hiện trong kho của sinh viên mà không cần phê duyệt thủ công.
- Khi Sinh viên chia sẻ cho Giảng viên, yêu cầu chia sẻ nằm ở trạng thái `pending` chờ giảng viên xét duyệt.
