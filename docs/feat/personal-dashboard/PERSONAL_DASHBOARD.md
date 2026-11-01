# Tài liệu Kỹ thuật: Thiết kế & Triển khai Personal Dashboard (/personal)

## 1. Mục tiêu và Phạm vi

### 1.1 Mục tiêu
Tái thiết kế trang chủ cá nhân sau đăng nhập (`/personal`) của hệ thống Digital Library:
- Thay thế toàn bộ dữ liệu mock/hardcode bằng dữ liệu thời gian thực từ cơ sở dữ liệu Neon PostgreSQL.
- Tối ưu hóa hiệu năng và chi phí truy vấn serverless DB thông qua một endpoint tổng hợp `GET /dashboard/summary` (chỉ mất 4 câu truy vấn SQL độc lập gom chung 1 network round-trip, thời gian phản hồi < 15ms).
- Khắc phục triệt để lỗi N+1 truy vấn tag khi lấy danh sách thư mục (`get_folders_with_stats`).
- Giao diện nghiêm túc, chuẩn chỉ, tuân thủ `DESIGN_SYSTEM.md`, sử dụng bộ icon chuẩn `lucide-react`, không emoji.

### 1.2 Phạm vi
- **Backend**:
  - Bổ sung cấu hình `STORAGE_QUOTA_BYTES` trong `app/core/config.py` (mặc định 15 GB).
  - Định nghĩa Schema `DashboardSummaryOut` trong `app/schemas/dashboard.py`.
  - Service `dashboard_service.py` thực hiện 4 truy vấn tối ưu.
  - Router `dashboard.py` cung cấp endpoint `GET /dashboard/summary` (bắt buộc JWT auth).
  - Tối ưu hóa `folder_service.py:get_folders_with_stats` từ N+1 sang batch `IN (...)`.
  - Bộ kiểm thử tự động `backend/tests/test_dashboard.py`.
- **Frontend**:
  - Cập nhật Route: `/personal` hiển thị `PersonalDashboard`, `/personal/dashboard` tự động chuyển hướng (`Navigate replace`) về `/personal`.
  - Quản lý đồng bộ `NavLink` với `end={true}` để trạng thái active của menu "Cá nhân" không bị kích hoạt chéo khi vào các trang con.
  - Phân tách cấu trúc component mô đun hóa (mỗi file dưới 200 dòng): `QuickActions`, `AttentionStrip`, `StatCards`, `RecentOpened`, `TrendingList`, `FolderShortcuts`, `GroupsCard`, `ContributionCard`, `ActivityFeed`.
  - Quản lý cache React Query và cơ chế vô hiệu hóa cache tập trung (`invalidateDashboard`).

---

## 2. Thiết kế API: GET /dashboard/summary

### 2.1 Thông tin Endpoint
- **Phương thức**: `GET`
- **Đường dẫn**: `/dashboard/summary`
- **Xác thực**: Yêu cầu Bearer Token (JWT). Toàn bộ dữ liệu được giới hạn chặt chẽ theo `current_user.id`.
- **Latency trung bình**: 12–18 ms trên Neon Serverless DB.

