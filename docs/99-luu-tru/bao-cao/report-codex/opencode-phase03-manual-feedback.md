# Bàn giao OpenCode — Phase 03: phản hồi test thủ công

Ngày lập báo cáo: 27/11/2026.
Phạm vi: **Task A read-only diagnosis** + **Task B frontend UI only**. Không sửa backend, không khởi động/dừng worker, không chạy backfill, không truy vấn DB thật, không in secret/`.env`/nội dung tài liệu/token.

---

## 0. Trạng thái tổng hợp

- **Task A:** không tìm thấy file capture terminal/log của worker trên máy. Mọi giải thích bên dưới là **suy luận từ code**, không phải log quan sát được. Không khẳng định nguyên nhân của hiện tượng “worker log chạy liên tục”.
- **Task B:** đã hoàn thành các thay đổi UI frontend; build `npm run build` thành công; `git diff --check` sạch cho frontend + báo cáo này.
- Các triệu chứng do người dùng báo cáo (chunks đã tồn tại; tìm từ khóa thấy seed; truy vấn semantic/Docker trả 16 tài liệu không liên quan và thiếu seed; Assistant tưởng như hỏng hết) được ghi nhận là **user-reported**, chưa được OpenCode xác minh bằng log hoặc DB. Retrieval/worker là trách nhiệm Codex.

---

## 1. Task A — Chẩn đoán read-only worker log

### 1.1 Log terminal có truy cập được không?

**Không.** Đây là kết luận quan trọng nhất của Task A.

Đã quét read-only repo (`/Users/caotiendattx/Developer/Foundation-Project`, gồm `storage/`, `backend/`, `docs/`, root) và thư mục temp được phép `/private/var/folders/vy/sb1qhh5d17dfz00xg95kfd6h0000gp/T/opencode`. Không có file nào là stdout/stderr capture của worker. Các file “gần giống” chỉ là migration/test/DB audit/restore log, cũ hơn code worker (code worker tạo ngày 27/11/2026), và **không chứa** mẫu sự kiện worker (`event=start|retry|collected|embedding_*|prepared`), không chứa dòng `sqlalchemy.engine.Engine`, không nhắc `document_index_runs`.

Chỉ ghi nhận metadata (không trích nội dung log):

| File | Kích thước | mtime | worker-event / SQL-echo / `document_index_runs` |
|---|---:|---|---|
| `…/T/opencode/pgdisposable/data/server.log` | 76,694 B | 2026-11-25 20:32:53 | 0 / 0 / 0 |
| `…/T/opencode/pgdisposable/restore_live_stage.log` | 14,852 B | 2026-11-25 20:12:33 | 0 / 0 / 0 |
| `…/T/opencode/pgdisposable/backend_tests_full.log` | 9,257 B | 2026-11-25 20:02:57 | 0 / 0 / 0 |
| `…/T/opencode/pgdisposable/data/live_like_load.log` | 6,723 B | 2026-11-25 19:56:27 | 0 / 0 / 0 |
| `…/T/opencode/pgdisposable/restore_live_stage_sql.log` | 4,481 B | 2026-11-25 20:12:50 | 0 / 0 / 0 |
| `…/T/opencode/cursor-agent-logs-502/session-2026-11-27T06-27-39-768Z-19118-1.log` | 7,023 B | 2026-11-27 13:27:46 | 0 / 0 / 0 |

Ngoài ra, `ps` read-only cho thấy một tiến trình Uvicorn đang chạy từ checkout **khác** (`/Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project`); terminal output của tiến trình đó không nằm trong file có thể đọc được từ workspace này. Không có kết luận nào rút ra từ tiến trình đó.

### 1.2 Phân biệt ba khả năng (chỉ suy luận từ code)

