# Shared components

Thư mục này chứa các component được dùng chung giữa nhiều trang hoặc khu vực của ứng dụng. Hãy chọn thư mục con theo trách nhiệm chính của component:

| Thư mục | Mục đích | Component |
| --- | --- | --- |
| `modals/` | Hộp thoại tạo, chỉnh sửa, tải lên hoặc thao tác với dữ liệu. | `AddToBundleModal`, `ContributeModal`, `CreateFolderModal`, `EditTagsModal`, `ManageTagsModal`, `RenameDocumentModal`, `UploadModal` |
| `documents/` | Hiển thị, lọc, phân loại và thao tác với tài liệu. | `DocumentCard` (gồm các biến thể trong `DocumentCard/`), `DocumentContextMenu`, `DocumentDetail`, `DocumentFilterBar`, `DocumentListView`, `DocumentRow`, `DocumentTypeTabs`, `FileIcon` |
| `folders/` | Hiển thị thư mục và các thao tác với thư mục. | `FolderCard`, `FolderContextMenu` |
| `layout/` | Thành phần khung giao diện và điều hướng dùng chung. | `Header`, `Sidebar`, `NotificationDropdown`, `SearchBar` |
| `feedback/` | Trạng thái giao diện, skeleton, đánh giá, số liệu, bộ lọc và lựa chọn hiển thị. | `CardSkeleton`, `EmptyState`, `ProcessingDonut`, `RatingCard`, `StarRating`, `StatCard`, `TagDistribution`, `TagSelector`, `DynamicFilterDropdown`, `ViewToggle` |
| `trash/` | Thành phần chỉ phục vụ giao diện thùng rác. | `MobileTrashBatch`, `TrashBatchRow`, `TrashConfirmModal`, `TrashEmptyState`, `TrashStatCard` |

`PermissionBadge` và `ProtectedRoute` được giữ ở thư mục gốc của `shared/`.

## Quy định khi thêm component

1. Đặt component mới trong thư mục con phù hợp với chức năng của nó; chỉ giữ ở gốc nếu đó là thành phần nền tảng không thuộc nhóm nào.
2. Re-export component và các kiểu cần công khai trong `index.ts` của thư mục tương ứng.
3. Khi cần import từ nơi khác, ưu tiên dùng đường dẫn đến nhóm phù hợp, ví dụ `@/components/shared/documents` hoặc `@/components/shared/modals`.
4. Nếu thêm nhóm component mới, cập nhật barrel `src/components/shared/index.ts` và bảng tra cứu này.
