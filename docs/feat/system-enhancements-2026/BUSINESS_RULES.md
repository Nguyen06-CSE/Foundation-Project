# Business Rules: System Enhancements (2026)

Tài liệu quy định chi tiết các quy tắc nghiệp vụ, ma trận phân quyền, logic kiểm tra tính hợp lệ và các trường hợp đặc biệt (edge cases) được triển khai trong hệ thống.

---

## 1. Quy Tắc Xác Thực Vai Trò Admin (Role Recognition & Hierarchy)

### 1.1. Chuẩn hóa Role (Role Normalization)
Hệ thống chấp nhận và chuẩn hóa toàn bộ các định dạng role hiện tại lẫn dữ liệu cũ (legacy):
- **Quy tắc Wildcard**: Mọi chuỗi role kết thúc bằng `_admin` (không phân biệt chữ hoa, chữ thường, sau khi đã `strip` khoảng trắng) đều được xem là có quyền Quản trị viên.
- **Bảng ánh xạ dữ liệu cũ (Legacy Mapping)**:
  - `sysadmin` -> ánh xạ sang `system_admin`.
  - `schooladmin` -> ánh xạ sang `school_admin`.

### 1.2. Phân cấp Quản trị (Admin Hierarchy Matrix)

| Vai trò | Phân loại | Phạm vi duyệt kho học liệu | Lối tắt `/library/admin` | Nhận thông báo đóng góp |
|:---|:---|:---|:---|:---|
| `system_admin` | **Global Admin** | Toàn bộ môn học của tất cả các Khoa trong trường | Có (kèm badge đếm) | Nhận tất cả thông báo đóng góp |
| `school_admin` | **Global Admin** | Toàn bộ môn học của tất cả các Khoa trong trường | Có (kèm badge đếm) | Nhận tất cả thông báo đóng góp |
| `faculty_admin` | **Faculty Admin** | Chỉ các môn học thuộc Khoa mình quản lý (`subject.faculty_id == user.faculty_id`) | Có (kèm badge đếm theo khoa) | Chỉ nhận thông báo bài nộp thuộc Khoa của mình |
| `lecturer` / `student` | **Người dùng thường** | Không có quyền duyệt | Không hiển thị | Không |

---

## 2. Quy Tắc Đóng Góp Học Liệu & Thông Báo (Submissions & Notifications)

### 2.1. Kiểm tra Trùng lặp Đóng góp (Deduplication)
- Một tài liệu (`source_document_id`) **không được phép** gửi đóng góp nếu hiện tại đang có một bản ghi đóng góp khác ở trạng thái `pending`.
- Nếu vi phạm:
  - Khi submit đơn lẻ (`POST /library/submissions/`): Trả về `409 Conflict` với thông báo `"Tài liệu này đang chờ duyệt"`.
  - Khi submit hàng loạt (`POST /library/submissions/bulk`): Hệ thống tự động bỏ qua (skip) tài liệu đó, đưa vào danh sách `failed` kèm lý do `"Đang chờ duyệt"`, và tiếp tục xử lý các tài liệu hợp lệ còn lại.

### 2.2. Định tuyến Thông báo (Notification Routing)
Khi có bài đóng góp mới:
1. Hệ thống truy vấn danh sách Admin thỏa mãn:
   - Là `faculty_admin` có `user.faculty_id == subject.faculty_id`.
   - Hoặc có role thuộc nhóm `GLOBAL_ADMIN` (`system_admin`, `school_admin`).
2. Loại trừ chính người gửi nếu người gửi tình cờ có quyền Admin (`admin.id != current_user.id`).
3. **Quy tắc gộp thông báo khi nộp hàng loạt**:
   - Nếu $N = 1$: Nội dung thông báo hiển thị tên tài liệu: `"{submitter} đóng góp tài liệu chờ duyệt: {title}"`.
   - Nếu $N > 1$: Nội dung thông báo gộp số lượng: `"{submitter} đóng góp N tài liệu mới chờ duyệt ({subject_name})"`.
4. **Đường dẫn liên kết sâu (Deep-link)**:
   Gán `link = "/library/admin/submissions?status=pending&highlight_submission={submission.id}"`.

### 2.3. Tự động Đánh dấu Đã đọc khi Phê duyệt / Từ chối (Auto-Read on Action)
- Khi một Admin duyệt (`approve`) hoặc từ chối (`reject`) một bài nộp:
  Hệ thống tự động tìm tất cả các thông báo `community_submission_received` tương ứng với tài liệu đó và gán `is_read = True` cho tất cả các Admin khác. Điều này giúp ngăn chặn tình trạng thông báo rác hoặc tồn đọng thông báo đã được giải quyết.

---

## 3. Quy Tắc Việc Cần Làm Cá Nhân (Personal To-Do Rules)

### 3.1. Hợp lệ Khung giờ (Time Constraints)
- `start_at` và `due_at` là tùy chọn (optional).
- **Quy tắc bắt buộc**: Nếu cả `start_at` và `due_at` cùng được cung cấp, hệ thống yêu cầu `due_at >= start_at`. Nếu `due_at < start_at`, Backend từ chối với lỗi validation `422 Unprocessable Entity`.

