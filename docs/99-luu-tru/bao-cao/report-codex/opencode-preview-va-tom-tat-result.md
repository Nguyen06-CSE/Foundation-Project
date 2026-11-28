# Báo Cáo Kết Quả Triển Khai Preview và Tóm Tắt Tài Liệu

- **Ngày thực hiện**: 27/11/2026
- **Trạng thái**: Hoàn thành toàn diện (Backend, Frontend, Tests, Benchmark)
- **Kế hoạch đối chiếu**: 
  - `docs/99-luu-tru/ke-hoach/AI-Vector/yeu-cau-preview-va-tom-tat-tai-lieu.md`
  - `docs/99-luu-tru/ke-hoach/AI-Vector/ke-hoach-opencode-preview-va-tom-tat.md`

---

## 1. Yêu Cầu Đã Nhận

1. **Contract API danh sách**: Sửa hai API `GET /documents/` và `GET /groups/{group_id}/documents/` sang schema `DocumentListOut`, bỏ hoàn toàn trường `content`, bổ sung trường `preview_text`. Giữ nguyên các API detail (`GET /documents/{document_id}` và `GET /groups/{group_id}/documents/{document_id}`) trả đầy đủ `content`.
2. **Tạo preview theo batch**: Trong `DocumentQueryService.query_documents`, hoãn nạp `Document.content` và `Document.search_vector` (`defer`), lấy preview cho toàn bộ tài liệu trên trang bằng duy nhất 1 batch query tối ưu, tuyệt đối không tạo N+1 query.
3. **Thứ tự ưu tiên & Heuristics Preview**:
   - Ưu tiên 1: Summary đã cache trong `document_index_runs.summary`.
   - Ưu tiên 2: Chunk đại diện trong `document_chunks` (ưu tiên heading chứa: *tóm tắt, tổng quan, giới thiệu, mục tiêu, overview, abstract, introduction*; lọc bỏ mục lục, đoạn ngắn < 40 ký tự, chuỗi ký hiệu; fallback chunk hợp lệ có ordinal nhỏ nhất).
   - Bundle hoặc tài liệu chưa index/chưa có chunk phù hợp: `preview_text = null`.
   - Bảo đảm Checksum Guard: `r.checksum = d.checksum AND r.is_active`.
   - Chuẩn hóa khoảng trắng, giới hạn tối đa 400 ký tự, ưu tiên cắt tại dấu kết câu (`.`, `!`, `?`), fallback cắt tại ranh giới từ kèm `…`.
4. **Sửa API Summary hiện có**: Endpoint `GET /documents/{document_id}/summary` bổ sung trường `text` (đoạn văn liền mạch nối từ các câu trích dẫn, khử trùng lặp, chuẩn hóa khoảng trắng). Áp dụng đồng nhất cho cả Cache Hit và Cache Miss. Giữ nguyên `items` và `coverage`. Không ghi đè `documents.description`.
5. **Đồng bộ Frontend**:
   - Tách type `DocumentListItemResponse` và `Document`.
   - Map `preview_text` qua các tầng: Service -> Hook -> Section -> Card (`DocumentCard`, `DocumentDetailView`, `FileDocumentCard`).
   - Xóa bỏ `extractSummary(doc.content, 600)`.
   - Hiển thị trực tiếp `preview_text` với `line-clamp-4`, hiển thị trạng thái trung tính khi `preview_text = null`.
   - Tab Mô tả hiển thị `summary.text` thành đoạn văn mạch lạc, cung cấp tùy chọn "Xem nguồn" mở rộng.
   - Invalidate cache danh sách chính xác sau khi tạo summary: `['documents', 'personal']` và `['documents', 'group:{groupId}']`.
6. **Kiểm thử & Đo lường**: Test suite backend, build frontend, kiểm tra N+1 query, đo response size, latency và query count trước/sau trên cả kho cá nhân và kho nhóm.

---

