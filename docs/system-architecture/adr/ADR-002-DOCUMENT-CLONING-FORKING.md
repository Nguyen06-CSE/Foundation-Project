---
id: ADR-002-DOCUMENT-CLONING-FORKING
title: "ADR-002: Mô Hình Nhân Bản Độc Lập (Document Forking)"
sidebar_position: 3
---

# 📜 ADR-002: Lựa Chọn Mô Hình Nhân Bản Độc Lập (Document Cloning / Forking)

---

## 1. Trạng Thái
* **Trạng thái:** `Accepted` (Đã phê duyệt và đang vận hành)
* **Ngày quyết định:** 08/10/2026
* **Người phê duyệt:** Nhóm Kiến Trúc Hệ Thống

---

## 2. Bối Cảnh (Context)
Trong hệ thống Thư Viện Số, sinh viên thường xuyên tìm thấy tài liệu hay từ Kho cộng đồng hoặc từ Nhóm học tập và muốn "lưu về kho cá nhân" để ghi chú, gắn thẻ phân loại riêng và phục vụ việc học tập lâu dài.  
Có hai trường phái thiết kế mô hình dữ liệu chính:
1. **Mô hình Con trỏ / Liên kết (Pointer / Symlink Pattern):** Chỉ tạo một bản ghi liên kết trỏ tới ID tài liệu gốc.
2. **Mô hình Nhân bản Độc lập (Cloning / Forking Pattern):** Tạo một bản ghi tài liệu mới độc lập hoàn toàn cho người nhận.

---

## 3. Các Phương Án Đã Cân Nhắc
1. **Phương án A: Mô hình Con trỏ / Shortcut**
   * *Ưu điểm:* Tiết kiệm bản ghi cơ sở dữ liệu.
   * *Nhược điểm nghiêm trọng:* 
     * Nếu tác giả ban đầu xóa tài liệu hoặc rời khỏi trường, tài liệu trong kho của người nhận sẽ bị mất (hiệu ứng xóa dây chuyền).
     * Khó khăn khi người nhận muốn ghi chú riêng, đổi tên file cho dễ nhớ hoặc gắn nhãn mà không làm ảnh hưởng đến tài liệu gốc của giảng viên.
2. **Phương án B: Nhân bản Độc lập (Cloning / Forking)**
   * *Ưu điểm:* Bản sao thuộc sở hữu tuyệt đối của người nhận; người nhận có toàn quyền thao tác; tài liệu gốc được bảo vệ an toàn.
   * *Nhược điểm:* Tăng số lượng bản ghi trong bảng `documents`. (Tuy nhiên, file nhị phân vật lý trên Storage vẫn có thể chia sẻ chung đường dẫn nhờ mã băm SHA-256).

---

## 4. Quyết Định (Decision)
**Quyết định lựa chọn Phương án B (Mô hình Forking / Cloning).**  
Khi người dùng bấm *"Lưu về kho cá nhân"*:
* Hệ thống sinh một bản ghi mới trong bảng `documents` với `user_id = current_user.id` và `workspace_context = 'personal'`.
* Sao chép toàn bộ metadata học thuật và đường dẫn file vật lý.
* Người nhận sở hữu một bản sao độc lập trọn vẹn.

---

## 5. Hệ Quả & Đánh Đổi (Consequences)
* **Tích cực:** 
  * Bảo đảm trải nghiệm học tập cá nhân hóa: người học tự do thêm ghi chú, sửa tiêu đề học phần mà không sợ làm hỏng học liệu chung.
  * Ngăn ngừa hoàn toàn nguy cơ mất dữ liệu dây chuyền khi tài liệu gốc bị tác giả xóa.
* **Tiêu cực / Rủi ro:** 
  * Số lượng bản ghi trong bảng `documents` tăng nhanh hơn. Được giải quyết bằng cách đánh chỉ mục (Indexing) tối ưu trên trường `(user_id, is_deleted)`.
