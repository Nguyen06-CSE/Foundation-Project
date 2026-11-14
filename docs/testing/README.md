---
title: Chiến Lược Kiểm Thử & Đảm Bảo Chất Lượng
sidebar_label: 🧪 Tổng quan Kiểm thử
sidebar_position: 1
---

# Chiến Lược Kiểm Thử & Đảm Bảo Chất Lượng — Foundation Project

Chào mừng bạn đến với tài liệu hướng dẫn và chiến lược kiểm thử của **Foundation Project**. Tài liệu này trình bày các tầng bảo chứng chất lượng phần mềm, cách thức thực thi các bộ kiểm thử tự động, danh mục các ca kiểm thử (Test Cases) trọng yếu và báo cáo hiện trạng giới hạn kỹ thuật của hệ thống.

---

## 1. Hiện Trạng Các Tầng Kiểm Thử (Testing Matrix)

| Tầng kiểm thử | Công nghệ sử dụng | Phạm vi bao phủ hiện tại | Trạng thái xác thực |
| :--- | :--- | :--- | :--- |
| **Backend Integration & Unit Tests** | `pytest 8.4`, `pytest-asyncio`, `httpx` (AsyncClient) | 12 file test trong `backend/tests/` bao phủ Auth, Document CRUD, Deduplication, Sharing RBAC, Library, Search | **Đã tự động hóa (Automated)** |
| **Frontend Static Analysis & Types** | `TypeScript 6.0` (`tsc -b`), `oxlint 1.79` | Kiểm tra nghiêm ngặt kiểu dữ liệu toàn bộ codebase React và lint cú pháp hiện đại | **Đã tự động hóa (Automated)** |
| **Frontend Component & E2E Tests** | Chưa tích hợp bộ runner tự động | Thao tác thủ công trên trình duyệt (Manual exploratory testing) | **Khoảng trống (Testing Gap)** |
| **Database Migration Integrity** | `Alembic 1.16` | Kiểm tra tính nhất quán của chuỗi 7 migration và trigger PostgreSQL FTS | **Đã tự động hóa (Automated)** |
| **Documentation & Broken Links** | Docusaurus Build Engine | Build static HTML và kiểm tra toàn bộ liên kết nội bộ | **Đã tự động hóa (Automated)** |

---

## 2. Bản Đồ Tài Liệu Kiểm Thử

| Tài liệu | Nội dung chi tiết | Đối tượng tham chiếu |
| :--- | :--- | :--- |
| [**Chiến Lược Kiểm Thử (Testing Strategy)**](./TESTING_STRATEGY.md) | Kim tự tháp kiểm thử, cơ chế Async Fixtures, phương pháp kiểm tra Deduplication và RBAC | QA Leads, Senior Backend Devs |
| [**Cẩm Nang Thực Thi Kiểm Thử (Running Tests)**](./RUNNING_TESTS.md) | Hướng dẫn chi tiết lệnh chạy Pytest, TypeScript check, Oxlint và Docusaurus build | All Developers, DevOps, CI/CD |
| [**Danh Mục Ca Kiểm Thử (Test Cases)**](./TEST_CASES.md) | Bảng đặc tả các ca kiểm thử chuẩn (Preconditions, Steps, Expected Results) ánh xạ từ Use Cases | QA Engineers, Business Analysts |
| [**Hiện Trạng Chất Lượng & Giới Hạn (Quality & Limitations)**](./QUALITY_AND_KNOWN_LIMITATIONS.md) | Đánh giá trung thực các khoảng trống kỹ thuật, các giới hạn đã biết và lộ trình cải tiến | Project Managers, Stakeholders |

---

## 3. Nguyên Tắc Kiểm Thử Cốt Lõi

1. **Thực tế & Không suy đoán**: Mọi khẳng định về kiểm thử trong tài liệu phải dựa trên mã kiểm thử thực tế đang chạy được trong thư mục `backend/tests/` hoặc kịch bản chạy lệnh CI/CD.
2. **Cô lập dữ liệu (Test Isolation)**: Mỗi bài kiểm thử cần dọn dẹp hoặc khởi tạo lại trạng thái để không gây phụ thuộc chéo vào kết quả của các bài test khác.
3. **Môi trường sát thực tế**: Do hệ thống sử dụng các tính năng đặc thù của PostgreSQL (như `tsvector` FTS, Partial Unique Index), các bài test tích hợp cần được chạy trên cơ sở dữ liệu PostgreSQL thực tế thay vì SQLite in-memory nhằm phát hiện sớm các lỗi cú pháp SQL đặc thù.
