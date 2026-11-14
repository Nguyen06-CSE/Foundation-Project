---
sidebar_position: 2
---

# Quy Tắc Nghiệp Vụ: Truy Vấn, Phân Trang & Bộ Nhớ Đệm Tài Liệu

Tài liệu này xác định các quy tắc nghiệp vụ (Business Rules), thỏa thuận giao tiếp dữ liệu giữa Frontend và Backend, chính sách lưu trữ đệm (Caching Policy), và tiêu chuẩn bảo đảm tính toàn vẹn phiên làm việc.

---

## 1. Quy tắc Phân trang & Tải nối tiếp (Pagination Rules)

### 1.1. Kích thước trang & Phân trang vô tận
1. **Kích thước trang mặc định (`page_size`)**:
   - Cả kho tài liệu cá nhân và không gian nhóm thống nhất sử dụng `page_size = 20`.
   - Giới hạn hợp lệ của tham số: `1 <= page_size <= 100`.
2. **Kỹ thuật xác định trang kế tiếp (Look-Ahead `has_more`)**:
   - Backend không dùng phân trang offset mù quáng kèm `COUNT(*)` liên tục. Thay vào đó, Backend truy vấn với `fetch_limit = page_size + 1`.
   - Nếu số bản ghi trả về từ database lớn hơn `page_size`, cờ `has_more` được đặt là `True`, và chỉ lấy đúng `page_size` bản ghi đầu tiên trả về cho client.
   - Khi `has_more = True`, Frontend tính toán trang tiếp theo: `nextPage = lastPage.page + 1`.
   - Khi `has_more = False`, Frontend nhận biết đã nạp hết dữ liệu và ngắt kết nối `IntersectionObserver`.
3. **Tính toán `total` và `total_pages`**:
   - Truy vấn `COUNT(*)` chỉ được chạy **duy nhất ở trang 1 (`page == 1`)**.
   - Các trang từ `page >= 2` trả về `total: 0` để giảm tải tối đa cho máy chủ database.
   - Frontend tự động tái sử dụng `total` từ trang đầu tiên: `total = infiniteData.pages[0]?.total ?? 0`.
   - `total_pages = Math.ceil(total / page_size) || 1`.

---

## 2. Quy tắc Lọc dữ liệu (Filter Semantics & Precedence)

### 2.1. Tìm kiếm theo từ khóa (`q`)
- Tìm kiếm không phân biệt chữ hoa/thường (`ILIKE`).
- Một tài liệu được coi là khớp nếu từ khóa xuất hiện ở một trong các vị trí sau:
  1. Trong tiêu đề tài liệu (`Document.title`).
  2. Trong tên bất kỳ tag nào gắn với tài liệu (`tags.name`).
  3. Trong tiêu đề hoặc tag của các tệp con nếu tài liệu là một Bundle (`Document.bundle_parent_id`).
- Debounce ở tầng giao diện: Bắt buộc áp dụng thời gian chờ **300ms** trước khi đưa từ khóa vào `queryParams` gửi lên server.

### 2.2. Lọc theo Thư mục (`folder_id`) — Quyết định kiến trúc Q1
Một tài liệu thuộc về thư mục nếu thỏa mãn một trong hai điều kiện:
1. Trường `Document.metadata['folder_id']` hoặc cột `folder_id` khớp với ID thư mục đã chọn.
2. **HOẶC** tài liệu có gắn thẻ (tag) mang tên hoặc ID trùng với tag quản lý của thư mục đó (`DocumentTag.tag_id IN folder.tag_ids`).

### 2.3. Lọc theo Phân loại tệp (`file_type`)
Ánh xạ đồng nhất giữa Tab giao diện và loại MIME Backend:
- **PDF**: `application/pdf`, `pdf`.
- **Image**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- **Document**: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `text/plain`.
- **Other**: Bất kỳ định dạng nào không thuộc 3 nhóm trên (nén `.zip`, `.rar`, binary,...).

### 2.4. Lọc theo Thời gian tải lên (`uploaded_within`)
Backend xử lý dựa trên mốc thời gian UTC hiện tại:
- `today`: `created_at >= start_of_today (00:00:00 UTC)`.
- `last_7_days`: `created_at >= now - 7 days`.
- `last_30_days`: `created_at >= now - 30 days`.
- `this_year`: `created_at >= 01/01 năm hiện tại`.

### 2.5. Thứ tự sắp xếp mặc định (`sort`)
Mọi tiêu chí sắp xếp đều bắt buộc có khóa phụ `Document.id DESC` để đảm bảo tính ổn định (Deterministic Ordering) khi phân trang:
1. `trending` (Mặc định): Sắp xếp theo điểm thịnh hành `DocumentStats.trending_score DESC, Document.id DESC`.
2. `newest`: `Document.created_at DESC, Document.id DESC`.
3. `views`: `DocumentStats.view_count DESC, Document.created_at DESC, Document.id DESC`.
4. `title`: `Document.title ASC, Document.id DESC`.

