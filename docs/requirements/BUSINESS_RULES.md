---
id: BUSINESS_RULES
title: Quy Tắc Nghiệp Vụ Cấp Sản Phẩm
sidebar_position: 5
---

# 📜 Quy Tắc Nghiệp Vụ Cấp Sản Phẩm (Global Business Rules)

Tài liệu này định nghĩa các **quy tắc nghiệp vụ bất biến (Business Invariants)** có phạm vi áp dụng trên toàn bộ hệ thống Thư Viện Số. Mọi luồng tính năng, logic kiểm tra và truy vấn cơ sở dữ liệu đều bắt buộc phải tuân thủ các quy tắc này.

---

## 1. Tính Cô Lập & Quyền Riêng Tư Kho Cá Nhân

### BR-GLOBAL-01: Quyền Riêng Tư Bất Khả Xâm Phạm (Personal Isolation)
* **Quy tắc:** Kho tài liệu cá nhân (`workspace_context = 'personal'`) của người dùng là vùng dữ liệu riêng tư tuyệt đối.
* **Ràng buộc:**
  1. Chỉ có duy nhất chủ sở hữu tài khoản (`document.user_id = current_user.id`) mới có quyền xem, tải, sửa, xóa hoặc gắn nhãn tài liệu trong kho của mình.
  2. Bất kỳ ai khác — kể cả Quản trị viên Khoa (`faculty_admin`) hay Quản trị viên Hệ thống (`system_admin`) — đều **không có quyền** xem danh sách tài liệu cá nhân của người khác qua giao diện thông thường.
  3. Tài liệu chỉ có thể được người khác xem khi chủ sở hữu chủ động:
     * Chia sẻ trực tiếp qua liên kết chia sẻ (`document_shares`).
     * Đưa vào một Không gian Nhóm mà người đó là thành viên.
     * Gửi yêu cầu đóng góp và được phê duyệt lên Kho cộng đồng.

---

## 2. Nguyên Tắc Nhân Bản Độc Lập Dữ Liệu

### BR-GLOBAL-02: Cơ Chế Nhân Bản Tài Liệu (Document Cloning / Forking Invariant)
* **Quy tắc:** Không sử dụng cơ chế con trỏ liên kết yếu (Shortcut/Symlink) khi tiếp nhận tài liệu từ nguồn khác vào kho cá nhân.
* **Ràng buộc khi thực hiện hành động "Lưu về kho cá nhân":**
  1. Hệ thống tạo ra một bản ghi mới trong bảng `documents` với `user_id = current_user.id` và `workspace_context = 'personal'`.
  2. Bản ghi mới sao chép toàn bộ metadata học thuật: tiêu đề, mô tả, môn học, đường dẫn file vật lý (`file_path`), ảnh bìa (`thumbnail_path`), và mã băm SHA-256 (`file_hash`).
  3. **Độc lập vòng đời:** Sau khi nhân bản:
     * Người nhận có toàn quyền đổi tên, thêm ghi chú, gắn thẻ riêng hoặc xóa tài liệu mà không ảnh hưởng gì tới tài liệu gốc.
     * Ngược lại, nếu tác giả ban đầu xóa tài liệu gốc, bản sao của người nhận vẫn tồn tại nguyên vẹn.

---

## 3. Kiểm Tra Trùng Lặp & Toàn Vẹn Tệp Tin

### BR-GLOBAL-03: Nhận Diện Trùng Lặp Theo Checksum SHA-256 (Deduplication Rules)
* **Quy tắc:** Mọi tệp tin khi tải lên hệ thống bắt buộc phải được tính toán mã băm SHA-256 (chuỗi 64 ký tự hex) dựa trên nội dung nhị phân thô của tệp.
* **Ma trận hành vi xử lý trùng lặp:**

| Ngữ cảnh tải lên (Workspace Context) | Phát hiện file trùng mã SHA-256 | Hành vi nghiệp vụ bắt buộc |
|---|---|---|
| **Kho Cá Nhân (Personal Space)** | Đã tồn tại trong kho của chính người dùng đó | Cảnh báo: *"Tài liệu này đã tồn tại trong kho của bạn"*. Không tạo thêm bản sao rác gây lãng phí. |
| **Kho Cá Nhân (Personal Space)** | Trùng với file của người dùng khác hoặc thư viện chung | Cho phép tải lên bình thường (Bảo vệ quyền riêng tư: không thông báo cho người dùng biết người khác đã có file này). |
| **Không Gian Nhóm (Group Space)** | Đã tồn tại trong nhóm làm việc đó | Cảnh báo: *"Tài liệu này đã được thành viên khác tải lên nhóm"*. Chặn tạo trùng lặp trong nhóm. |
| **Kho Học Liệu Cộng Đồng (Community)** | Đã tồn tại tài liệu công khai có cùng mã hash | Chặn phê duyệt trùng lặp để tránh làm loãng thư viện trường. |

---

## 4. Vòng Đời Dữ Liệu & Chính Sách Thùng Rác

