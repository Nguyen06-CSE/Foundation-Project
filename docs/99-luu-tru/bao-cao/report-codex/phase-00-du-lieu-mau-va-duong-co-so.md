# Báo cáo Codex — Phase 0: Dữ liệu mẫu và đường cơ sở

Ngày tổng hợp lại: 27/11/2026. Báo cáo gốc đầy đủ nằm ở `docs/06-kiem-thu-va-han-che/ai-baseline.md`; manifest, câu hỏi và số đo nằm ở `backend/tests/evaluation/`.

## Việc đã thực hiện

- Lần theo luồng upload cá nhân, nhóm, bundle, tái sử dụng file trùng checksum, đọc Markdown local/R2, full-text search, tag và lượt xem. Đối chiếu điểm vào router với service, dữ liệu ghi và test hiện có. Kết quả chi tiết, kèm đường dẫn mã nguồn và rủi ro, được lưu trong `ai-baseline.md`.
- Tạo corpus tổng hợp 30 tài liệu và 60 truy vấn tiếng Việt, chia calibration/evaluation. Có PDF chữ, scan và hỗn hợp, DOCX, PPTX, tài liệu trùng checksum, tài liệu cùng chủ đề nhưng khác quyền và câu cố ý không có căn cứ. `manifest.json`/`questions.json` xác định đáp án, nguồn và trường hợp cấm.
- Chạy baseline full-text search cũ trên PostgreSQL tạm. Báo cáo có từng câu hỏi, chỉ số truy xuất, quyền và chất lượng trích xuất OCR.

## Hiệu quả và bằng chứng

Trên 48 câu có đáp án, Hit@1 = Hit@5 = MRR@5 = 0,896. Không rò rỉ trong 6/6 câu kiểm tra quyền; 6/6 câu không có căn cứ không trả kết quả. PDF hỗn hợp có token recall 0,518 vì trang scan nằm xen kẽ chưa được OCR đầy đủ. Cặp khái niệm cây nhị phân/cây tìm kiếm nhị phân được xác định là ca dễ nhầm cần kiểm tra ở Phase hỏi đáp.

## Tự đánh giá và điểm cần đánh giá chéo

Đạt mục tiêu làm mốc so sánh và chỉ ra đường upload cần nối vào pipeline. Bằng chứng mạnh cho FTS và corpus tổng hợp; yếu hơn cho R2, upload nhóm/bundle và xử lý đồng thời vì các nhánh đó chưa có test tích hợp thật. Corpus được thiết kế có chủ đích nên kết quả Hit@5 không đại diện cho tài liệu người dùng thật. Khi đánh giá chéo, cần xác nhận đáp án đã duyệt, đặc biệt câu thiếu căn cứ, quyền nhóm và trang PDF hỗn hợp.
