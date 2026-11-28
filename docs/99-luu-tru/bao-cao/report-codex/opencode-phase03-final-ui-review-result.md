# Kết quả sửa 3 điểm UI sau kiểm tra chéo Codex

Đã đọc `docs/99-luu-tru/bao-cao/report-codex/opencode-phase03-final-ui-review.md`
và `phase-03-review-manual-feedback.md` mục 6 trước khi sửa. Chỉ sửa frontend và
ghi báo cáo này; **không** sửa backend/DB/`.env`, giữ nguyên toàn bộ dirty worktree.
Không tuyên bố nghiệm thu Phase 03.

Graphify CLI vẫn không dùng được; đã thử fallback truy vấn `graphify-out/graph.json`
bằng NetworkX, nhưng graph cũ chưa chứa các node mới (`SearchResults`,
`AiSummarySection`), nên đối chiếu trực tiếp bằng `grep` + đọc code. Ponytail: chọn
cách sửa nhỏ nhất, không them abstraction hay dependency.

## 1. Ba lỗi đã sửa

### 1. `SearchPage.tsx` — placeholderData của bộ lọc cũ
- Bỏ hoàn toàn `placeholderData: (prev) => prev` của query `full-search`.
- Khi đổi query/mode/fields (queryKey đổi) hoặc đổi trang, React Query không còn
  đổ dữ liệu của key cũ vào màn hình. Trường hợp đang fetch và chưa có items,
  `SearchResults` chỉ hiện skeleton/“Đang tìm kiếm...”; chuyển từ semantic có kết
  quả sang title-only rỗng không còn kết quả/badge/tổng số cũ.

### 2. `AiSummarySection.tsx` + caller — lỗi tải lại vẫn giữ summary cached
- `AiSummarySection`: bỏ nhánh `error ? null : ...`; nếu `summary.items` có sẵn thì
  vẫn render toàn bộ items, `CitationMeta` và link ngữ cảnh khi có lỗi.
- Thông điệp phân biệt hai trường hợp:
  - có cached items: “Không thể tải lại tóm tắt: … Đang hiển thị kết quả đã lưu.”
  - chưa có cached summary: “Không thể tạo tóm tắt: … Vui lòng thử lại.”
- Caller `DocumentDetail.tsx` giữ nguyên cơ chế đã có: `summaryData` ưu tiên
  `insights.summary.data`, mutation trả lỗi với `data: null`, `onSuccess` chỉ ghi
  cache khi `data !== null`, và `reset()` được gọi trước mỗi lần bấm lại / intent
  `summary=1`. Vì vậy lỗi không bị ghi vào cache và lỗi cũ biến mất khi retry thành công.

### 3. `SearchResults.tsx` — thông báo semantic-only unavailable
- Khi `semanticUnavailable && semanticOnly`, dòng tóm tắt là
  “Chưa thực hiện được tìm kiếm theo nghĩa”, không còn “Tìm thấy 0 kết quả”.
- Khi semantic unavailable nhưng còn title/content, hiện
  “Tìm thấy N kết quả từ các trường đã chạy cho …”, tức chỉ số từ các nhánh thực
  sự chạy; empty state giải thích hoặc không có tài liệu được giữ nguyên theo
  từng trường hợp.

## 2. Kiểm tra đã chạy

- `npm run build` trong `frontend/digital-library`: **pass** (`tsc -b && vite build`).
  Chỉ còn warning Vite có sẵn về `configLoader: 'native'`/`__dirname` và chunk > 500 kB.
- `git diff --check` ở root repo: **pass**.
- Kiểm tra bằng grep: chỉ một caller cho `SearchResults` và `AiSummarySection`;
  không còn `placeholderData` trong `SearchPage.tsx`; không còn nhánh ẩn summary
  khi có lỗi. Không thêm dependency hay file test mới.

## 3. Giới hạn / chờ nghiệm thu

- **Chưa browser test**: không có session browser đăng nhập trong lượt này, nên
  chưa đi trực tiếp 3 ca (semantic → title-only, reload summary lỗi/có cache,
  semantic-only unavailable) trên UI thật. Cần Codex người dùng nghiệm thu browser.
- Graphify fallback không phản ánh node frontend mới; nguồn đối chiếu là code thực tế.
- Không đụng tới các file backend/`.env`/test/migration đang dirty từ trước; diff
  của chúng không thuộc báo cáo này.

Dừng tại đây để người dùng nghiệm thu; Codex sẽ kiểm tra khi được thông báo.
