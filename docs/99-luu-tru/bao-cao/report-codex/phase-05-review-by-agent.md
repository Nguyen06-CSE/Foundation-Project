# Báo cáo review độc lập — Phase 5: Thống kê chủ đề quan tâm

Ngày review: 28/11/2026  
Reviewer: Agent kiểm tra độc lập  
Kết luận ngắn: **Chưa đạt Phase 5**. Build và test tập trung đạt, nhưng endpoint `GET /stats/me?days=7|30` trả 422 cho cả hai giá trị hợp lệ, tag workspace theo chuẩn hiện tại bị loại khỏi thống kê, và nhóm tag theo tên bị trộn/đếm trùng. Không sửa code production trong quá trình review; mọi bằng chứng được ghi lại trước.

---

## 1. Phạm vi đã kiểm tra

- API `GET /stats/me` với `scope=me|my_documents`, `days=7|30`, giá trị `days` ngoài danh sách, `scope` sai.
- Hợp đồng response cũ (`total_uploads`, `total_views`, `total_downloads`, `recent_activities`, `activity_by_day`) và trường mới `interests`.
- Độ đúng số liệu trên PostgreSQL local dùng fixture riêng, đối chiếu bằng SQL tay.
- Phân quyền cá nhân/nhóm: user khác, rời nhóm, owner không có membership, tài liệu/workspace đã xóa, tài liệu public.
- Phân nhóm theo subject/faculty/tag: thiếu subject, subject không có faculty, document không có subject, nhiều tag, tag cá nhân/tag workspace, tag cùng tên, tag/xóa doc.
- Luồng `from_search=1`: `SearchResultCard` → URL → `useDocumentDetail` → API detail → `DownloadLog.extra_data.source`, ở cả endpoint cá nhân và nhóm; kiểm tra reload/refetch và duplicate.
- Frontend: `npm run build`; đọc mã `StatsPage`, service, type, query key; không chạy được browser có auth thật (xem mục 11).
- Hiệu năng: `EXPLAIN (ANALYZE, BUFFERS)` trên DB synthetic 10.000 documents và 150.000 logs; đếm số câu query trong một request.
- Regression: chạy lệnh pytest được yêu cầu + bộ test bổ sung; `git diff --check`.

Không mở rộng sang Phase 6; không chỉnh migration; không ghi vào database Neon cấu hình trong `.env` (chỉ đọc catalog index).

---

## 2. Commit/diff hoặc file đã đọc

- HEAD: `0fa3d8e13de0a91e4290497dc26682d32367a771` (`2026-11-27 13:52:15 +0700`).
- Working tree có nhiều file đã modified từ các phase trước; `git diff --check` → **exit 0**.
- `docs/99-luu-tru/ke-hoach/AI-Vector/ke-hoach-AI-chi-tiet.md` tồn tại nhưng **0 byte** — không có yêu cầu bổ sung để đối chiếu (INFO).

File đã đọc/đối chiếu:

| Nhóm | File |
|---|---|
| Tài liệu | `docs/99-luu-tru/bao-cao/report-codex/phase-05-thong-ke-chu-de-quan-tam.md`, `docs/99-luu-tru/bao-cao/report-codex/phase-03-review-manual-feedback.md`, `docs/99-luu-tru/ke-hoach/AI-Vector/ke-hoach-AI-chi-tiet.md` |
| Backend | `backend/app/routers/stats.py`, `backend/app/schemas/activity.py`, `backend/app/routers/documents.py`, `backend/app/routers/groups.py`, `backend/app/services/document_service.py`, `backend/app/services/workspace_tag_service.py`, `backend/app/routers/tags.py`, `backend/app/routers/workspace_tags.py`, `backend/app/models/tag.py`, `backend/app/models/workspace_tag.py` |
| Frontend | `frontend/digital-library/src/pages/stats/StatsPage.tsx`, `src/services/activityService.ts`, `src/types/activity.ts`, `src/pages/search/components/SearchResultCard.tsx`, `src/components/shared/documents/DocumentDetail/hooks/useDocumentDetail.ts`, `src/services/documentService.ts`, `src/services/groupService.ts`, `src/pages/group/hooks/useGroupData.ts`, `src/components/shared/layout/SearchBar.tsx` |
| Test | `backend/tests/test_phase5_interest_counts.py`, `test_schema_sync_shares_and_community_stats.py`, `test_document_insights.py` |
| Migration liên quan | `alembic/versions/d9e0f1a2b3c4_map_legacy_tag_and_clear_workspace.py` |

Artifact kiểm tra (local, không commit): `/private/var/folders/vy/sb1qhh5d17dfz00xg95kfd6h0000gp/T/opencode/pg-review/` gồm `fixture.py`, `direct_stats.py`, `validation_and_logs.py`, `edge_cases.py`, `subject_edge_test*.py`, `workspace_tag_test.py`, `workspace_tag_fix_check.py`, `unread_tag_test.py`, `explain.sql`, `explain-perf.log`, `query_count.py`, `frontend-build.log`, `pytest-three.log`, `pytest-extra.log`.

