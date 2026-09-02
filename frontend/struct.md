frontend/
└── digital-library/
    ├── dist/                    # Sản phẩm sau khi build dự án
    ├── node_modules/            # Thư mục chứa các thư viện dependencies
    ├── public/                  # Chứa file tĩnh không qua Webpack/Vite (favicon, index.html...)
    └── src/
        ├── assets/              # Ảnh, icon tĩnh dùng trong ứng dụng
        ├── components/
        │   ├── shared/          # Component nghiệp vụ tái sử dụng nhiều nơi
        │   │   ├── DocumentCard.tsx          # Card hiển thị thông tin tài liệu dạng lưới
        │   │   ├── DocumentContextMenu.tsx   # Menu ngữ cảnh khi click chuột phải/menu tài liệu
        │   │   ├── DocumentRow.tsx           # Dòng hiển thị thông tin tài liệu dạng danh sách
        │   │   ├── EmptyState.tsx            # Giao diện hiển thị khi không có dữ liệu
        │   │   ├── FileIcon.tsx              # Component hiển thị icon phân loại theo định dạng file
        │   │   ├── FolderCard.tsx            # Card hiển thị thông tin thư mục
        │   │   ├── Header.tsx                # Thanh điều hướng phía trên của hệ thống
        │   │   ├── NotificationDropdown.tsx  # Danh sách thả xuống xem thông báo mới
        │   │   ├── PermissionBadge.tsx       # Badge hiển thị mức quyền (Chỉ xem / Toàn quyền)
        │   │   ├── ProcessingDonut.tsx       # Biểu đồ tròn hiển thị tiến trình xử lý tài liệu
        │   │   ├── ProtectedRoute.tsx        # Component bảo vệ các tuyến đường yêu cầu đăng nhập
        │   │   ├── Sidebar.tsx               # Thanh điều hướng bên cạnh (thanh menu chính)
        │   │   ├── StatCard.tsx              # Card hiển thị các chỉ số thống kê nhanh
        │   │   └── TagDistribution.tsx       # Biểu đồ/thành phần phân bổ nhãn (tag) tài liệu
        │   └── ui/              # Component giao diện nguyên tử cơ bản (Atomic Design)
        │       ├── Avatar.tsx                # Component ảnh đại diện người dùng
        │       ├── Badge.tsx                 # Nhãn hiển thị trạng thái ngắn
        │       ├── Button.tsx                # Nút bấm tùy chỉnh
        │       ├── Card.tsx                  # Khung chứa nội dung chung
        │       ├── Dropdown.tsx              # Danh sách lựa chọn thả xuống cơ bản
        │       ├── Input.tsx                 # Ô nhập liệu văn bản
        │       ├── ProgressBar.tsx           # Thanh hiển thị tiến trình
        │       └── Tag.tsx                   # Thẻ phân loại nội dung
        ├── constants/
        │   └── permissions.ts   # Định nghĩa hằng số quyền hạn, loại không gian làm việc
        ├── hooks/               # Custom React Hooks
        │   ├── useAuth.ts            # Hook quản lý trạng thái đăng nhập & thao tác người dùng
        │   ├── useDocuments.ts       # Hook quản lý các thao tác CRUD với tài liệu
        │   ├── useRestoreSession.ts  # Hook tự động khôi phục phiên đăng nhập khi load trang
        │   └── useWorkspace.ts       # Hook xử lý logic không gian làm việc (Khoa, Lớp, Nhóm)
        ├── layouts/             # Khung bố cục chính của giao diện
        │   ├── AuthLayout.tsx        # Bố cục cho các trang xác thực (Đăng nhập / Đăng ký)
        │   └── MainLayout.tsx        # Bố cục chính chứa Sidebar + Header + Nội dung trang
        ├── mocks/               # Dữ liệu giả lập dùng khi chưa kết nối API backend
        │   ├── documents.ts          # Danh sách tài liệu mẫu
        │   ├── folders.ts            # Danh sách thư mục mẫu
        │   ├── stats.ts              # Dữ liệu chỉ số thống kê mẫu
        │   └── workspaces.ts         # Danh sách không gian làm việc mẫu
        ├── pages/               # Các trang màn hình hiển thị chính
        │   ├── auth/
        │   │   ├── LoginPage.tsx     # Trang đăng nhập
        │   │   └── RegisterPage.tsx  # Trang đăng ký
        │   ├── class/
        │   │   └── ClassSpace.tsx    # Không gian làm việc cấp Lớp
        │   ├── faculty/
        │   │   └── FacultySpace.tsx  # Không gian làm việc cấp Khoa
        │   ├── group/
        │   │   ├── GroupList.tsx     # Danh sách các nhóm học tập/làm việc
        │   │   └── GroupSpace.tsx    # Không gian làm việc nội bộ nhóm
        │   ├── personal/
        │   │   ├── components/
        │   │   │   └── CreateFolderModal.tsx # Modal tạo thư mục cá nhân mới
        │   │   ├── DocumentDetail.tsx        # Trang chi tiết thông tin & xem trước tài liệu
        │   │   ├── FavoritesPage.tsx         # Trang danh sách tài liệu yêu thích
        │   │   ├── PersonalDashboard.tsx     # Bảng điều khiển tổng quan cá nhân
        │   │   ├── PersonalDocuments.tsx     # Quản lý tài liệu cá nhân
        │   │   └── SharedWithMe.tsx          # Danh sách tài liệu được người khác chia sẻ
        │   ├── school/
        │   │   └── SchoolSpace.tsx   # Không gian thư viện chung toàn Trường
        │   ├── settings/
        │   │   └── SettingsPage.tsx  # Trang cài đặt tài khoản & hệ thống
        │   ├── stats/
        │   │   └── StatsPage.tsx     # Trang thống kê lưu trữ & lượt truy cập
        │   └── trash/
        │       └── TrashPage.tsx     # Trang thùng rác chứa file/thư mục đã xóa
        ├── services/            # Tầng gọi API backend
        │   ├── api.ts                # Khởi tạo Axios instance + cài đặt Interceptors
        │   ├── authService.ts        # API đăng nhập, đăng ký, đăng xuất, refresh token
        │   ├── documentService.ts    # API tải lên, tải về, xóa, sửa tài liệu
        │   ├── folderService.ts      # API quản lý thư mục
        │   ├── notificationService.ts# API lấy danh sách và đánh dấu đã đọc thông báo
        │   ├── tagService.ts         # API quản lý các thẻ phân loại
        │   └── workspaceService.ts   # API lấy dữ liệu & thành viên các không gian làm việc
        ├── stores/              # Quản lý state toàn cục (Zustand/Redux)
        │   ├── authStore.ts          # Quản lý trạng thái xác thực người dùng & token
        │   ├── notificationStore.ts  # Quản lý trạng thái danh sách thông báo
        │   └── toastStore.ts         # Quản lý trạng thái hiển thị thông báo nhanh (Toast UI)
        ├── types/               # Khai báo TypeScript Interfaces / Types
        │   ├── document.ts           # Type tài liệu, thư mục, phiên bản file
        │   ├── notification.ts       # Type cấu trúc thông báo
        │   ├── user.ts               # Type người dùng, vai trò, quyền hạn
        │   └── workspace.ts          # Type không gian làm việc (Trường, Khoa, Lớp, Nhóm)
        ├── utils/               # Các hàm tiện ích hỗ trợ
        │   ├── cn.ts                 # Hàm gộp class CSS (clsx + tailwind-merge)
        │   ├── fileIcon.ts           # Map loại file (MIME/Extension) ra icon & màu tương ứng
        │   ├── formatDate.ts         # Hàm định dạng ngày tháng (VD: "31/08/2026" hoặc "2 giờ trước")
        │   └── formatSize.ts         # Hàm chuyển đổi dung lượng file (VD: 2048 KB -> "2 MB")
        ├── App.css              # File CSS tùy chỉnh cấp ứng dụng
        ├── App.tsx              # Component gốc, cấu hình Router và Providers
        ├── index.css            # File CSS chung quy định Tailwind CSS / Global styles
        └── main.tsx             # Entry point chính của dự án React