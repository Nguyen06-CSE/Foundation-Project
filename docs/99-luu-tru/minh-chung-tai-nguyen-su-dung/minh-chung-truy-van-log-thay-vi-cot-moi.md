---
title: Minh chứng tài nguyên sử dụng — Truy vấn log thay vì tạo cột/bảng riêng
sidebar_label: 🧪 Minh chứng tài nguyên
sidebar_position: 1
---

# 🧪 MINH CHỨNG TÀI NGUYÊN SỬ DỤNG

## Dẫn đề

Bộ lọc **"Mở gần đây"** được triển khai bằng cách thêm query param `accessed_within` vào 2 endpoint có sẵn, sau đó truy vấn trực tiếp bảng **`download_logs`** — nguồn dữ liệu đang dùng cho tính năng thống kê `/stats`.

Tài liệu này chứng minh 2 nhận định:

1. **Truy vấn log nhanh ở mức DB**, đủ để dùng cho luồng lọc tài liệu.
2. **Không nên tạo cột hoặc bảng riêng** trong bối cảnh hiện tại, vì chi phí tổng (migration, backfill, ghi bổ sung, đồng bộ, round-trip API) lớn hơn lợi ích tốc độ đọc mang lại.

---

## 1. Cách triển khai hiện tại

### 1.1. Không tạo bảng mới, không tạo endpoint mới

Chỉ mở rộng API có sẵn:

| Endpoint | Param mới |
|---|---|
| `GET /documents/` | `accessed_within` |
| `GET /groups/{group_id}/documents/` | `accessed_within` |

Frontend đưa lựa chọn dropdown vào `queryParams`, làm `queryKey` của `useInfiniteQuery` thay đổi và React Query tự refetch.

### 1.2. Truy vấn lõi

```python
opened_doc_ids = select(DownloadLog.document_id).where(
    DownloadLog.user_id == current_user_id,
    DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
    DownloadLog.created_at >= accessed_start,
)
query = query.where(Document.id.in_(opened_doc_ids))
```

Ý nghĩa:

- Lấy danh sách `document_id` có ít nhất 1 lần mở của **chính user hiện tại** trong khung thời gian.
- Áp dụng tiếp điều kiện scope có sẵn (`personal` hoặc `group`) ở query ngoài.
- Không có log nào khớp → `items: []`, `total: 0` → UI hiển thị EmptyState.

---

## 2. Phương pháp đo

Script benchmark được thêm vào repo:

```text
backend/tests/benchmark_accessed_within.py
```

Chạy:

```bash
cd backend
.venv/bin/python tests/benchmark_accessed_within.py
```

Đặc điểm:

- **Read-only**: chỉ `SELECT` và `EXPLAIN ANALYZE`, không ghi dữ liệu.
- **Đối tượng**: user có nhiều log nhất trong DB (`sv_an`, id=6, 133 log).
- **Số lần chạy**: 5 lần/case, lấy min / median / avg / max.
- **Môi trường**: DB Neon remote, `page_size=20`.
- Các case được đo:

| Case | Ý nghĩa |
|---|---|
| Không lọc thời gian | Baseline |
| `uploaded_within=today` | Lọc thẳng 1 cột trên bảng `documents` — **tương đương tốc độ nếu thêm cột mới** |
| `accessed_within=today` | Truy vấn `download_logs` — cách đang dùng |
| `accessed_within=last_7_days` | Truy vấn `download_logs` với khung lớn hơn |

---

## 3. Kết quả đo

### 3.1. Thời gian full API (có network + serialize)

| Case | `total` | Median | Min | Max |
|---|---:|---:|---:|---:|
| Không lọc thời gian | 16 | 992.11 ms | 851.18 ms | 1.485,43 ms |
| `uploaded_within=today` | 0 | 125.06 ms | 117.33 ms | 242.61 ms |
| `accessed_within=today` | 3 | 485.91 ms | 477.16 ms | 873.91 ms |
| `accessed_within=last_7_days` | 10 | 1.088,99 ms | 946.54 ms | 1.322,83 ms |

> **Lưu ý quan trọng để đọc đúng số liệu:** các con số này chịu chi phí round-trip tới Neon, `count(*)` để tính `total`, hydrate `personal_view_count` / `bundle_children_count` và serialize `DocumentOut`. Case `uploaded_within=today` trả về **0 bản ghi** nên nhanh hơn không phải vì bản chất nhanh hơn, mà vì gần như không phải hydrate dữ liệu. Đây **không phải so sánh tương đương**. Phần quyết định nằm ở `EXPLAIN ANALYZE` bên dưới.

### 3.2. Thời gian thật của truy vấn lõi trong DB

