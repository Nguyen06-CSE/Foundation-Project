# Phase 03 — Kiểm tra chéo OpenCode và sửa lỗi sau test thủ công

Ngày: 27/11/2026 (Asia/Ho_Chi_Minh). Trạng thái: **backend đã sửa và smoke test trên DB thật; UI đang giao OpenCode hoàn thiện, chưa nghiệm thu toàn Phase**.

## 1. Bằng chứng nguyên nhân

- Khi kiểm tra, file mẫu 1083 có run 1062 `pending`, 0 chunk, 0 vector. Run cũ 1061 `obsolete`. Vì vậy thấy chunk của các file khác không chứng minh seed đã được lập chỉ mục.
- Snapshot hàng đợi: 55 ready/active, 770 pending, 235 retry, 2 obsolete. Retry: 217 `OSError`, 18 `HTTPStatusError`, mỗi run đã thử một lần. Chưa đủ dữ liệu xác định chi tiết lỗi nguồn hoặc mã HTTP cũ.
- `database.py` bật `echo=True`, worker poll 2 giây nên SQL vẫn in khi hàng đợi hết việc. OpenCode không có log terminal thực tế; báo cáo của họ chỉ suy luận từ code, không phải đã quan sát lỗi retry.
- Đường dẫn `Developer/Do_An_Co_So/Foundation-Project` là symlink về checkout hiện tại, không phải backend ở bản code khác. OpenAPI live có đủ index-status/questions/summary.
- Truy vấn vector cũ chỉ lấy nearest neighbours, không có ngưỡng liên quan. Các chunk cũ đo với câu hỏi Docker chỉ đạt khoảng 0,495–0,577.

## 2. Thay đổi Codex

### Worker và log

- SQL echo mặc định tắt, bật lại bằng `SQL_ECHO=true`; ẩn bound parameters kể cả khi debug để tránh log nội dung/key.
- Thêm `--document-id` cho cả enqueue đổi model và nhận việc. Vẫn giữ checksum, quyền sở hữu lock, thời điểm retry và `SKIP LOCKED`.
- Thêm event worker_started/no_available_work, event committed chỉ sau khi transaction thoát thành công. `committed` có thể là commit trạng thái retry, không mặc định nghĩa là index ready; đọc cùng event trước đó.
- Retry log thêm mã HTTP nếu có, không in response body hoặc credentials.
- Không sửa cơ chế transaction toàn tài liệu: batch embedding vẫn có thể bị gọi lại nếu process chết giữa chừng. Đây là giới hạn còn tồn tại.

### Tìm kiếm

- Thêm `match_fields=title&match_fields=content&match_fields=semantic`; giá trị ngoài danh sách trả 422. Chọn nhiều trường là hợp các nhánh, RRF k=60.
- `title` chỉ FTS tiêu đề; `content` FTS document.content và chunk active; semantic chỉ run active, checksum/model hiện hành. Phân quyền cá nhân/nhóm và loại tài liệu đã xóa áp dụng trước truy vấn.
- Kết quả có `match.methods` (lexical_title, lexical_content, semantic), rank mỗi nhánh và fused_score. Chỉ nhánh thực sự khớp mới có badge.
- `unavailable_match_fields=['semantic']` và fallback=true khi không lấy được query embedding. Chỉ chọn semantic mà API lỗi thì trả rỗng kèm trạng thái lỗi nhánh, không tự mở rộng sang trường người dùng không chọn.
- Omit match_fields + keyword giữ SearchService cũ để tương thích client cũ, không có provenance mới. Hybrid không truyền fields mặc định dùng cả ba nhánh. UI mới phải gửi fields tường minh để nhận provenance, kể cả chế độ keyword.
- Thêm `SEMANTIC_MIN_SIMILARITY=0.65`. Bốn câu mẫu đo bằng provider hiện cấu hình: Docker đúng 0,8426/0,7947; câu khác chủ đề 0,5159–0,5792. Ngưỡng mới là **hiệu chỉnh ban đầu**, chưa benchmark rộng. Query SQL dùng CAST double precision để tránh PostgreSQL suy diễn tham số phép trừ thành integer.
- Chưa thay ngữ pháp FTS: câu tự nhiên chứa “là gì” có thể không khớp nhánh từ khóa dù semantic tìm đúng.

