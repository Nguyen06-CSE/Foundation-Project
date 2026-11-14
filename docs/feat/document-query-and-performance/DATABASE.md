---
sidebar_position: 3
---

# Database: Kiến Trúc Chỉ Mục & Tối Ưu Truy Vấn PostgreSQL

Tài liệu này trình bày chi tiết về cấu trúc cơ sở dữ liệu, chiến lược lập chỉ mục (Indexing Strategy), kỹ thuật phân trang cửa sổ trượt (Window Look-Ahead), và các giải pháp triệt tiêu vấn đề $N+1$ query trong quá trình truy vấn danh sách tài liệu.

---

## 1. Mô hình Bảng liên quan & Ràng buộc

Hệ thống truy vấn tài liệu tương tác với 5 bảng cốt lõi trong PostgreSQL:
- `documents`: Lưu thông tin thực thể tài liệu (tiêu đề, dung lượng, đường dẫn tệp, bundle, owner, workspace).
- `document_stats`: Lưu điểm số thống kê (lượt xem, tải, chia sẻ, điểm thịnh hành `trending_score`).
- `document_tags` & `tags`: Quản lý hệ thống nhãn phân loại tài liệu.
- `download_logs`: Nhật ký hoạt động (lượt xem `VIEWED`, tải về `DOWNLOADED`) của từng người dùng cụ thể.

---

## 2. Chiến Lược Lập Chỉ Mục (Composite & Partial Indexing)

Để đảm bảo các truy vấn phân trang và tìm kiếm có thời gian phản hồi dưới 500ms trên cơ sở dữ liệu cloud (Neon PostgreSQL), hệ thống thiết lập 4 chỉ mục chuyên dụng:

```sql
-- 1. Chỉ mục chuyên dụng cho Kho cá nhân (Personal Documents)
CREATE INDEX IF NOT EXISTS idx_documents_personal_perf 
ON documents (owner_id, is_deleted, is_public, bundle_parent_id, created_at DESC, id DESC) 
WHERE workspace_id IS NULL;

-- 2. Chỉ mục chuyên dụng cho Không gian nhóm (Group Documents)
CREATE INDEX IF NOT EXISTS idx_documents_group_perf 
ON documents (workspace_id, is_deleted, bundle_parent_id, created_at DESC, id DESC);

-- 3. Chỉ mục B-Tree tăng tốc sắp xếp theo độ thịnh hành
CREATE INDEX IF NOT EXISTS idx_doc_stats_trending 
ON document_stats (trending_score DESC, document_id DESC);

-- 4. Chỉ mục GIN Trigram hỗ trợ tìm kiếm mờ (Fuzzy / Substring Search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm 
ON documents USING gin (lower(title) gin_trgm_ops);
```

### Phân tích hiệu năng của các chỉ mục
1. **Index Conditioning (`WHERE workspace_id IS NULL`)**: Bỏ qua toàn bộ tài liệu thuộc nhóm, giảm kích thước cây B-Tree cho kho cá nhân hơn 40%, tăng tốc độ quét index lên đáng kể.
2. **Khóa phụ `id DESC` trong Index**: Khớp hoàn hảo với mệnh đề `ORDER BY ... id DESC` của SQLAlchemy, cho phép database thực hiện `Index Scan` trực tiếp mà không cần công đoạn `Sort/TempDB` tốn bộ nhớ.

---

## 3. Kỹ Thuật Phân Trang Cửa Sổ Trượt (Window Look-Ahead)

### Vấn đề của cách tiếp cận cũ
Trước đây, mỗi request phân trang đều thực hiện 2 câu lệnh SQL:
1. `SELECT COUNT(*) FROM documents WHERE ...`: Đếm toàn bộ số bản ghi (rất chậm khi bảng lớn và có nhiều điều kiện lọc).
2. `SELECT * FROM documents WHERE ... LIMIT 20 OFFSET 200`: Lấy dữ liệu trang.

