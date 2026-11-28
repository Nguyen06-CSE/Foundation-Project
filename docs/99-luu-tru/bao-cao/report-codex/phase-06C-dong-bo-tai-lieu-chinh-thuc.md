# Phase 6C — Đồng bộ tài liệu chính thức

## Mục tiêu và mapping

Đưa kiến trúc AI/vector, requirements, local operation, ADR, feature/API và QA vào docs chính thức phục vụ bảo vệ. Files đã đồng bộ: `docs/01-tong-quan`, `02-huong-dan-local`, `03-kien-truc`, `04-co-so-du-lieu`, `05-tinh-nang`, `06-kiem-thu-va-han-che`, `docs/api`, `docs/requirements` và UC07. Nguồn chân lý là code/migration/tests; `99-luu-tru` chỉ là bằng chứng lịch sử.

Sáu chức năng được mô tả: hybrid search, Q&A citation, summary, tag suggestions, related và interest stats. Summary coexist với description, không persist overwrite. OCR Phase 7/advanced QA Phase 8 ngoài phạm vi.

## Validation

Đã chạy `git diff --check -- docs`, script kiểm tra Markdown links, `rg` đối chiếu endpoint/env/status/column/migration và kiểm tra Mermaid fences. Không sửa production code/DB, không đưa secret, không gọi 91 selected regression tests là full-suite/benchmark.

Phase 6A operational vẫn BLOCKED/deferred do PostgreSQL local chưa cài; không có latency/accuracy giả. Phase 6B tài liệu hóa PASS có điều kiện. Các tài liệu mới phục vụ bảo vệ nhưng phải cập nhật lại sau local gate.

Validation: đối chiếu endpoint/env/status/column/migration bằng `rg`; kiểm tra Mermaid và Markdown links; `git diff --check` cần chạy ở workspace trước bàn giao. Phase 7 OCR chuyên biệt và Phase 8 advanced QA không được coi là đã triển khai.
