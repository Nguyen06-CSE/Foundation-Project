# Danh sách màn hình (map với ảnh trong docs/design-reference/)

| # | Route | File | Ảnh tham chiếu | Ghi chú |
|---|---|---|---|---|
| 0 | /login | pages/auth/LoginPage.tsx | login.png | Không dùng MainLayout, dùng AuthLayout |
| 1 | /personal | pages/personal/PersonalDashboard.tsx | personal-dashboard.png, context-menu-1.png, context-menu-2.png | 2 ảnh context-menu thể hiện cùng 1 menu ở 2 trạng thái/style — chốt 1 kiểu để dùng thống nhất (xem ghi chú bên dưới) |
| 2 | /personal/documents | pages/personal/PersonalDocuments.tsx | personal-documents.png | Có folder cards + filter bar + grid tài liệu |
| 3 | /personal/documents/:id | pages/personal/DocumentDetail.tsx | document-detail.png | Có tabs Chi tiết/Mô tả/Ghi chú/Hoạt động |

## Ghi chú quan trọng
- Ảnh `context-menu-1.png` và `context-menu-2.png` là 2 phiên bản dropdown hơi khác
  nhau (1 bản có icon trước mỗi action, 1 bản chỉ có text). **Chốt dùng bản có icon**
  (context-menu-1.png) làm chuẩn — nhất quán với các icon dùng trong toàn bộ hệ thống.
- Icon "X đỏ" xuất hiện trên 1 số file trong ảnh dashboard/documents là lỗi hiển thị
  ảnh bị thiếu khi export từ Figma (broken image), KHÔNG PHẢI thiết kế chủ đích —
  agent phải thay bằng icon file đúng loại (PDF/DOCX...) theo FileIcon component.

  ## Màn hình Nhóm (bổ sung)

| # | Route | File | Ảnh tham chiếu |
|---|---|---|---|
| G1 | /groups | pages/group/GroupList.tsx | nhom-danh-sach-nhom.png |
| G2 | /groups/:id | pages/group/GroupSpace.tsx | nhom-khong-gian-nhom.png |
| G3 | /groups/:id?tab=members | pages/group/GroupSpace.tsx | quan-ly-thanh-vien-nhom.png |
| G4 | /groups/:id?tab=requests | pages/group/GroupSpace.tsx | loi-moi-tham-gia-nhom.png |

## Lưu ý routing Nhóm
- GroupSpace là 1 component duy nhất, tab được điều khiển bằng
  query param ?tab=documents|members|requests|settings
- Không tạo 4 file riêng cho 4 tab — dùng useState hoặc useSearchParams
  để switch tab, giữ URL đồng bộ