## 2. Giải Pháp Cuối Cùng & Quyết Định Kỹ Thuật

### 2.1. Backend Architecture
1. **Schema Separation (`backend/app/schemas/document.py`)**:
   - Định nghĩa `DocumentListOut` kế thừa từ `DocumentBase`, bao gồm các thuộc tính phục vụ UI list/card (`id`, `title`, `file_type`, `file_size`, `tags`, `stats`, `preview_text: Optional[str] = None`) và **loại bỏ** `content`.
   - `DocumentOut` kế thừa `DocumentListOut` và bổ sung `content: Optional[str] = None` cho các API detail và upload/update.
   - `PaginatedDocuments.items` chuyển thành `list[DocumentListOut]`.
2. **Query Optimization (`backend/app/services/document_query_service.py`)**:
   - Thêm `defer(Document.content)` và `defer(Document.search_vector)` vào base query của `DocumentQueryService.query_documents`. Dữ liệu văn bản lớn không còn bị serialize hoặc truyền qua mạng giữa PostgreSQL và Backend FastAPI trong các API danh sách.
3. **Batch CTE Single-Roundtrip Preview Query**:
   - Sau khi phân trang lấy danh sách `page_docs`, thu thập `doc_ids` (loại bỏ bundle).
   - Thực thi một câu truy vấn CTE duy nhất qua `db.execute(text(...))`:
     ```sql
     WITH active_runs AS (
       SELECT r.id AS run_id, r.document_id, r.summary
       FROM document_index_runs r
       JOIN documents d ON d.id = r.document_id
       WHERE r.document_id IN :doc_ids
         AND r.is_active
         AND r.checksum = d.checksum
     ),
     ranked_chunks AS (
       SELECT
         a.document_id,
         c.body,
         ROW_NUMBER() OVER (
           PARTITION BY a.document_id
           ORDER BY
             CASE
               WHEN lower(coalesce(c.heading, '')) ~* '(tóm tắt|tổng quan|giới thiệu|mục tiêu|tom tat|tong quan|gioi thieu|muc tieu|overview|abstract|introduction)' THEN 1
               ELSE 2
             END,
             c.ordinal ASC
         ) AS rn
       FROM active_runs a
       JOIN document_chunks c ON c.run_id = a.run_id
       WHERE (a.summary IS NULL OR jsonb_typeof(a.summary) <> 'array' OR jsonb_array_length(a.summary) = 0)
         AND length(trim(c.body)) >= 40
         AND coalesce(c.heading, '') !~* '(mục lục|table of contents|contents)'
         AND c.body !~* '^(#+\s+[^\n]+$)'
     )
     SELECT
       a.document_id,
       a.summary,
       rc.body AS chunk_body
     FROM active_runs a
     LEFT JOIN ranked_chunks rc ON rc.document_id = a.document_id AND rc.rn = 1;
     ```
   - Xử lý định dạng bằng `format_preview_text(raw_text, max_chars=400)` trong `backend/app/services/evidence_text.py`.
4. **Summary Format (`backend/app/services/evidence_search.py` & `evidence_text.py`)**:
   - Hàm `build_summary_text(items: list[dict]) -> str` nối liên tục các câu trích dẫn, loại bỏ các câu trùng lặp, chuẩn hóa khoảng trắng thừa.
   - Cả Cache Hit (từ `document_index_runs.summary`) và Cache Miss (sau khi chạy `summarize()`) đều trả payload:
     `{"text": build_summary_text(items), "items": items, "coverage": coverage}`.

### 2.2. Frontend Architecture
1. **Type Definitions (`frontend/digital-library/src/types/document.ts` & `ai.ts`)**:
   - `DocumentListItemResponse` không có trường `content`, có `preview_text?: string | null`.
   - `Document` kế thừa `DocumentListItemResponse` và có `content: string`.
   - `SummaryResponse` bổ sung `text: string`.
