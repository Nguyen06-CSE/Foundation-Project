---
id: UC02_COMMUNITY_SUBMISSION_AND_APPROVAL
title: "UC-02: Đóng Góp & Thẩm Định Học Liệu Cộng Đồng"
sidebar_position: 3
---

# 🏛️ UC-02: Đóng Góp & Thẩm Định Học Liệu Cộng Đồng (Submission & Moderation)

---

## 1. Thông Tin Tổng Quan
* **Mã nghiệp vụ:** `UC-02`
* **Tác nhân chính:** 
  * **Người đóng góp:** Sinh viên, Giảng viên.
  * **Người thẩm định:** Quản trị viên Khoa (`faculty_admin`), Quản trị Hệ thống (`system_admin`).
* **Mục tiêu:** Cho phép người học chia sẻ tài liệu ôn thi, bài giảng giá trị lên Kho học liệu chung của trường thông qua quy trình xét duyệt chất lượng học thuật nghiêm ngặt.
* **Mức độ ưu tiên:** Cao (P1).
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`

---

## 2. Tiền Điều Kiện
1. Người đóng góp đang sở hữu tài liệu hợp lệ trong Kho cá nhân hoặc Nhóm học tập.
2. Môn học và Khoa đào tạo nhận đóng góp đang ở trạng thái hoạt động trong hệ thống.
3. Quản trị viên Khoa đăng nhập bằng tài khoản có thẩm quyền quản lý đúng Khoa nhận đóng góp.

---

## 3. Luồng Sự Kiện Chính (Main Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Contributor as Người Đóng Góp (Sinh Viên)
    actor Admin as Quản Trị Khoa (faculty_admin)
    participant UI as Giao Diện Web React
    participant API as Backend Router (library.py)
    participant DB as PostgreSQL Database
    participant Noti as Notification Engine

    Contributor->>UI: Chọn tài liệu, chọn Khoa & Môn học đích
    Contributor->>UI: Nhập ghi chú giới thiệu & bấm "Gửi đóng góp"
    UI->>API: POST /library/submissions (Kèm document_id, subject_id, notes)
    API->>DB: INSERT bản ghi vào `community_submissions` (status='pending')
    DB-->>API: Tạo submission_id thành công
    API-->>UI: 201 Created (Thông báo yêu cầu đã được gửi chờ duyệt)

    Note over Admin,API: Quản trị viên Khoa đăng nhập thẩm định học liệu
    Admin->>UI: Truy cập Dashboard Quản lý Duyệt Học Liệu
    UI->>API: GET /library/admin/submissions?status=pending
    API->>DB: Truy vấn danh sách submission lọc theo faculty_id của Admin
    DB-->>API: Trả về danh sách chờ duyệt
    API-->>UI: Hiển thị bảng yêu cầu đóng góp

    Admin->>UI: Xem trước nội dung tài liệu qua Viewer
    alt Quyết định Phê Duyệt (Approve)
        Admin->>UI: Bấm nút "Phê duyệt"
        UI->>API: POST /library/admin/submissions/{id}/approve
        API->>DB: Cập nhật submission status='approved'
        API->>DB: Cập nhật tài liệu is_public=True, faculty_id, subject_id
        API->>Noti: Gửi thông báo chúc mừng tới tác giả đóng góp
        API-->>UI: 200 OK (Tài liệu xuất bản công khai thành công)
    else Quyết định Từ Chối (Reject)
        Admin->>UI: Nhập lý do từ chối & bấm "Từ chối"
        UI->>API: POST /library/admin/submissions/{id}/reject (rejection_reason)
        API->>DB: Cập nhật submission status='rejected' kèm lý do
        API->>Noti: Gửi thông báo giải thích lý do tới tác giả
        API-->>UI: 200 OK (Đã từ chối đóng góp)
    end
```

---

## 4. Các Quy Tắc Nghiệp Vụ Cần Tuân Thủ
* **BR-MOD-01 (Giới hạn thẩm quyền Khoa):** Quản trị viên Khoa A tuyệt đối không được duyệt hoặc xem các yêu cầu đóng góp thuộc môn học của Khoa B (được kiểm tra chặt chẽ tại `backend/app/routers/library.py` qua `check_admin_permission`).
* **BR-MOD-02 (Bắt buộc lý do từ chối):** Khi từ chối yêu cầu đóng góp, trường `rejection_reason` không được để trống (tối thiểu 10 ký tự) để đảm bảo tính minh bạch đối với sinh viên.
* **BR-MOD-03 (Bảo toàn tác quyền):** Khi tài liệu được duyệt xuất bản công khai, thông tin tác giả ban đầu (`uploader_name`, MSSV) vẫn được hiển thị trang trọng trên trang chi tiết tài liệu cộng đồng.
