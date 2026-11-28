---
title: Kiến Trúc Hệ Thống (System Architecture)
sidebar_label: 🏛️ Tổng quan kiến trúc
sidebar_position: 1
---

# 🏛️ TỔNG QUAN KIẾN TRÚC HỆ THỐNG — FOUNDATION PROJECT

Phân hệ tài liệu này mô tả chi tiết toàn bộ thiết kế kiến trúc phần mềm của **Foundation Project**, từ mô hình phân tầng tổng thể, kiến trúc Backend bất đồng bộ, giao diện người dùng React, cơ chế lưu trữ tệp tin cục bộ cho đến hệ thống an ninh bảo mật và các biên bản quyết định kiến trúc cốt lõi (ADR).

---

## 🗺️ Bản Đồ Tài Liệu Kiến Trúc

| Tài liệu | Trọng tâm thiết kế & Nội dung học thuật |
| :--- | :--- |
| [**Kiến Trúc Tổng Thể & Mô Hình C4**](./tong-quan-kien-truc.md) | Phân tầng kiến trúc, mô hình C4 và phân tích đánh đổi giữa Monolith tách rời SPA so với Microservices |
| [**Kiến Trúc Backend FastAPI**](./backend-fastapi.md) | Vận hành bất đồng bộ (Async I/O), mô hình Router-Service-Model và vòng đời `AsyncSession` |
| [**Kiến Trúc Frontend React**](./frontend-react.md) | Thiết kế Single Page Application (SPA), cơ chế phân rã component, quản lý trạng thái và lưu trữ View Mode |
| [**Đặc Tả Quy Trình Hoạt Động Hệ Thống**](./quy-trinh-hoat-dong-he-thong.md) | Luồng upload, deduplication, xử lý nền, thumbnail, Markdown, FTS, thùng rác và trạng thái AI |
| [**Hệ Thống Lưu Trữ Tập Tin Cục Bộ**](./he-thong-luu-tru-tap-tin.md) | Kiến trúc lưu trữ đĩa cứng cục bộ, giải thuật băm SHA-256 khử trùng lặp và phân tích so sánh với S3 |
| [**Kiến Trúc Bảo Mật & Phân Quyền**](./bao-mat-va-phan-quyen.md) | Xác thực JSON Web Token, băm mật khẩu `bcrypt`, mô hình phân quyền hai lớp (RBAC + Object-Level) |
| [**Biên Bản Quyết Định Kiến Trúc (ADR)**](./quyet-dinh-kien-truc/ADR-001-LOCAL-STORAGE-ARCHITECTURE.md) | 5 quyết định kiến trúc trọng yếu: Lưu trữ cục bộ, Nhân bản tài liệu, PostgreSQL FTS, Xem trước Client-side, SHA-256 |
# Kiến trúc AI/vector

Đọc [ADR-006](./quyet-dinh-kien-truc/ADR-006-POSTGRESQL-HYBRID-RAG-PGVECTOR.md), [kiến trúc AI/vector](./ai-vector-va-rag-co-ban.md) và [quy trình hệ thống](./quy-trinh-hoat-dong-he-thong.md).
