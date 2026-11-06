# Business Rules: Quy tắc Nghiệp vụ Chia sẻ Tài liệu

Tài liệu này định nghĩa toàn bộ quy tắc nghiệp vụ, ma trận quyền hạn, vòng đời trạng thái của một yêu cầu chia sẻ, và cơ chế đảm bảo tính toàn vẹn dữ liệu.

---

## 1. Định tuyến theo Cấp bậc (Role Ranking)
Hàm xử lý: `is_auto_accept(sender_role, recipient_role)` tại `backend/app/core/roles.py`.
Thứ bậc:
- `student`: Level 1
- `teacher`: Level 2
- `faculty_admin`: Level 3
- `school_admin` / `system_admin`: Level 4

### Ma trận xử lý:
| Cấp bậc người gửi | Cấp bậc người nhận | Trạng thái ban đầu | Hành động hệ thống |
|---|---|---|---|
| Cao hơn (Sender > Recipient) | Thấp hơn | `auto_accepted` | Sao chép tài liệu vào kho cá nhân ngay lập tức, gửi Notification thông báo nhận tài liệu |
| Ngang hàng hoặc Thấp hơn | Bằng hoặc Cao hơn | `pending` | Lưu yêu cầu chờ, gửi Notification kèm liên kết duyệt, người nhận phải bấm Chấp nhận mới tạo bản sao |

---

## 2. Quy tắc cốt lõi: Tối đa Một yêu cầu Pending cho mỗi Bộ ba
Trong toàn hệ thống, chỉ cho phép duy nhất một yêu cầu đang `pending` cho cùng một bộ ba:
$$\text{(from\_user\_id, to\_user\_id, source\_document\_id)}$$

### Khi bộ ba này đã có yêu cầu `pending`:
1. **Không tạo bản ghi mới**: Không sinh ra dòng thứ hai trong database.
2. **Không tạo thông báo (Notification) mới**: Tuyệt đối không gửi thêm Notification tránh gây spam phiền toái cho người nhận.
3. **Không reset mốc thời gian**: Giữ nguyên `created_at` và hạn hết hạn ban đầu.
4. **Phản hồi rõ ràng cho người gửi**: Báo cho người gửi biết yêu cầu đã được gửi trước đó và hiện đang chờ người nhận phản hồi.
5. **Chốt chặn kỹ thuật**: Được đảm bảo ở tầng cơ sở dữ liệu bởi **PostgreSQL Partial Unique Index** (`uq_document_share_pending`).

---

## 3. Vòng đời Trạng thái của Yêu cầu Chia sẻ

```
                ┌───────────────────────────────┐
                │          Tạo yêu cầu          │
                └──────────────┬────────────────┘
                               │
               Sender rank > Recipient rank?
                               │
                ├─── YES ──────┴────── NO ───┐
                ▼                            ▼
       [auto_accepted]                   [pending]
     (Sao chép kho ngay)                     │
                                ┌────────────┼────────────┐
                                ▼            ▼            ▼
                           [accepted]   [rejected]   [withdrawn]
                          (Sao chép)    (Từ chối)    (Người gửi rút)
                                │            │            │
                                └────────────┼────────────┘
                                             ▼
                               (Tự động rời Partial Index,
                                cho phép gửi lại tương lai)
```

1. **`pending`**: Chờ người nhận quyết định hoặc người gửi rút.
2. **`accepted`**: Người nhận chấp thuận. Tiến hành sao chép tài liệu, ghi log 2 phía, lưu metadata người chia sẻ.
3. **`auto_accepted`**: Tự động chấp nhận ngay khi tạo (không qua bước pending).
4. **`rejected`**: Người nhận từ chối. Không sao chép tài liệu.
5. **`withdrawn`**: Người gửi chủ động hủy lời mời khi người nhận chưa kịp xử lý.
6. **`expired`**: Lời mời quá 30 ngày chưa được xử lý sẽ tự động hết hiệu lực.

---

## 4. Cơ chế Sao chép Tài liệu (Copy-on-Accept)
- **Tiết kiệm dung lượng (Zero Storage Duplication)**: Bản sao mới trong kho người nhận tái sử dụng nguyên vẹn `file_path` và `checksum` của tài liệu gốc. Không upload hay nhân bản file vật lý trên đĩa cứng.
- **Hỗ trợ Gói tài liệu (Bundle)**: Khi chia sẻ một Bundle, hệ thống tự động quét và sao chép toàn bộ các tài liệu con (`bundle_children`) vào kho cá nhân của người nhận, đồng thời liên kết chính xác `bundle_parent_id` của bản sao con tới bản sao cha mới.
- **Metadata Người chia sẻ**:
  Bản sao được gắn kèm trong trường `metadata`:
  ```json
  {
    "shared_by": {
      "id": 11,
      "username": "nguyen",
      "full_name": "Nguyễn Văn Nguyên",
      "role": "teacher"
    },
    "shared_at": "2026-11-06T07:30:00Z",
    "share_message": "Tài liệu ôn tập chương 1"
  }
  ```
- **Log hoạt động hai chiều**:
  - Ghi nhận `ActivityAction.SHARED` cho tài liệu gốc của người gửi.
  - Ghi nhận `ActivityAction.RECEIVED` cho bản sao của người nhận.
  - Tăng `DocumentStats.share_count` bằng lệnh Upsert nguyên tử của PostgreSQL.
