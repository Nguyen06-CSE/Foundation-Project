# Database: Kiến trúc & Tối ưu chuyên sâu với PostgreSQL

Tài liệu này trình bày chi tiết về mô hình dữ liệu, chiến lược lập chỉ mục (indexing), và các tính năng đặc thù của **PostgreSQL** được áp dụng để đảm bảo tính toàn vẹn dữ liệu, chống race condition, và đạt hiệu năng tối đa cho tính năng Chia sẻ tài liệu.

---

## 1. Mô hình bảng `document_shares`
Được định nghĩa tại: `backend/app/models/document_share.py`

```sql
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    source_workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    share_type VARCHAR(20) NOT NULL DEFAULT 'direct',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    message VARCHAR(500),
    expires_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'utc')
);
```

### Các trạng thái hợp lệ (`status`)
1. `pending`: Đang chờ người nhận quyết định (chấp nhận hoặc từ chối).
2. `accepted`: Người nhận đã chấp nhận, bản sao `document_id` đã được tạo trong kho cá nhân.
3. `auto_accepted`: Cấp bậc người gửi cao hơn người nhận, tự động duyệt và tạo bản sao ngay lập tức.
4. `rejected`: Người nhận từ chối lời mời (không tạo bản sao).
5. `withdrawn`: Người gửi chủ động rút lại yêu cầu chia sẻ khi còn đang ở trạng thái pending.
6. `expired`: Yêu cầu chia sẻ hết hạn chờ (mặc định sau 30 ngày).

---

## 2. Tính năng độc đáo của PostgreSQL được ứng dụng

### 2.1. PostgreSQL Partial Unique Index (`uq_document_share_pending`)
Khác với MySQL hay một số RDBMS khác đòi hỏi Unique Constraint phải áp dụng trên toàn bộ bảng (hoặc phải dùng trigger/stored procedures phức tạp), **PostgreSQL hỗ trợ Partial Unique Index có mệnh đề điều kiện `WHERE`**.

#### Câu lệnh chỉ mục:
```sql
CREATE UNIQUE INDEX uq_document_share_pending 
ON document_shares (from_user_id, to_user_id, source_document_id)
WHERE status = 'pending' AND source_document_id IS NOT NULL;
```

#### Vì sao giải pháp này tối ưu vượt trội?
- **Chống Race Condition tuyệt đối**: Khi 2 request gửi đồng thời (ví dụ người dùng click đúp, mở 2 tab trình duyệt, hoặc retry mạng), PostgreSQL lập tức chặn đứng bản ghi thứ 2 ở mức lưu trữ, bất kể logic kiểm tra ở tầng ứng dụng (application code) có bị lọt hay không.
- **Bảo toàn 100% lịch sử (Audit Trail)**: Thay vì phải `DELETE` bản ghi cũ để gửi lại, khi một yêu cầu pending chuyển sang `accepted`, `rejected`, `withdrawn`, hoặc `expired`, **dòng dữ liệu đó tự động rời khỏi Partial Index**. Bộ ba `(from_user_id, to_user_id, source_document_id)` lập tức được giải phóng để có thể tạo yêu cầu pending mới trong tương lai. Toàn bộ lịch sử các lần gửi, từ chối, rút lại vẫn được lưu giữ trọn vẹn trong bảng!
- **Tiết kiệm dung lượng RAM/Disk của Index**: Index chỉ chứa con trỏ tới các dòng có `status = 'pending'`, vốn chỉ chiếm một tỉ lệ rất nhỏ so với toàn bộ dữ liệu lịch sử chia sẻ, giúp chỉ mục cực kỳ nhỏ gọn và nằm gọn trong bộ đệm RAM (Buffer Pool).

### 2.2. Thao tác nguyên tử Idempotent: `INSERT ... ON CONFLICT DO NOTHING RETURNING id`
Tại endpoint `POST /shares`, thay vì mô hình dễ bị race condition:
```
-- MÔ HÌNH SAI DỄ BỊ LỖI RACE CONDITION:
SELECT id FROM document_shares WHERE ... AND status = 'pending';
IF not exists THEN
    INSERT INTO document_shares ...;
```
Hệ thống sử dụng cú pháp mở rộng mạnh mẽ của PostgreSQL thông qua SQLAlchemy:

