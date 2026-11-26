
> [!WARNING] TÀI LIỆU LƯU TRỮ LỊCH SỬ
> Tài liệu này mô tả hạ tầng thử nghiệm điện toán đám mây trước đây (Cloudflare R2, Neon Database, Vercel).
> **Không phản ánh hiện trạng vận hành chính thức của hệ thống.** Hiện trạng đồ án hoạt động 100% trên môi trường Cục bộ (Localhost).
> Vui lòng tham khảo: [Hướng dẫn Localhost](../../02-huong-dan-local/README.md) và [Kiến trúc lưu trữ](../../03-kien-truc/he-thong-luu-tru-tap-tin.md).

---
# Danh Mục Biến Môi Trường (Environment Variables Reference)

Tài liệu này tổng hợp toàn bộ các biến môi trường cần thiết để vận hành và triển khai hệ thống lưu trữ tài liệu Cloudflare R2 trên cả **Backend (FastAPI)** và **Frontend (React/Vite)**.

---

## 1. Biến Môi Trường Backend (FastAPI - `.env` tại thư mục gốc)

File cấu hình được đặt tại: `/Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/.env`

| Tên biến | Kiểu dữ liệu | Bắt buộc | Giá trị mẫu | Mục đích & Mô tả chi tiết |
| :--- | :--- | :---: | :--- | :--- |
| `DATABASE_URL` | String | **Có** | `postgresql+asyncpg://<REDACTED_USER>:<REDACTED_PASSWORD>@<REDACTED_HOST>/<REDACTED_DB>?sslmode=require` | Chuỗi kết nối PostgreSQL bất đồng bộ (asyncpg) tới Neon DB hoặc Postgres server. |
| `SECRET_KEY` | String | **Có** | `your_secret_key_here` | Khóa bí mật dùng để mã hóa và giải mã JWT Access Token. |
| `MINIO_ENDPOINT` | String (URL) | **Có** | `https://<REDACTED_ACCOUNT>.r2.cloudflarestorage.com` | **S3 API Endpoint của Cloudflare R2**. Dùng cho thư viện `boto3` để thực hiện các thao tác PutObject, GetObject, HeadObject. |
| `MINIO_ACCESS_KEY` | String | **Có** | `<REDACTED_R2_ACCESS_KEY>` | Access Key ID của R2 API Token có quyền đọc/ghi trên bucket. |
| `MINIO_SECRET_KEY` | String | **Có** | `<REDACTED_R2_SECRET_KEY>` | Secret Access Key tương ứng của R2 API Token. |
| `MINIO_PUBLIC_URL` | String (URL) | **Có** | `https://<REDACTED_PUBLIC_DOMAIN>` | **Tên miền Public CDN** của Bucket. Backend dùng biến này trong `get_file_url()` để chuyển đổi key tương đối thành Full URL gửi về cho Client. |
| `BUCKET_NAME` | String | **Có** | `elibrary-bucket` | Tên Bucket đã tạo trên Cloudflare R2 (Mặc định: `elibrary-bucket`). |

> [!WARNING]
> Phân biệt rõ giữa `MINIO_ENDPOINT` và `MINIO_PUBLIC_URL`:
> - `MINIO_ENDPOINT` là địa chỉ giao thức S3 dành cho Backend gọi ngầm (dạng `*.r2.cloudflarestorage.com`). Không được đưa URL này cho trình duyệt người dùng!
> - `MINIO_PUBLIC_URL` là domain phân phối công khai qua CDN (dạng `https://pub-xxx.r2.dev` hoặc custom domain `https://cdn.domain.com`).

---

## 2. Biến Môi Trường Frontend (React/Vite - `.env` tại thư mục frontend)

File cấu hình được đặt tại: `/Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/.env`

| Tên biến | Kiểu dữ liệu | Bắt buộc | Giá trị mẫu | Mục đích & Mô tả chi tiết |
| :--- | :--- | :---: | :--- | :--- |
| `VITE_API_URL` | String (URL) | **Có** | `https://<REDACTED_API_DOMAIN>` | URL gốc của Backend FastAPI API. Mọi request qua Axios `api.ts` sẽ kết nối tới URL này. |
| `VITE_R2_PUBLIC_URL` | String (URL) | **Có** | `https://<REDACTED_PUBLIC_DOMAIN>` | Tên miền Public CDN của Cloudflare R2. Dùng trong helper `getFullFileUrl()` để giải quyết fallback khi nhận đường dẫn tương đối. |

> [!IMPORTANT]
> Tất cả biến môi trường trong Vite **bắt buộc phải có tiền tố `VITE_`** ở đầu tên biến để Vite có thể nhúng vào bundle lúc build client-side (`import.meta.env.VITE_...`).

---

## 3. Các Lỗi Thường Gặp Về Cấu Hình (Common Pitfalls)

1. **Dấu gạch chéo cuối URL (Trailing Slash)**:
   - Sai: `MINIO_PUBLIC_URL=https://pub-xxx.r2.dev/` $\rightarrow$ Dễ dẫn đến URL bị lặp double slash: `https://pub-xxx.r2.dev//storage/6/...`
   - Đúng: `MINIO_PUBLIC_URL=https://pub-xxx.r2.dev` (Các hàm `get_file_url` và `getFullFileUrl` đều đã có cơ chế tự động `.rstrip('/')`, tuy nhiên chuẩn cấu hình nên bỏ dấu slash cuối).

2. **Thiếu tiền tố giao thức `https://`**:
   - Nếu để `MINIO_PUBLIC_URL=pub-xxx.r2.dev`, trình duyệt client sẽ hiểu nhầm đây là đường dẫn tương đối và tự động ghép thành `http://localhost:5173/pub-xxx.r2.dev/...` dẫn đến lỗi 404!

3. **Môi trường kết nối mạng nội bộ / Tailscale VPN**:
   - Khi phát triển qua mạng Tailscale hoặc mạng LAN, hãy đảm bảo `VITE_API_URL` phản ánh đúng IP/MagicDNS máy chủ và Backend `CORSMiddleware` trong [`main.py`](../../../backend/app/main.py) đã thêm domain đó vào `allow_origins`.

---

## 4. File Mẫu Môi Trường Hoàn Chỉnh

### Backend `.env` Mẫu:
```bash
# ==========================================
# CƠ SỞ DỮ LIỆU & BẢO MẬT
# ==========================================
DATABASE_URL= postgresql+asyncpg://<REDACTED_USER>:<REDACTED_PASSWORD>@<REDACTED_HOST>/<REDACTED_DB>?sslmode=require
SECRET_KEY=your_secret_key_here

# ==========================================
# CLOUDFLARE R2 (S3 COMPATIBLE STORAGE)
# ==========================================
MINIO_ENDPOINT= https://<REDACTED_ACCOUNT>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY= <REDACTED_R2_ACCESS_KEY>
MINIO_SECRET_KEY= <REDACTED_R2_SECRET_KEY>
MINIO_PUBLIC_URL= https://<REDACTED_PUBLIC_DOMAIN>
BUCKET_NAME=elibrary-bucket
```

### Frontend `.env` Mẫu:
```bash
# URL Backend API
VITE_API_URL= https://<REDACTED_API_DOMAIN>

# Public CDN của Cloudflare R2
VITE_R2_PUBLIC_URL= https://<REDACTED_PUBLIC_DOMAIN>
```
