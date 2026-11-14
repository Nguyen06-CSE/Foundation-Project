---
id: GLOSSARY
title: Thuật Ngữ Dự Án (Glossary)
sidebar_position: 6
---

# 📖 Từ Điển Thuật Ngữ Thống Nhất (Project Glossary)

Bảng thuật ngữ chuẩn hóa dưới đây định nghĩa chính xác các khái niệm kỹ thuật, mô hình nghiệp vụ và quy ước lập trình được sử dụng thống nhất xuyên suốt mã nguồn, cơ sở dữ liệu và toàn bộ hệ thống tài liệu của **Digital Library**.

---

## 1. Các Không Gian & Mô Hình Tổ Chức (Spaces & Structures)

| Thuật ngữ tiếng Anh | Thuật ngữ tiếng Việt | Định nghĩa & Ngữ cảnh áp dụng |
|---|---|---|
| **Personal Space** | Kho Lưu Trữ Cá Nhân | Không gian lưu trữ riêng tư tuyệt đối của từng người dùng (`user_id`). Chỉ chủ sở hữu mới có quyền truy cập, tạo thư mục và chỉnh sửa tài liệu. |
| **Group Workspace** | Không gian Nhóm | Không gian làm việc cộng tác giữa nhiều người dùng (`workspaces` với `type = 'group'`). Có phân quyền Trưởng nhóm (`owner`) và Thành viên (`member`). |
| **Class Space** | Không gian Lớp Học | Không gian gắn liền với mã lớp sinh hoạt/học phần thực tế, nơi ban cán sự lớp và giảng viên phân phối học liệu học tập. |
| **Faculty Space** | Kho Học Liệu Khoa | Nơi tập hợp đề cương môn học, bài giảng và tài liệu học thuật chính thức được quản lý bởi Quản trị viên Khoa (`faculty_admin`). |
| **Community Library** | Kho Cộng Đồng Toàn Trường | Thư viện mở toàn trường chứa các tài liệu công khai (`is_public = True`), cho phép tìm kiếm, đánh giá và lưu về kho cá nhân. |
| **Workspace Context** | Ngữ cảnh Làm việc | Biến trạng thái định danh môi trường thao tác hiện tại (`'personal'`, `'group'`, `'library'`), dùng để xác định phạm vi truy vấn và phân quyền. |
| **Folder** | Thư mục | Cấu trúc phân cấp hình cây dùng để gom nhóm tài liệu trong kho cá nhân hoặc nhóm làm việc. |
| **Workspace Tag** | Nhãn Không Gian | Thẻ phân loại linh hoạt được tạo theo từng không gian làm việc, cho phép gắn nhiều nhãn lên cùng một tài liệu hoặc thư mục. |
| **Document Version** | Phiên bản Tài liệu | Bản ghi lịch sử chỉnh sửa tài liệu (`document_versions`), cho phép người dùng xem lại và khôi phục các phiên bản cũ đã tải lên. |

---

## 2. Lưu Trữ & Vòng Đời Dữ Liệu (Storage & Data Lifecycle)