### 3.2. Thuật toán Phân loại Trạng thái & Màu sắc (Color Code Hierarchy)
Thứ tự ưu tiên đánh giá trạng thái công việc (từ cao xuống thấp):

```text
1. Đã hoàn thành (Done) ──────────────► Xám nhạt, gạch ngang tiêu đề (is_completed == True)
2. Quá hạn (Overdue) ─────────────────► Đỏ (now > due_at)
3. Sắp đến hạn (Due Soon) ────────────► Cam nhấp nháy pulse (0 < due_at - now <= 60 phút)
4. Trong ngày / Diễn ra (Today) ──────► Vàng hổ phách (due_at trong ngày hoặc start_at <= now <= due_at)
5. Sắp tới / Không hạn (Upcoming) ────► Xanh dương nhẹ / Trắng viền xám
```

### 3.3. Quy tắc Tiến trình Nhắc hạn (APScheduler Cron Rules)
- Tần suất: Quét định kỳ mỗi **5 phút**.
- Điều kiện chọn việc cần nhắc:
  - `is_completed == False`
  - `reminded_at IS NULL`
  - `due_at` nằm trong khoảng thời gian từ `(now - 30 phút)` đến `(now + 30 phút)`.
- Hành động:
  - Tạo một `Notification` có `type = "todo_due"` và `link = "/personal?highlight_todo={todo.id}"`.
  - Cập nhật `reminded_at = now()` ngay trong transaction để đảm bảo mỗi công việc chỉ phát thông báo nhắc hạn **duy nhất một lần**.

---

## 4. Quy Tắc Thao Tác Hàng Loạt Trên Tài Liệu (Bulk Actions Rules)

### 4.1. Giới hạn số lượng (Batch Limit)
- Nhằm tránh tình trạng quá tải bộ nhớ RAM và timeout đường truyền HTTP khi tạo file nén ZIP trực tiếp trên server, mọi endpoint thao tác hàng loạt (`bulk-download`, `bulk-delete`, `submissions/bulk`) áp dụng giới hạn: **Tối đa 50 tài liệu / một lần thực hiện**.

### 4.2. Phân quyền Thao tác Hàng loạt trong Nhóm (Group Bulk Matrix)

| Thao tác | Thành viên `view` | Thành viên `full` | Chủ nhóm (`owner`) |
|:---|:---:|:---:|:---:|
| **Tải xuống .zip hàng loạt** | Cho phép | Cho phép | Cho phép |
| **Đóng góp hàng loạt vào Kho học liệu** | Cho phép | Cho phép | Cho phép |
| **Xóa hàng loạt tài liệu nhóm** | **Bị từ chối (403)** | Cho phép | Cho phép |

### 4.3. Quy tắc Nén File ZIP On-The-Fly
1. Không ghi file `.zip` trung gian xuống ổ cứng lưu trữ dài hạn; file ZIP được tạo và nén theo cơ chế stream từ bộ đệm RAM `io.BytesIO`.
2. **Khử trùng lặp tên file (Filename Collision Resolution)**:
   Nếu danh sách có các file trùng tên (ví dụ: `BaoCao.docx` từ nhiều thư mục), hệ thống tự động gắn hậu tố số thứ tự: `BaoCao.docx`, `BaoCao (1).docx`, `BaoCao (2).docx`.
3. **Bảo tồn cấu trúc thư mục của Bundle**:
   Nếu một tài liệu được chọn là một Bundle (gói tài liệu), file nén ZIP sẽ tự động tạo một thư mục con mang tên Bundle đó và đưa toàn bộ các tài liệu con vào bên trong thư mục này.

---

## 5. Quy Tắc Quản Lý Nhãn (Tags Management Rules)

### 5.1. Chống Trùng Tên Không Phân Biệt Hoa Thường (Case-Insensitive Uniqueness)
- Mỗi người dùng chỉ được sở hữu các nhãn có tên duy nhất (không phân biệt chữ hoa, chữ thường).
- Ví dụ: Người dùng đã có nhãn `"Lập trình"`, nếu cố gắng tạo thêm nhãn `"lập trình"` hoặc `"LẬP TRÌNH"`, backend sẽ từ chối với mã lỗi `409 Conflict`.

### 5.2. Quy tắc Gộp Nhãn (Merge Constraints)
1. **Quyền sở hữu**: Tất cả các `source_tag_ids` và `target_tag_id` phải cùng thuộc về người dùng đang đăng nhập.
2. **Loại trừ vòng lặp**: `target_tag_id` không được nằm trong danh sách `source_tag_ids`.
3. **Bảo toàn dữ liệu**:
   - Nếu tài liệu $D$ đã có cả nhãn nguồn $S$ và nhãn đích $T$, liên kết của $S$ sẽ bị hủy bỏ mà không làm ảnh hưởng đến liên kết $T$ đã có (tránh lỗi khóa chính phức hợp trùng lặp).
   - Nếu tài liệu $D$ chỉ có nhãn nguồn $S$, liên kết sẽ được cập nhật thành nhãn đích $T$.
   - Các nhãn nguồn $S$ sẽ bị xóa vĩnh viễn khỏi hệ thống sau khi quá trình gộp hoàn tất.
