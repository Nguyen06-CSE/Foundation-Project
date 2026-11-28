---
title: Phân Hệ 04 — Tìm Kiếm Toàn Văn & Tra Cứu (Full-Text Search)
sidebar_label: 04. Tìm Kiếm & Tra Cứu
sidebar_position: 6
---

# Tìm theo tên và tìm trong nội dung

| Khi nào | API và điều kiện khớp | Ví dụ |
|---|---|---|
| Gõ vào thanh tìm kiếm để mở nhanh một mục | `GET /search/quick` tìm chuỗi con bằng `ILIKE` trong tên nhóm, tên thư mục và tiêu đề tài liệu mà người dùng được truy cập. | Gõ `trình` có thể gợi ý thư mục **Giáo trình**. |
| Mở trang kết quả để tra nội dung | `GET /search/full?mode=keyword` giữ tìm kiếm toàn văn cũ. `mode=hybrid` kết hợp thứ hạng từ khóa và cosine bằng Reciprocal Rank Fusion. Mỗi trang mặc định có 20 tài liệu sau khi đã gom các đoạn. | Tệp **Bài giảng tuần 3** có thể xuất hiện khi tìm `"cay nhi phan"`; chế độ kết hợp còn tìm được câu diễn đạt lại. |
| Tìm trong một kho | `GET /search/` kết hợp FTS với điều kiện chứa chuỗi trên tiêu đề hoặc mô tả đã bỏ dấu bằng `OR`. Kết quả xếp theo thời điểm cập nhật. | `workspace_id` chọn kho nhóm được phép truy cập. Nếu bỏ qua tham số này, API tìm trong kho cá nhân. |

Hai cách tìm cùng phục vụ giao diện ở các thời điểm khác nhau. Gợi ý theo tên có thể dùng chỉ mục GIN trigram của PostgreSQL (`pg_trgm`) cho mẫu `ILIKE '%…%'`. Trang tra nội dung dùng chỉ mục GIN trên `search_vector` để lấy các tài liệu chứa từ cần tìm rồi mới tính điểm. Cách tổ chức này giảm số dòng phải đọc và tránh xếp hạng toàn văn ở mỗi lần gõ. PostgreSQL chọn kế hoạch theo từ khóa và phân bố dữ liệu.

Trigger tạo sẵn vector khi ghi dữ liệu, với trọng số A cho tiêu đề, B cho mô tả và C cho nội dung. Vì vậy FTS tìm được từ nằm sâu trong tệp, đồng thời vẫn có thể trả tài liệu khớp tiêu đề hoặc mô tả. Tài liệu xóa mềm bị loại trước khi trả kết quả. [Migration định nghĩa trigger](../../alembic/versions/b7c8d9e0f1a2_fix_fts_unaccent_trigger_and_backfill.py) · [Các truy vấn tìm kiếm](../../backend/app/services/search_service.py)

## Tìm kiếm kết hợp

Mỗi đoạn nội dung đang hoạt động có thể mang một embedding trong `pgvector`.
Nhánh từ khóa và nhánh cosine đều lọc quyền cá nhân/nhóm trong cùng truy vấn,
loại tài liệu xóa và chỉ dùng vector thuộc đúng checksum cùng model hiện tại.
Mỗi nhánh chỉ đóng góp một hạng cho một tài liệu; RRF với hằng số 60 hợp nhất
hai danh sách trước khi phân trang. Kết quả có đoạn trích và định danh đoạn để
giao diện mở lại nguồn.

Nếu provider embedding timeout, trả `429` hoặc phản hồi không hợp lệ, endpoint
vẫn chạy nhánh từ khóa và trả `fallback=true`. Client cũ không truyền `mode`
vẫn nhận hành vi `keyword` như trước. HNSW chưa được tạo ở quy mô hiện tại:
model đang dùng trả vector 3072 chiều và quyết định chỉ mục sẽ dựa trên benchmark,
không dựa trên giả định.

Benchmark Phase 2B ngày 27/11/2026 trên corpus tổng hợp 30 tài liệu/60 câu cho
thấy hybrid đạt Hit@5 = 1,000 và MRR@5 = 0,958; keyword tương ứng là 0,896 và
0,896. Cả ba chế độ không làm lộ tài liệu trong 6 ca kiểm tra quyền. p50/p95 của
hybrid là 129,25/176,94 ms khi embedding truy vấn đã được cache. Đây là số đo
retrieval trên PostgreSQL cấu hình từ xa, không bao gồm thời gian gọi API và
không đại diện cho độ trễ production.

Chưa tạo HNSW: corpus benchmark chỉ có 28 đoạn được lập vector và kế hoạch tuần
tự là đủ cho quy mô đồ án hiện tại. Vector và hybrid đều trả kết quả cho toàn bộ
6 câu cố ý không có căn cứ; vì vậy kết quả gần nghĩa chỉ dùng để tìm tài liệu,
không được xem là bằng chứng rằng tài liệu có câu trả lời. Phase hỏi đáp phải áp
dụng ngưỡng từ chối riêng.

## Số đo tham khảo

Ngày 26/11/2026, PostgreSQL 18.6 chạy cục bộ trên 20.000 dòng giả, 200 dòng khớp, lấy 20 kết quả. Sau khi tạo hai chỉ mục GIN và chạy `ANALYZE`, một lượt `EXPLAIN (ANALYZE, BUFFERS)` cho kết quả sau.

| Truy vấn SQL rút gọn | Thời gian thực thi | Truy cập bộ đệm |
|---|---:|---:|
| Tiêu đề `ILIKE '%trinh%'` | 0,075 ms | 27 shared hits |
| FTS `thuat toan`, xếp hạng 20 kết quả đầu | 0,142 ms | 193 shared hits |

Cả hai lượt đều dùng Bitmap Index Scan. Phép đo minh họa chi phí tra chỉ mục trên dữ liệu đã có trong bộ đệm. Thời gian phản hồi API thực tế còn gồm kiểm tra quyền, truy vấn phụ, truyền dữ liệu và độ trễ mạng.
# Tích hợp hybrid retrieval

`GET /search/full` hỗ trợ keyword/hybrid, match fields title/content/semantic và badges từ `match.methods`; provider lỗi trả lexical fallback. Chi tiết [tài liệu AI](./10-tra-cuu-ho-tro-AI-va-goi-y-noi-dung.md).
