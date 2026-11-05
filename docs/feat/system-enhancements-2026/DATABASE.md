# Database Design: System Enhancements (2026)

Tài liệu thiết kế lược đồ cơ sở dữ liệu (Database Schema), các mối quan hệ (Relationships), chỉ mục (Indexes), quy tắc toàn vẹn dữ liệu (Integrity & Cascades) và cơ chế tự phục hồi DDL cho các tính năng mới.

---

## 1. Lược Đồ Bảng Mới: `user_todos`

Bảng `user_todos` lưu trữ các công việc cần làm cá nhân của người dùng, liên kết trực tiếp với tài liệu hoặc nhóm học tập nếu có.

### 1.1. Cấu trúc cột (Columns Definition)

```sql
CREATE TABLE IF NOT EXISTS user_todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    target_document_id INTEGER NULL REFERENCES documents(id) ON DELETE SET NULL,
    target_workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE SET NULL,
    custom_link VARCHAR(255) NULL,
    start_at TIMESTAMPTZ NULL,
    due_at TIMESTAMPTZ NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    reminded_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2. Chi tiết các trường (Field Specifications)

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mục đích & Ý nghĩa |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Định danh duy nhất của công việc. |
| `user_id` | `INTEGER` | `NOT NULL, FK -> users(id)` | Người sở hữu công việc (Cascade delete khi xóa user). |
| `title` | `VARCHAR(255)` | `NOT NULL` | Tiêu đề công việc (tối thiểu 1 ký tự, tối đa 255 ký tự). |
| `description`| `TEXT` | `NULLABLE` | Ghi chú hoặc mô tả chi tiết công việc. |
| `task_type` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'custom'` | Loại công việc: `read_doc`, `upload_group_doc`, `view_group_doc`, `custom`. |
| `target_document_id` | `INTEGER` | `NULLABLE, FK -> documents(id)` | ID tài liệu mục tiêu (tự gán `NULL` nếu tài liệu bị xóa vĩnh viễn). |
| `target_workspace_id`| `INTEGER` | `NULLABLE, FK -> workspaces(id)` | ID nhóm mục tiêu (tự gán `NULL` nếu nhóm bị giải tán). |
| `custom_link`| `VARCHAR(255)`| `NULLABLE` | URL hoặc route nội bộ tùy chọn cho loại `custom`. |
| `start_at` | `TIMESTAMPTZ` | `NULLABLE` | Thời điểm bắt đầu công việc. |
| `due_at` | `TIMESTAMPTZ` | `NULLABLE` | Hạn chót hoàn thành (deadline). Điều kiện: `due_at >= start_at`. |
| `is_completed` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Cờ trạng thái đã hoàn thành công việc hay chưa. |
| `completed_at` | `TIMESTAMPTZ` | `NULLABLE` | Dấu thời gian khi công việc được đánh dấu hoàn thành. |
| `reminded_at` | `TIMESTAMPTZ` | `NULLABLE` | Dấu thời gian scheduler gửi thông báo nhắc hạn (tránh gửi lặp lại). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Thời điểm tạo bản ghi. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Thời điểm cập nhật bản ghi gần nhất. |

### 1.3. Chỉ mục tối ưu truy vấn (Indexes)

```sql
-- Tìm kiếm nhanh danh sách việc cần làm của user
CREATE INDEX IF NOT EXISTS ix_user_todos_user_id ON user_todos(user_id);

-- Lọc công việc theo hạn chót (phục vụ scheduler quét thông báo)
CREATE INDEX IF NOT EXISTS ix_user_todos_due_at ON user_todos(due_at);

-- Tối ưu hóa truy vấn lọc việc chưa hoàn thành của user
CREATE INDEX IF NOT EXISTS ix_user_todos_user_completed ON user_todos(user_id, is_completed);
```

### 1.4. SQLAlchemy ORM Model (`app/models/todo.py`)

```python
class UserTodo(Base):
    __tablename__ = "user_todos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(50), nullable=False, default="custom")
    target_document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    target_workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    custom_link = Column(String(255), nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True, index=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    reminded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", backref=backref("todos", cascade="all, delete-orphan"))
    target_document = relationship("Document", foreign_keys=[target_document_id])
    target_workspace = relationship("Workspace", foreign_keys=[target_workspace_id])
```