Môi trường: PostgreSQL 18 local tại `127.0.0.1:55432`, DB `phase5_review` và `phase5_perf`; schema tạo bằng `Base.metadata.create_all`; fixture dựng bằng script riêng. Không dùng dữ liệu thật của Neon cho phép đếm.

---

## 3. Kết quả kiểm tra API

Gọi qua FastAPI ASGI transport với dependency override user id 1:

| Request | Kết quả | Đánh giá |
|---|---|---|
| `GET /stats/me?scope=me` | **200**, `interests.days=30`, đủ 8 field | PASS cho response mặc định/cũ |
| `GET /stats/me?scope=me&days=7` | **422** `literal_error`: `Input should be 7 or 30`, `input: "7"` | **FAIL** |
| `GET /stats/me?scope=me&days=30` | **422** `literal_error`: `Input should be 7 or 30`, `input: "30"` | **FAIL** |
| `GET /stats/me?scope=me&days=14` | 422 `literal_error` | PASS về việc từ chối giá trị sai, nhưng không phân biệt được với giá trị đúng |
| `GET /stats/me?scope=nope&days=7` | 422 `string_pattern_mismatch` + `literal_error` | PASS |
| `GET /stats/me?scope=my_documents` | **200**, `interests=null` | PASS, không ảnh hưởng bởi `days`/`interests` |

Nguyên nhân: `backend/app/routers/stats.py:30` khai báo `days: Literal[7, 30] = Query(30)`. Query string là chuỗi; Pydantic không ép `"7"`/`"30"` thành int Literal nên cả hai giá trị hợp lệ đều bị từ chối. Frontend luôn gửi `days` (`StatsPage.tsx:65`, `activityService.ts:20-22`), nên nút “Hoạt động của tôi” thực tế luôn nhận 422. `useQuery` có `retry: 1`; component không đọc `isError`, vì vậy summary cards hiện `0` và thẻ `Chủ đề bạn quan tâm` bị ẩn do `stats?.interests` falsy.

Gọi trực tiếp `get_my_stats(scope="me", days=7|30, ...)` (bypass validation) trả số liệu đúng như mục 4. Điều này chứng minh lỗi nằm ở lớp validation của endpoint, không phải SQL tổng.

Response `interests` khi gọi trực tiếp có đủ:

`days, personal_documents, read_views, read_documents, opened_from_search, subjects, faculties, tags`; mỗi phần tử `subjects/faculties/tags` có đủ `name, personal_documents, read_views, read_documents, opened_from_search`. Tuy nhiên `backend/app/schemas/activity.py:48` khai báo `interests: Optional[dict] = None`, nên OpenAPI/Schema **không** enforce hợp đồng này (RISK).

Trường hợp không có hoạt động (user 3) trả `200` với `personal_documents=0`, `read_views=0`, `read_documents=0`, `opened_from_search=0`, `subjects=[]`, `faculties=[]`, `tags=[]`; không có 500 (PASS). Frontend có nhánh “Chưa có hoạt động đọc…” ở `StatsPage.tsx:146-147`, nhưng do lỗi 422 ở trên nên nhánh này không tới được trong luồng HTTP hiện tại.

---

## 4. Bảng đối chiếu dữ liệu fixture và response

Fixture chính (user A = id 1, user B = id 2, user C = id 3):

- Cá nhân owner A: 101 (3 logs/7d, 2 search), 102 (0), 103 (1), 106 (40d), 107 (10d), 108 (8d), 109 (7d+2h), 110 (3 logs, action gồm `view` legacy), 112 (chỉ B đọc), 113 (2, 1 search), 104 (public của A, 2 logs), 105 (deleted, 2 logs).
- Nhóm: 201/202/203/204 trong G1 (A còn membership), 205 trong workspace đã xóa, 211 trong G2 (A đã rời), 221 trong G3 (A là owner nhưng không có membership row), 231/232 trong G4 (A membership).
- Tags: cá nhân `AI` (id 1,3), `CSDL`, `Temp`; G1/G2/G3/G4 có các tag `AI` riêng; doc 231 có **hai tag id 9 và 10 cùng tên `AI`**.
- Logs: có download (`DOCUMENT_DOWNLOADED`) và lượt đọc bởi user B; có hoạt động 40d/10d/8d/7d+2h.

SQL đối chiếu tổng (rút gọn):

