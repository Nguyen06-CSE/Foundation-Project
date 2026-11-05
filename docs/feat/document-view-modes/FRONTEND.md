# Kiến Trúc Giao Diện & Thành Phần: Document Multi-View Modes

Tài liệu đặc tả chi tiết kiến trúc giao diện người dùng (Frontend Architecture), cây phân cấp Component, các giao thức kiểu dữ liệu (TypeScript Interfaces), hệ thống màu sắc theo định dạng tệp và kỹ thuật tối ưu render trong bộ điều khiển 3 phong cách hiển thị tài liệu.

---

## 1. Cây Phân Cấp Thành Phần (Component Hierarchy)

```text
src/
├── components/
│   └── shared/
│       ├── feedback/
│       │   └── ViewToggle.tsx                  # Bộ nút chuyển đổi 3 chế độ (Grid | List | Detail)
│       └── documents/
│           ├── index.ts                         # Barrel exports
│           ├── documentView.types.ts            # Kiểu dữ liệu DocumentListItem & BaseDocumentViewProps
│           ├── FileIcon.tsx                     # Icon vector đại diện cho từng loại tệp tin
│           ├── DocumentDetailView.tsx           # View hiển thị dạng thẻ chi tiết (Paperless-ngx style)
│           ├── DocumentListView.tsx             # View hiển thị dạng bảng (Table view + Bundle accordion)
│           ├── DocumentContextMenu.tsx          # Menu ngữ cảnh thao tác cá nhân
│           ├── DocumentBulkActionBar.tsx        # Thanh công cụ nổi thao tác hàng loạt
│           └── DocumentCard/                    # Nhánh View dạng Lưới (Grid view)
│               ├── DocumentCard.tsx             # Wrapper Router (Bundle vs File) + Checkbox chọn nhiều
│               ├── FileDocumentCard.tsx         # Card tệp đơn lẻ (Thumbnail lớn + Hover preview)
│               └── BundleDocumentCard.tsx       # Card gói tài liệu (Theme tím + Số tệp con)
```

---

## 2. Giao Thức Kiểu Dữ Liệu (`documentView.types.ts`)