---

## 2. Nâng Cấp Bảng `notifications`

Để hỗ trợ điều hướng trực tiếp (Deep-linking) đến các đối tượng liên quan (như bài nộp duyệt kho học liệu hoặc thẻ việc cần làm cụ thể), bảng `notifications` được bổ sung cột `link` và nới rộng cột `type`.

### 2.1. Cập nhật DDL
```sql
-- Mở rộng độ dài type từ VARCHAR(20) lên VARCHAR(50) để hỗ trợ các event type dài
ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50);

-- Bổ sung cột lưu đường dẫn deep-link
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255) NULL;
```

### 2.2. Ý nghĩa trường `link`
- Định dạng: Chuỗi route nội bộ React Router, ví dụ:
  - `/library/admin/submissions?status=pending&highlight_submission=14`
  - `/personal?highlight_todo=8`
- Khi client hiển thị danh sách thông báo hoặc thanh Attention banner, nếu có `link`, hành động click sẽ đồng thời gọi `PATCH /notifications/{id}/read` và chuyển hướng tới đường dẫn này.

---

## 3. Các Thao Tác Cơ Sở Dữ Liệu Phức Tạp (Complex DB Operations)

### 3.1. Gộp Nhãn (Merge Tags) trong `POST /tags/merge`
Khi gộp danh sách các `source_tag_ids` vào một `target_tag_id`:
1. Bảng `document_tags` và `folder_tags` sử dụng khóa chính phức hợp `(document_id, tag_id)` hoặc `(folder_id, tag_id)`.
2. Nếu document/folder đã có sẵn `target_tag_id`, việc `UPDATE tag_id = target_tag_id` sẽ gây ra lỗi vi phạm ràng buộc duy nhất (`UniqueViolationError`).
3. **Giải pháp thực hiện trong transaction**:
   - Truy vấn các tài liệu đang có cả nhãn nguồn lẫn nhãn đích.
   - Xóa liên kết của nhãn nguồn trên những tài liệu đó.
   - Cập nhật các liên kết nhãn nguồn còn lại sang `target_tag_id`.
   - Áp dụng tương tự cho bảng `folder_tags`.
   - Xóa toàn bộ các bản ghi `source_tag_ids` khỏi bảng `tags`.

### 3.2. Xóa hàng loạt có bảo toàn cây thư mục Bundle
Trong `POST /documents/bulk-delete`:
- Khi xóa mềm tài liệu cha (`is_bundle = True`), hệ thống tự động quét tất cả các tài liệu con (`bundle_parent_id = doc.id`) và cập nhật đồng bộ:
  ```python
  document.is_deleted = True
  document.deleted_at = now
  if document.is_bundle:
      # Cascade soft-delete xuống children
      await db.execute(
          update(Document)
          .where(Document.bundle_parent_id == document.id, Document.is_deleted == False)
          .values(is_deleted=True, deleted_at=now)
      )
  ```

---

## 4. Cơ Chế Migration & Tự Phục Hồi DDL (Auto-Healing)

Nhằm đảm bảo dự án có thể chạy trơn tru ở mọi môi trường (Local Docker, Test DB hoặc Serverless Neon Postgres) mà không bị phụ thuộc cứng vào việc chạy lệnh Alembic thủ công, hệ thống hỗ trợ song song hai cơ chế:

1. **Alembic Version File**:
   - Tệp: `alembic/versions/a1b2c3d4e5f6_add_notifications_link_and_user_todos.py`
   - Thực thi các hàm `upgrade()` và `downgrade()` chuẩn chỉ.
2. **Auto-DDL trong Startup Event (`backend/app/main.py`)**:
   - Tại sự kiện `@app.on_event("startup")`, backend tự động thực thi các câu lệnh `IF NOT EXISTS` để kiểm tra và tạo bảng `user_todos` cùng cột `notifications.link` nếu chưa tồn tại.
   - Giúp các môi trường CI/CD và dev environment chạy ngay mà không bao giờ gặp lỗi `UndefinedTable` hay `UndefinedColumn`.
