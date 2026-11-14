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

## [ ] Giai đoạn 4 — Hướng dẫn phát triển

**Mục tiêu:** Hướng dẫn developer thiết lập và chạy dự án.

**Tài liệu:**

- `docs/development/README.md`
- `PREREQUISITES.md`
- Chuẩn hóa `LOCAL_DEVELOPMENT_GUIDE.md` hiện có nếu cần.
- `ENVIRONMENT_VARIABLES.md` — một nguồn chuẩn cho danh sách và ý nghĩa biến môi trường.
- `DATABASE_SETUP.md`
- `DEVELOPMENT_WORKFLOW.md`
- `TROUBLESHOOTING.md` cho lỗi local.

**Tiêu chí hoàn thành:** Hướng dẫn có thể làm theo, không chứa giá trị bí mật hoặc bước lỗi thời; lỗi local được phân biệt với lỗi production.

## [ ] Giai đoạn 5 — Deployment và vận hành

**Mục tiêu:** Mô tả cách triển khai và vận hành các môi trường đang được sử dụng.

**Tài liệu:**

- Hoàn thiện `docs/deployment/README.md`.
- `DEPLOYMENT_GUIDE.md` — quy trình đã xác minh.
- `ENVIRONMENT_CONFIGURATION.md` — khác với danh mục biến môi trường: giải thích cấu hình theo môi trường và dẫn về nguồn chuẩn.
- Giữ/cập nhật tài liệu storage hiện có ngoài `docs/feat/`.
- `RELEASE_AND_ROLLBACK.md` nếu quy trình thực sự tồn tại.
- `TROUBLESHOOTING.md` cho sự cố triển khai/vận hành.

**Tiêu chí hoàn thành:** Quy trình thực tế được mô tả chính xác. Phần chưa được chuẩn hóa phải ghi rõ, không viết thành quy trình chính thức.

## [ ] Giai đoạn 6 — API

**Mục tiêu:** Tạo điểm tra cứu API toàn hệ thống mà không nhân đôi đặc tả.

**Tài liệu:**

- `docs/api/README.md`
- `API_CONVENTIONS.md`
- `AUTHENTICATION.md` — cơ chế dùng chung, liên kết tới kiến trúc bảo mật.
- `ERROR_HANDLING.md`
- `API_CATALOG.md` — danh mục và liên kết theo nhóm endpoint.
- `openapi.yaml` chỉ khi có thể lấy từ nguồn API chuẩn hoặc đồng bộ đáng tin cậy.

**Yêu cầu:** Antigravity khảo sát khả năng sinh OpenAPI từ backend và xác định nguồn chuẩn. Catalog chủ yếu làm chỉ mục; không chép lại toàn bộ đặc tả endpoint. Kiểm tra quyền truy cập API và phân biệt endpoint đã có với endpoint dự kiến.

**Tiêu chí hoàn thành:** Catalog/OpenAPI khớp endpoint thực tế và có cách phát hiện sai lệch trong tương lai.

## [ ] Giai đoạn 7 — Database và dữ liệu

**Mục tiêu:** Tạo tài liệu tra cứu schema toàn hệ thống.

**Tài liệu:**

- `docs/data/README.md`
- `DATABASE_OVERVIEW.md`
- `DATA_DICTIONARY.md`
- `ERD` hoặc sơ đồ quan hệ được tạo từ schema hiện hành.
- `MIGRATIONS.md` nếu repository có lịch sử migration xác thực.
- Chỉ mục tới SQL tham khảo và tài liệu database theo feature đang có.

**Yêu cầu:** Xác định schema/migration nào là hiện hành; không coi mọi file SQL trong references là nguồn chuẩn. Kiểm tra quyền truy cập và dữ liệu nhạy cảm ở mức tài liệu.

**Tiêu chí hoàn thành:** ERD và từ điển dữ liệu phản ánh schema hiện hành, ghi rõ điểm chưa chắc chắn.

## [ ] Giai đoạn 8 — Tài liệu feature mới và chỉ mục feature

**Mục tiêu:** Giúp tìm và hiểu các feature, nhưng giữ nguyên các tài liệu feature hiện tại.

**Tài liệu/việc làm:**

- Tạo `docs/feat/README.md` làm danh mục, nếu chưa có.
- Tạo chỉ mục tổng thể bên ngoài tài liệu feature, liên kết tới các trang hiện có.
- Kiểm tra tính đầy đủ của sidebar và khả năng truy cập các tài liệu feature.
- Chỉ tạo tài liệu bổ sung **bên ngoài `docs/feat/`** nếu cần; tài liệu mới đó có thể liên kết tới nội dung feature hiện tại.
- Không áp dụng template bằng cách sửa các file feature hiện có.

**Tiêu chí hoàn thành:** Người đọc tìm được tài liệu feature hiện tại từ website; nội dung và file trong `docs/feat/` không bị thay đổi.

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