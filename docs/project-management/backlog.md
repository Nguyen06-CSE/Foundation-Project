# 📋 Danh Sách Cải Tiến & Tối Ưu Trải Nghiệm (Backlog & Improvements)

> **Mô tả:** Tài liệu ghi nhận các hạn chế hiện tại về mặt giao diện (UI), trải nghiệm người dùng (UX) và tính năng cần nâng cấp/tái cấu trúc.  
> **Trạng thái:** Chờ xử lý / Đang phân tích yêu cầu.

---

## 📌 Tổng Hợp Các Hạng Mục Cần Cải Thiện

| STT | Vấn đề / Hạng mục | Vị trí liên quan trong Source Code | Tham khảo / Đề xuất giải pháp | Mức độ ưu tiên |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Thao tác và UX quản lý Bundle phức tạp | `frontend/.../personal/BundleDetailPage.tsx`<br>`frontend/.../components/shared/AddToBundleModal.tsx` | Tối giản flow thao tác, giảm số bước click khi quản lý | Cao |
| **02** | UI của `DocumentCard` chưa tối ưu | `frontend/.../components/shared/DocumentCard.tsx`<br>`frontend/.../group/components/GroupDocumentCard.tsx` | Tham khảo Notion, Google Drive, OneDrive | Trung bình |
| **03** | Thiếu chế độ hiển thị nâng cao cho danh sách tài liệu | `frontend/.../components/shared/DocumentListView.tsx`<br>`frontend/.../components/shared/ViewToggle.tsx` | Bổ sung giao diện Metadata/Table view lấy cảm hứng từ **Paperless-ngx** | Trung bình |
| **04** | Tương tác Bundle/Folder chưa trực quan (thiếu Drag & Drop) | `frontend/.../components/shared/FolderCard.tsx`<br>`frontend/.../personal/components/PersonalFoldersSection.tsx` | Hỗ trợ kéo - thả (Drag and Drop) như Windows Explorer | Cao |
| **05** | Thiếu tính năng tìm kiếm tài liệu cục bộ trong Bundle | `frontend/.../pages/personal/BundleDetailPage.tsx`<br>`backend/app/services/search_service.py` | Bổ sung thanh tìm kiếm lọc theo tên tài liệu scoped theo Bundle/Folder | Cao |
| **06** | Thông tin nhóm còn hạn chế, thiếu tuỳ biến ảnh bìa & thông báo | `frontend/.../pages/group/GroupSpace.tsx`<br>`frontend/.../pages/group/components/SettingsTab.tsx` | Tham khảo bố cục Channel/Group của **Telegram**, **Zalo** | Trung bình |
| **07** | `FacultyCard` tại Thư viện cộng đồng chưa tạo sự khác biệt | `frontend/.../components/library/FacultyCard.tsx`<br>`frontend/.../pages/library/LibraryFaculty.tsx` | Tham khảo giao diện phân cấp môn học/khoa của **Studocu** | Trung bình |

---

## 📝 Chi Tiết Từng Vấn Đề

### 1. Tối Ưu Hóa Tương Tác & Thao Tác Với Bundle
* **Hiện trạng:**
  * Việc tương tác và quản lý tài liệu trong một bundle còn nhiều thao tác rườm rà.
  * Quy trình thêm, xoá hoặc chuyển bundle qua modal (`AddToBundleModal.tsx`) chưa trực quan, đòi hỏi nhiều bước xác nhận không cần thiết.
* **Yêu cầu cải tiến:**
  * Thiết kế lại các hành động nhanh (Quick Actions): ghim, đổi tên, phân loại ngay trên thanh công cụ hoặc menu ngữ cảnh (`FolderContextMenu.tsx`).
  * Tinh giản số bước khi nhóm nhiều tài liệu vào một Bundle.

---

### 2. Nâng Cấp Giao Diện `DocumentCard`
* **Hiện trạng:**
  * Card hiển thị thông tin ở mức cơ bản (tên, định dạng, ngày cập nhật), chưa tạo được phân cấp thị giác rõ ràng và chưa làm nổi bật metadata quan trọng.
* **Yêu cầu cải tiến:**
  * Tham khảo UI từ các hệ thống quản lý tài liệu hiện đại (Google Drive, Notion, Dropbox).
  * Bổ sung preview thumbnail/ảnh bìa file tài liệu rõ nét hơn.
  * Hiển thị trực quan trạng thái tài liệu, quyền truy cập (`PermissionBadge.tsx`), dung lượng và tags.

---

