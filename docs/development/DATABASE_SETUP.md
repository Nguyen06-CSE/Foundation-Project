---
id: DATABASE_SETUP
title: Thiết Lập Cơ Sở Dữ Liệu
sidebar_position: 4
---

# 🗄️ Thiết Lập & Khởi Tạo Cơ Sở Dữ Liệu (Database Setup & Seeding)

Tài liệu này hướng dẫn chi tiết quy trình khởi tạo cơ sở dữ liệu PostgreSQL, áp dụng các bản di chuyển lược đồ (Migrations) qua Alembic, cấu hình bộ chỉ mục tìm kiếm toàn văn, và nạp tập dữ liệu mẫu phục vụ kiểm thử.

---

## 1. Khởi Tạo Cơ Sở Dữ Liệu PostgreSQL

Đảm bảo dịch vụ PostgreSQL đang chạy (trên cổng mặc định `5432`) và tạo database có tên `elibrary`:

### Cách 1: Khởi tạo nhanh bằng Docker (Khuyến nghị)
```bash
docker run --name elibrary-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=elibrary \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### Cách 2: Khởi tạo bằng công cụ dòng lệnh psql
```bash
psql -U postgres -h localhost -c "CREATE DATABASE elibrary;"
```

---

## 2. Áp Dụng Di Chuyển Lược Đồ Bằng Alembic (Database Migrations)

Hệ thống sử dụng **Alembic** để quản lý lịch sử cấu trúc các bảng. Cấu hình tại [alembic/env.py](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/alembic/env.py) tự động liên kết với `AsyncEngine` của SQLAlchemy:

```bash
# Kích hoạt môi trường ảo
source .venv/bin/activate

# Chạy toàn bộ các bản migration lên phiên bản mới nhất
alembic upgrade head
```

*Sau khi lệnh hoàn tất, toàn bộ 20 bảng thực thể (`users`, `documents`, `workspaces`, `community_submissions`,...) sẽ được khởi tạo đầy đủ.*

---

## 3. Cấu Hình Tìm Kiếm Toàn Văn (Full-Text Search Trigger)

Hệ thống cần cấu hình bộ tạo chỉ mục `search_vector` trên bảng `documents`. Chạy script tiện ích có sẵn:

```bash
python backend/apply_fts.py
```

*Script này sẽ tự động tạo chỉ mục GIN `ix_documents_search_vector` và kích hoạt hàm cập nhật trọng số từ khóa trong PostgreSQL.*

---

## 4. Nạp Dữ Liệu Mẫu Phục Vụ Kiểm Thử (Seeding Data)

Để có sẵn danh mục Khoa, Môn học, tài khoản và tài liệu mẫu phục vụ việc kiểm thử giao diện và bảo vệ đồ án:

### 4.1. Nạp Dữ Liệu Nền Tảng (Faculties, Subjects & Admin Users)
```bash
python backend/db/seed.py
```
*Script sẽ tự động khởi tạo 15 Khoa/Viện đào tạo, các môn học cơ sở ngành, và các tài khoản mẫu.*

### 4.2. Nạp Bổ Sung Dữ Liệu Tài Liệu Mẫu (Incremental Seeding)
```bash
python backend/db/seed_incremental.py
```

---

## 5. Bảng Danh Mục Tài Khoản Kiểm Thử Mặc Định

Sau khi nạp seed data thành công, bạn có thể đăng nhập bằng các tài khoản mẫu với mật khẩu mặc định là **`12345678`**:

| Tên đăng nhập | Vai trò (`role`) | Thẩm quyền thực tế | Ngữ cảnh kiểm thử |
|---|:---:|---|---|
| **`nguyen`** | `student` | Sinh viên Khoa CNTT, sở hữu kho cá nhân, tham gia nhóm | Kiểm thử giao diện cá nhân, upload file, xem trước, làm việc nhóm. |
| **`admin_cntt`** | `faculty_admin` | Quản trị viên Khoa Công Nghệ Thông Tin | Kiểm thử Dashboard xét duyệt học liệu đóng góp thuộc Khoa CNTT. |
| **`admin`** | `system_admin` | Quản trị viên toàn hệ thống | Quản trị người dùng, tạo khoa mới, duyệt mọi học liệu. |
| **`giangvien01`** | `lecturer` | Giảng viên bộ môn | Phát tài liệu lớp học, đóng góp học liệu mẫu. |

---

## 6. Quy Trình Reset Dữ Liệu (Làm Sạch Môi Trường)

Trong quá trình phát triển, nếu bạn muốn đưa cơ sở dữ liệu về trạng thái ban đầu sạch sẽ:

```bash
# Hạ cấp toàn bộ bảng về ban đầu
alembic downgrade base

# Nâng cấp lại và nạp seed data mới
alembic upgrade head
python backend/apply_fts.py
python backend/db/seed.py
```
*(Hoặc xóa container Docker cũ và khởi tạo container mới).*
