# Báo cáo test thủ công Phase 6A trên trình duyệt

- **Ngày test**: 2026-11-28
- **Tài khoản sử dụng**: `sv_an` / `hash123` (Nguyễn Văn An) — theo yêu cầu, thay cho 3 tài khoản mẫu `alice/bob/carol` trong guide.
- **Guide gốc**: [`../huong-dan-test-thu-cong-phase-06A.md`](../huong-dan-test-thu-cong-phase-06A.md)
- **URL**: Frontend `http://localhost:5173`, Backend `http://localhost:8000`
- **Công cụ**: `agent-browser` (session `phase06a-dd1d80b8b34d`), thao tác trực tiếp trên UI + quan sát Network/Console.
- **Artifacts**: `screenshots/`, `worker-log-excerpt.txt`.

## Tóm tắt nhanh

| Trạng thái | Số hạng mục |
|:---|---:|
| Đạt | 6 |
| Đạt một phần | 2 |
| Chưa đạt | 3 |
| Bị chặn (phụ thuộc indexing) | 5 |
| Không thể test với 1 tài khoản | 3 |

**Vấn đề nghiêm trọng nhất**: worker lập chỉ mục chạy nhưng liên tục retry/lỗi ở bước `collect` (`OSError`, không có HTTP status), khiến mọi tài liệu ở trạng thái `pending`. Vì vậy toàn bộ luồng AI (Q&A, tóm tắt, gợi ý tag, related docs, embedding ngữ nghĩa) không thể nghiệm thu trọn vẹn. Ngoài ra, file rỗng 0 byte vẫn được hệ thống chấp nhận tải lên.

---

## Checklist nghiệm thu

| STT | Hạng mục | Kết quả | Ghi chú / bằng chứng |
|:---:|:---|:---:|:---|
| 1 | Upload cá nhân | Một phần | Upload thành công doc **#1085** “Giáo trình Cấu trúc dữ liệu và giải thuật” (`screenshots/01`, `02`), nhưng trạng thái vẫn `pending`, không chuyển sang “Sẵn sàng” do worker lỗi. |
| 2 | List Preview | Đạt | `GET /documents/?sort=trending...` trả 18→19 item, **không có field `content`**, `preview_text` dài tối đa 400 ký tự; doc mới `preview_text = null`. |
| 3 | Tìm kiếm Từ khóa | Đạt | `khóa chính` → doc #1085 đứng đầu; API `match.methods = ["lexical_content"]`. UI hiển thị badge `FTS · Nội dung` thay vì `Từ khóa`/`lexical_content` (xem ISSUE-005). `screenshots/04`. |
| 4 | Tìm kiếm Ngữ nghĩa | Chưa đạt | Ở chế độ Kết hợp + `Theo nghĩa`: `khuôn mẫu tạo container` trả doc **#12 “Bai 3 - Tinh ke thua v2”** đứng đầu với nhãn `semantic`, doc chứa Docker chỉ đứng thứ 2 và gắn `lexical_content`; `nhánh phải của cây nhị phân` không trả doc #1085. `screenshots/05`, ISSUE-003. |
| 5 | Tìm kiếm Không dấu | Đạt | `khuon mau tao container` → đúng doc #1085. Cụm ví dụ trong guide `khuon mau tao moi truong container` trả 0 kết quả, nhưng cụm có dấu tương ứng cũng không có trong tài liệu nên không phải lỗi unaccent. `screenshots/06`. |
| 6 | Hỏi đáp có căn cứ | Bị chặn | `POST /documents/1085/questions` trả `{"status":"not_ready","answer":null,"citations":[],"index_status":"pending"}`. UI: “Tài liệu đang chờ lập chỉ mục; chưa thể trả lời câu hỏi này.” `screenshots/08`. |
| 7 | Hỏi đáp thiếu căn cứ | Bị chặn | Cùng trạng thái `not_ready`; không thể đánh giá anti-hallucination khi chưa có citation. |
| 8 | Tóm tắt tài liệu | Bị chặn | `GET /summary` trả `{"text":"","items":[]}`; UI: “Tài liệu đang được xử lý … tóm tắt sẽ sẵn sàng sau khi lập chỉ mục xong.” `screenshots/11`. |
| 9 | Không ghi đè mô tả | Đạt | Mô tả thủ công “Mô tả thủ công Phase06A - phải giữ nguyên sau khi tạo tóm tắt AI” vẫn hiển thị nguyên vẹn trong tab Mô tả sau các lần gọi summary. |
| 10 | Gợi ý Tag cá nhân | Chưa đạt | Không tìm thấy nút “Gợi ý tag” trên trang chi tiết hay modal “Gắn nhãn dán”; chỉ có API `GET /documents/1085/tag-suggestions` được gọi khi tải trang. `screenshots/12`, ISSUE-007. |
| 11 | Gợi ý Tag nhóm | Chưa đạt | Tương tự; không có UI gợi ý tag trong không gian nhóm đã kiểm tra. |
| 12 | Tài liệu liên quan | Bị chặn | UI: “Chưa tìm thấy tài liệu liên quan.” do tài liệu chưa có embedding. |
| 13 | Thống kê 7/30 ngày | Một phần | Mặc định là **30 ngày**, không phải 7 như guide. Chuyển sang 7 ngày: lượt đọc 30→14, tài liệu đã đọc 14→7; chuyển lại 30 ngày số liệu tăng lại. `screenshots/09`, `10`, ISSUE-004. |
| 14 | Quyền riêng tư Stats | N/A | Chỉ có tài khoản `sv_an`; không thể đăng nhập Carol để kiểm tra. |
| 15 | Chặn người ngoài nhóm | N/A | Không có tài khoản outsider; không thể kiểm tra 404/403. |
| 16 | Thu hồi quyền tức thời | N/A | Không có tài khoản Bob + quyền trưởng nhóm tương ứng để thu hồi. |
| 17 | Xử lý lỗi mạng | Đạt (nhỏ) | Block `GET /documents/1085/summary` → hiện alert “Không thể tạo tóm tắt: không thể kết nối tới máy chủ … Vui lòng thử lại.” Không hiện số 0 giả. Tuy nhiên không có nút “Thử lại” riêng. `screenshots/13`, ISSUE-006. |