```python
insert_stmt = (
    pg_insert(DocumentShare)
    .values(
        source_document_id=doc.id,
        document_id=None,
        from_user_id=current_user.id,
        to_user_id=recipient.id,
        source_workspace_id=payload.source_workspace_id,
        share_type=share_type,
        status="pending",
        message=payload.message,
        expires_at=expires_at,
    )
    .on_conflict_do_nothing(
        index_elements=["from_user_id", "to_user_id", "source_document_id"],
        index_where=text("status = 'pending' AND source_document_id IS NOT NULL"),
    )
    .returning(DocumentShare.id)
)
created_id = (await db.execute(insert_stmt)).scalar_one_or_none()
```

#### Lợi ích nghiệp vụ:
- Nếu `created_id is not None`: Đây là yêu cầu mới thực sự được tạo -> Hệ thống gửi `Notification` thông báo cho người nhận.
- Nếu `created_id is None`: Xảy ra xung đột với yêu cầu pending có sẵn -> PostgreSQL tự động bỏ qua (DO NOTHING). Hệ thống **KHÔNG tạo bản ghi trùng**, **KHÔNG tạo Notification spam**, không reset mốc thời gian và trả về thông tin yêu cầu pending hiện tại cho người gửi.

### 2.3. PostgreSQL Atomic Upsert: `INSERT ... ON CONFLICT DO UPDATE` trong Thống kê
Trong hàm `_record_share_log`, khi thực hiện ghi nhận lượt chia sẻ cho cả tài liệu gốc và bản sao trong cùng một Transaction:
- Nếu dùng `await db.get(DocumentStats, doc_id)` rồi `db.add()`, phiên làm việc chưa flush sẽ coi bản ghi là chưa tồn tại và tạo thêm một đối tượng `DocumentStats` mới. Khi commit, PostgreSQL sẽ ném lỗi:
  ```
  UniqueViolationError: duplicate key value violates unique constraint "document_stats_pkey"
  ```
- Giải pháp: Sử dụng PostgreSQL native Upsert nguyên tử:
```python
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
Thao tác này hoàn toàn triệt tiêu xung đột khóa chính, chạy an toàn ngay cả khi có hàng chục tác vụ ghi thống kê song song.

### 2.4. Khóa dòng Row-Level Locking: `SELECT ... FOR UPDATE`
Tại các endpoint chuyển dịch trạng thái quan trọng (`accept`, `reject`, `withdraw`), SQLAlchemy áp dụng `.with_for_update()`:
```python
stmt = (
    select(DocumentShare)
    .options(...)
    .where(DocumentShare.id == share_id, ...)
    .with_for_update()
)
```
Cơ chế này khóa dòng `DocumentShare` tương ứng trong thời gian thực thi Transaction, đảm bảo:
- Người nhận không thể bấm đúp vào nút "Chấp nhận" để tạo 2 bản sao cùng lúc.
- Người gửi không thể "Rút yêu cầu" cùng lúc khi người nhận đang bấm "Chấp nhận".

---

## 3. Hệ thống Index bao phủ hiệu năng cao (Covering Indexes)

Bên cạnh Partial Unique Index, database được trang bị các chỉ mục B-tree chuyên biệt:

| Tên Index | Các cột | Mục đích tối ưu |
|---|---|---|
| `uq_document_share_pending` | `(from_user_id, to_user_id, source_document_id) WHERE status='pending'` | Chống trùng yêu cầu pending, giải phóng tự động khi đổi trạng thái |
| `ix_document_shares_to_user_status` | `(to_user_id, status)` | Tối ưu hóa truy vấn Tab **"Đã nhận"** và Tab **"Thông báo & Yêu cầu"** |
| `ix_document_shares_from_user_status` | `(from_user_id, status)` | Tối ưu hóa truy vấn Tab **"Đã gửi"** và kiểm tra các yêu cầu người gửi đã phát đi |
| `ix_documents_source_owner` | `(source_document_id, owner_id)` | Quét nhanh xem người nhận đã sở hữu bản sao của tài liệu gốc trong kho cá nhân chưa |

---

## 4. Đồng bộ Schema & Migrations
- **Alembic Migration**: `backend/alembic/versions/c3d4e5f6a7b8_add_document_share_partial_unique_index.py`
- **Script đồng bộ tự động**: `backend/db/sync_share_schema.py`
  - Tự động kiểm tra và hạ cấp index cũ (nếu có) và khởi tạo index mới 3 cột `uq_document_share_pending`.
  - Chuẩn hóa các trường `metadata` JSONB đảm bảo tính hợp lệ.
  - Chạy bằng lệnh: `cd backend && python -m db.sync_share_schema`
