---
sidebar_position: 6
---

# Troubleshooting: Các Sự Cố Đã Gặp & Giải Pháp Triệt Để

Tài liệu này ghi lại chi tiết các lỗi phát sinh trong quá trình vận hành, chẩn đoán hiệu năng và tái cấu trúc hệ thống truy vấn tài liệu, kèm theo nguyên nhân gốc rễ (Root Cause) và giải pháp kỹ thuật đã áp dụng.

---

## 1. Sự cố 1: Phân trang Giao diện bị kẹt cứng ở Trang 1

### Hiện tượng
Tại trang Kho cá nhân, giao diện hiển thị thanh phân trang với nút "Tiếp" (Next). Khi người dùng bấm "Tiếp", số trang trên UI đổi thành 2, 3 nhưng danh sách tài liệu vẫn giữ nguyên 20 tài liệu của trang 1, hoàn toàn không xem được tài liệu từ bản ghi thứ 21 trở đi.

### Phân tích Root Cause
Đọc code tại `frontend/digital-library/src/pages/personal/hooks/usePersonalDocuments.ts:79-80`:
```typescript
// CODE CŨ GÂY LỖI:
const { data: docData } = useQuery({
  queryKey: ["documents", "personal"], // <-- KHÔNG có page trong queryKey!
  queryFn: () => documentService.getAll({ page: 1, page_size: 20 }), // <-- GÁN CỨNG page: 1!
});
```
- Khi bấm nút đổi trang, state `page` của component thay đổi nhưng không được truyền vào `queryKey` lẫn `queryFn`.
- TanStack Query thấy `queryKey` không đổi nên không kích hoạt refetch, và nếu có refetch thì vẫn gọi `page: 1`.

### Giải pháp triệt để
- Thay thế hoàn toàn cơ chế phân trang nút bấm cũ bằng **Infinite Scroll** sử dụng `useInfiniteQuery`.
- Nhúng `pageParam` vào `queryFn` và truyền đầy đủ bộ lọc vào `queryKey`.

---

## 2. Sự cố 2: Nhóm bị giới hạn cứng 20 tài liệu

### Hiện tượng
Một nhóm có 150 tài liệu được tải lên, nhưng khi vào Không gian nhóm chỉ thấy tối đa 20 tài liệu. Các tài liệu từ thứ 21 trở đi không xuất hiện, tính năng tìm kiếm trên giao diện cũng không tìm ra các tài liệu này.

### Phân tích Root Cause
- Frontend `useGroupDocuments.ts:16` gọi `groupService.getDocuments(groupId)` mà không truyền bất kỳ tham số phân trang nào.
- Backend `backend/app/routers/groups.py:228` định nghĩa: `page_size: int = Query(20, ge=1, le=100)`. Do không nhận được `page_size`, FastAPI gán giá trị mặc định là 20 và thực hiện `LIMIT 20`.
- Tầng giao diện tự lọc trên mảng 20 phần tử này nên các tài liệu còn lại bị bỏ sót hoàn toàn.

### Giải pháp triệt để
- Chuyển `useGroupDocuments` sang sử dụng `useInfiniteQuery` đồng nhất với kho cá nhân.
- Nối tham số `DocumentQueryParams` và phân trang tự động qua `InfiniteScrollSentinel`.

---

## 3. Sự cố 3: Thumbnail mất hoàn toàn HTTP Cache & Thiếu Cache-Control

### Hiện tượng
Mỗi lần người dùng hover vào một thẻ tài liệu hoặc đổi tab nhẹ, toàn bộ ảnh thumbnail trong trang bị tải lại từ server (status 200). Tab Network ghi nhận hàng trăm request ảnh lặp đi lặp lại.

### Phân tích Root Cause
1. `getThumbnailUrl.ts` có dòng code: `return `${cleanUrl}?t=${Date.now()}`;`. Do `Date.now()` sinh ra số mili-giây mới ở mỗi lần hàm chạy, trình duyệt coi mỗi lần render là một URL hoàn toàn mới và bắt buộc gửi request tải ảnh lại từ đầu.
2. Endpoint tĩnh `/storage` của Backend sử dụng `StaticFiles` mặc định của Starlette, không gắn header `Cache-Control`, khiến trình duyệt không chủ động lưu cache vào đĩa.

### Giải pháp triệt để
1. Xóa bỏ `?t=${Date.now()}`, thay bằng đường dẫn tĩnh hoặc `?v=${updated_at}` ổn định.
2. Thêm `loading="lazy"` và `decoding="async"` cho thẻ `<img>`.
3. Kế thừa `CachedStaticFiles(StaticFiles)` trong FastAPI bổ sung header `Cache-Control: public, max-age=86400`.

