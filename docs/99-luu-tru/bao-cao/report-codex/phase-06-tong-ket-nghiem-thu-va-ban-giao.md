# Phase 6 — Tổng kết nghiệm thu và bàn giao

Ngày: 2026-11-28

## Executive summary

Đồ án xây dựng thư viện số trên PostgreSQL và webapp, với sáu chức năng: hybrid search, Q&A có citation, summary, tag suggestions, related documents và interest stats. Code đã triển khai các luồng; regression tự động đã chạy. Tuy nhiên acceptance trên DB thật, worker và embedding chưa hoàn tất vì Neon không phân giải được trong môi trường agent; nghiệm thu local được người dùng hoãn sau Phase 6B.

Phase 6B tài liệu hóa: **PASS**. Phase 6A code/test: **PASS có điều kiện**; operational acceptance: **BLOCKED/deferred**. Không đánh dấu toàn bộ dự án PASS.

## Traceability matrix

| Chức năng | Backend / PostgreSQL | Frontend / test evidence | DB/manual | Status |
|---|---|---|---|---|
| Hybrid search | `GET /search/full`, `evidence_search.search`; FTS `tsvector`/GIN, unaccent, vector, CTE rank fusion | SearchPage/SearchBar; `test_hybrid_search.py`, `test_embedding_service.py` | Chưa có DB ready | Code/test PASS; operational BLOCKED |
| Q&A citation | `/documents/{id}/questions`, `evidence_search.question`; active run/chunks, permission CTE | Document insights UI; `test_document_insights.py` | Chưa kiểm chứng citation DB thật | Code/test PASS; operational BLOCKED |
| Summary | `/documents/{id}/summary`; JSONB summary/coverage | `AiSummarySection`; preview/insights tests | Summary hiển thị cùng description, không persist overwrite | Code/test PASS; operational BLOCKED |
| Tag suggestions | `/documents/{id}/tag-suggestions` | `useDocumentInsights`; `test_phase4_suggestions.py` | Chưa có tài liệu ready thật | Code/test PASS; operational BLOCKED |
| Related | `/documents/{id}/related`; active embeddings + visibility | related UI; phase4/hybrid tests | Chưa có embedding DB thật | Code/test PASS; operational BLOCKED |
| Interest stats | `/stats/me?days=7|30`; SQL aggregate/window logic | StatsPage; `test_phase5_interest_counts.py` | Chưa có role matrix thật | Code/test PASS; operational BLOCKED |

## Acceptance criteria mapping

| Tiêu chí | Evidence | Gap |
|---|---|---|
| upload → queue → ready/failed | `index_worker.py`, `test_document_indexing.py` | DB/worker thật |
| personal/group/revoked permissions | `group_service.py`, `test_phase6a_contracts.py` | live account matrix |
| provider fallback | `evidence_search.py`, embedding tests | live provider outage |
| citation source/version | `document_chunks`, active checksum joins | ready fixture |
| empty file | router handlers, `test_phase6a_contracts.py` | Neon integration deferred |
| preview payload | `test_document_preview_and_summary.py` | live UI retest |
| stats 7/30 | `test_phase5_interest_counts.py`, stats router | live DB |
| restart/retry/concurrency | worker tests, `FOR UPDATE SKIP LOCKED` | live worker |

## PostgreSQL learning outcomes

- Queue trigger and checksum invalidation: `ea41b38547bc_document_index.py`.
- Partial unique indexes enforce one active and one queued run.
- `b7c8d9e0f1a2` provides unaccent FTS trigger and GIN-backed vectors.
- `f2c3d4e5a6b7` enables pgvector; semantic distance uses cosine operator `<=>`.
- Evidence search uses CTEs and rank fusion; permission filtering occurs inside visible-document SQL.
- Worker claims with `FOR UPDATE SKIP LOCKED`; JSONB stores coverage/location/summary.
- Runtime `EXPLAIN (ANALYZE, BUFFERS)` remains TBD until local DB.

## Benchmark conclusion

Known data is regression/fixture only: the selected Phase 6 group currently passes 91 tests. This is not a relevance or performance benchmark; no conclusion is made that keyword or embeddings are better.

| Metric | Result |
|---|---|
| hit@5 / precision@5 / recall@5 | TBD |
| search/worker p50/p95 | TBD |
| EXPLAIN buffers | TBD |
| upload-to-search latency | TBD |
| embedding API calls/storage/cost | TBD |

Scripts and fixtures: [`run_baseline.py`](../../../../backend/tests/evaluation/run_baseline.py), [`run_hybrid_benchmark.py`](../../../../backend/tests/evaluation/run_hybrid_benchmark.py), [`manifest.json`](../../../../backend/tests/evaluation/manifest.json). Hypotheses (not results): hybrid should improve paraphrase recall; provider failures should preserve lexical availability.

## Demo/bàn giao script

1. Upload giáo trình. Expected: document created; evidence: sanitized ID/status.
2. Poll index status. Expected: coverage and `ready`; failure interpretation: collect/provider/migration stage.
3. Run worker from both CWDs. Expected: one active run, no spin; save sanitized logs.
4. Search paraphrase and unaccented keyword. Expected: methods show semantic/lexical; provider failure should show fallback.
5. Ask supported and unsupported questions. Expected: answered citation vs insufficient.
6. Open citation/chunk. Expected: same document/run and permission-safe URL.
7. Request summary, tags, related. Expected: evidence-backed responses; summary coexists with original description.
8. Open dashboard for 7/30 days. Expected: valid aggregate changes.

## Deferred local DB gate

Follow [`phase-06A-06B-local-db-verification.md`](../../test-case/phase-06A-06B-local-db-verification.md): install local PostgreSQL + `unaccent`/pgvector, migrate to `f2c3d4e5a6b7`, upload fixture, obtain ready run with one active run and nonzero chunks/embeddings, run six-feature and permission matrix, then collect benchmark metrics. Afterward update this report and Phase 6A to PASS or FAIL according to evidence.

## Known limitations/backlog

DB local operational gate, benchmark/cost/storage metrics and live role matrix remain pending. Advanced QA/text generation belongs to Phase 8; specialized OCR belongs to Phase 7. Summary currently renders with the original description and does not persistently overwrite `documents.description`.

## Final verdict

- Phase 6B: **PASS**.
- Code and automated regression: **PASS with conditions** (`91 passed`).
- Six-feature operational acceptance: **CONDITIONAL/BLOCKED** until local DB gate.
- Overall project: **not PASS**.
