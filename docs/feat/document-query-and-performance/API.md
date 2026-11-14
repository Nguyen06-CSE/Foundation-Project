---
sidebar_position: 4
---

# API: Đặc Tả Endpoint Truy Vấn & Phân Trang Tài Liệu

Tài liệu này đặc tả chi tiết các endpoint phục vụ truy vấn, tìm kiếm, lọc và phân trang tài liệu cho cả Kho cá nhân và Không gian nhóm.

Các endpoint được quản lý tại:
- `backend/app/routers/documents.py` (prefix `/documents`)
- `backend/app/routers/groups.py` (prefix `/groups`)
- Service xử lý lõi: `backend/app/services/document_query_service.py`
- Frontend Service Client: `frontend/digital-library/src/services/documentService.ts` và `groupService.ts`

---

## 1. Danh sách Endpoint

| Phương thức | Đường dẫn | Mục đích | Quyền hạn |
|---|---|---|---|
| `GET` | `/documents/` | Lấy danh sách tài liệu cá nhân kèm phân trang và bộ lọc | Authenticated |
| `GET` | `/documents/file-types` | Lấy danh sách các loại định dạng tệp tin đang có trong hệ thống | Authenticated |
| `GET` | `/groups/{group_id}/documents/` | Lấy danh sách tài liệu trong không gian nhóm kèm phân trang và bộ lọc | Thành viên nhóm |

---

## 2. Chi tiết Tham số Truy vấn (Query Parameters)

Cả hai endpoint `/documents/` và `/groups/{group_id}/documents/` đều nhận tập tham số truy vấn chuẩn hóa:

| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả chi tiết |
|---|---|---|---|
| `page` | `integer` | `1` | Số thứ tự trang cần lấy (bắt đầu từ 1). |
| `page_size` | `integer` | `20` | Số lượng bản ghi trên một trang (tối thiểu 1, tối đa 100). |
| `q` | `string` | `null` | Từ khóa tìm kiếm không dấu/có dấu trong tiêu đề, thẻ tag và tệp con của Bundle. |
| `tag_id` | `integer` | `null` | Lọc theo ID của thẻ phân loại (Tag). |
| `category` | `string` | `null` | Lọc theo danh mục tài liệu. |
| `file_type` | `string` | `null` | Phân loại tệp: `pdf`, `image`, `document`, `other`. |
| `folder_id` | `integer` | `null` | Lọc theo ID thư mục (chỉ áp dụng cho kho cá nhân). |
| `uploaded_within` | `string` | `null` | Giới hạn thời gian tải lên: `today`, `last_7_days`, `last_30_days`, `this_year`. |
| `sort` | `string` | `trending` | Tiêu chí sắp xếp: `trending`, `newest`, `views`, `title`. |

---

## 3. Cấu trúc Response Schema (`PaginatedDocuments`)

```json
{
  "items": [
    {
      "id": 1026,
      "title": "Báo cáo Thực tập Tốt nghiệp Công nghệ Thông tin.pdf",
      "description": "Bản báo cáo chi tiết về tối ưu hóa hệ thống thư viện số",
      "file_path": "uploads/documents/2026/11/report_1026.pdf",
      "thumbnail_path": "uploads/thumbnails/2026/11/thumb_1026.jpg",
      "markdown_path": "uploads/markdown/2026/11/md_1026.md",
      "file_type": "application/pdf",
      "file_size": 1845230,
      "is_bundle": false,
      "bundle_parent_id": null,
      "bundle_children_count": 0,
      "view_count": 142,
      "download_count": 35,
      "share_count": 12,
      "trending_score": 88.5,
      "personal_view_count": 4,
      "tags": [
        { "id": 1, "name": "Báo cáo", "color": "#2563eb" },
        { "id": 4, "name": "CNTT", "color": "#16a34a" }
      ],
      "created_at": "2026-11-14T08:30:00Z"
    }
  ],
  "total": 850,
  "page": 1,
  "page_size": 20,
  "total_pages": 43,
  "has_more": true
}
```

### Chú thích các trường quan trọng:
- `has_more` (`boolean`): Cờ báo hiệu client có thể cuộn tiếp để nạp trang kế tiếp hay không.
- `total` (`integer`): Tổng số bản ghi (chỉ tính chính xác ở trang 1; trả về 0 ở các trang sau để tăng tốc).
- `bundle_children_count` (`integer`): Số lượng tệp con thuộc Bundle (tính tự động bằng hydration).
- `personal_view_count` (`integer`): Số lần chính người dùng này đã xem tài liệu.

---

## 4. Frontend TypeScript Interfaces

Được định nghĩa tại: `frontend/digital-library/src/types/document.ts`

```typescript
export interface DocumentQueryParams {
  folder_id?: number;
  tag_id?: number;
  category?: string;
  file_type?: string;
  uploaded_within?: string;
  sort?: "trending" | "newest" | "views" | "title";
  q?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedDocuments {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_more?: boolean;
}
```