```sql
WITH visible AS (
  SELECT d.id,d.subject_id,d.owner_id,d.workspace_id
  FROM documents d
  WHERE NOT d.is_deleted AND NOT coalesce(d.is_public,false)
    AND ((d.workspace_id IS NULL AND d.owner_id=1)
      OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id=d.workspace_id
        AND w.type='group' AND NOT w.is_deleted AND
        (w.owner_id=1 OR EXISTS (SELECT 1 FROM workspace_members m
          WHERE m.workspace_id=w.id AND m.user_id=1))))
), reads AS (
  SELECT dl.document_id,count(*) views,
         count(*) FILTER (WHERE dl.extra_data->>'source'='search') search_views
  FROM download_logs dl
  WHERE dl.user_id=1 AND dl.action IN ('DOCUMENT_VIEWED','view')
    AND dl.created_at >= now() - interval '<7|30> days'
  GROUP BY dl.document_id
)
SELECT ... FROM visible d LEFT JOIN reads r ON r.document_id=d.id
WHERE (d.workspace_id IS NULL AND d.owner_id=1) OR r.views>0;
```

| Metric | SQL tay 7 ngày | `get_my_stats(days=7)` | SQL tay 30 ngày | `get_my_stats(days=30)` | Kết luận |
|---|---:|---:|---:|---:|---|
| `personal_documents` | 10 | 10 | 10 | 10 | PASS |
| `read_views` | 14 | 14 | 17 | 17 | PASS |
| `read_documents` (distinct) | 8 | 8 | 11 | 11 | PASS |
| `opened_from_search` (distinct doc) | 3 | 3 | 3 | 3 | PASS |
| `scope=my_documents` → `interests` | `null` | `null` | — | — | PASS |

Chi tiết subject/faculty ở 7 ngày:

| Nhóm | `personal_documents` | `read_views` | `read_documents` | `opened_from_search` |
|---|---:|---:|---:|---:|
| Cơ sở dữ liệu | 6 | 9 | 5 | 3 |
| Kinh tế phát triển | 2 | 4 | 2 | 0 |
| Chưa phân loại | 2 | 1 | 1 | 0 |

Faculty có cùng số liệu với subject tương ứng: `Công nghệ thông tin` 6/9/5/3, `Kinh tế` 2/4/2/0, `Chưa phân loại` 2/1/1/0. Ở 30 ngày, `Cơ sở dữ liệu` tăng lên 6/11/7/3 và `Chưa phân loại` 2/2/2/0 do doc 107/108/109 vào cửa sổ.

Các trường hợp biên đã đối chiếu:

- 101 đọc 3 lần → `read_views += 3`, `read_documents += 1`; lặp không tăng số document.
- 111 (private của B) có 2 logs của A nhưng bị loại bởi điều kiện visible → không tính; API `/documents/111` trả 403 và không ghi log mới.
- 112 do B đọc, không phải A → không vào thống kê A.
- 106/107/108/109: ngoài 7d; 106 ngoài cả 30d; 107/108/109 vào 30d. Đúng kỳ vọng.
- 2 logs `DOCUMENT_DOWNLOADED` không làm tăng `read_views`.
- 204 public của G1 có log của A nhưng bị loại; 205 (workspace xóa), 211 (A rời nhóm) bị loại.
- 221 (A là owner, không có membership row) vẫn tính: 1 view. SQL và code nhất quán ở điểm này.
- Tag `Temp` biến mất khi xóa tag 12 và trở lại khi khôi phục; doc 113 xóa mềm làm giảm đúng 2 views/1 doc; xóa workspace 10 làm giảm đúng 2 views/1 doc của G1.

**Bất thường tag (FAIL):** cùng fixture 7 ngày, API trả tag `AI` = `read_views 12`, `read_documents 8`; đếm đúng theo `(tag_id, document_id)` thì `AI` có 11 lượt và 7 document khác nhau. Nguyên nhân doc 231 gắn đồng thời tag id 9 và 10 đều tên `AI`, nên hai row cùng document bị cộng hai lần. Tổng toàn cục `read_documents=8` vẫn đúng (đây là điểm prior report nhấn mạnh), nhưng số liệu **theo tag** sai.

**Bất thường public (FAIL trung bình):** doc 104 là public nhưng do A sở hữu và A có quyền; nó được tính vào `total_uploads=12` nhưng bị điều kiện `NOT coalesce(d.is_public,false)` ở `stats.py:161` loại khỏi `personal_documents=10` và khỏi 2 lượt đọc (1 search). Nếu sản phẩm cố ý tách “kho cá nhân” và “kho cộng đồng”, cần ghi rõ trong UI/contract; hiện tại hai số cùng trang không giải thích được.

---

## 5. Kết quả kiểm tra quyền cá nhân/nhóm