| Thuật ngữ | Khái niệm & Cơ chế kỹ thuật |
|---|---|
| **Document Cloning / Forking** *(Nhân bản độc lập)* | Cơ chế khi một người dùng lưu tài liệu từ Kho cộng đồng hoặc Nhóm về Kho cá nhân. Hệ thống tạo một bản ghi độc lập mới trong cơ sở dữ liệu (sao chép metadata và liên kết file vật lý). Người nhận có thể ghi chú, gắn thẻ riêng mà **không làm thay đổi bản gốc**. |
| **Checksum (Mã băm SHA-256)** | Chuỗi ký tự độ dài cố định 64 ký tự hex sinh ra từ toàn bộ nội dung nhị phân của tệp tin. Dùng để định danh duy nhất nội dung file, không phụ thuộc vào tên file hay thời gian tạo. |
| **Deduplication (Khử trùng lặp)** | Quá trình kiểm tra mã băm SHA-256 trước khi lưu tệp tin. Nếu phát hiện tệp tin đã tồn tại trong cùng không gian, hệ thống sẽ tái sử dụng tệp hiện có hoặc cảnh báo người dùng, ngăn chặn lãng phí dung lượng đĩa cứng. |
| **Hybrid Storage Architecture** | Kiến trúc hỗ trợ chuyển đổi linh hoạt giữa lưu trữ đám mây **Cloudflare R2** (giao thức S3 API, 0đ phí truyền tải) cho môi trường Production và **Local Filesystem** cho môi trường phát triển ngoại tuyến (Offline Local). |
| **Zero Egress Fees** | Chính sách không thu phí băng thông chiều ra từ Cloudflare R2, giúp nhà trường tiết kiệm 100% chi phí truyền tải file so với các dịch vụ đám mây truyền thống như AWS S3 hay Google Cloud Storage. |
| **Soft Delete (Xóa mềm)** | Khi xóa tài liệu, bản ghi chỉ được đánh dấu trạng thái `is_deleted = True` và chuyển vào Thùng rác (`trash`), file vật lý vẫn được bảo toàn để người dùng có thể khôi phục lại bất kỳ lúc nào. |
| **Hard Purge (Xóa vĩnh viễn)** | Thao tác xóa triệt để bản ghi khỏi cơ sở dữ liệu và xóa file vật lý tương ứng khỏi Cloudflare R2 / Local Filesystem. Được thực hiện thủ công bởi người dùng hoặc tự động sau 30 ngày. |
| **Retention Policy** | Chính sách lưu giữ rác: Hệ thống tự động xóa vĩnh viễn các tài liệu nằm trong thùng rác quá **30 ngày** thông qua tác vụ định kỳ nền (APScheduler Job). |

---

## 3. Xử Lý & Hiển Thị (Processing & Rendering)

| Thuật ngữ | Ý nghĩa kỹ thuật |
|---|---|
| **Multi-View Modes** | Bộ 3 chế độ hiển thị danh sách tài liệu trên giao diện: **Lưới (Grid View)** hiển thị ảnh bìa nổi bật, **Danh sách (List View)** hiển thị thông tin rút gọn, và **Chi tiết (Detail View)** hiển thị đầy đủ thông số kỹ thuật. |
| **Thumbnail** | Ảnh thu nhỏ đại diện cho tài liệu, được sinh tự động từ trang đầu tiên của file PDF/DOCX hoặc do người dùng tùy chọn tải lên làm ảnh bìa. |
| **OCR (Optical Character Recognition)** | Công nghệ nhận diện chữ từ hình ảnh hoặc tài liệu scan qua công cụ mã nguồn mở Tesseract OCR, giúp biến tài liệu dạng ảnh thành văn bản có thể tìm kiếm được. |
| **FTS (Full-Text Search)** | Cỗ máy tìm kiếm toàn văn tích hợp của PostgreSQL sử dụng kiểu dữ liệu `tsvector` (chỉ mục từ vựng) và toán tử `tsquery` để tìm kiếm tài liệu theo ngữ nghĩa và từ khóa nội dung. |
| **Shiki Syntax Highlighter** | Thư viện tô màu cú pháp mã nguồn phía Client, cung cấp giao diện hiển thị code tương tự các IDE chuyên nghiệp (VS Code) cho hơn 100 ngôn ngữ lập trình. |

---

## 4. Tương Tác & Đo Lường (Interactions & Metrics)

| Thuật ngữ | Định nghĩa & Công thức áp dụng |
|---|---|
| **Activity Tracking** | Tiến trình ghi nhận toàn bộ tương tác của người dùng (xem, tải, lưu, thích, xóa) vào bảng nhật ký biến cố append-only `download_logs`. |
| **Trending Score** | Điểm số đánh giá mức độ hấp dẫn của tài liệu trong cộng đồng. Được tính dựa trên số lượt xem, tải, đánh giá kết hợp với **hàm suy hao thời gian** (Time Decay), giúp các tài liệu hữu ích gần đây luôn được ưu tiên hiển thị. |
| **Submission** | Yêu cầu do sinh viên hoặc giảng viên gửi lên để đề xuất một tài liệu từ kho cá nhân/nhóm vào Kho học liệu chung của trường, chờ Quản trị viên Khoa phê duyệt. |
| **Document Bundle** | Gói tài liệu gồm nhiều tệp tin liên quan (ví dụ: "Bộ đề thi và bài giảng Giải Tích 1"), cho phép tải về một lần hoặc chia sẻ nhanh chỉ với một mã định danh. |
| **Rating & Review** | Điểm số đánh giá từ 1 đến 5 sao kèm bình luận nhận xét của người học dành cho tài liệu trong Kho học liệu cộng đồng. |
