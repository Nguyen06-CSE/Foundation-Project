---
id: ENVIRONMENT_VARIABLES
title: Chuẩn Hóa Biến Môi Trường
sidebar_position: 3
---

# 🔑 Chuẩn Hóa Biến Môi Trường (Environment Variables Reference)

Tài liệu này là **nguồn tham chiếu chuẩn duy nhất** quy định toàn bộ danh mục, ý nghĩa, giá trị mặc định và cách cấu hình các biến môi trường cho cả hai phân hệ Backend và Frontend.

---

## 1. Danh Mục Biến Môi Trường Máy Chủ (Backend `.env`)

File cấu hình `.env` được đặt tại **thư mục gốc của repository** (`Foundation-Project/.env`). Lớp cấu hình `backend/app/core/config.py` tự động đọc file này khi máy chủ khởi động:

| Tên biến | Bắt buộc | Giá trị mặc định | Giải thích ý nghĩa & Ngữ cảnh sử dụng |
|---|:---:|:---:|---|
| **`DATABASE_URL`** | **Có** | *Không có* | Chuỗi kết nối cơ sở dữ liệu PostgreSQL qua driver bất đồng bộ `asyncpg`. Cú pháp: `postgresql+asyncpg://<user>:<password>@<host>:<port>/<dbname>`. |
| **`SECRET_KEY`** | **Có** | *Không có* | Khóa bí mật dùng để ký và giải mã JWT Access Token (HS256). Khuyến nghị dùng chuỗi ngẫu nhiên dài từ 32 ký tự trở lên. |
| **`STORAGE_BACKEND`** | Không | `"local"` | Chế độ lưu trữ tệp tin: `"local"` (ghi vào thư mục `backend/storage/`) hoặc `"r2"` (sử dụng Cloudflare R2 Object Storage). |
| **`STORAGE_QUOTA_BYTES`** | Không | `16106127360` (15 GB) | Hạn mức dung lượng lưu trữ tối đa của toàn hệ thống (tính bằng bytes). |
| **`MINIO_ENDPOINT`** | Tùy chọn | `None` | URL S3 Endpoint của Cloudflare R2. Định dạng: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. (Chỉ cần khi `STORAGE_BACKEND=r2`). |
| **`MINIO_ACCESS_KEY`** | Tùy chọn | `None` | R2 Access Key ID được tạo từ bảng điều khiển Cloudflare R2. |
| **`MINIO_SECRET_KEY`** | Tùy chọn | `None` | R2 Secret Access Key tương ứng. |
| **`MINIO_PUBLIC_URL`** | Tùy chọn | `None` | Đường dẫn CDN Public Bucket của R2 để Client tải trực tiếp (Ví dụ: `https://pub-xxxx.r2.dev`). |
| **`BUCKET_NAME`** | Không | `"elibrary-bucket"` | Tên Bucket lưu trữ trên Cloudflare R2. |

---

## 2. Danh Mục Biến Môi Trường Giao Diện (Frontend `.env`)

File cấu hình được đặt tại `frontend/digital-library/.env`:

| Tên biến | Bắt buộc | Giá trị mặc định | Ý nghĩa & Cách dùng |
|---|:---:|:---:|---|
| **`VITE_API_URL`** | Không | `http://localhost:8000` | Địa chỉ URL gốc của máy chủ FastAPI Backend để Frontend gửi các REST API request. |

---

## 3. Cấu Hình Mẫu Cho Hai Chế Độ Vận Hành

### 3.1. Cấu hình Mẫu Chế Độ Cục Bộ (Localhost / Offline 100%)
> *Sử dụng khi phát triển, test trên máy tính cá nhân hoặc đi chấm bài không có mạng:*

```bash
# File: .env (tại thư mục gốc)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/elibrary
SECRET_KEY=dev_secret_key_2026_foundation_project_offline_only
STORAGE_BACKEND=local
STORAGE_QUOTA_BYTES=16106127360
```

### 3.2. Cấu hình Mẫu Chế Độ Đám Mây (Cloud Production)
> *Sử dụng khi triển khai cho toàn trường trên Cloudflare R2 + Cloud DB:*

```bash
# File: .env (tại thư mục gốc)
DATABASE_URL=postgresql+asyncpg://db_user:StrongPassword@ep-cool-db.us-east-2.aws.neon.tech/elibrary?sslmode=require
SECRET_KEY=prod_super_secret_key_change_me_in_real_deployment_9988
STORAGE_BACKEND=r2
STORAGE_QUOTA_BYTES=107374182400

# Cloudflare R2 Credentials
MINIO_ENDPOINT=https://a1b2c3d4e5f6g7h8i9j0.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=your_r2_access_key_id
MINIO_SECRET_KEY=your_r2_secret_access_key
MINIO_PUBLIC_URL=https://pub-your-bucket-id.r2.dev
BUCKET_NAME=elibrary-bucket
```

---

## 4. Cảnh Báo An Toàn Tuyệt Đối (Security Rule)
> [!CAUTION]
> **Tuyệt đối không commit file `.env` lên GitHub!**  
> File `.env` chứa mật khẩu cơ sở dữ liệu và khóa bí mật R2. Hãy đảm bảo `.env` luôn nằm trong danh mục `.gitignore`. Khi chia sẻ mã nguồn cho đồng đội, chỉ gửi file mẫu `.env.example`.
