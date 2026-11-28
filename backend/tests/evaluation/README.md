# Bộ đánh giá tìm kiếm tiếng Việt — Phase 0B

Thư mục này chứa corpus tổng hợp và runner baseline cho tìm kiếm toàn văn.
Mục tiêu là có một thước đo lặp lại được, **không** dùng dữ liệu thật và
**không** kết nối database đang chạy của ứng dụng.

## Thành phần

| Tệp | Vai trò |
|---|---|
| `corpus.py` | Nguồn dữ liệu duy nhất: 2 người dùng, 3 nhóm, 30 tài liệu, 60 câu hỏi. Toàn bộ nội dung là hư cấu. |
| `generate_corpus.py` | Sinh file PDF/DOCX/PPTX, `manifest.json`, `questions.json`; kiểm tra tính nhất quán của citation/gold/permission. |
| `fixtures/files/` | 28 file nhị phân (2 bundle chỉ có metadata). Trong đó có PDF text, PDF scan, PDF mixed, DOCX, PPTX và 3 bản sao byte-for-byte. |
| `manifest.json` | Metadata 30 tài liệu: owner, workspace, tags, checksum, kích thước, format, split, quan hệ duplicate/bundle. |
| `questions.json` | 60 câu hỏi: 48 answerable, 6 forbidden (ngoài quyền), 6 no-evidence. Có quote, vị trí, gold/forbidden IDs. |
| `run_baseline.py` | Khởi tạo PostgreSQL tạm, seed corpus, chạy `SearchService.full_text_search`, ghi báo cáo. |
| `reports/baseline.json` | Kết quả chi tiết từng câu + metric tổng hợp (máy đọc). |
| `reports/baseline.md` | Bản tóm tắt cho người đọc. |
| `run_hybrid_benchmark.py` | Benchmark Phase 2B: keyword / vector / RRF hybrid trên cùng corpus, có EXPLAIN. |
| `test_hybrid_benchmark.py` | Unit test cho cache vector, chunk, metric và scope SQL (không cần DB/API). |
| `.runtime/phase2/vectors.json` | Cache embedding theo `model_key()`; chạy lại không tốn API. |
| `reports/hybrid_benchmark.json` / `.md` | Kết quả benchmark + plan EXPLAIN. |

## Cấu trúc corpus

- **15 tài liệu calibration + 15 tài liệu evaluation**, mỗi split có 30 câu hỏi.
- **Định dạng**: 6 PDF text, 4 PDF scan, 4 PDF mixed (trang 1 text + trang 2 scan),
  8 DOCX, 6 PPTX, 2 bundle.
- **Trùng lặp**: C14 trùng C01, C15 trùng C02, E08 trùng E07 (cùng SHA-256).
- **Quyền**:
  - `sv_an` (id 1): sở hữu kho cá nhân; là member của G1; owner G2.
  - `sv_binh` (id 2): sở hữu kho cá nhân; owner G1; member G2; owner G3.
  - G3 chỉ owner `sv_binh`, nên tài liệu G3 là forbidden với `sv_an`.
  - Tài liệu cá nhân của `sv_binh` cũng là forbidden với `sv_an`.
- **Câu hỏi**:
  - `answerable`: có ít nhất một gold document accessible; đo Hit@k/MRR@k.
  - `forbidden`: tài liệu chứa đáp án nằm ngoài quyền; đo rò rỉ.
  - `no_evidence`: corpus không có đáp án; đo false-positive.

## Chạy

Từ thư mục gốc repo:

```bash
# Chỉ cần khi sửa corpus; file fixture đã có sẵn trong repo.
.venv/bin/python backend/tests/evaluation/generate_corpus.py

# Chạy baseline trên PostgreSQL tạm.
.venv/bin/python backend/tests/evaluation/run_baseline.py

# Benchmark Phase 2B (cache vector ở .runtime/phase2/vectors.json).
.venv/bin/python backend/tests/evaluation/run_hybrid_benchmark.py
# Bắt buộc đủ pgvector để đo cả vector + hybrid:
.venv/bin/python backend/tests/evaluation/run_hybrid_benchmark.py --require-pgvector
# Chạy lại không gọi API:
.venv/bin/python backend/tests/evaluation/run_hybrid_benchmark.py --offline

# Khi PostgreSQL tạm trên máy chưa cài pgvector, dùng PostgreSQL trong .env.
# Runner chỉ tạo một schema phase2_bench_* và luôn xóa schema đó khi kết thúc.
.venv/bin/python backend/tests/evaluation/run_hybrid_benchmark.py \
  --configured-database --offline --require-pgvector
```

Yêu cầu:

- PostgreSQL có `initdb`, `pg_ctl`, `createdb` (runner tự tìm qua `pg_config`,
  hoặc truyền `--pg-bindir`).
- Extension `unaccent`.
- Extension `vector` nếu cần đo vector/hybrid. `--configured-database` dùng một
  schema tạm cô lập trên database đã cấu hình; không đọc hoặc sửa bảng nghiệp vụ.
- Các gói Python của backend: `sqlalchemy`, `asyncpg`, `pdfplumber`,
  `python-docx`, `python-pptx`, `pytesseract`, `pdf2image`, `Pillow`.
