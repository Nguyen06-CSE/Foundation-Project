# Báo cáo Codex — Phase 1: Hợp nhất nội dung và lập chỉ mục đoạn

Ngày tổng hợp lại: 27/11/2026. Phase 1 tạo nguồn trích dẫn cho các chức năng tìm kiếm, hỏi đáp và tóm tắt.

## Việc đã thực hiện

| Hạng mục | Kết quả và vị trí |
|---|---|
| Dữ liệu | Migration `ea41b38547bc_document_index.py` thêm `document_index_runs` và `document_chunks`; mỗi run gắn tài liệu, checksum, processor/model, trạng thái, coverage và summary. Unique partial index chỉ cho phép một run đang hoạt động cho mỗi tài liệu. Trigger xếp hàng khi tài liệu đổi checksum/nội dung/Markdown/đường dẫn tệp; backfill các tài liệu cũ thành pending run. |
| Trích xuất | `backend/app/services/chunking.py` lấy cấu trúc mục từ Markdown, thêm phần từ `documents.content` và trang PDF/slide PPTX, loại dòng lặp, giữ nguyên văn bản gốc, thứ tự, nguồn và vị trí. PDF hỗn hợp thử OCR các trang rỗng trong 5 trang đầu. |
| Worker | `backend/app/services/index_worker.py` nhận việc với `FOR UPDATE SKIP LOCKED`, retry có giãn cách, ghi chunk và công bố run sau khi hoàn tất. Run cũ bị vô hiệu khi nội dung thay đổi. Có thể tiếp tục backfill sau khi dừng. |
| API/UI | `GET /documents/{id}/index-status` trả trạng thái và coverage; màn hình chi tiết hiện đang xử lý, sẵn sàng, đọc một phần, chưa có nội dung hoặc có thể thử lại. |
| Kiểm thử | `backend/tests/test_document_indexing.py` bao phủ trùng Markdown/content, tiếng Việt, bảng, thiếu trang, PDF mixed, fallback chỉ có content, lô worker và thay model. |

## Đánh giá hiệu quả

Với fixture đã định nghĩa, chunk giữ được câu gốc và metadata cần để mở lại đoạn. Ca PDF mixed 3 trang có chữ ở trang 1 và 3 được báo `partial`, `read=2/total=3`; trường hợp chỉ có `documents.content` vẫn lập chỉ mục được. Migration Phase 1 đã áp dụng cùng Phase 2 trên PostgreSQL cấu hình; lúc đó có 1.058 pending runs và 1.043 tài liệu active không phải bundle. Hai số này khác tập đếm: backfill tạo run cho cả tài liệu xóa mềm, trong khi số tài liệu chỉ đếm active.

## Tự đánh giá và điểm cần đánh giá chéo

Đạt nền tảng dữ liệu và xử lý tiếp tục được. Mức tin cậy cao cho fixture và ràng buộc một run active; trung bình cho R2, PDF dài và việc xử lý đồng thời trên toàn kho vì chưa chạy backfill thật. OCR PDF chỉ thử trang rỗng trong 5 trang đầu, nên coverage có thể thấp hơn toàn bộ tệp. Worker hiện giữ toàn bộ một tài liệu trong một transaction: nếu chết giữa các batch embedding, DB rollback và batch API đã gửi có thể phải gọi lại. Đây là giới hạn resumability cần sửa trước khi chạy backfill lớn. Cần đánh giá chéo khả năng truy xuất trang/slide đúng trên file thật, thay file khi worker chạy và chi phí bộ nhớ của tài liệu dài.
