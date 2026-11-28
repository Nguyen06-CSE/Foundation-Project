# Báo cáo Codex — Phase 5: Thống kê chủ đề quan tâm

Ngày: 27/11/2026  
Trạng thái: Đã sửa lỗi sau review độc lập và đối chiếu trên PostgreSQL fixture; chờ thao tác trình duyệt để nghiệm thu giao diện.

## Yêu cầu

Thống kê tài liệu cá nhân, lượt đọc, số tài liệu đã đọc, số tài liệu mở từ tìm kiếm theo 7 hoặc 30 ngày. Phân nhóm theo môn, khoa và tag đã gắn, có nhóm Chưa phân loại. Mỗi người chỉ xem hoạt động của mình. Một lượt mở từ tìm kiếm phải nằm trong tổng lượt đọc, không ghi thành hai lượt riêng.

## Giải pháp và quá trình thực hiện

1. Mở rộng `GET /stats/me` với tham số `days=7|30` và trường `interests` khi `scope=me`. Giữ response cũ cho các consumer khác.
2. Dùng `download_logs` đã có để đếm lượt đọc của chính user. Truy vấn tài liệu đang hiện hữu và chỉ lấy tài liệu nhóm còn quyền thành viên; join môn/khoa và tag đã gắn. Một tài liệu gắn nhiều tag xuất hiện ở mỗi chủ đề tag, nhưng tổng toàn cục đếm một lần.
3. Gắn `from_search=1` vào URL tài liệu khi mở kết quả tìm kiếm. API detail hiện có ghi một sự kiện `DOCUMENT_VIEWED` với `extra_data.source=search`. Không tạo sự kiện thứ hai. Bỏ cửa sổ khử trùng lặp 30 phút ở hai API detail để số lượt mở lặp được ghi đúng.
4. Trang Thống kê & Hoạt động hiển thị bộ chọn 7/30 ngày, tổng số và các nhóm khoa/môn/tag, có trạng thái chưa có lượt đọc.
5. Thêm test dữ liệu cố định cho một tài liệu đọc lặp, tài liệu chưa đọc và tài liệu nhóm.

## Kết quả kiểm tra

- `npm run build` trong `frontend/digital-library`: đạt.
- Bộ test backend liên quan đã có: 32 passed.
- Test Phase 5 mới: 1 passed.
- `git diff --check` cho các file Phase 5: đạt.

## Kết quả review chéo và sửa lỗi

Review độc lập phát hiện query `days=7|30` trả 422, tag workspace chuẩn bị bỏ sót, tag cùng tên bị trộn và tài liệu public của chính chủ bị loại. Các lỗi này đã được sửa và xác minh lại trên PostgreSQL fixture. API 7/30 trả 200, tag được tách theo kho, workspace tag xuất hiện và dữ liệu public của chủ sở hữu được tính. Response đã có schema Pydantic rõ ràng; UI có trạng thái lỗi và quick-search được ghi nguồn tìm kiếm.

## Tự đánh giá và giới hạn

Đã đối chiếu trên PostgreSQL fixture với nhiều user và quyền nhóm; chưa thao tác bằng trình duyệt trên stack đang chạy. Việc tải lại trang chi tiết tạo thêm lượt đọc vì API detail là điểm ghi log; số “Tài liệu đã mở từ tìm kiếm” vẫn đếm theo tài liệu khác nhau. Truy vấn tag đã dùng CTE lượt đọc thay cho join log cho từng tag, nhưng cần đo lại trên dữ liệu thật trong Phase 6.
