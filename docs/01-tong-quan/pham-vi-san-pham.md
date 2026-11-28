---
title: Phạm Vi Sản Phẩm & 3 Kho Lưu Trữ
sidebar_label: 🏢 Phạm vi sản phẩm
sidebar_position: 3
---

# 🏢 PHẠM VI SẢN PHẨM & MÔ HÌNH 3 KHO LƯU TRỮ

Tài liệu này xác định ranh giới chức năng chính thức của hệ thống **Foundation Project**, mô tả chi tiết mô hình 3 kho lưu trữ hiện hành và làm rõ ma trận phân quyền người dùng.

---

## 1. Ranh Giới 3 Kho Lưu Trữ Hiện Hành

Khác với các tài liệu sơ khai ban đầu từng phác thảo mô hình 5 không gian hoặc các kho ổ đĩa theo lớp/khoa, **hiện trạng thực tế của sản phẩm được chuẩn hóa chính xác vào 3 kho lưu trữ cốt lõi sau**:

```
+--------------------------------------------------------------------------------------------------+
|                                    HỆ THỐNG 3 KHO LƯU TRỮ CHÍNH THỨC                             |
|                                                                                                  |
|   [ 1. KHO CÁ NHÂN ]             [ 2. KHO NHÓM ]                 [ 3. KHO HỌC LIỆU SỐ ]          |
|   (Personal Repository)          (Workspace Repository)          (Community Library)             |
|                                                                                                  |
|   - workspace_id = NULL          - workspace_id = {id}           - is_community_shared = true    |
|   - Sở hữu: Cá nhân              - Sở hữu: Nhóm thành viên       - Sở hữu: Toàn trường           |
|   - Riêng tư 100%                - Phân quyền nội bộ             - Thẩm định qua Submission      |
|   - Tags cá nhân, Yêu thích      - Roles: Owner, Admin, Member   - Phân loại: Khoa & Môn học     |
|   - Danh sách đọc, Thùng rác     - Tags nhóm, Thư mục nhóm       - Đánh giá sao & Bộ đếm tải     |
+--------------------------------------------------------------------------------------------------+
```

### 1.1. Kho Cá Nhân (Personal Repository)
- **Mục đích**: Lưu trữ tài liệu học tập, nghiên cứu và ghi chú riêng tư của từng người dùng.
- **Cơ chế dữ liệu**: Bản ghi trong bảng `documents` có trường `workspace_id IS NULL` và `owner_id = user.id`.
- **Chức năng chính**:
  - Tải lên tệp tin (PDF, DOCX, PPTX, XLSX, TXT, MD, hình ảnh), tự động khử trùng lặp qua SHA-256.
  - Phân loại bằng nhãn thẻ cá nhân (`tags`, `document_tags`) và thư mục (`folders`).
  - Quản lý mục yêu thích (`favorites`), danh sách đọc cá nhân và ghi chú đính kèm (`notes`).
  - Thùng rác hai cấp: Xóa mềm (`is_deleted = true`), khôi phục tài liệu, hoặc xóa vĩnh viễn (`purge`).

### 1.2. Kho Nhóm (Workspace Repository)
- **Mục đích**: Không gian làm việc cộng tác giữa các thành viên cùng lớp học phần, nhóm nghiên cứu khoa học hoặc ban đề tài.
- **Cơ chế dữ liệu**: Bản ghi trong bảng `documents` có trường `workspace_id` trỏ đến `workspaces.id`.
- **Chức năng chính**:
  - Tạo lập và quản lý không gian làm việc (`workspaces`), mời thành viên qua email (`workspace_invitations`).
  - Phân quyền nội bộ không gian làm việc (`workspace_members`) gồm 3 cấp:
    - `Owner` (Trưởng nhóm): Toàn quyền quản trị, xóa nhóm, khởi xướng quy trình giải thể.
    - `Admin` (Phó nhóm): Mời/xóa thành viên, chỉnh sửa tài liệu, quản lý thẻ nhóm (`workspace_tags`).
    - `Member` (Thành viên): Xem, tải lên và đóng góp tài liệu vào kho nhóm.
  - Quy trình giải thể an toàn: Hẹn giờ giải thể nhóm (`is_dissolving`, `dissolve_at`), cho phép thành viên sao chép tài liệu về kho cá nhân trước khi nhóm đóng cửa.