---

## 4. Sự cố 4: Rò rỉ Dữ liệu Cache giữa các Tài khoản (User Session Leak)

### Hiện tượng
Người dùng đăng nhập tài khoản `nguyen` (có 1.000 tài liệu), sau đó bấm "Đăng xuất" và đăng nhập bằng tài khoản sinh viên `sv_an` (chỉ có 31 tài liệu). Khi vào kho cá nhân của `sv_an`, giao diện vẫn hiển thị danh sách tài liệu của `nguyen`. Đồng thời terminal backend chạy dồn dập hàng chục request liên tiếp.

### Phân tích Root Cause
1. **Thiếu User ID trong Query Key**:
   `queryKey: ["documents", "personal", filters.queryParams]`.
   Khi không có bộ lọc, cả `nguyen` và `sv_an` đều sinh ra key giống hệt nhau: `["documents", "personal", {}]`.
2. **Singleton QueryClient không được reset khi Logout**:
   `QueryClient` được khởi tạo ở phạm vi module `App.tsx:46` (tồn tại suốt vòng đời ứng dụng trong bộ nhớ RAM). Hàm `handleLogout` trong `Header.tsx` chỉ xóa `localStorage` của authStore mà không gọi `queryClient.clear()`.
3. **TanStack Query refetch toàn bộ các trang cũ**:
   Khi `sv_an` mở trang, TanStack Query thấy key `["documents", "personal", {}]` đã có sẵn 50 trang của `nguyen` trong cache. Khi kích hoạt background refetch, TanStack Query tự động gửi tuần tự 50 request lên máy chủ để làm mới cả 50 trang đó với token của `sv_an`, gây nên hiện tượng máy chủ bị quá tải request.

### Giải pháp triệt để
1. Đưa `user?.id` vào `queryKey`:
   ```typescript
   queryKey: ["documents", "personal", user?.id, filters.queryParams]
   ```
   Khi đổi sang `sv_an`, `user.id` thay đổi từ 11 sang 6, TanStack Query lập tức cô lập vùng cache, không thể đọc dữ liệu của `nguyen`.
2. Bổ sung `queryClient.clear()` vào cả hai điểm chốt:
   - Trong `handleLogout` của `Header.tsx`.
   - Trong `handleSubmit` của `LoginPage.tsx` ngay sau khi đăng nhập thành công.
3. Bỏ cờ `placeholderData: keepPreviousData` trong `useInfiniteQuery`.

---

## 5. Sự cố 5: Vòng lặp Tải Vô Tận Backend do InfiniteScrollSentinel

### Hiện tượng
Khi mở danh sách tài liệu ở màn hình có độ phân giải lớn hoặc khi danh sách có ít tài liệu, terminal backend ghi nhận các request `GET /documents/?page=2`, `page=3`,... liên tục không dừng lại cho đến trang cuối cùng.

### Phân tích Root Cause
- Trong `InfiniteScrollSentinel.tsx`, `rootMargin` ban đầu được đặt là `400px`.
- Khi 20 card tài liệu đầu tiên được hiển thị, tổng chiều cao danh sách chưa vượt quá chiều cao màn hình cộng thêm 400px margin.
- Do đó phần tử `sentinel` nằm ngay trong vùng quan sát `isIntersecting = true`.
- Khi `fetchNextPage()` được gọi, `isFetchingNextPage` đổi trạng thái làm `useEffect` chạy lại, tạo mới một `IntersectionObserver`. Observer mới lại thấy phần tử đang giao nhau và tiếp tục gọi `fetchNextPage()`, tạo thành một vòng lặp nạp dữ liệu liên tục không kiểm soát.

### Giải pháp triệt để
1. Giảm `rootMargin` xuống `200px` (ngưỡng an toàn chỉ kích hoạt khi người dùng thực sự cuộn gần đáy).
2. Thêm cờ closure `let triggered = false;` bên trong `useEffect`:
   ```typescript
   let triggered = false;
   const observer = new IntersectionObserver((entries) => {
     const first = entries[0];
     if (first?.isIntersecting && !triggered) {
       triggered = true;
       fetchNextPage();
     }
   }, { rootMargin });
   ```
   Đảm bảo trong mỗi vòng đời của observer chỉ có duy nhất một request nạp trang kế tiếp được phép kích hoạt.
