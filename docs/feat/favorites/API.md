# API Endpoints: Favorites Feature

## 1. Lấy danh sách tài liệu yêu thích
`GET /favorites/`

- **Authentication**: Bearer JWT Token (`get_current_user`)
- **Response**: `200 OK` (Mảng các `FavoriteDocumentOut`)
  ```json
  [
    {
      "id": 10,
      "title": "GiaoTrinhKienTruc.pdf",
      "file_type": "application/pdf",
      "file_size": 2048000,
      "created_at": "2026-09-20T10:00:00Z",
      "updated_at": "2026-09-20T10:00:00Z",
      "is_important": false,
      "favorited_at": "2026-09-26T18:00:00Z",
      "tags": [
        {
          "id": 1,
          "name": "Kiến trúc",
          "color": "#3B82F6"
        }
      ]
    }
  ]
  ```
- **Logic thực hiện**:
  1. Thực hiện `select(Document, Favorite.created_at).join(...)`.
  2. Lọc `Favorite.user_id == current_user.id` và `Document.is_deleted == False`.
  3. Load kèm danh sách tags qua `selectinload(Document.tags)`.
  4. Trả về mảng phẳng `FavoriteDocumentOut` kèm trường `favorited_at`.

---

## 2. Thêm tài liệu vào danh sách yêu thích
`POST /favorites/`

- **Authentication**: Bearer JWT Token (`get_current_user`)
- **Request Body**: `FavoriteCreate`
  ```json
  {
    "document_id": 10
  }
  ```
- **Response**: `201 Created` / `200 OK` (`FavoriteOut`)
  ```json
  {
    "user_id": 5,
    "document_id": 10,
    "created_at": "2026-09-26T18:00:00Z"
  }
  ```
- **Logic thực hiện**:
  1. Kiểm tra tài liệu tồn tại và chưa bị xóa mềm (`is_deleted == False`).
  2. Kiểm tra quyền truy cập của `current_user` với tài liệu bằng hàm `user_can_access_document(db, document, current_user.id)`. Nếu không có quyền hoặc không tìm thấy, trả lỗi `404 Not Found` ("Không tìm thấy tài liệu hoặc không có quyền truy cập").
  3. Kiểm tra xem tài liệu đã có trong danh sách yêu thích của người dùng chưa. Nếu đã tồn tại, trả lại bản ghi cũ với status `200 OK` (Idempotent).
  4. Nếu chưa tồn tại, tạo bản ghi `Favorite(user_id=current_user.id, document_id=payload.document_id)`, lưu vào DB và trả về `201 Created`.

---

## 3. Bỏ yêu thích tài liệu
`DELETE /favorites/{document_id}`

- **Authentication**: Bearer JWT Token (`get_current_user`)
- **Path Parameter**: `document_id` (int)
- **Response**: `204 No Content`
- **Logic thực hiện**:
  1. Tìm bản ghi `Favorite` thỏa mãn `user_id == current_user.id` và `document_id == document_id`.
  2. Nếu không tìm thấy, trả lỗi `404 Not Found` ("Không tìm thấy yêu thích").
  3. Nếu tìm thấy, thực hiện `db.delete(favorite)`, commit thay đổi và trả về `204 No Content`.
