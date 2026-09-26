# Foundation-Project — Thư Viện Số & Quản Lý Tài Liệu

Hệ thống quản lý, lưu trữ, tìm kiếm, chia sẻ và cộng tác tài liệu học tập dành cho sinh viên, giảng viên và nhà trường.

## 🌐 Demo Trực Tuyến

Bạn có thể truy cập hệ thống thử nghiệm tại:
👉 [Thư viện số - Quản lý tài liệu](https://macbook-pro-2.taile4a1e8.ts.net/library "https://macbook-pro-2.taile4a1e8.ts.net/library") *(Lưu ý: Không hoạt động khi đóng server)*

## 📚 Tài Liệu Hệ Thống

Toàn bộ hệ thống tài liệu kỹ thuật và chi tiết chức năng được tổ chức trong thư mục `docs/`:

- **[Tài liệu Tổng quan Hệ thống (System Overview)](./docs/OVERVIEW.md)**
- **[Chi tiết Chức năng Gói Tài liệu (Document Bundle)](./docs/feat/bundle/README.md)**
- **[Chi tiết Chức năng Kho Học liệu Cộng đồng (Community Library)](./docs/feat/community-library/spec.md)**
- **[Phân rã Chức năng & Báo cáo Tiến độ (Project Breakdown & Status)](./docs/project-management/PROJECT_STATUS_REPORT.md)**

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Axios, Zustand, TanStack Query
- **Backend**: FastAPI, Async SQLAlchemy, Asyncpg, Pydantic, APScheduler, PyPDF2, Tesseract OCR
- **Database**: PostgreSQL (Full-text search với `tsvector`, `unaccent`, `pg_trgm`)

## 🚀 Khởi Chạy Nhanh

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (React)
```bash
cd frontend/digital-library
npm install
npm run dev
```