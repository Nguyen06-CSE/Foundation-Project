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
- Xử lý upload hiện dùng FastAPI `BackgroundTasks`; bảng `processing_jobs` là cấu trúc legacy/deprecated và không phải nguồn trạng thái chính của pipeline hiện tại.

---

## 5. Tương Tác API & Giao Diện Người Dùng
- `GET /documents/{id}/preview`: Lấy URL hoặc luồng stream phục vụ xem trước.
- `GET /documents/{id}/thumbnail`: Lấy ảnh thu nhỏ trang bìa.
- `GET /documents/{id}/raw`: Tải xuống tệp tin gốc.
- **Giao diện**: Modal `DocumentPreviewModal.tsx` tích hợp thanh công cụ: phóng to/thu nhỏ (Zoom), chuyển trang PDF, chế độ toàn màn hình (Fullscreen) và nút tải về máy.

---

## 6. Giới Hạn Kỹ Thuật
- Đối với các tệp tin Microsoft Office phức tạp (.docx, .pptx lớn có macro), hệ thống ưu tiên cho người dùng tải về máy thay vì dựng hoàn hảo 100% định dạng trên trình duyệt.

## Từ tệp gốc đến bản đọc Markdown

Ví dụ, khi tải một bài giảng DOCX, người dùng nhận được bản ghi sau khi API commit. FastAPI sau đó chạy `_process_document_background` bằng `BackgroundTasks`. Bản gốc vẫn truy cập qua `file_path`. Nếu đã tái sử dụng đủ nội dung, ảnh bìa và Markdown từ bản cùng checksum, tác vụ kết thúc ngay.

1. Backend đọc tệp trên đĩa. Với tệp chỉ có ở R2, backend tải một bản tạm về máy để thư viện nhận được đường dẫn cục bộ.
2. Backend trích xuất văn bản cho `documents.content` và thử tạo ảnh bìa. Để tạo bản đọc Markdown, backend gọi trực tiếp `anydoc.to_markdown(path)` của gói Python `firecrawl-anydoc==0.2.4`. Với mã nguồn hoặc văn bản thuần, Pygments nhận diện ngôn ngữ và backend bọc nội dung trong khối mã Markdown. [Kho mã nguồn Firecrawl AnyDoc](https://github.com/firecrawl/anydoc)
3. Khi chuyển đổi trả về nội dung, backend ghi UTF‑8 vào `storage/markdowns/{document_id}.md`. Ở chế độ R2, tác vụ gửi bản Markdown lên cùng key với kiểu `text/markdown`. PostgreSQL lưu đường dẫn trong `documents.markdown_path`. Nếu chưa có ảnh bìa, tác vụ có thể lấy ảnh đầu tiên trong Markdown.
4. Giao diện dùng đường dẫn này để đọc bản Markdown. Nếu thư viện lỗi hoặc trả về văn bản rỗng, tác vụ không gán đường dẫn Markdown mới. Người dùng vẫn có thể truy cập bản gốc. Tệp tạm tải về được dọn sau xử lý.

[Hàm chuyển đổi](../../backend/app/services/file_processor.py) · [Tác vụ sau upload](../../backend/app/routers/documents.py)
# Tích hợp indexing/summary/citation

Preview không trả full content; index status, summary và citation dùng active run. Summary coexist với description, không persist overwrite. Xem [tài liệu AI](./10-tra-cuu-ho-tro-AI-va-goi-y-noi-dung.md).
