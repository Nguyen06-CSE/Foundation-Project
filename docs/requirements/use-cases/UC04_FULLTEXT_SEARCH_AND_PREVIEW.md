---
id: UC04_FULLTEXT_SEARCH_AND_PREVIEW
title: "UC-04: Tìm Kiếm Toàn Văn & Xem Trước Đa Định Dạng"
sidebar_position: 5
---

# 🔍 UC-04: Tìm Kiếm Toàn Văn & Xem Trước Đa Định Dạng (Search & Preview)

---

## 1. Thông Tin Tổng Quan
* **Mã nghiệp vụ:** `UC-04`
* **Tác nhân chính:** Toàn bộ người dùng (Sinh viên, Giảng viên, Khách vãng lai).
* **Mục tiêu:** 
  1. Định vị nhanh chóng tài liệu học tập dựa trên từ khóa ngữ nghĩa trong tiêu đề và nội dung văn bản trích xuất.
  2. Xem trước trực tiếp tệp tin với độ trễ thấp ngay trên trình duyệt mà không cần tải file về máy tính cá nhân.
* **Mức độ ưu tiên:** Khẩn cấp (P0).
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`

---

## 2. Luồng Nghiệp Vụ Tìm Kiếm Toàn Văn (Full-Text Search Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Học
    participant UI as Search Bar (React Frontend)
    participant API as Search Router (routers/search.py)
    participant DB as PostgreSQL Database (tsvector Index)

    User->>UI: Nhập từ khóa tìm kiếm (Ví dụ: "Giải tích 1 chuỗi fourier")
    UI->>UI: Debounce 300ms chống spam request
    UI->>API: GET /search?q=giai+tich+1&mime=pdf&sort=trending
    API->>API: Tiền xử lý từ khóa thành chuỗi `to_tsquery('simple', ...)`
    API->>DB: Thực thi truy vấn Full-Text Search trên trường `search_vector`<br/>kèm tính toán độ tương đồng `ts_rank`
    DB-->>API: Trả về danh sách tài liệu khớp kèm đoạn trích dẫn (Snippets)
    API-->>UI: 200 OK (Danh sách kết quả phân trang)
    UI-->>User: Hiển thị kết quả tìm kiếm với từ khóa được bôi đậm (Highlight)
```

### Các tiêu chí lọc kết hợp (Multi-filter):
* **Theo Định dạng (MIME Type):** Lọc riêng PDF, Word, Excel, Slide trình chiếu hoặc Mã nguồn.
* **Theo Đơn vị Đào tạo:** Lọc theo Khoa quản lý và Môn học cụ thể.
* **Theo Tiêu chí Sắp xếp:** Sắp xếp theo Độ phù hợp nhất (`relevance`), Mới cập nhật nhất (`created_at`), hoặc Đang được quan tâm nhất (`trending_score`).

---

## 3. Luồng Nghiệp Vụ Xem Trước Đa Định Dạng (Multi-Format Preview Flow)

Khi người dùng bấm vào một tài liệu trong danh sách, hệ thống tự động xác định định dạng tệp tin và kích hoạt bộ dựng hình (Viewer) phù hợp:

```mermaid
graph TD
    Click["Người dùng bấm 'Xem chi tiết tài liệu'"] --> CheckMIME{"Xác định kiểu MIME của tệp"}

    CheckMIME -->|"PDF (application/pdf)"| PDFViewer["1. PdfViewer Component<br/>Render từng trang qua HTML5 Canvas"]
    CheckMIME -->|"Word (.docx)"| DocxViewer["2. DocxViewer Component<br/>Phân tích OpenXML sang DOM qua docx-preview"]
    CheckMIME -->|"Mã Nguồn (.py, .ts, .cpp...)"| CodeViewer["3. CodeViewer Component<br/>Tô màu cú pháp chuyên nghiệp qua Shiki"]
    CheckMIME -->|"Markdown (.md)"| MDViewer["4. MarkdownViewer Component<br/>Render HTML kèm bảng mục lục (TOC)"]
    CheckMIME -->|"Excel / Slide (.xlsx, .pptx)"| OfficeViewer["5. OfficeViewer Component<br/>Nhúng iframe Google Docs / Office Online"]
```

### Ưu điểm vượt trội của giải pháp xem trước:
1. **Tiết kiệm 90% dung lượng:** Người dùng không cần tải các tệp tin 20-30MB về điện thoại/máy tính để chỉ đọc lướt một vài trang thông tin.
2. **An toàn thiết bị:** Tránh hoàn toàn nguy cơ máy tính người dùng bị lây nhiễm virus hay mã độc ẩn trong các tệp tin tải về.
3. **Tương thích hoàn hảo:** Mọi định dạng văn phòng phổ biến đều hiển thị đẹp mắt, đồng nhất trên mọi trình duyệt web.
