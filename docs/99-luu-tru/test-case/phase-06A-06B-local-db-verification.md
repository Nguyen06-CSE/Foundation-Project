# Runbook nghiệm thu Phase 6A/6B với PostgreSQL local

Theo quyết định ngày 2026-11-28, cài PostgreSQL local và nghiệm thu DB được thực hiện sau Phase 6B. Không dùng Neon/production cho runbook này.

## Chuẩn bị

Cần PostgreSQL với extension `unaccent` và `vector` (pgvector). Tạo DB local riêng, backup/xác nhận đúng DB trước migration. Sao chép `.env.example` thành cấu hình local riêng; điền `DATABASE_URL` và embedding variables không commit secret.

```text
alembic upgrade head
alembic current
alembic heads
```

Read-only SQL (psql variable hoặc bind parameter, không chọn body/content/path):

```sql
SELECT version_num FROM alembic_version;
SELECT extname FROM pg_extension WHERE extname IN ('unaccent','vector') ORDER BY extname;
SELECT EXISTS (SELECT 1 FROM documents WHERE id=:document_id) AS document_exists;
SELECT id,status,attempts,next_attempt,last_error IS NOT NULL AS has_error,is_active
FROM document_index_runs WHERE document_id=:document_id ORDER BY id DESC;
SELECT count(*) FILTER (WHERE is_active) AS active_run_count
FROM document_index_runs WHERE document_id=:document_id;
SELECT count(*) AS chunk_count FROM document_chunks c JOIN document_index_runs r ON r.id=c.run_id
WHERE r.document_id=:document_id AND r.is_active;
SELECT count(*) AS embedding_count FROM document_chunks c JOIN document_index_runs r ON r.id=c.run_id
WHERE r.document_id=:document_id AND r.is_active AND c.embedding IS NOT NULL;
```

`unaccent` đến từ migration `b7c8d9e0f1a2`; `vector` và cột embedding đến từ `f2c3d4e5a6b7`.

Expected head: `f2c3d4e5a6b7`; migration `ea41b38547bc` tạo `document_index_runs`, `document_chunks`, trigger queue và FTS; migration `f2c3d4e5a6b7` bật vector/embedding.

## Fixture và worker

Upload một Markdown nhỏ qua API/UI, chờ queue, sau đó chạy từ hai CWD:

```text
curl -sS -X POST http://127.0.0.1:8000/documents/upload \
  -H 'Authorization: Bearer <local-test-token>' \
  -F 'title=phase6a-fixture' -F 'file=@fixture.md'
curl -sS 'http://127.0.0.1:8000/documents/<id>/index-status' \
  -H 'Authorization: Bearer <local-test-token>'

PYTHONPATH=backend .venv/bin/python -u -m app.services.index_worker --once --document-id <id>
cd backend && PYTHONPATH=. ../.venv/bin/python -u -m app.services.index_worker --once --document-id <id>
```

Chạy `--once` không spin; `--document-id` giới hạn một tài liệu. Worker collect → embedding theo batch → publish. Lỗi trước `INDEX_MAX_RETRIES` chuyển `retry` với backoff tối đa 900 giây; đạt giới hạn chuyển `failed`. Log chỉ dùng run/document/stage/attempt/status/counts, không body/key.

## SQL read-only sau worker

Chỉ lấy `id,status,attempts,next_attempt,last_error IS NOT NULL,is_active`, số active run, số chunks và số chunks có embedding. Không chọn title/content/body/path/token. Xác nhận tối đa một active run và status `ready`/`empty`/`failed`.

## Checklist chức năng/quyền

Sau khi có `ready`: keyword, unaccent, hybrid/semantic + `match.methods`; Q&A answered/insufficient và citation cùng doc/run; summary/coverage; tag suggestions; related; preview không có full content; stats 7/30 ngày. Kiểm thử owner, group reader (đọc nhưng không retry/tag), revoked (không citation/retry).

Upload empty: single personal/group trả 400 `EMPTY_FILE`; batch trả `skipped.empty_file`; bundle `[valid,empty]` trả 400, rollback, không child/run/dung lượng tăng và object valid được cleanup. Dùng transaction rollback/test DB riêng để không để rác.

| Chức năng | Expected | Evidence |
|---|---|---|
| keyword/unaccent | kết quả lexical đúng, không dấu vẫn khớp | sanitized JSON + query |
| hybrid/semantic | methods gồm semantic khi vector sẵn; fallback có cờ | response fields |
| Q&A/citation | answered có citation đúng doc/run; thiếu căn cứ = insufficient | status/citation IDs |
| summary/coverage | summary AI hiển thị trong tab/khu vực Mô tả cùng mô tả gốc; kiểm tra mô tả gốc vẫn hiển thị và không bị ghi đè vào `documents.description`; coverage hợp lệ | response + UI screenshot |
| tags/related | chỉ tài liệu visible, không lộ chunk | response IDs |
| preview/stats | không full content; days chỉ 7/30 | response keys/counts |

| Actor | Read visible doc | Retry/tag mutation |
|---|---|---|
| owner | PASS | PASS |
| group reader | PASS | 403 |
| revoked/non-member | 403/404 convention | 403/404 |

Cleanup test data: ưu tiên transaction rollback hoặc DB/schema test riêng; xóa chỉ fixture ID đã xác định qua API ứng dụng nếu cần. Không dùng `DROP`, `TRUNCATE`, wildcard delete hay recursive filesystem cleanup.

## Tiêu chí đổi Phase 6A BLOCKED → PASS

Migration current=head; fixture ready với tối đa một active run và embedding count > 0; worker chạy độc lập CWD; toàn bộ API/quyền checklist có bằng chứng DB thật; không có log secret/body; test hồi quy và frontend (nếu contract đổi) xanh.
