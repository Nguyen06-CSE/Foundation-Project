# 🚀 Lộ Trình Phát Triển & Định Hướng Tương Lai (Roadmap)

> **Mô tả:** Tài liệu này phác thảo các mục tiêu phát triển, các tính năng mới và định hướng công nghệ trong các giai đoạn tiếp theo của dự án.
> **Mục tiêu cốt lõi:** Nâng cao hiệu suất, tối ưu hóa trải nghiệm người dùng, mở rộng tính năng quản trị và tích hợp Trí tuệ Nhân tạo (AI).

---

## 📍 Phase 1: Tối Ưu Nền Tảng & Tương Tác Thời Gian Thực (Core & Real-time)
*Tập trung vào việc củng cố cấu trúc dữ liệu dưới nền và mang lại trải nghiệm mượt mà không độ trễ.*

### 1. Tối ưu lại logic lưu trữ và chia sẻ của hệ thống
* **Vấn đề:** Logic hiện tại có thể chưa đáp ứng tốt khi số lượng file lớn hoặc khi phân quyền chia sẻ chéo phức tạp.
* **Gợi ý triển khai:**
  * Áp dụng cơ chế **Deduplication** (Khử trùng lặp file): Nếu 2 người tải lên cùng 1 file, hệ thống chỉ lưu 1 bản vật lý (so sánh qua `checksum.py` đã có) và trỏ reference tới cả 2 người dùng để tiết kiệm ổ cứng.
  * Tái cấu trúc bảng phân quyền (RBAC) để hỗ trợ chia sẻ theo link (Public/Private/Password protected).

### 2. Tích hợp Real-time (WebSockets) cho không gian nhóm
* **Mục tiêu:** Tự động cập nhật tài liệu/thông báo mới trong Group mà không cần F5 (refresh) trang.
* **Gợi ý triển khai:**
  * **Backend:** Tận dụng module `websockets` được hỗ trợ sẵn cực tốt trong FastAPI. Sử dụng **Redis Pub/Sub** để broadcast event nếu chạy nhiều worker.
  * **Frontend:** Dùng Socket.io-client hoặc native WebSocket API. Bắt event `onDocumentUploaded` để thêm file mới thẳng vào state của danh sách tài liệu.

---

## 📍 Phase 2: Mở Rộng UI/UX & Cung Cấp Công Cụ Quản Trị
*Cung cấp cho người dùng các không gian làm việc cá nhân hóa và cấp cho Admin công cụ kiểm soát hệ thống.*

### 3. Thêm trang "Cá nhân" (Personal Home / Quick Access)
* **Mục tiêu:** Màn hình đầu tiên sau khi đăng nhập để người dùng thao tác nhanh nhất.
* **Gợi ý triển khai:**
  * Chứa khu vực **"Truy cập gần đây" (Recent Files)**.
  * Khu vực **"Tài liệu được ghim" (Pinned/Starred)**.
  * Nút "Upload nhanh" to, rõ ràng và biểu đồ nhỏ về dung lượng lưu trữ cá nhân.

### 4. Thêm trang Dashboard (Tổng quan dữ liệu)
* **Mục tiêu:** Trực quan hoá dữ liệu hoạt động.
* **Gợi ý triển khai:**
  * Biểu đồ heatmap (như Github) về tần suất học tập/đọc tài liệu.
  * Biểu đồ tròn (Pie chart) phân tích loại tài liệu đang sở hữu (PDF, Word, Excel...).
  * Thống kê số lượt tải xuống (Download logs) hoặc lượt view của tài liệu public.

### 5. Thêm trang Thông báo (Notifications Center)
* **Mục tiêu:** Quản lý tập trung các luồng thông báo.
* **Gợi ý triển khai:** 
  * Phân loại tab: Tất cả / Lời mời vào nhóm / Hệ thống / Đề xuất.
  * Nút "Đánh dấu tất cả đã đọc" (Mark all as read). 