- OCR tiếng Việt: `tesseract` với language pack `vie` (dùng cho PDF scan).
- Chỉ khi sinh lại corpus: macOS `cupsfilter` để tạo PDF text layer và font
  `/System/Library/Fonts/Supplemental/Arial Unicode.ttf` để render PDF scan.

Tuỳ chọn hữu ích:

```bash
# Đổi k, giữ cluster tạm để debug, chỉ định PostgreSQL binaries
.venv/bin/python backend/tests/evaluation/run_baseline.py --k 10 --keep-cluster
.venv/bin/python backend/tests/evaluation/run_baseline.py \
  --pg-bindir /opt/homebrew/opt/postgresql@18/bin

# CI: fail nếu manifest đã bị sửa mà không sinh lại
.venv/bin/python backend/tests/evaluation/run_baseline.py \
  --expect-dataset-hash "$(python -c 'import json;print(json.load(open("backend/tests/evaluation/manifest.json"))["dataset_hash"])')"
```

## Cách runner hoạt động

1. Tạo cluster PostgreSQL tạm trong thư mục temp, cổng ngẫu nhiên,
   `listen_addresses=127.0.0.1`; không dùng cổng 5432 và không đọc `.env`.
2. Tạo schema từ `app.models.Base.metadata`, bật `unaccent`, cài đúng trigger
   `update_document_search_vector` của migration `b7c8d9e0f1a2`
   (`simple`, weight title A / description B / content C) và GIN index.
3. Trích xuất text từ file thật bằng `file_processor.extract_text`:
   PDF có text layer dùng `pdfplumber`; PDF scan fallback OCR `vie+eng`;
   DOCX/PPTX đọc trực tiếp. Bundle dùng description.
4. Seed người dùng, nhóm, thành viên, tag và 30 document. Document con của
   bundle được gắn `bundle_parent_id` sau khi insert.
5. Chạy từng câu qua `SearchService.full_text_search` với đúng user, lấy top-k.
6. Ghi metric tổng hợp và chi tiết từng câu; dừng cluster và xoá temp.

## Metric

- **Hit@1 / Hit@3 / Hit@k**: có ít nhất một gold document trong top-k.
- **MRR@k**: nghịch đảo hạng của gold đầu tiên.
- **Citation@k**: đúng document được trích dẫn trong câu hỏi có nằm trong top-k.
- **Forbidden leak**: số query trả về tài liệu ngoài quyền.
- **Unscoped retrieval**: chạy cùng truy vấn FTS nhưng bỏ scope, để xác nhận
  fixture thật sự chứa tài liệu cấm (nếu tỷ lệ này thấp, câu forbidden chưa đủ mạnh).
- **No-evidence false positive**: query không có đáp án nhưng vẫn trả kết quả.
- **Token recall**: tỷ lệ token của text kỳ vọng xuất hiện trong text trích xuất;
  dùng để thấy PDF mixed bị mất trang scan.
- **Latency**: median/p95/max cho một lượt `full_text_search`.

## Giới hạn đã biết

- Đây là baseline **full-text search**, không phải baseline RAG/LLM. Không đo
  chất lượng câu trả lời sinh ra, chỉ đo khả năng tìm đúng tài liệu.
- Corpus nhỏ (30 tài liệu) và tổng hợp; không đại diện cho toàn bộ dữ liệu thật.
- PDF mixed cố ý có trang scan để lộ giới hạn hiện tại: `extract_text` chỉ OCR
  khi **toàn bộ** PDF không có text layer, nên trang scan trong PDF mixed không
  được index.
- Query được thiết kế theo kiểu người dùng tìm kiếm từ khoá, không phải câu hỏi
  hội thoại đầy đủ.
- `no_evidence` được đánh giá bằng “có kết quả hay không”; một kết quả đúng chủ
  đề nhưng không chứa đáp án vẫn bị tính là false positive.
- Chạy OCR có thể mất vài giây cho mỗi PDF scan; fixture đã sinh sẵn nên không
  cần chạy `generate_corpus.py` thường xuyên.

## Benchmark Phase 2B

`run_hybrid_benchmark.py` dùng chung `TempPostgres` và dữ liệu của Phase 0,
chunk trực tiếp từ `text` trong manifest (không phụ thuộc OCR), seed thêm
`document_index_runs`/`document_chunks` từ schema migration hiện có,
rồi đo ba phương pháp trên cùng 60 câu: `SearchService.full_text_search`
(keyword), branch semantic của `evidence_search.search` (vector), và
`evidence_search.search` nguyên vẹn (RRF hybrid). Vector được lấy từ
`embedding_service` đã cấu hình và cache theo `model_key()`, nên rerun không gọi
API; `--offline` dùng cache, `--refresh-vectors` bắt buộc gọi lại provider.

Báo cáo ghi Hit@5/MRR@5/Citation@5, forbidden leak, denied results, no-evidence
FP, p50/p95 latency, và `EXPLAIN (ANALYZE, BUFFERS)` của SQL thật (hybrid được
bắt lại tại `db.execute`). Khi pgvector chưa cài trong PostgreSQL tạm, script
vẫn chạy keyword, ghi rõ lý do `vector/hybrid: unavailable`; dùng
`--require-pgvector` để fail trong CI. Mặc định runner không đọc `.env` và không
dùng database đang chạy. Chỉ khi truyền `--configured-database`, runner mới lấy
`DATABASE_URL`, tạo schema tạm riêng rồi xóa schema đó trong khối `finally`.
