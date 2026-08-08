# 📚 Digital Library — Ứng dụng Thư viện số Quản lý Tài liệu

Ứng dụng desktop quản lý thư viện số / tài liệu học tập, xây dựng trên nền tảng **PostgreSQL**, đóng gói toàn bộ bằng **Docker** để triển khai chỉ với một lệnh `docker compose up`. Đồ án môn học *Đồ án Cơ sở* — Khoa Công nghệ Thông tin, Trường Đại học Đà Lạt.

---

## 🎯 Giới thiệu

Dự án tập trung tìm hiểu và khai thác các tính năng nâng cao của **PostgreSQL** (full-text search, JSONB, trigger/function, chỉ mục GIN/GiST, Row-Level Security) để xây dựng một hệ thống thư viện số thực tế: upload, tìm kiếm, phân loại, xem và tải tài liệu, quản lý theo môn học / chuyên mục / loại file, cùng cơ chế phân quyền truy cập chi tiết.

Ứng dụng hướng tới sinh viên và giảng viên trong phạm vi một trường/khoa, có thể triển khai nhanh, dễ bảo trì và mở rộng.

---

## ✨ Tính năng chính

- **Quản lý tài liệu**: upload, xem, tải xuống, chỉnh sửa metadata (tên, tác giả, môn học, chuyên mục, loại file...).
- **Tìm kiếm nâng cao**: full-text search hỗ trợ tiếng Việt có dấu/không dấu (`unaccent`, `pg_trgm`), tìm kiếm mờ khi gõ sai chính tả.
- **Phân loại tài liệu**: theo môn học, chuyên mục (danh mục có phân cấp), loại file (PDF, DOCX, PPTX...).
- **Phân quyền truy cập**: quản lý theo vai trò người dùng (admin / giảng viên / sinh viên), áp dụng **Row-Level Security** ở tầng cơ sở dữ liệu.
- **Thống kê**: tài liệu được tải nhiều nhất theo môn học, sử dụng materialized view để tối ưu truy vấn.
- **Đánh dấu tài liệu quan trọng / yêu thích**.
- **Quản trị hệ thống**: quản lý người dùng, môn học, chuyên mục qua giao diện admin.
- **Đóng gói Docker**: toàn bộ hệ thống (database, backend, frontend, pgAdmin) chạy trong container, triển khai bằng `docker compose`.

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend** | FastAPI + Swagger (OpenAPI docs tự sinh) |
| **Database** | PostgreSQL (chạy trong container Docker) |
| **Quản trị DB** | pgAdmin 4 |
| **Thiết kế UI/UX** | Figma |
| **Đóng gói & triển khai** | Docker, Docker Compose, Docker Hub |
| **Kiểm thử** | Postman, pytest |
| **Môi trường phát triển** | Visual Studio Code |
| **Quản lý mã nguồn** | Git, GitHub |

---

## 🐘 Trọng tâm PostgreSQL

Đây là phần cốt lõi của đồ án — không chỉ dùng PostgreSQL như một CSDL quan hệ thông thường mà khai thác các tính năng đặc trưng:

- **Full-text search**: `tsvector` / `tsquery`, kết hợp extension `unaccent` và `pg_trgm` để tìm kiếm tiếng Việt chính xác và chịu lỗi gõ.
- **Chỉ mục GIN/GiST**: tối ưu tốc độ tìm kiếm văn bản, có benchmark so sánh hiệu năng truy vấn có/không có index.
- **JSONB**: lưu metadata tài liệu linh hoạt (tác giả, số trang, năm xuất bản, tags...) mà không cần thay đổi schema.
- **Trigger & PL/pgSQL function**: tự động cập nhật `search_vector` khi thêm/sửa tài liệu, tự động ghi log khi thay đổi quyền truy cập.
- **View / Materialized View**: thống kê tài liệu được tải nhiều theo môn học.
- **Row-Level Security (RLS)**: thực thi quyền truy cập tài liệu ngay ở tầng cơ sở dữ liệu.

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Frontend   │ ───► │   Backend    │ ───► │  PostgreSQL  │
│  React+Vite │ HTTP │   FastAPI    │ SQL  │   Database   │
└─────────────┘      └──────────────┘      └──────────────┘
                                                    ▲
                                             ┌──────────────┐
                                             │   pgAdmin 4  │
                                             └──────────────┘
        Tất cả chạy trong Docker Compose, mạng nội bộ riêng