### 1.3. Kho Học Liệu Số (Community Library)
- **Mục đích**: Thư viện số dùng chung của toàn cơ sở đào tạo, cung cấp giáo trình, đề cương, tài liệu tham khảo chính quy.
- **Cơ chế dữ liệu**: Sử dụng bảng trung gian `community_submissions` liên kết với bảng phân loại học thuật `faculties` (Khoa/Viện) và `subjects` (Môn học).
- **Chức năng chính**:
  - **Quy trình nộp duyệt (Submission Workflow)**: Người dùng nộp tài liệu từ kho cá nhân lên thư viện cộng đồng. Hồ sơ chuyển sang trạng thái `pending`.
  - **Thẩm định chất lượng (Reviewing)**: Giảng viên hoặc Quản trị viên duyệt hồ sơ (`approved`) để chính thức xuất bản, hoặc từ chối (`rejected`) kèm lý do cụ thể.
  - **Trọn bộ học liệu (Document Bundles)**: Gom nhóm các tài liệu liên quan thành gói tài liệu học phần.
  - **Tương tác cộng đồng**: Sinh viên đánh giá sao chất lượng tài liệu (`document_ratings`, 1-5 sao), hệ thống ghi nhận lượt tải (`download_logs`) và tự động xếp hạng tài liệu nổi bật (`document_stats`).

---

## 2. Làm Rõ Ranh Giới: Không Phải Mô Hình 5 Không Gian

> [!IMPORTANT]
> **Xác nhận chuẩn mực bám sát mã nguồn:**  
> Hệ thống **không** tồn tại các kho lưu trữ vật lý hay ổ đĩa độc lập cho "Kho Lớp" hay "Kho Khoa".  
> Các thực thể `classes` (Lớp sinh hoạt) và `faculties` (Khoa/Viện) trong CSDL chỉ đóng vai trò là **siêu dữ liệu định danh (Metadata Taxonomy)**:
> - `classes`: Dùng để quản lý thông tin lớp sinh hoạt của sinh viên trong bảng `users`.
> - `faculties`: Dùng để phân loại cây danh mục môn học (`subjects`) trong Kho học liệu số.

---

## 3. Đối Tượng Người Dùng & Ma Trận Phân Quyền (RBAC)

Hệ thống quy định 3 nhóm vai trò người dùng chính thức:

| Vai trò người dùng | Mô tả quyền hạn trong hệ thống |
| :--- | :--- |
| **Quản trị viên (Admin)** | Toàn quyền quản trị hệ thống: Quản lý người dùng, quản trị danh mục Khoa/Môn học, phê duyệt hoặc từ chối học liệu nộp lên Kho học liệu số, xem nhật ký kiểm toán hệ thống. |
| **Giảng viên (Teacher)** | Sử dụng đầy đủ Kho cá nhân và Kho nhóm; Thẩm định và duyệt các tài liệu thuộc Khoa/Bộ môn mình phụ trách; Tạo bộ học liệu chuyên đề (Bundles). |
| **Sinh viên (Student)** | Quản lý Kho cá nhân; Tham gia và tạo các Kho nhóm học tập; Tra cứu, xem trước và tải tài liệu từ Kho học liệu số; Nộp tài liệu đóng góp lên thư viện cộng đồng. |

### Ma Trận Phân Quyền Tính Năng

| Chức năng hệ thống | Sinh viên | Giảng viên | Quản trị viên |
| :--- | :---: | :---: | :---: |
| Quản lý tài liệu cá nhân | ✅ | ✅ | ✅ |
| Tạo và tham gia Kho nhóm | ✅ | ✅ | ✅ |
| Xem & Tải tài liệu Thư viện số | ✅ | ✅ | ✅ |
| Đánh giá tài liệu cộng đồng (Rating) | ✅ | ✅ | ✅ |
| Nộp tài liệu lên Thư viện số | ✅ | ✅ | ✅ |
| Phê duyệt học liệu cộng đồng | ❌ | ✅ (Theo khoa) | ✅ (Toàn quyền) |
| Quản lý danh mục Khoa & Môn học | ❌ | ❌ | ✅ |
| Quản lý tài khoản người dùng | ❌ | ❌ | ✅ |
| Cấu hình tham số hệ thống | ❌ | ❌ | ✅ |
# Phạm vi AI/vector

Sản phẩm bao gồm sáu chức năng: hybrid search; Q&A có citation; summary; tag suggestions; related documents; interest stats 7/30 ngày. Indexing, chunking, embedding và keyword là nền tảng kỹ thuật. Q&A/summary hiện evidence-based/extractive và gọi embedding API, không phải hệ thống text generation nâng cao.

OCR chuyên biệt được dành cho Phase 7; advanced QA/generative workflows dành cho Phase 8.
