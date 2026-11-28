# Kế hoạch giao OpenCode — preview và tóm tắt tài liệu

Ngày giao: 27/11/2026  
Model ưu tiên: DeepSeek V4.1 Flash  
Công cụ: Graphify để lần luồng code, Ponytail để chọn thay đổi nhỏ nhất đáp ứng đủ contract

## 1. Tài liệu bắt buộc đọc

1. `docs/99-luu-tru/ke-hoach/AI-Vector/yeu-cau-preview-va-tom-tat-tai-lieu.md`
2. `frontend/AGENTS.md`
3. `frontend/docs/design/DESIGN_SYSTEM.md`
4. `frontend/docs/COMPONENTS.md`
5. `frontend/docs/SCREENS.md`
6. `docs/99-luu-tru/bao-cao/report-codex/phase-03-review-manual-feedback.md`

Graphify hiện có thể cũ hơn các file Phase 03. Dùng graph để tìm luồng nền, sau đó đối chiếu trực tiếp code hiện tại. Không rebuild graph nếu không cần.

## 2. Nguyên tắc bắt buộc

- Sửa các API hiện có. Không tạo endpoint preview hoặc summary mới.
- Không thêm cột DB, migration, bảng cache hoặc dependency.
- Không trả `documents.content` trong response danh sách cá nhân và nhóm.
- API detail vẫn trả full `content`.
- Preview phải được tải theo lô cho tài liệu của trang hiện tại. Không query từng document.
- Giữ nguyên phân quyền, pagination, sort, filter, checksum và active-run guard.
- Không sửa các file dirty ngoài phạm vi.
- Không chạy backfill hoặc worker trên toàn kho.

## 3. Task OC-PREVIEW-01 — Contract danh sách

### Phạm vi file

- `backend/app/schemas/document.py`
- `backend/app/routers/documents.py`
- `backend/app/routers/groups.py`
- `backend/app/services/document_query_service.py`

### Công việc

1. Tạo schema `DocumentListOut` với các trường mà card, list, dashboard và picker thực sự dùng.
2. Thêm `preview_text: Optional[str] = None`.
3. Đổi `PaginatedDocuments.items` sang `list[DocumentListOut]`.
4. Giữ `DocumentOut` cho detail, upload, update và bundle children.
5. Đảm bảo response model của hai route danh sách tiếp tục là `PaginatedDocuments` tại đúng URL cũ.

### Kết quả bàn giao

- Ví dụ JSON response danh sách mới.
- Danh sách consumer đã kiểm tra.
- Khẳng định rõ trường nào bị loại khỏi list response.

## 4. Task OC-PREVIEW-02 — Truy vấn preview theo lô

### Phạm vi file

- `backend/app/services/document_query_service.py`
- Có thể thêm helper nhỏ trong cùng file hoặc `backend/app/services/evidence_text.py` nếu dùng chung việc chuẩn hóa văn bản.

### Công việc

1. Dùng `load_only` hoặc projection để query danh sách không nạp `Document.content` và `Document.search_vector`.
2. Giữ selectin load cho owner và tags đang cần.
3. Sau khi phân trang, lấy active run và preview của toàn bộ `doc_ids` bằng một query.
4. Summary preview lấy từ `document_index_runs.summary[*].text` theo thứ tự mảng.
5. Fallback chọn một active chunk hợp lệ. Ưu tiên heading tổng quan, sau đó ordinal.
6. Chuẩn hóa khoảng trắng, giới hạn 400 ký tự ở ranh giới câu hoặc từ.
7. Bundle và tài liệu chưa có active run trả `None`.
8. Không gọi provider embedding hoặc model sinh văn bản.

### Yêu cầu kiểm tra

- Inspect SQL hoặc query count để chứng minh không có N+1.
- Xác nhận active run phải có `r.is_active` và `r.checksum = d.checksum`.
- Xác nhận tài liệu của group khác không thể xuất hiện qua preview query.

## 5. Task OC-SUMMARY-01 — Một đoạn tóm tắt

### Phạm vi file

- `backend/app/services/evidence_text.py`
- `backend/app/services/evidence_search.py`
- `backend/app/routers/document_insights.py` nếu cần schema response rõ ràng
- `frontend/digital-library/src/types/ai.ts`

### Công việc

1. Sửa `GET /documents/{id}/summary` hiện có để trả thêm `text`.
2. Tạo `text` nhất quán ở cả cache hit và cache miss.
3. Nối câu theo thứ tự tài liệu thành một đoạn, chuẩn hóa khoảng trắng và loại câu trùng.
4. Giữ `items` và `coverage` để không phá nguồn trích dẫn và client cũ.
5. Không ghi vào `documents.description` và không thay schema DB.

### Contract bắt buộc

```ts
interface SummaryResponse {
  text: string;
  items: SummaryItem[];
  coverage: IndexCoverage;
}
```

## 6. Task OC-PREVIEW-03 — Frontend list/detail

### Phạm vi file chính

- `frontend/digital-library/src/types/document.ts`
- `frontend/digital-library/src/components/shared/documents/documentView.types.ts`
- `frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx`
- `frontend/digital-library/src/pages/personal/hooks/usePersonalDocuments.ts`
- `frontend/digital-library/src/pages/personal/components/PersonalDocumentsSection.tsx`
- `frontend/digital-library/src/pages/group/components/sections/GroupDocumentsSection.tsx`
- Các caller API danh sách bị TypeScript chỉ ra khi build