### Hỏi đáp

- Tài liệu chưa có active run trả `status=not_ready`, `index_status=pending|retry|...`, answer=null, citations=[]; không gọi embedding và không đánh đồng với thiếu căn cứ.

## 3. Kiểm chứng thực tế

Đã chạy worker riêng seed 1083, không backfill kho còn lại:

```bash
PYTHONPATH=backend .venv/bin/python -u -m app.services.index_worker --document-id 1083 --once
```

Kết quả: run 1062, 9 chunk, 9 vector; embedding một lô khoảng 1,697 giây; tổng từ claim đến commit khoảng 4,828 giây. Coverage trả section 9/9; đây là đơn vị đoạn/mục của bộ trích xuất, không phải số trang vật lý.

Smoke test gọi service với DB thật, user sở hữu 11, seed 1083:

| Phép kiểm | Kết quả quan sát |
|---|---|
| Docker image là gì | 1 kết quả, seed 1083 đứng đầu; 2,916 giây |
| khuôn mẫu tạo môi trường container | 3 kết quả, thứ tự 1083, 20, 61; 0,800 giây |
| Hỏi Docker image là gì? | answered: “Docker image là khuôn mẫu chỉ đọc để tạo container.”, 1 citation |
| Mở lại citation | Đọc đúng 1 chunk của seed |
| Tóm tắt seed | 9 items, coverage section 9/9; cache trên run seed |

Không đánh giá nội dung hai kết quả 20/61 trong lượt này; không tuyên bố đã loại mọi false positive. Thời gian trên là từng request đơn lẻ gồm query embedding và DB, không phải p50/p95.

Backend: **129 passed, 3 skipped**, lệnh:

```bash
.venv/bin/pytest -q backend/tests --ignore=backend/tests/test_batch2_integrity_constraints.py --ignore=backend/tests/test_library_download_action_filter.py
```

Hai file test yêu cầu môi trường tích hợp riêng vẫn được loại như các lượt trước. `git diff --check` sạch. Chưa chạy lại browser regression hoặc xác nhận build frontend bằng Codex trong lượt này; build pass là kết quả OpenCode báo cáo.

## 4. Review OpenCode và giao tiếp phần còn lại

Đã đọc `opencode-phase03-manual-feedback.md` và code thực tế. Đổi nhãn tab/nút tóm tắt/mô tả riêng đúng hướng. Còn các điểm cần sửa trước nghiệm thu:

1. Legacy button chỉ navigate description; phải cùng hành vi gọi summary khi người dùng chủ động bấm, cả khi cache đang có dữ liệu rỗng cũ.
2. Summary auto query error chưa được truyền xuống giao diện; mutation bắt lỗi rồi ghi null vào query cache, có thể xóa summary tốt cũ. Phải giữ data và lỗi tách biệt, không cache thất bại như thành công.
3. Khi pending chuyển ready, query summary/related/tag cũ chưa được invalidate; tránh giữ kết quả rỗng từ trước indexing.
4. 404 của index/QA/summary đang bị nuốt thành null. Cần phân biệt không có quyền/không tìm thấy với empty nội dung; chunk stale có thể giữ thông báo riêng.
5. Thêm UI filters và badge theo API mục 2. Không suy đoán provenance từ mode.
6. QA cần hiển thị not_ready riêng, thời gian request, lỗi; hỏi đáp giữ vị trí hiện tại. Tóm tắt chuyển về Mô tả, không giữ thêm một bản trong tab hỏi đáp.

## 5. Tự đánh giá

Root cause seed bị chờ backlog đã được xác minh bằng DB và khắc phục cho file mẫu. Hai truy vấn người dùng nêu hiện đưa seed lên đầu ở service thật; hỏi đáp/citation đã chạy được. Logging bớt nhiễu và có thời điểm commit thật.

