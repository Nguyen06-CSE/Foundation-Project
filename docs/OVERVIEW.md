# OVERVIEW — TỔNG QUAN HỆ THỐNG THƯ VIỆN SỐ (FOUNDATION PROJECT)

## 1. Giới thiệu dự án

**Foundation Project (Thư viện số - Quản lý tài liệu)** là hệ thống quản lý, lưu trữ, tìm kiếm, chia sẻ và cộng tác tài liệu học tập dành cho môi trường giáo dục (Đại học/Cao đẳng).

Hệ thống cho phép người dùng (sinh viên, giảng viên, quản trị viên) quản lý kho tài liệu cá nhân, làm việc nhóm trong không gian nhóm (Workspace), đóng góp và khai thác tài liệu học liệu mở trong Kho học liệu cộng đồng.

---

## 2. Bài toán & Mục tiêu giải quyết

- **Tản mát tài liệu**: Sinh viên và giảng viên thường lưu trữ tài liệu phân tán ở nhiều kênh (Drive, Zalo, máy tính cá nhân) gây khó khăn cho việc tìm kiếm.
- **Trùng lặp & Không tối ưu dung lượng**: Thiếu cơ chế phát hiện file trùng lặp và phân loại theo môn học / khoa.
- **Cộng tác nhóm thụ động**: Thiếu công cụ chia sẻ tài liệu snapshot, quản lý phân quyền thành viên và tự động dọn dẹp khi nhóm giải tán.
- **Khai thác tài liệu công khai**: Cần một kho học liệu mở phân cấp theo Khoa ➔ Môn học có kiểm duyệt chất lượng trước khi công khai.

---

## 3. Các nhóm chức năng chính (Main Features)

```text
Foundation Project
├── 1. Xác thực & Tài khoản (Auth & User Management)
├── 2. Kho tài liệu cá nhân (Personal Library)
├── 3. Gói tài liệu (Document Bundle)
├── 4. Không gian làm việc nhóm (Group Workspace)
├── 5. Kho học liệu cộng đồng (Community Library)
├── 6. Tìm kiếm toàn cục & Tìm kiếm nâng cao (Full-text Search)
├── 7. Quản lý Thư mục & Thẻ đánh dấu (Folder & Tag Management)
├── 8. Thùng rác & Tự động dọn dẹp (Trash & Retention Cleanups)
└── 9. Thông báo & Nhật ký hệ thống (Notifications & Audit Logs)
```

---

## 4. Kiến trúc hệ thống (System Architecture)

```text
Client (Web Browser)
       │
       ▼
Frontend (React + TypeScript + Vite + TailwindCSS)
       │
       │ RESTful APIs / JSON / Multipart
       ▼
Backend API Gateway (FastAPI)
       ├── Async SQLAlchemy ORM
       ├── Pydantic Schemas / Validations
       ├── Background Tasks (OCR, Processing Jobs, Thumbnails)
       └── APScheduler (Retention Cleanup, Group Dissolution)
       │
       ├──► Database (PostgreSQL)
       │      ├── Full-text search (tsvector, unaccent, pg_trgm, GIN Index)
       │      └── Relational Tables & JSONB Metadata
       │
       └──► Storage (Local Filesystem Storage)
              ├── personal/
              ├── groups/
              ├── community/
              ├── thumbnails/
              └── temp/
```

---

## 5. Công nghệ sử dụng (Technology Stack)

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS, Lucide React (Icons)
- **State Management & Data Fetching**: Axios, Zustand, TanStack Query (React Query)
- **Routing**: React Router DOM v6

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ORM & Database Client**: Async SQLAlchemy, Asyncpg
- **Task Scheduling & Background**: FastAPI `BackgroundTasks`, APScheduler
- **Security & Auth**: PyJWT, Passlib (Bcrypt)
- **File & Document Processing**: PyPDF2, python-docx, python-pptx, Pillow, Tesseract OCR (Pytesseract)

### Database & Storage
- **Database**: PostgreSQL 14+
- **Extensions**: `unaccent`, `pg_trgm`
- **File Storage**: Local disk storage mounted via FastAPI `StaticFiles` at `/storage`

---

## 6. Cấu trúc thư mục dự án (Project Structure)

```text
Foundation-Project/
├── backend/
│   ├── app/
│   │   ├── core/           # Database setup, Security, Dependencies, Config
│   │   ├── jobs/           # Scheduled background tasks (APScheduler)
│   │   ├── models/         # SQLAlchemy ORM Data Models
│   │   ├── routers/        # FastAPI API Endpoints / Controllers
│   │   ├── schemas/        # Pydantic Schemas (Input/Output validation)
│   │   ├── services/       # Core Business Logic & File Operations
│   │   ├── utils/          # File checksum, text processing helpers
│   │   └── main.py         # Application Entrypoint
│   └── storage/            # Disk storage directories
├── frontend/
│   └── digital-library/
│       └── src/
│           ├── components/ # Reusable UI components
│           ├── hooks/      # Custom React hooks
│           ├── layouts/    # App Layouts (MainLayout, AuthLayout)
│           ├── pages/      # Page components (Personal, Group, Library, Search...)
│           ├── services/   # Axios API service client modules
│           ├── stores/     # Zustand stores (Auth, Toast, Notifications)
│           └── types/      # TypeScript interface definitions
├── docs/                   # System Documentation
│   ├── feat/               # Feature detailed specs & designs
│   ├── project-management/ # Status reports, project breakdowns
│   ├── references/         # SQL scripts & visual assets
│   ├── system-architecture/# Dataflow & Architecture diagrams
│   └── OVERVIEW.md         # Overview documentation
└── README.md
```

---

## 7. Quyền hạn & Phân quyền (Roles & Permissions)

| Vai trò (Role) | Phạm vi & Quyền hạn chính |
|---|---|
| **Guest / Anonymous** | Xem, tìm kiếm, preview, tải xuống tài liệu Kho cộng đồng công khai. |
| **Student / Lecturer** | Quản lý kho cá nhân (Upload, Folder, Tag, Share, Trash), Tham gia nhóm, Đóng góp học liệu cộng đồng. |
| **Faculty Admin** | Tất cả quyền của Student/Lecturer + Duyệt/Từ chối tài liệu cộng đồng thuộc Khoa của mình. |
| **System Admin** | Quản trị toàn bộ hệ thống, duyệt học liệu cộng đồng tất cả các khoa, quản lý danh mục môn học/khoa. |
| **Group Owner** | Chủ nhóm Workspace: Quản lý thành viên, đổi quyền, chia sẻ tài liệu, giải tán nhóm. |
| **Group Member (Full)** | Đăng tài liệu vào nhóm, tạo folder nhóm, quản lý tài liệu trong nhóm. |
| **Group Member (View)** | Xem và tải tài liệu trong nhóm (chỉ đọc). |

---

## 8. Luồng dữ liệu chính (Data Flow)

```text
[User Thao tác UI]
       │
       ▼
[Frontend Service (Axios)] ──(Bearer JWT)──► [FastAPI Router]
                                                  │
                                                  ▼
                                         [Dependency Check] (Auth/Permission)
                                                  │
                                                  ▼
                                          [Service Layer]
                                           ├── File IO / Storage
                                           └── Database Operations (SQLAlchemy Async)
                                                  │
                                                  ▼
                                         [PostgreSQL Database]
```
