src/
├── assets/                      # ảnh, icon tĩnh
├── components/
│   ├── ui/                      # component nguyên tử: Button, Badge, Modal, Input...
│   └── shared/                  # component nghiệp vụ dùng lại nhiều trang
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       ├── DocumentCard.tsx      # card file (PDF/DOCX/PPTX...)
│       ├── FolderCard.tsx        # card thư mục
│       ├── PermissionBadge.tsx   # badge View / Full
│       ├── EmptyState.tsx        # trạng thái rỗng
│       └── NotificationDropdown.tsx
├── layouts/
│   ├── MainLayout.tsx            # Sidebar + Header + Outlet
│   └── AuthLayout.tsx            # layout trang đăng nhập
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── personal/                 # Màn 1, 2, 3 (Dashboard, Tài liệu, Chi tiết)
│   │   ├── PersonalDashboard.tsx
│   │   ├── PersonalDocuments.tsx
│   │   └── DocumentDetail.tsx
│   ├── group/                    # Màn 4, 5 (Danh sách nhóm, Không gian nhóm)
│   │   ├── GroupList.tsx
│   │   └── GroupSpace.tsx
│   ├── class/                    # Màn 6 (Không gian lớp)
│   │   └── ClassSpace.tsx
│   ├── faculty/                  # Màn 7 (Không gian khoa)
│   │   └── FacultySpace.tsx
│   ├── school/                   # Màn 8 (Không gian trường)
│   │   └── SchoolSpace.tsx
│   ├── stats/                    # Màn 9 (Thống kê)
│   │   └── StatsPage.tsx
│   ├── settings/                 # Màn 10 (Cài đặt)
│   │   └── SettingsPage.tsx
│   └── trash/                    # Thùng rác (chưa có trong Figma, cần bổ sung)
│       └── TrashPage.tsx
├── hooks/                        # custom hooks
│   ├── useAuth.ts
│   ├── useDocuments.ts
│   └── useWorkspace.ts
├── services/                     # gọi API backend (FastAPI)
│   ├── api.ts                    # axios instance + interceptor
│   ├── authService.ts
│   ├── documentService.ts
│   ├── workspaceService.ts
│   └── notificationService.ts
├── types/                        # TypeScript interfaces khớp schema DB
│   ├── user.ts
│   ├── document.ts
│   ├── workspace.ts
│   └── notification.ts
├── mocks/                        # dữ liệu giả để test giao diện trước khi có API
│   ├── documents.ts
│   └── workspaces.ts
├── stores/                       # state management (Zustand)
│   ├── authStore.ts
│   └── notificationStore.ts
├── utils/                        # hàm tiện ích
│   ├── fileIcon.ts               # map mime type → icon + màu
│   ├── formatSize.ts             # 2400000 → "2.4 MB"
│   └── formatDate.ts
├── constants/
│   └── permissions.ts            # 'view' | 'full', workspace types...
├── App.tsx
├── main.tsx
├── App.css
└── index.css