Chưa nghiệm thu UX end-to-end, chưa chứng minh chất lượng toàn bộ kho, chưa xử lý 235 retry lịch sử, chưa sửa checkpoint per-batch. Ngưỡng semantic cần benchmark trên corpus đủ lớn và hiệu chỉnh lại nếu đổi model. Không coi build/test unit pass là hoàn thành Phase 03.

## 6. Kiểm tra chéo lượt OpenCode thứ hai

OpenCode bàn giao `opencode-phase03-followup-result.md`. Đã đọc code thực tế và tự chạy lại build frontend (pass), 34 test backend tập trung (pass), `git diff --check` (sạch). URLSearchParams lặp đúng `match_fields`; badge chỉ lấy từ `item.match.methods`; nút summary cũ dùng intent `summary=1` và có đường gọi API. Hỏi đáp phân biệt `not_ready` và `insufficient`.

Hai lỗi giao diện còn phải sửa trước nghiệm thu:

1. `SearchPage.tsx` giữ `placeholderData: (prev) => prev` dù query key thay khi đổi `fields`, mode hoặc câu hỏi. Trong lúc request mới chạy, kết quả cũ vẫn được hiển thị dưới bộ lọc mới, bao gồm badge và tổng số cũ. Cần bỏ placeholder hoặc chỉ giữ dữ liệu khi đổi trang cùng query/mode/fields.
2. `AiSummarySection.tsx` ưu tiên nhánh `error ? null` dù `summary` có dữ liệu tốt trong React Query. Nếu bấm tải lại và request lỗi, phần tóm tắt có sẵn biến mất khỏi màn hình, dù cache không bị xóa. Cần hiển thị lỗi cùng dữ liệu cached và phân biệt lần tải lại thất bại.

Ngoài ra `SearchResults.tsx` khi semantic-only bị unavailable vẫn hiện dòng “Tìm thấy 0 kết quả” phía trên lời giải thích; nên thay bằng trạng thái “Chưa có kết quả do tìm theo nghĩa chưa sẵn sàng”. Các vấn đề này được giao lại OpenCode vì người dùng đã phân công UI/UX cho OpenCode. Chưa có browser test đăng nhập; không tuyên bố xong Phase 03.

## 7. Kết quả review UI cuối cùng

OpenCode đã sửa đủ ba điểm ở mục 6 và ghi `opencode-phase03-final-ui-review-result.md`. Codex đọc lại code: SearchPage bỏ `placeholderData`, SearchResults phân biệt semantic-only unavailable và kết quả từ các nhánh còn hoạt động, AiSummarySection giữ summary cached/citation khi lần tải lại lỗi. Khi rà thêm, Codex sửa một nhánh một dòng: nếu request lỗi và chưa có cached summary, không đồng thời hiện “Chưa có nội dung”.

Codex chạy lại `npm run build` sau sửa cuối: pass (chỉ cảnh báo Vite có sẵn về native config và chunk >500 kB); `git diff --check` sạch. Các test backend tập trung đã chạy trong lượt review: 34 passed. Chưa kiểm tra giao diện trên browser có tài khoản đăng nhập, nên xác nhận này là kiểm tra code/build và smoke test service, **không phải nghiệm thu end-to-end Phase 03**.

Khi test webapp, cần dùng tài liệu mẫu 1083 (đã ready) và tài khoản sở hữu tài liệu: tìm “Docker image là gì” với Theo nghĩa phải có seed đứng đầu và badge “Theo nghĩa”; đổi qua Tiêu đề không còn giữ seed cũ trong lúc loading; hỏi trong “Hỏi đáp cùng AI” phải trích đúng câu gốc; bấm “Tóm tắt AI” bên dưới Tải xuống phải chuyển Mô tả và hiển thị các ý cùng citation. Lỗi API/cached summary cần thử với mạng hoặc mock response trong môi trường test; không ngắt API thật của người dùng chỉ để nghiệm thu nhánh lỗi.
