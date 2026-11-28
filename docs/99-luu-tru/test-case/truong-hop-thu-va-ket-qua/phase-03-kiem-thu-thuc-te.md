# Kiểm thử thực tế Phase 1–3

Ngày lập: 27/11/2026. Trạng thái: chưa chạy thủ công; không coi kết quả mong đợi là kết quả thực tế.

## Chuẩn bị và giới hạn

Upload file `../file-upload/phase-03-mau-kiem-thu.md` vào kho cá nhân. Ghi ID tài liệu từ URL. Dùng dữ liệu mẫu không nhạy cảm. Không cần hoàn thiện giao diện để kiểm tra: dùng tab Trợ lý, DevTools Network và SQL bên dưới.

Backend phải chạy bằng Uvicorn (lệnh `python -m app.main` trong hướng dẫn chat trước không khởi động HTTP server):

```bash
cd /Users/caotiendattx/Developer/Foundation-Project
PYTHONPATH=backend .venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Worker là tiến trình riêng, backend không tự chạy worker. Lệnh sau xử lý TOÀN BỘ hàng đợi và gửi nội dung đến provider đã cấu hình; chỉ chạy khi bạn cho phép xử lý toàn bộ các tài liệu pending. Nếu chỉ muốn thử một file, hãy dùng database thử riêng. Hiện chưa có tùy chọn worker giới hạn theo document ID.

```bash
cd /Users/caotiendattx/Developer/Foundation-Project
PYTHONPATH=backend .venv/bin/python -u -m app.services.index_worker
```

Không chạy thêm worker nếu đã có tiến trình đang chạy. Log mới cần khởi động lại worker để có hiệu lực. Log có timestamp, run ID, bước, số chunk, số lô và thời gian; không in nội dung tài liệu hoặc API key. `embedding_done` chưa có nghĩa dữ liệu đã commit: toàn bộ tài liệu đang nằm trong một transaction. Xác nhận commit bằng SQL trạng thái `ready` và `is_active=true`.

## Tại sao upload xong chưa thấy chunk?

Bảng đúng là `document_chunks`, không phải `document_chucks`. Upload tạo tài liệu và tác vụ pending; worker mới tạo chunk. Các khả năng cần phân biệt: chưa chạy worker; đang chờ sau tài liệu cũ; worker đang xử lý nhưng chưa commit; extraction/API lỗi làm rollback chunk và chuyển retry; file không đọc được nên run empty. Chưa có dữ liệu/log của file .doc cụ thể nên chưa thể kết luận nguyên nhân của file đó. .doc là định dạng Word cũ, cần kiểm tra content/Markdown có được tạo thật hay không.

Thay `123` bằng ID tài liệu. Chạy trên cùng database với backend:

```sql
SELECT id,title,file_type,checksum,length(content) AS content_chars,markdown_path
FROM documents WHERE id=123;

SELECT r.id,r.status,r.is_active,r.attempts,r.next_attempt,r.last_error,r.coverage,
       count(c.id) AS chunks,count(c.embedding) AS embedded
FROM document_index_runs r LEFT JOIN document_chunks c ON c.run_id=r.id
WHERE r.document_id=123 GROUP BY r.id ORDER BY r.id DESC;

SELECT c.id,c.ordinal,c.heading,c.source,c.location,c.body,
       c.embedding IS NOT NULL AS has_vector
