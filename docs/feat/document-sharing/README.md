---
sidebar_position: 1
---

# Chia sẻ tài liệu (Copy-on-Accept)

Cho phép người dùng chia sẻ **tài liệu** (hoặc **bundle** — kèm toàn bộ file con) tới người dùng khác, hoặc đưa tài liệu cá nhân vào nhóm. Bản chất chia sẻ là **tạo bản sao** vào kho của người nhận; file vật lý dùng chung (cùng `file_path`/`checksum`), không nhân đôi dung lượng lưu trữ.

Hệ thống được thiết kế dựa trên 2 trụ cột cốt lõi:
1. **PostgreSQL Enterprise Architecture**: Tận dụng tối đa các tính năng đặc trưng và mạnh mẽ nhất của PostgreSQL (Partial Unique Index, Atomic `INSERT ... ON CONFLICT DO NOTHING`, Atomic Upsert `ON CONFLICT DO UPDATE`, Row-Level Locking `FOR UPDATE`). Đảm bảo toàn vẹn dữ liệu ở cấp độ thấp nhất và ngăn chặn triệt để Race Condition.
2. **React Query (TanStack Query) State Management**: Quản trị dữ liệu server-state bất đồng bộ trên giao diện, tận dụng cơ chế đa tầng cache, staleTime thông minh, prefetching tức thì, và selective cache invalidation giúp trải nghiệm người dùng nhanh, mượt mà, không giật lag.

---

## Mục lục tài liệu chi tiết
| Tài liệu | Nội dung chính |
|---|---|
| [BUSINESS_RULES.md](BUSINESS_RULES.md) | Luật phân quyền, quy tắc Unique Pending bộ ba, ma trận trạng thái, chu kỳ rút yêu cầu |
| [DATABASE.md](DATABASE.md) | **Chuyên sâu PostgreSQL**: Partial Unique Index, Atomic Idempotent Insert, Upsert Stats, Row-level lock |
| [API.md](API.md) | Danh mục Endpoint `/shares/*`, `/shares/document-status`, `/shares/sent`, `/withdraw` |
| [FRONTEND.md](FRONTEND.md) | **Chuyên sâu React Query**: Prefetching, Debounce, Caching, Selective Invalidation, UX Guard |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Phân tích căn nguyên lỗi 500 khi nhận tài liệu, xử lý CORS và duplicate key stats |

---

## Các bài toán cốt lõi đã giải quyết
| Vấn đề | Giải pháp kỹ thuật |
|---|---|
| **Lỗi 500 khi chấp nhận tài liệu** (`UniqueViolationError: document_stats_pkey`) | Sử dụng PostgreSQL Atomic Upsert `pg_insert(DocumentStats)...on_conflict_do_update` thay cho `db.get() + db.add()` non-atomic trong cùng một transaction. |
| **Gửi trùng lặp yêu cầu chia sẻ khi click liên tục / gửi lại** | PostgreSQL **Partial Unique Index** trên `(from_user_id, to_user_id, source_document_id) WHERE status = 'pending'`, kết hợp `ON CONFLICT DO NOTHING`. |
| **Spam Notification cho cùng một tài liệu** | Chỉ phát sinh Notification khi câu lệnh INSERT trả về `created_id is not None`. Nếu conflict đã tồn tại, hoàn toàn không tạo thêm notification. |
| **Trải nghiệm chia sẻ phản hồi chậm trên UI** | Dùng React Query prefetch endpoint `/shares/document-status` ngay khi mở modal, kết hợp Debounce preview 300ms hiển thị badge ngay lập tức. |
| **Gửi nhầm hoặc muốn hủy lời mời đang chờ** | Bổ sung trạng thái `withdrawn` và Tab **"Đã gửi"** trên UI với nút "Rút yêu cầu", giải phóng Partial Index tự động. |
| **Trùng tài liệu đã có trong kho** | Kiểm tra `source_document_id` và `owner_id`, hiển thị badge `[Đã có trong kho]`, disable nút submit để tránh request thừa. |
| **Tái sử dụng tối đa code sẵn có** | Tái sử dụng `PersonalDocumentsSection` cho cả Tab "Đã nhận"; tái sử dụng `RecipientPicker` cho cả nhóm và chia sẻ tài liệu. |

---

## Nguyên tắc thiết kế
- **PostgreSQL là chốt chặn cuối cùng (Single Source of Truth)**: Không tin tưởng hoàn toàn vào disable button hay debounce ở frontend. Database PostgreSQL chịu trách nhiệm đảm bảo tính duy nhất và toàn vẹn dữ liệu.
- **Bảo toàn Audit Trail**: Không bao giờ `DELETE` bản ghi chia sẻ chỉ để cho phép gửi lại. Bản ghi cũ chuyển trạng thái (`accepted`, `rejected`, `withdrawn`, `expired`), tự động rời khỏi Partial Index và lưu vết đầy đủ trong database.
- **Tối ưu băng thông & trải nghiệm**: Tối thiểu số lần gọi API thông qua caching của React Query; dữ liệu luôn cập nhật đa tab và tức thì qua cơ chế invalidate query có định hướng.
