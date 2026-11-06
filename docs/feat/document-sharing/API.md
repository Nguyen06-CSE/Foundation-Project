# API: Tài liệu đặc tả Endpoint Chia sẻ Tài liệu

Toàn bộ các endpoint chia sẻ được quản lý tại router `backend/app/routers/shares.py` (prefix `/shares`).
Dữ liệu đầu vào và đầu ra tuân thủ các schema Pydantic tại `backend/app/schemas/share.py`.
Client frontend tương ứng: `frontend/digital-library/src/services/shareService.ts`.

---

## 1. Danh sách Endpoint

| Phương thức | Đường dẫn | Mục đích | Quyền hạn |
|---|---|---|---|
| `GET` | `/shares/document-status` | Lấy nhanh danh sách `pending_user_ids` và `owned_user_ids` của tài liệu | Authenticated |
| `POST` | `/shares/preview` | Dự đoán trạng thái người nhận (`auto`, `pending`, `already_pending`, `already_owned`) | Authenticated |
| `POST` | `/shares` | Tạo yêu cầu chia sẻ (áp dụng Idempotent Atomic Insert) | Authenticated (Chủ tài liệu / Quyền >= edit) |
| `GET` | `/shares/received` | Lấy danh sách tài liệu đã nhận vào kho cá nhân | Authenticated |
| `GET` | `/shares/pending` | Lấy danh sách yêu cầu chia sẻ đang chờ mình duyệt | Authenticated |
| `GET` | `/shares/sent` | Lấy danh sách các yêu cầu chia sẻ do mình gửi đi | Authenticated |
| `POST` | `/shares/{id}/accept` | Chấp nhận chia sẻ -> sao chép tài liệu vào kho cá nhân | Người nhận lời mời |
| `POST` | `/shares/{id}/reject` | Từ chối lời mời chia sẻ (không tạo bản sao) | Người nhận lời mời |
| `POST` | `/shares/{id}/withdraw` | Rút lại yêu cầu chia sẻ đang ở trạng thái pending | Người gửi lời mời |

---

## 2. Chi tiết Request & Response

### 2.1. `GET /shares/document-status`
- **Query Params**: `document_ids=1,2,3`
- **Mục đích**: Phục vụ việc hiển thị badge tức thì trên Modal chia sẻ phía Frontend.
- **Response**:
```json
{
  "pending_user_ids": [6, 12],
  "owned_user_ids": [8, 14],
  "pending_shares": [
    {
      "user_id": 6,
      "document_id": 1,
      "share_id": 15,
      "created_at": "2026-11-06T07:30:00Z"
    }
  ]
}
```

### 2.2. `POST /shares/preview`
- **Request Body**:
```json
{
  "document_ids": [55],
  "identifiers": ["sv_an", "teacher_hung"],
  "class_ids": [],
  "faculty_ids": [],
  "student_code_patterns": []
}
```
- **Response**:
```json
{
  "users": [
    {
      "id": 6,
      "username": "sv_an",
      "full_name": "Nguyễn Văn An",
      "role": "student",
      "status": "already_pending",
      "reason": "Đang có yêu cầu chia sẻ chờ duyệt",
      "share_id": 15
    }
  ],
  "auto_count": 0,
  "pending_count": 0,
  "already_pending_count": 1,
  "already_owned_count": 0,
  "duplicate_count": 1,
  "requires_bulk_confirm": false
}
```

### 2.3. `POST /shares`
- **Cơ chế**: Áp dụng câu lệnh nguyên tử PostgreSQL `INSERT ... ON CONFLICT DO NOTHING RETURNING id`.
- **Response**:
```json
{
  "message": "Đã chia sẻ thành công: 1 người nhận ngay, 1 người chờ xác nhận (đã bỏ qua 1 người do đã có hoặc đang chờ duyệt)",
  "auto_accepted_count": 1,
  "pending_count": 1,
  "already_pending_count": 1,
  "already_owned_count": 0,
  "skipped_duplicates_count": 1,
  "results": [
    {
      "user_id": 6,
      "username": "sv_an",
      "full_name": "Nguyễn Văn An",
      "document_id": 55,
      "status": "already_pending",
      "share_id": 15
    }
  ]
}
```

### 2.4. `GET /shares/sent`
- **Query Params**: `limit=50&offset=0`
- **Mục đích**: Hiển thị trên Tab "Đã gửi" của trang `SharedWithMe.tsx`.
- **Response**: Mảng danh sách các đối tượng `DocumentShareOut` có đầy đủ thông tin tài liệu nguồn (`source_document`), thông tin người nhận (`to_user`), và trạng thái (`pending`, `accepted`, `withdrawn`, ...).

### 2.5. `POST /shares/{id}/withdraw`
- **Path Params**: `id` (ID bản ghi chia sẻ)
- **Quy tắc**: Chỉ người gửi (`from_user_id == current_user.id`) và yêu cầu đang ở trạng thái `pending` mới được rút.
- **Khóa dòng**: Áp dụng `.with_for_update()` để tránh xung đột với thao tác `accept` của người nhận.
- **Kết quả**: Cập nhật `status = 'withdrawn'`. Bản ghi tự động rời khỏi Partial Unique Index, cho phép gửi lại sau này.