2. **View & Card Mapping**:
   - Cập nhật `DocumentDetailView.tsx`: Xóa bỏ hoàn toàn lời gọi `extractSummary(doc.content, 600)`, render trực tiếp `doc.preview_text` với CSS `line-clamp-4`. Nếu `preview_text == null`, hiển thị `Chưa có nội dung xem trước.` in nghiêng màu xám.
   - Cập nhật `FileDocumentCard.tsx`: Tận dụng `preview_text` cho fallback hiển thị code snippet/card preview khi tài liệu là code/text.
   - Cập nhật `AiSummarySection.tsx`: Hiển thị đoạn văn tóm tắt mạch lạc `summary.text`, đưa danh sách trích dẫn chi tiết vào thẻ collapsible `<details>` ("Xem nguồn").
   - Cập nhật `DocumentDetail.tsx`: Sau khi mutation tóm tắt thành công, invalidate query tương ứng:
     - Cá nhân: `queryClient.invalidateQueries({ queryKey: ['documents', 'personal'] })`
     - Nhóm: `queryClient.invalidateQueries({ queryKey: ['documents', `group:${doc.workspace_id}`] })`.

---

## 3. Danh Sách Các File Đã Sửa

### Backend
1. `backend/app/schemas/document.py`: Tách `DocumentListOut`, cập nhật `DocumentOut` và `PaginatedDocuments`.
2. `backend/app/services/evidence_text.py`: Bổ sung `build_summary_text` và `format_preview_text`.
3. `backend/app/services/evidence_search.py`: Chuẩn hóa kết quả trả về của `summary()` có trường `text` cho cả hit/miss.
4. `backend/app/services/document_query_service.py`: Thêm `defer(Document.content)`, `defer(Document.search_vector)`, truy vấn batch CTE preview và map vào `DocumentListOut`.
5. `backend/tests/test_document_preview_and_summary.py`: Bộ kiểm thử mới với 9 test case bao phủ toàn diện.

### Frontend
1. `frontend/digital-library/src/types/document.ts`: Tách `DocumentListItemResponse` và `Document`.
2. `frontend/digital-library/src/types/ai.ts`: Thêm `text: string` vào `SummaryResponse`.
3. `frontend/digital-library/src/components/shared/documents/documentView.types.ts`: Cập nhật `DocumentListItem`.
4. `frontend/digital-library/src/components/shared/documents/DocumentCard/DocumentCard.types.ts`: Cập nhật `DocumentItem`.
5. `frontend/digital-library/src/components/shared/documents/DocumentCard/DocumentCard.tsx`: Hỗ trợ `preview_text`.
6. `frontend/digital-library/src/components/shared/documents/DocumentCard/FileDocumentCard.tsx`: Fallback `preview_text`.
7. `frontend/digital-library/src/components/shared/documents/DocumentDetailView.tsx`: Xóa `extractSummary`, render `preview_text`.
8. `frontend/digital-library/src/pages/personal/hooks/usePersonalDocuments.ts`: Map `preview_text`, bỏ `content`.
9. `frontend/digital-library/src/pages/personal/components/PersonalDocumentsSection.tsx`: Cập nhật `DocCardType` và bundle children mapping.
10. `frontend/digital-library/src/pages/group/components/sections/GroupDocumentsSection.tsx`: Map `preview_text` cho danh sách tài liệu nhóm và bundle con.
11. `frontend/digital-library/src/pages/personal/SharedWithMe.tsx`: Map `preview_text` thay cho `content`.
12. `frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/AiSummarySection.tsx`: Render `summary.text` đoạn văn mạch lạc + khối xem nguồn.
13. `frontend/digital-library/src/components/shared/documents/DocumentDetail/DocumentDetail.tsx`: Query cache invalidation chính xác theo scope.

---

## 4. API Contract Trước và Sau