FROM document_chunks c JOIN document_index_runs r ON r.id=c.run_id
WHERE r.document_id=123 AND r.is_active ORDER BY c.ordinal;
```

Không có run: kiểm tra migration/trigger và database đang kết nối. Pending, attempts=0: chưa hoàn tất xử lý, xem terminal worker. Retry: lấy `last_error`, `next_attempt` và log `event=retry`. Empty: kiểm tra content/Markdown và khả năng đọc file. Ready: phải có chunk và, khi cấu hình embedding bật, có vector cho mọi chunk.

## Các ca cần thực hiện

| Mã | Thao tác | Kết quả mong đợi |
|---|---|---|
| P1-01 | Upload Markdown mẫu, ghi thời điểm upload và ID | Có documents row và run; không yêu cầu chunk xuất hiện ngay khi upload trả về |
| P1-02 | Theo dõi log và SQL đến ready | Có start → collected → embedding_start/done → prepared; SQL xác nhận active run và chunks > 0, embedded = chunks |
| P1-03 | Mở Nội dung OCR và bản Markdown | Có các câu trong mẫu; không mất dấu tiếng Việt. Nếu pipeline bọc Markdown thành code block, ghi nhận cách hiển thị và heading thay vì tự đánh dấu đạt |
| P2-01 | Trang tìm kiếm đầy đủ, chọn Từ khóa, tìm “khóa chính xác định duy nhất” | Tìm được file mẫu |
| P2-02 | Chọn Kết hợp, tìm “Docker image là gì” rồi thử “khuôn mẫu tạo môi trường container” | Có snippet; ghi thứ hạng thực tế. Câu diễn đạt lại không được bảo đảm top 1 |
| P3-01 | Tab Trợ lý, hỏi “Giá trị lớn nhất ở phía nào của cây nhị phân?” | Trích đúng “Trong cây tìm kiếm nhị phân, giá trị lớn nhất nằm ở nhánh phải.”, giữ điều kiện tìm kiếm nhị phân |
| P3-02 | Hỏi “Mô hình OSI gồm bao nhiêu lớp?” | Trích câu bảy lớp từ mẫu |
| P3-03 | Hỏi “Cơ sở dữ liệu được phát minh năm nào?” | insufficient, answer=null, không bịa năm |
| P3-04 | Xem tóm tắt, bấm nguồn của từng ý | Mỗi ý là câu có trong chunk; URL có chunk; API chunk trả đúng body và cùng document_id |
| P3-05 | Chuyển sang tài liệu khác | Không còn câu trả lời của tài liệu trước |
| P3-06 | Upload mẫu vào nhóm thử; tài khoản thành viên mở nguồn, sau đó chủ nhóm bỏ thành viên và thành viên tải lại trang | Trước thu hồi đọc được; sau thu hồi không đọc được nguồn, kể cả URL lưu trước đó. Dùng nhóm/tài khoản thử |
| P3-07 | Với một tài liệu thử được xử lý lại, mở URL chunk cũ | Không phục vụ chunk cũ; 404/thông báo không còn hiệu lực. Nếu UI chưa hỗ trợ thay file thì ghi CHƯA THỬ, không sửa DB nghiệp vụ để giả lập |

File Markdown này không kiểm tra được OCR PDF scan, coverage theo trang hoặc năng lực đọc .doc. Cần chạy thêm file .doc đang gặp lỗi và một PDF scan riêng, ghi kết quả cùng mẫu dưới đây. Đừng coi không có lỗi ở Markdown là .doc đã đạt.

## Quan sát HTTP và thời gian

Mở DevTools → Network, bật Preserve log, lọc `index-status`, `questions`, `summary`, `chunks` hoặc `search/full`. Ghi status HTTP, response và Duration. Request questions cần POST body `{"question":"..."}`. Mở nguồn dùng GET `/documents/{id}/chunks/{chunk_id}`. Đừng gửi kèm token/Cookie khi chia sẻ log.

Ghi ba thời gian riêng: upload trả về; từ upload đến SQL ready; thời gian request hỏi đáp/tìm kiếm. Log `elapsed_s` chỉ đo bước worker, không gồm thời gian chờ hàng đợi. Chưa đặt SLA cứng vì chưa đo trên file thật.

## Bảng kết quả (điền sau khi chạy)

| Ca | Document ID / Run ID | Thời gian | HTTP / trạng thái DB | Kết quả thực tế | PASS / FAIL / CHƯA THỬ |
|---|---|---|---|---|---|
| P1-01 | | | | | |
| P1-02 | | | | | |
| P1-03 | | | | | |
| P2-01 | | | | | |
| P2-02 | | | | | |
| P3-01 | | | | | |
| P3-02 | | | | | |
| P3-03 | | | | | |
| P3-04 | | | | | |
| P3-05 | | | | | |
| P3-06 | | | | | |
| P3-07 | | | | | |

Khi báo lỗi .doc, gửi document ID, kết quả hai truy vấn đầu, đoạn log cùng run ID và thời điểm upload. Những bằng chứng này đủ để phân biệt lỗi hàng đợi, đọc file, embedding và công bố kết quả.