Để đảm bảo tính nhất quán dữ liệu giữa 3 chế độ hiển thị, hệ thống chuẩn hóa thông qua interface đại diện duy nhất [`DocumentListItem`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/documentView.types.ts#L7-L34):

### 2.1. Interface `DocumentListItem`
```typescript
export interface DocumentListItem {
  id: string | number
  title: string
  type?: FileTypeMap | string
  extension?: string
  updatedAt?: string
  size?: number | string
  thumbnail_path?: string | null
  markdown_path?: string | null
  description?: string
  content?: string | null           // Văn bản trích xuất (OCR/Raw Text) cho Detail View
  pages?: number | null             // Số trang tài liệu (PDF, Word, PPTX)
  owner?: {
    full_name?: string
    username?: string
    avatar?: string | null
    avatar_url?: string | null
  }
  workspace_type?: 'personal' | 'group' | 'shared'
  tags?: Array<{ id: number; name: string; color?: string }>
  isFavorite?: boolean
  is_bundle?: boolean               // Nhận diện gói Bundle tài liệu
  bundle_parent_id?: number | null
  bundle_children_count?: number | null
  view_count?: number
  personal_view_count?: number      // Lượt xem cá nhân phục vụ tính toán Activity Heat
  trending_score?: number
}
```

### 2.2. Interface `BaseDocumentViewProps`
Các props cơ bản dùng chung cho cả [`DocumentDetailView`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx) và [`DocumentListView`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentListView.tsx):
```typescript
export interface BaseDocumentViewProps {
  documents: DocumentListItem[]
  isLoading?: boolean
  onAction?: (action: string, docId: string | number) => void
  navigationPath?: (docId: string | number) => string
  showOwner?: boolean
  workspaceType?: 'personal' | 'group'
  permission?: 'owner' | 'full' | 'view'
  extraItems?: any[]
  selectedIds?: (string | number)[]
  onToggleSelect?: (docId: string | number) => void
}
```

---

## 3. Hệ Thống Nhận Diện & Bảng Màu Định Dạng Tệp (`FILE_TYPE_THEMES`)

Hệ thống tự động phân tích đuôi tệp hoặc chuỗi MIME Type thông qua hàm `getFileExtension()` để gán bộ theme màu tương ứng, mang lại sự đồng bộ thị giác trên cả 3 chế độ xem:

| Định dạng tệp | Nhóm màu (Tailwind Color) | Nền Thumbnail (`bg`) | Huy hiệu MIME (`badgeBg` / `badgeText`) |
| :--- | :--- | :--- | :--- |
| **PDF** | Rose / Đỏ tươi | `bg-rose-50/70 hover:bg-rose-50` | `bg-rose-100/90 text-rose-700` |
| **DOC / DOCX** | Blue / Xanh dương | `bg-blue-50/70 hover:bg-blue-50` | `bg-blue-100/90 text-blue-700` |
| **XLS / XLSX** | Emerald / Xanh lá | `bg-emerald-50/70 hover:bg-emerald-50` | `bg-emerald-100/90 text-emerald-700` |
| **PPT / PPTX** | Amber / Vàng cam | `bg-amber-50/70 hover:bg-amber-50` | `bg-amber-100/90 text-amber-700` |
| **JPG / PNG / WEBP**| Purple / Tím nhạt | `bg-purple-50/70 hover:bg-purple-50` | `bg-purple-100/90 text-purple-700` |
| **ZIP / RAR** | Slate / Xám tro | `bg-slate-100/70 hover:bg-slate-100` | `bg-slate-200/90 text-slate-700` |
| **BUNDLE (Gói)** | Violet / Tím đậm | `bg-purple-50/70` | `bg-purple-100 text-purple-700` |
| **Mặc định khác** | Gray / Xám chuẩn | `bg-gray-50/70 hover:bg-gray-50` | `bg-gray-200/80 text-gray-700` |

---

## 4. Chi Tiết Kỹ Thuật Từng Thành Phần

### 4.1. `ViewToggle.tsx`: Điều Hướng Chế Độ Xem
- **Vị trí file:** [`src/components/shared/feedback/ViewToggle.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/feedback/ViewToggle.tsx)
- **Kiểu chế độ xem:**
  ```typescript
  export type ViewMode = 'grid' | 'list' | 'detail'
  ```
- **Nguyên lý hoạt động:**
  - Nhận prop `viewMode` hiện tại và hàm callback `onViewModeChange(mode)`.
  - Render cụm 3 nút icon tinh gọn được đóng khung `border border-gray-200 rounded-lg bg-white p-0.5`:
    - `LayoutGrid`: Chế độ Lưới (title: *"Dạng lưới"*).
    - `List`: Chế độ Danh sách bảng (title: *"Dạng danh sách"*).
    - `AlignLeft`: Chế độ Danh sách chi tiết (title: *"Danh sách chi tiết"*).
  - Trạng thái Active được áp dụng hiệu ứng nổi bật: `bg-primary-50 text-primary-600`, trong khi nút không chọn mang màu `text-gray-400 hover:text-gray-700 hover:bg-gray-50`.
  - Hỗ trợ đầy đủ Accessibility (`title`, `aria-label`, `aria-pressed`).

---

### 4.2. `DocumentDetailView.tsx`: Chế Độ Danh Sách Chi Tiết
- **Vị trí file:** [`src/components/shared/documents/DocumentDetailView.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx)
- **Bố cục cấu trúc (Layout Anatomy):**
  1. **Thẻ Card nằm ngang (Flex row container):**
     Sử dụng layout co giãn `flex flex-col sm:flex-row items-start gap-5 p-4 sm:p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer`.
  2. **Khối Checkbox chọn nhiều:**
     Nằm ở cạnh trái thẻ, người dùng có thể click chọn mà không kích hoạt sự kiện mở tài liệu nhờ kỹ thuật `e.stopPropagation()`.
  3. **Khung Thumbnail lớn ($112 \times 144\text{ px}$ hoặc $128 \times 160\text{ px}$):**
     - Hiển thị ảnh bìa từ đường dẫn `getThumbnailUrl(doc.thumbnail_path)`.
     - Quản lý lỗi ảnh thông minh bằng local state `imageErrors[doc.id]`. Khi ảnh lỗi hoặc tài liệu chưa có bìa, component tự động fallback về [`FileIcon`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/FileIcon.tsx) vector sắc nét.
     - Badge loại tệp đính góc trên bên trái với hiệu ứng làm mờ nền `backdrop-blur-md`.
  4. **Khu vực Tiêu đề & Nhãn:**
     - Tiêu đề hỗ trợ `line-clamp-1 sm:line-clamp-2` chống tràn giao diện.
     - Huy hiệu Activity Heat (`heat.badgeText`) nổi bật khi tài liệu có nhiều tương tác (`5+ xem`, `Siêu hot`).
     - Danh sách Tags (hiển thị tối đa 4 tag đầu tiên kèm số lượng dư `+N`).
  5. **Hộp Trích Xuất Văn Bản (OCR / Text Preview Box):**
     - Gọi tiện ích `extractSummary(doc.content, 600)` lấy 600 ký tự đầu tiên sạch sẽ.
     - Hiển thị với phong cách font chữ rõ ràng, giới hạn 4 dòng `line-clamp-4 leading-relaxed font-normal text-gray-600` trong hộp nền xám nhạt `bg-gray-50/50 rounded-lg p-3 border border-gray-100/50`.
  6. **Chân Thẻ (Card Footer Actions & Metadata):**
     - **Bên trái:** Nút AI nhanh `Tóm tắt tự động AI` (`<Sparkles className="h-3.5 w-3.5 text-blue-600" />`) kết hợp các nút nhanh khi hover (`Heart` yêu thích, `Download` tải xuống).
     - **Bên phải:** Cụm thông tin metadata: Số trang (`Files`), Ngày cập nhật (`Calendar`), Dung lượng định dạng chuẩn (`HardDrive`) và Avatar tác giả (`User`).

---

### 4.3. `DocumentListView.tsx`: Chế Độ Danh Sách Bảng
- **Vị trí file:** [`src/components/shared/documents/DocumentListView.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentListView.tsx)
- **Tính năng trọng tâm:**
  1. **Bảng 12 Cột Đáp Ứng (Responsive 12-Column Grid):**
     - Cột 1-5: Checkbox, Nút mở rộng Bundle, Thumbnail mini ($48 \times 40\text{ px}$), Tên tài liệu, Badge và Tags.
     - Cột 6-7 (Tùy chọn): Tên người đăng (`showOwner`).
     - Cột 8-9: Thời gian cập nhật (`updatedAt`).
     - Cột 10-11: Kích thước tệp (`size`).
     - Cột 12: Menu ngữ cảnh (`DocumentContextMenu`).
  2. **Cơ chế Sắp xếp Cột Nội Bộ (Interactive Column Sorting):**
     ```typescript
     interface SortConfig {
       key: "name" | "size" | "date" | "type";
       direction: "asc" | "desc";
     }
     ```
     Click vào tiêu đề các cột sẽ tự động sắp xếp danh sách tài liệu theo thứ tự chữ cái tên, số bytes dung lượng hoặc timestamp ngày cập nhật.
  3. **Cơ chế Duyệt Bundle Dạng Cây (Accordion Tree Expander):**
     - Nhận prop `onToggleBundle: (bundleId) => Promise<DocumentListItem[]>`.
     - Quản lý trạng thái bằng 3 Set/Map: `expandedBundles`, `loadingBundles`, `bundleChildren`.
     - Khi bấm vào biểu tượng `ChevronRight`, nút sẽ xoay 90° thành `ChevronDown`, kích hoạt lazy fetch tài liệu con và render các dòng con thụt lề cấp 2 với hiệu ứng mượt mà.

---

### 4.4. `DocumentCard/`: Chế Độ Lưới Trực Quan
- **Vị trí file:** [`src/components/shared/documents/DocumentCard/DocumentCard.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentCard/DocumentCard.tsx)
- **Thành phần phân nhánh:**
  - **Component Wrapper:** Bọc khung thẻ bằng lớp viền `group/select rounded-xl`. Khi tài liệu được chọn, thẻ sẽ sáng viền primary: `ring-2 ring-primary-500 ring-offset-1`.
  - **Nút Checkbox Overlay:** Nút tròn vuông nhỏ (`h-6 w-6`) nằm ở góc trên bên phải (`absolute top-2.5 right-2.5 z-20`). Ở trạng thái bình thường nút ẩn đi và chỉ hiện khi di chuột (`group-hover/select:opacity-100`). Khi đã chọn, nút luôn hiển thị với nền xanh `bg-primary-600 text-white`.
  - **Bộ định tuyến thẻ (Router):**
    - Nếu `document.is_bundle === true` -> Render [`BundleDocumentCard.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentCard/BundleDocumentCard.tsx).
    - Ngược lại -> Render [`FileDocumentCard.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentCard/FileDocumentCard.tsx).
  - **Khung mở rộng Bundle Grid ([`BundleExpandedFrame.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/components/BundleExpandedFrame.tsx)):**
    - Chiếm trọn bề ngang lưới (`col-span-full`).
    - Nền tím nhạt thanh lịch (`bg-purple-50/20 border-purple-200`).
    - Cho phép duyệt trực tiếp các tài liệu bên trong bundle mà không cần rời khỏi màn hình cá nhân.

---

### 4.5. `DocumentBulkActionBar.tsx`: Thanh Thao Tác Hàng Loạt
- **Vị trí file:** [`src/components/shared/documents/DocumentBulkActionBar.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentBulkActionBar.tsx)
- **Đặc điểm:**
  - Định vị cố định ở đáy màn hình (`fixed bottom-6 left-1/2 -translate-x-1/2 z-40`).
  - Hoạt động liền mạch bất kể người dùng đang ở chế độ `grid`, `list` hay `detail`.
  - Cung cấp 4 thao tác nhóm thiết yếu:
    1. **Chọn tất cả / Bỏ chọn**: Đồng bộ số lượng `selectedCount / totalCount`.
    2. **Tải xuống .zip**: Nén toàn bộ tệp đã chọn thành một file ZIP duy nhất.
    3. **Đóng góp**: Đưa các tài liệu đã chọn lên Kho học liệu cộng đồng (`ContributeModal`).
    4. **Xóa**: Chuyển hàng loạt tài liệu vào Thùng rác.

---

## 5. Tối Ưu Hóa Hiệu Năng & Trải Nghiệm Render

1. **Chống Nhấp Nháy Khi Chuyển Chế Độ (Flicker-Free Transition):**
   Dữ liệu được chuẩn hóa thành `listItems` thông qua hàm memoized `toListItem(doc)` ngay tại section cha, đảm bảo khi bấm chuyển qua lại giữa `Grid`, `List` và `Detail`, ứng dụng không cần fetch lại API từ server.
2. **Lazy Loading Ảnh Bìa & Fallback An Toàn:**
   Sử dụng thuộc tính `loading="lazy"` kết hợp bắt lỗi `onError` để chuyển ngay sang biểu tượng vector SVG, ngăn chặn hiện tượng gãy icon ảnh trên giao diện.
3. **Ảo Hóa / Trích Đoạn OCR Tiết Kiệm RAM:**
   Văn bản OCR được cắt tỉa trước (`extractSummary(doc.content, 600)`) thay vì đưa toàn bộ chuỗi văn bản hàng chục nghìn từ vào cây DOM, giữ cho bộ nhớ RAM của trình duyệt luôn ổn định kể cả khi danh sách có hàng trăm tài liệu.
