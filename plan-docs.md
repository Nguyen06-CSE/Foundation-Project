# Kế hoạch hoàn thiện tài liệu dự án

Kế hoạch này chia công việc thành các giai đoạn nhỏ để bạn lần lượt giao cho Antigravity đọc code và viết tài liệu. Sau khi hoàn thành tất cả giai đoạn, mình sẽ rà soát toàn bộ bộ docs.

## Nguyên tắc bắt buộc

1. **Giữ nguyên nội dung hiện có trong `docs/feat/`.** Antigravity không được sửa, đổi tên, di chuyển, gộp hoặc xóa file trong thư mục này. Có thể đọc chúng để hiểu nội dung và tạo tài liệu mới bên ngoài `docs/feat/` có liên kết đến đó.
2. Xác nhận `docs/` là nguồn nội dung Docusaurus bằng cách kiểm tra cấu hình trong `docs-site/` trước khi tạo trang. Không tạo bản sao nội dung trong `docs-site/`.
3. Phân biệt rõ **yêu cầu sản phẩm**, **hành vi mong muốn**, **hiện trạng code**, **khoảng cách giữa yêu cầu và hiện trạng**, và **kế hoạch đã được xác nhận**. Không bỏ yêu cầu sản phẩm chỉ vì code chưa triển khai.
4. Không suy đoán. Ghi rõ những điều chưa xác minh, mâu thuẫn hoặc cần quyết định từ nhóm.
5. Sau mỗi giai đoạn, kiểm tra Markdown, liên kết, sidebar và build Docusaurus; gửi báo cáo trước khi chuyển sang giai đoạn tiếp theo.

## [x] Giai đoạn 0 — Khảo sát repository và tài liệu
- *Trạng thái:* `[x] DONE` — Báo cáo kiểm kê, sơ đồ nguồn tài liệu, danh sách vấn đề broken links và đề xuất thứ tự xử lý.

## [x] Giai đoạn 1 — Tổng quan dự án
- *Trạng thái:* `[x] DONE` — Đã tạo `docs/overview/` (README, PROJECT_INTRODUCTION, PROJECT_SCOPE, KEY_FEATURES, USER_ROLES_AND_PERMISSIONS, GLOSSARY), cập nhật `docs/README.md` và `sidebars.ts`.

## [x] Giai đoạn 2 — Yêu cầu và nghiệp vụ
- *Trạng thái:* `[x] DONE` — Đã tạo `docs/requirements/` (README, BUSINESS_REQUIREMENTS, FUNCTIONAL_REQUIREMENTS, NON_FUNCTIONAL_REQUIREMENTS, BUSINESS_RULES) và 6 use cases trong `use-cases/`.

## [x] Giai đoạn 3 — Kiến trúc hệ thống
- *Trạng thái:* `[x] DONE` — Đã tạo `docs/system-architecture/` (README, SYSTEM_OVERVIEW, TECHNOLOGY_STACK, FRONTEND_ARCHITECTURE, BACKEND_ARCHITECTURE, DATABASE_ARCHITECTURE, STORAGE_ARCHITECTURE, SECURITY_ARCHITECTURE) và 5 ADRs trong `adr/`. Docusaurus build thành công.

## [x] Giai đoạn 4 — Hướng dẫn phát triển
- *Trạng thái:* `[x] DONE` — Đã tạo `docs/development/` (README, PREREQUISITES, ENVIRONMENT_VARIABLES, DATABASE_SETUP, DEVELOPMENT_WORKFLOW, TROUBLESHOOTING), chuẩn hóa `LOCAL_DEVELOPMENT_GUIDE.md`, cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 5 — Deployment và vận hành
- *Trạng thái:* `[x] DONE` — Hoàn thiện `docs/deployment/README.md`, tạo `DEPLOYMENT_GUIDE.md`, `ENVIRONMENT_CONFIGURATION.md`, `RELEASE_AND_ROLLBACK.md`, giữ nguyên tài liệu storage/troubleshooting hiện có (`STORAGE_R2.md`, `TROUBLESHOOTING.md`, `BUG_FIX_REPORT.md`, `ENV_VARIABLES.md`), cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 6 — API
- *Trạng thái:* `[x] DONE` — Tạo `docs/api/` (README, API_CONVENTIONS, AUTHENTICATION, ERROR_HANDLING, API_CATALOG), trích xuất chuẩn `openapi.json` và `openapi.yaml` (128 endpoints thực tế) từ FastAPI runtime, cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 7 — Database và dữ liệu
- *Trạng thái:* `[x] DONE` — Tạo `docs/data/` (README, DATABASE_OVERVIEW, DATA_DICTIONARY với đầy đủ 26 bảng, ERD với sơ đồ Mermaid, MIGRATIONS với chuỗi 7 revision Alembic và hướng dẫn lệnh), cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 8 — Tài liệu feature mới và chỉ mục feature
- *Trạng thái:* `[x] DONE` — Tạo `docs/feat/README.md` làm danh mục chỉ mục tổng thể cho 10 phân hệ tính năng, liên kết chéo với `KEY_FEATURES.md`, bảo toàn 100% nguyên vẹn cấu trúc và file hiện có trong `docs/feat/`, cập nhật `sidebars.ts`. Docusaurus build thành công.

