# Frontend Architecture & Components: System Enhancements (2026)

Tài liệu chi tiết về kiến trúc giao diện người dùng, cây phân cấp Component, các Custom Hooks, State Management (TanStack Query + Zustand) và các thư viện giao diện trên React 19 + TypeScript.

---

## 1. Cây Phân Cấp Components (Component Hierarchy)

```text
src/
├── layouts/
│   └── MainLayout.tsx                  # Layout khung, tích hợp Header & Sidebar
├── components/
│   ├── shared/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx             # Menu điều hướng, hiển thị nhánh Quản trị & Quản lý nhãn
│   │   │   └── Header.tsx              # Thanh header trên, chuông thông báo real unread count
│   │   ├── documents/
│   │   │   ├── DocumentCard/           # Card hiển thị dạng Grid (bọc checkbox overlay chọn nhiều)
│   │   │   ├── DocumentListView.tsx    # Chế độ xem bảng (checkbox từng dòng)
│   │   │   ├── DocumentDetailView.tsx  # Chế độ xem chi tiết (checkbox bên trái thẻ)
│   │   │   └── DocumentBulkActionBar.tsx # Thanh công cụ nổi đáy màn hình khi có tài liệu được chọn
│   │   └── modals/
│   │       └── ContributeModal.tsx     # Modal nộp tài liệu vào kho học liệu (đơn lẻ hoặc hàng loạt)
├── pages/
│   ├── personal/
│   │   ├── PersonalDashboard.tsx       # Trang tổng quan cá nhân
│   │   ├── dashboard/components/
│   │   │   ├── DashboardUpdates.tsx    # Tab Thông báo & Việc cần làm (chuyển đổi màu thời gian thực)
│   │   │   └── TodoFormModal.tsx       # Modal tạo/sửa việc cần làm với bộ chọn tài liệu/nhóm
│   │   ├── components/
│   │   │   └── PersonalDocumentsSection.tsx # Khu vực danh sách tài liệu cá nhân + Bulk actions
│   │   └── TagsManagementPage.tsx      # Trang quản lý nhãn độc lập (/personal/tags)
│   ├── group/
│   │   └── components/
│   │       ├── cards/LocalGroupDocumentCard.tsx # Card tài liệu nhóm (checkbox overlay)
│   │       └── sections/GroupDocumentsSection.tsx # Khu vực danh sách tài liệu nhóm + Bulk actions
│   └── library/admin/
│       ├── LibraryAdmin.tsx            # Bảng điều khiển quản trị kho học liệu
│       └── LibraryAdminSubmissions.tsx # Danh sách bài nộp chờ duyệt (hỗ trợ deep-link highlight)
```

---

## 2. Chi Tiết Các Màn Hình & Thành Phần Trọng Tâm

### 2.1. Phân khu Quản Trị & Menu trên `Sidebar.tsx`
- **Nhận diện quyền Quản trị viên**:
  Sử dụng helper `isAdminRole(user?.role)` (kiểm tra mọi role kết thúc bằng `_admin` hoặc role legacy `sysadmin`, `schooladmin`).
- **Phân khu Quản trị**:
  Khi người dùng là Admin, Sidebar tự động render thêm khối **Quản trị**:
  - Mục **Quản lý kho học liệu** dẫn tới `/library/admin`.
  - Hiển thị badge số lượng bài nộp `pending` màu đỏ, tự động đồng bộ qua hook:
    ```typescript
    const { data: pendingSubmissions } = useQuery({
      queryKey: ["library-admin-pending-count"],
      queryFn: () => libraryService.getAdminSubmissions({ status: "pending", page_size: 1 }),
      enabled: isAdmin,
      refetchInterval: 60_000,
    });
    ```
- **Khắc phục lỗi Active chéo của NavLink**:
  Thêm thuộc tính `end` cho `NavLink` tới `/library` để khi người dùng đang ở `/library/admin`, tab "Kho học liệu" không bị sáng trùng với tab quản trị.
- **Thêm mục Quản lý nhãn**:
  Thêm đường dẫn `/personal/tags` với icon `Tag` nằm trong nhóm không gian cá nhân.

