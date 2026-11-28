# Phase 6 — Đối chiếu 6A và khắc phục

Ngày: 28/11/2026. Trạng thái: đang nghiệm thu, chưa hoàn tất Phase 6.

## Kết quả đối chiếu

- Xác nhận truy vấn tag dùng tham số nullable không ép kiểu. Đã ép `:ws` sang integer và bổ sung mapping `workspace_tags` chuẩn để nhận tag nhóm, giữ tương thích legacy.
- Xác nhận Alembic ép SSL cho mọi kết nối. File thực tế là `alembic/env.py`, không phải `backend/alembic/env.py` như báo cáo 6A. Đã bỏ ép SSL, dùng cấu hình URL giống runtime backend. Chưa chạy lại migration trên database disposable.
- 24 test gợi ý tag/document insights đạt sau sửa. Test mock chưa chứng minh SQL mới trên PostgreSQL thật; cần chạy lại ma trận integration.

## Giới hạn của bằng chứng 6A

- `git diff --check` đạt chỉ chứng minh không có lỗi whitespace, không chứng minh working tree sạch.
- Benchmark dùng `--offline` và vector cache. Script xác nhận latency chỉ đo retrieval, không bao gồm embedding API. Hit@5 evaluation hybrid 21/24 bằng keyword 21/24; chưa chứng minh hybrid cải thiện trên tập cuối này.
- Browser bị blocked, do đó chưa nghiệm thu luồng upload, giao diện tóm tắt một đoạn, gắn tag và dashboard bằng thao tác thực tế.
- Ba ca hỏi đáp và ma trận quyền hữu hạn không chứng minh không thể có câu trả lời sai hoặc rò rỉ trong mọi trường hợp.
- Full suite còn hai failed và một error do môi trường theo báo cáo; cần chạy lại với database test được cấu hình đúng.

## Việc còn lại

Chạy lại SQL tag cá nhân/nhóm và migration trên PostgreSQL disposable; kiểm tra browser; kiểm tra gián đoạn worker/provider, thay phiên bản, xóa/khôi phục, thu hồi quyền và backfill; đo end-to-end latency, API usage, dung lượng và chi phí. Sau đó mới chốt báo cáo nghiệm thu và tài liệu 6B.
