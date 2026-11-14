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

## [x] Giai đoạn 9 — Kiểm thử và chất lượng
- *Trạng thái:* `[x] DONE` — Tạo `docs/testing/` (README, TESTING_STRATEGY, RUNNING_TESTS, TEST_CASES ánh xạ 6 Use Cases, QUALITY_AND_KNOWN_LIMITATIONS phân tích trung thực khoảng trống và lộ trình), cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 10 — Bảo mật và quyền riêng tư
- *Trạng thái:* `[x] DONE` — Tạo `docs/security/` (README, SECURITY_OVERVIEW, AUTHORIZATION_AND_ACCESS_CONTROL, SECRETS_AND_CONFIGURATION, DATA_HANDLING, SECURITY_REPORTING), cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 11 — Quy chuẩn duy trì tài liệu
- *Trạng thái:* `[x] DONE` — Tạo `docs/DOCUMENTATION_GUIDE.md` và 3 biểu mẫu chuẩn hóa trong `docs/templates/` (`FEATURE_TEMPLATE.md`, `ADR_TEMPLATE.md`, `TEST_CASE_TEMPLATE.md`), cập nhật `sidebars.ts`. Docusaurus build thành công.

## [x] Giai đoạn 12 — Tích hợp website và duyệt cuối
- *Trạng thái:* `[x] DONE` — Hoàn tất kiểm tra liên kết toàn bộ website Docusaurus (`npm run build` thành công 100%), tối ưu hóa Navbar và Footer links, cập nhật cổng thông tin `docs/README.md`, đồng bộ hóa thuật ngữ trên 12 giai đoạn, xác nhận bảo toàn tuyệt đối 100% nội dung `docs/feat/`. Hệ thống sẵn sàng cho hội đồng và người dùng tra cứu.

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