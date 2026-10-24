# ACTIVITY_TRACKING.md — Tính năng theo dõi hoạt động tài liệu

## 1. Mục tiêu
Ghi nhận mọi tương tác với tài liệu để phục vụ:
- Sắp xếp tài liệu theo xu hướng thực tế (không chỉ mới nhất)
- Tab "Hoạt động" trong DocumentDetail hiển thị dữ liệu thật
- Trang Thống kê cá nhân: lịch sử hoạt động của người dùng
- Admin/owner xem log tài liệu

## 2. Bảng DB mới

### document_activity_logs
Ghi lại từng sự kiện:
  id, document_id, actor_id (nullable — khách không đăng nhập),
  actor_ip (cho public library), event_type (enum),
  context (JSONB — metadata thêm: tên nhóm, tên tag...),
  created_at

### document_stats (materialized / cache table)
Tổng hợp để query nhanh, không tính lại từ đầu mỗi lần:
  document_id (PK), view_count, download_count, save_count,
  share_count, unique_viewers, trending_score,
  last_activity_at, updated_at

## 3. Trending Score Formula
  score = Σ(weighted_events / time_decay)
  Weights: view=1, download=2, save=3, share=2
  Decay: chia cho (age_hours + 2)^1.5
  Recency boost: x1.5 nếu có event trong 24h gần nhất
  Job refresh: mỗi 1 giờ (APScheduler)

## 4. Quyền truy cập log
  - Tài liệu cá nhân: owner xem full log
  - Tài liệu nhóm: workspace owner xem full log
  - Kho học liệu: faculty_admin (khoa mình) + system_admin
  - Thống kê sidebar: mỗi user chỉ xem hành động của mình

## 5. Deduplication
  View event: cùng actor_id + document_id trong 30 phút → skip
  Dùng Redis hoặc DB check (created_at > now - 30min)

## 6. Hot indicators (Kho học liệu)
  🔥 TRENDING: trending_score top 10% trong subject, tuần này
  ⭐ NEW: created_at < 3 ngày
  Hiển thị: "X lượt xem tuần này", "Y người lưu về"

## 7. Màu sắc timeline Thống kê cá nhân
  upload=green, view=blue, download=purple,
  share=orange, contribute=yellow, delete=red-light,
  restore=green-light, note=gray