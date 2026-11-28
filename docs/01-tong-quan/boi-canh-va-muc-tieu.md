---
title: Bối Cảnh & Mục Tiêu Dự Án
sidebar_label: 🎯 Bối cảnh & Mục tiêu
sidebar_position: 2
---

# 🎯 BỐI CẢNH & MỤC TIÊU DỰ ÁN

## 1. Bối Cảnh Thực Tiễn & Bài Toán Cần Giải Quyết

Trong môi trường giáo dục đại học, tài liệu học thuật và học liệu số (giáo trình điện tử, đề cương, bài giảng, slide thuyết trình, đề thi mẫu, bài tập lớn) đóng vai trò sống còn trong hoạt động dạy và học. Tuy nhiên, thực tế tại nhiều cơ sở đào tạo hiện nay cho thấy:

### 1.1. Tình trạng phân tán và phân mảnh dữ liệu
- Tài liệu học tập thường được sinh viên và giảng viên trao đổi qua các kênh không chính thức và rời rạc: nhóm chat mạng xã hội (Zalo, Messenger, Telegram), dịch vụ đám mây cá nhân (Google Drive, Dropbox, OneDrive), hoặc USB.
- **Hệ quả**: Dữ liệu nhanh chóng bị thất lạc sau mỗi học kỳ, liên kết chia sẻ hết hạn, sinh viên khóa sau gặp khó khăn lớn trong việc tiếp cận nguồn học liệu kế thừa từ các khóa trước.

### 1.2. Trùng lặp dung lượng lưu trữ khổng lồ
- Cùng một tệp tài liệu giáo trình hay bài giảng thường được hàng trăm sinh viên tải về rồi tải ngược lên các không gian lưu trữ khác nhau.
- **Hệ quả**: Nếu không có cơ chế phát hiện nội dung trùng lặp, hạ tầng lưu trữ sẽ nhanh chóng bị quá tải bởi các tệp tin nhị phân có cùng nội dung byte-for-byte.

### 1.3. Thiếu kiểm soát bản quyền và thẩm định chất lượng
- Việc chia sẻ tự phát trên mạng xã hội tiềm ẩn nguy cơ tài liệu sai lệch kiến thức, tài liệu cũ chưa cập nhật hoặc vi phạm quy định sở hữu trí tuệ của nhà trường.
- **Hệ quả**: Cần một quy trình nộp duyệt chính quy (Submission & Review Workflow) có sự tham gia thẩm định của giảng viên hoặc quản trị viên trước khi công khai vào kho tài liệu chung.

---

## 2. Mục Tiêu Của Dự Án (Project Objectives)

Đồ án **Foundation Project** được xây dựng nhằm cung cấp một giải pháp phần mềm toàn diện, đáp ứng các mục tiêu cụ thể sau:

### 2.1. Mục tiêu chức năng (Functional Objectives)
- **Tập trung hóa tài liệu**: Xây dựng một cổng thông tin lưu trữ và chia sẻ học liệu thống nhất, phục vụ toàn diện giảng viên, sinh viên và cán bộ quản lý.
- **Mô hình 3 kho lưu trữ phân tầng**:
  1. *Kho cá nhân (Personal Repository)*: Không gian riêng tư để cá nhân quản lý tài liệu, ghi chú và danh sách đọc.
  2. *Kho nhóm (Workspace Repository)*: Không gian làm việc nhóm phục vụ nghiên cứu khoa học và bài tập lớn, có phân quyền quản trị nội bộ.
  3. *Kho học liệu số (Community Library)*: Kho tri thức chung của trường, phân loại theo Khoa/Viện và Môn học, có quy trình duyệt tài liệu nghiêm ngặt.
- **Tìm kiếm toàn văn thông minh**: Hỗ trợ tìm kiếm từ khóa tiếng Việt không dấu và có dấu, lọc theo nhiều tiêu chí (Khoa, Môn học, định dạng tệp, năm học).
- **Xem trước tài liệu trực tiếp**: Cho phép người dùng đọc trực tiếp tài liệu PDF, Office, Markdown và hình ảnh ngay trên trình duyệt mà không bắt buộc phải tải về máy.

### 2.2. Mục tiêu kỹ thuật & Kiến trúc (Technical Objectives)
- **Kiến trúc bất đồng bộ hiện đại**: Áp dụng Python FastAPI kết hợp SQLAlchemy 2.0 AsyncSession và driver `asyncpg` nhằm tối ưu hóa khả năng xử lý đồng thời (Concurrent Requests).
- **Khử trùng lặp nội dung (Deduplication)**: Sử dụng hàm băm mã hóa SHA-256 để tính toán dấu vân tay (checksum) của tệp tin, đảm bảo mỗi tệp nhị phân chỉ lưu một bản duy nhất trên đĩa cứng.
- **Chỉ số hóa CSDL quan hệ chuẩn mực**: Tận dụng tối đa sức mạnh của PostgreSQL với chỉ mục GIN trên `tsvector` cho Full-Text Search, Partial Unique Index chống xung đột dữ liệu và ràng buộc khóa ngoại chặt chẽ.
- **Khả năng chạy Cục bộ độc lập (Offline-First / Local Deployment)**: Hệ thống có thể triển khai trọn vẹn trên một máy tính cá nhân hoặc máy chủ nội bộ mà không đòi hỏi kết nối Internet hay chi phí thuê dịch vụ đám mây bên thứ ba.

---

## 3. Tiêu Chí Nghiệm Thu Đồ Án (Success Criteria)

| Tiêu chí | Chỉ số định lượng / Định tính | Phương pháp xác minh |
| :--- | :--- | :--- |
| **Độ toàn vẹn dữ liệu** | 100% tệp tải lên giữ nguyên checksum SHA-256 khi tải về | Kiểm tra mã băm SHA-256 trước và sau upload |
| **Tiết kiệm dung lượng** | Giảm thiểu lưu trữ trùng lặp: upload cùng 1 tệp N lần chỉ tốn dung lượng 1 lần | Kiểm tra thư mục vật lý `storage/` và bảng `documents` |
| **Độ trễ tìm kiếm** | Thời gian phản hồi truy vấn tìm kiếm FTS < 100ms trên môi trường local | Đo kiểm thời gian thực thi query qua logs backend |
| **Khả năng độc lập hạ tầng** | Khởi chạy và demo đầy đủ chức năng khi ngắt kết nối mạng Internet | Kiểm thử offline trên máy trạm chấm thi |
# Mở rộng AI/vector trong thư viện số

Người dùng thường tìm theo từ khóa nhưng không diễn đạt được ý định bằng đúng câu trong giáo trình; tài liệu dài khó khai thác, tag phải gắn thủ công và thiếu gợi ý tài liệu liên quan hoặc thống kê sở thích. Vì vậy hệ thống mở rộng PostgreSQL bằng FTS, embedding và hybrid retrieval để hỗ trợ học tập có căn cứ.

Mục tiêu cũng là thực hành PostgreSQL nâng cao: tsvector/GIN, unaccent, pgvector, JSONB, trigger, transaction và khóa hàng. Giá trị hướng tới sinh viên là tìm nhanh và hỏi theo bằng chứng; giảng viên có thể điều hướng học liệu và quan sát chủ đề quan tâm. Phạm vi hiện tại không tuyên bố generative AI nâng cao.
