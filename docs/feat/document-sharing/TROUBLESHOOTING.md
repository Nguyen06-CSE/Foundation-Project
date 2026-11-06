# Troubleshooting: Các Sự cố đã Gặp & Giải pháp Triệt để

Tài liệu này ghi lại chi tiết các lỗi phát sinh trong quá trình vận hành chức năng chia sẻ tài liệu, nguyên nhân gốc rễ (root cause) và giải pháp kỹ thuật đã áp dụng.

---

## 1. Sự cố 1: Lỗi khi người nhận chấp nhận tài liệu (Accept Share 500)

### Hiện tượng
Khi người nhận bấm nút "Chấp nhận" một tài liệu được chia sẻ, hệ thống báo lỗi 500 Internal Server Error, không thể hoàn tất việc sao chép tài liệu vào kho.

### Phân tích log Backend:
```
UniqueViolationError: duplicate key value violates unique constraint "document_stats_pkey"
DETAIL: Key (document_id)=(70) already exists.
```

### Nguyên nhân gốc rễ (Root Cause):
Trong hàm `_copy_doc_to_user`, hệ thống gọi hàm `_record_share_log` hai lần trong cùng một phiên làm việc (`db: AsyncSession`):
1. Lần 1: Ghi log `ActivityAction.SHARED` trên tài liệu gốc.
2. Lần 2: Ghi log `ActivityAction.RECEIVED` trên bản sao vừa tạo (`new_doc.id`).

Trong code cũ của `_record_share_log`:
```python
# CODE CŨ GÂY LỖI:
stats = await db.get(DocumentStats, document_id)
if not stats:
    stats = DocumentStats(document_id=document_id, share_count=1)
    db.add(stats)
else:
    stats.share_count += 1
```
Khi xử lý tài liệu mới tạo, `db.get(DocumentStats, new_doc.id)` trả về `None` nên code thực hiện `db.add(stats)`. Tuy nhiên, vì transaction chưa được `flush()` hay `commit()`, nếu có thao tác ghi log liên tiếp hoặc bundle copy, SQLAlchemy tạo 2 instance `DocumentStats` riêng biệt cho cùng một `document_id`. Khi `await db.commit()`, lệnh SQL INSERT được gửi xuống hai lần, vi phạm ràng buộc khóa chính `document_stats_pkey` của PostgreSQL.

### Giải pháp triệt để:
Thay thế hoàn toàn khối code non-atomic bằng câu lệnh PostgreSQL Atomic Upsert:
```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

upsert_stmt = (
    pg_insert(DocumentStats)
    .values(
        document_id=document_id,
        share_count=1,
        trending_score=0.0,
    )
    .on_conflict_do_update(
        index_elements=["document_id"],
        set_={
            "share_count": DocumentStats.share_count + 1,
            "last_accessed_at": now,
        },
    )
)
await db.execute(upsert_stmt)
```
PostgreSQL tự động xử lý xung đột khóa chính ở tầng lưu trữ nguyên tử. Không bao giờ phát sinh `UniqueViolationError` nữa.

---

## 2. Sự cố 2: Gửi trùng lặp yêu cầu chia sẻ và spam Notification

### Hiện tượng
Người dùng bấm liên tục nút "Chia sẻ" hoặc chia sẻ lại tài liệu cho cùng một người khi yêu cầu cũ vẫn đang chờ xác nhận (`pending`). Hệ thống chấp nhận cả 2 yêu cầu và gửi 2 Notification giống hệt nhau cho người nhận.

### Nguyên nhân gốc rễ:
Code cũ chỉ kiểm tra trùng bằng câu lệnh SELECT ở tầng ứng dụng:
1. `SELECT * FROM document_shares WHERE ...`
2. `IF not exists: INSERT INTO document_shares ...`

Hai request đồng thời (hoặc click nhanh) cùng SELECT thấy chưa có dòng nào, sau đó cùng thực hiện INSERT. Đây là lỗi kinh điển **Race Condition Check-Then-Act**.

### Giải pháp triệt để:
1. **PostgreSQL Partial Unique Index**:
   ```sql
   CREATE UNIQUE INDEX uq_document_share_pending 
   ON document_shares (from_user_id, to_user_id, source_document_id)
   WHERE status = 'pending' AND source_document_id IS NOT NULL;
   ```
2. **Atomic Insert Idempotency**:
   ```python
   insert_stmt = (
       pg_insert(DocumentShare)
       .values(...)
       .on_conflict_do_nothing(
           index_elements=["from_user_id", "to_user_id", "source_document_id"],
           index_where=text("status = 'pending' AND source_document_id IS NOT NULL"),
       )
       .returning(DocumentShare.id)
   )
   created_id = (await db.execute(insert_stmt)).scalar_one_or_none()
   ```
3. **Chỉ gửi thông báo khi `created_id is not None`**:
   Nếu request bị xung đột, `created_id` là `None` -> Bỏ qua tạo Notification, không spam người nhận.
4. **React Query Prefetch & UI Guard**:
   Frontend hiển thị badge `[Đang chờ duyệt]` ngay khi mở modal và tự động disable nút submit nếu tất cả người nhận đều đã pending hoặc đã sở hữu tài liệu.

---

## 3. Sự cố 3: Lỗi 500 CORS khi lấy danh sách tài liệu (`GET /documents/`)

### Hiện tượng
Giao diện kho cá nhân báo không có tài liệu, Console hiển thị lỗi CORS và 500 Internal Server Error.

### Nguyên nhân gốc rễ:
Khi nối dữ liệu JSONB `null` trong PostgreSQL bằng toán tử `||`:
```sql
'null'::jsonb || '{"is_shared": true}'::jsonb
-- Kết quả tạo ra mảng JSON: [null, {"is_shared": true}] thay vì object!
```
Khi Pydantic serialize đối tượng sang schema `DocumentOut` với trường `metadata: Optional[Dict[str, Any]]`, Pydantic gặp giá trị dạng `list` nên ném `ValidationError: Input should be a valid dictionary`. Do lỗi 500 xảy ra trước khi FastAPI kịp ghi nhận middleware CORS, trình duyệt báo lỗi CORS.

### Giải pháp triệt để:
1. Viết script chuẩn hóa dữ liệu `backend/db/sync_share_schema.py`:
   ```sql
   UPDATE documents
   SET metadata = '{}'::jsonb
   WHERE metadata IS NULL OR jsonb_typeof(metadata) != 'object';
   ```
2. Thêm validator `@field_validator("metadata_", mode="before")` trong `DocumentOut` để tự động unwrap và chuẩn hóa nếu gặp `list` chứa object.
