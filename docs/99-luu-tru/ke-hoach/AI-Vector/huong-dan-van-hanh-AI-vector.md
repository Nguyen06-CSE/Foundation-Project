# Hướng dẫn vận hành AI/vector

## Cấu hình

| Tên | Default | Required | Nguồn |
|---|---:|---|---|
| `EMBEDDING_BASE_URL` | `""` | khi semantic | `.env.example`/Settings |
| `EMBEDDING_API_KEY` | `""` | tùy provider | secret manager/local env |
| `EMBEDDING_MODEL` | `""` | khi semantic | Settings |
| `EMBEDDING_DIMENSIONS` | `0` | >=1 khi semantic | Settings/provider |
| `EMBEDDING_BATCH_SIZE` | `32` | không | Settings |
| `SEMANTIC_MIN_SIMILARITY` | `0.65` | không | Settings |
| `INDEX_MAX_RETRIES` | `5` | không | Settings; hiện chưa có dòng trong `.env.example` |

API phải tương thích OpenAI embeddings (`POST {BASE_URL}/embeddings`). Đổi model hoặc dimension tạo model key mới và cần re-index; vector phải đúng số chiều, finite và có ít nhất một giá trị khác 0. Provider retry timeout/connect/protocol và HTTP 429/500/502/503/504 tối đa ba lần với exponential backoff/Retry-After; lỗi khác dừng.

## Worker

```text
PYTHONPATH=backend .venv/bin/python -u -m app.services.index_worker --once --document-id <id>
cd backend && PYTHONPATH=. ../.venv/bin/python -u -m app.services.index_worker --once --document-id <id>
```

`--once` xử lý việc đủ điều kiện rồi thoát; bỏ `--once` chạy loop; `--document-id` giới hạn tài liệu. Worker collect → embed theo batch → publish. Backoff lỗi tăng theo attempts, tối đa 900 giây; trước giới hạn là `retry`, đạt `INDEX_MAX_RETRIES` là `failed`. Retry thủ công qua `POST /documents/{id}/index-retry` chỉ owner cá nhân hoặc group write/full và reset attempts/error.

Log an toàn chỉ gồm run/document ID, stage (`collect|embedding|publish`), attempt, outcome, counts, elapsed và HTTP status. Không log body, API key, URL có credential hay response body.

## Troubleshooting

- `collect`/file missing: kiểm tra storage resolver và file key bằng metadata, không in body; sửa storage rồi retry.
- timeout/429/5xx: xem stage và sanitized status; kiểm tra provider availability/rate limit, không copy response.
- dimension/count/finite/nonzero: kiểm tra model và `EMBEDDING_DIMENSIONS`, re-index sau khi sửa.
- `failed`: xác nhận attempts/last_error type, sửa nguyên nhân, gọi retry endpoint; không update SQL tùy ý.
- migration thiếu: kiểm tra `alembic current`, `alembic heads`, extension `unaccent`/`vector`; chỉ migrate DB local đã xác nhận.

## Search

`GET /search/full` nhận `mode=keyword|hybrid` và `match_fields` lặp lại từ `title|content|semantic`. Nếu có `match_fields`, nó quyết định pipeline bất kể `mode`; nếu không, keyword dùng SearchService cũ, hybrid dùng cả ba field qua evidence search. `match.methods` là `lexical_title`, `lexical_content`, `semantic`. Provider không khả dụng trả lexical fallback và `unavailable_match_fields`.

## Security

Không commit `.env`, key/token hoặc URL có credential. Redact exception/headers; chỉ ghi type lỗi, stage, run/document ID và status. Citation/chunk chỉ đọc sau permission boundary; revoked user không được nhận evidence.
