# OpenCode: sửa 3 điểm UI sau kiểm tra chéo Codex

Chỉ sửa frontend; dùng DeepSeek V4.1 Flash, Graphify + Ponytail như trước. Đọc `phase-03-review-manual-feedback.md` mục 6. Không sửa backend/DB/.env, giữ toàn bộ dirty worktree.

1. `SearchPage.tsx`: khi đổi câu hỏi, mode hoặc fields, không hiển thị `placeholderData` từ bộ lọc cũ dưới nhãn bộ lọc mới. Có thể bỏ placeholder hoàn toàn, hoặc giữ chỉ khi đổi trang trong cùng query/mode/fields. Kiểm tra chuyển từ semantic query có kết quả sang title-only không có kết quả: không xuất hiện kết quả/badge cũ trong lúc loading.
2. `AiSummarySection.tsx` + caller: nếu summary cached có items và lần bấm tải lại bị lỗi, hiển thị lỗi rõ **và vẫn giữ items/citations cached**. Nếu chưa có cached summary, chỉ hiện lỗi. Không ghi dữ liệu lỗi vào cache. Khi retry thành công, lỗi cũ biến mất.
3. `SearchResults.tsx`: khi semantic-only unavailable, không báo “Tìm thấy 0 kết quả”; thông báo đúng là chưa thực hiện được tìm kiếm theo nghĩa. Khi còn title/content, chỉ báo số kết quả tìm được qua các nhánh đã chạy.

Chạy `npm run build`, `git diff --check`. Ghi kết quả vào `docs/99-luu-tru/bao-cao/report-codex/opencode-phase03-final-ui-review-result.md`, nêu rõ chưa browser test nếu không có session. Sau khi xong, dừng; Codex sẽ kiểm tra khi người dùng thông báo.
