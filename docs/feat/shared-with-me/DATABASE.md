# Database Design: Shared With Me Feature

## Schema Updates

### 1. Bảng `document_shares`
Tài liệu được chia sẻ trực tiếp giữa các người dùng được lưu trữ trong bảng `document_shares`.

Cấu trúc cột trong cơ sở dữ liệu (`alembic/versions/dae4972dff87_init_full_db_elibrary.py` & `app/models/document_share.py`):
- `id` (Integer, Primary Key, Autoincrement): ID bản ghi chia sẻ.
- `document_id` (Integer, ForeignKey(`documents.id`), Nullable=False): ID tài liệu được chia sẻ.
- `source_document_id` (Integer, ForeignKey(`documents.id`), Nullable=False): ID tài liệu gốc. Khi tạo bản ghi mới, code backend truyền `source_document_id = document.source_document_id or document_id`.
- `from_user_id` (Integer, ForeignKey(`users.id`), Nullable=False): ID người gửi chia sẻ (chủ sở hữu).
- `to_user_id` (Integer, ForeignKey(`users.id`), Nullable=False): ID người nhận chia sẻ.
- `share_type` (String(20), Nullable=False): Mặc định là `"personal"`.
- `created_at` (DateTime with timezone, server_default=`now()`, Nullable=False): Thời điểm chia sẻ.

### 2. Tái sử dụng bảng `notes` cho Lời nhắn chia sẻ
Hệ thống không tạo cột lời nhắn trực tiếp trong `document_shares` mà tái sử dụng bảng `notes` hiện có.

Cấu trúc bảng `notes` (`app/models/note.py`):
- `id` (Integer, Primary Key, Autoincrement): ID ghi chú.
- `document_id` (Integer, ForeignKey(`documents.id`), Nullable=False): ID tài liệu.
- `user_id` (Integer, ForeignKey(`users.id`), Nullable=False): ID người tạo lời nhắn (`from_user_id`).
- `note` (Text, Nullable=False): Nội dung lời nhắn.
- `created_at` (DateTime with timezone, server_default=`now()`, Nullable=False): Thời điểm tạo lời nhắn.

### Hạn chế kỹ thuật về việc tái sử dụng bảng `notes`
> [!WARNING] Known Limitation: Gắn lời nhắn qua bảng `notes`
> Khi truy xuất danh sách `GET /documents/shared-with-me`, backend tìm lời nhắn bằng cách query bản ghi `Note` mới nhất (`order_by(Note.created_at.desc()).limit(1)`) có cặp `document_id` và `user_id == from_user_id`. 
> - Cách làm này chưa phân biệt được giữa **ghi chú cá nhân** do người gửi tạo trước đó trên tài liệu với **lời nhắn chia sẻ** thực sự.
> - Nếu người gửi tạo ghi chú mới cho tài liệu sau khi chia sẻ, lời nhắn hiển thị trên trang chia sẻ của người nhận sẽ bị cập nhật theo ghi chú mới nhất đó.

## Relationships (ORM)
- `DocumentShare` không thiết lập mối quan hệ ORM truy cập ngược `relationship` trực tiếp tới `Document` hay `User` trong `app/models/document_share.py`, các truy vấn dữ liệu liên quan được thực hiện qua các câu lệnh `JOIN` tường minh ở tầng Router Service.
- `Note` có quan hệ ORM:
  - `document`: `relationship("Document", back_populates="notes")`
  - `user`: `relationship("User", back_populates="notes")`
