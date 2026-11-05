# Hướng Dẫn Tái Sử Dụng & Tích Hợp (Reuse & Integration Guide)

Tài liệu hướng dẫn chi tiết về các vị trí đã tái sử dụng bộ điều khiển 3 phong cách hiển thị tài liệu (`Grid`, `List`, `Detail`) trong hệ sinh thái Digital Library, kèm mã nguồn tham khảo và các bước tích hợp vào màn hình mới.

---

## 📑 Danh Mục Màn Hình Đã Tích Hợp

Hệ thống điều khiển hiển thị tài liệu đa phong cách hiện đang được tái sử dụng tại 4 phân hệ chính:

1. [Kho Tài Liệu Cá Nhân (`PersonalDocuments.tsx`)](#1-kho-tài-liệu-cá-nhân-personaldocuments)
2. [Workspace Nhóm Học Tập (`GroupDocumentsSection.tsx`)](#2-workspace-nhóm-học-tập-groupdocumentssection)
3. [Trang Chi Tiết Gói Tài Liệu (`BundleDetailPage.tsx`)](#3-trang-chi-tiết-gói-tài-liệu-bundledetailpage)
4. [Kho Học Liệu Môn Học (`LibrarySubject.tsx`)](#4-kho-học-liệu-môn-học-librarysubject)
5. [Hướng Dẫn Tích Hợp Vào Màn Hình Mới (Developer Quickstart)](#5-hướng-dẫn-tích-hợp-vào-màn-hình-mới)

---

## 1. Kho Tài Liệu Cá Nhân (`PersonalDocuments`)

### 1.1. Vị trí mã nguồn
- Trang chính: [`src/pages/personal/PersonalDocuments.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/PersonalDocuments.tsx)
- Phân đoạn điều khiển: [`src/pages/personal/components/PersonalDocumentsSection.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/components/PersonalDocumentsSection.tsx)
- Khung Bundle mở rộng: [`src/pages/personal/components/BundleExpandedFrame.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/components/BundleExpandedFrame.tsx)

### 1.2. Đặc điểm triển khai
- **Chế độ xem mặc định:** Khởi tạo `useState<ViewMode>("detail")` — phong cách thẻ nằm ngang hiển thị ảnh bìa lớn và đoạn trích xuất OCR 4 dòng giúp sinh viên đọc lướt nội dung bài tập, đồ án nhanh chóng.
- **Tích hợp thanh công cụ:**
  ```tsx
  {/* Header: Tiêu đề + Nút Chọn nhiều + Nút Bundle Grid + ViewToggle */}
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold text-gray-700">Tài liệu</h2>
      {filteredDocCards.length > 0 && (
        <button onClick={...} className="...">
          <CheckSquare className="h-3.5 w-3.5" />
          {selectedIds.length > 0 ? `Đã chọn ${selectedIds.length}/${filteredDocCards.length}` : "Chọn nhiều"}
        </button>
      )}
    </div>
    <div className="flex items-center gap-2">
      {viewMode === "grid" && hasBundle && (
        <button onClick={() => setIsExpandedMode((v) => !v)} className="...">
          <LayoutGrid className="h-3.5 w-3.5" />
          {isExpandedMode ? "Thu gọn bundle" : "Xem nội dung bundle"}
        </button>
      )}
      <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
    </div>
  </div>
  ```

- **Điều phối 3 chế độ xem:**
  - **Khi `viewMode === 'grid'`:** Render lưới thẻ co giãn `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. Nếu là tệp đơn lẻ thì render [`DocumentCard`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentCard/DocumentCard.tsx). Nếu là Bundle và `isExpandedMode = true` thì render [`BundleExpandedFrame`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/components/BundleExpandedFrame.tsx) chiếm toàn bộ chiều rộng.
  - **Khi `viewMode === 'list'`:** Render [`DocumentListView`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentListView.tsx), truyền prop `onToggleBundle` để nạp dữ liệu tài liệu con qua API `documentService.getBundleChildren(bundleId)`.
  - **Khi `viewMode === 'detail'`:** Render [`DocumentDetailView`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx) với đầy đủ thông tin OCR text, nút tóm tắt AI và huy hiệu tương tác.

- **Đồng bộ thao tác hàng loạt (Bulk Actions):**
  Danh sách `selectedIds` được lưu ở cấp Section cha, giúp người dùng không bị mất danh sách tài liệu đã chọn khi click chuyển đổi giữa Grid, List và Detail. Khi `selectedIds.length > 0`, thanh nổi [`DocumentBulkActionBar`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentBulkActionBar.tsx) sẽ tự động hiện lên ở đáy màn hình.

---

## 2. Workspace Nhóm Học Tập (`GroupDocumentsSection`)

### 2.1. Vị trí mã nguồn
- Tab tài liệu: [`src/pages/group/components/tabs/DocumentsTab.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/group/components/tabs/DocumentsTab.tsx)
- Phân đoạn điều khiển: [`src/pages/group/components/sections/GroupDocumentsSection.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/group/components/sections/GroupDocumentsSection.tsx)
- Card tệp nhóm: [`src/pages/group/components/cards/LocalGroupDocumentCard.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/group/components/cards/LocalGroupDocumentCard.tsx)

### 2.2. Đặc điểm triển khai
- **Tương thích phân quyền thành viên:**
  Nhận prop `permission` (`owner`, `full`, `view`) từ không gian nhóm để điều chỉnh quyền hạn thao tác (chỉ thành viên có quyền `full` hoặc `owner` mới được xóa/sửa/đổi tên tài liệu).
- **Menu ngữ cảnh chuyên biệt cho nhóm:**
  Tự động kích hoạt [`GroupDocumentContextMenu`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/group/components/shared/GroupDocumentContextMenu.tsx) khi truyền `workspaceType="group"`:
  ```tsx
  {viewMode === "list" && (
    <DocumentListView
      documents={listItems}
      isLoading={isLoading}
      workspaceType="group"
      permission={effectivePermission}
      navigationPath={(docId) => `/groups/${groupId}/documents/${docId}`}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelectDoc}
      onAction={(action, docId) => handleAction(action, Number(docId))}
    />
  )}

  {viewMode === "detail" && (
    <DocumentDetailView
      documents={listItems}
      isLoading={isLoading}
      workspaceType="group"
      permission={effectivePermission}
      navigationPath={(docId) => `/groups/${groupId}/documents/${docId}`}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelectDoc}
      onAction={(action, docId) => handleAction(action, Number(docId))}
    />
  )}
  ```
- **Hành động đặc thù:**
  - Hỗ trợ hành động **"Lưu về kho cá nhân"** (`save_to_personal`): Sao chép tài liệu từ nhóm về không gian riêng của người dùng.
  - Hỗ trợ nộp tài liệu nhóm lên Thư viện cộng đồng thông qua [`ContributeModal`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/modals/ContributeModal.tsx).

---

## 3. Trang Chi Tiết Gói Tài Liệu (`BundleDetailPage`)

### 3.1. Vị trí mã nguồn
- [`src/pages/personal/BundleDetailPage.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/BundleDetailPage.tsx)

### 3.2. Đặc điểm triển khai
- **Quản lý danh sách tệp con trong gói:**
  Cho phép người dùng chuyển đổi xem các file thuộc gói bằng [`ViewToggle`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/feedback/ViewToggle.tsx):
  ```tsx
  <div className="flex items-center justify-between gap-3 mb-4">
    <div className="relative flex-1 max-w-xs">
      <Input
        placeholder="Tìm file trong gói..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
    <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
  </div>

  {viewMode === "grid" ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {mappedCardItems.map((childDoc) => (
        <DocumentCard
          key={childDoc.id}
          document={childDoc}
          basePath={basePath}
          onAction={handleChildAction}
          extraItems={extraItems}
        />
      ))}
    </div>
  ) : (
    <DocumentListView
      documents={mappedListItems}
      onAction={handleChildAction}
      extraItems={extraItems}
    />
  )}
  ```
- **Menu thao tác mở rộng (`extraItems`):**
  Truyền thêm tùy chọn *"Tách khỏi gói"* (`removeFromBundle`) vào menu ngữ cảnh của từng tệp con, cho phép gỡ tệp ra khỏi bundle và đưa về dạng tài liệu độc lập trong kho cá nhân.

---

## 4. Kho Học Liệu Môn Học (`LibrarySubject`)

### 4.1. Vị trí mã nguồn
- [`src/pages/library/LibrarySubject.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/library/LibrarySubject.tsx#L273-L345)

### 4.2. Đặc điểm triển khai
- Đặt [`ViewToggle`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/feedback/ViewToggle.tsx) ở góc phải của thanh điều khiển phụ (nằm cạnh bộ lọc Năm học và Sắp xếp).
- Cho phép sinh viên linh hoạt chuyển đổi giữa cách xem dạng Card (tập trung đánh giá sao, loại đề thi/giáo trình) và dạng Danh sách để tra cứu nhanh theo mã học phần.

---

## 5. Hướng Dẫn Tích Hợp Vào Màn Hình Mới

Nếu bạn muốn tạo một trang mới hoặc module mới (ví dụ: *Tài liệu được chia sẻ với tôi*, *Thùng rác*, *Kho tài liệu khoa/viện*), hãy làm theo 4 bước chuẩn hóa sau:

### Bước 1: Khởi tạo State Chế Độ Xem & Danh Sách Chọn Nhiều
```typescript
import { useState, useCallback } from "react"
import { ViewToggle, type ViewMode } from "@/components/shared/feedback/ViewToggle"
import { DocumentListView, DocumentDetailView, type DocumentListItem } from "@/components/shared/documents"
import { DocumentCard } from "@/components/shared/documents/DocumentCard"
import { DocumentBulkActionBar } from "@/components/shared/documents/DocumentBulkActionBar"

export function MyNewDocumentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("detail")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelectDoc = useCallback((docId: string | number) => {
    const idStr = String(docId)
    setSelectedIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    )
  }, [])
  // ...
```

### Bước 2: Chuẩn Hóa Dữ Liệu Sang Định Dạng `DocumentListItem`
```typescript
const listItems: DocumentListItem[] = myDocuments.map((doc) => ({
  id: doc.id,
  title: doc.name || doc.title,
  type: doc.file_type,
  updatedAt: doc.updated_at,
  size: doc.file_size,
  thumbnail_path: doc.thumbnail_path,
  content: doc.content,          // Văn bản trích xuất OCR để hiển thị trên Detail View
  pages: doc.pages,              // Số trang
  tags: doc.tags,
  is_bundle: doc.is_bundle,
}))
```

### Bước 3: Đặt `ViewToggle` Trên Thanh Header
```tsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-base font-semibold text-gray-800">Danh Sách Tài Liệu</h2>
  <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
</div>
```

### Bước 4: Điều Kiện Render 3 Chế Độ Xem
```tsx
{/* 1. Grid View */}
{viewMode === "grid" && (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {myDocuments.map((doc) => (
      <DocumentCard
        key={doc.id}
        document={doc}
        isSelected={selectedIds.includes(String(doc.id))}
        onToggleSelect={toggleSelectDoc}
        onAction={handleAction}
      />
    ))}
  </div>
)}

{/* 2. List View */}
{viewMode === "list" && (
  <DocumentListView
    documents={listItems}
    isLoading={isLoading}
    selectedIds={selectedIds}
    onToggleSelect={toggleSelectDoc}
    onAction={handleAction}
  />
)}

{/* 3. Detail View */}
{viewMode === "detail" && (
  <DocumentDetailView
    documents={listItems}
    isLoading={isLoading}
    selectedIds={selectedIds}
    onToggleSelect={toggleSelectDoc}
    onAction={handleAction}
  />
)}

{/* Thanh công cụ thao tác hàng loạt nổi khi có mục được chọn */}
<DocumentBulkActionBar
  selectedCount={selectedIds.length}
  totalCount={myDocuments.length}
  onSelectAll={() => setSelectedIds(myDocuments.map((d) => String(d.id)))}
  onClearSelection={() => setSelectedIds([])}
  onBulkDownload={handleBulkDownload}
  onBulkDelete={handleBulkDelete}
/>
```