### 2.2. Tab "Việc cần làm" & Modal `TodoFormModal.tsx`
- **Giao diện danh sách việc cần làm (`DashboardUpdates.tsx`)**:
  - Hỗ trợ các tab bộ lọc: *Tất cả*, *Đang chờ*, *Hoàn thành*, *Quá hạn*.
  - Nút **+ Thêm việc cần làm** mở modal `TodoFormModal`.
  - **Tự động đổi màu thẻ theo độ khẩn cấp (Live 60-Second Tick)**:
    Sử dụng state `const [, setTick] = useState(Date.now())` với `setInterval(..., 60000)` để tính toán lại trạng thái hạn mỗi phút mà không cần tải lại trang.
- **Phân loại công việc trực quan (`task_type`)**:
  - `read_doc`: Tích hợp bộ chọn tài liệu cá nhân. Khi nhấn "Bắt đầu làm", ứng dụng chuyển ngay đến `/personal/documents/{doc_id}`.
  - `upload_group_doc`: Tích hợp bộ chọn nhóm học tập. Khi nhấn "Bắt đầu làm", chuyển đến `/groups/{group_id}`.
  - `view_group_doc`: Cho phép chọn nhóm và tài liệu trong nhóm để xem.
  - `custom`: Cho phép nhập đường link tùy ý.
- **Thiết lập khung giờ linh hoạt**:
  Gồm 2 trường `datetime-local`: Thời gian bắt đầu (`start_at`) và Thời gian kết thúc (`due_at`).

### 2.3. Thanh Thao Tác Hàng Loạt Nổi: `DocumentBulkActionBar.tsx`
- **Vị trí**: Cố định ở đáy màn hình (`fixed bottom-6 left-1/2 -translate-x-1/2 z-40`), xuất hiện mượt mà bằng hiệu ứng animation khi `selectedCount > 0`.
- **Thành phần điều khiển**:
  - Badge đếm số lượng tài liệu đang được chọn.
  - Nút **Chọn tất cả / Bỏ chọn tất cả**.
  - Nút **Tải xuống (.zip)**: Gọi API stream ZIP và tự động tạo link tải về máy.
  - Nút **Đóng góp**: Mở `ContributeModal` với danh sách tài liệu đã chọn.
  - Nút **Xóa**: Hiển thị hộp thoại xác nhận và gọi API xóa hàng loạt.
  - Nút **Đóng (X)**: Hủy toàn bộ lựa chọn hiện tại.

### 2.4. Mở rộng `ContributeModal.tsx` (Đơn lẻ & Hàng loạt)
- Tái sử dụng nguyên vẹn modal đóng góp quen thuộc, bổ sung thêm prop:
  ```typescript
  export interface ContributeModalProps {
    documentId?: number;
    documentTitle?: string;
    documents?: { id: number; title: string }[];
    onClose: () => void;
    onSuccess?: () => void;
  }
  ```
- Khi `documents && documents.length > 1`:
  - Tiêu đề modal hiển thị: `"Đóng góp N tài liệu đã chọn"`.
  - Bấm gửi sẽ gọi API `libraryService.submitBulk` thay vì submit đơn lẻ.
  - Tự động lọc thông báo lỗi chi tiết từ server nếu có tài liệu bị từ chối do trùng lặp.

### 2.5. Trang Quản Lý Nhãn: `TagsManagementPage.tsx`
- **Đường dẫn**: `/personal/tags`.
- **Thẻ thống kê (Metric Cards)**: Tổng số nhãn, Số nhãn đang dùng, Số nhãn chưa dùng.
- **Tạo nhãn mới**: Ô nhập tên nhãn + bảng màu chọn nhanh (9 màu preset kèm mã hex tùy chọn).
- **Inline Edit**: Cho phép bấm vào biểu tượng bút chì để sửa tên và đổi màu trực tiếp trên thẻ nhãn.
- **Gộp nhãn (Merge Tags Modal)**: Người dùng có thể tích chọn nhiều nhãn nguồn, chọn một nhãn đích và bấm gộp. Sau khi gộp, toàn bộ tài liệu/thư mục được tự động chuyển sang nhãn đích.
- **Lọc nhanh tài liệu**: Nhấn vào số lượng tài liệu trên thẻ nhãn sẽ điều hướng sang `/personal/documents?tag={tag.id}` và tự động kích hoạt bộ lọc theo nhãn đó.