### Công việc

1. Tách type list response khỏi type detail để `content` chỉ thuộc detail.
2. Map `preview_text` xuyên suốt luồng cá nhân và nhóm.
3. Đổi `DocumentListItem.content` thành `preview_text`.
4. `DocumentDetailView` hiển thị trực tiếp preview, `line-clamp-4`.
5. Bỏ import và lời gọi `extractSummary` khỏi `DocumentDetailView`.
6. Giữ helper `extractSummary` nếu còn caller khác. Chỉ xóa khi `rg` xác nhận không còn dùng.
7. Rà dashboard, todo picker và modal chia sẻ vì chúng dùng chung API list.

## 7. Task OC-SUMMARY-02 — UI Mô tả và cache danh sách

### Phạm vi file chính

- `frontend/digital-library/src/components/shared/documents/DocumentDetail/DocumentDetail.tsx`
- `frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/AiSummarySection.tsx`
- `frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx`
- `frontend/digital-library/src/services/insightService.ts`

### Công việc

1. Hiển thị `summary.text` thành một đoạn văn trong tab Mô tả.
2. Giữ trạng thái loading, error, cached result, elapsed time và coverage.
3. Đưa phần xem nguồn vào thao tác phụ gọn. Không render từng summary item thành card trong luồng chính.
4. Hai nút tóm tắt hiện có tiếp tục gọi endpoint hiện tại.
5. Khi summary thành công, invalidate prefix danh sách cá nhân hoặc nhóm phù hợp để card nhận preview mới.
6. Không để kết quả hoặc lỗi của tài liệu cũ hiện sang tài liệu mới.

## 8. Thứ tự thực hiện

1. OC-PREVIEW-01
2. OC-PREVIEW-02
3. OC-SUMMARY-01
4. OC-PREVIEW-03
5. OC-SUMMARY-02
6. Kiểm tra tích hợp và viết báo cáo

Backend contract phải xong trước khi đổi frontend types. Không sửa song song các file mapping frontend vì chúng dùng chung type.

## 9. Kiểm tra bắt buộc

### Backend

- Chạy các test schema/list/query hiện có liên quan.
- Chạy test Phase 03 liên quan summary và permission.
- Thêm test hồi quy có giá trị cho:
  - list response không có `content` và có `preview_text`;
  - ưu tiên summary hơn chunk;
  - fallback chunk;
  - active checksum guard;
  - summary cache hit/miss đều có cùng `text`;
  - preview query không N+1.

### Frontend

- Chạy `npm run build` trong `frontend/digital-library`.
- Chạy `git diff --check` tại root.
- Kiểm tra TypeScript không còn truyền `content` từ list API vào `DocumentDetailView`.

### Đo hiệu quả

Chọn cùng user, bộ lọc, sort, `page=1`, `page_size=20`:

1. Ghi kích thước response trước khi sửa.
2. Ghi kích thước response sau khi sửa.
3. Ghi thời gian phản hồi ít nhất ba lần cho mỗi phiên bản hoặc p50/p95 nếu có script benchmark.
4. Ghi số query PostgreSQL của một request.
5. Không in token, API key hoặc toàn bộ nội dung tài liệu vào report/log.

## 10. Ma trận nghiệm thu thủ công

| Ca | Thao tác | Kết quả cần có |
|---|---|---|
| P01 | Mở kho cá nhân ở chế độ detail | Mỗi card có tối đa bốn dòng preview; response list không có content |
| P02 | Mở kho nhóm | Hành vi giống kho cá nhân, giữ quyền group |
| P03 | Tài liệu đã summary | Card dùng summary text |
| P04 | Tài liệu có chunk, chưa summary | Card dùng đoạn đại diện |
| P05 | Tài liệu pending/empty | Card hiện empty state, không lỗi |
| P06 | Nhấn Tóm tắt AI | Tab Mô tả hiện một đoạn văn |
| P07 | Quay lại danh sách | Preview mới xuất hiện sau refetch |
| P08 | Mở DocumentDetail | OCR content đầy đủ vẫn hiển thị |
| P09 | Đổi file hoặc checksum | Preview cũ không còn được phục vụ |
| P10 | Rời nhóm | Không đọc được list, preview hoặc summary của nhóm |

## 11. Báo cáo OpenCode phải tạo

Lưu tại:

`docs/99-luu-tru/bao-cao/report-codex/opencode-preview-va-tom-tat-result.md`

Báo cáo gồm:

1. Yêu cầu đã nhận.
2. Giải pháp cuối cùng và quyết định kỹ thuật.
3. Quá trình thực hiện theo từng task.
4. Danh sách file đã sửa.
5. Contract API trước và sau.
6. Kết quả test/build/diff check.
7. Số đo response, thời gian và query count.
8. Ca chưa kiểm tra hoặc giới hạn còn lại.
9. Tự đánh giá hiệu quả.

Sau khi hoàn thành, cập nhật mục **Kết quả thực hiện** trong tài liệu đặc tả. Không ghi “hoàn thành” nếu chưa có số đo và chưa kiểm tra hai API cá nhân/nhóm.
