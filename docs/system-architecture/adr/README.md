---
id: README
title: Danh Mục Hồ Sơ Quyết Định Kiến Trúc (ADR)
sidebar_position: 1
slug: /system-architecture/adr
---

# 📜 Hồ Sơ Quyết Định Kiến Trúc (Architecture Decision Records - ADR)

Thư mục này lưu trữ các **Bản ghi Quyết định Kiến trúc (ADR)** quan trọng nhất đã định hình nên cấu trúc kỹ thuật của hệ thống **Digital Library**. Mỗi bản ghi mô tả bối cảnh bài toán, các phương án kỹ thuật được cân nhắc, quyết định cuối cùng và những hệ quả/đánh đổi (Trade-offs) đi kèm.

---

## 📋 Danh Mục Các Quyết Định Kiến Trúc Đã Ban Hành

| Mã ADR | Tiêu đề quyết định | Trạng thái | Ngày quyết định | Tóm tắt giải pháp lựa chọn |
|:---:|---|:---:|:---:|---|
| **[ADR-001](./ADR-001-HYBRID-STORAGE-R2-LOCAL.md)** | **Kiến trúc Lưu trữ Lai (Cloudflare R2 + Local Storage)** | `Accepted` | 10/2026 | Sử dụng Cloudflare R2 để đạt 0đ chi phí egress trên Production, hỗ trợ fallback Local Filesystem khi chạy Offline. |
| **[ADR-002](./ADR-002-DOCUMENT-CLONING-FORKING.md)** | **Mô hình Nhân bản Độc lập (Document Cloning / Forking)** | `Accepted` | 10/2026 | Tạo bản ghi mới độc lập khi lưu tài liệu về kho cá nhân thay vì tạo con trỏ liên kết (Shortcut/Symlink). |
| **[ADR-003](./ADR-003-POSTGRESQL-FULLTEXT-SEARCH.md)** | **Tìm kiếm Toàn văn Tích hợp qua PostgreSQL FTS** | `Accepted` | 10/2026 | Sử dụng `tsvector`/`tsquery` tích hợp của PostgreSQL thay vì triển khai cụm máy chủ Elasticsearch/Meilisearch. |
| **[ADR-004](./ADR-004-CLIENT-SIDE-DOCUMENT-PREVIEW.md)** | **Dựng hình Xem trước Tài liệu Phía Trình Duyệt (Client-Side Preview)** | `Accepted` | 10/2026 | Dùng `docx-preview`, `shiki`, HTML5 Canvas để render tệp tin tại Client, giảm 90% tải CPU máy chủ. |
| **[ADR-005](./ADR-005-SHA256-DEDUPLICATION.md)** | **Khử Trùng Lặp Tệp Tin Bằng Mã Băm SHA-256** | `Accepted` | 10/2026 | Nhận diện bản chất nhị phân tệp tin bằng mã băm SHA-256 tính toán qua cơ chế luồng đệm RAM 64KB. |