---

## 3. Custom Hooks & Logic Xử Lý Thời Gian Thực

### 3.1. Hook Điều Hướng & Làm Nổi Bật: `useHighlightElement.ts`
Hỗ trợ đọc các query parameter từ URL để cuộn mượt (smooth scroll) và áp dụng hiệu ứng viền phát sáng:
```typescript
useHighlightElement("highlight_submission"); // Tự động tìm thẻ có id="submission-{id}"
useHighlightElement("highlight_todo");       // Tự động tìm thẻ có id="todo-{id}"
useHighlightElement("highlight_doc");        // Tự động tìm thẻ có id="doc-{id}"
```
- Cơ chế: Đợi DOM mount (thử lại tối đa 10 lần mỗi 200ms), gọi `scrollIntoView({ behavior: 'smooth', block: 'center' })` và thêm class nhấp nháy `ring-4 ring-primary-500 animate-pulse` trong 3 giây.

### 3.2. Thuật toán Phân loại Hạn To-Do: `src/utils/todoStatus.ts`
Hàm `getTodoStatus(todo)` nhận vào đối tượng công việc và trả về màu sắc cùng nhãn trạng thái:
```typescript
export function getTodoStatus(todo: UserTodoItem): TodoStatusInfo {
  if (todo.is_completed) {
    return {
      state: "done",
      label: "Đã xong",
      badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
      cardClass: "bg-gray-50/70 border-gray-200 text-gray-500 opacity-80",
    };
  }

  if (!todo.due_at) {
    return {
      state: "upcoming",
      label: "Không có hạn",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      cardClass: "bg-white border-gray-200",
    };
  }

  const now = Date.now();
  const due = new Date(todo.due_at).getTime();
  const diffMinutes = Math.floor((due - now) / (1000 * 60));

  if (diffMinutes < 0) {
    return {
      state: "overdue",
      label: "Quá hạn",
      badgeClass: "bg-red-100 text-red-700 border-red-200 font-bold",
      cardClass: "bg-red-50/90 border-red-300 text-red-950",
    };
  }

  if (diffMinutes <= 60) {
    return {
      state: "due_soon",
      label: `Sắp đến hạn (${diffMinutes}p)`,
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300 font-semibold animate-pulse",
      cardClass: "bg-orange-50/90 border-orange-300 shadow-xs",
    };
  }

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (due <= todayEnd.getTime()) {
    return {
      state: "today",
      label: "Hôm nay",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      cardClass: "bg-amber-50/60 border-amber-200",
    };
  }

  return {
    state: "upcoming",
    label: "Sắp tới",
    badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
    cardClass: "bg-white border-gray-200",
  };
}
```

---

## 4. Quản Lý Cache React Query (Cache Invalidation Matrix)

Khi người dùng thực hiện các thao tác, hệ thống tự động làm mới các query liên quan để đảm bảo dữ liệu đồng bộ tức thì trên toàn ứng dụng:

| Hành động của người dùng | Query Keys bị vô hiệu hóa (`invalidateQueries`) |
|:---|:---|
| **Tạo / Sửa / Xóa To-do** | `["todos"]`, `["dashboard", "summary"]` |
| **Xóa hàng loạt tài liệu cá nhân** | `["documents"]`, `["folders"]`, `["trash"]`, `["dashboard", "summary"]` |
| **Xóa hàng loạt tài liệu nhóm** | `["group-documents", groupId]`, `["group-folders", groupId]` |
| **Đóng góp hàng loạt vào kho học liệu** | `["documents"]`, `["group-documents"]`, `["library-admin-pending-count"]` |
| **Tạo / Sửa / Gộp / Xóa Nhãn** | `["tags"]`, `["tag-stats"]`, `["documents"]`, `["folders"]` |
| **Đánh dấu đọc thông báo** | `["notifications"]`, `["notifications-unread-count"]` |