### 6. Thêm trang dành riêng cho Role Quản trị (Admin Panel)
* **Mục tiêu:** Quản lý tổng thể hệ thống (Người dùng, Tài nguyên, Cấu hình).
* **Gợi ý triển khai:**
  * Quản lý User (Khóa, mở, cấp dung lượng).
  * Kiểm duyệt tài liệu được đóng góp lên Thư viện cộng đồng (Community Library).
  * Xem log hệ thống và trạng thái storage.

### 7. Thêm "Cài đặt hệ thống sâu" (Advanced Settings)
* **Mục tiêu:** Cá nhân hóa ứng dụng cho từng người dùng.
* **Gợi ý triển khai:**
  * Cài đặt giao diện (Dark/Light/System mode).
  * Cài đặt mặc định quyền riêng tư khi upload file.
  * Quản lý phiên đăng nhập (Sessions - log out khỏi thiết bị khác).

---

## 📍 Phase 3: Tích Hợp Trí Tuệ Nhân Tạo (AI Powered Features)
*Nâng tầm dự án thành "Smart Digital Library" bằng cách để AI làm thay các công việc thủ công.*

### 8. AI tự động gán nhãn (Auto-tagging) cho tài liệu
* **Mục tiêu:** Khi upload, AI quét nội dung và tự đề xuất tags phù hợp mà người dùng không cần gõ.
* **Gợi ý triển khai:**
  * Dùng các mô hình NLP nhỏ chạy local (như `BART-large-MNLI` cho Zero-shot classification) hoặc gọi API (Gemini/OpenAI) phân tích trang đầu tiên của file để rút trích từ khóa chính.

### 9. Nâng cấp mô hình OCR Đa ngôn ngữ (Ảnh chụp, Viết tay)
* **Mục tiêu:** Trích xuất chữ từ ảnh chụp giáo trình mờ, chữ viết tay của sinh viên.
* **Gợi ý triển khai:**
  * Nếu chạy nội bộ (Self-hosted): Cân nhắc dùng **PaddleOCR** hoặc **EasyOCR** (tốt hơn Tesseract trong việc nhận diện đa ngôn ngữ và bố cục phức tạp).
  * Nếu dùng Cloud API: Google Cloud Vision API có khả năng nhận diện chữ viết tay (handwriting) tiếng Việt cực kỳ ấn tượng.

### 10. AI Tổng hợp dữ liệu & Trợ lý học tập (Lấy cảm hứng từ NotebookLM)
* **Mục tiêu:** Chọn nhiều file tài liệu trong một Bundle, và chat trực tiếp với các tài liệu đó (Hỏi đáp, tóm tắt, tạo câu hỏi trắc nghiệm).
* **Gợi ý triển khai:**
  * Áp dụng kiến trúc **RAG (Retrieval-Augmented Generation)**.
  * Sử dụng thư viện **LangChain** hoặc **LlamaIndex** ở backend (FastAPI).
  * Vector Database (như **ChromaDB**, **pgvector** hoặc **Qdrant**) để lưu trữ embedding của các đoạn text trong tài liệu.
  * LLM: Có thể dùng Google Gemini API (có context window rất lớn phù hợp cho tài liệu dài).

---

## 📍 Phase 4: Nghiên Cứu & Mở Rộng
### 11. Khảo sát & Mở rộng phương thức lưu trữ
* **Mục tiêu:** Thu thập ý kiến người dùng để định hình các tính năng nâng cao.
* **Gợi ý triển khai:**
  * Nghiên cứu tính năng **Version Control** cho tài liệu (Lưu lại các bản sửa đổi của file Word/Excel thay vì ghi đè).
  * Khảo sát nhu cầu liên kết với Cloud bên ngoài (Google Drive, OneDrive, Dropbox integration) để kéo file trực tiếp vào hệ thống mà không cần tải xuống/tải lên lại.