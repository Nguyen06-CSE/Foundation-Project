# Kiểm thử AI/vector và kết quả nghiệm thu

## Strategy

Fixture/evaluation nằm tại `backend/tests/evaluation/`; regression chọn 91 tests từ indexing, insights, embedding, hybrid, phase4/5, preview và documents. Đây không phải full suite hay benchmark.

## Kết quả

`91 passed, 12 warnings`; không có DB local ready. Manual #1085 từng bị pending/collect error; code đã sửa retry limit, path resolver, empty-file và permission retry.

| Hạng mục | Expected | Actual/evidence |
|---|---|---|
| indexing/worker | ready, one active | DB deferred |
| semantic/QA/summary | evidence-backed | fixture/unit only |
| permissions | owner/editor vs reader/revoked | handler tests; live matrix deferred |
| benchmark | hit@5/p50/p95 | TBD |

Không gọi PASS vận hành. Sau khi cài DB local, chạy [runbook](../99-luu-tru/test-case/phase-06A-06B-local-db-verification.md), lưu sanitized evidence và cập nhật Phase 6A.
