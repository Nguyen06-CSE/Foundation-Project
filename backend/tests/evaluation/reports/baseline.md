# Baseline tìm kiếm toàn văn — Phase 0B

- Thời điểm chạy: `2026-11-26T14:06:23+00:00`
- PostgreSQL: `18.6 (Homebrew)`
- Dataset: `1.0` — `5956a24d2be91e96…`
- 30 tài liệu / 60 câu hỏi; Hit@5, MRR@5

## Tổng hợp

| Tập | Answerable | Hit@1 | Hit@3 | Hit@5 | MRR@5 | Citation@5 | Forbidden leak | No-evidence FP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| calibration | 24 | 0.917 | 0.917 | 0.917 | 0.917 | 0.917 | 0/3 | 0.000 |
| evaluation | 24 | 0.875 | 0.875 | 0.875 | 0.875 | 0.875 | 0/3 | 0.000 |
| overall | 48 | 0.896 | 0.896 | 0.896 | 0.896 | 0.896 | 0/6 | 0.000 |

## Hiệu năng

- `full_text_search`: median **1.88 ms**, p95 **2.94 ms**, max **12.64 ms** cho một query.

## Rò rỉ quyền

- Query có kết quả ngoài quyền: **0/60**; tổng kết quả ngoài quyền: **0**.
- Tỷ lệ câu forbidden tìm thấy tài liệu cấm khi bỏ scope (kiểm tra fixture): **1.000**.

## Trích xuất văn bản

| Format | Số tài liệu | Token recall trung bình | Thấp nhất |
|---|---:|---:|---:|
| bundle | 2 | 1.000 | 1.000 |
| docx | 8 | 1.000 | 1.000 |
| pdf_mixed | 4 | 0.518 | 0.473 |
| pdf_scan | 4 | 1.000 | 1.000 |
| pdf_text | 6 | 1.000 | 1.000 |
| pptx | 6 | 1.000 | 1.000 |

## Câu hỏi không đạt

| ID | Loại | Query | Top IDs | Gold/Forbidden | Ghi chú |
|---|---|---|---|---|---|
| CQ10 | answerable | bieu do duong xu huong thoi gian | — | C05 | miss/leak |
| CQ12 | answerable | volume lưu dữ liệu bền vững | — | C06 | miss/leak |
| EQ04 | answerable | wpa3 giao thuc bao mat wifi hien dai | — | E02 | miss/leak |
| EQ10 | answerable | màu sắc dashboard độ tương phản người mù màu | — | E05 | miss/leak |
| EQ12 | answerable | secret lưu thông tin nhạy cảm mật khẩu | — | E06 | miss/leak |

## Ghi chú phương pháp

- Chỉ số được tính trên top-k của `SearchService.full_text_search`, đúng scope cá nhân/nhóm.
- Câu `forbidden` đo rò rỉ tài liệu ngoài quyền; câu `no_evidence` đo false-positive vì corpus không có đáp án.
- `unscoped_retrieval_rate` chạy cùng truy vấn FTS nhưng bỏ điều kiện quyền, để xác nhận fixture thực sự chứa tài liệu cấm.
- Baseline dùng PostgreSQL tạm, schema từ model và trigger `b7c8d9e0f1a2`; không kết nối database đang chạy.