---

## 3. Chính sách Bộ nhớ đệm (Caching Policy)

### 3.1. TanStack Query Cache State Matrix

| Ngữ cảnh | `staleTime` | `gcTime` | Lý do kỹ thuật |
|---|---|---|---|
| **Kho tài liệu cá nhân** | `30 giây` | `10 phút` | Tài liệu chỉ do một người dùng chỉnh sửa, tần suất thay đổi thấp; cho phép cache giữ lâu để chuyển tab mượt mà. |
| **Không gian nhóm (Group Space)** | `15 giây` | `10 phút` | Nhiều thành viên cùng làm việc đồng thời; `staleTime` ngắn hơn để kịp thời phản ánh cập nhật từ thành viên khác. |
| **Danh mục File Types tĩnh** | `Infinity` | `24 giờ` | Danh sách MIME types của hệ thống là bất biến trong suốt phiên. |
| **Tài nguyên ảnh Thumbnail (`/storage`)** | `24 giờ` (HTTP) | Vĩnh viễn (Trình duyệt) | Ảnh thumbnail có tính bất biến cao. Dùng header `Cache-Control: public, max-age=86400`. |

### 3.2. Quy tắc Đổi mới Thumbnail (Bust Cache)
- URL thumbnail mặc định không bao giờ nối timestamp động như `Date.now()`.
- Định dạng chuẩn: `${baseUrl}/${thumbnail_path}`.
- Trường hợp file được upload lại hoặc tạo mới thumbnail: Thêm tham số định danh phiên bản ổn định `${baseUrl}/${thumbnail_path}?v=${updated_at_timestamp}`.

---

## 4. Quy tắc Invalidation & Cập nhật Dữ liệu

### 4.1. Cập nhật trực tiếp bằng `setQueriesData` (Tránh Refetch bão tố)
Khi thực hiện các thao tác sửa đổi đơn lẻ trên tài liệu:
1. **Đổi tên tài liệu (`renameDocument`)**:
   - Sử dụng `queryClient.setQueriesData({ queryKey: ["documents", "personal"] })` để quét qua toàn bộ các trang đã tải trong bộ đệm và thay đổi trường `title` của phần tử tương ứng.
   - Không gọi `invalidateQueries` gây nạp lại toàn bộ 50 trang đã cuộn.
2. **Xóa tài liệu (`deleteDocument`)**:
   - Sử dụng `setQueriesData` để lọc bỏ ID bị xóa khỏi mảng `items` của trang chứa nó và giảm `total` đi 1 đơn vị.
3. **Tải lên tài liệu mới (`uploadDocument`)**:
   - Gọi `queryClient.invalidateQueries({ queryKey: ["documents", "personal"] })` để trang 1 tự động làm mới và hiển thị tài liệu mới nhất lên đầu danh sách.

### 4.2. Phân tách Invalidation giữa Nhóm và Cá nhân
- Thao tác trong nhóm (sửa, xóa, nạp tài liệu nhóm) **chỉ được phép** invalidate `["documents", "group:{groupId}"]`.
- Tuyệt đối **không được** invalidate `["documents", "personal"]` trong các thao tác nhóm.
- **Ngoại lệ duy nhất**: Thao tác `saveDocument` (lưu tài liệu từ nhóm về kho cá nhân) sẽ sinh một bản ghi mới ở kho cá nhân nên được phép kích hoạt làm mới cả hai kho.

---

## 5. Quy tắc Cách ly Phiên làm việc (Session Isolation)

1. **Khóa truy vấn gắn liền User ID**:
   - Mọi `queryKey` thuộc kho cá nhân bắt buộc có cấu trúc: `["documents", "personal", user?.id, queryParams]`.
   - Mọi `queryKey` thuộc nhóm có cấu trúc: `["documents", "group:{groupId}", user?.id, queryParams]`.
2. **Chế độ kích hoạt có điều kiện (`enabled`)**:
   - Query chỉ được phép chạy khi `Boolean(user?.id) === true`. Nếu không có thông tin user, query ở trạng thái `idle`.
3. **Thanh tẩy bộ đệm khi thay đổi phiên**:
   - Khi đăng xuất (`logout`): Bắt buộc gọi `queryClient.clear()` trước khi xóa token và chuyển hướng về `/login`.
   - Khi đăng nhập (`login`): Ngay sau khi nhận token thành công, gọi `queryClient.clear()` trước khi lưu token mới để đảm bảo bộ đệm hoàn toàn tinh sạch.
