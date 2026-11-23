---
title: Sơ Đồ Thực Thể Quan Hệ (ERD) — 26 Bảng Dữ Liệu
sidebar_label: 📊 Sơ đồ ERD
sidebar_position: 2
---

# 📊 SƠ ĐỒ THỰC THỂ QUAN HỆ (ERD)

Hệ thống cơ sở dữ liệu **Foundation Project** bao gồm **26 bảng dữ liệu nghiệp vụ**, được tổ chức thành 5 miền chức năng mạch lạc:

1. **Miền Người dùng & Định danh**: `users`, `faculties`, `classes`
2. **Miền Quản lý Tài liệu & Lưu trữ**: `documents`, `document_versions`, `trash_batches`, `tags`, `document_tags`, `folders`, `folder_tags`
3. **Miền Không gian làm việc nhóm (Workspace)**: `workspaces`, `workspace_members`, `workspace_invitations`, `workspace_tags`
4. **Miền Thư viện Học liệu Cộng đồng**: `community_submissions`, `subjects`, `document_ratings`, `download_logs`, `document_stats`
5. **Miền Tương tác, Tiện ích & Xử lý nền**: `document_shares`, `favorites`, `notes`, `user_todos`, `notifications`, `processing_jobs`

---

## Sơ Đồ Mermaid ERD Toàn Diện

```mermaid
erDiagram
    %% Miền 1: Người dùng & Danh mục
    faculties ||--o{ classes : "thuộc khoa"
    faculties ||--o{ subjects : "chuyên môn"
    classes ||--o{ users : "lớp sinh hoạt"

    %% Miền 2: Tài liệu & Thư mục
    users ||--o{ documents : "sở hữu"
    documents ||--o{ document_versions : "lịch sử phiên bản"
    documents }o--o{ tags : "document_tags (N-N)"
    folders ||--o{ documents : "chứa trong thư mục"
    folders }o--o{ tags : "folder_tags (N-N)"
    trash_batches ||--o{ documents : "đợt xóa thùng rác"

    %% Miền 3: Không gian làm việc nhóm
    workspaces ||--o{ workspace_members : "thành viên"
    users ||--o{ workspace_members : "tham gia"
    workspaces ||--o{ documents : "tài liệu nhóm"
    workspaces ||--o{ workspace_tags : "thẻ nhãn nhóm"
    workspaces ||--o{ workspace_invitations : "lời mời"

    %% Miền 4: Thư viện học liệu số
    users ||--o{ community_submissions : "nộp học liệu"
    subjects ||--o{ community_submissions : "thuộc môn"
    documents ||--o{ community_submissions : "tài liệu nguồn"
    documents ||--o{ document_ratings : "được đánh giá"
    users ||--o{ document_ratings : "đánh giá"
    documents ||--o{ download_logs : "lượt tải"
    documents ||--|| document_stats : "thống kê tương tác"

    %% Miền 5: Tương tác & Tiện ích
    documents ||--o{ document_shares : "chia sẻ"
    users ||--o{ favorites : "yêu thích"
    documents ||--o{ favorites : "được yêu thích"
    documents ||--o{ notes : "ghi chú"
    users ||--o{ user_todos : "công việc cần làm"
    users ||--o{ notifications : "thông báo"
    documents ||--o{ processing_jobs : "tác vụ trích xuất"
```

---

## Phân Tích Các Mối Quan Hệ Trọng Yếu

1. **Quan hệ Tự Tham Chiếu Nhân Bản Tài Liệu (`documents.source_document_id`)**:  
   Bảng `documents` có khóa ngoại `source_document_id` tự trỏ về chính `documents.id`. Khi một tài liệu được sao chép (Fork) từ Thư viện số về Kho cá nhân hoặc Kho nhóm, bản sao sẽ trỏ về bản gốc nhằm theo dõi cây phả hệ tài liệu mà không phải nhân đôi tệp vật lý.
2. **Quan hệ Nhiều - Nhiều (N-N) Qua Bảng Trung Gian**:
   - `document_tags(document_id, tag_id)`: Gắn nhiều thẻ cá nhân cho một tài liệu.
   - `folder_tags(folder_id, tag_id)`: Gắn nhãn cho thư mục.
3. **Quan hệ Không Gian Làm Việc (`workspaces` - `workspace_members`)**:
   - Khóa chính kết hợp `(workspace_id, user_id)` trong `workspace_members` ngăn chặn việc một người dùng bị thêm trùng lặp vào cùng một nhóm.