| Khả năng | Bằng chứng trong code | Dấu hiệu/log mong đợi |
|---|---|---|
| **SQL echo + polling (khả năng cao nhất cho “log SQL liên tục”)** | `backend/app/core/database.py:6-10` dùng `echo=True` cho **mọi** session (worker + API), nên `BEGIN/SELECT/COMMIT` luôn được ghi ở `INFO:sqlalchemy.engine.Engine`. `backend/app/services/index_worker.py:124-130` là vòng lặp vĩnh viễn; `step()` trả `False` khi hết việc (`:45-46`) rồi `sleep(2)`; câu lẽo claim ở `:38-44` (`LIMIT 1 … FOR UPDATE OF r SKIP LOCKED`) vì thế chạy và echo SQL ~2 s/lần **ngay cả khi hàng đợi rỗng**, trong khi không có dòng `log.*` nào được phát. Thêm vào đó, `frontend/digital-library/src/components/shared/documents/DocumentDetail/hooks/useDocumentInsights.ts:17-20` poll `index-status` mỗi 3 s khi status là `pending`/`retry`; endpoint này gọi SQL qua `backend/app/routers/document_insights.py:18-21` → `backend/app/services/evidence_search.py:53-70`, làm SQL echo lặp lại trong **tiến trình API** khi tab chi tiết tài liệu đang mở. | Lặp `INFO sqlalchemy.engine.Engine` SELECT `document_index_runs … FOR UPDATE … SKIP LOCKED` với nhịp đều ~2 s, **không có** dòng `event=*`; hoặc lặp GET `/documents/<id>/index-status` ~3 s. |
| **Retry thật sự** | `backend/app/services/index_worker.py:116-120` ghi `WARNING … event=retry stage=<name> error=<ExceptionClassName> elapsed_s=<n>`, đặt `status='retry'`, tăng `attempts`, `next_attempt = now() + least(900, 5*(1<<least(attempts,7)))`. Delay thực tế theo attempts trước khi tăng: 5, 10, 20, 40, 80, 160, 320, 640 s (mốc cap 900 không đạt tới do shift bị cap ở 7). `embedding_service.py:23-40` tự retry 3 lần với sleep 1 s/2 s cho timeout/connect, và 429/500/502/503/504 (Retry-After nếu là số); **không log ở module này**, nên chỉ thấy khoảng cách dài hơn giữa `embedding_start` (`:86`) và `embedding_done` (`:88`), sau đó có thể là warning retry. | Cùng một `run=<id>` xuất hiện nhiều dòng `WARNING event=retry`, khoảng cách tăng dần; hoặc gap 1/2 s nội bộ rồi `stage=embedding` retry. |
| **Backlog bình thường** | Một transaction sở hữu một run (`:35-44`, `SKIP LOCKED`), nên nhiều worker an toàn. Mỗi run phát theo thứ tự `event=start attempt=N` (`:50`) → `event=collected chunks=N coverage=…` (`:66`) → `event=embedding_start batch=N count=N` (`:86`) → `event=embedding_done batch=N` (`:88`) → `event=prepared outcome=… commit=pending` (`:115`). Enqueue lúc startup chỉ có `schedule_model_change()` (`:16-31`, gọi ở `:125`); enqueue lúc upload/sửa là trigger trong `alembic/versions/ea41b38547bc_document_index.py:30-44`, backfill ở `:45-46`. Format log: `index_worker.py:134`. Log chỉ gồm ID/count/thời gian/tên exception — **không log nội dung tài liệu hay key**. | Nhiều `event=start` với `run=` khác nhau, tăng dần; mỗi run có chuỗi event hoàn chỉnh; không lặp warning cho cùng một run. |

**Không có bằng chứng quan sát được** để chọn chắc chắn một trong ba trường hợp trên. Đặc biệt, không được kết luận “retry liên tục” chỉ vì thấy SQL lặp: `echo=True` + idle poll đủ để tạo ra dòng SQL liên tục mà không có retry nào.

### 1.3 Mẫu log tối thiểu cần có từ Codex/người test

Xin cung cấp **20–30 dòng liên tiếp hoặc ~60 giây** output terminal của worker (và của tiến trình API nếu tab chi tiết đang mở), đã redact theo đúng hình thức này:

1. Giữ timestamp đến giây (format worker đã có `asctime`).
2. Giữ level + logger name: `INFO|WARNING`, `app.services.index_worker` vs `sqlalchemy.engine.Engine`.
3. Với dòng worker: giữ pattern và giá trị dạng placeholder: `run=<ID> attempt=<n> batch=<n> count=<n> chunks=<n> elapsed_s=<n> stage=<name> error=<ExceptionClassName> outcome=<token> status=<token>`. Thay document ID/title/body/URL/key/token bằng `<redacted>`.
4. Với dòng SQL echo: chỉ giữ logger name, `BEGIN|COMMIT|ROLLBACK`, và dạng SQL rút gọn, ví dụ `SELECT … FROM document_index_runs … LIMIT 1 FOR UPDATE … SKIP LOCKED`. **Bỏ hoàn toàn bound parameter và literal values.**

Tiêu chí phân loại:

