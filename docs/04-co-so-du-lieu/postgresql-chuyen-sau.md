---
title: Chuyên Đề PostgreSQL Chuyên Sâu & Phân Tích Đánh Đổi
sidebar_label: 🔬 PostgreSQL Chuyên Sâu
sidebar_position: 6
---

# 🔬 CHUYÊN ĐỀ POSTGRESQL CHUYÊN SÂU & PHÂN TÍCH ĐÁNH ĐỔI KHOA HỌC

Tài liệu này được biên soạn dành cho phần chất vấn và bảo vệ đồ án trước Hội đồng chấm thi, cung cấp cơ sở lý luận toán học, cơ chế hoạt động tầng thấp và phân tích so sánh đánh đổi giữa PostgreSQL với các hệ quản trị CSDL khác dựa trên mã nguồn thực tế của dự án.

---

## 1. Ràng Buộc Toàn Vẹn Quan Hệ (Referential Integrity Constraints)

Để đảm bảo không bao giờ xuất hiện bản ghi mồ côi (Orphan records) và tránh rò rỉ dữ liệu, các mô hình ORM và bảng CSDL áp dụng triệt để các hành vi khóa ngoại:

1. **`ON DELETE CASCADE`**:
   - Xóa một `workspace` sẽ tự động xóa sạch các bản ghi liên quan trong `workspace_members`, `workspace_tags`, `workspace_invitations`.
   - Xóa một `document` sẽ tự động dọn dẹp các liên kết trong `document_tags`, `document_ratings`, `download_logs`, `notes`.
2. **`ON DELETE SET NULL`**:
   - Khi một tài liệu gốc bị xóa vĩnh viễn, các bản ghi sao chép (Fork) trỏ đến nó qua `documents.source_document_id` sẽ được chuyển thành `NULL` thay vì bị xóa theo, đảm bảo tài liệu trong kho cá nhân của sinh viên không bị mất dữ liệu bất ngờ.
   - Khi người duyệt (`reviewed_by`) rời khỏi trường học, trường `community_submissions.reviewed_by` được gán `NULL` để lưu lại vết lịch sử phê duyệt mà không làm gãy dữ liệu.

---

## 2. Hệ Thống Chỉ Mục Chuyên Sâu (Specialized Indexing)

Hệ thống tận dụng 3 kỹ thuật lập chỉ mục nâng cao của PostgreSQL:

### 2.1. Chỉ Mục Đảo Ngược GIN (Generalized Inverted Index) trên `tsvector`
- **Mục đích**: Tối ưu hóa truy vấn tìm kiếm toàn văn Full-Text Search.
- **Khác biệt kỹ thuật so với B-Tree**: B-Tree chỉ lập chỉ mục cho toàn bộ chuỗi giá trị và chỉ hiệu quả với toán tử tìm kiếm tiền tố (`LIKE 'keyword%'`). Đối với văn bản dài hoặc tìm kiếm từ bất kỳ trong câu, B-Tree bắt buộc phải quét toàn bảng (Full Table Scan). Ngược lại, chỉ mục GIN chia nhỏ văn bản thành các từ tố (lexemes) và lập bảng ánh xạ từ mỗi từ tố tới danh sách các hàng chứa từ đó.
- **Câu lệnh DDL thực tế**:
  ```sql
  CREATE INDEX ix_documents_search_vector ON documents USING gin(search_vector);
  ```

### 2.2. Chỉ Mục Duy Nhất Có Điều Kiện (Partial Unique Index)
- **Mục đích**: Ngăn ngừa một người dùng gửi nhiều lời mời chia sẻ cùng một tài liệu cho cùng một đối tượng khi lời mời cũ đang ở trạng thái chờ duyệt (`pending`).
- **Câu lệnh DDL thực tế**:
  ```sql
  CREATE UNIQUE INDEX uq_document_share_pending
  ON document_shares (from_user_id, to_user_id, source_document_id)
  WHERE status = 'pending' AND source_document_id IS NOT NULL;
  ```
- **Lợi ích**: Khi trạng thái chuyển sang `approved` hoặc `rejected`, người dùng có thể chia sẻ lại tài liệu đó mà không bị ràng buộc duy nhất chặn lại. Kích thước chỉ mục cực nhỏ vì chỉ lưu các hàng thỏa mãn điều kiện `WHERE`.

### 2.3. Chỉ Mục Lọc Cho Xóa Mềm (Filtered Index on Soft Delete)
- **Mục đích**: Tăng tốc các truy vấn tìm kiếm tài liệu chưa bị xóa.
  ```sql
  CREATE INDEX ix_documents_source_owner
  ON documents (source_document_id, owner_id)
  WHERE is_deleted = false AND source_document_id IS NOT NULL;
  ```

---

## 3. Cơ Chế Full-Text Search & Trigger Tự Động Hóa

