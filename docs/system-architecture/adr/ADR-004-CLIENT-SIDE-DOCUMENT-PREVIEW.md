---
id: ADR-004-CLIENT-SIDE-DOCUMENT-PREVIEW
title: "ADR-004: Dựng Hình Xem Trước Tài Liệu Phía Trình Duyệt"
sidebar_position: 5
---

# 📜 ADR-004: Dựng Hình Xem Trước Tài Liệu Phía Trình Duyệt (Client-Side Preview)

---

## 1. Trạng Thái
* **Trạng thái:** `Accepted` (Đã phê duyệt và đang vận hành)
* **Ngày quyết định:** 15/10/2026
* **Người phê duyệt:** Nhóm Kiến Trúc Giao Diện (Frontend Lead)

---

## 2. Bối Cảnh (Context)
Sinh viên cần xem trước nội dung tài liệu (PDF, Word, Code, Markdown) trực tiếp trên trình duyệt mà không cần tải file về máy. Có hai giải pháp kiến trúc để xử lý:
1. **Dựng hình tại Máy Chủ (Server-Side Conversion):** Máy chủ chuyển đổi file Word/PDF sang ảnh hoặc HTML tĩnh rồi truyền về Client.
2. **Dựng hình tại Trình Duyệt (Client-Side Rendering):** Trình duyệt nhận tệp tin nhị phân trực tiếp từ Cloudflare R2 CDN và tự phân tích, render sang DOM/Canvas.

---

## 3. Các Phương Án Đã Cân Nhắc
1. **Phương án A: Chuyển đổi tại Máy chủ (Server-Side Conversion qua LibreOffice / Poppler)**
   * *Ưu điểm:* Client nhận trực tiếp mã HTML/ảnh nhẹ.
   * *Nhược điểm nghiêm trọng:* 
     * LibreOffice headless trên máy chủ tiêu tốn lượng CPU và RAM khổng lồ (thường xuyên gây treo server khi có 10 người cùng xem file Word).
     * Backend phải làm nhiệm vụ streaming file chuyển đổi, làm mất đi lợi thế truyền tải trực tiếp từ Edge CDN của Cloudflare R2.
2. **Phương án B: Dựng hình trực tiếp tại Trình duyệt Client (Client-Side Edge Rendering)**
   * *Ưu điểm:* 
     * **Giảm 95% tải CPU cho máy chủ:** Tận dụng năng lực tính toán phân tán của máy tính/điện thoại người dùng.
     * Tận dụng tốc độ CDN toàn cầu của Cloudflare R2 để tải trực tiếp file thô.
     * Ứng dụng các thư viện JavaScript hiện đại: `docx-preview` phân tích OpenXML sang HTML, `PDF.js` render Canvas, và `shiki` tô màu cú pháp code.

---

## 4. Quyết Định (Decision)
**Quyết định lựa chọn Phương án B (Dựng hình tại Client-side).**  
Xây dựng module `DocumentDetail/viewers/` gồm 5 bộ đọc chuyên dụng:
* `PdfViewer`: Render qua PDF.js Canvas.
* `DocxViewer`: Render trực tiếp OpenXML sang DOM qua `docx-preview`.
* `CodeViewer`: Highlight cú pháp IDE qua `shiki`.
* `MarkdownViewer`: Render HTML qua `react-markdown`.
* `OfficeViewer`: Nhúng iframe Google Docs / Office Online cho file PPTX/XLSX.

---

## 5. Hệ Quả & Đánh Đổi (Consequences)
* **Tích cực:** 
  * Máy chủ Backend duy trì trạng thái cực kỳ nhẹ nhàng (Stateless & Lightweight), không bao giờ bị nghẽn CPU do tác vụ chuyển đổi tài liệu.
  * Tốc độ nạp tài liệu xem trước tiệm cận tức thì khi tệp đã được cache trên CDN trình duyệt.
* **Tiêu cực / Rủi ro:** 
  * Trình duyệt của thiết bị di động cấu hình rất yếu có thể mất thêm 200-500ms để phân tích các tệp Word phức tạp có hàng trăm trang.