### 3. Bổ Sung Chế Độ Xem Tài Liệu Phong Cách **Paperless-ngx**
* **Hiện trạng:**
  * Hệ thống hiện chỉ hỗ trợ chuyển đổi giữa dạng thẻ (Grid/Card) và dạng danh sách cơ bản (List) thông qua `ViewToggle.tsx`.
* **Yêu cầu cải tiến:**
  * Tham khảo phong cách quản lý của **Paperless-ngx**:
    * **Chế độ bảng chi tiết (Detailed Table View):** Hiển thị đầy đủ thông tin metadata (Tags màu sắc, ngày quét/tải lên, kích thước, định dạng, số lượt tải/đánh giá).
    * **Chế độ xem phân đôi (Split/Preview Layout):** Click vào item bên trái sẽ xem trước nhanh tài liệu (Quick Preview) và metadata bên phải mà không cần điều hướng sang trang chi tiết.

---

### 4. Tương Tác Kéo - Thả Giống Windows Explorer Cho Bundle / Folder
* **Hiện trạng:**
  * Bundle đang hoạt động tương tự như một Folder nhưng chưa có trải nghiệm thao tác tự nhiên. Người dùng phải mở modal chọn thư mục đích thay vì thao tác trực tiếp.
* **Yêu cầu cải tiến:**
  * Tích hợp cơ chế **Kéo & Thả (Drag and Drop)**:
    * Kéo một hoặc nhiều file tài liệu thả trực tiếp vào thẻ Folder/Bundle.
    * Kéo tài liệu ra ngoài để bỏ gán khỏi Bundle.
    * Kéo file từ máy tính thả thẳng vào Bundle để upload tự động.
  * Cung cấp hiệu ứng kéo thả mượt mà (dùng các thư viện như `@dnd-kit` hoặc `react-dropzone`).

---

### 5. Tìm Kiếm Scoped Tên Tài Liệu Trong Bundle
* **Hiện trạng:**
  * Thanh tìm kiếm hiện tại chủ yếu phục vụ tìm kiếm toàn cục (`search_service.py`, `SearchPage.tsx`).
  * Khi đang ở bên trong `BundleDetailPage.tsx`, người dùng chưa có ô tìm kiếm để lọc nhanh các tài liệu chỉ thuộc Bundle đó.
* **Yêu cầu cải tiến:**
  * Thêm ô tìm kiếm tức thì (Instant In-Bundle Filter) tại đầu trang `BundleDetailPage.tsx`.
  * Hỗ trợ tìm kiếm theo: Tiêu đề tài liệu, định dạng file (`.pdf`, `.docx`,...), và tag gắn kèm.

---

### 6. Mở Rộng Tính Năng Không Gian Nhóm (Group Space)
* **Hiện trạng:**
  * `GroupSpace.tsx` hiện hiển thị thông tin còn đơn điệu, thiếu dấu ấn của một không gian làm việc nhóm năng động.
  * Chưa có tính năng cá nhân hóa nhận diện nhóm (ảnh bìa/cover photo).
  * Cơ chế thông báo sự kiện trong nhóm chưa rõ ràng.
* **Yêu cầu cải tiến:**
  * **Tham khảo trải nghiệm Telegram / Zalo:**
    * Cho phép trưởng nhóm/quản trị viên cập nhật **Ảnh bìa (Cover Image)** và **Avatar nhóm**.
    * Bổ sung mục **Ghim thông báo quan trọng (Pinned Announcements)** ở đầu không gian nhóm.
    * Tích hợp widget tóm tắt hoạt động gần đây (Recent Activities / Feed) thay vì chỉ liệt kê danh sách tab.

---

### 7. Tái Thiết Kế `FacultyCard` & Thư Viện Cộng Đồng Theo Phong Cách **Studocu**
* **Hiện trạng:**
  * Thẻ Khoa (`FacultyCard.tsx`) tại `LibraryFaculty.tsx` chưa tạo được điểm nhấn khác biệt với các loại thẻ danh mục khác.
  * Thông tin khóa học, môn học và số lượng tài nguyên học tập chưa được tổ chức hấp dẫn.
* **Yêu cầu cải tiến:**
  * **Học hỏi mô hình phân cấp của Studocu:**
    * Thẻ Khoa/Trường cần hiển thị số lượng tài liệu hiện có, các môn học nổi bật (Trending/Popular Subjects), và số lượng sinh viên tham gia đóng góp.
    * Thêm biểu tượng/bộ nhận diện đặc trưng cho từng khối ngành/khoa.
    * Cải tiến trang chi tiết môn học (`LibrarySubject.tsx`) để phân chia rõ: Đề thi cũ, bài giảng tóm tắt, giáo trình và bài tập mẫu.