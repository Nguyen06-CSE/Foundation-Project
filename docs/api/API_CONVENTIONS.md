---
title: Quy Ước Thiết Kế API
sidebar_label: 📐 Quy ước API
sidebar_position: 2
---

# Quy Ước Thiết Kế API (API Conventions)

Tài liệu này xác lập các chuẩn mực kỹ thuật và quy tắc thiết kế chung cho toàn bộ giao diện lập trình ứng dụng (API) của Foundation Project. Mọi endpoint mới được phát triển cần tuân thủ nghiêm ngặt các quy ước này nhằm đảm bảo tính nhất quán giữa Backend (FastAPI) và Frontend (React / Vite).

---

## 1. Phương Thức HTTP (HTTP Methods)

Hệ thống tuân thủ ngữ nghĩa chuẩn của giao thức HTTP/1.1 và HTTP/2:

| Phương thức | Ngữ nghĩa | Tính bất biến (Idempotent) | Ví dụ trong hệ thống |
| :--- | :--- | :--- | :--- |
| `GET` | Đọc hoặc truy vấn dữ liệu | Có (Safe & Idempotent) | `GET /documents/`, `GET /users/me` |
| `POST` | Tạo mới tài nguyên hoặc kích hoạt tác vụ nghiệp vụ | Không | `POST /documents/upload`, `POST /folders/` |
| `PATCH` | Cập nhật một phần (Partial update) của tài nguyên | Có | `PATCH /users/me`, `PATCH /documents/{doc_id}` |
| `PUT` | Thay thế toàn bộ tài nguyên (nếu có) | Có | `PUT /workspace_tags/{tag_id}` |
| `DELETE` | Xóa tài nguyên (Soft delete hoặc Hard delete) | Có | `DELETE /documents/{doc_id}`, `DELETE /favorites/{id}` |

---

## 2. Quy Tắc Đặt Tên Điểm Cuối (Endpoint Naming)

1. **Danh từ số nhiều**: Sử dụng danh từ số nhiều cho collection đại diện cho tài nguyên:
   - `/documents/` thay vì `/document/`
   - `/folders/` thay vì `/folder/`
   - `/notifications/` thay vì `/notification/`
2. **Kebab-case cho đường dẫn**: Sử dụng chữ thường kết hợp dấu gạch nối:
   - `/download-logs/`
   - `/document-versions/{document_id}`
   - `/workspace-tags/`
3. **Trailing Slash**: Do cấu hình của FastAPI router, các collection router thường có dấu `/` ở cuối (ví dụ: `GET /folders/`, `POST /documents/`). Frontend client nên sử dụng đúng đường dẫn có dấu gạch chéo cuối để tránh tình trạng HTTP 307 Temporary Redirect từ FastAPI.
4. **Hành động nghiệp vụ (Custom Actions)**: Khi một hành vi không thể biểu diễn bằng RESTful CRUD thông thường, sử dụng động từ ở cuối đường dẫn:
   - `POST /trash/{document_id}/restore`: Khôi phục tài liệu từ thùng rác.
   - `DELETE /trash/{document_id}/purge`: Xóa vĩnh viễn tài liệu.
   - `POST /notifications/mark-all-read`: Đánh dấu tất cả thông báo đã đọc.

---

## 3. Định Dạng Dữ Liệu (Payload & Data Types)

### 3.1. Chuẩn đặt tên thuộc tính (Key Naming)
- **JSON Request & Response**: Luôn sử dụng kiểu **`snake_case`** cho tất cả các trường dữ liệu (tuân thủ quy ước chuẩn của Python Pydantic V2).
  - Ví dụ: `document_id`, `created_at`, `file_size`, `download_count`.
- **Khuyến nghị cho Frontend**: Tận dụng TypeScript interfaces với thuộc tính `snake_case` tương ứng để đồng bộ kiểu 1:1 với schema Pydantic.

