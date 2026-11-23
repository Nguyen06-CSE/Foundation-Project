---
title: Từ Điển Thuật Ngữ Kỹ Thuật (Glossary)
sidebar_label: 📖 Thuật ngữ
sidebar_position: 4
---

# 📖 TỪ ĐIỂN THUẬT NGỮ KỸ THUẬT (GLOSSARY)

Tài liệu này chuẩn hóa toàn bộ các thuật ngữ kỹ thuật tiếng Anh và tiếng Việt được sử dụng trong mã nguồn, cơ sở dữ liệu và hệ thống tài liệu của **Foundation Project**.

---

## A - D

### Access Token
Mã thông báo truy cập có thời hạn ngắn (mặc định 30 phút), định dạng JSON Web Token (JWT), được máy khách gửi kèm tiêu đề `Authorization: Bearer <token>` trong mỗi yêu cầu API để xác thực danh tính.

### Alembic
Công cụ di chuyển và quản lý phiên bản lược đồ cơ sở dữ liệu (Database Migration Tool) dành cho Python và SQLAlchemy, cho phép theo dõi lịch sử thay đổi cấu trúc bảng dưới dạng mã nguồn có khả năng nâng cấp (`upgrade`) và hạ cấp (`downgrade`).

### AsyncSession
Phiên làm việc cơ sở dữ liệu bất đồng bộ trong SQLAlchemy 2.0, vận hành trên nền tảng Python `asyncio` và driver `asyncpg`, cho phép thực thi truy vấn I/O không chặn (Non-blocking I/O).

### Checksum (Mã kiểm tra)
Chuỗi băm có độ dài cố định sinh ra từ nội dung nhị phân của tệp tin. Dự án sử dụng thuật toán **SHA-256** để tạo mã checksum đại diện duy nhất cho từng tệp.

### Community Library (Kho học liệu số cộng đồng)
Phân hệ lưu trữ và chia sẻ học liệu công khai của trường, được tổ chức theo cấu trúc hình cây: Khoa/Viện (`faculties`) -> Môn học (`subjects`) -> Tài liệu/Bộ học liệu (`documents`/`bundles`).

### Deduplication (Khử trùng lặp lưu trữ)
Kỹ thuật phát hiện và loại bỏ các bản sao dữ liệu trùng lặp. Khi người dùng tải lên tệp tin có cùng mã băm SHA-256 với tệp đã có trên máy chủ, hệ thống chỉ lưu một tệp nhị phân duy nhất trên đĩa cứng và liên kết các bản ghi logic tương ứng vào cùng đường dẫn vật lý này.

---

## F - P

### Forking / Cloning (Nhân bản tài liệu)
Hành vi tạo một bản sao độc lập của tài liệu từ Kho học liệu số hoặc Kho nhóm về Kho cá nhân của người dùng, giúp người dùng có thể tự do ghi chú, chỉnh sửa mà không ảnh hưởng đến bản gốc.

### Full-Text Search (FTS - Tìm kiếm toàn văn)
Kỹ thuật tìm kiếm văn bản nâng cao trong cơ sở dữ liệu dựa trên việc phân tích ngữ pháp, tách từ và lập chỉ mục nội dung, vượt trội hơn so với phép so khớp chuỗi thông thường (`LIKE %query%`).

### GIN Index (Generalized Inverted Index)
Kiểu chỉ mục đảo ngược nâng cao của PostgreSQL, đặc biệt tối ưu cho các kiểu dữ liệu có thể chứa nhiều phần tử bên trong một giá trị đơn lẻ, chẳng hạn như `tsvector` trong tìm kiếm toàn văn hoặc mảng (`ARRAY`).

### Local Storage (Lưu trữ cục bộ)
Cơ chế lưu trữ tệp tin trực tiếp trên hệ thống tập tin (Filesystem) của máy chủ cục bộ tại thư mục `backend/storage/`, phục vụ tốt nhất cho kịch bản triển khai offline và bảo vệ đồ án.

### Partial Unique Index (Chỉ mục duy nhất có điều kiện)
Chỉ mục trong PostgreSQL áp dụng tính duy nhất chỉ trên một tập con các hàng thỏa mãn mệnh đề `WHERE`. Ví dụ: `uq_document_share_pending` chỉ đảm bảo không trùng lặp chia sẻ khi trạng thái đang là `pending`.

---

## R - W

### RBAC (Role-Based Access Control)
Mô hình kiểm soát truy cập dựa trên vai trò, phân định quyền hạn thực thi các thao tác hệ thống theo chức danh của người dùng (Admin, Teacher, Student).

### Soft Delete (Xóa mềm)
Kỹ thuật đánh dấu bản ghi đã bị xóa bằng cờ logic (`is_deleted = true`) thay vì xóa vĩnh viễn dòng dữ liệu khỏi bảng (`DELETE FROM`), cho phép phục hồi dữ liệu từ Thùng rác khi cần thiết.

### tsquery
Kiểu dữ liệu biểu diễn câu truy vấn tìm kiếm toàn văn trong PostgreSQL, chứa các từ khóa kết hợp với các toán tử logic như `&` (AND), `|` (OR), `!` (NOT).

### tsvector
Kiểu dữ liệu danh sách các từ tố (lexeme) đã được chuẩn hóa và loại bỏ trùng lặp trong PostgreSQL, dùng để phục vụ tìm kiếm toàn văn với tốc độ cao.

### Workspace (Không gian làm việc nhóm)
Môi trường cộng tác khép kín dành cho một nhóm người dùng, hỗ trợ chia sẻ tài liệu, gắn nhãn nhóm và phân quyền thành viên theo 3 cấp độ: Owner, Admin, Member.