---

## Chi tiết theo phần

### Phần 1 — Upload, index & preview

1. File test: `phase06a-test.md` (475 B) copy từ fixture `backend/storage/11/ab2f7a527f3f47fdbfff12f4a8cf7504.md`, chứa các câu về cây nhị phân, khóa chính và Docker đúng như guide.
2. Upload qua modal “Tải lên”, tiêu đề `Giáo trình Cấu trúc dữ liệu và giải thuật`, tag `CTGLTG`, mô tả thủ công như trên. Kết quả tạo document **#1085**, checksum `bc747f03…`, `markdown_path = storage/markdowns/1085.md`.
3. Kiểm tra API danh sách (sau reload): 19 item, `keys` không chứa `content`, 7 item có `preview_text` khác null, `max(len(preview_text)) = 400`.
4. File rỗng `phase06a-empty.md` (0 B): `POST /documents/upload` trả **201**, tạo document **#1086** “phase06a-empty”, tổng số tài liệu 18→19. Không có thông báo lỗi như kỳ vọng → ISSUE-001.
5. Trạng thái index của #1085: `GET /index-status` → `{"status":"pending","coverage":{"state":"unknown","read":0,"total":0}}`.

### Phần 2 — Hybrid search

- Lexical: `GET /search/full?q=khóa chính&mode=keyword` → 14 kết quả, #1085 đầu tiên, `methods:["lexical_content"]`, `content_rank:1`.
- Hybrid + semantic: `GET /search/full?q=khuôn mẫu tạo container&mode=hybrid&match_fields=title,content,semantic` → 2 kết quả; #12 `semantic_rank:1` (không liên quan), #1085 `lexical_content` với snippet đúng câu Docker.
- Hybrid + semantic với `nhánh phải của cây nhị phân` → 3 kết quả, tất cả `lexical_content`, không có #1085.
- Unaccent: `khuon mau tao container` → 1 kết quả đúng #1085 (`lexical_content`).

### Phần 3/4 — Q&A & tóm tắt

- Cả Q&A và tóm tắt bị chặn ở bước index. UI thể hiện đúng empty state, không vỡ layout, không treo trang.
- Mô tả người dùng không bị ghi đè bởi tóm tắt AI (đã kiểm tra trong tab Mô tả).
- Cache hit (4.2) và ưu tiên summary cho `preview_text` (4.4) không thể kiểm tra vì summary rỗng; sau các lần gọi, `preview_text` của #1085 vẫn `null`.

### Phần 5/6 — Tag & related

- Trang chi tiết chỉ có nút “Quản lý nhãn dán” mở modal chọn tag; không có nút/sparkle “Gợi ý tag”. Trang `/personal/tags` cũng chỉ có form tạo tag thủ công.
- “Tài liệu liên quan” hiển thị trạng thái rỗng do chưa có embedding.

### Phần 7 — Thống kê

- 30 ngày: lượt đọc 30, tài liệu đã đọc 14, mở từ tìm kiếm 0.
- 7 ngày: lượt đọc 14, tài liệu đã đọc 7, mở từ tìm kiếm 0.
- Sau khi search `Docker` và click kết quả #1085 (`GET /documents/1085?from_search=true`), quay lại stats: lượt đọc 31, mở từ tìm kiếm **1** → tracking hoạt động đúng.
- Console browser: không có lỗi JavaScript trong toàn bộ phiên test.

### Phần 8 — Phân quyền