### BR-GLOBAL-04: Xóa Mềm & Chính Sách Lưu Giữ 30 Ngày (Retention Policy)
* **Quy tắc:** Thao tác xóa từ phía người dùng luôn mặc định là **Xóa mềm (Soft Delete)**, chuyển tài liệu vào Thùng rác (`trash`).
* **Ràng buộc:**
  1. Khi xóa mềm: Trường `is_deleted` được đặt thành `True`, `deleted_at = now()`. Tài liệu lập tức biến mất khỏi danh sách hiển thị thông thường và không xuất hiện trong kết quả tìm kiếm.
  2. Trong vòng 30 ngày kể từ `deleted_at`:
     * Người dùng có quyền **Khôi phục (Restore)** tài liệu về nguyên trạng vị trí cũ.
     * Người dùng có quyền chủ động bấm **Xóa vĩnh viễn (Hard Purge)** để giải phóng dung lượng ngay lập tức.
  3. **Tự động quét dọn:** Sau 30 ngày nằm trong thùng rác, job định kỳ hàng đêm của hệ thống sẽ tự động thực hiện Hard Purge (xóa bản ghi CSDL và xóa file vật lý trên Local Filesystem (storage/)) mà không cần xác nhận lại.

---

## 5. Quy Trình Phê Duyệt Học Liệu Cộng Đồng

### BR-GLOBAL-05: Thẩm Quyền Xét Duyệt Theo Khoa (Faculty Boundary)
* **Quy tắc:** Tài liệu xuất bản ra Kho học liệu toàn trường bắt buộc phải trải qua quy trình thẩm định chất lượng học thuật.
* **Ràng buộc:**
  1. Yêu cầu đóng góp (`community_submissions`) thuộc môn học của Khoa nào thì chỉ có **Quản trị viên của Khoa đó (`faculty_admin`)** hoặc **Admin hệ thống (`system_admin`)** mới có quyền phê duyệt.
  2. Khi Phê duyệt (`status = 'approved'`): Tài liệu được nhân bản sang trạng thái công khai (`is_public = True`), sinh thông báo chúc mừng tới tác giả đóng góp.
  3. Khi Từ chối (`status = 'rejected'`): Quản trị viên **bắt buộc phải nhập lý do từ chối** để gửi thông báo giải thích cụ thể cho người đóng góp.

---

## 6. Thuật Toán Xếp Hạng & Chấm Điểm Xu Hướng

### BR-GLOBAL-06: Chấm Điểm Trending & Suy Hao Thời Gian (Time Decay)
* **Quy tắc:** Điểm số xu hướng (`trending_score`) được tính toán định kỳ để phản ánh độ hữu ích và mức độ quan tâm của cộng đồng học sinh - sinh viên.
* **Công thức nghiệp vụ:**
  $$\text{Trending Score} = \frac{W_v \cdot V + W_d \cdot D + W_s \cdot S + W_r \cdot R}{(T + 2)^\gamma}$$
  * $V$: Số lượt xem tài liệu (`views`).
  * $D$: Số lượt tải về (`downloads`).
  * $S$: Số lượt lưu về kho cá nhân (`saves`).
  * $R$: Điểm đánh giá trung bình nhân số lượt đánh giá (`rating_points`).
  * $T$: Số ngày kể từ khi tài liệu được xuất bản hoặc có tương tác gần nhất.
  * $\gamma$: Hệ số suy hao thời gian (mặc định $\gamma = 1.5$), đảm bảo tài liệu mới có tương tác cao luôn được ưu tiên hơn tài liệu cũ.

---

## 7. Quy Chuẩn Tệp Tin & Giới Hạn Dung Lượng

### BR-GLOBAL-07: Danh Mục Định Dạng Hợp Lệ (MIME Whitelist) & Kích Thước
* **Quy tắc:** Hệ thống chỉ tiếp nhận các định dạng tệp phục vụ trực tiếp cho mục đích học tập và nghiên cứu khoa học.
* **Danh mục cho phép (Whitelist):**
  * **Tài liệu văn bản:** PDF (`application/pdf`), Word (`.docx`, `.doc`), Plain Text (`text/plain`), Markdown (`text/markdown`).
  * **Bảng tính & Trình chiếu:** Excel (`.xlsx`, `.xls`), PowerPoint (`.pptx`, `.ppt`).
  * **Mã nguồn lập trình:** Python (`.py`), JavaScript/TypeScript (`.js`, `.ts`, `.tsx`), C/C++ (`.c`, `.cpp`), Java (`.java`), HTML/CSS (`.html`, `.css`), SQL (`.sql`), JSON (`.json`).
  * **Hình ảnh minh họa:** PNG, JPEG, WEBP.
* **Giới hạn kích thước:**
  * Mặc định tối đa: **50 MB** cho mỗi tệp tin đơn lẻ.
  * Tệp tin vượt quá 50MB bị từ chối ngay tại tầng kiểm tra kích thước phía Client và Backend để bảo vệ bộ nhớ đệm RAM máy chủ.
