---
id: UC06_GROUP_WORKSPACE_COLLABORATION
title: "UC-06: Cộng Tác Không Gian Nhóm Học Tập"
sidebar_position: 7
---

# 👥 UC-06: Cộng Tác Không Gian Nhóm Học Tập (Group Collaboration)

---

## 1. Thông Tin Tổng Quan
* **Mã nghiệp vụ:** `UC-06`
* **Tác nhân chính:** 
  * **Trưởng nhóm (`owner`):** Người khởi tạo nhóm hoặc được ủy quyền.
  * **Thành viên (`member`):** Sinh viên, Giảng viên tham gia nhóm học tập.
* **Mục tiêu:** Cung cấp môi trường chia sẻ và quản lý học liệu chung cho các nhóm làm bài tập lớn, đồ án môn học hoặc đề tài nghiên cứu khoa học.
* **Mức độ ưu tiên:** Cao (P1).
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`

---

## 2. Luồng Nghiệp Vụ Chính (Main Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Trưởng Nhóm
    actor Member as Thành Viên Nhóm
    participant UI as Giao Diện Web React
    participant API as Backend Router (groups.py / workspaces.py)
    participant DB as PostgreSQL Database

    Owner->>UI: Bấm "Tạo nhóm mới" & nhập tên nhóm (Ví dụ: "Nhóm Đồ Án Cơ Sở")
    UI->>API: POST /workspaces (name, type='group')
    API->>DB: INSERT vào `workspaces` & gán Owner vào `workspace_members` (role='owner')
    DB-->>API: Trả về thông tin nhóm mới
    API-->>UI: Hiển thị Không gian Nhóm

    Owner->>UI: Mời thành viên qua username hoặc tạo link mời
    UI->>API: POST /workspaces/{id}/invite (username)
    API->>DB: INSERT bản ghi vào `workspace_invitations` hoặc `workspace_members`
    DB-->>API: Xác nhận thêm thành viên thành công
    
    Member->>UI: Truy cập danh sách nhóm & mở Không gian Nhóm vừa tham gia
    Member->>UI: Tải tài liệu bài tập lên thư mục nhóm
    UI->>API: POST /documents (workspace_context='group', workspace_id=groupId)
    API->>DB: INSERT tài liệu gắn với `workspace_id` của nhóm
    DB-->>API: Lưu thành công
    API-->>UI: Hiển thị tài liệu trong danh sách tài liệu nhóm cho toàn bộ thành viên
```

---

## 3. Ranh Giới Quyền Hạn Trong Không Gian Nhóm

| Thao tác nghiệp vụ trong Nhóm | Trưởng Nhóm (`owner`) | Thành viên (`member`) | Người ngoài nhóm |
|---|:---:|:---:|:---:|
| **Xem & Tải về tài liệu trong nhóm** | ✅ | ✅ | ❌ |
| **Tải lên tài liệu & Tạo thư mục nhóm** | ✅ | ✅ | ❌ |
| **Chỉnh sửa / Gắn nhãn tài liệu nhóm** | ✅ | ✅ | ❌ |
| **Xóa tài liệu nhóm (Chuyển vào thùng rác)** | ✅ | ✅ *(Tài liệu do mình tải lên)* | ❌ |
| **Khôi phục / Xóa vĩnh viễn trong thùng rác nhóm** | 👑 | ❌ | ❌ |
| **Mời / Xóa thành viên khỏi nhóm** | 👑 | ❌ | ❌ |
| **Giải tán / Xóa toàn bộ nhóm** | 👑 | ❌ | ❌ |

---

## 4. Các Quy Tắc Nghiệp Vụ Cần Lưu Ý
* **BR-GRP-01 (Toàn vẹn tài liệu khi thành viên rời nhóm):** Khi một thành viên rời khỏi nhóm hoặc bị xóa khỏi nhóm, **toàn bộ tài liệu mà người đó đã tải lên nhóm vẫn được bảo toàn nguyên vẹn** trong không gian nhóm để không làm gián đoạn tiến độ học tập của các thành viên còn lại.
* **BR-GRP-02 (Thùng rác nhóm độc lập):** Thao tác xóa tài liệu trong nhóm chỉ đưa tài liệu vào Thùng rác của riêng nhóm đó, hoàn toàn không lẫn sang Thùng rác cá nhân của người thực hiện xóa.