- Đã vào `nhóm test với quyền chỉ xem` (Workspace #20): trang nhóm hiển thị 2 thành viên, không có nút tải lên; nhóm hiện không có tài liệu nên không kiểm tra được thao tác view-only trên tài liệu cụ thể.
- Các kịch bản Bob/Carol/revocation không thực hiện được vì chỉ có một tài khoản được cung cấp.

### Phần 9 — Error/empty state

- Empty state Q&A: “Tài liệu đang chờ lập chỉ mục; chưa thể trả lời câu hỏi này.”
- Empty state summary: “Tài liệu đang được xử lý … tóm tắt sẽ sẵn sàng sau khi lập chỉ mục xong.”
- Network error: dùng `network route "**/documents/1085/summary" --abort`, alert xuất hiện; sau đó đã `unroute`.

---

## Danh sách phát hiện

### ISSUE-001 — P1 — File rỗng vẫn được tải lên thành công

- **Steps**: Đăng nhập `sv_an` → Tài liệu → Tải lên → chọn file 0 byte → Tải lên.
- **Actual**: `POST /documents/upload` → 201, document #1086 được tạo, tổng tài liệu tăng 18→19, không có thông báo lỗi.
- **Expected**: Báo “Tệp tải lên rỗng hoặc không có nội dung văn bản để lập chỉ mục”, không tạo bản ghi.
- **Evidence**: `screenshots/03-empty-file-result.png`, `03b-empty-file-accepted.png`.

### ISSUE-002 — P1 — Index worker retry vô hạn, toàn bộ tài liệu ở trạng thái pending

- **Steps**: Chạy `cd backend && ./.venv/bin/python -m app.services.index_worker` (đã được bạn đồng ý vì worker gửi nội dung tới Gemini).
- **Actual**: Log lặp `run=N event=start attempt=1` → `retry stage=collect error=OSError http_status=None` → `committed`, hơn 200 lần trong ~1 phút; không có tài liệu nào chuyển sang ready. Worker đã bị dừng (`SIGTERM`) để tránh vòng lặp.
- **Expected**: Hoặc index thành công, hoặc retry có backoff/limit và báo lỗi rõ ràng; không giữ doc ở `pending` vĩnh viễn.
- **Impact**: Block checklist 6, 7, 8, 12 và làm suy yếu 1, 4.
- **Evidence**: `worker-log-excerpt.txt`, `screenshots/08-qa-index-pending.png`, `11-summary-empty.png`.

### ISSUE-003 — P2 — Semantic search xếp hạng sai

- **Steps**: Chế độ Kết hợp + “Theo nghĩa”, queries `khuôn mẫu tạo container` và `nhánh phải của cây nhị phân`.
- **Actual**: Query 1 trả doc không liên quan #12 ở vị trí đầu với `semantic_rank:1`; doc chứa câu Docker chỉ khớp lexical. Query 2 không trả doc #1085 dù câu nguyên văn nằm trong doc.
- **Expected**: Doc #1085 đứng đầu và có nhãn `semantic`.
- **Ghi chú**: Có thể liên quan đến ISSUE-002 (chưa có embedding cho doc mới), cần retest sau khi index chạy ổn định.
- **Evidence**: `screenshots/05-search-semantic.png`.

### ISSUE-004 — P3 — Stats mặc định 30 ngày thay vì 7 ngày

- Guide mục 7.1 kỳ vọng mặc định 7 ngày; UI mặc định `30 ngày`.
- Bộ lọc vẫn hoạt động đúng khi đổi tay.
- **Evidence**: `screenshots/09-stats-30days.png`, `10-stats-7days.png`.

### ISSUE-005 — P3 — Nhãn phương thức tìm kiếm khác guide

- API trả `match.methods = ["lexical_content"]` nhưng UI hiển thị `FTS · Nội dung`; guide kỳ vọng `Từ khóa` hoặc `lexical_content`.
- **Evidence**: `screenshots/04-search-lexical.png`.

### ISSUE-006 — P3 — Banner lỗi mạng thiếu nút “Thử lại”

- Alert hiển thị đúng nội dung thân thiện, nhưng chỉ có chữ “Vui lòng thử lại” trong câu, không có button riêng như guide.
- **Evidence**: `screenshots/13-network-error-summary.png`.

### ISSUE-007 — P3 — Không có UI “Gợi ý tag”

- Guide phần 5 kỳ vấnút “Gợi ý tag” (sparkles) trên chi tiết tài liệu và trong nhóm. Trên bản đang test chỉ có modal chọn tag thủ công; API `tag-suggestions` vẫn được gọi ngầm lúc tải trang.
- **Evidence**: `screenshots/12-tag-modal.png`.

---

## Ghi chú dọn dẹp / retest

- Hai tài liệu tạo trong phiên test vẫn còn trong kho cá nhân `sv_an`: **#1085** (“Giáo trình Cấu trúc dữ liệu và giải thuật”) và **#1086** (“phase06a-empty”). Có thể xóa thủ công nếu không muốn giữ lại.
- Để hoàn tất các mục bị block: sửa cấu hình/kết nối embedding của worker, chạy worker đến khi `index-status` chuyển `ready`, sau đó chạy lại checklist 6–8, 10–12, 4.2 và 4.4.
- Các hạng mục N/A cần thêm tài khoản theo guide (`bob`, `carol`) và/hoặc tài khoản trưởng nhóm tương ứng để test ma trận phân quyền.
