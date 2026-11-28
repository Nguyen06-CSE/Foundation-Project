# Đặc tả preview và tóm tắt tài liệu

Ngày lập: 27/11/2026  
Trạng thái: Đã hoàn thành triển khai  
Phạm vi: Kho cá nhân và kho nhóm

## 1. Yêu cầu đề ra

### 1.1. Preview ở chế độ danh sách chi tiết

Chế độ `detail` trong thanh chọn cách hiển thị cần cho người dùng đọc trước khoảng bốn dòng nội dung của tài liệu ngay trên `DocumentDetailView`.

Hiện tại hai API danh sách `GET /documents/` và `GET /groups/{group_id}/documents/` trả toàn bộ `document.content` trong mỗi item. Cách này làm response tăng theo độ dài nội dung OCR và số tài liệu trên trang. Frontend tiếp tục truyền `content` qua nhiều lớp rồi mới cắt ngắn bằng `extractSummary`. Kho có nhiều tài liệu dài sẽ tốn băng thông, bộ nhớ và thời gian serialize dù giao diện chỉ dùng bốn dòng.

Việc mặc định lấy bốn dòng đầu cũng không đảm bảo chất lượng. Phần đầu tài liệu thường chứa bìa, tên đơn vị, mục lục, số trang hoặc thông tin xuất bản.

### 1.2. Tóm tắt trong phần Mô tả

Khi người dùng nhấn **Tóm tắt AI** hoặc **Tóm tắt tự động AI**, phần Mô tả cần hiển thị một đoạn văn bản tóm tắt mạch lạc từ nội dung chính của tài liệu. Giao diện không hiển thị danh sách nhiều thẻ tóm tắt.

Bản tóm tắt đã được cache trong `document_index_runs.summary`. Không tạo thêm cột trong bảng `documents` và không tạo endpoint mới.

### 1.3. Preview sau khi đã tóm tắt

Nếu active index run đã có summary, API danh sách dùng nội dung summary làm `preview_text`. Nếu chưa có summary, API chọn một đoạn đại diện từ `document_chunks` của active run. Nếu tài liệu chưa được lập chỉ mục hoặc không có đoạn phù hợp, `preview_text` là `null` và giao diện hiển thị trạng thái phù hợp.

## 2. Giải pháp được chọn

### 2.1. Sửa API danh sách hiện có

Giữ nguyên URL, bộ lọc, phân trang và phân quyền của hai API:

- `GET /documents/`
- `GET /groups/{group_id}/documents/`

Thay item schema của `PaginatedDocuments` từ `DocumentOut` sang `DocumentListOut`. Schema mới chỉ phục vụ response danh sách, giữ các trường card đang dùng, bỏ `content`, thêm:

```json
{
  "preview_text": "Docker image là khuôn mẫu chỉ đọc để tạo container..."
}
```

`GET /documents/{id}` và `GET /groups/{group_id}/documents/{id}` tiếp tục dùng `DocumentOut` và trả `content` đầy đủ cho màn hình chi tiết.

### 2.2. Không đọc `documents.content` trong truy vấn danh sách

`DocumentQueryService.query_documents` hiện chọn nguyên entity `Document`. Chỉ bỏ `content` khỏi response model chưa giải quyết được chi phí đọc dữ liệu từ PostgreSQL sang backend. Truy vấn danh sách phải dùng `load_only` hoặc projection để không nạp các cột text lớn không cần thiết, gồm ít nhất `content` và `search_vector`.

Sau khi phân trang, backend lấy preview cho `doc_ids` của đúng trang hiện tại bằng một truy vấn theo lô. Không gọi một query cho từng card.

### 2.3. Thứ tự chọn `preview_text`

Với mỗi tài liệu không phải bundle:

