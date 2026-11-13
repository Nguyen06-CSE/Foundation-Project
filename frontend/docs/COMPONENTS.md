# Component Inventory

Component dưới đây PHẢI được tạo TRƯỚC, dùng lại ở nhiều trang.
Trước khi tạo component mới, kiểm tra danh sách này — nếu đã có, chỉ import, không viết lại.

## src/components/ui/ (nguyên tử, không chứa logic nghiệp vụ)
| Component | Mô tả | Props chính |
|---|---|---|
| Button.tsx | nút bấm, variant: primary/outline/ghost/danger | variant, size, icon?, onClick, children |
| Input.tsx | input text có icon trái tuỳ chọn | icon?, placeholder, type, value, onChange |
| Badge.tsx | pill nhỏ hiển thị trạng thái/số đếm | variant (default/success/danger), children |
| Avatar.tsx | ảnh đại diện tròn, fallback chữ cái đầu tên | src?, name, size |
| Card.tsx | khung card chuẩn (bg-white, rounded-xl, border, padding) | children, className? |
| Dropdown.tsx | menu nổi dùng chung cho context menu | trigger, items: {icon, label, onClick, danger?}[] |
| Tag.tsx | pill tag có thể xoá (dùng ở trang chi tiết tài liệu) | label, onRemove? |
| ProgressBar.tsx | thanh tiến trình mảnh | value (0-100), color? |

## src/components/shared/ (có gắn với nghiệp vụ tài liệu/thư viện)
| Component | Mô tả | Props chính |
|---|---|---|
| Sidebar.tsx | menu điều hướng trái, nhận danh sách item active theo route hiện tại | — |
| Header.tsx | thanh trên cùng: logo, search, badge phạm vi, chuông thông báo, avatar | scopeLabel, user |
| FileIcon.tsx | icon màu theo loại file, dùng chung DocumentCard/DocumentRow | fileType (pdf/docx/pptx/zip/...) |
| DocumentRow.tsx | 1 dòng tài liệu dạng list (dùng ở Dashboard "Tài liệu gần đây") | document, onAction |
| DocumentCard.tsx | Router card tài liệu dạng lưới (dùng cho cá nhân, bundle, hoặc kho học liệu qua variant) | document, onAction, basePath?, variant? |
| CommunityDocumentCard.tsx | Thẻ tài liệu chuẩn Kho học liệu (hiển thị năm học, loại tài liệu, sao đánh giá, lượt tải, CTA tải và lưu) | document, onAction, basePath? |
| DocumentListView.tsx | Hiển thị tài liệu dạng danh sách có phân cột sắp xếp, dùng chung Kho cá nhân, Nhóm và Kho học liệu | documents, workspaceType, onAction, navigationPath |
| DocumentDetailView.tsx | Hiển thị tài liệu dạng thẻ chi tiết mở rộng kèm trích xuất nội dung OCR/tóm tắt | documents, workspaceType, onAction, navigationPath |
| FolderCard.tsx | card thư mục cá nhân (Giáo trình, Bài tập...) | name, count, onClick |
| DocumentContextMenu.tsx | menu hành động: Xem trước/Tải xuống/Chia sẻ/Yêu thích/Đổi tên/Di chuyển/Xóa | onAction |
| StatCard.tsx | card thống kê góc trên dashboard | icon, iconBg, label, value, subLabel |
| TagDistribution.tsx | danh sách tag kèm ProgressBar (mục "Phân bổ nhãn dán") | tags: {name, count, percent}[] |
| ProcessingDonut.tsx | donut chart % xử lý tài liệu | percent, legend items |

## src/layouts/
| Component | Mô tả |
|---|---|
| MainLayout.tsx | Sidebar + Header + <Outlet/> — dùng cho mọi trang sau khi đăng nhập |
| AuthLayout.tsx | layout riêng cho trang Login (không có Sidebar/Header) |