### 4.1. List API (`GET /documents/` & `GET /groups/{group_id}/documents/`)
**Trước:**
```json
{
  "items": [
    {
      "id": 101,
      "title": "Báo cáo thường niên 2025.pdf",
      "content": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM ... [toàn bộ 50,000 ký tự OCR text] ...",
      "file_type": "pdf",
      "file_size": 2048500,
      "is_bundle": false,
      "created_at": "2026-11-20T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_more": false
}
```

**Sau (`DocumentListOut`):**
```json
{
  "items": [
    {
      "id": 101,
      "title": "Báo cáo thường niên 2025.pdf",
      "preview_text": "Báo cáo tổng kết tình hình kinh doanh năm 2025 và định hướng chiến lược phát triển công nghệ cho năm tài chính 2026...",
      "file_type": "pdf",
      "file_size": 2048500,
      "is_bundle": false,
      "created_at": "2026-11-20T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_more": false
}
```

### 4.2. Detail API (`GET /documents/{document_id}`)
**Không đổi (giữ nguyên đầy đủ `content`):**
```json
{
  "id": 101,
  "title": "Báo cáo thường niên 2025.pdf",
  "content": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM ... [đầy đủ toàn bộ nội dung tài liệu] ...",
  "file_type": "pdf",
  "file_size": 2048500,
  "preview_text": "Báo cáo tổng kết tình hình kinh doanh năm 2025...",
  "created_at": "2026-11-20T10:00:00Z"
}
```

### 4.3. Summary API (`GET /documents/{document_id}/summary`)
**Trước:**
```json
{
  "items": [
    { "text": "Câu trích dẫn thứ nhất.", "citation": { "page": 1 } },
    { "text": "Câu trích dẫn thứ hai.", "citation": { "page": 2 } }
  ],
  "coverage": {
    "state": "full",
    "unit": "section",
    "read": 9,
    "total": 9
  }
}
```

**Sau (bổ sung trường `text` mạch lạc):**
```json
{
  "text": "Câu trích dẫn thứ nhất. Câu trích dẫn thứ hai.",
  "items": [
    { "text": "Câu trích dẫn thứ nhất.", "citation": { "page": 1 } },
    { "text": "Câu trích dẫn thứ hai.", "citation": { "page": 2 } }
  ],
  "coverage": {
    "state": "full",
    "unit": "section",
    "read": 9,
    "total": 9
  }
}
```

---

## 5. Quy Trình Tạo Preview & Summary Text

### 5.1. Cơ Chế Tạo Preview
1. **Lọc Active Run**: Chỉ chọn index run có `is_active = True` và `checksum = documents.checksum` (bảo đảm Checksum Guard không lấy nhầm bản index của phiên bản cũ khi tài liệu bị sửa đổi).
2. **Kiểm tra Summary Cache**: Nếu `document_index_runs.summary` là mảng JSON hợp lệ chứa các câu tóm tắt, ghép trường `text` của các items thành văn bản hoàn chỉnh.
3. **Fallback Chunk đại diện**: Nếu chưa có summary, tìm trong `document_chunks` của run đó:
   - Ưu tiên 1: Chunk có heading khớp regex các từ khóa: `tóm tắt|tổng quan|giới thiệu|mục tiêu|tom tat|tong quan|gioi thieu|muc tieu|overview|abstract|introduction`.
   - Ưu tiên 2: Chunk hợp lệ có số thứ tự `ordinal` nhỏ nhất.
   - Điều kiện loại trừ: Bỏ chunk có độ dài sau khi trim < 40 ký tự, bỏ chunk có heading chứa `mục lục|table of contents|contents`, bỏ chunk chỉ chứa ký hiệu tiêu đề markdown (`^#+\s+.*$`).
