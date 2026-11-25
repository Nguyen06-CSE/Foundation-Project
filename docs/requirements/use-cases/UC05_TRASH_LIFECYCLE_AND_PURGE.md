---
id: UC05_TRASH_LIFECYCLE_AND_PURGE
title: "UC-05: Vòng Đời Thùng Rác & Tự Động Dọn Dẹp"
sidebar_position: 6
---

# 🗑️ UC-05: Vòng Đời Thùng Rác & Tự Động Dọn Dẹp (Trash Lifecycle & Purge)

---

## 1. Thông Tin Tổng Quan
* **Mã nghiệp vụ:** `UC-05`
* **Tác nhân chính:** Người dùng sở hữu tài liệu, Tiến trình chạy nền hệ thống (`APScheduler`).
* **Mục tiêu:** Cung cấp cơ chế xóa dữ liệu an toàn tránh mất mát do thao tác nhầm lẫn, đồng thời tự động giải phóng dung lượng lưu trữ cho hệ thống sau 30 ngày.
* **Mức độ ưu tiên:** Cao (P1).
* **Trạng thái:** `[Confirmed]` | **Mã nguồn:** `[Implemented]`

---

## 2. Vòng Đời Tài Liệu Qua Các Trạng Thái

```mermaid
stateDiagram-v2
    [*] --> Active: Người dùng tải lên thành công
    Active --> SoftDeleted: Người dùng bấm "Xóa" (Chuyển vào thùng rác)
    SoftDeleted --> Active: Người dùng bấm "Khôi phục" (Trong vòng 30 ngày)
    SoftDeleted --> Purged: Người dùng bấm "Xóa vĩnh viễn" thủ công
    SoftDeleted --> Purged: Quá hạn 30 ngày (APScheduler tự động dọn)
    Purged --> [*]: Bản ghi DB bị xóa; file chỉ xóa khi không còn tham chiếu
```

---

## 3. Luồng Chi Tiết Các Tình Huống Nghiệp Vụ

### 3.1. Luồng 1: Xóa Mềm Tài Liệu (Soft Delete)
1. **Hành động:** Người dùng chọn 1 hoặc nhiều tài liệu trong kho cá nhân/nhóm và chọn *"Xóa"*.
2. **Xử lý Backend:**
   * Cập nhật trường `is_deleted = True` và ghi nhận thời điểm xóa `deleted_at = now()`.
   * Ghi log hành vi `action = 'delete'` vào bảng `download_logs`.
3. **Kết quả:** Tài liệu lập tức ẩn khỏi danh sách tài liệu đang hoạt động và không thể tìm kiếm, nhưng file vật lý trên Storage vẫn được bảo toàn nguyên vẹn.

---

### 3.2. Luồng 2: Khôi Phục Tài Liệu (Restore)
1. **Hành động:** Người dùng truy cập Thùng rác (`/personal/trash`), chọn tài liệu cần lấy lại và bấm *"Khôi phục"*.
2. **Xử lý Backend:**
   * Kiểm tra thư mục gốc trước đây của tài liệu còn tồn tại hay không. Nếu thư mục cũ đã bị xóa, tài liệu được đưa về thư mục gốc (Root).
   * Đặt lại cờ `is_deleted = False`, `deleted_at = NULL`.
3. **Kết quả:** Tài liệu xuất hiện trở lại tại vị trí ban đầu với đầy đủ metadata, nhãn và ghi chú.

---

### 3.3. Luồng 3: Tác Vụ Quét Dọn Tự Động Sau 30 Ngày (Scheduled Purge)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as APScheduler (Tác Vụ Nền Hàng Đêm)
    participant Svc as Trash Service
    participant DB as PostgreSQL Database
    participant Storage as Local Filesystem (storage/)

    Note over Cron: APScheduler kích hoạt theo lịch hệ thống
    Cron->>Svc: Kích hoạt hàm `cleanup_deleted_documents()`
    Svc->>DB: Truy vấn danh sách tài liệu có `is_deleted = True` AND `deleted_at < now() - INTERVAL '30 days'`
    DB-->>Svc: Trả về danh sách tệp quá hạn lưu trữ
    
    loop Xử lý từng tài liệu quá hạn
        Svc->>Storage: Kiểm tra reference count của file_path, thumbnail_path, markdown_path
        Storage-->>Svc: Xác nhận đã xóa file trên đĩa / R2
        Svc->>DB: DELETE FROM documents WHERE id = :id (Hard Delete)
    end
    
    DB-->>Svc: Commit hoàn tất dọn dẹp CSDL
    Svc-->>Cron: Ghi log hoàn thành giải phóng bộ nhớ
```

---

## 4. Các Biện Pháp An Toàn Khi Xóa Vĩnh Viễn
1. **Bảo toàn dữ liệu dùng chung:** Trước khi xóa `file_path`, `thumbnail_path` hoặc `markdown_path`, helper `remove_file_if_unreferenced` đếm các bản ghi còn tham chiếu. File vật lý chỉ bị xóa khi không còn bản ghi nào tham chiếu.
2. **Rủi ro giao dịch:** Source xóa Storage trước khi commit xóa DB. Nếu commit thất bại, có thể còn bản ghi trỏ tới file đã bị xóa.
