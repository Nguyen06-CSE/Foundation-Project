---
title: Kiến Trúc Frontend React & Trải Nghiệm Người Dùng
sidebar_label: 🖥️ Frontend React
sidebar_position: 4
---

# 🖥️ KIẾN TRÚC FRONTEND REACT & TRẢI NGHIỆM NGƯỜI DÙNG

Giao diện người dùng của **Foundation Project** được phát triển dưới dạng ứng dụng đơn trang **Single Page Application (SPA)** hiện đại, xây dựng trên nền tảng **React 18** và công cụ đóng gói siêu tốc **Vite**.

---

## 1. Ngăn Xếp Công Nghệ Giao Diện (Tech Stack)

- **Framework**: React 18 (Hooks, Suspense, Context API).
- **Bundler**: Vite (HMR - Hot Module Replacement dưới 50ms).
- **Styling**: Tailwind CSS (Utility-first CSS framework giúp giao diện nhất quán, hỗ trợ Responsive toàn diện trên Desktop, Tablet và Mobile).
- **Iconography**: Lucide React (Bộ biểu tượng vector hiện đại, kích thước siêu nhẹ).
- **Giao tiếp HTTP**: Axios Client có cấu hình Interceptor tập trung.

---

## 2. Tổ Chức Thư Mục Mã Nguồn Frontend

```
frontend/digital-library/src/
├── api/                # Cấu hình Axios instance và các hàm gọi API theo phân hệ
│   ├── client.ts       # Base Axios instance, gắn Bearer token tự động
│   ├── auth.ts         # Gọi API đăng nhập, đăng ký, lấy profile
│   ├── documents.ts    # Gọi API tài liệu cá nhân, upload
│   └── library.ts      # Gọi API kho học liệu, duyệt bài, rating
├── components/         # Các thành phần giao diện tái sử dụng
│   ├── common/         # Button, Modal, Input, Pagination, LoadingSpinner
│   ├── document/       # DocumentCard, DocumentListRow, ViewModeToggle
│   └── preview/        # PDFViewer, OfficeViewer, MarkdownRenderer
├── context/            # React Context quản lý trạng thái toàn cục
│   └── AuthContext.tsx # Lưu trữ phiên đăng nhập, vai trò người dùng
├── pages/              # Các trang giao diện chính theo nghiệp vụ
│   ├── personal/       # Dashboard cá nhân, Quản lý tài liệu, Thùng rác
│   ├── workspace/      # Danh sách nhóm, Chi tiết nhóm, Quản lý thành viên
│   ├── library/        # Kho học liệu số, Chi tiết môn học, Nộp duyệt tài liệu
│   └── search/         # Trang tìm kiếm toàn văn và bộ lọc nâng cao
└── hooks/              # Custom Hooks hỗ trợ logic giao diện
    ├── useViewMode.ts  # Lưu trạng thái Grid/List/Detail vào LocalStorage
    └── useDebounce.ts  # Trì hoãn input khi người dùng gõ từ khóa tìm kiếm
```

---

## 3. Cơ Chế Lưu Trữ Trạng Thái Chế Độ Xem (View Mode Persistence)

Nhằm mang lại trải nghiệm tiện nghi nhất cho người dùng, hệ thống hỗ trợ 3 chế độ xem tài liệu:
1. **Lưới (Grid View)**: Trực quan với ảnh bìa/thumbnail lớn.
2. **Danh sách (List View)**: Tối ưu cho việc xem lướt nhiều tài liệu cùng lúc.
3. **Chi tiết (Detail View)**: Hiển thị đầy đủ siêu dữ liệu (kích thước, ngày tạo, thẻ, lượt xem).

Trạng thái chế độ xem được lưu trữ vào `localStorage` của trình duyệt thông qua Hook tùy biến:

```typescript
// Trích xuất từ hooks/useViewMode.ts
export type ViewMode = 'grid' | 'list' | 'detail';

export function useViewMode(defaultMode: ViewMode = 'grid') {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('preferred_view_mode') as ViewMode) || defaultMode;
  });

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('preferred_view_mode', mode);
  };

  return { viewMode, setViewMode: changeViewMode };
}
```
