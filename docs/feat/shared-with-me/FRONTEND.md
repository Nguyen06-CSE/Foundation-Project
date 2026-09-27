# Frontend Components & Services: Shared With Me Feature

## Cấu trúc Components & Pages

### 1. `SharedWithMe.tsx` (`pages/personal/SharedWithMe.tsx`)
- Trang hiển thị danh sách các tài liệu được người dùng khác chia sẻ.
- Sử dụng React Query `useQuery` với query key `["documents", "shared-with-me", page]` để fetch dữ liệu từ `documentService.getSharedWithMe`.
- **Trạng thái UI**:
  - `isLoading`: Render mảng 8 `CardSkeleton` dạng `document`.
  - `items.length === 0`: Render component `EmptyState` với Icon `Share2` và thông báo "Chưa có tài liệu nào".
  - Có dữ liệu: Hiển thị danh sách bằng mảng các `DocumentCard`.
- **Thanh thông tin lời nhắn (Note Card)**:
  - Ngay bên dưới mỗi `DocumentCard`, nếu `doc.shared_by` hoặc `doc.share_message` tồn tại, trang sẽ render thêm một thẻ thông tin màu vàng nhạt (`bg-amber-50/60`, `border-amber-200`).
  - Hiển thị tên người gửi (`shared_by.full_name` hoặc `username`), thời gian chia sẻ tương đối (`formatRelativeDate(shared_at)`), và nội dung lời nhắn dạng in nghiêng.
- **Tối ưu React Key**:
  - Thẻ bao ngoài từng phần tử trong grid sử dụng key ổn định: `key={doc.share_id ?? `doc-${doc.id}`}` giúp tránh lỗi trùng key khi 1 tài liệu được chia sẻ nhiều lần.
- **Quyền hành động (`allowedActions`)**:
  - Cho phép thực hiện các action: `["view", "download", "favorite"]`.
  - Bổ sung query `favorites` để truyền prop `isFavorited={favoriteIds.has(doc.id)}` cho `DocumentCard`.

### 2. `ShareDocumentModal.tsx` (`components/shared/ShareDocumentModal.tsx`)
- Modal tương tác mở lên khi người dùng chọn action `"share"` trên menu ngữ cảnh của một tài liệu.
- **Tìm kiếm người nhận**:
  - Ô input cho phép nhập tên hoặc username. Chỉ tự động kích hoạt tìm kiếm khi người dùng gõ từ 2 ký tự trở lên (`searchQuery.trim().length >= 2`).
  - Gọi `userService.searchUsers(searchQuery.trim())` qua `useQuery` với `staleTime: 10 * 1000`.
- **Chọn người nhận**:
  - Click vào kết quả tìm kiếm sẽ chọn người dùng đó và chuyển giao diện sang thẻ chứa thông tin người nhận đã chọn kèm nút xóa (`X`) để chọn lại.
- **Nhập lời nhắn**:
  - Ô `textarea` cho phép nhập lời nhắn tùy chọn (giới hạn tối đa 300 ký tự với đếm số ký tự thời gian thực).
- **Gửi chia sẻ**:
  - Sử dụng `useMutation` gọi `documentService.share`.
  - Khi thành công: `invalidateQueries` cho `["documents", "shared-with-me"]` và đóng modal.
  - Khi thất bại: Hiển thị thông báo lỗi chi tiết từ server qua `alert(msg)`.

### 3. Nối luồng Action `"share"` trên UI

#### Trang Tài liệu cá nhân (`usePersonalDocuments.ts` & `PersonalDocuments.tsx`)
- State `sharingDoc` lưu thông tin `{ id: number, title: string }`.
- Trong `handleDocumentAction`: Khi `action === "share"`, tìm tài liệu trong danh sách và gọi `setSharingDoc({ id: docToShare.id, title: docToShare.title })`.
- Trong `PersonalDocuments.tsx`: Render `<ShareDocumentModal>` khi `sharingDoc !== null`.

#### Trang Tài liệu nhóm (`GroupDocumentsSection.tsx`, `DocumentsTab.tsx`, `LocalGroupDocumentCard.tsx`)
- `LocalGroupDocumentCard.tsx` & `DocumentsTab.tsx`: Khi menu phát ra action `"share"`, gọi callback `onShare(docId, docTitle)`.
- `GroupDocumentsSection.tsx`: Quản lý state `sharingDoc` nội bộ và render `<ShareDocumentModal>` khi `sharingDoc !== null`.

## API Services (`documentService.ts`) & Types (`types/document.ts`)

### Data Types (`types/document.ts`)
```typescript
export interface SharedDocument extends Document {
  share_id?: number | null;
  shared_by?: DocumentOwner | null;
  share_message?: string | null;
  shared_at?: string | null;
}

export interface PaginatedSharedDocuments {
  items: SharedDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

### API Methods (`services/documentService.ts`)
- `getSharedWithMe(params?: { page?: number; page_size?: number })`:
  `GET /documents/shared-with-me`
- `share(documentId: number, toUserId: number, message?: string, shareType = "personal")`:
  `POST /documents/${documentId}/share`
