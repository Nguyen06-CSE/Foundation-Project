---
id: FUNCTIONAL_REQUIREMENTS
title: Yêu Cầu Chức Năng (FRD)
sidebar_position: 3
---

# ⚙️ Yêu Cầu Chức Năng (Functional Requirements Document - FRD)

Tài liệu này chi tiết hóa toàn bộ hành vi, chức năng và phản hồi kỳ vọng của hệ thống **Digital Library** đối với từng đối tượng người dùng, kèm theo trạng thái nghiệp vụ và hiện trạng mã nguồn thực tế.

---

## 1. Phân Hệ Xác Thực & Quản Lý Người Dùng (Authentication & User Profile)

### FR-AUTH-01: Đăng nhập & Duy trì Phiên làm việc
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Cho phép người dùng đăng nhập bằng tên tài khoản (`username`) và mật khẩu. Hệ thống cấp phát mã thông báo **JWT Bearer Token** có hạn sử dụng, chứa định danh `user_id`, vai trò `role` và mã khoa `faculty_id`.
* **Phản hồi:** Trả về access token và chuyển hướng tới Dashboard cá nhân `/personal`.

### FR-AUTH-02: Đăng ký & Tự động Phân bổ Học thuật
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Sinh viên đăng ký tài khoản với Mã số sinh viên (MSSV). Hệ thống tự động xác định niên khóa, lớp học và khoa đào tạo tương ứng dựa trên cấu trúc định danh.
* **Quy tắc:** Mật khẩu phải có độ dài tối thiểu 8 ký tự.

---

## 2. Phân Hệ Kho Cá Nhân (Personal Space)

### FR-PERS-01: Quản lý Cây Thư mục (Folders)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Người dùng có quyền tạo thư mục mới, đổi tên, di chuyển thư mục và phân cấp thư mục lồng nhau không giới hạn độ sâu.
* **Ràng buộc:** Tên thư mục không được trùng lặp trong cùng một thư mục cha.

### FR-PERS-02: Tải lên & Kiểm tra Trùng lặp (Upload & Deduplication)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Người dùng tải lên tệp tin (PDF, DOCX, XLSX, PPTX, TXT, Code, Markdown). Hệ thống tính mã băm SHA-256 ngay trong RAM đệm. Nếu phát hiện tệp tin đã tồn tại trong kho của cùng người dùng, hệ thống sẽ cảnh báo trùng lặp hoặc tái sử dụng metadata.

### FR-PERS-03: Ghi chú Cá nhân & Gắn Thẻ (Notes & Tags)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Cho phép người dùng viết ghi chú riêng tư cho từng tài liệu và gắn một hoặc nhiều nhãn màu (`workspace_tags`) để lọc dữ liệu nhanh.

### FR-PERS-04: Danh sách Việc cần làm Học tập (User To-dos)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Người dùng có thể tạo danh sách việc cần làm (to-dos) gắn liền với một tài liệu cụ thể hoặc việc học tập chung, thiết lập hạn nộp (due date) và đánh dấu hoàn thành.

---

## 3. Phân Hệ Không Gian Nhóm (Group Workspace)

### FR-GRP-01: Khởi tạo Nhóm & Quản lý Thành viên
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Người dùng có thể tạo không gian nhóm học tập mới (trở thành Trưởng nhóm - `owner`). Trưởng nhóm có quyền mời thành viên khác vào nhóm qua username hoặc đường dẫn mời, và có quyền xóa thành viên khỏi nhóm.

### FR-GRP-02: Chia sẻ & Quản lý Tài liệu Nhóm
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Mọi thành viên trong nhóm đều có quyền tải tài liệu lên không gian nhóm, tạo thư mục nhóm và tải về tài liệu do các thành viên khác đăng tải.

### FR-GRP-03: Thùng rác Nhóm Độc lập
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Tài liệu bị xóa trong nhóm sẽ chuyển vào Thùng rác riêng của nhóm đó, chỉ Trưởng nhóm mới có quyền khôi phục hoặc xóa vĩnh viễn.

---

## 4. Phân Hệ Kho Học Liệu Cộng Đồng (Community Library)

### FR-COMM-01: Duyệt Học liệu theo Khoa & Môn học
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Cung cấp giao diện trực quan hiển thị danh sách tất cả các Khoa trong trường -> danh sách các Môn học thuộc Khoa -> danh sách tài liệu công khai đã được kiểm duyệt.

### FR-COMM-02: Đóng góp Học liệu (Community Submission)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Sinh viên hoặc giảng viên có thể chọn 1 hoặc nhiều tài liệu từ kho cá nhân/nhóm để gửi yêu cầu đóng góp vào một môn học cụ thể trên thư viện chung.

### FR-COMM-03: Thẩm định & Phê duyệt Học liệu
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Quản trị viên Khoa (`faculty_admin`) có màn hình Dashboard riêng để xem xét danh sách yêu cầu đóng góp, xem trước nội dung tài liệu và thực hiện **Duyệt (Approve)** để xuất bản ra cộng đồng hoặc **Từ chối (Reject)** kèm lý do giải thích.

### FR-COMM-04: Đánh giá & Nhận xét (Rating & Review)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Người học sau khi xem hoặc tải tài liệu có thể đánh giá từ 1 đến 5 sao và để lại bình luận nhận xét về chất lượng tài liệu. Hệ thống tự động tính điểm đánh giá trung bình.

