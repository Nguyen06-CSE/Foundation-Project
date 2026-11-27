---
title: Thùng rác và vòng đời tài liệu khi giải tán nhóm
sidebar_position: 11
---

# Thùng rác và giải tán nhóm

## Xóa tài liệu trong kho cá nhân hoặc kho nhóm

Khi chủ tài liệu cá nhân hoặc thành viên có quyền quản lý tài liệu nhóm chọn **Xóa**, hệ thống đặt `is_deleted = true` và ghi `deleted_at`. Với gói tài liệu, các mục con đang hoạt động cũng được đánh dấu. Bản ghi bị ẩn khỏi kho đang hoạt động và kết quả tìm kiếm. Tệp gốc, ảnh bìa và Markdown vẫn còn trên Storage.

Khi khôi phục, hệ thống bỏ cờ xóa và xóa mốc thời gian trên bản ghi được khôi phục. Tác vụ dọn thùng rác hằng ngày chọn các bản ghi đã xóa **quá 30 ngày** ở cả hai loại kho. Vì tác vụ chạy theo lịch, thời điểm dọn là lượt quét sau khi hết hạn. Kho cá nhân còn hỗ trợ xóa vĩnh viễn thủ công từ thùng rác.

Với từng đường dẫn gốc, thumbnail và Markdown, hệ thống đếm các bản ghi khác còn trỏ tới đường dẫn đó, kể cả bản trong thùng rác. Nếu còn tham chiếu, hệ thống giữ tệp. Nếu hết tham chiếu ngoài tập bản ghi sắp xóa, hệ thống xóa tệp rồi commit việc xóa bản ghi. [Luồng xóa vĩnh viễn](../requirements/use-cases/UC05_TRASH_LIFECYCLE_AND_PURGE.md)

## Khi chủ nhóm yêu cầu giải tán

1. API đánh dấu nhóm đang giải tán, đặt hạn sau **24 giờ** và tạo thông báo cho thành viên. Scheduler kiểm tra các nhóm đến hạn mỗi 5 phút.
2. Đến lượt xử lý, hệ thống xét từng tài liệu **còn hoạt động** trong nhóm. Nó tìm các bản cá nhân có `source_document_id` trỏ đến tài liệu nhóm và `workspace_id IS NULL`.
3. Sau khi xử lý tài liệu theo bảng dưới, hệ thống xóa quan hệ thành viên và lời mời, đánh dấu nhóm đã xóa rồi commit.

| Tình trạng khi giải tán | Điều xảy ra với tài liệu |
|---|---|
| Có bản cá nhân liên kết | Các bản cá nhân đó cũng bị đánh dấu xóa, nhận thời điểm xóa mới, nguồn `group_dissolved` và tên nhóm. Bản nhóm bị xóa mềm. Các bản còn trong thùng rác chịu lịch dọn 30 ngày. |
| Không có bản cá nhân liên kết | Hệ thống thử sao chép tệp vào `storage/orphaned/{workspace_id}`, đánh dấu bản nhóm là `is_orphaned` và xóa mềm. Tác vụ riêng dọn bản mồ côi quá **10 ngày** kể từ `orphaned_at`. |
| Tài liệu nhóm đã nằm trong thùng rác | Luồng giải tán chỉ duyệt bản đang hoạt động. Bản đã xóa tiếp tục theo thời điểm xóa trước đó. |

Ví dụ, nếu Lan đã lưu bản cá nhân từ tài liệu nhóm A, khi giải tán hoàn tất bản của Lan chuyển vào thùng rác cá nhân. Với tài liệu nhóm B chưa có bản cá nhân liên kết, mốc áp dụng cho bản mồ côi là 10 ngày. [Yêu cầu giải tán](../../backend/app/routers/groups.py) · [Xử lý giải tán và các lịch dọn](../../backend/app/jobs/scheduler.py)