1. Lấy active `document_index_runs` có checksum trùng với `documents.checksum`.
2. Nếu `summary` có dữ liệu, nối các trường `text` theo thứ tự mảng thành một đoạn văn.
3. Nếu chưa có summary, chọn một `document_chunks.body` có nội dung rõ ràng.
4. Chuẩn hóa khoảng trắng và giới hạn tối đa 400 ký tự, ưu tiên kết thúc ở cuối câu. Nếu không có dấu kết thúc phù hợp thì cắt ở ranh giới từ và thêm `…`.
5. Bundle hoặc tài liệu chưa có active chunk trả `null`.

Đoạn đại diện ưu tiên heading có các từ `tóm tắt`, `tổng quan`, `giới thiệu`, `mục tiêu`, `overview`, `abstract`, `introduction`. Các đoạn quá ngắn, chỉ có tiêu đề, mục lục hoặc chuỗi ký hiệu bị loại. Khi không có heading ưu tiên, chọn chunk hợp lệ có ordinal nhỏ nhất. Đây là phép chọn xác định, chạy bằng PostgreSQL và không gọi embedding API.

### 2.4. Tóm tắt thành một đoạn văn

Sửa chính `GET /documents/{id}/summary`. Endpoint tiếp tục dùng quyền truy cập và cache hiện có. Response bổ sung `text`, là một đoạn văn được tạo bằng cách nối các câu đại diện trong `items` theo thứ tự tài liệu, chuẩn hóa khoảng trắng và loại câu trùng.

```json
{
  "text": "Đây là đoạn tóm tắt liền mạch của nội dung chính.",
  "items": [
    {
      "text": "Câu nguồn dùng để tạo tóm tắt.",
      "citation": {}
    }
  ],
  "coverage": {
    "state": "full",
    "unit": "section",
    "read": 9,
    "total": 9
  }
}
```

`items` vẫn được trả để giữ khả năng kiểm tra nguồn và tương thích với client hiện tại. Giao diện Mô tả chỉ hiển thị `text` thành một đoạn văn. Thông tin nguồn có thể đặt trong một thao tác phụ như **Xem nguồn**, không dựng mỗi câu thành một card.

Summary vẫn lưu trong `document_index_runs.summary`. Không ghi đè `documents.description`, vì trường này là mô tả do người dùng quản lý. Phần Mô tả sẽ hiển thị mô tả thủ công và đoạn **Tóm tắt AI** trong cùng tab.

### 2.5. Đồng bộ frontend

Kiểu `Document` dùng cho API chi tiết giữ `content`. Tạo `DocumentListItemResponse` hoặc tên tương đương cho API danh sách với `preview_text` và không có `content`.

Luồng dữ liệu cần đổi:

```text
API danh sách.preview_text
  → usePersonalDocuments / useGroupDocuments
  → DocCardType / DocumentListItem
  → DocumentDetailView
  → line-clamp-4
```

`DocumentDetailView` bỏ `extractSummary(doc.content, 600)` và hiển thị trực tiếp `doc.preview_text`. Sau khi tạo summary thành công, frontend invalidate query danh sách theo tài liệu hiện tại để khi quay lại card sẽ nhận preview mới:

- Kho cá nhân: prefix `['documents', 'personal']`
- Kho nhóm: prefix `['documents', 'group:{groupId}']`

## 3. Quá trình thực hiện dự kiến

### Bước 1. Chốt contract và tách schema response

- Tạo `DocumentListOut` trong `backend/app/schemas/document.py`.
- Đổi `PaginatedDocuments.items` thành `list[DocumentListOut]`.
- Thêm `preview_text: Optional[str]`.
- Giữ `DocumentOut` cho upload, update, children và detail.
- Không thêm migration hoặc cột DB.

### Bước 2. Tối ưu truy vấn danh sách

- Sửa `DocumentQueryService.query_documents` để không nạp `content` và `search_vector`.
- Sau khi có `items_rows`, lấy preview cho toàn bộ `doc_ids` bằng một query.
- Chỉ dùng active run có checksum hiện hành.
- Giữ nguyên quyền, bộ lọc, sort, pagination, bundle count và stats.
- Gán `preview_text` vào `DocumentListOut` trước khi trả response.