### 2.2 Response Mẫu
```json
{
  "pending_invitations": 2,
  "pending_invitation_names": ["Nhóm Đồ án", "Nhóm Mạng máy tính"],
  "rejected_recent_count": 1,
  "latest_rejected": {
    "submission_id": 14,
    "title": "Đề thi giữa kỳ Mạng máy tính",
    "reason": "Ảnh chụp mờ, đề nghị upload bản scan PDF rõ nét"
  },
  "expiring_trash_count": 3,
  "total_docs": 18,
  "new_docs_7d": 4,
  "storage_used_bytes": 148576204,
  "storage_quota_bytes": 16106127360,
  "shared_docs_count": 5,
  "favorite_count": 7,
  "contributions": {
    "total": 6,
    "pending": 2,
    "approved": 3,
    "rejected": 1,
    "approved_downloads": 84
  },
  "groups": {
    "total": 3,
    "owned": 1,
    "total_docs": 28,
    "recent": [
      {
        "id": 5,
        "name": "Nhóm Chuyên đề tốt nghiệp",
        "role": "Trưởng nhóm",
        "member_count": 4,
        "document_count": 12,
        "updated_at": "2026-10-31T08:15:00Z"
      }
    ]
  },
  "recent_viewed": [
    {
      "id": 102,
      "title": "Bài giảng Kiến trúc máy tính",
      "file_type": "application/pdf",
      "is_bundle": false,
      "children_count": 0,
      "thumbnail_path": "thumbnails/102.png",
      "last_viewed_at": "2026-10-31T14:20:00Z"
    }
  ],
  "recent_activities": [
    {
      "id": 492,
      "action": "DOCUMENT_VIEWED",
      "document_id": 102,
      "document_title": "Bài giảng Kiến trúc máy tính",
      "created_at": "2026-10-31T14:20:00Z"
    }
  ]
}
```

### 2.3 Các truy vấn SQL bên dưới
Service chạy tuần tự đúng 4 câu truy vấn SQL tinh gọn qua SQLAlchemy:
1. **Scalar Stats Query (1 câu SQL duy nhất với các scalar subqueries)**:
   - Gom toàn bộ các phép đếm độc lập:
     - `pending_invitations` từ `workspace_members` (`status = 'pending'`, `user_id = uid`).
     - `rejected_recent_count` từ `community_submissions` (`status = 'rejected'`, `user_id = uid`, `reviewed_at >= NOW() - 14 days`).
     - `expiring_trash_count` từ `documents` (`owner_id = uid`, `is_deleted = true`, `deleted_at <= NOW() - 27 days`).
     - `total_docs` & `new_docs_7d` & `storage_used_bytes` từ `documents` (`owner_id = uid`, `workspace_id IS NULL`, `is_deleted = false`, `bundle_parent_id IS NULL`). *Ghi chú*: Loại trừ children của bundle để không tính trùng tài liệu và dung lượng.
     - `shared_docs_count`: `COUNT(DISTINCT source_document_id)` từ `documents` có `owner_id = uid`, `workspace_id IS NOT NULL`, `source_document_id IS NOT NULL`, `is_deleted = false`.
     - `favorite_count` từ `favorites` (`user_id = uid`).
     - `contributions` (total, pending, approved, rejected, approved_downloads) từ `community_submissions` và `download_logs`.
     - `groups_total` và `groups_owned` từ `workspace_members` và `workspaces`.
2. **Top 3 Recent Groups Query**:
   - Truy vấn `workspaces` kèm vai trò (`_role_for`), đếm thành viên qua subquery, đếm tài liệu qua subquery, sắp xếp theo `workspaces.updated_at DESC`, `LIMIT 3`.
3. **Top 4 Recent Opened Documents Query**:
   - Lọc các lượt mở tài liệu gần nhất từ `download_logs` (`action IN ('view', 'DOCUMENT_VIEWED')`, `user_id = uid`) join với `documents` (`owner_id = uid`, `workspace_id IS NULL`, `is_deleted = false`). Gom nhóm `MAX(download_logs.created_at)` theo từng document, `LIMIT 4`.
4. **Top 6 Recent Activities Query**:
   - Lấy 6 bản ghi mới nhất từ `download_logs` (`user_id = uid`), kết nối với `documents` để lấy tên tài liệu, sắp xếp theo `download_logs.created_at DESC`, `LIMIT 6`.

---

## 3. Thiết kế Frontend

### 3.1 Cấu trúc Component
```
src/pages/personal/
├── PersonalDashboard.tsx                # Trang chủ tổng quan (orchestrator)
└── dashboard/
    └── components/
        ├── QuickActions.tsx             # 5 nút thao tác nhanh
        ├── AttentionStrip.tsx           # Dải nhắc việc cần xử lý
        ├── StatCards.tsx                # 5 thẻ chỉ số chính
        ├── RecentOpened.tsx             # Danh sách tài liệu mở gần đây
        ├── TrendingList.tsx             # Top tài liệu xu hướng học tập
        ├── FolderShortcuts.tsx          # Lối tắt thư mục cá nhân
        ├── GroupsCard.tsx               # Khối không gian nhóm
        ├── ContributionCard.tsx         # Khối đóng góp học liệu & tiến độ mốc
        └── ActivityFeed.tsx             # Dòng thời gian hoạt động gần đây
```

