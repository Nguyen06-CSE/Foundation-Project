# Shared With Me Feature (Chia sẻ tài liệu kèm lời nhắn)

## Overview
Tính năng "Shared With Me" (Chia sẻ tài liệu kèm lời nhắn) cho phép người dùng chia sẻ tài liệu cá nhân của mình trực tiếp tới một người dùng khác trong hệ thống kèm lời nhắn tùy chọn (tối đa 300 ký tự). Người nhận có thể tra cứu các tài liệu được chia sẻ riêng cho mình tại trang "Đã chia sẻ với tôi", xem trước trực tiếp trên trình duyệt hoặc tải về máy mà không làm ảnh hưởng tới quyền sở hữu tài liệu gốc.

## Key Features
- **Direct User Sharing**: Tìm kiếm người nhận theo tên/username và chia sẻ tài liệu cá nhân tới tài khoản cụ thể.
- **Optional Share Message**: Cho phép nhập lời nhắn ngắn kèm theo khi gửi chia sẻ (lưu trữ thông qua bảng ghi chú `notes`).
- **Access Control Extension**: Hệ thống phân quyền mở rộng (`user_can_access_document`) cho phép người nhận (to_user) có quyền XEM (detail, preview) và TẢI VỀ (download) tài liệu dù không phải là chủ sở hữu (`owner_id`).
- **Shared Documents Management**: Trang danh sách tài liệu "Đã chia sẻ với tôi" hỗ trợ phân trang, hiển thị thông tin người chia sẻ, lời nhắn và thời gian nhận.
- **Document Actions**: Hỗ trợ mở xem trước (`preview`), tải xuống (`download`), và lưu tài liệu được chia sẻ vào danh sách Yêu thích (`favorite`).

## Document Structure
1. [DATABASE.md](./DATABASE.md) - Cấu trúc cơ sở dữ liệu và Model
2. [API.md](./API.md) - Chi tiết các RESTful API endpoints 
3. [FRONTEND.md](./FRONTEND.md) - Cấu trúc component và UI frontend
4. [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Các quy tắc nghiệp vụ quan trọng