### Bước 3. Sửa tóm tắt hiện có

- Bổ sung hàm tạo đoạn `summary_text` trong `evidence_text.py` hoặc dùng trực tiếp kết quả `summarize` hiện tại.
- Sửa `evidence_search.summary` để cả cache hit và cache miss đều trả `text`, `items`, `coverage` với cùng contract.
- Không tạo route mới.
- Giữ kiểm tra active run, checksum và quyền hiện tại.

### Bước 4. Sửa kiểu dữ liệu và mapping frontend

- Thêm `preview_text` vào type response danh sách.
- Loại việc map `doc.content` ở kho cá nhân và kho nhóm.
- Thay `DocumentListItem.content` bằng `preview_text` cho luồng card danh sách.
- Kiểm tra dashboard, picker và modal đang dùng API danh sách vẫn hoạt động vì các màn hình đó không cần full content.

### Bước 5. Sửa giao diện

- `DocumentDetailView` hiển thị `preview_text` với `line-clamp-4`.
- Hiển thị “Đang chuẩn bị nội dung xem trước” nếu index đang chờ và chưa có preview. Nếu API không trả trạng thái index trên list, dùng câu trung tính “Chưa có nội dung xem trước”.
- `AiSummarySection` hiển thị `summary.text` trong một đoạn văn.
- Giữ loading, error, elapsed time và coverage hiện có.
- Sau summary thành công, invalidate đúng prefix query danh sách.

### Bước 6. Đối chiếu kết quả

- Xác nhận JSON của API danh sách không có trường `content`.
- Xác nhận API chi tiết vẫn có `content`.
- Xác nhận số query không tăng theo số tài liệu trên trang.
- Đo kích thước response cùng một trang trước và sau thay đổi.
- Đo p50/p95 hoặc tối thiểu ba lần thời gian phản hồi trên dữ liệu thật.
- Kiểm tra cá nhân, nhóm, tài liệu chưa index, tài liệu đã index, tài liệu đã summary và bundle.

## 4. Kết quả mong đợi

| Trường hợp | Kết quả |
|---|---|
| Tải danh sách 20–100 tài liệu | Response không chứa full OCR `content` |
| Tài liệu đã có summary | `preview_text` là phần đầu của đoạn summary |
| Tài liệu có chunk nhưng chưa summary | `preview_text` là đoạn đại diện, tối đa 400 ký tự |
| Tài liệu chưa index | `preview_text = null`, UI có empty state |
| Nhấn Tóm tắt AI | Tab Mô tả hiển thị một đoạn `summary.text` |
| Quay lại danh sách sau tóm tắt | Card nhận preview mới sau khi query được invalidate |
| Mở chi tiết | OCR content đầy đủ vẫn tải qua API chi tiết |

## 5. Tiêu chí nghiệm thu

1. Không có migration mới và không có cột `preview_text` trong bảng `documents`.
2. Không có endpoint preview mới.
3. Hai API danh sách cũ trả `preview_text` và không trả `content`.
4. Hai API detail cũ tiếp tục trả `content`.
5. Preview được lấy theo lô sau phân trang, không có N+1 query.
6. Preview không vượt quá 400 ký tự và UI giới hạn bốn dòng.
7. Summary xuất hiện dưới dạng một đoạn văn trong tab Mô tả.
8. Permission cá nhân và nhóm giữ nguyên.
9. Báo cáo triển khai ghi số đo response trước/sau, lệnh kiểm tra và giới hạn còn lại.

## 6. Kết quả thực hiện

Đã hoàn thành triển khai toàn diện ngày 27/11/2026. Báo cáo chi tiết xem tại:  
`docs/99-luu-tru/bao-cao/report-codex/opencode-preview-va-tom-tat-result.md`

### 6.1. File thực tế đã sửa

