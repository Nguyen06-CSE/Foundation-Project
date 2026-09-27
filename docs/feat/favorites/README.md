# Favorites Feature (Tài liệu Yêu thích)

## Overview

Tính năng "Favorites" (Tài liệu Yêu thích) cho phép người dùng đánh dấu (yêu thích) hoặc bỏ đánh dấu bất kỳ tài liệu nào mà họ có quyền truy cập (bao gồm tài liệu cá nhân sở hữu hoặc tài liệu được người khác chia sẻ). Danh sách các tài liệu đã được yêu thích được tập trung hiển thị tại trang "Tài liệu yêu thích" (`/personal/favorites`), hỗ trợ xem chi tiết, xem trước (`preview`), tải xuống (`download`) và hủy yêu thích nhanh chóng.

## Key Features

- **Toggle Favorite**: Đánh dấu hoặc bỏ đánh dấu yêu thích tài liệu thông qua menu ngữ cảnh (Context Menu) ở bất kỳ danh sách tài liệu nào.
- **Dynamic Context Menu State**: Icon trái tim và nhãn hiển thị tự động thay đổi trạng thái ("Thêm vào Yêu thích" ↔ "Bỏ yêu thích") dựa trên danh sách tài liệu đã thích của người dùng.
- **Favorites Management Page**: Trang danh sách tài liệu yêu thích (`FavoritesPage`) hiển thị đầy đủ thông tin metadata tài liệu, ngày yêu thích (`favorited_at`), hỗ trợ các thao tác xem trước, tải về và bỏ yêu thích trực tiếp.
- **Permission Verification on Favorite**: Khi thêm tài liệu vào yêu thích, backend xác minh tài liệu tồn tại và người dùng thực sự có quyền truy cập (`user_can_access_document`).

## Document Structure

1. [DATABASE.md](./DATABASE.md) - Cấu trúc cơ sở dữ liệu và Model
2. [API.md](./API.md) - Chi tiết các RESTful API endpoints
3. [FRONTEND.md](./FRONTEND.md) - Cấu trúc component và UI frontend
4. [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Các quy tắc nghiệp vụ quan trọng
