---
id: README
title: Cổng Thông Tin Tài Liệu Dự Án
sidebar_position: 1
slug: /
---

# 📚 Cổng Thông Tin & Tài Liệu Dự Án Thư Viện Số

Chào mừng bạn đến với hệ thống tài liệu chính thức của **Digital Library Platform (Foundation Project)**. Website tài liệu này được xây dựng bằng Docusaurus và lưu trữ trên GitHub Pages, nhằm cung cấp cơ sở tri thức toàn diện cho quá trình phát triển, thẩm định và phê duyệt kiến trúc hệ thống.

---

## 🧭 Bắt Đầu Nhanh (Getting Started)

Nếu bạn là người mới tiếp cận dự án, hãy tham khảo các tài liệu trọng tâm trong phân hệ **Tổng Quan Dự Án**:

* 🗺️ **[Lộ Trình Đọc Tài Liệu (Reading Roadmap)](./overview/README.md):** Chọn lộ trình đọc phù hợp với vai trò của bạn (Lập trình viên, Quản lý/PO, Hội đồng phản biện, Kỹ sư vận hành).
* 📖 **[Giới Thiệu Dự Án (Project Introduction)](./overview/PROJECT_INTRODUCTION.md):** Bối cảnh, vấn đề phân mảnh học liệu đại học và giải pháp số hóa toàn diện.
* 🎯 **[Phạm Vi & Ranh Giới (Project Scope)](./overview/PROJECT_SCOPE.md):** Các tính năng cốt lõi (In-Scope), ràng buộc kỹ thuật và các hạng mục ngoài phạm vi.
* 🌟 **[Danh Sách Tính Năng Cốt Lõi (Key Features)](./overview/KEY_FEATURES.md):** Bản đồ kết nối 10 phân hệ nghiệp vụ chuyên sâu.
* 🛡️ **[Vai Trò & Ma Trận Phân Quyền (User Roles & RBAC)](./overview/USER_ROLES_AND_PERMISSIONS.md):** Ma trận kiểm soát truy cập giữa Sinh viên, Giảng viên, Ban cán sự và Quản trị viên.
* 📖 **[Từ Điển Thuật Ngữ (Glossary)](./overview/GLOSSARY.md):** Thống nhất các khái niệm: Fork/Clone, SHA-256 Deduplication, Trending Score, Soft Delete,...
* 📋 **[Yêu Cầu & Nghiệp Vụ Cấp Sản Phẩm (Requirements)](./requirements/README.md):** Khảo sát mục tiêu kinh doanh (BRD), yêu cầu chức năng (FRD), phi chức năng (NFR), quy tắc nghiệp vụ dùng chung và 6 luồng Use Cases.
* 🛠️ **[Hướng Dẫn Thiết Lập & Phát Triển (Development Guide)](./development/README.md):** Hướng dẫn 5 bước khởi chạy nhanh, yêu cầu tiên quyết, chuẩn hóa biến môi trường, setup CSDL và workflow chuẩn.

---

## 🗂 Cây Thư Mục & Bản Đồ Tài Liệu Toàn Dự Án