- **Backend**:
  - `backend/app/schemas/document.py`: Tách `DocumentListOut` (bỏ `content`, thêm `preview_text`), cập nhật `DocumentOut` và `PaginatedDocuments`.
  - `backend/app/services/evidence_text.py`: Bổ sung `build_summary_text` và `format_preview_text`.
  - `backend/app/services/evidence_search.py`: Chuẩn hóa API summary trả trường `text` liền mạch cho cả cache hit và miss.
  - `backend/app/services/document_query_service.py`: Thêm `defer` cho `content` và `search_vector`, truy vấn batch CTE lấy preview duy nhất O(1), không N+1 query.
  - `backend/tests/test_document_preview_and_summary.py`: Bộ kiểm thử mới với 9 test case bao phủ toàn bộ yêu cầu.
- **Frontend**:
  - `frontend/digital-library/src/types/document.ts` & `ai.ts`: Tách type list/detail, thêm `text` vào summary.
  - `frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx`: Xóa `extractSummary`, render trực tiếp `preview_text` với CSS `line-clamp-4`.
  - `frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/AiSummarySection.tsx`: Render `summary.text` thành đoạn văn liên tục kèm khối xem nguồn.
  - `frontend/digital-library/src/components/shared/documents/DocumentDetail/DocumentDetail.tsx`: Query invalidation đúng prefix cache cá nhân (`['documents', 'personal']`) và nhóm (`['documents', 'group:{groupId}']`).
  - Các components và hooks truyền dữ liệu: `usePersonalDocuments.ts`, `PersonalDocumentsSection.tsx`, `GroupDocumentsSection.tsx`, `SharedWithMe.tsx`, `DocumentCard.tsx`, `FileDocumentCard.tsx`.

### 6.2. Contract API sau cùng

- `GET /documents/` và `GET /groups/{group_id}/documents/`: Trả `PaginatedDocuments` với items là `DocumentListOut` chứa `preview_text: Optional[str]`, không chứa trường `content`.
- `GET /documents/{id}` và `GET /groups/{group_id}/documents/{id}`: Giữ nguyên `DocumentOut` trả đầy đủ toàn bộ trường `content`.
- `GET /documents/{id}/summary`: Trả `{"text": "...", "items": [...], "coverage": {...}}`.

### 6.3. Số đo trước và sau (page_size = 20, sort trending)

- **Kho Cá Nhân (User 11)**:
  - Payload Size: 29,214 bytes -> **24,944 bytes** (giảm 14.6%)
  - Latency p50: 839.11 ms -> **706.58 ms** (giảm 15.8%)
  - Latency trung bình: 1,282.48 ms -> **683.85 ms** (giảm 46.7%)
  - Query count: 6 queries -> **7 queries** (thêm đúng 1 query CTE batch cho 20 documents, O(1), không N+1).
- **Kho Nhóm (User 11, Workspace 22)**:
  - Payload Size: 29,212 bytes -> **24,916 bytes** (giảm 14.7%)
  - Latency p50: 825.60 ms -> **664.56 ms** (giảm 19.5%)
  - Latency trung bình: 912.30 ms -> **662.58 ms** (giảm 27.4%)
  - Query count: 6 queries -> **7 queries** (O(1), không N+1).

### 6.4. Kết quả build và test

- **Backend tests**: 9/9 passed (`test_document_preview_and_summary.py`), toàn bộ test suite 138 passed, 3 skipped.
- **Frontend build**: `npm run build` thành công trong 704ms, 0 lỗi TypeScript.
- **Git diff check**: `git diff --check` sạch sẽ, không có lỗi whitespace hay conflict.
- **Knowledge graph**: Đã đồng bộ qua `graphify update .`.

### 6.5. Giới hạn chưa xử lý và lưu ý

- Tài liệu thuần hình ảnh chưa có OCR text sẽ hiển thị trạng thái trung tính "Chưa có nội dung xem trước." cho đến khi OCR xong.
- Khi người dùng chỉnh sửa tài liệu tạo checksum mới, preview sẽ tạm thời hiển thị empty state cho đến khi background re-index hoàn tất nhằm bảo đảm Checksum Guard.