```

- **File tài liệu**: lưu trong Docker volume (local storage), đường dẫn lưu trong PostgreSQL.
- **Kiến trúc dễ mở rộng**: có thể thay thế lưu trữ file local bằng MinIO (S3-compatible) hoặc cloud storage mà không ảnh hưởng logic ứng dụng.

---

## 📂 Cấu trúc thư mục (dự kiến)

```
.
├── backend/            # FastAPI app
│   ├── app/
│   │   ├── api/         # Các route/endpoint
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── main.py
│   ├── tests/            # pytest
│   └── Dockerfile
├── frontend/           # React + Vite app
│   ├── src/
│   └── Dockerfile
├── database/
│   ├── init/             # Script khởi tạo schema, seed data
│   └── migrations/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu
- [Docker](https://www.docker.com/) và Docker Compose đã cài đặt.

### Chạy nhanh với Docker Compose

```bash
# Clone repo
git clone https://github.com/Nguyen06-CSE/Foundation-Project.git


# Tạo file .env từ mẫu
cp .env.example .env

# Khởi chạy toàn bộ hệ thống
docker compose up -d
```

Sau khi khởi chạy:

| Dịch vụ | Địa chỉ |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API (Swagger) | http://localhost:8000/docs |
| pgAdmin | http://localhost:5051 |

<!-- ### Chạy từ Docker Hub (không cần clone source)

```bash
docker pull <docker-hub-username>/digital-library:latest
docker compose up -d
``` -->

---

## 🗄️ Thiết kế cơ sở dữ liệu (tóm tắt)

| Bảng | Mô tả |
|---|---|
| `users` | Thông tin người dùng, vai trò (role) |
| `subjects` | Danh sách môn học |
| `categories` | Chuyên mục tài liệu (có phân cấp `parent_id`) |
| `documents` | Tài liệu: tiêu đề, đường dẫn file, loại file, `metadata JSONB`, `search_vector` |
| `document_versions` | Lịch sử phiên bản tài liệu |
| `document_permissions` | Phân quyền truy cập tài liệu theo người dùng/vai trò |
| `tags`, `document_tags` | Gắn thẻ tài liệu (many-to-many) |
| `download_logs` | Nhật ký tải xuống / truy cập tài liệu |

*(Sơ đồ ERD chi tiết xem tại `docs/erd.png` hoặc thư mục `database/`)*

---

## 👥 Thành viên thực hiện

| Họ và tên | MSSV | Lớp |
|---|---|---|
| Cao Khôi Nguyên | 2411887 | CTK48B |
| Ngô Quyền Linh | 2411871 | CTK48B |
| Lưu Ngọc Bạch | 2411810 | CTK48B |

**Giáo viên hướng dẫn:** Ks. Nguyễn Trọng Hiếu
**Đơn vị:** Khoa Công nghệ Thông tin — Trường Đại học Đà Lạt

---

## 📌 Hướng phát triển mở rộng

- Tích hợp OCR để trích xuất nội dung văn bản từ file scan, phục vụ full-text search.
- Lưu trữ file qua MinIO (S3-compatible) hoặc tích hợp Google Drive cá nhân người dùng.
- Đăng nhập qua SSO / OAuth.
- Ứng dụng di động (mobile).
- Partitioning bảng log theo thời gian cho hệ thống quy mô lớn.

---

## 📄 Giấy phép

Dự án phục vụ mục đích học tập — Đồ án Cơ sở, Khoa Công nghệ Thông tin, Trường Đại học Đà Lạt.