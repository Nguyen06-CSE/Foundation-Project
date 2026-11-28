# Giao OpenCode — hoàn thiện UI sau review Codex (27/11/2026)

Chỉ sửa frontend và báo cáo bàn giao. Đọc frontend/AGENTS.md, design docs bắt buộc; dùng Graphify có sẵn (graph cũ, đối chiếu code) + Ponytail. Model ưu tiên DeepSeek V4.1 Flash. Không sửa backend, .env, không chạy worker/backfill, không reset file dirty.

## A. Search filter và provenance — backend đã triển khai

GET /search/full có `match_fields` lặp key (title, content, semantic). Gửi bằng URLSearchParams.append hoặc axios serializer không có `[]`. Nhiều trường là OR giữa các nhánh. Mode cũ giữ tương thích; UI mới gửi fields tường minh. Keyword mặc định title+content; hybrid mặc định title+content+semantic. Người dùng có thể chọn từng trường; không cho submit lựa chọn rỗng. Đổi fields/query reset page=1, đưa fields vào queryKey và URL để refresh/back giữ đúng. Giữ quick-search hiện tại.

Schema đã có ở backend/app/schemas/search.py:

```ts
type SearchMatchField = 'title' | 'content' | 'semantic';
type SearchMatchMethod = 'lexical_title' | 'lexical_content' | 'semantic';
// item.match nullable/optional:
{ methods: SearchMatchMethod[]; title_rank?: number|null;
  content_rank?: number|null; semantic_rank?: number|null; fused_score?: number|null }
// response.unavailable_match_fields: SearchMatchField[]
```

Badge: lexical_title = “FTS · Tiêu đề”, lexical_content = “FTS · Nội dung”, semantic = “Theo nghĩa”. Render nhiều badge nếu nhiều methods; không có metadata thì không tự suy đoán. Hiển thị cảnh báo nếu semantic unavailable; semantic-only lỗi phải nói chưa tìm bằng nghĩa được, không nói không có tài liệu. Bỏ logic fallback 404 âm thầm đổi mode nếu làm mất field selection. Không sửa điểm/rank ở client.

## B. QA và summary — sửa đúng các phát hiện review

- QA thêm union status `not_ready`, trường index_status?: string. Hiển thị đang chờ lập chỉ mục/retry riêng với insufficient. Giữ vị trí hỏi đáp và nhãn “Hỏi đáp cùng AI”. Thời gian request hiển thị với cả thành công/lỗi.
- Tóm tắt chỉ render trong Mô tả, bỏ bản tóm tắt lặp trong tab hỏi đáp. Giữ manual description nguyên trạng. Button ngay dưới download và “Tóm tắt tự động AI” legacy cùng kích hoạt GET summary; chỉ navigate không đủ khi cache rỗng cũ. Có thể dùng query param intent được consume một lần, tránh vòng effect hoặc request trùng.
- `DocumentDetail.tsx`: hiện mutation catch rồi onSuccess setQueryData(null) cả khi lỗi — sửa không ghi cache khi lỗi; ưu tiên dữ liệu query cập nhật, tránh mutation result cũ che query mới vĩnh viễn. Truyền lỗi từ insights.summary.error, indexStatus.error lên UI. Bấm lại/loading phải không giữ thông báo lỗi cũ che kết quả mới.
- `useDocumentInsights`: khi run pending/retry chuyển ready, refresh summary/related/tags theo cách nhỏ nhất; không giữ data rỗng cache trước indexing. Nếu summary chỉ fetch theo nút thì legacy và nút mới phải hoạt động nhất quán.
- `insightService`: index/QA/summary 404 phải thành lỗi rõ không tìm thấy/không còn quyền, không nuốt thành empty; chunk stale vẫn giữ thông báo cũ phù hợp. Không hiện raw backend exception/token.
- Bảo đảm khi chuyển document đang request, không hiện answer/summary/thời gian của document trước.

## C. Validation và bàn giao

Đọc `phase-03-review-manual-feedback.md` để biết bằng chứng đã xác minh. Backend seed 1083 giờ ready; không tự xử lý lại. Chạy npm run build và git diff --check. Nếu có môi trường test frontend, kiểm tra field serialization, multi-badges, not_ready, summary legacy intent và error/cache; không tự thêm dependency chỉ để test. Nếu không có browser đăng nhập thì báo rõ chưa xác minh browser.

Ghi báo cáo riêng `docs/99-luu-tru/bao-cao/report-codex/opencode-phase03-followup-result.md`: file sửa, kiểm tra đã chạy, giới hạn, các ca cần Codex review. Không tự tuyên bố toàn Phase hoàn thành. Codex sẽ đọc khi người dùng thông báo OpenCode xong.