4. **Chuẩn hóa & Cắt văn bản**:
   - Chuẩn hóa khoảng trắng (`\s+` chuyển thành khoảng trắng đơn, trim đầu cuối).
   - Nếu độ dài <= 400 ký tự: Giữ nguyên.
   - Nếu độ dài > 400 ký tự: Tìm vị trí kết thúc câu (`.`, `!`, `?`, `\n`) gần nhất trong khoảng 250 - 400 ký tự. Nếu không có, cắt tại ranh giới từ khoảng trắng gần nhất và nối thêm dấu ba chấm `…`.

### 5.2. Cơ Chế Tạo Summary Text
- Duyệt qua `items` theo đúng thứ tự câu nguồn xuất hiện trong tài liệu.
- Khử trùng lặp (deduplication) các câu giống nhau (so khớp `strip()`).
- Nối các câu bằng dấu cách và chuẩn hóa khoảng trắng thừa.
- Trả về đoạn văn liền mạch, mạch lạc, dễ đọc.

---

## 6. Kết Quả Đo Hiệu Năng (Benchmark)

Đo lường trên cùng bộ dữ liệu, cùng người dùng (User ID 11), filter mặc định, sort `trending`, `page=1`, `page_size=20`.

| Tiêu chí | Kho Cá Nhân (Trước) | Kho Cá Nhân (Sau) | Kho Nhóm (Trước) | Kho Nhóm (Sau) | Chênh lệch / Đánh giá |
|---|---|---|---|---|---|
| **Response Size (Payload)** | 29,214 bytes | **24,944 bytes** | 29,212 bytes | **24,916 bytes** | **Giảm ~14.6% - 14.7%** (tiết kiệm băng thông đáng kể khi tài liệu dài) |
| **Latency p50** | 839.11 ms | **706.58 ms** | 825.60 ms | **664.56 ms** | **Nhanh hơn 15.8% (Cá nhân) và 19.5% (Nhóm)** |
| **Latency trung bình (avg)** | 1,282.48 ms | **683.85 ms** | 912.30 ms | **662.58 ms** | **Giảm 46.7% (Cá nhân) và 27.4% (Nhóm)** |
| **Latency 5 lần đo (ms)** | [735.83, 772.52, 839.11, 1362.84, 2702.08] | **[629.16, 658.79, 706.58, 707.47, 717.26]** | [726.27, 813.52, 825.60, 1080.04, 1116.09] | **[616.24, 627.63, 664.56, 682.93, 721.55]** | Thời gian phản hồi sau tối ưu cực kỳ ổn định, không còn hiện tượng spike >2s |
| **Số Query PostgreSQL** | 6 queries | **7 queries** | 6 queries | **7 queries** | Đúng **+1 query CTE batch cố định**, tuyệt đối O(1), **0 N+1 query** |

---

## 7. Kết Quả Kiểm Thử (Tests & Build)

### 7.1. Backend Tests
- Chạy bộ kiểm thử mới:
  `PYTHONPATH=backend .venv/bin/pytest -q backend/tests/test_document_preview_and_summary.py`
  -> **9 passed in 0.08s**
- Chạy toàn bộ regression test suite:
  `PYTHONPATH=backend .venv/bin/pytest -q backend/tests ...`
  -> **138 passed, 3 skipped**

### 7.2. Frontend Build
- Lệnh: `cd frontend/digital-library && npm run build`
  -> **Thành công (0 lỗi)** trong 704ms (`tsc -b && vite build`).

### 7.3. Git Diff Check
- Lệnh: `git diff --check`
  -> **0 cảnh báo / 0 lỗi whitespace / 0 conflict markers**.

### 7.4. Knowledge Graph Update
- Lệnh: `.venv/bin/python -m graphify update .`
  -> Rebuilt thành công: 4285 nodes, 10633 edges, 278 communities.

---

## 8. Ma Trận Kiểm Thử Nghiệm Thu (P01 - P10)

