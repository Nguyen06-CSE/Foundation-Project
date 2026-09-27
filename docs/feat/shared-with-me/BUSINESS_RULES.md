# Business Rules: Shared With Me Feature

1. **Điều kiện thực hiện Chia sẻ tài liệu (`POST /documents/{document_id}/share`)**
   - **Bắt buộc có người nhận**: Tham số `to_user_id` phải được cung cấp, nếu không backend trả lỗi `400 Bad Request`.
   - **Không tự chia sẻ cho chính mình**: Nếu `to_user_id == current_user.id`, backend chặn và trả lỗi `400 Bad Request`.
   - **Quyền sở hữu tài liệu gốc**: Người gửi phải là chủ sở hữu chính thức của tài liệu (`Document.owner_id == current_user.id`) và tài liệu chưa bị xóa mềm (`is_deleted == False`). Nếu không, trả lỗi `404 Not Found`.
   - **Sự tồn tại của người nhận**: ID người nhận `to_user_id` phải tồn tại trong cơ sở dữ liệu (`User`), nếu không trả lỗi `404 Not Found`.
   - **Độ dài lời nhắn**: Lời nhắn tùy chọn ở giao diện Frontend bị giới hạn tối đa 300 ký tự. Nếu có nội dung sau khi loại bỏ khoảng trắng thừa (`strip()`), hệ thống sẽ lưu vào bảng `notes`.

2. **Quyền hạn truy cập của người nhận (`to_user_id`)**
   - Người được chia sẻ có quyền **XEM (Detail)**, **XEM TRỰC TIẾP (Preview)** và **TẢI VỀ (Download)** tài liệu thông qua cơ chế phân quyền mở rộng `user_can_access_document`.
   - Người được chia sẻ **KHÔNG** có quyền Chỉnh sửa (`PATCH`), Xóa (`DELETE`), Thay đổi Tags (`PATCH /tags`), hoặc Chia sẻ tiếp tài liệu đó cho người thứ ba. Các hành động này vẫn yêu cầu kiểm tra sở hữu gốc (`Document.owner_id == current_user.id`).

3. **Tính độc lập của tài liệu được chia sẻ**
   - Việc chia sẻ tài liệu cá nhân tạo ra bản ghi liên kết `DocumentShare` chứ không nhân bản file vật lý trên ổ đĩa.
   - Tài liệu gốc vẫn giữ nguyên vị trí và sở hữu của người gửi.

## Hướng mở rộng / Chưa triển khai (Known Limitations & Future Scope)

> [!NOTE] Các điểm chưa có trong code hiện tại
> - **Chưa chặn Chia sẻ trùng lặp (Duplicate Share Prevention)**: Code backend hiện tại chưa kiểm tra xem cặp `(document_id, to_user_id)` đã tồn tại trong bảng `document_shares` trước đó hay chưa. Một người dùng có thể gửi chia sẻ 1 tài liệu nhiều lần cho cùng 1 người nhận, tạo ra nhiều bản ghi `DocumentShare`.
> - **Chưa có tính năng Thu hồi / Xóa chia sẻ (Unshare / Revoke Access)**: Hệ thống chưa cung cấp API hoặc giao diện cho phép người gửi thu hồi chia sẻ hoặc người nhận tự xóa tài liệu khỏi danh sách "Đã chia sẻ với tôi".
> - **Chưa phân định Lời nhắn chia sẻ riêng biệt**: Lời nhắn đang lưu vào bảng ghi chú `notes` chung của tài liệu. Nếu người gửi tạo thêm ghi chú mới trên tài liệu sau đó, lời nhắn hiển thị cho người nhận sẽ bị lấy theo ghi chú mới nhất của người gửi.
