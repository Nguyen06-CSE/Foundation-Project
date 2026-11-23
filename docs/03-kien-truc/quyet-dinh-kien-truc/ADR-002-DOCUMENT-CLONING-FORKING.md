---
title: "ADR-002: Cơ Chế Sao Chép & Tái Sử Dụng Học Liệu (Forking / Cloning)"
sidebar_label: "ADR-002: Nhân bản tài liệu"
sidebar_position: 2
---

# ADR-002: CƠ CHẾ SAO CHÉP & TÁI SỬ DỤNG HỌC LIỆU (FORKING / CLONING)

- **Trạng thái**: Đã chấp thuận (Accepted)
- **Ngày quyết định**: 2026-10-12

---

## 1. Bối Cảnh
Khi sinh viên tìm thấy một tài liệu hữu ích trên Kho học liệu số hoặc trong Kho nhóm, họ có nhu cầu lưu trữ tài liệu đó về Kho cá nhân để tự do ghi chú, chỉnh sửa và quản lý riêng mà không làm thay đổi bản gốc công khai.

## 2. Quyết Định
Hệ thống triển khai cơ chế **Nhân bản tài liệu (Forking / Cloning)**:
- Tạo một bản ghi mới trong bảng `documents` với `owner_id = current_user.id`, `workspace_id = NULL`, và `source_document_id = original_document.id`.
- Tái sử dụng cùng `file_path` và `checksum` của tệp vật lý gốc, không nhân đôi tệp tin trên đĩa cứng.

## 3. Hệ Quả
- **Ưu điểm**: Thao tác diễn ra tức thì (chỉ tốn 1 câu lệnh INSERT SQL); tiết kiệm tối đa dung lượng đĩa cứng.
- **Hạn chế**: Cần xử lý cẩn trọng khi bản gốc bị xóa vĩnh viễn (sử dụng ràng buộc `ON DELETE SET NULL` cho `source_document_id`).
