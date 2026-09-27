# Database Design: Favorites Feature

## Schema Updates

### Bảng `favorites`

Tính năng Yêu thích sử dụng bảng `favorites` để quản lý mối quan hệ nhiều-nhiều giữa người dùng và tài liệu.

Cấu trúc cột trong cơ sở dữ liệu (`alembic/versions/dae4972dff87_init_full_db_elibrary.py` & `app/models/favorite.py`):

- `user_id` (Integer, ForeignKey(`users.id`), Primary Key, Nullable=False): ID người dùng yêu thích tài liệu.
- `document_id` (Integer, ForeignKey(`documents.id`), Primary Key, Nullable=False): ID tài liệu được yêu thích.
- `created_at` (DateTime with timezone, server_default=`now()`, Nullable=False): Thời điểm đánh dấu yêu thích.

### Primary Key & Constraints

- Khóa chính kép (Composite Primary Key): `(user_id, document_id)`.
- Ràng buộc này đảm bảo một người dùng chỉ có thể yêu thích một tài liệu tối đa 1 lần, chống trùng lặp dữ liệu ở tầng cơ sở dữ liệu.

## Relationships (ORM)

- **`Favorite` Model** (`app/models/favorite.py`):
  - `user`: `relationship("User", back_populates="favorites")`
  - `document`: `relationship("Document")`
- **`User` Model** (`app/models/user.py`):
  - `favorites`: `relationship("Favorite", back_populates="user", cascade="all, delete-orphan")`

## Query Patterns

Khi lấy danh sách tài liệu yêu thích (`GET /favorites/`), backend thực hiện query:

```python
select(Document, Favorite.created_at)\
    .join(Favorite, Favorite.document_id == Document.id)\
    .options(selectinload(Document.tags))\
    .where(Favorite.user_id == current_user.id, Document.is_deleted == False)\
    .order_by(Favorite.created_at.desc())
```

Query này join bảng `documents` và `favorites`, tự động lọc bỏ các tài liệu đã bị xóa mềm (`is_deleted == True`) và sắp xếp giảm dần theo thời gian đánh dấu yêu thích.
