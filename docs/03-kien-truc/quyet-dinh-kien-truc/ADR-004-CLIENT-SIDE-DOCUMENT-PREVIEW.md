---
title: "ADR-004: Cơ Chế Xem Trước Tài Liệu Trực Tiếp Phía Client (Client-Side Preview)"
sidebar_label: "ADR-004: Xem trước tài liệu"
sidebar_position: 4
---

# ADR-004: CƠ CHẾ XEM TRƯỚC TÀI LIỆU TRỰC TIẾP PHÍA CLIENT

- **Trạng thái**: Đã chấp thuận (Accepted)
- **Ngày quyết định**: 2026-10-25

---

## 1. Bối Cảnh
Người dùng cần xem nhanh nội dung tài liệu (PDF, Word, Markdown, ảnh) trước khi quyết định tải về máy.

## 2. Quyết Định
Chúng tôi lựa chọn giải pháp **Dựng xem trước tại trình duyệt Client**:
- Tệp PDF: Sử dụng thư viện `pdfjs-dist` dựng trực tiếp trên thẻ Canvas HTML5.
- Tệp Markdown: Phân tích cú pháp và dựng HTML tức thì bằng `react-markdown`.
- Tệp văn phòng DOCX/PPTX: Dựng khung nhúng xem nhanh hoặc tải về luồng stream.

## 3. Hệ Quả
- **Ưu điểm**: Giảm tải hoàn toàn tài nguyên CPU cho máy chủ Backend (không phải chạy LibreOffice headless để convert file sang PDF trên server).
- **Hạn chế**: Trình duyệt của máy khách cấu hình yếu có thể bị tải nặng khi render các tệp PDF scan dung lượng hàng trăm trang.
