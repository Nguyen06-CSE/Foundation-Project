# Frontend Components & Services: Favorites Feature

## Cấu trúc Components & Pages

### 1. `FavoritesPage.tsx` (`pages/personal/FavoritesPage.tsx`)
- Trang hiển thị danh sách tất cả các tài liệu được người dùng đánh dấu yêu thích.
- Sử dụng React Query `useQuery` với query key `["favorites"]` gọi `documentService.listFavorites()`.
- **Trạng thái UI**:
  - `isLoading`: Hiển thị mảng 8 `CardSkeleton` dạng `document`.
  - `favorites.length === 0`: Hiển thị `EmptyState` với Icon `Heart` (màu xám/đỏ) và mô tả hướng dẫn "Bấm vào biểu tượng trái tim trên menu tài liệu để lưu lại danh sách yêu thích".
  - Có dữ liệu: Hiển thị danh sách bằng mảng các `DocumentCard`.
- **Quyền hành động (`allowedActions`)**:
  - Hỗ trợ các action: `["view", "download", "favorite"]`.
  - Prop `isFavorited={true}` được truyền cứng cho tất cả thẻ tài liệu tại trang này.
- **Xử lý Bỏ yêu thích ngay tại trang**:
  - Bấm action `"favorite"` sẽ gọi `documentService.removeFavorite(docId)`. Khi hoàn tất, tự động invalidate query keys `["favorites"]` và `["documents"]` giúp tài liệu lập tức biến mất khỏi trang mà không cần F5.

### 2. Trạng thái Yêu thích trên Menu ngữ cảnh (`DocumentContextMenu.tsx`)
- Thêm prop optional `isFavorited?: boolean` vào `DocumentContextMenuProps`.
- Trong `DEFAULT_ITEMS`:
  - Thẻ item `"favorite"` có label động: `isFavorited ? "Bỏ yêu thích" : "Thêm vào Yêu thích"`.
  - Icon `Heart` có class động: `isFavorited ? "fill-rose-500 text-rose-500" : ""`.
- `DocumentCard.tsx` và `PersonalDocumentsSection.tsx` nhận prop `isFavorited` và truyền xuống `DocumentContextMenu`.

### 3. Tích hợp Toggle Favorite tại kho cá nhân (`usePersonalDocuments.ts`)
- Khởi tạo query fetch danh sách yêu thích:
  ```typescript
  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => documentService.listFavorites(),
  });
  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);
  ```
- Map trạng thái `isFavorited: favoriteIds.has(doc.id)` vào danh sách card (`allDocCards`).
- Xử lý action `"favorite"` trong `handleDocumentAction`:
  - Nếu `favoriteIds.has(docId)` $\rightarrow$ gọi `documentService.removeFavorite(docId)`.
  - Ngược lại $\rightarrow$ gọi `documentService.addFavorite(docId)`.
  - Khi hoàn thành $\rightarrow$ `queryClient.invalidateQueries` cho `["documents"]` và `["favorites"]`.

### 4. Tích hợp Toggle Favorite tại trang Đã chia sẻ với tôi (`SharedWithMe.tsx`)
- Tương tự kho cá nhân, trang `SharedWithMe` cũng fetch `favorites` để xác định `favoriteIds`.
- Truyền `allowedActions={["view", "download", "favorite"]}` và `isFavorited={favoriteIds.has(doc.id)}` cho `DocumentCard`.

## API Services (`documentService.ts`) & Types (`types/document.ts`)

### Data Types (`types/document.ts`)
```typescript
export interface FavoriteDocument extends Document {
  favorited_at?: string | null;
}
```

### API Methods (`services/documentService.ts`)
- `listFavorites()`: `GET /favorites/`
- `addFavorite(documentId: number)`: `POST /favorites/` với body `{ document_id: documentId }`
- `removeFavorite(documentId: number)`: `DELETE /favorites/${documentId}`