```text
EXPLAIN ANALYZE (accessed_within=today)

Limit  (actual time=0.066..0.067 rows=3 loops=1)
  ->  Sort  (actual time=0.065..0.066 rows=3 loops=1)
        ->  Nested Loop  (actual time=0.054..0.060 rows=3 loops=1)
              ->  HashAggregate  (actual time=0.047..0.048 rows=3 loops=1)
                    ->  Seq Scan on download_logs
                          Filter: action IN (...) AND created_at >= today AND user_id = 6
                          Rows Removed by Filter: 211
              ->  Index Scan using documents_pkey on documents

Planning Time:  0.398 ms
Execution Time: 0.111 ms
```

**Kết luận then chốt:** phần lọc qua log chỉ tốn **0,111 ms** trong DB. Dù Postgres đang chọn `Seq Scan` (vì bảng chỉ ~215 dòng), truy vấn vẫn nhỏ hơn ~9.000 lần so với thời gian full API trung bình. Tức là **chi phí nằm ở network/xử lý kết quả, không nằm ở việc đọc log**.

### 3.3. Index đang có

```text
ix_download_logs_user_id_created_at      (user_id, created_at DESC)
ix_download_logs_action_created_at       (action, created_at DESC)
ix_download_logs_document_id_created_at  (document_id, created_at DESC)
```

Các index này đã tồn tại từ migration `d76927b437fe_add_activity_tracking`, nên phần lọc này **tốn 0 chi phí migration**.

---

## 4. Vì sao cách này nhanh hơn tổng thể

### 4.1. Không có round-trip API bổ sung

Nếu tạo API riêng kiểu `GET /documents/recently-opened`, frontend phải:

```text
gọi API lấy danh sách ID đã mở
→ gọi lại GET /documents/ để lấy chi tiết
```

Với DB remote, mỗi round-trip có thể tốn ~100 ms+. Gộp filter vào endpoint có sẵn giúp **loại bỏ hoàn toàn round-trip thứ hai**.

### 4.2. Không có chi phí ghi bổ sung

Mỗi lần user mở tài liệu, hệ thống **đã ghi** `DownloadLog` rồi (phục vụ `/stats`). Cách hiện tại chỉ đọc lại dữ liệu đó.

Nếu thêm cột/bảng cache, mỗi lần view phải làm thêm:

```text
UPSERT user_document_access(...)
+ commit
+ xử lý rollback/đồng bộ khi log ghi thất bại
```

Đây là **write amplification** — chi phí tăng theo số lượt xem, trong khi read của cách hiện tại đã đủ nhanh.

### 4.3. Không cần backfill

Dùng log có sẵn → dữ liệu quá khứ đã có từ ngày triển khai activity tracking.

Tạo bảng riêng → phải backfill từ `download_logs` sang bảng mới, kèm kiểm tra chéo.

### 4.4. Đúng ngữ nghĩa per-user mà không cần schema mới

"Mở gần đây" là hành vi **của từng user**. Truy vấn lọc theo `DownloadLog.user_id == current_user_id` đã đúng mà không cần thêm cột.

Nếu thêm cột `last_accessed_at` trực tiếp vào `documents`, cột đó sẽ là lần mở gần nhất của **bất kỳ ai** → sai nghiệp vụ. Muốn đúng thì vẫn phải tạo bảng per-user, tức là quay lại đúng chi phí đang muốn tránh.

---

## 5. So sánh với phương án tạo cột / bảng riêng

| Tiêu chí | Truy vấn log (hiện tại) | Thêm cột `documents.last_accessed_at` | Thêm bảng cache per-user |
|---|---|---|---|
| Tốc độ lọc trong DB | 0,111 ms (đo thực tế) | Nhanh hơn một chút | Nhanh nhất |
| Số round-trip API | 1 | 1 | 1 nếu gộp param; 2 nếu tách API |
| Migration | **0** | Cần | Cần |
| Backfill dữ liệu cũ | **0** | Cần | Cần |
| Ghi thêm mỗi lần view | **0** | Có | Có |
| Đúng theo user | **Có** | **Không** | Có |
| Nguồn dữ liệu | 1 (log) | 2 (log + cột) | 2 (log + bảng) |
| Nguy cơ lệch dữ liệu | **Không** | Có | Có |
| Dùng cho sort "Mở gần đây" | Cần aggregate | Dễ | Rất dễ |
| Lịch sử/tần suất xem | **Có sẵn** | Vẫn cần log | Vẫn cần log |

Bảng cache per-user có ưu điểm thật là đọc đơn giản và dễ sort, nhưng đổi lại phải trả bằng migration, backfill, write amplification và rủi ro two-source-of-truth. Với mức độ hiện tại, đó là **chi phí lớn hơn lợi ích**.

---

## 6. Khi nào nên đổi hướng

Giữ cách hiện tại là đúng cho quy mô hiện tại. Nếu số log tăng lớn (ví dụ hàng chục nghìn bản ghi/user), làm theo thứ tự:

1. Thêm index composite:

