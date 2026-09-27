# Business Rules: Favorites Feature

1. **Quyền đánh dấu Yêu thích (`POST /favorites/`)**
   - Người dùng có thể yêu thích **tài liệu do chính mình sở hữu** HOẶC **tài liệu được người khác chia sẻ cho mình**.
   - Trước khi tạo bản ghi yêu thích, backend xác minh tính hợp lệ thông qua `user_can_access_document(db, document, current_user.id)`. Nếu người dùng không có quyền xem tài liệu (hoặc tài liệu đã bị xóa), hệ thống từ chối và trả lỗi `404 Not Found`.

2. **Tính Idempotent khi Thêm yêu thích**
   - Nếu tài liệu đã nằm trong danh sách yêu thích của người dùng, việc gọi lại API `POST /favorites/` sẽ không báo lỗi mà trả về thông tin bản ghi cũ kèm HTTP status `200 OK`.

3. **Tính Độc lập với Soft Delete**
   - Khi tài liệu bị xóa mềm (`is_deleted == True`), bản ghi trong bảng `favorites` vẫn được giữ nguyên trong cơ sở dữ liệu.
   - Tuy nhiên, API `GET /favorites/` sẽ tự động lọc bỏ (`Document.is_deleted == False`) nên tài liệu bị xóa sẽ không xuất hiện trên giao diện trang Yêu thích. Nếu tài liệu được khôi phục từ thùng rác, nó sẽ xuất hiện trở lại trong danh sách yêu thích.

4. **Tác động khi Bỏ yêu thích (`DELETE /favorites/{document_id}`)**
   - Thao tác bỏ yêu thích chỉ xóa dòng tương ứng trong bảng `favorites`.
   - Thao tác này hoàn toàn KHÔNG ảnh hưởng tới tài liệu gốc hay quyền truy cập của người dùng đối với tài liệu đó.
