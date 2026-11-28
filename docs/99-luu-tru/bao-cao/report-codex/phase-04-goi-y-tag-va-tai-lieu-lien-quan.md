# Báo cáo tiến độ Codex — Phase 4: Gợi ý tag và tài liệu liên quan

Ngày: 27/11/2026  
Trạng thái: Đã cải thiện backend và kiểm tra tập trung; chưa nghiệm thu Phase 4 trên dữ liệu thật.

## Yêu cầu và hiện trạng

Phase 4 cần gợi ý tag có sẵn hoặc tag mới có căn cứ trong nội dung, giới hạn tag theo kho hiện tại, loại tag đã gắn, và tìm tài liệu liên quan trong phạm vi người dùng được đọc. UI chọn tag và danh sách tài liệu liên quan đã có trước lượt này.

Trước khi sửa, endpoint gợi ý tag trả cả tag cá nhân khi xem tài liệu nhóm, vẫn đề xuất tag đã gắn và luôn trả danh sách tag mới rỗng. Endpoint tài liệu liên quan xếp kết quả theo ID tài liệu do `DISTINCT ON`, dù đã tính điểm liên quan; citation nguồn luôn lấy chunk đầu tiên thay vì chunk có heading dùng để tìm.

## Giải pháp và quá trình thực hiện

- Giữ hai endpoint `GET /documents/{id}/tag-suggestions` và `GET /documents/{id}/related`.
- Truy vấn tag theo đúng kho của tài liệu. Đánh dấu và bỏ tag đã gắn. Đề xuất tối đa năm heading có căn cứ trong chunk, bỏ heading quá chung và tên trùng tag hiện có. Người dùng vẫn phải xác nhận qua luồng gắn tag hiện hữu.
- Với tài liệu liên quan, chọn heading có ít nhất hai từ, xếp các ứng viên sau khi chọn chunk tốt nhất mỗi tài liệu theo điểm `ts_rank`, và trả đúng citation nguồn dùng để truy vấn.
- Thêm test tập trung kiểm tra loại tag đã gắn, tag mới có nguồn và tham số kho nhóm.

## Kết quả xác minh

- `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_phase4_suggestions.py backend/tests/test_document_insights.py -q`: 24 passed.
- `git diff --check` cho các file backend đã sửa: đạt.
- Chưa chạy benchmark độ đúng của tài liệu liên quan trên kho thật; chưa kiểm tra thao tác gắn tag bằng trình duyệt. Do đó chưa xác nhận tiêu chí nghiệm thu Phase 4.

## Tự đánh giá và giới hạn

Sửa được lỗi phạm vi tag, loại gợi ý đã gắn, và có gợi ý tag mới từ heading. Cách lấy tag mới còn phụ thuộc chất lượng heading của OCR/Markdown; tên heading tổng quát hoặc nhiễu có thể xuất hiện. Tài liệu liên quan vẫn dựa trên một heading và full-text search, nên có thể bỏ sót tài liệu diễn đạt khác nghĩa. Cần đánh giá chéo với dữ liệu mẫu, quyền người chỉ đọc và thao tác UI trước khi chốt Phase 4. Phase 5 chưa bắt đầu trong lượt này.
