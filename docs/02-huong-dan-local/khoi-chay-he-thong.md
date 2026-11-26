---
title: Khởi Chạy Toàn Bộ Hệ Thống Localhost
sidebar_label: 🚀 Khởi chạy hệ thống
sidebar_position: 3
---

# 🚀 KHỞI CHẠY TOÀN BỘ HỆ THỐNG LOCALHOST (STEP-BY-STEP)

Tài liệu này hướng dẫn chi tiết từng câu lệnh từ khi tải mã nguồn đến khi hệ thống hoạt động hoàn chỉnh trên máy cục bộ của bạn.

---

## Bước 1: Tạo Cơ Sở Dữ Liệu PostgreSQL

Mở Terminal và tạo CSDL mới có tên `elibrary_db`:

```bash
# Cách 1: Sử dụng tiện ích dòng lệnh PostgreSQL
createdb -U postgres elibrary_db

# Cách 2: Truy cập psql để tạo CSDL
psql -U postgres -c "CREATE DATABASE elibrary_db ENCODING 'UTF8';"
```

---

## Bước 2: Thiết Lập & Khởi Động Backend (FastAPI)

1. Mở cửa sổ Terminal thứ nhất và di chuyển vào thư mục dự án:
   ```bash
   cd /Users/caotiendattx/Developer/Foundation-Project/backend
   ```

2. Tạo và kích hoạt môi trường ảo Python (Virtual Environment):
   ```bash
   # Tạo môi trường ảo
   python3 -m venv venv

   # Kích hoạt môi trường ảo:
   # Trên macOS / Linux:
   source venv/bin/activate
   # Trên Windows PowerShell:
   # .\venv\Scripts\Activate.ps1
   ```

3. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Tạo tệp cấu hình môi trường `backend/.env`:
   ```bash
   cat << 'EOF' > .env
   # Kết nối CSDL PostgreSQL qua asyncpg
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/elibrary_db

   # Khóa bí mật ký JWT
   SECRET_KEY=local_development_super_secret_key_change_me_in_production_123456
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Chế độ lưu trữ tệp tin Cục Bộ
   STORAGE_BACKEND=local
   STORAGE_QUOTA_BYTES=16106127360

   # Cho phép kết nối từ Frontend Vite
   CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
   EOF
   ```

5. Chạy di chuyển lược đồ CSDL bằng Alembic:
   ```bash
   # Thực thi toàn bộ chuỗi 18 bản migration (đã có bridge c9d0e1f2a3b4)
   alembic upgrade head
   ```

   > **Đã xác minh (25/11/2026):** `upgrade head` chạy được từ database hoàn toàn trống, không cần `create_all` hay `stamp` thủ công. Có thể tự kiểm tra trên DB disposable riêng bằng lệnh dưới đây (chỉ chạy khi biến môi trường trỏ tới DB local/disposable, không dùng DB production):
   >
   > ```bash
   > CLEAN_CHAIN_DATABASE_URL=<url DB trống> backend/.venv/bin/python -m pytest backend/tests/test_migration_clean_chain.py -q
   > ```
   >
   > Xem chi tiết tại [Lịch sử Migration Alembic](../04-co-so-du-lieu/alembic-va-tien-hoa-schema.md).

6. Khởi động máy chủ Backend API:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   > 🌐 Kiểm tra API hoạt động tại: `http://localhost:8000/docs` (Swagger UI).

---

## Bước 3: Thiết Lập & Khởi Động Frontend (React Vite)

1. Mở cửa sổ Terminal thứ hai và di chuyển vào thư mục Frontend:
   ```bash
   cd /Users/caotiendattx/Developer/Foundation-Project/frontend/digital-library
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Tạo tệp cấu hình môi trường `frontend/digital-library/.env`:
   ```bash
   cat << 'EOF' > .env
   # Địa chỉ máy chủ Backend API
   VITE_API_URL=http://localhost:8000
   EOF
   ```

4. Khởi chạy máy chủ giao diện người dùng:
   ```bash
   npm run dev
   ```
   > 💻 Truy cập ứng dụng tại: `http://localhost:5173`

---

## Bước 4: Kiểm Tra Toàn Diện Hệ Thống (Health Check)

1. Mở trình duyệt web tại `http://localhost:5173`.
2. Đăng ký tài khoản người dùng mới (ví dụ: `demo_user` / mật khẩu `Password123!`).
3. Đăng nhập và thử tải lên một tệp tin PDF bất kỳ vào **Kho cá nhân**.
4. Kiểm tra thư mục vật lý `backend/storage/` trên máy tính để thấy tệp tin đã được lưu trữ an toàn.