- SQL echo/polling: SELECT `document_index_runs … FOR UPDATE … SKIP LOCKED` lặp ~2 s, zero `event=*`; và/hoặc `GET /documents/<id>/index-status` lặp ~3 s.
- Retry: nhiều `WARNING event=retry` cho **cùng** `run=`, gap ~5/10/20/40/80/160/320/640 s (hoặc gap 1/2 s trước `stage=embedding`).
- Backlog: `event=start` với `run=` khác nhau, mỗi run đi đủ chuỗi `collected → embedding_start/done → prepared`.

Nếu có thể, bổ sung (DB-side, không phải log) cho một document cụ thể: `status`, `attempts`, `next_attempt`, `last_error` từ `document_index_runs`. `attempts > 0` xác nhận retry thật; `pending, attempts=0` xác nhận backlog chưa xử lý. OpenCode **không truy vấn DB**.

### 1.4 Giới hạn trách nhiệm

Không sửa worker/retrieval/embedding/search backend. Không khởi động/dừng worker. Không chạy backfill. Các vấn đề “16 tài liệu không liên quan, thiếu seed khi query semantic/Docker” và “Assistant functions broken” cần Codex đối chiếu tiếp bằng log/DB theo mục 1.3.

---

## 2. Task B — UI frontend đã triển khai

### 2.1 Quyết định và lý do

- Giữ nguyên tab key `insights` (URL `?tab=insights` không đổi), chỉ đổi nhãn hiển thị từ **Trợ lý** thành **Hỏi đáp cùng AI** tại `DocumentDetail.types.ts`. Phần question input (`QuestionAnswerPanel`) vẫn nằm trong `TabInsights`, không di chuyển.
- Button tóm tắt đặt **ngay dưới nút tải xuống** trong `DocumentActionCard` (cột phải), chỉ xuất hiện ở route cá nhân/nhóm (`showInsights`), nơi endpoint `/documents/{id}/summary` có ngữ cảnh index/run hợp lệ.
- Click button gọi đúng service đã có `insightService.getSummary(documentId)` → `GET /documents/{id}/summary`, đồng thời chuyển tab sang `description` để kết quả hiển thị ngay.
- Mô tả thủ công vẫn render từ `doc.description` như cũ; tóm tắt AI là **section riêng** ngay sau mô tả. Không ghi đè lên `description` DB (frontend không gọi update).
- Dùng chung một component `AiSummarySection` cho cả tab **Mô tả** và tab **Hỏi đáp cùng AI**, nên citation/coverage/empty/error/loading không bị lệch giữa hai nơi.
- Không sửa search UI: mode selector `keyword | hybrid` giữ nguyên, không bật filter `title/content/semantic`, không đoán match method từ `mode`.

### 2.2 Files frontend đã đổi

| File | Thay đổi |
|---|---|
| `frontend/digital-library/src/components/shared/documents/DocumentDetail/DocumentDetail.types.ts` | Nhãn tab `insights`: `Trợ lý` → `Hỏi đáp cùng AI`. |
| `frontend/digital-library/src/components/shared/documents/DocumentDetail/components/DocumentActionCard.tsx` | Thêm prop `onGenerateSummary?`, `isSummaryLoading?`; nút “Tóm tắt AI” ngay dưới download, có spinner khi loading. |
| `frontend/digital-library/src/components/shared/documents/DocumentDetail/DocumentDetail.tsx` | Thêm `useMutation` đo `performance.now()` quanh `insightService.getSummary(id)`; lưu result vào React Query cache key `["document-summary", id]`; truyền summary/error/elapsed/indexStatus xuống tab Mô tả và `TabInsights`; click button chuyển `setActiveTab("description")` rồi mutate. |
| `frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/AiSummarySection.tsx` **(mới)** | Section tóm tắt dùng chung: loading spinner, elapsed time (`x.xs`), error `role="alert"`, pending vs no-content, item link + `CitationMeta`, “Mở ngữ cảnh”, coverage text + `ProgressBar`. |
| `frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/TabPanels.tsx` | `TabDescription` nhận `children?: ReactNode` để chèn AI summary section mà không đụng vào `<p>{description}</p>`. |
| `frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/TabInsights.tsx` | Thay block tóm tắt cũ bằng `AiSummarySection`; nhận thêm `summaryError`, `summaryElapsedMs`. Question input giữ nguyên. |
| `frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx` | Nút legacy “Tóm tắt tự động AI” bỏ `alert(...)`, gọi `handleSummaryClick(doc)` → navigate tới path chi tiết kèm `?tab=description` (giữ `navigationPath` của nhóm). |