### 3.1. Đánh Trọng Số Tìm Kiếm (Lexeme Weighting)
Hệ thống sử dụng hàm `setweight` trong trigger PL/pgSQL để ưu tiên độ liên quan:
- **Trọng số 'A' (Hệ số cao nhất)**: Gán cho tiêu đề tài liệu (`title`).
- **Trọng số 'B' (Hệ số trung bình)**: Gán cho nội dung trích xuất (`content`).

```sql
NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
```

### 3.2. Lựa Chọn Cấu Hình Ngôn Ngữ `'simple'`
- **Lý do khoa học**: PostgreSQL mặc định sử dụng từ điển `'english'` với thuật toán biến đổi gốc từ Porter Stemming (ví dụ: chuyển `classes` thành `class`). Thuật toán này không phù hợp với tiếng Việt không dấu (có thể làm biến dạng các âm tiết tiếng Việt).
- Cấu hình `'simple'` giữ nguyên dạng nguyên bản của từng từ sau khi chuyển sang chữ thường (lowercase), giúp phép đối khớp từ khóa tiếng Việt không dấu đạt độ chính xác 100%.

---

## 4. Quản Lý Kết Nối & Transaction với Asyncpg

Backend sử dụng driver C-extension **asyncpg** — thư viện giao tiếp PostgreSQL bất đồng bộ nhanh nhất hiện nay cho Python.

- **Connection Pool**: Sử dụng `async_sessionmaker` và thiết lập `pool_pre_ping=True`.
- **Cơ chế `pool_pre_ping`**: Trước khi cấp phát kết nối từ Pool cho một request, engine gửi một gói tin kiểm tra nhẹ (`SELECT 1`) tới PostgreSQL. Nếu phát hiện kết nối đã bị ngắt (do máy chủ CSDL khởi động lại hoặc hết thời gian chờ TCP), pool sẽ tự động thu hồi và tạo kết nối mới, ngăn chặn hoàn toàn lỗi `500 Internal Server Error` do kết nối chết gây ra.
- **Đảm bảo tính ACID trong các tác vụ phức hợp**: Khi sinh viên tải tài liệu lên:
  1. Tính hash SHA-256.
  2. Tạo bản ghi `Document`.
  3. Khởi tạo bản ghi `DocumentStats`.
  4. Ghi log hoạt động `ActivityAction.UPLOAD`.
  Tất cả được gói trọn vẹn trong một khối `async with session.begin()` — nếu bất kỳ bước nào thất bại, toàn bộ thao tác được rollback hoàn hảo.

---

## 5. So Sánh Đánh Đổi Khoa Học Phục Vụ Hội Đồng Chấm Thi

### 5.1. PostgreSQL vs MongoDB (Relational vs Document Store)
- **Luận điểm chọn PostgreSQL**: Dữ liệu thư viện đại học có cấu trúc ràng buộc quan hệ đa tầng rất chặt chẽ (Khoa -> Môn học -> Học liệu -> Lượt tải; Workspace -> Thành viên -> Quyền).
- **Điểm yếu của MongoDB**: Không hỗ trợ khóa ngoại thực sự ở tầng CSDL; tính toàn vẹn phụ thuộc hoàn toàn vào mã nguồn ứng dụng; các truy vấn JOIN phức tạp (`$lookup`) có chi phí hiệu năng rất cao so với PostgreSQL.

### 5.2. PostgreSQL vs MySQL
- **Khả năng Full-Text Search**: MySQL chỉ hỗ trợ FTS cơ bản và không có kiểu chỉ mục đa năng GIN cho phép kết hợp trọng số A/B linh hoạt như PostgreSQL.
- **Chỉ mục có điều kiện (Partial Indexes)**: PostgreSQL hỗ trợ chỉ mục `WHERE` từ lâu, giúp tối ưu hóa dung lượng chỉ mục và tốc độ ghi. MySQL (trước phiên bản 8.0.13) không hỗ trợ tính năng này.
- **Hệ sinh thái Async Python**: Driver `asyncpg` của PostgreSQL vượt trội về hiệu năng so với `aiomysql`.

### 5.3. PostgreSQL vs Elasticsearch
- **Đánh đổi kiến trúc**: Elasticsearch là công cụ tìm kiếm phân tán số một, nhưng đòi hỏi môi trường máy ảo Java (JVM), tối thiểu 2-4GB RAM phụ trội và phải duy trì đường ống đồng bộ dữ liệu (Change Data Capture - CDC).
- **Kết luận**: Với quy mô thư viện trường đại học (hàng chục nghìn tài liệu), việc tận dụng PostgreSQL FTS giúp đơn giản hóa 100% kiến trúc, loại bỏ nguy cơ lệch dữ liệu giữa DB và bộ máy tìm kiếm, tiết kiệm triệt để tài nguyên máy chủ.
# Kỹ thuật PostgreSQL cho retrieval

Code dùng FTS/unaccent + GIN; pgvector cosine `<=>`; partial unique indexes cho active/queued run; JSONB coverage/location/summary; CTE/rank fusion và window/aggregate cho retrieval/stats; `FOR UPDATE SKIP LOCKED` cho worker concurrency. Runtime EXPLAIN/benchmark còn TBD trên DB local.