| Trường hợp | API detail | Ảnh hưởng tới stats | Đánh giá |
|---|---|---|---|
| A đọc private doc 111 của B | 403 `Không có quyền truy cập tài liệu này` | Không log mới; SQL loại | PASS |
| C (không membership) đọc 201 của G1 | 403 `Bạn không phải thành viên của nhóm này` | Không log mới | PASS |
| A đọc 211 sau khi rời G2 | 403 | Không log mới | PASS |
| A đọc 205 trong workspace đã xóa | 404 `Không tìm thấy nhóm` | Không log mới | PASS |
| A đọc public doc 104 của chính A | 200, trả `DocumentOut` có `content` | stats vẫn loại khỏi interests | Xem mục 4 |
| A đọc 221 (owner G3, không có member row) | 200 | Tính 1 view | PASS |

Thử nghiệm chuyển trạng thái membership G4 (xóa rồi khôi phục `workspace_members` cho A) cho thấy khi rời nhóm, `personal_documents/read_views/read_documents/opened_from_search` giảm đúng phần của doc 231/232, và subject/faculty/tag lấy từ G4 biến mất; khôi phục membership thì trở lại. Cross-scope tag attachments `(101,5)` và `(201,1)` bị loại bởi `t.workspace_id IS NOT DISTINCT FROM d.workspace_id` — điều này đúng cho dữ liệu legacy, nhưng **sai cho chuẩn workspace_tags hiện tại** (xem mục 10, F2).

Câu SQL tiềm ẩn rủi ro:

```sql
JOIN tags t ON t.id=dt.tag_id AND t.workspace_id IS NOT DISTINCT FROM d.workspace_id
```

Với `workspace_tags` chuẩn, `tags.workspace_id` luôn `NULL`; tag G1 tạo qua API không bao giờ thỏa điều kiện trên khi `d.workspace_id=10`, nên bị bỏ qua. Đây không phải lộ dữ liệu, mà là thiếu dữ liệu.

---

## 6. Kết quả kiểm tra `from_search`

Luồng tĩnh:

- `SearchResultCard.tsx:26-29`: chỉ nối `from_search=1` cho `personal_doc` và `group_doc`; folder không nối. URL có citation vẫn nối đúng bằng `&`.
- `useDocumentDetail.ts:55,90`: đọc flag và đưa vào `queryKey`, nên refetch cùng flag vẫn gửi lại flag.
- `documentService.getById` và `groupService.getDocument` luôn truyền `params.from_search` (false hoặc true).
- `documents.py:515,567-569` và `groups.py:267,320-322`: bool query, ghi 1 `DOCUMENT_VIEWED` với `extra_data={"source":"search"}` khi true, `deduplicate_window_minutes=0`.

Kết quả gọi API thật trên fixture:

| Hành động | Log tạo ra | Đánh giá |
|---|---|---|
| `/documents/101?from_search=1` | +1 `DOCUMENT_VIEWED`, `workspace_context=personal`, `source=search` | PASS |
| Gọi lại `/documents/101?from_search=1` | +1 log search nữa | Không dedup |
| `/documents/101` (direct) | +1 log `source=null` | PASS |
| `/groups/10/documents/201?from_search=1` | +1 log `workspace_context=group`, `workspace_id=10`, `source=search` | PASS |
| Gọi lại group detail | +1 log search nữa | Không dedup |
| Các request 403/404 ở mục 5 | Không log | PASS |

`opened_from_search` đếm theo document có ít nhất một log search nên vẫn ổn định (3 trong fixture), nhưng `read_views` tăng theo mỗi reload/refetch. Đây là rủi ro đã được prior report nhắc là để Phase 6; Phase 5 yêu cầu ghi rõ ảnh hưởng — báo cáo này ghi nhận tại F5. `extra_data.source` không bị dữ liệu khác ghi đè trong các ca đã thử.

Hai endpoint được yêu cầu riêng:

- `GET /documents/{id}?from_search=true`: 200, `source=search`; `from_search=1` cũng được FastAPI parse là true.
- `GET /groups/{group_id}/documents/{id}?from_search=true`: 200, `source=search`, context group.

Hạn chế luồng: `SearchBar` quick-search (`handleSelect` → `navigate(url)`) không gắn flag, nên các lượt mở từ quick-search không được gán nhãn search (RISK/INFO). Ngoài ra, mở doc nhóm qua `/documents/{id}` (không phải route group) ghi `workspace_context=personal`, `workspace_id=null` dù stats vẫn đếm doc theo workspace; log context bị sai (INFO).

---

## 7. Kết quả frontend build

Lệnh: `cd frontend/digital-library && npm run build` → **exit 0**, `✓ built in 781ms`.

Cảnh báo duy nhất: chunk `index-D54zDGWQ.js` 2.779,68 kB (gzip 796,34 kB) và vài chunk > 500 kB — cảnh báo có từ trước, không phải lỗi Phase 5.

Đọc mã UI:

