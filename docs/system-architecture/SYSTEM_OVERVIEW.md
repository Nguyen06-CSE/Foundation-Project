---
id: SYSTEM_OVERVIEW
title: Mô Hình Kiến Trúc C4 & Tổng Quan
sidebar_position: 2
---

# 📐 Mô Hình Kiến Trúc C4 & Tổng Quan Hệ Thống

Để cung cấp góc nhìn đa chiều cho cả cấp quản lý lẫn kỹ sư phát triển, kiến trúc của **Digital Library Platform** được biểu diễn theo chuẩn mô hình **C4 Model** (Context, Containers, Components).

---

## 1. C4 Level 1: Sơ Đồ Ngữ Cảnh Hệ Thống (System Context Diagram)

Sơ đồ ngữ cảnh mô tả ranh giới của hệ thống Thư Viện Số đối với người dùng và các dịch vụ phụ trợ bên ngoài:

```mermaid
graph TD
    subgraph Users["Người Dùng Hệ Thống"]
        Student["👨‍🎓 Sinh Viên<br/>(Học tập, tìm kiếm, lưu trữ)"]
        Lecturer["👨‍🏫 Giảng Viên<br/>(Phát tài liệu lớp, đóng góp)"]
        Admin["🏛️ Quản Trị Khoa / Trường<br/>(Kiểm duyệt học liệu, cấu hình)"]
    end

    System["📚 Digital Library Platform<br/>(Hệ Thống Thư Viện Số)"]

    subgraph External["Dịch Vụ Bên Ngoài"]
        R2["☁️ Cloudflare R2<br/>(Object Storage · 0đ Egress)"]
        OfficeOnline["📄 Google Docs / Office Viewer<br/>(Trình nhúng xem PPTX, XLSX)"]
    end

    Student -- "Tra cứu học liệu, quản lý tài liệu cá nhân, làm việc nhóm" --> System
    Lecturer -- "Phân phối tài liệu lớp, kiểm duyệt học liệu nhóm" --> System
    Admin -- "Thẩm định học liệu cộng đồng, quản lý môn học" --> System

    System -- "Lưu trữ tệp gốc & ảnh bìa qua S3 API" --> R2
    System -- "Cung cấp URL công khai để nhúng iframe" --> OfficeOnline
    Users == "Tải trực tiếp file từ CDN không qua máy chủ" ==> R2
```

---

## 2. C4 Level 2: Sơ Đồ Các Thùng Chứa (Container Diagram)

Sơ đồ thùng chứa mô tả các khối phần mềm, công nghệ runtime và giao thức giao tiếp giữa chúng:

```mermaid
graph TB
    User["Người Dùng (Web Browser)"]

    subgraph DigitalLibrary["Digital Library Boundary"]
        SPA["Frontend SPA<br/>(React 19 · Vite · TypeScript)<br/>Cung cấp giao diện người dùng & Viewers"]
        API["Backend API Application<br/>(FastAPI · Python 3.11 · Uvicorn)<br/>Xử lý nghiệp vụ, xác thực JWT & điều phối"]
        Worker["Background Processing<br/>(FastAPI BackgroundTasks)<br/>Trích xuất OCR, sinh ảnh bìa & phân tích text"]
        Cron["Task Scheduler<br/>(APScheduler)<br/>Dọn rác 30 ngày & tính điểm Trending"]
        DB[("Cơ Sở Dữ Liệu Quan Hệ<br/>(PostgreSQL 14+ / SQLite)<br/>Lưu trữ Metadata, quan hệ & tsvector FTS")]
        LocalStorage["Local Filesystem Buffer<br/>(Thư mục storage/ cục bộ)<br/>Phục vụ file khi chạy chế độ Offline"]
    end

    R2Storage["Cloudflare R2 Bucket<br/>(S3-compatible Object Storage)<br/>Lưu trữ tệp gốc trên Cloud"]

    User -- "HTTPS / UI Interaction" --> SPA
    SPA -- "JSON / HTTPS (REST API + JWT Bearer)" --> API
    SPA == "Tải trực tiếp tệp & ảnh bìa qua CDN" ==> R2Storage
    SPA -. "Tải tệp tĩnh qua /storage/ (Chế độ Local)" .-> API

    API -- "Async SQL / TCP (asyncpg)" --> DB
    API -- "Đẩy tác vụ ngầm" --> Worker
    API -- "Ghi tệp (boto3 S3 API)" --> R2Storage
    API -. "Ghi tệp đĩa cứng (aiofiles)" .-> LocalStorage
    Worker -- "Cập nhật search_vector & thumbnail_path" --> DB
    Cron -- "Quét tệp quá hạn 30 ngày" --> DB
```

