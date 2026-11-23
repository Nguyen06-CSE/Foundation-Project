---
title: Kiến Trúc Dữ Liệu & Cơ Sở Dữ Liệu PostgreSQL
sidebar_label: 🗄️ Tổng quan CSDL
sidebar_position: 1
---

# 🗄️ KIẾN TRÚC DỮ LIỆU & CƠ SỞ DỮ LIỆU — FOUNDATION PROJECT

Chào mừng bạn đến với khu vực tài liệu cơ sở dữ liệu chuyên sâu của **Foundation Project**. Hệ thống sử dụng hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL 15+** kết hợp với kiến trúc bất đồng bộ **SQLAlchemy 2.0 (AsyncSession)**, bộ điều khiển cấp thấp hiệu năng cao **asyncpg** và bộ công cụ quản lý phiên bản di chuyển schema **Alembic**.

---

## 1. Nguồn Chuẩn Xác Thực (Single Source of Truth)

Nhằm tránh mọi mâu thuẫn giữa tài liệu mô tả và mã nguồn thực thi thực tế, toàn bộ kiến trúc cơ sở dữ liệu trong đồ án được quy định nguồn chuẩn theo thứ tự ưu tiên:

| Đối tượng kiểm chứng | Vị trí trong Repository | Vai trò & Mức độ ưu tiên |
| :--- | :--- | :--- |
| **SQLAlchemy ORM Models** | `backend/app/models/` (26 thực thể dữ liệu) | **Nguồn chuẩn bậc nhất (Authoritative)**: Định nghĩa cấu trúc bảng, kiểu dữ liệu từng cột, quan hệ khóa ngoại (Relationship) và tính toàn vẹn tầng ứng dụng. |
| **Lịch sử Migration Alembic** | `alembic/versions/` (7 bản migration tuyến tính) | **Nguồn chuẩn tiến hóa schema**: Xác thực lịch sử thay đổi DDL, chỉ mục (Index), ràng buộc duy nhất có điều kiện (Partial Unique Index) và Trigger FTS. |
| **Tài liệu tham khảo lịch sử** | `99-luu-tru/tai-lieu-ky-thuat-cu/references/sql/` | **Tài liệu tham chiếu cũ**: Dùng để đối chiếu thiết kế ban đầu; tuyệt đối không dùng làm nguồn thực thi tự động. |

> [!IMPORTANT]
> Mọi thay đổi về cấu trúc bảng bắt buộc phải được khai báo trong `backend/app/models/` và sinh mã di chuyển schema thông qua Alembic (`alembic revision --autogenerate`). Tuyệt đối không can thiệp thủ công trực tiếp trên database production mà không qua migration.

---

## 2. Bản Đồ Tài Liệu Cơ Sở Dữ Liệu

| Tài liệu | Nội dung chi tiết | Đối tượng tham chiếu |
| :--- | :--- | :--- |
| [**Sơ Đồ Thực Thể Quan Hệ (ERD)**](./mo-hinh-thuc-the-erd.md) | Sơ đồ Mermaid ERD trực quan biểu diễn mối quan hệ 1-N, N-N giữa 26 bảng dữ liệu chia theo 5 miền | Giảng viên, Hội đồng, Developers |
| [**Từ Điển Dữ Liệu (Data Dictionary)**](./tu-dien-du-lieu.md) | Bảng mô tả chi tiết 26 bảng, kiểu dữ liệu từng cột, ràng buộc PK/FK, Nullable và chỉ mục | Fullstack Devs, QA, Auditors |
| [**Bản Đồ Lược Đồ CSDL Cho AI & Dev**](./db-schema-map.md) | Mô tả toàn bộ 26 bảng bằng lời: cột, FK, index, catalog trạng thái, quy tắc nghiệp vụ, mẫu query và các bẫy thường gặp | AI Agents, Backend Developers |
| [**Lịch Sử Migration Alembic**](./alembic-va-tien-hoa-schema.md) | Chuỗi 7 bản migration Alembic từ lúc khởi tạo đến hiện tại, cẩm nang lệnh vận hành an toàn | DevOps, SRE, Lead Developers |
| [**Chuyên Đề PostgreSQL Chuyên Sâu**](./postgresql-chuyen-sau.md) | Phân tích sâu về Full-Text Search (tsvector/GIN), Partial Indexes, Connection Pooling asyncpg, ACID và so sánh có cơ sở với MongoDB/MySQL/Elasticsearch | Hội đồng chấm, Phản biện đồ án |

---

## 3. Thống Kê Tổng Quan Về Lược Đồ (Schema Metrics)

- **Số lượng bảng dữ liệu nghiệp vụ**: `26` bảng (25 bảng thực thể Base + 1 bảng liên kết N-N `document_tags`).
- **Hệ thống ràng buộc khóa ngoại (Foreign Keys)**: `35+` ràng buộc liên kết toàn vẹn dữ liệu (`ON DELETE CASCADE` / `ON DELETE SET NULL`).
- **Chỉ mục chuyên dụng (Specialized Indexes)**:
  - Chỉ mục GIN (`ix_documents_search_vector`) trên cột `search_vector` (`tsvector`) phục vụ Full-Text Search tiếng Việt không dấu.
  - Chỉ mục Partial Unique Index (`uq_document_share_pending`) chống trùng lặp chia sẻ tài liệu đang chờ duyệt.
  - Chỉ mục Partial Index (`ix_documents_source_owner`) tăng tốc tra cứu nguồn gốc tài liệu đã clone mà chưa bị xóa mềm.
  - Chỉ mục B-Tree trên các cột tra cứu tần suất cao: `workspace_id`, `owner_id`, `created_at`, `status`.
