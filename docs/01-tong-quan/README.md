---
title: Tổng Quan Dự Án Thư Viện Số
sidebar_label: 📌 Tổng quan
sidebar_position: 1
---

# 📌 TỔNG QUAN DỰ ÁN THƯ VIỆN SỐ (FOUNDATION PROJECT)

Chào mừng bạn đến với phân hệ tài liệu tổng quan của **Foundation Project** — Nền tảng quản lý, lưu trữ và chia sẻ học liệu số phân tầng dành cho môi trường giáo dục đại học.

Phân hệ này cung cấp bức tranh toàn cảnh về dự án: từ bài toán thực tiễn cần giải quyết, mục tiêu kỹ thuật, ranh giới phạm vi sản phẩm cho đến hệ thống thuật ngữ chuẩn hóa được sử dụng xuyên suốt tài liệu và mã nguồn.

---

## 🗺️ Danh Mục Tài Liệu Trong Phân Hệ

| Tài liệu | Nội dung trọng tâm | Đối tượng tham chiếu |
| :--- | :--- | :--- |
| [**Bối Cảnh & Mục Tiêu Dự Án**](./boi-canh-va-muc-tieu.md) | Phân tích bài toán quản trị học liệu tại trường đại học, mục tiêu SMART và tiêu chí đánh giá thành công | Hội đồng chấm, Giảng viên, Nhóm phát triển |
| [**Phạm Vi Sản Phẩm & 3 Kho Lưu Trữ**](./pham-vi-san-pham.md) | Ranh giới 3 kho lưu trữ cốt lõi (Cá nhân, Nhóm, Học liệu), vai trò người dùng và ma trận phân quyền | Quản trị viên, QA, Hội đồng |
| [**Từ Điển Thuật Ngữ Kỹ Thuật**](./thuat-ngu.md) | Giải thích các khái niệm kỹ thuật Anh - Việt: FTS, GIN, Deduplication, SHA-256, RBAC, Soft Delete... | Lập trình viên mới, Độc giả tài liệu |

---

## 🎯 Điểm Nhấn Khác Biệt Của Đồ Án

1. **Mô hình 3 Kho Lưu Trữ Độc Lập**: Tách biệt rõ ràng giữa nhu cầu cá nhân (*Private*), cộng tác nhóm nghiên cứu (*Workspace*) và kho học liệu thẩm định toàn trường (*Community Library*).
2. **Khử Trùng Lặp Tệp Tin Nhị Phân (SHA-256 Deduplication)**: Tối ưu hóa dung lượng lưu trữ cục bộ bằng kỹ thuật lưu trữ đơn bản (Single Instance Storage).
3. **Bộ Máy Tìm Kiếm Toàn Văn Tích Hợp (PostgreSQL FTS & GIN Index)**: Tìm kiếm văn bản tiếng Việt không dấu hiệu năng cao mà không phát sinh chi phí vận hành cụm tìm kiếm độc lập.
4. **Vận Hành 100% Cục Bộ (Localhost-First)**: Đảm bảo khả năng cài đặt, chạy demo và bảo vệ đồ án trơn tru mà không phụ thuộc vào kết nối Internet hay dịch vụ đám mây thương mại.
