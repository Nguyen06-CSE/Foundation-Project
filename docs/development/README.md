---
id: README
title: Hướng Dẫn Phát Triển
sidebar_position: 1
slug: /development
---

# 🛠️ Hướng Dẫn Phát Triển (Developer Onboarding Guide)

Chào mừng bạn đến với tài liệu hướng dẫn thiết lập và phát triển hệ thống **Digital Library**. Hướng dẫn này được biên soạn chi tiết giúp mọi lập trình viên (hoặc người chấm đồ án) có thể đưa toàn bộ hệ thống lên và chạy thành công trên máy tính cá nhân trong vòng **10 - 15 phút**.

---

## ⚡ Khởi Động Nhanh Trong 5 Bước (Quick Start)

```mermaid
flowchart LR
    Step1["1. Chuẩn Bị Môi Trường<br/>Python 3.11 · Node 20 · Postgres"] --> Step2["2. Thiết Lập Biến Môi Trường<br/>Tạo file .env"]
    Step2 --> Step3["3. Cài Đặt Thư Viện<br/>venv / pip & npm install"]
    Step3 --> Step4["4. Khởi Tạo Cơ Sở Dữ Liệu<br/>Alembic & Seed Data"]
    Step4 --> Step5["5. Khởi Chạy Ứng Dụng<br/>Uvicorn :8000 & Vite :5173"]
```

### Bước 1: Clone Repository
```bash
git clone https://github.com/Nguyen06-CSE/Foundation-Project.git
cd Foundation-Project
```

### Bước 2: Thiết Lập Biến Môi Trường
Tạo file `.env` tại thư mục gốc của dự án (sử dụng cấu hình mẫu cục bộ):
```bash
cat << 'EOF' > .env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/elibrary
SECRET_KEY=foundation_secret_key_development_only_2026_super_secure
STORAGE_BACKEND=local
STORAGE_QUOTA_BYTES=16106127360
EOF
```

### Bước 3: Cài Đặt Phụ Thuộc (Dependencies)
* **Backend (Python 3.11+):**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r backend/requirements.txt
  ```
* **Frontend (Node.js 18+ hoặc 20 LTS):**
  ```bash
  cd frontend/digital-library
  npm install
  cd ../..
  ```

### Bước 4: Khởi Tạo Cơ Sở Dữ Liệu & Nạp Dữ Liệu Mẫu
```bash
# Đảm bảo PostgreSQL local đang chạy và đã tạo database 'elibrary'
alembic upgrade head
python backend/db/seed.py
```

### Bước 5: Khởi Chạy Hệ Thống
* **Terminal 1 — Khởi động Backend API (Port 8000):**
  ```bash
  source .venv/bin/activate
  uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
  ```
* **Terminal 2 — Khởi động Frontend Client (Port 5173):**
  ```bash
  cd frontend/digital-library
  npm run dev
  ```
* Truy cập ứng dụng tại: `http://localhost:5173`  
  Tài khoản kiểm thử mẫu: `nguyen` / Mật khẩu: `12345678`

---

## 📚 Danh Mục Tài Liệu Chi Tiết Trong Phân Hệ Này

1. **[Yêu Cầu Tiên Quyết (PREREQUISITES.md)](./PREREQUISITES.md):** Cài đặt Python 3.11, Node.js, PostgreSQL, Docker và công cụ Tesseract OCR trên macOS/Linux/Windows.
2. **[Chuẩn Hóa Biến Môi Trường (ENVIRONMENT_VARIABLES.md)](./ENVIRONMENT_VARIABLES.md):** Giải thích chi tiết ý nghĩa, giá trị mặc định của toàn bộ biến `.env` cho cả Backend và Frontend.
3. **[Thiết Lập Cơ Sở Dữ Liệu (DATABASE_SETUP.md)](./DATABASE_SETUP.md):** Hướng dẫn tạo database qua Docker, chạy migrations Alembic và các script seed dữ liệu mẫu.
4. **[Quy Trình Phát Triển & Kiểm Tra Mã Nguồn (DEVELOPMENT_WORKFLOW.md)](./DEVELOPMENT_WORKFLOW.md):** Quy ước viết code, kiểm tra linter bằng `oxlint`, chạy test suite bằng `pytest`, và quy ước commit Git.
5. **[Cẩm Nang Sửa Lỗi Khi Chạy Local (TROUBLESHOOTING.md)](./TROUBLESHOOTING.md):** Khắc phục các lỗi xung đột cổng, lỗi thiếu Tesseract, lỗi kết nối asyncpg, lỗi CORS giữa Frontend và Backend.