### 2.3 Trace legacy button và callers

- Component chứa nút: `DocumentDetailView.tsx`; nhãn tại footer thẻ detail view.
- Caller thực tế: `pages/personal/components/PersonalDocumentsSection.tsx` (viewMode detail, không truyền `navigationPath` → `/personal/documents/{id}`) và `pages/group/components/sections/GroupDocumentsSection.tsx` (truyền `navigationPath={(id) => /groups/${groupId}/documents/${id}}`). Cùng được re-export qua `components/shared/documents/index.ts`.
- Không tạo route mới, không sửa hai caller: dùng lại helper `getDocumentPath` trong `DocumentDetailView` rồi nối `?tab=description`. `useDocumentDetail.ts:14-21` đã validate `description` là tab hợp lệ, nên URL đồng bộ sẵn.

### 2.4 Trạng thái hiển thị của tóm tắt

| Trường hợp | UI |
|---|---|
| Đang request | Button: “Đang tóm tắt...” + spinner; section: “Đang tạo tóm tắt...” + spinner. |
| Request xong, có items | Render từng item, giữ `CitationMeta`, link “Mở ngữ cảnh”, dòng coverage `read/total unit` + progress bar; hiển thị elapsed `x.xs`. |
| HTTP 404 (`getSummary` trả `null`) | “Chưa có nội dung để tóm tắt (x.xs).” — không gọi là lỗi. |
| Index đang `pending/retry/queued/processing/indexing` mà summary rỗng | “Tài liệu đang được xử lý (x.xs); tóm tắt sẽ sẵn sàng sau khi lập chỉ mục xong.” |
| HTTP 409 / HTTP khác / network error | `role="alert"` màu đỏ: “Không thể tạo tóm tắt: … (x.xs). Vui lòng thử lại.” Mapping lỗi chỉ dùng status/tên loại lỗi, không log/hiện token hay nội dung. |
| Chưa từng bấm button | Dùng data có sẵn từ query `useDocumentInsights` nếu có; không tạo request mới. |

**Không coi mọi failure là empty result**: `error` được lưu tách biệt khỏi `data` trong `SummaryRequestResult`; `data: null` chỉ đến từ 404 hoặc response rỗng.

---

## 3. Search UX — contract proposal (CHƯA bật, CHƯA đổi code)

### 3.1 Hiện trạng (đã trace, không thay đổi)

- `SearchMode = "keyword" | "hybrid"` (`types/search.ts`); `SearchModeToggle` chỉ có 2 lựa chọn. `SearchPage.tsx` đọc `?mode=`, mọi giá trị khác `hybrid` → `keyword`; gửi đúng `{ q, page, page_size, mode }` qua `searchService.fullTextSearch`.
- Backend `GET /search/full`: `q` (str, required), `page` (int ≥1), `page_size` (int 1..50), `mode` (`Literal["keyword","hybrid"]`). Keyword = FTS trên `Document.search_vector`; hybrid = RRF giữa lexical và vector trong `evidence_search.py`. `fallback` là boolean **response-level** (embedding unavailable, hoặc FE retry khi 404 hybrid), **không phải** provenance của từng item.
- Response item hiện tại: `id, type, title, subtitle, url, snippet?, citation?` (`backend/app/schemas/search.py`, `frontend/src/types/search.ts`). **Không có** provenance/match method, **không có** param `title/content/semantic/match_fields`.
- Badge hiện tại nằm ở metadata row `SearchResultCard.tsx` (`flex flex-wrap`), gồm subtitle pill và `CitationMeta`. Đây là chỗ dự kiến thêm nhiều badge sau này.
- Không được suy ra method từ `mode`: `hybrid` có thể trả item thuần lexical (`fallback=true`) hoặc item có cả hai tín hiệu.

### 3.2 Đề xuất exact contract cho Codex (chưa implement ở frontend/backend)

**Query param mới (additive) trên `GET /search/full`**

```text
match_fields: Optional[list[Literal["title","content","semantic"]]] = Query(None)
```

