# Phase 6B — Tài liệu hóa và bàn giao

Tổng kết nghiệm thu: [`phase-06-tong-ket-nghiem-thu-va-ban-giao.md`](phase-06-tong-ket-nghiem-thu-va-ban-giao.md).

Ngày: 2026-11-28

## Phạm vi

Chuẩn hóa tài liệu cho indexing, vector search, embedding provider, worker và kế hoạch nghiệm thu DB local. Không thay đổi production code, không mutation DB.

## Tài liệu/bằng chứng

- ERD và từ điển dữ liệu: [`ke-hoach-AI-chi-tiet.md`](../../ke-hoach/AI-Vector/ke-hoach-AI-chi-tiet.md).
- Vận hành provider/worker/search: [`huong-dan-van-hanh-AI-vector.md`](../../ke-hoach/AI-Vector/huong-dan-van-hanh-AI-vector.md).
- Nghiệm thu local deferred: [`phase-06A-06B-local-db-verification.md`](../../test-case/phase-06A-06B-local-db-verification.md).
- Migration nguồn: `alembic/versions/ea41b38547bc_document_index.py`, revision `ea41b38547bc`; `alembic/versions/f2c3d4e5a6b7_add_pgvector_embeddings.py`, revision `f2c3d4e5a6b7`.
- Worker: `backend/app/services/index_worker.py`; provider: `backend/app/services/embedding_service.py`; retrieval: `backend/app/services/evidence_search.py`.
- Phase 6A giữ `FAIL/BLOCKED`: test tự động đạt, nhưng DB thật/worker #1085/AI regression chưa chạy do Neon DNS. Theo quyết định người dùng, nghiệm thu DB local hoãn sau Phase 6B.

## Từ điển dữ liệu và provider

`documents` 1—N `document_index_runs` qua `document_id`; mỗi run 1—N `document_chunks` qua `run_id`. Run có `checksum`, `model`, `status` (`pending`, `retry`, `ready`, `empty`, `failed`, `obsolete`), `attempts`, `next_attempt`, `last_error`, `coverage`, `summary`, `is_active`. Có partial unique index tối đa một active run và một queued run mỗi document; chunk có unique `(run_id, ordinal)`, GIN `search_vector`, và `embedding vector` không khai báo dimension trong migration. `documents` FK cascade đến run, run FK cascade đến chunks. Nguồn là `ea41b38547bc` và `f2c3d4e5a6b7`; `vector` extension được bật bởi migration sau.

Các biến cấu hình không chứa giá trị thật: `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` (phải khớp độ dài vector), `EMBEDDING_BATCH_SIZE`, `SEMANTIC_MIN_SIMILARITY`, `INDEX_MAX_RETRIES` (mặc định 5). Transport gọi endpoint OpenAI-compatible `/embeddings`; đây chỉ là embedding, không phải text generation. Đổi model hoặc dimension tạo model key mới và cần re-index; không dùng vector khác dimension trong cùng model key.

## Kiểm tra tham chiếu

Đã đối chiếu bằng `rg` các env name, endpoint `/search/full`, `document_index_runs`, `document_chunks`, `vector`, worker flags và migration revisions. `alembic heads` cục bộ: `f2c3d4e5a6b7`. Không đọc `.env`.

Validation docs: bốn file Phase 6B/6A-6B đều có nội dung; các link mới tồn tại. Script kiểm tra Markdown dưới `docs/99-luu-tru` còn 2 link `pathname:///...` cũ trong `PROJECT_STATUS_REPORT.md`; đây là tài liệu tồn tại trước, không thuộc link mới của Phase 6B.

## Benchmark và kiểm thử

| Loại | Kết quả | Ý nghĩa |
|---|---:|---|
| Unit/fixture indexing + insights + embedding + hybrid + phase4/5 + preview + documents (`backend/tests/test_phase6a_contracts.py` và các test file liên quan) | 91 passed | Regression tự động, không phải relevance/performance benchmark |
| DB thật Neon/#1085 | BLOCKED DNS | Chưa có số đo vận hành |
| Mục tiêu đề xuất | chưa đo | top-5, p50/p95, upload-to-search, API calls, storage, cost |

Các fixture/evaluation tham chiếu: `backend/tests/evaluation/manifest.json`, `backend/tests/evaluation/run_baseline.py`, `backend/tests/evaluation/run_hybrid_benchmark.py`, và các báo cáo Phase 00–05 trong cùng thư mục. 91 pytest là regression, không phải benchmark relevance/performance.

| Metric | Giá trị |
|---|---|
| hit@5 / precision@5 / recall@5 | TBD — cần DB local |
| search/worker p50/p95 | TBD — cần DB local |
| `EXPLAIN (ANALYZE, BUFFERS)` | TBD — cần DB local |
| upload-to-search latency | TBD |
| embedding API calls / storage / cost | TBD |

Checklist đo lại sau khi có DB local: top-5 precision/recall trên fixture, `EXPLAIN (ANALYZE, BUFFERS)`, p50/p95 worker/search, số call embedding, storage và chi phí.

## Hybrid search contract

`GET /search/full?q=...&mode=keyword|hybrid&match_fields=title&match_fields=content&match_fields=semantic` nhận đúng ba field `title`, `content`, `semantic`. `hybrid` mặc định cả ba; provider lỗi/không cấu hình trả lexical fallback với `fallback=true` và `unavailable_match_fields`. `match.methods` chỉ có `lexical_title`, `lexical_content`, `semantic`.

## Tự đánh giá Phase 6B

- Tài liệu bàn giao/runbook: PASS — nội dung nằm trong ba file linked ở trên.
- Tham chiếu code/migration/env: PASS ở mức static.
- DB local/AI vận hành: BLOCKED, thuộc checklist Phase 6A deferred.

Kết luận Phase 6B: **PASS có điều kiện** cho tài liệu hóa; không chuyển Phase 6A sang PASS.
