---
title: Kiến Trúc Dữ Liệu & Cơ Sở Dữ Liệu
sidebar_label: 🗄️ Tổng quan Dữ liệu
sidebar_position: 1
---

# Kiến Trúc Dữ Liệu & Cơ Sở Dữ Liệu — Foundation Project

Chào mừng bạn đến với khu vực tài liệu cơ sở dữ liệu của **Foundation Project**. Hệ thống sử dụng hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL 15+** kết hợp với kiến trúc bất đồng bộ **SQLAlchemy 2.0 (AsyncSession)** và bộ công cụ quản lý phiên bản migration **Alembic**.

---

## 1. Nguồn Chuẩn Xác Thực (Single Source of Truth)

Nhằm tránh mâu thuẫn giữa tài liệu và mã nguồn thực tế, toàn bộ kiến trúc cơ sở dữ liệu trong dự án được quy định nguồn chuẩn như sau:

| Đối tượng | Vị trí trong Repository | Vai trò & Mức độ ưu tiên |
| :--- | :--- | :--- |
| **SQLAlchemy ORM Models** | `backend/app/models/` (26 thực thể) | **Nguồn chuẩn bậc nhất (Authoritative)**: Định nghĩa cấu trúc cột, kiểu dữ liệu, quan hệ khóa ngoại (Relationship) và validation mức ứng dụng. |
| **Lịch sử Migration Alembic** | `alembic/versions/` (7 bản migration) | **Nguồn chuẩn tiến hóa schema**: Xác thực lịch sử thay đổi DDL, chỉ mục (Index), ràng buộc partial unique và trigger FTS. |
| **Các file SQL tham khảo** | `docs/references/sql/` (`DB_ELibrary.sql`, `AddModel.sql`) | **Tài liệu tham khảo lịch sử**: Dùng để đối chiếu thiết kế ban đầu; **không** dùng làm nguồn thực thi tự động. |

> [!IMPORTANT]
> Mọi thay đổi về cấu trúc bảng bắt buộc phải được khai báo trong `backend/app/models/` và sinh mã di chuyển schema thông qua Alembic (`alembic revision --autogenerate`). Tuyệt đối không can thiệp thủ công trực tiếp trên database production mà không qua migration.

---

## 2. Bản Đồ Tài Liệu Cơ Sở Dữ Liệu

| Tài liệu | Nội dung chi tiết | Đối tượng tham chiếu |
| :--- | :--- | :--- |
| [**Tổng quan Hệ CSDL (Database Overview)**](./DATABASE_OVERVIEW.md) | Kiến trúc PostgreSQL, connection pooling, phân vùng 5 cụm dữ liệu, cơ chế Full-Text Search và Soft Delete | DBA, Backend Developers |
| [**Từ điển Dữ liệu (Data Dictionary)**](./DATA_DICTIONARY.md) | Chi tiết 26 bảng, kiểu dữ liệu từng cột, ràng buộc PK/FK, chỉ mục Index và bảo mật dữ liệu nhạy cảm | Fullstack Devs, QA, Auditors |
| [**Sơ đồ Thực thể Quan hệ (ERD)**](./ERD.md) | Sơ đồ Mermaid ERD trực quan biểu diễn mối quan hệ 1-N, N-N giữa các thực thể cốt lõi | System Architects, Developers |
| [**Quản lý Di chuyển Schema (Migrations)**](./MIGRATIONS.md) | Chuỗi 7 bản migration Alembic từ lúc khởi tạo đến hiện tại, cẩm nang lệnh vận hành an toàn | DevOps, SRE, Lead Developers |

---

## 3. Thống Kê Tổng Quan Về Schema

- **Số lượng bảng dữ liệu**: `26` bảng
- **Hệ thống khóa ngoại (Foreign Keys)**: `35+` ràng buộc liên kết toàn vẹn dữ liệu
- **Chỉ mục nâng cao (Specialized Indexes)**:
  - Chỉ mục GIN trên cột `search_vector` (`tsvector`) phục vụ Full-Text Search
  - Chỉ mục B-Tree trên các cột tra cứu tần suất cao: `workspace_id`, `owner_id`, `created_at`, `status`
  - Chỉ mục Partial Unique Index chống trùng lặp chia sẻ tài liệu đang chờ duyệt
