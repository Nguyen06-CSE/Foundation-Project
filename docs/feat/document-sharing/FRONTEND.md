# Frontend: Chiến lược Tối ưu hóa với React Query & Giao diện Chia sẻ

Tài liệu này mô tả chi tiết kiến trúc tầng giao diện người dùng (UI), các thành phần tái sử dụng, và đặc biệt là **chiến lược quản lý trạng thái máy chủ (Server State Management) bằng TanStack React Query**, giúp phản hồi giao diện tức thì và loại bỏ hoàn toàn các yêu cầu mạng dư thừa.

---

## 1. Ứng dụng chuyên sâu của React Query (TanStack Query)

Trong kiến trúc ứng dụng web hiện đại, React Query đóng vai trò là tầng lưu trữ đệm máy chủ (Server Cache), giúp đồng bộ hóa dữ liệu giữa Frontend và Backend mà không cần các giải pháp quản lý state cồng kềnh như Redux.

### 1.1. Khởi tạo & Prefetch trạng thái tức thì (`["document-share-status", documentIds]`)
Trước đây, khi mở modal chia sẻ, giao diện phải chờ người dùng gõ tên người nhận rồi mới gửi request preview để biết trạng thái. Điều này tạo độ trễ cảm nhận (perceived latency).

**Giải pháp với React Query:**
Ngay khi component `ShareDocumentModal` được mount:
```tsx
const { data: docStatusData } = useQuery({
  queryKey: ["document-share-status", documentIds],
  queryFn: () => shareService.getDocumentShareStatus(documentIds),
  enabled: documentIds.length > 0,
  staleTime: 1000 * 30, // Giữ tươi 30 giây trong cache
});
```
- Endpoint này chỉ quét qua index trong database và trả về 2 danh sách số nguyên: `pending_user_ids` và `owned_user_ids`.
- Ngay khi modal mở lên, danh sách này đã sẵn sàng trong cache. Khi người dùng bấm chọn một người bất kỳ trong danh sách gợi ý, badge **`[Đang chờ duyệt]`** hoặc **`[Đã có trong kho]`** được render **ngay tức khắc (0ms latency)** mà chưa cần đợi gọi thêm request nào!

### 1.2. Predictive Preview với Debounce 300ms (`["share-preview", debouncedPayload]`)
Khi người dùng kết hợp nhiều tiêu chí phức tạp (tìm theo cá nhân, theo mã sinh viên regex, theo cả lớp hoặc khoa):
- `previewPayload` được gom nhóm và cho qua custom hook `useDebounce(previewPayload, 300)`.
- React Query lắng nghe `debouncedPayload` làm query key:
```tsx
const { data: previewData, isFetching: isPreviewLoading } = useQuery({
  queryKey: ["share-preview", debouncedPayload],
  queryFn: () => shareService.preview(debouncedPayload),
  enabled: totalCriteriaCount > 0 && documentIds.length > 0,
  staleTime: 1000 * 20,
});
```
- **Lợi ích**:
  1. Giảm thiểu 80% số lượng request so với việc gọi API trên mỗi phím bấm.
  2. Tự động lưu cache: nếu người dùng xóa bớt 1 tiêu chí rồi thêm lại tiêu chí cũ, React Query lấy ngay dữ liệu từ cache mà không cần gửi lại request lên server.
  3. Cung cấp cờ `isPreviewLoading` để hiển thị trạng thái loading mượt mà dưới footer.

### 1.3. Optimistic Guard: Chặn thao tác trùng lặp ngay từ UI
Dựa trên dữ liệu từ React Query (`previewData`), component tính toán:
```tsx
const isAllDuplicates = Boolean(
  previewData &&
  previewData.users.length > 0 &&
  previewData.auto_count === 0 &&
  previewData.pending_count === 0
);
```
- Nếu tất cả người nhận trong danh sách đều đã có tài liệu hoặc đang chờ xác nhận:
  1. Hiển thị một khung cảnh báo thân thiện màu vàng hổ phách: *"Tất cả người nhận được chọn đều đã có tài liệu hoặc đang có yêu cầu chờ duyệt. Không cần gửi thêm yêu cầu chia sẻ."*
  2. Nút **"Chia sẻ ngay"** tự động chuyển sang trạng thái disabled.
  3. Ngăn ngừa triệt để người dùng bấm gửi vô ích, giảm tải tối đa cho đường truyền mạng.

### 1.4. Selective Cache Invalidation (Làm mới có chọn lọc)
Thay vì sử dụng các phương pháp thủ công như `window.location.reload()` hoặc refetch toàn bộ trang, React Query cho phép cập nhật dữ liệu đa màn hình thông qua cơ chế Invalidate Query Keys có chủ đích:

