# Group Logic — Luật nghiệp vụ cho chức năng Nhóm

## 1. Cấu trúc dữ liệu

### Workspace (nhóm) trong DB
- Bảng: workspaces (type='group')
- Bảng: workspace_members (workspace_id, user_id, permission_level, joined_at)
- Bảng: workspace_invitations (workspace_id, invited_user_id, invited_by, status)
- Bảng: folders — dùng chung với cá nhân, thêm workspace_id:
    NULL = folder cá nhân
    có giá trị = folder thuộc nhóm workspace_id đó

### Storage path quy ước
  Tài liệu cá nhân:        storage/personal/{user_id}/{filename}
  Tài liệu nhóm gốc:       storage/groups/{workspace_id}/{filename}
  Tài liệu nhân bản:       storage/personal/{user_id}/from_group/{filename}
  Tài liệu orphaned:       storage/orphaned/{workspace_id}/{filename}

### Document — các trường quan trọng cho Nhóm
  workspace_id:         nhóm chứa tài liệu (NULL = cá nhân)
  source_document_id:   trỏ về tài liệu gốc nếu đây là bản nhân bản
  owner_id:             người upload (không đổi dù tài liệu ở nhóm)

## 2. Luật phân quyền trong Nhóm

### permission_level trong workspace_members
  'full'  = upload, sửa metadata, xóa tài liệu trong nhóm
  'view'  = xem, tải, lưu về cá nhân — KHÔNG upload, sửa, xóa

### Chỉ owner có quyền:
  - Mời thành viên mới
  - Xóa thành viên khỏi nhóm
  - Chỉnh permission_level của từng thành viên
  - Chuyển quyền owner cho thành viên khác
  - Giải tán nhóm

### Kiểm tra quyền (backend — bắt buộc với MỌI endpoint nhóm):
  1. User có phải thành viên của workspace_id không?
     → Nếu không: 403 Forbidden
  2. Hành động cần quyền gì (view hay full hay owner)?
     → Nếu không đủ: 403 Forbidden
  3. KHÔNG bao giờ tin vào frontend để kiểm tra quyền

## 3. Luật chia sẻ tài liệu Cá nhân → Nhóm

### Chia sẻ document đơn lẻ hoặc nhiều document:
  1. Copy file vật lý: storage/personal/{uid}/{file}
                    → storage/groups/{wid}/{file}
  2. Tạo Document mới:
       - workspace_id = group_id
       - owner_id = người chia sẻ (giữ nguyên)
       - source_document_id = document_id gốc
       - Giữ nguyên: title, file_type, file_size, metadata, tags
       - checksum: tính lại từ file nhân bản
  3. Copy document_tags: tạo lại các document_tags cho document mới
  4. KHÔNG đồng bộ sau: thay đổi ở bản gốc sau khi chia sẻ
     không ảnh hưởng bản trong nhóm (và ngược lại)

### Chia sẻ folder:
  1. Lấy tất cả tag thuộc folder → lấy tất cả document có tag đó
     (is_deleted=false, owner_id=người chia sẻ, workspace_id=NULL)
  2. Nhân bản từng document theo luật chia sẻ đơn lẻ ở trên
  3. Tạo folder mới trong nhóm:
       - name = tên folder gốc + " (từ [tên người chia sẻ])"
       - workspace_id = group_id
       - owner_id = người chia sẻ
  4. Tạo folder_tags cho folder mới với các tag tương ứng
     (tạo tag trong nhóm nếu chưa có)

## 4. Luật "Lưu về cá nhân" từ Nhóm

  1. Copy file vật lý: storage/groups/{wid}/{file}
                    → storage/personal/{uid}/from_group/{file}
  2. Tạo Document mới trong kho cá nhân:
       - workspace_id = NULL (thuộc cá nhân)
       - owner_id = user đang lưu
       - source_document_id = document_id trong nhóm
  3. Xử lý tags:
       a. Lấy tất cả tag của document trong nhóm
       b. Với mỗi tag: tìm tag cùng tên trong kho cá nhân của user
          - Có rồi → dùng lại tag đó
          - Chưa có → tạo tag mới (owner_id = user, name = tên tag)
       c. Gán document_tags cho document mới với các tag đã xử lý
  4. Folder tự động: vì document đã có tags, folder cá nhân nào
     chứa tag đó sẽ tự nhiên hiển thị document này
     (không cần làm gì thêm — logic folder dựa trên tag)

## 5. Luật Thùng rác Nhóm

### Xóa tài liệu trong nhóm (soft delete):
  - Chỉ thành viên full quyền hoặc owner mới xóa được
  - is_deleted=true, deleted_at=now()
  - Hiển thị trong tab Thùng rác của không gian nhóm đó
  - Tự xóa vĩnh viễn sau 30 ngày
  - Chỉ owner mới khôi phục được tài liệu đã xóa trong nhóm

### Giải tán nhóm:
  Bước 1 — Thông báo trước 24h:
    - Tạo notification type='group_dissolving' cho tất cả thành viên
    - Message: "Nhóm [tên] sẽ bị giải tán sau 24h. Hãy lưu tài liệu bạn cần."
    - Trạng thái workspace: is_dissolving=true, dissolve_at=now()+24h

  Bước 2 — Sau 24h, hệ thống thực thi giải tán:
    - Với document workspace_id=group_id, is_deleted=false:
        Case A — User đã "lưu về cá nhân" (có document con source_document_id=doc.id
                 thuộc cá nhân):
          → Đánh dấu bản cá nhân: is_deleted=true, deleted_at=now(),
            trash_source='group_dissolved', trash_group_name=tên nhóm
          → Tự xóa sau 30 ngày
        Case B — Không ai lưu:
          → Move file: storage/groups/{wid}/ → storage/orphaned/{wid}/
          → Đánh dấu document: is_orphaned=true
          → Chỉ system_admin thấy (RLS)
          → Tự xóa sau 10 ngày

  Bước 3 — Cleanup workspace:
    - Xóa workspace_members, workspace_invitations
    - workspace.is_deleted=true, workspace.deleted_at=now()

## 6. Thùng rác Cá nhân — phân biệt nguồn gốc

### trash_source field trong documents:
  NULL hoặc 'personal'  → tài liệu cá nhân tự xóa (viền đỏ nhạt)
  'group_dissolved'     → từ nhóm bị giải tán (viền cam + badge tên nhóm)

### Hiển thị trong TrashPage cá nhân:
  - Nhóm theo trash_source:
    Section 1: "Đã xóa" — tài liệu tự xóa (viền đỏ nhạt #FEE2E2)
    Section 2: "Từ nhóm đã giải tán" — từ nhóm (viền cam #FED7AA,
               badge hiển thị tên nhóm gốc = trash_group_name)
  - Mỗi section vẫn có nút khôi phục và đếm ngược 30 ngày

## 7. Orphaned documents — tài liệu mồ côi

### Thêm vào bảng documents:
  is_orphaned: boolean default false
  orphaned_at: timestamp

### API chỉ dành cho system_admin:
  GET  /admin/orphaned-documents/    → danh sách tài liệu mồ côi
  GET  /admin/orphaned-documents/{id}/download → tải về local
  DELETE /admin/orphaned-documents/{id} → xóa vĩnh viễn ngay

### Job tự động (chạy định kỳ — dùng APScheduler trong FastAPI):
  Mỗi ngày 00:00: xóa vĩnh viễn orphaned document có
  orphaned_at < now() - 10 ngày