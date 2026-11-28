# Kết quả follow-up Phase 03 (frontend) — opencode

## 1. Phạm vi

Đã đọc trước khi sửa:

- `docs/99-luu-tru/bao-cao/report-codex/opencode-phase03-followup-task.md`
- `docs/99-luu-tru/bao-cao/report-codex/phase-03-review-manual-feedback.md`
- `frontend/AGENTS.md`, `frontend/docs/design/DESIGN_SYSTEM.md`,
  `frontend/docs/COMPONENTS.md`, `frontend/docs/SCREENS.md`.

Chỉ sửa frontend và viết báo cáo này. **Không** sửa backend, `.env`, không chạy
worker/backfill, không reset các file dirty có sẵn, không thêm dependency.
Không tuyên bố hoàn thành toàn Phase 03.

Graphify CLI không dùng được trong môi trường này; đã truy vấn fallback bằng
NetworkX trên `graphify-out/graph.json` rồi đối chiếu trực tiếp với code/backend
contract (`backend/app/schemas/search.py`, `backend/app/routers/search.py`,
`backend/app/services/evidence_search.py`, `backend/app/routers/document_insights.py`).

## 2. A — Tìm kiếm: field selection, provenance, semantic unavailable

- `src/types/search.ts`: thêm `SearchMatchField`, `SearchMatchMethod`,
  `SearchMatchProvenance`, `unavailable_match_fields` và `match` trên result item.
- `src/utils/searchFields.ts` (mới): defaults theo mode (`keyword` = `title+content`,
  `hybrid` = `title+content+semantic`), parse/normalize từ query param `fields`,
  key ổn định cho query cache.
- `src/services/searchService.ts`: `GET /search/full` dùng `URLSearchParams` với
  `params.append("match_fields", field)` từng field (không có `match_fields[]`),
  giữ `mode` và quick-search. **Bỏ fallback 404 âm thầm** của hybrid; lỗi được
  ném lên UI. Không đụng vào thuật toán rank/điểm.
- `src/pages/search/SearchPage.tsx`: fields nằm trong URL (`?q=&mode=&fields=...`)
  và trong `queryKey`; đổi query/mode/fields reset `page=1`; giữ form quick-search
  cũ, không submit khi query rỗng; không cho bỏ field cuối cùng. Tách results sang
  `src/pages/search/components/SearchResults.tsx` để page ≤ 200 dòng theo AGENTS.md.
- `src/pages/search/components/SearchFieldFilter.tsx` (mới): checkbox Tiêu đề /
  Nội dung / Theo nghĩa bằng component và token màu có sẵn.
- `src/pages/search/components/SearchResultCard.tsx`: render **mọi** method trong
  `item.match.methods` thành badge (`FTS · Tiêu đề`, `FTS · Nội dung`, `Theo nghĩa`);
  không suy provenance từ `mode`, không render rank/fused_score.
- Khi backend báo `unavailable_match_fields` chứa `semantic`: hiện cảnh báo riêng.
  Trường hợp semantic-only dùng thông điệp “Chưa tìm bằng nghĩa được…” và empty
  state nói rõ **không phải không có tài liệu**; khi còn field khác thì nói chỉ
  dùng các trường đã chọn.

## 3. B — QA/summary: trạng thái, cache, lỗi, một bản tóm tắt

- `src/types/ai.ts`: `QuestionAnswer.status` thêm `not_ready`, thêm `index_status?: string`.
- `src/components/shared/ai/QuestionAnswerPanel.tsx`: giữ nguyên vị trí và nhãn
  “Hỏi đáp cùng AI”; phân biệt `not_ready` (chờ lập chỉ mục / `retry`) với
  `insufficient`; hiện thời gian request cho cả thành công và lỗi; reset state cũ
  khi gửi lại câu mới; 404/409/network hiển thị nhãn thân thiện, không raw exception.
- `src/services/insightService.ts`: index-status/summary/related/tag-suggestions
  và questions **không còn nuốt 404 thành empty**; chunk vẫn cho phép null khi
  chunk cũ/stale (giữ thông báo sẵn). Dùng chung `src/utils/requestErrorLabel.ts`.
