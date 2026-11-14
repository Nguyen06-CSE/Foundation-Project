---
sidebar_position: 1
---

# Tối ưu hóa Hiệu năng & Truy vấn Tài liệu (Document Query & Performance)

Cho phép hệ thống tải, tìm kiếm, lọc và hiển thị hàng nghìn **tài liệu cá nhân** và **tài liệu nhóm** một cách tức thì, mượt mà và không giật lag. Kiến trúc kết hợp phân trang vô tận (Infinite Scroll) nối tiếp ở giao diện và dịch vụ truy vấn tập trung kèm chỉ mục đa tầng ở tầng cơ sở dữ liệu.

Hệ thống được thiết kế dựa trên 2 trụ cột cốt lõi:
1. **PostgreSQL High-Performance Query Architecture**: Tận dụng triệt để các chỉ mục kết hợp (Composite Index B-Tree), chỉ mục tìm kiếm văn bản (GIN Trigram), và kỹ thuật phân trang cửa sổ trượt (Window Look-Ahead: `fetch_limit = page_size + 1`) nhằm loại bỏ hoàn toàn các câu lệnh `COUNT(*)` đắt đỏ từ trang 2 trở đi.
2. **TanStack React Query Server State Management**: Quản trị dòng dữ liệu máy chủ với cơ chế `useInfiniteQuery`, lưu đệm đa tầng có thời gian sống (TTL) phù hợp theo ngữ cảnh (`staleTime` 30s cá nhân, 15s nhóm), Invalidation chọn lọc, cập nhật trực tiếp cấu trúc phân trang bằng `setQueriesData`, và cách ly bộ đệm tuyệt đối theo định danh người dùng.

---

## Mục lục tài liệu chi tiết

| Tài liệu | Nội dung chính |
|---|---|
| [BUSINESS_RULES.md](BUSINESS_RULES.md) | Quy tắc phân trang, chuẩn hóa tham số tìm kiếm/lọc, chính sách bộ nhớ đệm (TTL), và quy tắc cách ly dữ liệu |
| [DATABASE.md](DATABASE.md) | **Chuyên sâu PostgreSQL**: Composite Index B-Tree, GIN Trigram, Window Look-Ahead, Benchmark truy vấn trên 1.000 records |
| [API.md](API.md) | Danh mục Endpoint `GET /documents/`, `GET /groups/{id}/documents/`, tham số lọc, schema `PaginatedDocuments` |
| [FRONTEND.md](FRONTEND.md) | **Chuyên sâu React & TanStack Query**: `useInfiniteQuery`, `useDocumentFilters` debounce, Sentinel guard, `React.memo` & `useCallback` |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Phân tích căn nguyên (Root Cause) & giải pháp cho 5 sự cố kinh điển: Phân trang trang 1, Giới hạn 20 nhóm, Cache thumbnail, Cache rò rỉ phiên, và Infinite Loop |

---

## Các bài toán cốt lõi đã giải quyết

| Vấn đề trước tối ưu | Hậu quả thực tế | Giải pháp kỹ thuật áp dụng |
|---|---|---|
| **Phân trang cá nhân bị hỏng hoàn toàn** | `queryKey` thiếu `page`, `queryFn` gán cứng `page: 1`. Bấm nút "Tiếp" chỉ đổi con số, người dùng không thể xem tài liệu từ bản ghi 21 trở đi. | Chuyển sang **Infinite Scroll** với `useInfiniteQuery`, phân trang nối tiếp tự động theo `sentinel` cuộn. |
| **Tài liệu nhóm bị giới hạn cứng 20 items** | `useGroupDocuments` không truyền `page_size`, backend gán cứng `page_size = 20`. Từ tài liệu 21 trở đi biến mất hoàn toàn. | Đồng bộ `useInfiniteQuery` cho cả nhóm và cá nhân với `page_size: 20` và tham số phân trang đồng nhất. |
| **Lọc và tìm kiếm chạy hoàn toàn ở Client** | Backend không nhận `q`, `tag_id`, `file_type`. Frontend tải mảng cục bộ rồi tự `useMemo` lọc, dẫn đến kết quả sai khi có phân trang. | Xây dựng `DocumentQueryService` tập trung ở Backend, đẩy toàn bộ điều kiện lọc xuống SQL Server Engine. |
| **Phá vỡ HTTP Cache của ảnh Thumbnail** | `getThumbnailUrl` nối chuỗi `?t=${Date.now()}` khiến URL thay đổi mỗi tick render; backend thiếu header `Cache-Control`. | Loại bỏ timestamp, chuyển sang `?v=${version}` ổn định; bổ sung `Cache-Control: public, max-age=86400` cho `/storage`. |
| **Thumbnail PDF kích thước khổng lồ** | File ảnh preview PDF lưu ở kích thước gốc (~1240 × 1754 px, ~1.5 MB/ảnh), gây nghẽn băng thông và lag DOM. | Thu nhỏ tự động kích thước tối đa về `400 × 600 px` bằng PIL (`thumbnail()`), giảm ~85% dung lượng ảnh. |
| **Render lại dư thừa khi thao tác giao diện** | Tích chọn 1 tài liệu hoặc hover làm render lại đồng loạt 100% các card tài liệu và thư mục trên màn hình. | Bọc `React.memo` cho 6 component thẻ và `useCallback` cho các action handlers. |
| **Rò rỉ dữ liệu giữa các phiên người dùng** | Đăng xuất `nguyen` và đăng nhập `sv_an`, giao diện vẫn hiển thị tài liệu của `nguyen` và gửi request lặp vô tận. | Đưa `user.id` vào `queryKey` của mọi query tài liệu; thực thi `queryClient.clear()` bắt buộc khi logout và login. |