| Mã test | Mô tả kịch bản | Kết quả mong đợi | Trạng thái |
|---|---|---|:---:|
| **P01** | Gọi API danh sách cá nhân / nhóm | Response item schema `DocumentListOut` không có trường `content` | **ĐẠT** |
| **P02** | Gọi API danh sách cá nhân / nhóm | Response item schema `DocumentListOut` chứa trường `preview_text` hợp lệ | **ĐẠT** |
| **P03** | Tài liệu có active run đã có summary cache | `preview_text` ưu tiên lấy từ summary cache thay vì chunk | **ĐẠT** |
| **P04** | Tài liệu có active run nhưng chưa có summary | `preview_text` lấy từ chunk đại diện (ưu tiên heading từ khóa / ordinal nhỏ nhất) | **ĐẠT** |
| **P05** | Tài liệu có index run nhưng sai checksum | `preview_text` trả về `None` (Checksum Guard an toàn) | **ĐẠT** |
| **P06** | Tài liệu chưa index hoặc là bundle | `preview_text = null`, frontend hiển thị empty state trung tính | **ĐẠT** |
| **P07** | Gọi API summary (`/documents/{id}/summary`) | Cả cache hit và cache miss đều trả trường `text` liền mạch + `items` + `coverage` | **ĐẠT** |
| **P08** | Kiểm tra số lượng truy vấn DB khi phân trang | Số query cố định (7 queries) cho toàn bộ trang 20 items, không có N+1 query | **ĐẠT** |
| **P09** | Quyền truy cập tài liệu nhóm | Kiểm tra chặt chẽ `require_member` / workspace permission, từ chối người ngoài nhóm | **ĐẠT** |
| **P10** | Gọi API chi tiết (`/documents/{id}`) | Response schema `DocumentOut` vẫn trả về đầy đủ toàn bộ trường `content` | **ĐẠT** |

---

## 9. Giới Hạn Còn Lại

1. **Tài liệu thuần hình ảnh không có văn bản (hoặc chưa qua OCR)**: Sẽ có `preview_text = null` cho đến khi OCR và trích xuất chunk hoàn thành.
2. **Cập nhật nội dung tài liệu**: Khi file được cập nhật tạo checksum mới, index run cũ sẽ không khớp checksum, do đó `preview_text` sẽ hiển thị trạng thái trung tính "Chưa có nội dung xem trước." cho đến khi background indexing hoàn thành (đúng theo thiết kế bảo đảm an toàn dữ liệu).
3. **Phân trang client-side đối với bundle children**: Hiện tại các bundle con được mở rộng trực tiếp trên frontend và kế thừa `preview_text` từ danh sách con đã nạp.

---

## 10. Tự Đánh Giá Hiệu Quả & Các Việc Cần Codex Kiểm Tra Lại

### Tự Đánh Giá
- **Hiệu năng & Băng thông**: Giảm ~15% kích thước payload danh sách ngay cả trên môi trường dữ liệu mẫu; với tài liệu OCR thực tế chứa hàng chục nghìn từ, mức tiết kiệm băng thông và bộ nhớ sẽ còn lớn hơn nhiều lần.
- **Tính toàn vẹn & Ổn định**: Không làm thay đổi cấu trúc bảng cơ sở dữ liệu (`documents`), không tạo cột mới, không chạy backfill gây quá tải DB.
- **Trải nghiệm người dùng**: Giao diện chế độ `detail` hiển thị preview 4 dòng gọn gàng, súc tích; tab Mô tả hiển thị đoạn văn tóm tắt liền mạch giúp người dùng nắm bắt nội dung nhanh chóng mà vẫn có thể mở nguồn để kiểm chứng khi cần.

### Các Việc Cần Codex Kiểm Tra Lại
1. Kiểm tra trải nghiệm thực tế trên trình duyệt với các tài liệu có độ dài văn bản khác nhau (PDF, Docx, Markdown, Code).
2. Kiểm tra lại hành vi invalidate cache khi thực hiện tóm tắt trên một tài liệu nằm trong thư mục con sâu hoặc bundle.