### 3.2. Định dạng Thời Gian (Date and Time)
- Toàn bộ mốc thời gian trao đổi qua API đều ở định dạng chuẩn **ISO-8601** theo múi giờ quốc tế UTC:
  ```text
  YYYY-MM-DDTHH:MM:SS.mmmmmmZ
  Ví dụ: 2026-11-14T03:55:00.123456Z
  ```
- Frontend nhận giá trị này và định dạng hiển thị ra giờ địa phương (`Asia/Ho_Chi_Minh`, GMT+7) thông qua các thư viện như `date-fns` hoặc `dayjs`.

### 3.3. Dữ liệu File Upload (Multipart Form Data)
- Các endpoint tải tài liệu lên hệ thống sử dụng `Content-Type: multipart/form-data`:
  - `POST /documents/upload`: Nhận file binary (`file: UploadFile`) cùng các form fields: `title`, `description`, `category_id`, `faculty_id`, `subject_id`, `tag_names`, `is_public`.
  - `POST /documents/upload-batch`: Nhận danh sách nhiều file `files: List[UploadFile]`.

---

## 4. Phân Trang, Lọc & Sắp Xếp (Pagination, Filtering, Sorting)

### 4.1. Phân trang kiểu Skip / Limit
Hầu hết các endpoint danh sách trong hệ thống sử dụng tham số truy vấn:
- `skip` (kiểu `int`, mặc định `0`, tối thiểu `0`): Số lượng bản ghi cần bỏ qua.
- `limit` (kiểu `int`, mặc định `20` hoặc `50`, tối đa `100`): Số lượng bản ghi tối đa lấy về trong một trang.

**Ví dụ:**
```http
GET /documents/?skip=20&limit=10 HTTP/1.1
```

### 4.2. Phân trang kiểu Page / Page Size
Một số router đặc thù (như Library hoặc Group feeds) hỗ trợ phân trang theo trang:
- `page` (kiểu `int`, mặc định `1`): Số thứ tự trang hiện tại.
- `page_size` (kiểu `int`, mặc định `20`): Kích thước mỗi trang.

### 4.3. Lọc dữ liệu (Filtering)
Hệ thống hỗ trợ các query parameters tùy chọn để lọc danh sách:
- Lọc theo phân loại: `category_id`, `faculty_id`, `subject_id`
- Lọc theo tag: `tag=python`
- Lọc theo trạng thái: `is_public=true`, `status=active`
- Lọc theo khoảng thời gian: `from_date`, `to_date`

---

## 5. Chính Sách CORS & Phục Vụ Tệp Tĩnh

### 5.1. Cấu hình CORS (Cross-Origin Resource Sharing)
Backend kích hoạt `CORSMiddleware` với chính sách:
- **Allowed Origins**:
  - `http://localhost:5173`, `http://localhost:5174` (Vite dev server)
  - `http://localhost:3000` (Next.js / CRA dev server)
  - `http://127.0.0.1:5173`, `http://127.0.0.1:5174`
  - `https://foundation-project-murex.vercel.app` (Production Web client)
  - `https://macbook-pro-2.taile4a1e8.ts.net` (Tailscale funnel)
- **Allowed Methods**: Tất cả (`*`)
- **Allowed Headers**: Tất cả (`*`)
- **Credentials**: `allow_credentials=True` (cho phép gửi Cookie và Authorization header)

### 5.2. Tối ưu Bộ Nhớ Đệm Tệp Tĩnh (Static Files Caching)
Đường dẫn `/storage` được phục vụ qua lớp kế thừa `CachedStaticFiles`:
```python
response.headers["Cache-Control"] = "public, max-age=3600"
```
Header này chỉ thị trình duyệt và các CDN đệm tệp tĩnh trong 1 giờ (3600 giây), giúp giảm áp lực I/O cho server khi tải ảnh thumbnail, markdown đính kèm và tài liệu xem trước.