## [ ] Giai đoạn 9 — Kiểm thử và chất lượng

**Mục tiêu:** Mô tả cách kiểm tra chất lượng dựa trên test và quy trình thực tế.

**Tài liệu:**

- `docs/testing/README.md`
- `TESTING_STRATEGY.md`
- `RUNNING_TESTS.md`
- Test case theo use case/feature nếu có căn cứ.
- `QUALITY_AND_KNOWN_LIMITATIONS.md`

**Tiêu chí hoàn thành:** Phân biệt rõ kiểm thử đang tồn tại, phạm vi đã chạy, khoảng trống và kế hoạch. Không khẳng định có kiểm thử nếu chưa xác minh.

## [ ] Giai đoạn 10 — Bảo mật và quyền riêng tư

**Mục tiêu:** Tập hợp thông tin bảo mật thành tài liệu dễ tra cứu; nội dung nền tảng đã được xem xét từ giai đoạn 2, 3, 6 và 7.

**Tài liệu:**

- `docs/security/README.md`
- `SECURITY_OVERVIEW.md`
- `AUTHORIZATION_AND_ACCESS_CONTROL.md`
- `SECRETS_AND_CONFIGURATION.md`
- `DATA_HANDLING.md`
- `SECURITY_REPORTING.md` nếu đã xác nhận kênh/quy trình báo cáo.

**Tiêu chí hoàn thành:** Mô tả đúng biện pháp hiện có, giới hạn và điểm cần xử lý; không để lộ bí mật. Quy trình chưa có phải được đánh dấu cần nhóm quyết định.

## [ ] Giai đoạn 11 — Quy chuẩn duy trì tài liệu

**Mục tiêu:** Đặt quy ước chính thức để tài liệu được cập nhật nhất quán.

**Tài liệu:**

- `docs/DOCUMENTATION_GUIDE.md`
- `docs/templates/FEATURE_TEMPLATE.md` — dùng cho feature mới, không dùng để sửa nội dung hiện có trong `docs/feat/`.
- `ADR_TEMPLATE.md`
- `TEST_CASE_TEMPLATE.md`
- Quy ước trạng thái tài liệu, nguồn chuẩn, liên kết code/API/schema và quy trình cập nhật docs cùng thay đổi sản phẩm.

**Tiêu chí hoàn thành:** Người đóng góp biết cách tạo tài liệu mới và cập nhật đúng nguồn mà không sao chép nội dung từ nơi khác.

## [ ] Giai đoạn 12 — Tích hợp website và duyệt cuối

**Mục tiêu:** Kiểm định cả bộ tài liệu sau khi các giai đoạn trước hoàn tất.

**Việc làm:**

- Rà soát sidebar, tiêu đề, slug, navbar/footer và thứ tự đọc.
- Kiểm tra liên kết Markdown, ảnh, đường dẫn GitHub Pages.
- Build Docusaurus và xử lý lỗi phát sinh từ tài liệu mới.
- Đối chiếu thuật ngữ, yêu cầu, kiến trúc, API, schema, deployment, testing và security.
- Xác nhận không có file/nội dung trong `docs/feat/` bị thay đổi.
- Tổng hợp vấn đề còn lại và nội dung cần xác nhận.

**Tiêu chí hoàn thành:** Website build được, điều hướng hoạt động, tài liệu không có mâu thuẫn nghiêm trọng và nội dung chưa xác minh được liệt kê rõ.

## Kiểm định bắt buộc sau mỗi giai đoạn

Antigravity gửi báo cáo gồm:

- File được tạo/cập nhật; file được giữ nguyên.
- Xác nhận không sửa nội dung trong `docs/feat/`.
- Nguồn code, cấu hình hoặc tài liệu dùng để xác minh.
- Mâu thuẫn phát hiện được và cách xử lý.
- Nội dung chưa đủ bằng chứng.
- Kết quả kiểm tra Markdown, liên kết, sidebar và Docusaurus build.
- Việc còn lại trước khi chuyển giai đoạn.

Các giai đoạn có thể hoàn tất từng phần, nhưng nên giữ thứ tự từ giai đoạn 0 đến 12 để tài liệu nền tảng định hướng các tài liệu kỹ thuật. Sau khi bạn hoàn thành và gửi lại kết quả, mình sẽ duyệt toàn bộ bộ docs một lượt.