---

## 5. Phân Hệ Nhân Bản Tài Liệu (Document Cloning / Forking)

### FR-FORK-01: Lưu Tài liệu về Kho Cá Nhân
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Khi người dùng bấm nút *"Lưu về kho cá nhân"* tại một tài liệu trong Kho cộng đồng hoặc Không gian nhóm:
  1. Hệ thống tạo một bản ghi tài liệu mới thuộc sở hữu của người dùng đó (`workspace_context = 'personal'`).
  2. Sao chép toàn bộ metadata, đường dẫn file vật lý và ảnh bìa.
  3. Người dùng sở hữu bản sao độc lập, có thể đổi tên, thêm ghi chú riêng mà bản gốc không bị ảnh hưởng.

---

## 6. Phân Hệ Tìm Kiếm & Xem Trước (Search & Multi-View)

### FR-SRCH-01: Tìm kiếm Toàn văn (Full-Text Search)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Tìm kiếm từ khóa theo cả tiêu đề tài liệu, mô tả và toàn bộ nội dung văn bản được trích xuất (qua trường chỉ mục `search_vector` trong PostgreSQL). Hỗ trợ bôi đậm từ khóa trong đoạn trích (snippets).

### FR-VIEW-01: Xem trước Đa Định dạng tại Trình duyệt
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Xem trước trực tiếp tệp tin trên giao diện mà không bắt buộc tải file về:
  * PDF: Render qua Canvas với thanh điều hướng trang, zoom.
  * Word (DOCX): Render trực tiếp DOM qua `docx-preview`.
  * Mã nguồn: Tô màu cú pháp qua thư viện `shiki`.
  * Markdown: Render HTML kèm mục lục tự động (TOC).
  * Excel / PowerPoint: Nhúng trình xem trực tuyến của Office / Google Docs qua iframe.

---

## 7. Phân Hệ Vòng Đời Dữ Liệu & Thống Kê (Lifecycle & Analytics)

### FR-TRSH-01: Xóa mềm & Khôi phục (Soft Delete & Restore)
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Khi người dùng xóa tài liệu hoặc thư mục, hệ thống gắn cờ `is_deleted = True` và chuyển vào Thùng rác (`trash`). Người dùng có thể khôi phục lại nguyên trạng vị trí cũ bất kỳ lúc nào.

### FR-TRSH-02: Tự động Dọn rác Định kỳ sau 30 Ngày
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Job chạy nền định kỳ hàng đêm (APScheduler) tự động quét các tài liệu trong thùng rác có `deleted_at > 30 ngày` để thực hiện xóa vĩnh viễn (Hard Purge) cả trong CSDL lẫn trên Storage.

### FR-ACT-01: Nhật ký Tương tác & Xếp hạng Xu hướng
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`
* **Đặc tả:** Ghi nhận toàn bộ sự kiện xem, tải, đánh giá vào `download_logs`. Hệ thống tính toán điểm số `trending_score` theo công thức suy hao thời gian để phân loại tài liệu nổi bật trong tuần/tháng.

---

## 8. Các Tính Năng Đang Trong Quá Trình Hoàn Thiện (Implementation Gaps)

### FR-GAP-01: Danh sách "Đã chia sẻ với tôi" (`/personal/shared`)
* **Trạng thái nghiệp vụ:** `[Confirmed]`
* **Hiện trạng mã nguồn:** `[In Progress]` *(Gap phát hiện trong AUDIT_REPORT)*
* **Mô tả:** Người dùng cần xem danh sách tất cả các tài liệu được người khác chia sẻ trực tiếp cho mình. Hiện tại giao diện hiển thị thông báo *"Trang đang xây dựng"*, trong khi Backend đã có đầy đủ bảng `document_shares` và API `GET /shares/with-me`.

### FR-GAP-02: Danh sách "Tài liệu Yêu thích" (`/personal/favorites`)
* **Trạng thái nghiệp vụ:** `[Confirmed]`
* **Hiện trạng mã nguồn:** `[In Progress]` *(Gap phát hiện trong AUDIT_REPORT)*
* **Mô tả:** Cho phép người dùng đánh dấu sao tài liệu quan trọng để xem lại nhanh. Hiện tại giao diện hiển thị thông báo *"Trang đang xây dựng"*, trong khi Backend đã sẵn sàng bảng `favorites` và API `GET /favorites`.

### FR-GAP-03: Không gian Lớp Học Phần (`/class`)
* **Trạng thái nghiệp vụ:** `[Confirmed]`
* **Hiện trạng mã nguồn:** `[Needs Verification]`
* **Mô tả:** Backend đã có bảng `academic_classes` và router `routers/academic.py`, frontend có thư mục `pages/class`. Cần xác minh luồng đồng bộ danh sách sinh viên theo từng lớp học phần thực tế từ hệ thống đào tạo của trường.
# AI functional requirements

- FR-AI-01: queue/index document thành chunks và active run.
- FR-AI-02: keyword/hybrid search có semantic fallback.
- FR-AI-03: Q&A citation và abstain khi thiếu evidence.
- FR-AI-04: summary evidence-based coexist description.
- FR-AI-05: tag suggestions confirm-before-write.
- FR-AI-06: related permission-safe.
- FR-AI-07: interest stats 7/30.
- FR-AI-08: owner/group write retry; reader/revoked không mutate/read evidence.
