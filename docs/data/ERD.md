---
title: Sơ Đồ Thực Thể Quan Hệ (ERD)
sidebar_label: 🗺️ Sơ đồ ERD
sidebar_position: 4
---

# Sơ Đồ Thực Thể Quan Hệ (Entity Relationship Diagram - ERD)

Tài liệu này cung cấp sơ đồ quan hệ trực quan giữa các bảng dữ liệu trong cơ sở dữ liệu PostgreSQL của **Foundation Project**, được định dạng chuẩn bằng Mermaid `erDiagram`.

---

## 1. Sơ Đồ ERD Tổng Thể

```mermaid
erDiagram
    faculties ||--o{ classes : "has"
    faculties ||--o{ subjects : "offers"
    faculties ||--o{ users : "enrolls"
    classes ||--o{ users : "contains"

    users ||--o{ documents : "owns"
    users ||--o{ folders : "owns"
    users ||--o{ notes : "writes"
    users ||--o{ favorites : "marks"
    users ||--o{ download_logs : "triggers"
    users ||--o{ notifications : "receives"
    users ||--o{ user_todos : "manages"
    users ||--o{ community_submissions : "submits"
    users ||--o{ document_ratings : "reviews"
    users ||--o{ workspace_members : "participates"
    users ||--o{ workspaces : "leads"

    workspaces ||--o{ workspace_members : "includes"
    workspaces ||--o{ workspace_invitations : "issues"
    workspaces ||--o{ workspace_tags : "defines"
    workspaces ||--o{ folders : "contains"
    workspaces ||--o{ documents : "stores"

    categories ||--o{ documents : "classifies"
    categories ||--o{ categories : "parent_of"
    subjects ||--o{ documents : "assigns"

    documents ||--o{ document_versions : "tracks"
    documents ||--|| document_stats : "aggregates"
    documents ||--o{ processing_jobs : "generates"
    documents ||--o{ notes : "annotated_by"
    documents ||--o{ favorites : "favorited_by"
    documents ||--o{ download_logs : "logged_by"
    documents ||--o{ document_ratings : "rated_by"
    documents ||--o{ document_tags : "labeled_with"
    documents ||--o{ document_shares : "shared_via"
    documents ||--o{ community_submissions : "proposed_as"
    documents ||--o{ documents : "forks_or_bundles"

    tags ||--o{ document_tags : "tags"
    tags ||--o{ folder_tags : "tags"
    folders ||--o{ folder_tags : "tagged_with"
    folders ||--o{ folders : "nested_in"

    trash_batches ||--o{ documents : "batches"
```

---

## 2. Chi Tiết Thực Thể Cốt Lõi & Ràng Buộc Khóa Ngoại

```mermaid
erDiagram
    users {
        int id PK
        string username UK
        string email UK
        string role
        int faculty_id FK
        int class_id FK
    }

    documents {
        int id PK
        int owner_id FK
        int workspace_id FK
        int category_id FK
        int subject_id FK
        int bundle_parent_id FK
        int source_document_id FK
        string title
        string file_path
        string file_hash
        boolean is_bundle
        boolean is_deleted
    }

    document_stats {
        int document_id PK, FK
        int view_count
        int download_count
        int share_count
        int fork_count
        float rating_avg
    }

    workspaces {
        int id PK
        int owner_id FK
        string name
        string type
        boolean is_dissolving
        boolean is_deleted
    }

    document_shares {
        int id PK
        int document_id FK
        int from_user_id FK
        int to_user_id FK
        string status
        string share_type
    }

    community_submissions {
        int id PK
        int source_document_id FK
        int published_document_id FK
        int submitter_id FK
        int subject_id FK
        string status
    }

    users ||--o{ documents : "owner_id"
    workspaces ||--o{ documents : "workspace_id"
    documents ||--|| document_stats : "document_id"
    documents ||--o{ document_shares : "document_id"
    users ||--o{ document_shares : "from_user_id"
    users ||--o{ document_shares : "to_user_id"
    documents ||--o{ community_submissions : "source_document_id"
```

---

## 3. Quy Tắc Toàn Vẹn Tham Chiếu (Referential Integrity Rules)

| Mối quan hệ Khóa ngoại | Hành vi khi Xóa (`ON DELETE`) | Giải thích nghiệp vụ |
| :--- | :--- | :--- |
| `documents.owner_id -> users.id` | `CASCADE` | Khi tài khoản người dùng bị xóa hoàn toàn, các tài liệu cá nhân thuộc sở hữu của người dùng đó cũng được dọn dẹp. |
| `documents.workspace_id -> workspaces.id` | `SET NULL` hoặc `CASCADE` | Khi một nhóm giải tán, tài liệu có thể chuyển về trạng thái mồ côi (orphaned) hoặc dọn theo chính sách nhóm. |
| `documents.bundle_parent_id -> documents.id` | `CASCADE` | Khi bundle cha bị xóa, các liên kết tài liệu con trong bundle tự động được giải phóng. |
| `document_stats.document_id -> documents.id` | `CASCADE` | Xóa tài liệu thì bản ghi thống kê tương ứng tự động biến mất. |
| `document_tags.document_id -> documents.id` | `CASCADE` | Tự động dọn sạch các liên kết tag của tài liệu khi tài liệu bị xóa vĩnh viễn. |
| `notes.document_id -> documents.id` | `CASCADE` | Ghi chú cá nhân tự động xóa khi tài liệu bị xóa vĩnh viễn. |
| `user_todos.document_id -> documents.id` | `SET NULL` | Khi tài liệu bị xóa, việc cần làm (Todo) vẫn được giữ lại với trường liên kết tài liệu đặt về `NULL`. |