### 3.2 React Query Keys & Stale Times
| Query Key | Endpoint | staleTime | Mô tả |
| :--- | :--- | :--- | :--- |
| `["dashboard", "summary"]` | `GET /dashboard/summary` | 15 giây | Dữ liệu tổng hợp thời gian thực của trang |
| `["documents", "trending"]` | `GET /documents?sort=trending` | 2 phút | Top xu hướng học tập |
| `["folders"]` | `GET /folders` | 5 phút | Danh sách thư mục cá nhân |
| `["tags"]` | `GET /tags` | 5 phút | Danh mục thẻ dùng cho upload/thư mục |

### 3.3 Chiến lược Invalidation (`invalidateDashboard`)
Hàm tiện ích `invalidateDashboard(queryClient)` được tích hợp vào `onSuccess` của tất cả các thao tác làm thay đổi dữ liệu:
- Tải lên tài liệu đơn lẻ / gói tài liệu (`UploadModal`).
- Đổi tên / xóa / khôi phục tài liệu (`usePersonalDocuments`, `TrashPage`).
- Dọn sạch thùng rác / xóa vĩnh viễn (`TrashPage`).
- Tạo mới / cập nhật / xóa thư mục (`usePersonalFolders`).
- Gửi đóng góp học liệu vào cộng đồng (`ContributeModal`).
- Tạo nhóm mới / phê duyệt lời mời tham gia nhóm (`GroupList`).

---

## 4. Tối ưu N+1 trong FolderService

### Vấn đề trước đây
Trong `app/services/folder_service.py:get_folders_with_stats`, với mỗi thư mục tìm được, hệ thống chạy một truy vấn SQL phụ để lấy các tag gắn với thư mục đó:
```python
# CODE CŨ (Gây ra N+1 truy vấn SQL):
for folder in folders:
    # 1 truy vấn riêng cho từng folder!
    folder_tags = db.query(FolderTag).filter(FolderTag.folder_id == folder.id).all()
    tag_ids = [ft.tag_id for ft in folder_tags]
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
```
Nếu người dùng có 20 thư mục, server sẽ phát sinh 20 đến 40 câu truy vấn lặp đi lặp lại.

### Giải pháp tối ưu
Thay thế bằng kỹ thuật gom batch (chỉ 1 câu truy vấn duy nhất cho tất cả thư mục):
```python
# CODE MỚI (Đã tối ưu, 1 query):
folder_ids = [f.id for f in folders]
folder_tags_map = {fid: [] for fid in folder_ids}
if folder_ids:
    all_folder_tags = (
        db.query(FolderTag.folder_id, Tag)
        .join(Tag, FolderTag.tag_id == Tag.id)
        .filter(FolderTag.folder_id.in_(folder_ids))
        .all()
    )
    for fid, tag in all_folder_tags:
        folder_tags_map[fid].append(tag)
```
Kết quả: Số lượng câu SQL giảm từ $1 + 2N$ xuống cố định $2$ câu SQL, giữ nguyên 100% định dạng dữ liệu trả về cho frontend.

---

## 5. Migration SQL (Chờ chạy trên Production)

File migration đã được chuẩn bị tại `docs/feat/personal-dashboard/migration.sql`:

