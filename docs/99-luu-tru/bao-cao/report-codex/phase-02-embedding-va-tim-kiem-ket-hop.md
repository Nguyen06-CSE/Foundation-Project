# Báo cáo Codex — Phase 2: Embedding và tìm kiếm kết hợp

Ngày nghiệm thu: 27/11/2026. Phạm vi: kho cá nhân và kho nhóm; giữ `GET /search/full` mặc định ở chế độ từ khóa.

## Việc đã thực hiện

| Hạng mục | Thay đổi và bằng chứng mã nguồn | Kết quả |
|---|---|---|
| Lưu vector | Migration `f2c3d4e5a6b7_add_pgvector_embeddings.py` bật extension `vector`, thêm `document_chunks.embedding`. Vector không cố định chiều trong cột để cho phép đổi model bằng một lần xử lý mới. | Đã áp dụng lên PostgreSQL cấu hình, phiên bản 18.7 với pgvector 0.8.7; Alembic có một head. |
| Provider | `backend/app/services/embedding_service.py` gửi lô qua API tương thích OpenAI, kiểm tra số chiều, giá trị hữu hạn, vector khác 0; retry timeout, lỗi mạng, 429 và 5xx. Hỗ trợ response có hoặc không có `index`. | Yêu cầu thử tiếng Việt trả hai vector 3072 chiều hợp lệ. Số chiều trong `.env` đã khớp thực tế. Không ghi khóa API vào báo cáo. |
| Worker | `backend/app/services/index_worker.py` xử lý lô embedding còn thiếu, retry và công bố bộ đoạn mới sau khi hoàn tất; `schedule_model_change()` tạo lần xử lý mới khi model đổi. | Các test worker về lô và trạng thái chạy qua; không có xử lý lại toàn kho trên dữ liệu thật. |
| Tìm kiếm | `backend/app/services/evidence_search.py` kết hợp FTS và cosine bằng RRF (hằng số 60), gom theo tài liệu trước khi phân trang, lọc quyền ở cả hai nhánh, ràng buộc checksum và model của run đang hoạt động. Khi API embedding không khả dụng, trả nhánh từ khóa với `fallback=true`. | `GET /search/full?mode=keyword|hybrid`; client cũ mặc định keyword. |
| Giao diện | `frontend/digital-library/src/pages/search/SearchPage.tsx` và các component tìm kiếm cho phép chọn chế độ, hiện đoạn trích và mở đoạn nguồn. | Frontend build thành công. |
| Kiểm thử, tài liệu | `backend/tests/test_embedding_service.py`, `test_hybrid_search.py`, `test_document_indexing.py`, runner và báo cáo ở `backend/tests/evaluation/`; cập nhật hướng dẫn local và tài liệu tìm kiếm. | 102 backend tests passed, 3 skipped trong lượt hồi quy Phase 2; 59 passed, 1 skipped trong nhóm trọng tâm; `git diff --check` sạch. |

## Đo hiệu quả

Nguồn số liệu: `backend/tests/evaluation/reports/hybrid_benchmark.json` và `.md`; corpus tổng hợp 30 tài liệu, 60 câu hỏi (48 câu có đáp án, 6 câu cấm theo quyền, 6 câu không có căn cứ), 28 đoạn có vector. Vector được cache trước khi đo thời gian truy xuất. Runner dùng schema tạm trên PostgreSQL đã cấu hình và xác nhận không còn schema tạm sau khi chạy.

| Chế độ | Hit@5 | MRR@5 | p50 | p95 | Rò rỉ quyền |
|---|---:|---:|---:|---:|---:|
| Từ khóa | 0,896 | 0,896 | 288,42 ms | 476,94 ms | 0/6 |
| Vector | 0,896 | 0,861 | 80,92 ms | 135,28 ms | 0/6 |
| Kết hợp | **1,000** | **0,958** | 129,25 ms | 176,94 ms | 0/6 |

Đánh giá: tìm kiếm kết hợp tăng Hit@5 thêm 0,104 điểm và MRR@5 thêm 0,062 điểm so với từ khóa trên corpus này. Giá trị p50/p95 bao gồm độ trễ kết nối PostgreSQL từ xa và không bao gồm lần gọi API để tạo vector câu hỏi, nên không phải thời gian người dùng chờ thực tế. EXPLAIN trong báo cáo benchmark cho thấy quét tuần tự là hợp lý với 28 đoạn; chưa tạo HNSW ở quy mô demo.

## Giới hạn và việc cần đánh giá chéo

1. Cả vector và hybrid trả kết quả ở 6/6 câu không có căn cứ. Đây là hành vi của tìm kiếm gần nghĩa, không phải bằng chứng trả lời; Phase 3 cần bộ lọc câu trả lời độc lập.
2. Benchmark dùng văn bản tổng hợp đã duyệt, không thay thế phép đo trên kho tài liệu thật. Chưa đo thời gian từ upload đến khi tìm được, dung lượng vector trên toàn kho và chi phí API thực tế.
3. Chưa chạy backfill 1.043 tài liệu thật vì thao tác đó gửi nội dung đoạn tài liệu đến provider embedding bên ngoài. Hiện các tài liệu cũ chưa có vector sẽ chỉ có kết quả từ khóa. Cần quyết định phạm vi tài liệu được phép xử lý trước khi nghiệm thu toàn kho.
4. Clean-chain migration trên PostgreSQL tạm của máy không chạy vì máy chưa cài gói extension pgvector. Migration trên PostgreSQL đã cấu hình chạy thành công; cần thêm gói này vào môi trường local/CI nếu muốn kiểm tra clean install.
5. Đánh giá chéo nên kiểm tra các ca thu hồi quyền nhóm giữa hai truy vấn, đổi checksum khi worker đang chạy, thay model giữa backfill và độ trễ API ở mạng người dùng.
6. Các batch trong một tài liệu hiện nằm trong cùng transaction; nếu worker chết trước khi công bố run, tiến độ embedding chưa commit sẽ rollback và API có thể bị gọi lại. Cần tách checkpoint theo batch trước khi backfill tài liệu dài nếu yêu cầu tiếp tục chính xác ở mức batch.

## Tự đánh giá

Đạt mục tiêu kỹ thuật Phase 2 trên dữ liệu tổng hợp: thuật ngữ chính xác, câu diễn đạt lại, lọc quyền và fallback đều có kiểm thử; giao diện dùng được. Chưa đạt điều kiện nghiệm thu vận hành trên toàn kho vì chưa backfill tài liệu thật và chưa đo chi phí/độ trễ end to end. Mức tin cậy: **cao cho hợp đồng API và corpus tổng hợp; trung bình thấp cho kho thật**.
