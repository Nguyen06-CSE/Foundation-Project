---
title: Phân Hệ 07 — Nhật Ký Hoạt Động & Thống Kê Điểm Xu Hướng
sidebar_label: 07. Nhật Ký & Thống Kê
sidebar_position: 9
---

# Nhật ký hoạt động và sắp xếp trong kho cá nhân

Trong **Kho cá nhân → Sắp xếp**, chọn **lượt xem** để đưa tài liệu có tổng số lần xem cao nhất lên đầu, hoặc **xu hướng** để ưu tiên tài liệu thu hút nhiều tương tác so với tuổi của nó. Danh sách mặc định dùng xu hướng. Việc sắp xếp áp dụng cho toàn bộ kết quả đã lọc trước khi lấy từng trang.

| Kiểu sắp xếp | Giá trị dùng để so sánh | Khi bằng nhau |
|---|---|---|
| Lượt xem (`views`) | `document_stats.view_count` giảm dần | Tài liệu mới hơn, sau đó ID lớn hơn |
| Xu hướng (`trending`) | `document_stats.trending_score` giảm dần | ID lớn hơn |

Thẻ tài liệu ưu tiên hiển thị số lần **chính người dùng** đã xem (`personal_view_count`). Vì dropdown sắp theo tổng lượt xem của bản ghi, số trên các thẻ có thể không giảm đều theo thứ tự hiển thị.

## Từ sự kiện đến điểm xu hướng

1. Backend ghi sự kiện vào `download_logs` cùng tài liệu, người dùng, hành động và thời điểm. Nếu nơi gọi cấu hình khoảng chống lặp, sự kiện cùng người, tài liệu và hành động trong khoảng đó được bỏ qua.
2. Cùng lúc ghi log, service tăng bộ đếm tương ứng trong `document_stats`. Điểm tăng tức thời theo tương tác, với xem +1, tải +2, lưu +5 và chia sẻ +2.
3. Mỗi giờ, scheduler chọn các tài liệu có hoạt động trong 48 giờ qua rồi tính lại từ lịch sử của từng tài liệu. Cửa sổ 48 giờ dùng để chọn tài liệu cần cập nhật. Các lượt được tính trên toàn bộ lịch sử của tài liệu đó.

Điểm tính lại bằng `(xem + 2 × tải + 5 × lưu + 2 × chia sẻ) × hệ_số_gần_đây / (tuổi_giờ + 2)^1,5`. Hệ số là 1,5 nếu hoạt động cuối trong vòng 24 giờ, còn lại là 1. Ví dụ, hai tài liệu cùng tuổi, cùng có hoạt động hôm nay: tài liệu A có 10 lượt xem, tài liệu B có 6 lượt xem và 1 lượt lưu. A đứng trước khi sắp theo lượt xem, còn B đứng trước khi tính lại xu hướng vì tổng có trọng số là 11 so với 10. [Ghi sự kiện](../../backend/app/services/document_service.py) · [Tính lại thống kê](../../backend/app/jobs/scheduler.py) · [Sắp xếp trong kho](../../backend/app/services/document_query_service.py)
