# TÀI LIỆU KỸ THUẬT: BỔ SUNG TÍNH NĂNG QUẢN LÝ KHOA & MÔN HỌC (COMMUNITY LIBRARY ADMIN)

**Vị trí tài liệu:** `docs/feat/community-library/management-extension.md`

---

## 1. Tổng quan (Overview)

Tính năng mở rộng cho phép ban quản trị quản lý danh mục phân cấp Khoa (**Faculties**) và Môn học (**Subjects**) nhằm phục vụ cho việc phân loại tài liệu trong Kho học liệu cộng đồng.

---

## 2. Phân quyền và Quy tắc nghiệp vụ (RBAC & Business Rules)

### 2.1. Nhóm Admin Hệ thống (`sysadmin`, `schooladmin`, `system_admin`, `school_admin`)
- **Thêm / Sửa Khoa:** Toàn quyền thêm Khoa mới hoặc sửa thông tin Khoa hiện có.
- **Thêm / Sửa / Xóa Môn học:** Toàn quyền quản lý Môn học thuộc tất cả các Khoa trong hệ thống.

### 2.2. Nhóm Admin Khoa (`faculty_admin` / Role theo Khoa)
- **Xác định Khoa quản lý:** Hệ thống lấy prefix của email đằng trước ký tự `@` (Ví dụ: email `cntt@school.edu.vn` $\rightarrow$ Mã khoa là `cntt`).
- **Phân quyền thao tác:**
  - **Xem danh sách Khoa:** Xem được tất cả các Khoa, nhưng chỉ được chọn/thao tác trên Khoa mà mình quản lý.
  - **Thêm / Sửa / Xóa Môn học:** Chỉ được thực hiện thao tác Thêm, Sửa, Xóa trực tiếp trên các Môn học thuộc Khoa được phân quyền.
  - **Xóa Môn học:** Thực hiện Hard Delete trực tiếp thông tin Môn học trong bảng `subjects` của DB.

---

## 3. Kiến trúc Backend (Backend Implementation)

### 3.1. Schemas (`backend/app/schemas/library.py`)

```python
from pydantic import BaseModel
from typing import Optional

# --- Faculty Schemas ---
class FacultyCreate(BaseModel):
    code: str        # Ví dụ: "cntt", "kt"
    name: str        # Ví dụ: "Khoa Công nghệ thông tin"
    description: Optional[str] = None

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    faculty_id: int
    code: str        # Ví dụ: "CSDL", "CTDL"
    name: str        # Ví dụ: "Cơ sở dữ liệu"
    description: Optional[str] = None

class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
```

### 3.2. Authorization Dependency (`backend/app/core/dependencies.py`)

```python
from fastapi import HTTPException, status

def verify_faculty_access(current_user: User, faculty_code: str) -> bool:
    """
    Kiểm tra quyền quản lý dựa trên role và email prefix.
    """
    user_role = str(current_user.role).lower().strip()
    target_faculty_code = faculty_code.lower().strip()

    # Admin hệ thống -> Toàn quyền
    if user_role in ["sysadmin", "schooladmin", "system_admin", "school_admin"]:
        return True

    # Admin Khoa -> Kiểm tra prefix email
    if user_role == "faculty_admin":
        email_prefix = current_user.email.split("@")[0].lower().strip()
        if email_prefix == target_faculty_code:
            return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Tài khoản '{current_user.username}' không có quyền quản lý Khoa/Môn học '{faculty_code}'"
    )
```

### 3.3. API Endpoints (`backend/app/routers/library.py`)

| Method | Endpoint | Mô tả | Chi tiết Quyền |
| :--- | :--- | :--- | :--- |
| `POST` | `/library/admin/faculties/` | Tạo Khoa mới | `sysadmin`, `schooladmin` |
| `PUT` | `/library/admin/faculties/{id}` | Cập nhật Khoa | `sysadmin`, `schooladmin` |
| `POST` | `/library/admin/subjects/` | Tạo Môn học mới | Admin hệ thống hoặc Admin Khoa tương ứng |
| `PUT` | `/library/admin/subjects/{id}` | Cập nhật Môn học | Admin hệ thống hoặc Admin Khoa tương ứng |
| `DELETE` | `/library/admin/subjects/{id}` | Xóa Môn học | Admin hệ thống hoặc Admin Khoa tương ứng |

---

## 4. Giao diện Frontend (Frontend Implementation)

### 4.1. Cấu trúc trang Admin Thư viện (`src/pages/library/admin/`)
- `LibraryAdmin.tsx`: Trang HUB tổng quan điều hướng giữa Duyệt bài và Quản lý Cấu trúc.
- `LibraryAdminSubmissions.tsx`: Trang phê duyệt tài liệu đóng góp từ sinh viên/giảng viên.
- `LibraryAdminStructure.tsx`: Trang quản lý giao diện master-detail (Cột trái: Danh sách Khoa; Cột phải: Danh sách Môn học kèm nút Thêm/Sửa/Xóa).

### 4.2. State Management & Authentication (`src/stores/authStore.ts`)
Frontend sử dụng Zustand Store (`useAuthStore`) để lưu trữ thông tin đăng nhập và phân quyền hiển thị:
- Kiểm tra `isSystemAdmin` để bật nút "Thêm Khoa".
- Tự động lấy `assignedFacultyCode` từ `user.email` để highlight và mở khóa quyền thao tác trên Khoa tương ứng.

---

## 5. Hướng dẫn Kiểm thử & Debug (Testing & Troubleshooting)

### 5.1. Các bước kiểm thử thủ công (Manual Testing)

1. **Test Role SysAdmin (`sysadmin` / `schooladmin`):**
   - Đăng nhập $\rightarrow$ Truy cập `/library/admin/structure`.
   - Kiểm tra nút "Thêm Khoa" xuất hiện ở góc trên bên phải.
   - Chuyển đổi qua lại giữa các Khoa khác nhau và thực hiện Thêm/Sửa/Xóa Môn học.

2. **Test Role Faculty Admin (`faculty_admin`):**
   - Đăng nhập tài khoản dạng `cntt@school.edu.vn`.
   - Kiểm tra hệ thống tự động chọn Khoa Công nghệ thông tin.
   - Nút "Thêm Môn học" và icon Sửa/Xóa hiển thị bình thường ở Khoa CNTT.
   - Thử chọn sang Khoa khác: Nút thao tác bị ẩn/vô hiệu hóa.

### 5.2. Debug nhanh qua F12 DevTools
- **Kiểm tra thông tin User:** F12 $\rightarrow$ Tab **Application** $\rightarrow$ **Local Storage** $\rightarrow$ kiểm tra key `auth-storage`.
- **Kiểm tra API Payload:** F12 $\rightarrow$ Tab **Network** $\rightarrow$ lọc `faculties/` hoặc `subjects/` $\rightarrow$ kiểm tra mã code trả về để đảm bảo trùng khớp giữa email prefix và mã Khoa trong CSDL.