---
id: DOCUMENTATION_GUIDE
title: Quy Chuẩn Duy Trì & Viết Tài Liệu
sidebar_label: 📖 Quy chuẩn Duy trì Tài liệu
sidebar_position: 6
---

# Quy Chuẩn Duy Trì & Viết Tài Liệu (Documentation Guide)

Tài liệu này xác lập các tiêu chuẩn chất lượng, quy ước trạng thái và quy trình bắt buộc dành cho mọi lập trình viên và người đóng góp (Contributors) khi cập nhật hoặc khởi tạo tài liệu mới cho **Foundation Project**.

---

## 1. Nguyên Tắc Cốt Lõi Về Nguồn Chuẩn (Single Source of Truth)

Nhằm đảm bảo tính chính xác và tránh hiện tượng phân mảnh thông tin, mọi tài liệu phải tuân thủ nghiêm ngặt bảng nguồn chuẩn:

| Khía cạnh kỹ thuật | Nguồn chuẩn xác thực (Source of Truth) | Quy tắc viết tài liệu |
| :--- | :--- | :--- |
| **Kiến trúc CSDL & Bảng dữ liệu** | `backend/app/models/` & `alembic/versions/` | Trích xuất trực tiếp từ model SQLAlchemy. Không dùng các file `.sql` cũ trong references làm nguồn chân lý. |
| **Đặc tả RESTful API** | `backend/app/routers/` & `backend/app/main.py` | Sử dụng endpoint thực tế và file đặc tả `docs/api/openapi.yaml` được sinh tự động từ FastAPI. |
| **Quy tắc Nghiệp vụ (Business Rules)** | `docs/requirements/BUSINESS_RULES.md` & code logic | Mô tả logic nghiệp vụ độc lập với hiện trạng mã nguồn; ghi nhận rõ Implementation Gap nếu code chưa đáp ứng. |
| **Quyết định Kiến trúc** | `docs/system-architecture/adr/` | Sử dụng định dạng ADR (Architecture Decision Record) để lưu vết lý do kỹ thuật. |
| **Quy định Thư mục `docs/feat/`** | Toàn bộ 10 thư mục hiện có | **Bất biến (Immutable)**: Giữ nguyên cấu trúc và file hiện có. Tính năng mới tạo folder riêng theo [Feature Template](./templates/FEATURE_TEMPLATE.md). |

---

## 2. Quy Ước Nhãn Trạng Thái (Status Conventions)

Khi mô tả bất kỳ tính năng, yêu cầu nghiệp vụ hoặc endpoint nào, người viết bắt buộc phải gắn một trong các nhãn chuẩn sau:

- `Confirmed`: Yêu cầu đã được Ban Quản Lý / Giảng viên xác nhận chính thức.
- `Implemented`: Đã được lập trình hoàn tất trong mã nguồn và có test case kiểm chứng.
- `Planned`: Đã xác nhận trong phạm vi sản phẩm nhưng chưa bắt đầu triển khai code.
- `In Progress`: Đang trong quá trình phát triển sprint hiện tại.
- `Needs Verification`: Nghiệp vụ hoặc thông số kỹ thuật chưa đủ bằng chứng trong mã nguồn, cần trao đổi lại với nhóm.

---

## 3. Tiêu Chuẩn Trình Bày Markdown & Docusaurus

Hệ thống tài liệu được biên dịch tĩnh bởi Docusaurus, yêu cầu tuân thủ các quy tắc định dạng:

### 3.1. Phần Đầu Trang (Frontmatter)
Mọi file Markdown `.md` mới tạo phải chứa khối frontmatter hợp lệ:
```markdown
---
title: Tiêu Đề Bài Viết Ngắn Gọn Và Rõ Ràng
sidebar_label: 📑 Tên hiển thị trên Sidebar
sidebar_position: 1
---
```
> [!TIP]
> Không cần chỉ định `id` thủ công trừ khi bạn muốn ghi đè tên slug đường dẫn. Docusaurus sẽ tự động lấy tên file (bỏ đuôi `.md`) làm ID mặc định.

### 3.2. Hộp Ghi Chú Chuẩn GitHub (GitHub Alerts)
Sử dụng các alert có cấu trúc để nhấn mạnh thông tin quan trọng:
```markdown
> [!NOTE] Thông tin nền tảng, ngữ cảnh giải thích thêm.
> [!TIP] Lời khuyên tối ưu hiệu năng hoặc mẹo lập trình hay.
> [!IMPORTANT] Yêu cầu bắt buộc hoặc các bước không thể bỏ qua.
> [!WARNING] Rủi ro tương thích hoặc các lỗi tiềm ẩn.
> [!CAUTION] Cảnh báo hành động có nguy cơ mất mát dữ liệu hoặc rò rỉ bảo mật.
```

### 3.3. Biểu Đồ Trực Quan (Mermaid Diagrams)
Ưu tiên sử dụng Mermaid thay vì chèn ảnh chụp màn hình tĩnh:
- Flowchart: `flowchart TD` hoặc `flowchart LR`
- Sequence Diagram: `sequenceDiagram`
- State Diagram: `stateDiagram-v2`
- Entity Relationship: `erDiagram`

---

## 4. Quy Trình Cập Nhật Tài Liệu Cùng Code (Docs-as-Code Workflow)

Khi có một tính năng hoặc thay đổi kỹ thuật mới:
1. **Bước 1 — Cập nhật mã nguồn & Schema**: Sửa đổi models, router, giao diện hoặc viết migration Alembic tương ứng.
2. **Bước 2 — Cập nhật tài liệu kỹ thuật**:
   - Thêm ca kiểm thử vào `docs/testing/TEST_CASES.md`.
   - Nếu thay đổi API, cập nhật `docs/api/API_CATALOG.md` và chạy lệnh xuất lại `openapi.yaml`.
   - Nếu thay đổi bảng DB, cập nhật `docs/data/DATA_DICTIONARY.md`.
3. **Bước 3 — Kiểm tra liên kết & Build Docusaurus**:
   ```bash
   npm --prefix docs-site run build
   ```
   Đảm bảo không phát sinh bất kỳ warning "Broken link" nào.
4. **Bước 4 — Commit & Push**: Đưa toàn bộ mã nguồn và tài liệu vào cùng một Git commit.
