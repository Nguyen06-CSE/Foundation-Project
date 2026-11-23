---
title: Phân Hệ 05 — Xem Trước & Xử Lý Nội Dung Tài Liệu
sidebar_label: 05. Xem Trước & Nội Dung
sidebar_position: 7
---

# 👁️ PHÂN HỆ 05: XEM TRƯỚC & XỬ LÝ NỘI DUNG TÀI LIỆU (PREVIEW & MARKDOWN)

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ
Giúp người dùng đọc nhanh nội dung tài liệu ngay trên trình duyệt mà không bắt buộc phải tải tệp tin về máy tính cá nhân; đồng thời cung cấp môi trường biên soạn và xuất bản ghi chú Markdown trực tiếp.

---

## 2. Kiến Trúc Xem Trước Phía Trình Duyệt (Client-Side Preview Architecture)

```
+--------------------------------------------------------------------------------------------------+
|                                  CƠ CHẾ XEM TRƯỚC PHÂN THEO ĐỊNH DẠNG TỆP                         |
|                                                                                                  |
| [ 1. Tệp PDF ]             [ 2. Tệp Markdown (.md) ]       [ 3. Tệp Hình Ảnh ]  [ 4. Tệp Văn Phòng ] |
| (PDF.js HTML5 Canvas)      (react-markdown + Prism)        (Thẻ HTML <img>)     (Tải xuống / Stream) |
| - Render trực tiếp vector   - Dựng cây DOM an toàn          - Hỗ trợ phóng to,   - Hiển thị thông tin |
| - Chuyển trang, phóng to    - Đánh dấu cú pháp Code         - Xoay ảnh, thu nhỏ  - Xem trước trang bìa |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Quy Tắc Nghiệp Vụ & An Toàn Nội Dung (Business Rules)
1. **Trích xuất ảnh bìa/Thumbnail tự động**:
   - Khi tài liệu PDF được tải lên, hệ thống tự động sinh ảnh thu nhỏ của trang đầu tiên (`storage/{owner_id}/{uuid}_thumb.jpg`) để hiển thị trên giao diện thẻ (Grid Card).
2. **Bảo mật nội dung Markdown**:
   - Tệp ghi chú Markdown do người dùng soạn thảo được làm sạch (Sanitize) trước khi dựng thành HTML nhằm loại trừ triệt để nguy cơ tấn công Cross-Site Scripting (XSS).
3. **Phân phối luồng tập tin (File Streaming)**:
   - API phục vụ tệp tin sử dụng `StreamingResponse` hoặc `FileResponse` với tiêu đề `Accept-Ranges: bytes`, cho phép trình duyệt tải từng phần tệp tin lớn (Chunked Download / Partial Content 206).

---

## 4. Mô Hình Dữ Liệu Liên Quan
- `documents.thumbnail_path`: Đường dẫn ảnh thu nhỏ trang bìa.
- `documents.markdown_path`: Đường dẫn tệp Markdown lưu kèm.
- `processing_jobs`: Bảng theo dõi tiến độ các tác vụ xử lý tệp chạy nền (`pending`, `processing`, `completed`, `failed`).

---

## 5. Tương Tác API & Giao Diện Người Dùng
- `GET /documents/{id}/preview`: Lấy URL hoặc luồng stream phục vụ xem trước.
- `GET /documents/{id}/thumbnail`: Lấy ảnh thu nhỏ trang bìa.
- `GET /documents/{id}/raw`: Tải xuống tệp tin gốc.
- **Giao diện**: Modal `DocumentPreviewModal.tsx` tích hợp thanh công cụ: phóng to/thu nhỏ (Zoom), chuyển trang PDF, chế độ toàn màn hình (Fullscreen) và nút tải về máy.

---

## 6. Giới Hạn Kỹ Thuật
- Đối với các tệp tin Microsoft Office phức tạp (.docx, .pptx lớn có macro), hệ thống ưu tiên cho người dùng tải về máy thay vì dựng hoàn hảo 100% định dạng trên trình duyệt.