- Bộ chọn scope “Hoạt động của tôi” / “Tài liệu của tôi” set đúng `scope`.
- Select 7/30 ngày set đúng `days` và query key [`my-stats`, `scope`, `days`]; đổi days làm đổi key → refetch có chủ đích, không phải render loop. Không thấy effect gây request lặp bất thường khi chỉ đổi tab/render lại (code-level).
- `stats.interests` chỉ render khi truthy; `interests=null` hoặc 422 làm **ẩn hoàn toàn** thẻ chủ đề. Không có UI `isError/error` (FAIL nhỏ).
- Biểu đồ vẫn cố định 30 ngày (`activity_by_day` luôn 30 ngày) dù selector đổi 7/30 — INFO.
- “Tài liệu của tôi” không đọc `days`/`interests`; response vẫn 200 ở scope này.

Không có bằng chứng browser thật do mục 11.

---

## 8. Kết quả test

Lệnh được yêu cầu:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest \
  backend/tests/test_phase5_interest_counts.py \
  backend/tests/test_schema_sync_shares_and_community_stats.py \
  backend/tests/test_document_insights.py -q
```

→ **33 passed, 12 warnings** trong 1.29s. Warnings là `on_event` deprecated của FastAPI, không liên quan Phase 5.

Bộ test bổ sung do agent thêm trong thư mục temp (không commit) bao phủ API validation, từng nhóm ngày, permissions, from_search, membership transitions, cross-scope tag, soft delete, empty user → **26 passed**.

`git diff --check` → exit 0.

Đánh giá coverage: `backend/tests/test_phase5_interest_counts.py` **chỉ test hàm `_topic_rows`** với 3 row giả. Không có test nào trong repo kiểm tra endpoint `days=7|30`, SQL thật, permission, from_search log, hay UI. Vì vậy 33 passed **không** đủ để kết luận Phase 5 đạt (MISSING).

---

## 9. Kết quả hiệu năng

Dựng DB `phase5_perf`: 10.000 documents (5.000 cá nhân, 5.000 G1, 1.000 G2 đã rời), 40 tags, 11.000 document_tags, 150.000 `DOCUMENT_VIEWED` logs trong 30 ngày. Để phản ánh schema thực, agent đã đọc catalog index của Neon (chỉ đọc) và tạo tương đương trên DB local: `ix_download_logs_user_id_created_at`, `ix_download_logs_document_id_created_at`, `ix_documents_owner_workspace_created`, `ix_documents_workspace_created`, `ix_document_tags_tag_document`, v.v. **Không đổi migration**.

`EXPLAIN (ANALYZE, BUFFERS)` (log: `explain-perf.log`):

| Truy vấn | Execution Time | Điểm đáng chú ý |
|---|---:|---|
| Subject/faculty (`visible` + `reads` CTE) | 14.522 ms | Dùng `Bitmap Index Scan on ix_download_logs_user_id_created_at` (22.923 rows), **không full scan** download_logs; `Seq Scan documents` 10.000 rows do filter owner/membership; `HashAggregate` 9.600 nhóm |
| Tag query | 46.792 ms | 10.000 document-tag rows → `Nested Loop Left Join` 10.000 lần vào `ix_download_logs_document_id_created_at`, tạo 22.069 row trước `GroupAggregate`; buffers shared hit 61.415; có nhân bản row do tag |

Đếm câu lệnh trong một lần `get_my_stats(scope="me", days=7)` bằng SQLAlchemy event: **7 statements** (1 uploads, 2 totals, 1 recent, 1 by_day, 1 subject/faculty, 1 tags), elapsed **212,1 ms** trên fixture lớn. Kết quả: `personal_documents=5000`, `read_views=20804`, `read_documents=8735`, `opened_from_search=6437`, 10 subjects, 40 tags.

Đánh giá:

- Có index phù hợp trên `download_logs` theo `(user_id, created_at)` và `(document_id, created_at)` trong schema thực; **không có full scan** download_logs. Không có bằng chứng để thêm index mới ngay.
- Vấn đề hiệu năng nằm ở tag query: mỗi document-tag row thực hiện một index lookup và bị nhân bản trước khi group. Với dữ liệu thật lớn hơn hoặc document có nhiều tag, chi phí tăng tuyến tính theo số cặp `(document, tag)`. Nên gom `reads` dùng chung rồi join với danh sách `(document_id, tag_id)` đã distinct, thay vì join logs trực tiếp 10.000 lần (RISK).
- `Seq Scan documents` trên fixture lớn là do planner chọn khi phải evaluate membership; remote đã có index tổng hợp. Chưa đề xuất migration mới.

---

## 10. Danh sách lỗi theo mức độ nghiêm trọng

| ID | Mức | Phân loại | Phát hiện | Bằng chứng | Tác động |
|---|---|---|---|---|---|
| F1 | **Critical** | **FAIL** | `days: Literal[7,30]` trong query param khiến `days=7` và `days=30` đều trả 422 | `stats.py:30`; ASGI test mục 3; frontend luôn gửi `days` | Tính năng chính không dùng được qua HTTP; thẻ interests bị ẩn, summary hiện 0 |
| F2 | **High** | **FAIL** | Tag workspace chuẩn (`workspace_tags`, `tags.workspace_id=NULL`) bị loại bởi join `t.workspace_id IS NOT DISTINCT FROM d.workspace_id` | `stats.py:193`; `workspace_tag_service.py:88-107`; migration d9e...; thử nghiệm tag 50 chỉ hiện khi set legacy `tags.workspace_id=10` | Tag nhóm tạo qua UI/API không xuất hiện trong thống kê |
| F3 | **High** | **FAIL** | Nhóm tag theo `name` làm trộn tag cá nhân/nhóm cùng tên và đếm trùng tag id khác nhau trên cùng doc | `stats.py:204-206`; AI trả 12 views/8 docs thay vì 11/7 | Số liệu từng tag sai; vi phạm yêu cầu “tag không bị trộn” |
| F4 | **Medium** | **FAIL** | Public doc do chính user sở hữu bị loại khỏi interests nhưng vẫn vào `total_uploads` | `stats.py:161`; doc 104: 12 uploads vs 10 personal docs | Thiếu 2 lượt đọc/1 doc; số liệu trong cùng trang không nhất quán |
| F5 | **Medium** | **RISK** | `from_search` là flag URL, không consume một lần, `deduplicate_window_minutes=0` | validation log: mỗi reload thêm 1 log; `opened_from_search` vẫn ổn | `read_views` phình khi reload/refetch; đây là hành vi đã biết nhưng chưa được test/contract hóa |
| F6 | **Medium** | **RISK** | `interests: Optional[dict]` không enforce schema | `activity.py:48` | Frontend type hand-written có thể lệch OpenAPI; không có validation field bắt buộc |
| F7 | **Medium** | **MISSING** | Test repo chỉ phủ `_topic_rows` | `test_phase5_interest_counts.py` 13 dòng | Không có regression cho F1–F4 |
| F8 | **Medium** | **MISSING** | Chưa có UI error state khi API 422 hoặc `interests=null` | `StatsPage.tsx:63-66,129` không dùng `isError` | Người dùng thấy số 0 và không biết lỗi |
| F9 | **Low** | **RISK** | Quick-search `SearchBar` không gắn `from_search=1` | `SearchBar.tsx:67` | Một phần lượt mở từ tìm kiếm không được gán nhãn search |
| F10 | **Low** | **INFO** | Mở group doc qua `/documents/{id}` ghi log `personal` | validation log doc 221/201 | `opened_from_search` vẫn đúng; log context sai gây khó debug/phân tích sau này |
| F11 | **Low** | **INFO** | `activity_by_day` luôn 30 ngày; selector chỉ đổi interests | `stats.py:121-153`, `StatsPage.tsx:194` | Có thể gây hiểu nhầm khi chọn 7 ngày |
| F12 | **Low** | **RISK** | Tag query nhân bản 10.000 → 22.069 row; 7 query/request | `explain-perf.log`, `query_count.py` | 212 ms ở 10k docs/150k logs; tăng theo số tag/doc |

Các điểm **PASS** đáng ghi nhận: đếm lượt đọc/distinct document, lọc action download, cửa sổ 7/30 ngày khi gọi trực tiếp, phân quyền private/member/left/deleted, owner không membership, “Chưa phân loại”, không 500 với user rỗng, build thành công, `git diff --check` sạch.

---

## 11. Các tiêu chí còn thiếu bằng chứng

1. **Browser thật**: không có stack frontend+backend authenticated chạy sẵn trong môi trường review; không click được nút 7/30, không quan sát request/response trên network tab, không chụp được trạng thái “chưa có hoạt động”. Kết luận UI dựa trên build + đọc mã + HTTP ASGI.
2. **Subject dangling / subject không faculty**: thử tạo `subject_id=999` bị FK `documents_subject_id_fkey` chặn; thử `faculty_id=NULL` bị `NOT NULL` chặn. Không thể tạo ca này trong schema hiện tại; nhánh `LEFT JOIN … or "Chưa phân loại"` chỉ được suy luận từ code, không đo trực tiếp.
3. **Dữ liệu Neon thật**: chỉ đọc catalog index; không chạy `EXPLAIN` hay đối chiếu số liệu trên dữ liệu production. Hiệu năng là synthetic.
4. **End-to-end browser `from_search`**: đã kiểm tra source + API log, chưa kiểm tra click thật trên `SearchResultCard` và reload trang trong browser.
5. **UI error/null interests**: chưa có mock 422/`interests=null` trong browser; chỉ có bằng chứng code-level.
6. **Duplicate tag qua luồng UI chuẩn**: tag cá nhân có check 409 khi tạo, tag workspace không có check tên trùng; thử nghiệm chèn tag trùng bằng SQL. Chưa đi lại luồng UI để xác nhận tần suất phát sinh trong dữ liệu thực.

---

## 12. Kết luận

**Chưa đạt Phase 5.**

Lý do chính: endpoint theo đúng hợp đồng (`days=7` và `days=30`) trả 422, trong khi frontend luôn gửi `days`; người dùng không thể thấy phần “Chủ đề bạn quan tâm”. Ngoài ra, tag workspace theo chuẩn hiện tại bị bỏ sót và tag cùng tên/đếm trùng làm sai số liệu chủ đề. Build, 33 test hiện có và `git diff --check` đạt **không đủ** để bù các lỗi chức năng này.

Có thể chuyển sang “Đạt có điều kiện” sau khi sửa F1–F4, bổ sung test integration cho F1–F4 và có ít nhất một lần verify browser cho selector 7/30 + empty state.

---

## 13. Khuyến nghị sửa cụ thể cho từng lỗi

> Agent **không** áp dụng các thay đổi này trong lần review; đây là đề xuất có file/nguyên nhân/test xác nhận.

| ID | File | Nguyên nhân | Thay đổi đề xuất | Test xác nhận |
|---|---|---|---|---|
| F1 | `backend/app/routers/stats.py:30` | `Literal[int]` không parse query string | Đổi thành `days: int = Query(30)` rồi `if days not in (7, 30): raise HTTPException(status_code=422, detail="days must be 7 or 30")`, hoặc dùng `Enum(str)` rồi `int(days)`. Agent đã prototype kiểu `int + HTTPException`: default→200, 7→200, 30→200, 14→422, `x`→422 | ASGI test: `?days=7` và `?days=30` → 200 + `interests.days` đúng; `?days=14`, `?days=x` → 422 |
| F2 | `backend/app/routers/stats.py:188-203` | Chỉ dùng legacy `tags.workspace_id` | Nối thêm `EXISTS (SELECT 1 FROM workspace_tags wt WHERE wt.workspace_id=d.workspace_id AND wt.tag_id=t.id)` cho doc nhóm; giữ fallback `t.workspace_id=d.workspace_id` cho legacy. Điều kiện đề xuất: `(d.workspace_id IS NULL AND t.workspace_id IS NULL) OR (d.workspace_id IS NOT NULL AND (t.workspace_id=d.workspace_id OR EXISTS(...)))` | Tạo tag qua `WorkspaceTagService.create_workspace_tag`, gắn vào doc G1, gọi stats → tên tag xuất hiện; không cần set `tags.workspace_id` |
| F3 | `backend/app/routers/stats.py:204-206` | Group theo `name`, inner group theo doc dễ trùng | Tính một row duy nhất cho mỗi `(scope, tag_id, document_id)` (scope = `personal` hoặc `group:<workspace_id>`), rồi outer group theo `(scope, tag_id, name)`. Không cộng cùng document hai lần nếu doc có nhiều tag id cùng tên/trùng tên | Fixture doc 231 (tag 9+10 cùng `AI`): AI phải 11 views/7 docs thay vì 12/8; tag cá nhân `AI` và tag G1 `AI` phải là hai dòng riêng |
| F4 | `backend/app/routers/stats.py:161` | Loại public doc ngay cả khi user là owner | Với personal doc: bỏ điều kiện public, giữ `workspace_id IS NULL AND owner_id=:uid`. Với group doc: giữ membership/owner check và định nghĩa rõ public nhóm có tính hay không | Doc 104 phải vào `personal_documents` và 2 lượt đọc; private doc của user 2 vẫn bị loại; `total_uploads` và `personal_documents` giải thích được sự khác biệt (nếu vẫn khác) |
| F5 | `documents.py`, `groups.py`, `useDocumentDetail.ts`, `StatsPage.tsx` | Flag URL không consume; refetch ghi log | Ngắn hạn: thêm test ghi rõ“reload → +1 log” và hiển thị chú thích UI. Dài hạn: token một lần (sessionStorage + query param) hoặc dedupe có cửa sổ theo `(user, document, source)`; cần quyết định sản phẩm vì prior report từng chủ động bỏ dedupe | Test: mở search 1 lần → 1 log search; reload cùng tab → không tăng (nếu dùng token) hoặc tăng đúng số reload kỳ vọng (nếu giữ thiết kế hiện tại) |
| F6 | `backend/app/schemas/activity.py:48` | `Optional[dict]` | Tạo `InterestTopicOut` (5 field) và `InterestsOut` (8 field), set `interests: Optional[InterestsOut] = None`; synchronized `frontend/src/types/activity.ts` | Test mở OpenAPI/schema: các field required có mặt; response valid/invalid bị Pydantic bắt |
| F7 | `backend/tests/test_phase5_interest_counts.py` | Chỉ test `_topic_rows` | Thêm integration tests dùng Postgres fixture: API 7/30/14, totals, permissions, rời nhóm, public, duplicate tag, workspace tag, empty user, from_search log | Chạy lại lệnh pytest mục 8, kỳ vọng >33 passed và các test mới đỏ trước khi sửa F1–F4 |
| F8 | `frontend/digital-library/src/pages/stats/StatsPage.tsx:63-66,129` | Không xử lý `isError` | Destructure `isError, error`; render card lỗi có nút retry; khi `stats.interests === null` vẫn render thẻ với empty state thay vì ẩn hoàn toàn | Mock API 422 và mock `interests:null` trong browser/Test; kiểm tra có thông báo và không còn summary = 0 im lặng |
| F9 | `frontend/digital-library/src/components/shared/layout/SearchBar.tsx:67` | Quick-search navigate thẳng URL | Khi `item.url` là document, nối `from_search=1` giống `SearchResultCard` | Click quick-search → URL có flag → log `source=search` |
| F10 | `documents.py` detail handler | Log cứng `workspace_context="personal"` | Suy ra context từ `doc.workspace_id` hoặc truyền context từ route group vào helper log | Mở group doc qua `/documents/{id}` → log `workspace_context=group`, `workspace_id` đúng |
| F11 | `StatsPage.tsx`, `stats.py` | Selector chỉ đổi interests | Ghi rõ trong UI “bộ lọc 7/30 ngày áp dụng cho chủ đề quan tâm” hoặc cho `days` ảnh hưởng cả chart nếu yêu cầu sản phẩm | Browser: chọn 7 ngày → nhãn/chart khớp kỳ vọng |
| F12 | `backend/app/routers/stats.py:158-203` | Join logs lặp theo từng document-tag | Dùng chung CTE `reads(document_id, views, search_views)` cho subject và tag; với tag, join `reads` vào bảng `(document_id, tag_id)` đã distinct rồi group. Đo lại trước khi đề xuất index mới | `EXPLAIN (ANALYZE, BUFFERS)` sau sửa: giảm số loop/index search trên download_logs; request vẫn 7 query hoặc ít hơn, thời gian không tăng trên fixture lớn |

Không có thay đổi production code nào được thực hiện trong review này; do đó không có mục “fix đã áp dụng + test xác nhận” ngoài prototype validation tạm thời nêu ở F1.

---

## 14. Kết quả xử lý của Codex sau review

Ngày xử lý: 28/11/2026.

Codex đã đối chiếu và sửa F1–F4, F6, F8–F10 trong phạm vi API và UI hiện có:

- F1: đổi `days` sang query integer có kiểm tra tập `{7, 30}`. HTTP test xác nhận 7/30 trả 200; 14 và chuỗi sai trả 422.
- F2: thống kê tag nhóm nhận mapping chuẩn từ `workspace_tags` và vẫn hỗ trợ `tags.workspace_id` legacy.
- F3: tag được nhóm theo phạm vi cá nhân hoặc từng workspace, không trộn tag cùng tên giữa các kho và khử trùng cùng tên trên một tài liệu. Response tag bổ sung `scope` và `workspace_id` để UI giải thích nguồn.
- F4: tài liệu public do chính user sở hữu được tính trong tài liệu cá nhân và hoạt động đọc.
- F6: thay `Optional[dict]` bằng `InterestsOut` và `InterestTopicOut` có kiểu rõ ràng.
- F8: UI có thông báo lỗi, nút thử lại và trạng thái thiếu dữ liệu.
- F9: quick-search gắn `from_search=1` cho kết quả tài liệu.
- F10: khi tài liệu nhóm được mở qua route `/documents/{id}`, log dùng context nhóm và workspace ID thực tế.

Xác minh sau sửa:

- 35 backend tests passed.
- Frontend production build passed.
- `git diff --check` passed.
- Chạy lại ASGI API trên PostgreSQL fixture `phase5_review`: `days=7` và `days=30` trả 200; các giá trị 0/1/14/31/90/x trả 422; user rỗng trả bộ đếm 0; `scope=my_documents` giữ `interests=null`; quyền private và nhóm tiếp tục trả 403 đúng trường hợp.
- Trên fixture thật, response đã tách `AI` cá nhân và `AI` của từng workspace; tag `Docker` thuộc workspace xuất hiện qua mapping chuẩn; tài liệu public của chủ sở hữu làm số `personal_documents` tăng đúng một tài liệu.

F5 vẫn là quyết định sản phẩm: tải lại trang chi tiết được tính là một lượt đọc mới. `opened_from_search` đếm số tài liệu khác nhau nên không tăng khi tải lại cùng tài liệu. F11 chỉ ảnh hưởng cách hiểu selector và F12 là tối ưu hiệu năng tiếp theo; chúng không chặn contract Phase 5 sau khi F1–F4 đã được sửa. Vẫn cần một lượt thao tác trình duyệt trên ứng dụng đang chạy để chốt nghiệm thu giao diện.
