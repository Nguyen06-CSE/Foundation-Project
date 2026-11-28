---
title: "ADR-006: PostgreSQL hybrid retrieval với pgvector"
sidebar_position: 6
---

# ADR-006: PostgreSQL hybrid retrieval với pgvector

## Context và drivers

Cần tìm theo từ khóa tiếng Việt, diễn đạt lại và citation trong cùng boundary quyền. Drivers: triển khai gọn, tận dụng PostgreSQL học thuật, không thêm vector database vận hành riêng.

## Options

FTS-only thiếu semantic; external vector DB tăng vận hành và permission sync; long-context/generative vượt phạm vi. PostgreSQL + pgvector hybrid giữ metadata, FTS, vector và permission trong một transaction boundary.

## Decision

Chọn PostgreSQL FTS + unaccent + GIN kết hợp pgvector, rank fusion và lexical fallback. Chunk/run được publish active theo checksum.

## Consequences

Ưu điểm: ít hệ thống, transaction/visibility nhất quán. Đánh đổi: cần extension, provider embedding, re-index khi đổi model/dimension; performance phải benchmark local.

## Security/verification

Permission filter nằm trong query evidence; revoked không nhận chunk. Code/tests đã có; operational DB deferred theo runbook local, không có số liệu giả.
