# Bổ sung Phân rã Chức năng: Document Sharing & Favorites

Đoạn markdown dưới đây sẵn sàng để dán vào file `docs/project-management/PhanRaChucNang.md` tại các mục tương ứng.

---

### 1. Bổ sung vào Mục 3.1.2. Tài liệu cá nhân (Backend)

| STT   | Tên task                                                                                        | Tên            | Mức độ hoàn thành |
| ----- | ----------------------------------------------------------------------------------------------- | -------------- | ----------------- |
| 072BE | API chia sẻ tài liệu cá nhân cho người dùng khác kèm lời nhắn (`POST /documents/{id}/share`)    | Ngô Quyền Linh | Tốt               |
| 073BE | API lấy danh sách tài liệu được chia sẻ với tôi (`GET /documents/shared-with-me`)               | Ngô Quyền Linh | Tốt               |
| 074BE | Phân quyền mở rộng `user_can_access_document` cho phép người nhận xem/tải tài liệu được chia sẻ | Ngô Quyền Linh | Tốt               |
| 075BE | API lấy danh sách tài liệu yêu thích kèm thông tin tài liệu (`GET /favorites/`)                 | Ngô Quyền Linh | Tốt               |
| 076BE | API thêm tài liệu vào danh sách yêu thích có kiểm tra quyền truy cập (`POST /favorites/`)       | Ngô Quyền Linh | Tốt               |
| 077BE | API xóa tài liệu khỏi danh sách yêu thích (`DELETE /favorites/{document_id}`)                   | Ngô Quyền Linh | Tốt               |

---

### 2. Bổ sung vào Mục 3.2.3. Trang đã xây dựng & 3.2.4 State & Services (Frontend)

| STT   | Tên task                                                                                          | Tên            | Mức độ hoàn thành |
| ----- | ------------------------------------------------------------------------------------------------- | -------------- | ----------------- |
| 146FE | Modal chia sẻ tài liệu tích hợp tìm kiếm người nhận và nhập lời nhắn (`ShareDocumentModal.tsx`)   | Ngô Quyền Linh | Tốt               |
| 147FE | Trang danh sách tài liệu "Đã chia sẻ với tôi" hiển thị người gửi và lời nhắn (`SharedWithMe.tsx`) | Ngô Quyền Linh | Tốt               |
| 148FE | Kết nối action chia sẻ trên menu ngữ cảnh ở cả không gian Cá nhân và Nhóm                         | Ngô Quyền Linh | Tốt               |
| 149FE | Trang danh sách tài liệu yêu thích (`FavoritesPage.tsx`)                                          | Ngô Quyền Linh | Tốt               |
| 150FE | Tích hợp toggle Favorite và nhãn/icon động trên Context Menu (`DocumentContextMenu.tsx`)          | Ngô Quyền Linh | Tốt               |
| 151FE | Tích hợp query và state `favoriteIds` trong hook quản lý tài liệu cá nhân và trang chia sẻ        | Ngô Quyền Linh | Tốt               |

---

### 3. Bổ sung vào bảng tổng hợp STT (Mục 3.1 & 3.2)

#### Backend - Bổ sung tiếp theo từ 072BE

| STT   | Tên task                                                                                        | Tên            | Mức độ hoàn thành |
| ----- | ----------------------------------------------------------------------------------------------- | -------------- | ----------------- |
| 072BE | API chia sẻ tài liệu cá nhân cho người dùng khác kèm lời nhắn (`POST /documents/{id}/share`)    | Ngô Quyền Linh | Tốt               |
| 073BE | API lấy danh sách tài liệu được chia sẻ với tôi (`GET /documents/shared-with-me`)               | Ngô Quyền Linh | Tốt               |
| 074BE | Phân quyền mở rộng `user_can_access_document` cho phép người nhận xem/tải tài liệu được chia sẻ | Ngô Quyền Linh | Tốt               |
| 075BE | API lấy danh sách tài liệu yêu thích kèm thông tin tài liệu (`GET /favorites/`)                 | Ngô Quyền Linh | Tốt               |
| 076BE | API thêm tài liệu vào danh sách yêu thích có kiểm tra quyền truy cập (`POST /favorites/`)       | Ngô Quyền Linh | Tốt               |
| 077BE | API xóa tài liệu khỏi danh sách yêu thích (`DELETE /favorites/{document_id}`)                   | Ngô Quyền Linh | Tốt               |

#### Frontend - Bổ sung tiếp theo từ 146FE

| STT   | Tên task                                                                                          | Tên            | Mức độ hoàn thành |
| ----- | ------------------------------------------------------------------------------------------------- | -------------- | ----------------- |
| 146FE | Modal chia sẻ tài liệu tích hợp tìm kiếm người nhận và nhập lời nhắn (`ShareDocumentModal.tsx`)   | Ngô Quyền Linh | Tốt               |
| 147FE | Trang danh sách tài liệu "Đã chia sẻ với tôi" hiển thị người gửi và lời nhắn (`SharedWithMe.tsx`) | Ngô Quyền Linh | Tốt               |
| 148FE | Kết nối action chia sẻ trên menu ngữ cảnh ở cả không gian Cá nhân và Nhóm                         | Ngô Quyền Linh | Tốt               |
| 149FE | Trang danh sách tài liệu yêu thích (`FavoritesPage.tsx`)                                          | Ngô Quyền Linh | Tốt               |
| 150FE | Tích hợp toggle Favorite và nhãn/icon động trên Context Menu (`DocumentContextMenu.tsx`)          | Ngô Quyền Linh | Tốt               |
| 151FE | Tích hợp query và state `favoriteIds` trong hook quản lý tài liệu cá nhân và trang chia sẻ        | Ngô Quyền Linh | Tốt               |