---

## Bảng so sánh chỉ số trước & sau tối ưu (Tập dữ liệu 1.000 records)

| Chỉ số đo lường | Trước tối ưu (Baseline) | Sau tối ưu (Hoàn thiện) | Cải thiện |
|---|---|---|---|
| **Tỷ lệ Cache Hit ảnh Thumbnail** | **0%** (Tải lại mọi lần render) | **100%** (Đọc từ Disk/Memory Cache) | Triệt tiêu 100% request trùng |
| **Khả năng xem tài liệu cá nhân** | Tối đa 20 tài liệu đầu tiên | **1.000 / 1.000** tài liệu | Mở rộng vô hạn theo scroll |
| **Khả năng xem tài liệu nhóm** | Cố định 20 tài liệu đầu tiên | **100%** tài liệu trong Workspace | Đầy đủ toàn bộ dữ liệu |
| **Thời gian phản hồi Server (Trang 1)** | ~850ms (full scan + count) | **~490ms** (có index + count) | Giảm ~42% độ trễ |
| **Thời gian phản hồi Server (Trang 2+)** | Không hỗ trợ | **~380ms** (window look-ahead, không count) | Phản hồi siêu tốc |
| **Độ trễ tìm kiếm (Search ILIKE)** | Client scan trên 20 items | **~465ms** trên toàn bộ 1.000 records | Chính xác trên toàn bộ DB |
| **Hiệu năng Render khi chọn checkbox** | Re-render toàn bộ grid (~50 card) | **Chỉ re-render đúng 1 card** được click | Tiết kiệm CPU, 60fps mượt mà |
| **Bảo mật phân tách người dùng** | Rò rỉ dữ liệu cache giữa các phiên | **Cách ly 100%** theo `user.id` | An toàn bảo mật dữ liệu |

---

## Nguyên tắc thiết kế
1. **Server-Side Filtering & Look-Ahead Pagination**: Việc lọc dữ liệu bắt buộc phải diễn ra tại Database. Tầng Frontend chỉ quản trị trạng thái tham số và hiển thị.
2. **Không chạy `COUNT(*)` lặp lại**: Chỉ đếm tổng số bản ghi một lần duy nhất tại trang đầu tiên để phục vụ thống kê tổng. Các trang tiếp theo dùng `fetch_limit = page_size + 1` để xác định cờ `has_more`.
3. **Phân tách bộ nhớ đệm (Cache Isolation)**: Mọi dữ liệu phụ thuộc vào quyền sở hữu cá nhân bắt buộc phải có `userId` trong `queryKey` để ngăn ngừa lỗi chia sẻ cache giữa các tài khoản khác nhau trên cùng một trình duyệt.
4. **Tránh trừu tượng hóa dư thừa (Ponytail Principle)**: Tận dụng tối đa TanStack Query và các chỉ mục PostgreSQL nguyên bản, không tự viết các lớp quản lý RAM cache tự chế gây phức tạp và phát sinh lỗi.