```sql
CREATE INDEX CONCURRENTLY ix_download_logs_user_action_created
ON download_logs (user_id, action, created_at DESC);
```

2. Chạy lại `benchmark_accessed_within.py` để so sánh plan (từ `Seq Scan` sang `Index Scan`).
3. Chỉ tạo bảng cache per-user nếu:
   - profile cho thấy đây thực sự là bottleneck, hoặc
   - cần sort theo "lần mở gần nhất" với lượng dữ liệu lớn.

---

## 7. Kết luận

- Truy vấn `download_logs` cho thấy **Execution Time = 0,111 ms** — nhanh hơn rất nhiều so với chi phí network/serialize bao quanh.
- Việc gộp `accessed_within` vào endpoint có sẵn **không phát sinh round-trip mới**.
- Cách này tận dụng index và dữ liệu đã có, **không migration, không backfill, không ghi thêm**, và **đúng ngữ nghĩa per-user**.
- Tạo cột hoặc bảng riêng chỉ nhanh hơn ở một phần rất nhỏ của read path, nhưng mang lại chi phí vận hành lớn hơn.

👉 Vì vậy, triển khai truy vấn log là lựa chọn **đúng và hiệu quả hơn** trong bối cảnh hiện tại.

---

## Phụ lục — Output benchmark đầy đủ

```text
========================================================================
BENCHMARK accessed_within (READ-ONLY)
========================================================================
User: sv_an (id=6) | tổng log: 133
Số lần chạy mỗi case: 5 | page_size=20

Không lọc thời gian (baseline)
   total=16 | items=16
   min= 851.18ms | median= 992.11ms | avg=1054.89ms | max=1485.43ms

uploaded_within=today  [cột trên documents]
   total=0 | items=0
   min= 117.33ms | median= 125.06ms | avg= 147.57ms | max= 242.61ms

accessed_within=today  [query download_logs]
   total=3 | items=3
   min= 477.16ms | median= 485.91ms | avg= 567.00ms | max= 873.91ms

accessed_within=last_7_days  [query download_logs]
   total=10 | items=10
   min= 946.54ms | median=1088.99ms | avg=1102.06ms | max=1322.83ms

EXPLAIN ANALYZE (truy vấn lõi accessed_within=today):
   Limit  (cost=15.30..15.30 rows=1 width=4) (actual time=0.066..0.067 rows=3.00 loops=1)
     Buffers: shared hit=12
     ->  Sort  (cost=15.30..15.30 rows=1 width=4) (actual time=0.065..0.066 rows=3.00 loops=1)
           Sort Key: d.id DESC
           Sort Method: quicksort  Memory: 25kB
           Buffers: shared hit=12
           ->  Nested Loop  (cost=6.64..15.29 rows=1 width=4) (actual time=0.054..0.060 rows=3.00 loops=1)
                 Buffers: shared hit=12
                 ->  HashAggregate  (cost=6.36..6.37 rows=1 width=4) (actual time=0.047..0.048 rows=3.00 loops=1)
                       Group Key: dl.document_id
                       Batches: 1  Memory Usage: 32kB
                       Buffers: shared hit=3
                       ->  Seq Scan on download_logs dl  (cost=0.00..6.36 rows=1 width=4) (actual time=0.039..0.040 rows=4.00 loops=1)
                             Filter: (((action)::text = ANY ('{DOCUMENT_VIEWED,view}'::text[])) AND (created_at >= '2026-11-23 00:00:00+00'::timestamp with time zone) AND (user_id = 6))
                             Rows Removed by Filter: 211
                             Buffers: shared hit=3
                 ->  Index Scan using documents_pkey on documents d  (cost=0.28..8.30 rows=1 width=4) (actual time=0.003..0.003 rows=1.00 loops=3)
                       Index Cond: (id = dl.document_id)
                       Filter: ((workspace_id IS NULL) AND (NOT is_deleted) AND (NOT is_public) AND (bundle_parent_id IS NULL) AND (owner_id = 6))
                       Index Searches: 3
                       Buffers: shared hit=9
   Planning:
     Buffers: shared hit=14
   Planning Time: 0.398 ms
   Execution Time: 0.111 ms

Index hiện có của download_logs:
   - download_logs_pkey: CREATE UNIQUE INDEX download_logs_pkey ON public.download_logs USING btree (id)
   - ix_download_logs_action_created_at: CREATE INDEX ix_download_logs_action_created_at ON public.download_logs USING btree (action, created_at DESC)
   - ix_download_logs_document_id_created_at: CREATE INDEX ix_download_logs_document_id_created_at ON public.download_logs USING btree (document_id, created_at DESC)
   - ix_download_logs_user_id_created_at: CREATE INDEX ix_download_logs_user_id_created_at ON public.download_logs USING btree (user_id, created_at DESC)
========================================================================
```