```text
docs/
├── overview/                       # 🌟 Phân hệ Tổng quan dự án (Giai đoạn 1)
│   ├── README.md                   # Lộ trình đọc tài liệu theo vai trò
│   ├── PROJECT_INTRODUCTION.md     # Bối cảnh & giải pháp sản phẩm
│   ├── PROJECT_SCOPE.md            # Phạm vi In-scope & Out-of-scope
│   ├── KEY_FEATURES.md             # Bản đồ 10 tính năng cốt lõi
│   ├── USER_ROLES_AND_PERMISSIONS.md # Ma trận phân quyền RBAC
│   └── GLOSSARY.md                 # Từ điển thuật ngữ chuẩn hóa
├── requirements/                   # 📋 Phân hệ Yêu cầu & Nghiệp vụ (Giai đoạn 2)
│   ├── README.md                   # Tổng quan quản lý yêu cầu & Implementation Gaps
│   ├── BUSINESS_REQUIREMENTS.md    # Yêu cầu nghiệp vụ cấp cao (BRD) & KPIs
│   ├── FUNCTIONAL_REQUIREMENTS.md  # Yêu cầu chức năng chi tiết (FRD)
│   ├── NON_FUNCTIONAL_REQUIREMENTS.md # Yêu cầu phi chức năng (NFR & Security)
│   ├── BUSINESS_RULES.md           # Quy tắc dùng chung cấp sản phẩm (Invariants)
│   └── use-cases/                  # 6 luồng nghiệp vụ trọng yếu (Use Cases)
├── feat/                           # 🚀 Đặc tả kỹ thuật chi tiết của 10 tính năng (Giữ nguyên)
│   ├── personal-dashboard/         # Trang tổng quan & kho lưu trữ cá nhân
│   ├── community-library/          # Thư viện học liệu mở phân cấp theo Khoa & Môn học
│   ├── document-sharing/           # Chia sẻ tài liệu, link bảo mật & quyền truy cập
│   ├── document-query-and-performance/ # Tìm kiếm toàn văn FTS & tối ưu truy vấn
│   ├── document-view-modes/        # 3 chế độ xem đa phong cách (Grid, List, Detail)
│   ├── markdown-view/              # Trình đọc & xuất bản văn bản Markdown
│   ├── bundle/                     # Đóng gói và chia sẻ bộ tài liệu học tập
│   ├── document-preview-and-thumbnails/ # Xem trước PDF/DOCX/Code & quản lý ảnh bìa
│   ├── activity-tracking/          # Nhật ký tương tác & tính điểm xu hướng (Trending)
│   └── system-enhancements-2026/   # To-do, Notifications, Thao tác hàng loạt & Nhãn
├── architecture/                   # 🏗️ Kiến trúc chuyên sâu & Lưu trữ
│   └── STORAGE_SYSTEM.md           # Chuyên đề 11 chương về Lưu trữ, SHA-256 & Vòng đời file
├── system-architecture/            # 🏛️ Sơ đồ kiến trúc & luồng dữ liệu (Giai đoạn 3)
│   ├── README.md                   # Tổng quan kiến trúc & sơ đồ khối
│   ├── SYSTEM_OVERVIEW.md          # Mô hình kiến trúc C4 (Context, Container, Component)
│   ├── TECHNOLOGY_STACK.md         # Ngăn xếp công nghệ chuẩn hóa
│   ├── FRONTEND_ARCHITECTURE.md    # Kiến trúc giao diện React 19 & Viewers
│   ├── BACKEND_ARCHITECTURE.md     # Kiến trúc máy chủ FastAPI & Services
│   ├── DATABASE_ARCHITECTURE.md    # Kiến trúc CSDL PostgreSQL & 20 bảng
│   ├── STORAGE_ARCHITECTURE.md     # Kiến trúc lưu trữ Hybrid R2 / Local
│   ├── SECURITY_ARCHITECTURE.md    # Kiến trúc bảo mật & ranh giới tin cậy
│   └── adr/                        # 5 Bản ghi quyết định kiến trúc then chốt (ADRs)
├── development/                    # 🛠️ Hướng dẫn phát triển & cài đặt (Giai đoạn 4)
│   ├── README.md                   # Hướng dẫn khởi động nhanh 5 bước
│   ├── PREREQUISITES.md            # Yêu cầu tiên quyết & công cụ nền tảng
│   ├── ENVIRONMENT_VARIABLES.md    # Chuẩn hóa biến môi trường Backend & Frontend
│   ├── DATABASE_SETUP.md           # Thiết lập CSDL, migrations Alembic & seed data
│   ├── DEVELOPMENT_WORKFLOW.md     # Quy trình làm việc, linter oxlint & pytest
│   └── TROUBLESHOOTING.md          # Cẩm nang khắc phục lỗi cục bộ (Local)
├── deployment/                     # 🚀 Hướng dẫn triển khai & vận hành
│   ├── README.md                   # Kiến trúc triển khai Hybrid Storage
│   ├── ENV_VARIABLES.md            # Danh mục biến môi trường Backend & Frontend
│   ├── STORAGE_R2.md               # Cấu hình Cloudflare R2 Object Storage
│   ├── TROUBLESHOOTING.md          # Cẩm nang khắc phục sự cố vận hành
│   └── BUG_FIX_REPORT.md           # Báo cáo kỹ thuật xử lý các sự cố nghiêm trọng
├── project-management/             # 📋 Kế hoạch, tiến độ & quản trị dự án
│   ├── MoTaDuAn.md                 # Mô tả 5 không gian và nguyên tắc nhân bản
│   ├── PROJECT_STATUS_REPORT.md    # Báo cáo hiện trạng tính năng & nợ kỹ thuật
│   ├── roadmap.md                  # Lộ trình phát triển sản phẩm dài hạn
│   ├── backlog.md                  # Danh mục ý tưởng & tính năng chờ triển khai
│   ├── mau-slide-thuyet-trinh.md   # Khung dàn ý slide bảo vệ đồ án
│   ├── task-assignment/            # Bảng phân rã công việc chi tiết
│   └── report/                     # Báo cáo tiến độ thành viên
├── LOCAL_DEVELOPMENT_GUIDE.md      # 🛠️ Hướng dẫn cài đặt & chạy 100% Offline / Localhost
├── AUDIT_REPORT.md                 # 🔍 Báo cáo kiểm toán chức năng & UI/UX thực tế
└── ACTIVITY_TRACKING.md            # 📊 Bản tổng hợp theo dõi hoạt động hệ thống
```