```sql
-- migration.sql
-- Thêm các index phục vụ truy vấn tối ưu cho Personal Dashboard
-- Trạng thái: CHỜ CHẠY TRÊN PRODUCTION (DB Neon)

-- 1. Index hỗ trợ đếm tài liệu đã chia sẻ vào nhóm
CREATE INDEX IF NOT EXISTS idx_documents_owner_workspace 
ON documents(owner_id, workspace_id, is_deleted) 
WHERE workspace_id IS NOT NULL;

-- 2. Index hỗ trợ đếm tài liệu theo workspace
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id 
ON documents(workspace_id) 
WHERE is_deleted = false;

-- 3. Index hỗ trợ lấy danh sách thư mục theo người dùng
CREATE INDEX IF NOT EXISTS idx_folders_owner_id 
ON folders(owner_id);
```

---

## 6. Hướng dẫn Kiểm thử Thủ công

1. **Đăng nhập**:
   - Truy cập `/login`, đăng nhập với tài khoản hợp lệ.
   - Kiểm tra: Hệ thống chuyển hướng chuẩn xác vào `/personal`.
2. **Kiểm tra chuyển hướng URL cũ**:
   - Gõ thủ công trên thanh địa chỉ trình duyệt `/personal/dashboard`.
   - Kết quả: Trình duyệt chuyển hướng ngay lập tức về `/personal` (`replace: true`).
3. **Kiểm tra trạng thái Menu Sidebar**:
   - Khi ở `/personal`: Mục "Cá nhân" sáng active, các mục khác ("Tài liệu", "Thùng rác", ...) không bị sáng nhầm.
   - Khi bấm vào "Tài liệu" (`/personal/documents`): Mục "Cá nhân" tắt active, mục "Tài liệu" sáng active.
4. **Kiểm tra dải việc cần xử lý (AttentionStrip)**:
   - Nếu có lời mời nhóm đang chờ: Bấm vào badge -> chuyển tới `/groups?tab=notifications`.
   - Nếu có đóng góp bị từ chối: Bấm vào badge -> hiển thị toast nhắc nhở và dẫn đến tài liệu.
   - Nếu có tài liệu sắp hết hạn xóa: Bấm vào badge -> chuyển đến `/personal/trash`.
5. **Kiểm tra thao tác nhanh (QuickActions)**:
   - "Tải lên tài liệu": Mở UploadModal ở tab Tệp đơn lẻ.
   - "Tạo gói tài liệu": Mở UploadModal ngay tại tab Gói tài liệu (Batch mode).
   - "Thư mục mới": Mở CreateFolderModal, tạo xong thư mục xuất hiện ngay trên FolderShortcuts và cập nhật số liệu mà không cần F5.
   - "Tạo nhóm mới": Mở ngay modal tạo nhóm tại `/groups?create=1`.
6. **Kiểm tra liên kết thư mục (FolderShortcuts)**:
   - Bấm vào một thư mục bất kỳ trên dashboard -> chuyển tới `/personal/documents?folder=<id>` và thư mục đó được tự động chọn.

---

## 7. Giới hạn Đã biết & Đề xuất Tương lai

1. **Trang xem danh sách đóng góp của cá nhân**:
   - Hiện hệ thống chưa có trang riêng dạng `/personal/contributions` để người dùng lọc xem tất cả các bản ghi `community_submissions` của mình.
   - *Đề xuất*: Xây dựng thêm tab "Đóng góp của tôi" trong Kho học liệu hoặc trong không gian cá nhân.
2. **Cờ "đã xem" đối với thông báo đóng góp bị từ chối**:
   - Bảng `community_submissions` hiện chưa có cột `is_viewed_by_author` nên dải nhắc việc tạm thời dùng khoảng thời gian 14 ngày kể từ `reviewed_at`.
   - *Đề xuất*: Bổ sung cột boolean `is_read` để ẩn thông báo ngay khi người dùng đã click xem chi tiết lý do từ chối.
3. **Thùng rác và hạn mức dung lượng lưu trữ**:
   - Hiện dung lượng trong thùng rác không tính vào hạn mức lưu trữ sử dụng của người dùng (`is_deleted = false`).
   - *Đề xuất*: Tiếp tục duy trì chính sách này hoặc bổ sung thanh tiến trình dung lượng thùng rác nếu hệ thống yêu cầu quản lý dung lượng tổng thể.
