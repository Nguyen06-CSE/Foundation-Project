---
id: ENVIRONMENT_CONFIGURATION
title: Cấu Hình Theo Môi Trường
sidebar_position: 3
---

# 🌐 Cấu Hình Theo Từng Môi Trường (Environment Configuration)

Tài liệu này giải thích chiến lược quản trị cấu hình theo từng môi trường triển khai (**Local Development**, **Staging**, và **Production**), cách bảo vệ bí mật hệ thống và quy tắc chuyển đổi giữa các môi trường.

> 📚 *Để tra cứu danh mục, kiểu dữ liệu và mô tả chi tiết của từng biến đơn lẻ, vui lòng xem:  
> 👉 [Chuẩn Hóa Biến Môi Trường (docs/development/ENVIRONMENT_VARIABLES.md)](../development/ENVIRONMENT_VARIABLES.md).*

---

## 1. Ma Trận Cấu Hình Theo Từng Môi Trường (Environment Matrix)

```mermaid
graph LR
    subgraph Local["1. Local Development"]
        L_DB["PostgreSQL Cục Bộ (localhost:5432)"]
        L_Store["Local Filesystem (storage/ temp)"]
        L_CORS["CORS: localhost:5173"]
        L_Log["Log: DEBUG (Chi tiết)"]
    end

    subgraph Staging["2. Staging / UAT"]
        S_DB["Neon / Cloud DB (Dev Branch)"]
        S_Store["Cloudflare R2 (elibrary-staging)"]
        S_CORS["CORS: *.pages.dev"]
        S_Log["Log: INFO"]
    end

    subgraph Prod["3. Production Cloud"]
        P_DB["PostgreSQL HA (Connection Pool)"]
        P_Store["Cloudflare R2 (elibrary-bucket)"]
        P_CORS["CORS: your-domain.edu.vn"]
        P_Log["Log: WARNING / ERROR"]
    end
```

| Tham số cấu hình | Môi trường Local Development | Môi trường Staging (Kiểm Thử) | Môi trường Production (Chính Thức) |
|---|---|---|---|
| **`DATABASE_URL`** | `postgresql+asyncpg://postgres:postgres@localhost:5432/elibrary` | Chuỗi kết nối Neon DB Dev Branch (`?sslmode=require`) | Chuỗi kết nối Production Managed PostgreSQL (Kèm Connection Pooler) |
| **`SECRET_KEY`** | Chuỗi mẫu phát triển (Dev secret) | Sinh ngẫu nhiên 32 ký tự hex | Khóa mật mã độ dài 64 ký tự lưu trong Secret Manager |
| **`STORAGE_BACKEND`** | **`"local"`** | **`"r2"`** | **`"r2"`** |
| **`MINIO_ENDPOINT`** | *Để trống (None)* | Endpoint Cloudflare R2 | Endpoint Cloudflare R2 chính thức |
| **`MINIO_PUBLIC_URL`** | *Để trống (None)* | URL Public R2 Dev (`*.r2.dev`) | CDN Custom Domain (`https://cdn.domain.edu.vn`) |
| **`BUCKET_NAME`** | *Không sử dụng* | `elibrary-staging` | `elibrary-bucket` |
| **`CORS_ORIGINS`** | `["http://localhost:5173"]` | `["https://staging.pages.dev"]` | `["https://your-domain.edu.vn"]` |
| **Reload Code (`--reload`)** | `True` (Tự động nạp lại khi sửa) | `False` | `False` (Gunicorn multi-workers) |

---

## 2. Quản Trị Bí Mật (Secrets Management)

### 2.1. Quy Tắc Bất Biến
1. **Tuyệt đối không commit file `.env` lên GitHub:** Toàn bộ khóa bảo mật, mật khẩu cơ sở dữ liệu và token truy cập R2 phải được đưa vào file `.gitignore`.
2. **Nguyên tắc quyền tối thiểu (Least Privilege):** Token R2 API dùng cho Backend chỉ cần cấp quyền đọc/ghi trên duy nhất một Bucket `elibrary-bucket`, không cấp quyền Admin trên toàn bộ tài khoản Cloudflare.

### 2.2. Quản Trị Secret Trên Các Nền Tảng Triển Khai
* **Trên GitHub Actions CI/CD:** Lưu trữ trong mục **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions** (Ví dụ: `GITHUB_TOKEN`, `PROD_DB_URL`).
* **Trên Máy Chủ Linux VPS:** Lưu file `.env` tại thư mục `/var/www/Foundation-Project/.env` và phân quyền nghiêm ngặt:
  ```bash
  sudo chown root:www-data /var/www/Foundation-Project/.env
  sudo chmod 640 /var/www/Foundation-Project/.env
  ```
* **Trên Container Docker:** Sử dụng Docker Secrets hoặc truyền qua biến môi trường khi khởi chạy:
  ```bash
  docker run --env-file /secure/path/to/prod.env ...
  ```

---

## 3. Quy Trình Chuyển Đổi Môi Trường (Environment Switching)

Hệ thống được thiết kế để chuyển đổi giữa chế độ Local và Cloud mà **không cần sửa một dòng code nào**:
* Để chuyển sang chế độ **Cloud Production**: Chỉ cần thêm các biến `MINIO_*` và đặt `STORAGE_BACKEND=r2` trong `.env`.
* Để quay về chế độ **Offline Local**: Chỉ cần đặt `STORAGE_BACKEND=local`. Backend sẽ tự động lưu file vào đĩa cứng và Client tự động tải file qua cổng FastAPI `8000`.