---

## 🔗 Liên Kết Nhanh Đến Các Phân Hệ

### 1. Đặc Tả Chi Tiết 10 Tính Năng (`feat/`)
1. **[Personal Dashboard](./feat/personal-dashboard/PERSONAL_DASHBOARD.md):** Kho cá nhân, widget thống kê dung lượng, tài liệu gần đây.
2. **[Community Library](./feat/community-library/spec.md):** Danh mục Khoa/Môn học, xét duyệt đóng góp tài liệu, rating & review.
3. **[Document Sharing](./feat/document-sharing/README.md):** Tạo link chia sẻ, cấp quyền xem/tải, sao chép độc lập khi lưu.
4. **[Document Query & Performance](./feat/document-query-and-performance/README.md):** Full-Text Search PostgreSQL, lọc đa tiêu chí, phân trang.
5. **[Document Multi-View Modes](./feat/document-view-modes/README.md):** Grid View, List View, Detail View, bảng màu MIME Type.
6. **[Markdown View & Export](./feat/markdown-view/README.md):** Xem văn bản Markdown, code syntax highlighting, xuất HTML/PDF.
7. **[Document Bundle](./feat/bundle/README.md):** Gom nhóm học liệu theo chủ đề, chia sẻ gói, tải file ZIP.
8. **[Document Preview & Thumbnails](./feat/document-preview-and-thumbnails/README.md):** Xem trước PDF, DOCX, Code, trích xuất text tự động.
9. **[Activity Tracking](./feat/activity-tracking/README.md):** Bảng log tương tác, tính điểm `trending_score`, thống kê 30 ngày.
10. **[System Enhancements 2026](./feat/system-enhancements-2026/README.md):** Việc cần làm (To-do), Thông báo, Thao tác hàng loạt, Quản lý nhãn.

---

### 2. Kiến Trúc & Triển Khai Hạ Tầng
* **[Kiến Trúc Hệ Thống Tổng Thể](./system-architecture/README.md):** Sơ đồ khối tương tác giữa React Client, FastAPI Server và Cloudflare R2 / Local Storage.
* **[Chuyên Đề Kiến Trúc Lưu Trữ & Deduplication](./architecture/STORAGE_SYSTEM.md):** 11 chương phân tích cơ sở toán học SHA-256, tối ưu RAM, cơ chế dọn rác nền APScheduler.
* **[Hướng Dẫn Vận Hành Offline (100% Localhost)](./LOCAL_DEVELOPMENT_GUIDE.md):** Thiết lập và chạy toàn bộ dự án offline phục vụ kiểm thử và chấm bài.
* **[Tài Liệu Triển Khai (Deployment)](./deployment/README.md):** Cấu hình môi trường đám mây Cloudflare R2, cơ sở dữ liệu PostgreSQL Serverless.

---

### 3. Quản Lý Tiến Độ & Thẩm Định Đồ Án
* **[Mô Tả Dự Án & 5 Không Gian](./project-management/MoTaDuAn.md)**
* **[Báo Cáo Tình Trạng Dự Án (Project Status Report)](./project-management/PROJECT_STATUS_REPORT.md)**
* **[Lộ Trình Phát Triển (Roadmap)](./project-management/roadmap.md)**
* **[Danh Mục Kế Hoạch Đang Chờ (Backlog)](./project-management/backlog.md)**
* **[Phân Rã Chức Năng](./project-management/task-assignment/PhanRaChucNang.md) & [Bổ Sung Phân Rã](./project-management/task-assignment/BoSung-PhanRaChucNang.md)**
* **[Báo Cáo Kiểm Toán Thực Tế (Audit Report)](./AUDIT_REPORT.md)**