---

## 3. C4 Level 3: Sơ Đồ Thành Phần Máy Chủ (Backend Component Diagram)

Bên trong máy chủ **FastAPI Application**, mã nguồn được tổ chức theo cấu trúc phân tầng nghiêm ngặt nhằm đảm bảo tính đơn nhiệm và dễ kiểm thử:

```mermaid
graph TD
    Client["React Client Request"] --> AuthMW["Security & Auth Middleware<br/>(backend/app/core/security.py)"]
    
    subgraph Routers["Tầng Định Tuyến (Routers Layer - 22 Modules)"]
        R_Auth["routers/auth.py"]
        R_Doc["routers/documents.py"]
        R_Lib["routers/library.py"]
        R_Srch["routers/search.py"]
        R_Grp["routers/groups.py"]
        R_Trash["routers/trash.py"]
    end

    AuthMW --> Routers

    subgraph Services["Tầng Dịch Vụ Nghiệp Vụ (Services Layer)"]
        S_File["FileService<br/>(Tính SHA-256, Ghi Storage, MIME Check)"]
        S_Doc["DocumentService<br/>(CRUD, Cloning/Forking, Metadata)"]
        S_Lib["LibraryService<br/>(Submission, Moderation, Rating)"]
        S_Search["SearchService<br/>(Full-Text Search tsquery, Ranking)"]
        S_Trash["TrashService<br/>(Soft Delete, Restore, Hard Purge)"]
    end

    Routers --> Services

    subgraph DataAccess["Tầng Truy Cập Dữ Liệu (ORM & Database Layer)"]
        Models["SQLAlchemy Declarative Models<br/>(20 Entity Models)"]
        Session["AsyncSession (SQLAlchemy 2.0)<br/>Giao tác bất đồng bộ"]
    end

    Services --> Models
    Services --> Session
    Session --> Database[("PostgreSQL")]
```

---

## 4. Các Nguyên Tắc Thiết Kế Trọng Yếu (Design Principles)

1. **Phân tách hoàn toàn Giao diện và Dịch vụ (Decoupled Architecture):**
   * Frontend và Backend giao tiếp hoàn toàn qua giao thức RESTful JSON API chuẩn hóa. Frontend có thể deploy độc lập trên Cloudflare Pages/Vercel hoặc chạy chung cổng.
2. **Kiến trúc Không Trạng Thái (Stateless Application):**
   * Máy chủ FastAPI không lưu trữ thông tin phiên người dùng trong RAM bộ nhớ. Xác thực dựa trên mã thông báo JWT tự chứa (Self-contained JWT). Bất kỳ instance backend nào cũng có thể phục vụ bất kỳ request nào.
3. **Cơ chế Lưu trữ Lai Linh hoạt (Hybrid Storage Strategy):**
   * Tầng lưu trữ được trừu tượng hóa, tự động điều hướng sang S3 API (Cloudflare R2) khi có biến môi trường `R2_BUCKET_NAME`, hoặc rơi về Local Filesystem khi chạy ở chế độ cục bộ không mạng.
4. **Giảm tải Bộ vi xử lý bằng Client-Side Rendering (Edge Computing):**
   * Các tệp tin phức tạp (DOCX, PDF, Code) được phân tích cú pháp và dựng hình ngay tại trình duyệt của người dùng (nhờ các thư viện WebAssembly và Canvas), giảm thiểu hơn 90% tải CPU và RAM cho máy chủ Backend.
