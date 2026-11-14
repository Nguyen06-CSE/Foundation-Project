---
title: 1. Personal Dashboard & Kho Cá Nhân
sidebar_label: Tổng quan Dashboard
sidebar_position: 1
---

# 📊 Phân Hệ 1: Personal Dashboard & Kho Tài Liệu Cá Nhân

Chào mừng bạn đến với tài liệu phân hệ **Personal Dashboard** (`/personal`) của hệ thống Thư viện số. Phân hệ cung cấp không gian tổng quan cá nhân hóa cao, giúp người dùng theo dõi tài liệu gần đây, hạn ngạch lưu trữ, lời mời tham gia nhóm và thông báo quan trọng.

---

## 📑 Danh Mục Tài Liệu Phân Hệ

1. 📖 **[Tài Liệu Kỹ Thuật Personal Dashboard](./PERSONAL_DASHBOARD.md)**:
   - Mục tiêu tái thiết kế trang chủ cá nhân `/personal`.
   - Đặc tả chi tiết API `GET /dashboard/summary` (tổng hợp 4 câu truy vấn SQL chỉ trong 1 network round-trip < 15ms).
   - Tối ưu triệt để lỗi N+1 truy vấn tag trong `folder_service.py:get_folders_with_stats`.
   - Thiết kế mô đun component React (mỗi file dưới 200 dòng): `QuickActions`, `AttentionStrip`, `StatCards`, `RecentOpened`, `TrendingList`, `FolderShortcuts`.
   - Chiến lược quản lý cache React Query và vô hiệu hóa cache tập trung `invalidateDashboard`.
2. 🗄️ **[Lược Đồ SQL & Migration (`migration.sql`)](./migration.sql)**:
   - Các script SQL bổ sung cấu hình hạn ngạch lưu trữ `STORAGE_QUOTA_BYTES` và trường thống kê.