### Kỹ thuật tối ưu mới trong `DocumentQueryService`
Triệt tiêu hoàn toàn `COUNT(*)` ở các trang sau trang đầu tiên:

```python
# backend/app/services/document_query_service.py

# 1. Chỉ tính total ở trang 1
total = 0
if page == 1:
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

# 2. Truy vấn dữ liệu với Look-ahead limit = page_size + 1
fetch_limit = page_size + 1
query = query.offset(offset).limit(fetch_limit)
result = await db.execute(query)
rows = result.all()

# 3. Xác định has_more tức thì mà không cần đếm toàn bảng
has_more = len(rows) > page_size
items_rows = rows[:page_size]  # Cắt đúng 20 phần tử trả về cho client
```

- **Ở trang 1**: Thực hiện `COUNT(*)` để lấy tổng số bản ghi hiển thị trên giao diện.
- **Từ trang 2 trở đi**: Thời gian thực thi giảm từ **850ms xuống ~380ms** vì PostgreSQL chỉ cần đọc đúng 21 dòng từ B-Tree Index.

---

## 4. Xóa Bỏ Vấn Đề $N+1$ Query Bằng Kỹ Thuật Hydration Tập Trung

Một tài liệu khi trả về giao diện cần kèm theo:
- Số lượng tệp con nếu là Bundle (`bundle_children_count`).
- Lượt xem riêng của người dùng đang đăng nhập (`personal_view_count`).

Thay vì query vòng lặp $N$ lần cho từng card tài liệu, `DocumentQueryService` thực thi 2 câu lệnh gom nhóm tập trung:

### 4.1. Hydrate Bundle Children Count
```python
bundle_ids = [d.id for d in items if d.is_bundle]
counts_map = {}
if bundle_ids:
    counts_res = await db.execute(
        select(Document.bundle_parent_id, func.count(Document.id))
        .where(Document.bundle_parent_id.in_(bundle_ids), Document.is_deleted == False)
        .group_by(Document.bundle_parent_id)
    )
    counts_map = dict(counts_res.all())
```

### 4.2. Hydrate Personal Views Map
```python
doc_ids = [d.id for d in items]
personal_views_map = {}
if doc_ids:
    p_res = await db.execute(
        select(DownloadLog.document_id, func.count(DownloadLog.id))
        .where(
            DownloadLog.document_id.in_(doc_ids),
            DownloadLog.user_id == current_user_id,
            DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
        )
        .group_by(DownloadLog.document_id)
    )
    personal_views_map = dict(p_res.all())
```

Toàn bộ quá trình nạp thông tin bổ sung cho 20 tài liệu luôn được giới hạn trong **chính xác 2 câu lệnh SQL phụ**, bất kể danh sách có bao nhiêu phần tử.

---

## 5. Kết Quả Đo Đạc Thực Tế (Benchmark trên 1.000 Records)

Đo lường trên môi trường cơ sở dữ liệu đám mây Neon PostgreSQL (kết nối SSL từ xa qua mạng):

| Kịch bản truy vấn | Thời gian trung bình | Thời gian trung vị (Median) | Số items trả về | Cờ `has_more` |
|---|---|---|---|---|
| **Cá nhân - Trang 1 (Trending + Count)** | `586.37 ms` | `493.91 ms` | 20 | `True` |
| **Cá nhân - Trang 2 (Look-Ahead, No Count)** | `388.02 ms` | `388.07 ms` | 20 | `True` |
| **Tìm kiếm từ khóa (`q="bao"`)** | `554.10 ms` | `465.65 ms` | 1 | `False` |
| **Lọc theo loại tệp (`file_type="pdf"`)** | `461.46 ms` | `465.53 ms` | 20 | `True` |
| **Nhóm Workspace 22 - Trang 1** | `717.13 ms` | `663.81 ms` | 20 | `True` |

Các truy vấn đều đạt độ trễ ổn định, không bị nghẽn CPU máy chủ ngay cả khi chịu tải phân trang nối tiếp liên tục.
