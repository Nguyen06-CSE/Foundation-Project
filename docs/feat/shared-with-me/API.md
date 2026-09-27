# API Endpoints: Shared With Me Feature

## 1. Chia sẻ tài liệu
`POST /documents/{document_id}/share`

- **Request Body**: `JSON`
  ```json
  {
    "to_user_id": 7,
    "share_type": "personal",
    "message": "Đọc trước chương 3 nhé"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "share_id": 12
  }
  ```
- **Logic thực hiện**:
  1. Kiểm tra tham số `to_user_id`, nếu thiếu trả `400 Bad Request` ("Thiếu to_user_id").
  2. Kiểm tra `to_user_id == current_user.id`, nếu trùng trả `400 Bad Request` ("Không thể chia sẻ cho chính mình").
  3. Kiểm tra tài liệu tồn tại, thuộc quyền sở hữu của `current_user` (`Document.owner_id == current_user.id`) và chưa bị xóa (`is_deleted == False`). Nếu không thỏa mãn trả `404 Not Found`.
  4. Kiểm tra người nhận `to_user_id` có tồn tại trong hệ thống (bảng `users`), nếu không trả `404 Not Found` ("Không tìm thấy người nhận").
  5. Tạo bản ghi `DocumentShare` với `document_id`, `source_document_id = document.source_document_id or document_id`, `from_user_id = current_user.id`, `to_user_id`, `share_type`.
  6. Nếu `message` được truyền vào và không rỗng sau khi `strip()`, tạo thêm bản ghi `Note` với `document_id`, `user_id = current_user.id`, `note = message.strip()`.
  7. Commit và trả về `share_id`.

---

## 2. Lấy danh sách tài liệu được chia sẻ với tôi
`GET /documents/shared-with-me`

- **Query Parameters**:
  - `page` (int, default `1`, ge `1`)
  - `page_size` (int, default `20`, ge `1`, le `100`)
- **Response**: `PaginatedSharedDocuments` (`200 OK`)
  ```json
  {
    "items": [
      {
        "id": 10,
        "title": "GiaoTrinhKienTruc.pdf",
        "file_type": "application/pdf",
        "file_size": 2048000,
        "created_at": "2026-09-20T10:00:00Z",
        "updated_at": "2026-09-20T10:00:00Z",
        "is_important": false,
        "share_id": 12,
        "shared_by": {
          "id": 5,
          "username": "sv_binh",
          "full_name": "Trần Thanh Bình",
          "avatar": null
        },
        "share_message": "Đọc trước chương 3 nhé",
        "shared_at": "2026-09-25T14:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```
- **Logic thực hiện**:
  1. `JOIN` bảng `Document` và `DocumentShare` theo điều kiện `DocumentShare.to_user_id == current_user.id` và `Document.is_deleted == False`.
  2. Sắp xếp danh sách giảm dần theo thời gian chia sẻ (`DocumentShare.created_at.desc()`).
  3. Thực hiện phân trang với `offset` và `limit`.
  4. Lặp qua từng bản ghi:
     - Lấy thông tin người gửi (`from_user`) từ bảng `users`.
     - Lấy lời nhắn mới nhất từ bảng `notes` theo `Note.document_id == share.document_id` và `Note.user_id == share.from_user_id`.
     - Gán `share_id = share.id`, `shared_by`, `share_message`, và `shared_at`.

---

## 3. Các Endpoints dùng kiểm tra quyền truy cập mở rộng (`user_can_access_document`)
Nhờ hàm helper `user_can_access_document` tại `backend/app/services/document_service.py`, người nhận chia sẻ (`to_user_id`) có thể thực hiện các thao tác XEM / TẢI VỀ trên các endpoint cá nhân sau mà không bị lỗi `404 Not Found`:

- **Chi tiết tài liệu**: `GET /documents/{document_id}`
- **Tải xuống tài liệu**: `GET /documents/{document_id}/download` (Trả về `FileResponse` với `Content-Disposition: attachment`)
- **Xem trước tài liệu**: `GET /documents/{document_id}/preview` (Trả về `FileResponse` với `Content-Disposition: inline`)
- **Xem danh sách tags**: `GET /documents/{document_id}/tags`

> **Logic kiểm tra trong service**:
> ```python
> async def user_can_access_document(db: AsyncSession, document: Document, user_id: int) -> bool:
>     if document.owner_id == user_id:
>         return True
>     result = await db.execute(
>         select(DocumentShare).where(
>             DocumentShare.document_id == document.id,
>             DocumentShare.to_user_id == user_id,
>         )
>     )
>     return result.scalar_one_or_none() is not None
> ```