- Wire format lặp key: `?match_fields=title&match_fields=content` (axios phải serialize dạng `match_fields`, không phải `match_fields[]`).
- Giá trị hợp lệ: `title | content | semantic`; unknown → 422; dedupe giữ thứ tự đầu tiên.
- Ý nghĩa: `title` = lexical tiêu đề; `content` = lexical nội dung/chunk active; `semantic` = vector signal với kiểm tra run/model/checksum như hiện tại. Nhiều giá trị = union, dùng RRF `k=60` khi >1 tín hiệu đóng góp. Omit = giữ nguyên hành vi hiện tại. Scope vẫn do server suy từ user, không nhận query param.
- Nếu `semantic` được yêu cầu nhưng embedding/index unavailable: thêm `"semantic"` vào `unavailable_match_fields`, `fallback=true`, **không phát minh** method semantic cho item nào.

**Backend schema đề xuất**

```python
MatchField = Literal["title", "content", "semantic"]
MatchMethod = Literal["lexical_title", "lexical_content", "semantic"]

class SearchMatchProvenance(BaseModel):
    methods: list[MatchMethod]                 # fixed order: lexical_title, lexical_content, semantic
    title_rank: Optional[int] = None           # 1-based
    content_rank: Optional[int] = None         # 1-based
    semantic_rank: Optional[int] = None        # 1-based
    fused_score: Optional[float] = None        # chỉ có khi >1 signal fused

# SearchResultItem += match: Optional[SearchMatchProvenance] = None
# FullSearchOut += unavailable_match_fields: list[MatchField] = []
```

**TypeScript đề xuất (chưa thêm vào repo)**

```ts
export type SearchMatchField = "title" | "content" | "semantic";
export type SearchMatchMethod = "lexical_title" | "lexical_content" | "semantic";

export interface SearchMatchProvenance {
  methods: SearchMatchMethod[];
  title_rank?: number | null;
  content_rank?: number | null;
  semantic_rank?: number | null;
  fused_score?: number | null;
}

// SearchResultItem += match?: SearchMatchProvenance | null;
// FullSearchResponse += unavailable_match_fields?: SearchMatchField[];
```

**UI placement đề xuất (sau khi API tồn tại)**

Trong `SearchResultCard.tsx`, nối badge vào metadata row hiện tại: `lexical_title` → “Tiêu đề”, `lexical_content` → “Nội dung”, `semantic` → “Gần nghĩa”; render nothing khi `match` null/empty. Không đọc `mode` trong component này. Giữ nguyên `SearchModeToggle`.

**Acceptance checks đề xuất cho Codex**

- Omit `match_fields` → mọi field cũ giữ nguyên; unknown value → 422; semantic unavailable → không có method semantic giả; item đa tín hiệu → nhiều method + rank/score; permission tests giữ nguyên; `SearchModeToggle` không đổi.

---

## 4. Kiểm tra đã chạy

| Check | Kết quả |
|---|---|
| `npm run build` trước khi sửa UI (baseline, dirty files có sẵn) | Pass. Chỉ có warning Vite config `configLoader: 'native'` (`__dirname` ở `vite.config.ts:21`) và warning chunk >500 kB. |
| `npm run build` sau khi sửa UI | Pass (tsc -b + vite build). Vẫn chỉ 2 warning cũ nêu trên; không có lỗi TypeScript. |
| `git diff --check -- frontend docs/99-luu-tru/bao-cao/report-codex` | Sạch. |
| `grep -R "Trợ lý" frontend/digital-library/src --include=*.ts --include=*.tsx` | Không còn kết quả. |
| `grep -R "Tóm tắt tự động AI" frontend/digital-library/src` | Chỉ còn đúng nhãn button legacy (nay đã có handler navigate thay vì `alert`). |
| Backend tests | **Không chạy** — thuộc trách nhiệm Codex; OpenCode không sửa backend. |
| Worker / backfill | **Không khởi động/dừng/chạy**. |

## 5. Ghi chú về Graphify và phạm vi file

- Đã dùng graph có sẵn tại `graphify-out/graph.json` bằng inline NetworkX fallback (CLI `graphify` không có trên PATH). Graph này **cũ hơn** các file AI/worker chưa track, nên các kết luận ở mục 1 và 2 được bổ sung bằng grep/read trực tiếp, read-only. Không rebuild graph (nằm ngoài phạm vi “edit frontend/report only”); file temp `.vocab.txt` sinh ra khi query đã xóa.
- Các file dirty có sẵn của Codex (backend, `.env.example`, search/document detail cũ) **không bị ghi đè**. OpenCode chỉ thêm/sửa các file frontend liệt kê ở mục 2.2 và tạo báo cáo này.
- Không in secret, raw `.env`, nội dung tài liệu hay token trong quá trình điều tra lẫn trong báo cáo này.