- `src/components/shared/documents/DocumentDetail/DocumentDetail.tsx`:
  - mutation summary không ghi `null` vào query cache; prefer
    `insights.summary.data` mới hơn dữ liệu mutation; đẩy `insights.summary.error`
    và `indexStatus.error` lên UI; reset mutation/error khi bấm lại hoặc loading.
  - đổi `documentId` thì reset mutation, không giữ answer/summary/thời gian cũ.
  - intent `?summary=1` (từ nút legacy “Tóm tắt tự động AI”) được consume một lần
    theo `location.key`, dùng `replace`, set tab `description`, gọi `GET summary`
    kể cả khi cache rỗng; tránh effect loop.
- `src/components/shared/documents/DocumentDetailView.tsx`: nút legacy navigate
  kèm `summary=1` thay vì chỉ đổi tab.
- `src/components/shared/documents/DocumentDetail/components/DocumentActionCard.tsx`:
  nút “Tóm tắt AI” đặt sau download, gọi cùng mutation `GET summary`.
- `src/components/shared/documents/DocumentDetail/tabs/AiSummarySection.tsx`:
  render trong **Mô tả** sau manual description (manual giữ nguyên), có
  loading/elapsed/error/index pending/coverage/citation; nhận thêm `indexError`.
- `src/components/shared/documents/DocumentDetail/tabs/TabInsights.tsx`: bỏ bản
  tóm tắt lặp khỏi tab hỏi đáp, thay bằng thông báo lỗi index-status.
- `src/components/shared/documents/DocumentDetail/hooks/useDocumentInsights.ts`:
  khi index-status chuyển `pending|retry|...` → `ready|complete|done` thì reset
  tối thiểu summary/related/tag-suggestions theo documentId, có ref theo dõi
  trạng thái trước để tránh loop; `refetchInterval` giữ nguyên cho pending/retry.

## 4. Kiểm tra đã chạy

- `npm run build` trong `frontend/digital-library`: **pass** (`tsc -b && vite build`).
  Chỉ còn warning có sẵn của Vite về `configLoader: 'native'`/`__dirname` và chunk > 500 kB.
- `git diff --check` ở root repo: **pass** (không có whitespace error).
- Không có framework test/spec trong frontend và không thêm dependency. Đã chạy
  một script assert nhất thời bằng `node --experimental-strip-types` (không lưu
  vào repo) để kiểm tra: defaults keyword/hybrid, parse/normalize `fields`,
  `matchFieldsKey`, và chuỗi query sinh ra đúng
  `match_fields=title&match_fields=content` (không có `[]`).
- Kiểm tra bằng tay theo code: badge multi-method chỉ lấy từ `match.methods`,
  `not_ready` tách khỏi `insufficient`, intent `summary=1` consume một lần,
  mutation error không ghi đè cache success.

## 5. Giới hạn / cần Codex review

- **Chưa xác minh trên browser có đăng nhập**: không có session browser đăng nhập
  trong lượt này, nên chưa đi luồng thật (search → click summary → QA). Cần
  review/QA browser với tài khoản có quyền tài liệu trước khi merge.
- Chưa tạo được dữ liệu thật cho nhánh `semantic` unavailable và QA `retry`;
  thông điệp đã code theo contract nhưng cần test integration với backend.
- Ảnh `frontend/docs/design-reference/document_detail.png` không đọc được bởi
  model hiện tại; ưu tiên bám code + design docs. Nếu ảnh có khác biệt bố cục
  ở nút “Tóm tắt AI”, cần Codex đối chiếu lại.
- Nên rà soát thêm: ưu tiên query data vs mutation error trong trường hợp refetch
  summary thất bại sau một lần mutate thành công, và dependency array của effect
  intent `summary=1` theo convention lint của repo.
- Các file backend/`.env`/test/migration đang dirty từ trước **không** bị sửa trong
  follow-up này; diffs đó không thuộc báo cáo này.
