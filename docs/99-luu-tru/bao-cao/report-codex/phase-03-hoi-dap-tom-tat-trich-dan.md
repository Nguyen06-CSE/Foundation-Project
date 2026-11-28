# Báo cáo Codex — Phase 3: Hỏi đáp và tóm tắt có trích dẫn

Trạng thái: **đang nghiệm thu UI OpenCode**. Cập nhật sau khi nhận kết quả UI và chạy build/hồi quy cuối. Ngày mở báo cáo: 27/11/2026.

## Phạm vi và thay đổi backend đã thực hiện

- `POST /documents/{id}/questions`: truy xuất đoạn trong đúng tài liệu đang hoạt động, thử xếp theo cosine và FTS; khi provider embedding lỗi vẫn dùng từ khóa. Chọn câu nguyên văn theo độ phủ từ câu hỏi và điều kiện dạng câu hỏi. Với câu hỏi hướng của giá trị lớn nhất, đoạn chỉ liệt kê nhánh trái/phải, phủ định hoặc thiếu khẳng định đều trả `insufficient`. Khi đại từ cần câu trước, trích cả hai câu để giữ điều kiện “trong cây tìm kiếm nhị phân”. Không gọi model sinh văn bản.
- `GET /documents/{id}/summary`: chọn một câu đại diện theo từng mục/đơn vị, giữ thứ tự, bỏ ý trùng, lưu theo run đang hoạt động. Mỗi ý giữ định danh chunk và metadata nguồn. Coverage đi kèm để biểu thị tài liệu chỉ đọc được một phần.
- `GET /documents/{id}/chunks/{chunk_id}`: dùng cùng điều kiện quyền cá nhân/nhóm, checksum và run active. Trả 404 nếu tài liệu không còn quyền hoặc chunk không thuộc phiên bản còn hiệu lực.
- Citation trả URL tới trang chi tiết tài liệu với `tab=content&chunk=...`, cho cả tài liệu cá nhân và nhóm. Trường hợp thiếu căn cứ trả danh sách citation rỗng để không gắn nhãn “nguồn trích dẫn” cho đoạn chỉ gần chủ đề.

## Hiệu quả đã đo

`backend/tests/test_document_insights.py` có 9 ca hỏi đáp trên chính văn bản corpus Phase 0: 6/6 câu có căn cứ trả đúng nguyên câu đã duyệt, 3/3 câu thiếu căn cứ từ chối. Các ca riêng xác nhận phân biệt cây nhị phân/cây tìm kiếm nhị phân, phủ định, câu nối đại từ, số/năm, tóm tắt bỏ ý trùng và giữ 5/40 trang. Một lượt chạy PostgreSQL tạm với tài liệu tổng hợp xác nhận SQL hỏi đáp, cache tóm tắt, mở chunk, từ chối chunk cũ và từ chối thành viên đã rời nhóm. Backend hồi quy hiện tại: **124 passed, 3 skipped**; lệnh chạy chưa bao gồm `test_batch2_integrity_constraints.py` và `test_library_download_action_filter.py`. `git diff --check` sạch.

## Công việc đang chờ và tự đánh giá tạm

OpenCode đang hoàn thiện phần UI hỏi đáp, tóm tắt, dẫn nguồn và thông báo liên kết cũ. Sau khi nhận kết quả sẽ kiểm tra diff, chạy build/hồi quy, cập nhật số đo và kết luận nghiệm thu. Hiện mức tin cậy **cao trên fixture tổng hợp, chưa đủ để đánh giá chất lượng trên toàn kho** vì tài liệu thật chưa được backfill embedding. Bộ lọc câu trích xuất dùng quy tắc từ vựng nên có thể bỏ sót câu diễn đạt rất khác hoặc chấp nhận một câu sai nhưng chứa đủ từ khóa; cần đánh giá chéo bằng câu hỏi do người dùng thật viết và kiểm tra nguồn trực tiếp trên file.