#### Khi Chia sẻ thành công (`shareMutation.onSuccess`):
```tsx
queryClient.invalidateQueries({ queryKey: ["document-share-status"] });
queryClient.invalidateQueries({ queryKey: ["shares"] });
queryClient.invalidateQueries({ queryKey: ["documents"] });
```
Mọi tab liên quan (Tab "Đã gửi", Tab "Đã chia sẻ với tôi", Danh sách kho cá nhân) tự động được đồng bộ ngầm mà không gây chớp nháy màn hình.

#### Khi Chấp nhận tài liệu (`acceptMutation.onSuccess`):
```tsx
queryClient.invalidateQueries({ queryKey: ["shares-received"] });
queryClient.invalidateQueries({ queryKey: ["shares-pending"] });
queryClient.invalidateQueries({ queryKey: ["documents"] });
```
Tài liệu vừa chấp nhận lập tức hiển thị ngay trên Tab "Đã nhận" và xuất hiện trong Kho cá nhân.

#### Khi Rút yêu cầu (`withdrawMutation.onSuccess`):
```tsx
queryClient.invalidateQueries({ queryKey: ["shares-sent"] });
queryClient.invalidateQueries({ queryKey: ["document-share-status"] });
```
Trạng thái trên Tab "Đã gửi" chuyển ngay sang **`[Đã rút lại]`**, và nếu mở modal chia sẻ lại cho người đó thì badge sẽ trở về bình thường.

---

## 2. Cấu trúc Component và Tính Tái Sử Dụng

Toàn bộ giải pháp tuân thủ nghiêm ngặt nguyên tắc tái sử dụng tối đa mã nguồn hiện có:

### 2.1. `RecipientPicker.tsx`
- Tách biệt logic chọn người nhận ra khỏi các modal cụ thể.
- Nhận `renderUserBadge?: (user: User) => React.ReactNode` để hiển thị linh hoạt badge tương ứng với từng ngữ cảnh.
- Hỗ trợ cả 2 chế độ:
  - **Basic**: Thanh tìm kiếm thông minh kết hợp cả tên, email, MSSV, lớp, khoa, regex.
  - **Advanced**: Phân nhóm lựa chọn theo từng khối cụ thể.

### 2.2. `ShareDocumentModal.tsx`
- Tái sử dụng `RecipientPicker` cho luồng chia sẻ tài liệu đơn lẻ và chia sẻ hàng loạt.
- Tích hợp hệ thống badge trạng thái trực quan:
  - `[Nhận ngay]` (màu xanh lá): Dành cho người nhận có cấp bậc thấp hơn người gửi.
  - `[Cần xác nhận]` (màu xanh dương): Dành cho người nhận ngang cấp hoặc cao cấp hơn.
  - `[Đang chờ duyệt]` (màu hổ phách): Đã có yêu cầu chia sẻ đang chờ người này duyệt.
  - `[Đã có trong kho]` (màu xám): Người này đã sở hữu bản sao trong kho cá nhân.
- Hỗ trợ modal xác nhận cấp 2 khi chia sẻ theo diện rộng (`requires_bulk_confirm`).

### 2.3. Trang "Đã chia sẻ với tôi" (`SharedWithMe.tsx`)
Bao gồm 3 tab điều hướng mượt mà:
1. **Tab 1: Đã nhận (`received`)**:
   - Tái sử dụng toàn bộ component hiển thị kho tài liệu `PersonalDocumentsSection`.
   - Cho phép người dùng chuyển đổi linh hoạt qua lại giữa **3 chế độ xem (Grid, List, Detail)**.
   - Hiển thị đầy đủ thông tin: Người gửi (`showOwner`), kích thước, ngày nhận, tag, thống kê lượt xem, và mở rộng xem các file bên trong nếu là Bundle.
2. **Tab 2: Thông báo & Yêu cầu (`requests`)**:
   - Hiển thị các lời mời chia sẻ đang chờ người dùng xử lý.
   - Thẻ hiển thị rõ: Tiêu đề tài liệu, người gửi, chức vụ, lời nhắn kèm theo, thời gian hết hạn còn lại.
   - Nút **[Chấp nhận]** và **[Từ chối]** tương tác trực quan.
3. **Tab 3: Đã gửi (`sent`)**:
   - Danh sách toàn bộ yêu cầu do chính người dùng gửi đi.
   - Hiển thị các badge trạng thái: `Đang chờ duyệt`, `Đã chấp nhận`, `Đã từ chối`, `Đã rút lại`, `Hết hạn`.
   - Đối với các yêu cầu đang chờ (`pending`), cung cấp nút **[Rút yêu cầu]** để hủy lời mời đã phát bất cứ khi nào người gửi muốn.
