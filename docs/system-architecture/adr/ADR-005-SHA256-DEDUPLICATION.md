---
id: ADR-005-SHA256-DEDUPLICATION
title: "ADR-005: Khử Trùng Lặp Tệp Tin Bằng Mã Băm SHA-256"
sidebar_position: 6
---

# 📜 ADR-005: Lựa Chọn Thuật Toán SHA-256 Để Nhận Diện Trùng Lặp (Deduplication)

---

## 1. Trạng Thái
* **Trạng thái:** `Accepted` (Đã phê duyệt và đang vận hành)
* **Ngày quyết định:** 18/10/2026
* **Người phê duyệt:** Nhóm Bảo Mật & Lưu Trữ

---

## 2. Bối Cảnh (Context)
Trong môi trường học tập, sinh viên thường xuyên tải lên cùng một slide bài giảng hoặc đề thi mẫu nhưng đổi tên file (ví dụ: `giai-tich-1.pdf`, `Slide_Thay_Tung.pdf`, `final.pdf`). Nếu chỉ kiểm tra theo tên tệp hoặc dung lượng, hệ thống sẽ lưu trữ hàng trăm bản sao vô ích, làm cạn kiệt dung lượng đĩa cứng.  
Nhóm cần lựa chọn giải pháp nhận diện bản chất nhị phân của tệp:
1. So sánh tên file và kích thước (File Name & Size).
2. Mã băm MD5 / SHA-1.
3. Thuật toán mật mã học **SHA-256**.

---

## 3. Các Phương Án Đã Cân Nhắc
1. **Phương án A: So sánh Tên và Kích thước file**
   * *Không khả thi:* Hai file nội dung hoàn toàn khác nhau vẫn có thể có cùng kích thước byte; đổi tên file làm hỏng toàn bộ logic kiểm tra.
2. **Phương án B: Dùng MD5 hoặc SHA-1**
   * *Ưu điểm:* Tốc độ tính toán nhanh.
   * *Nhược điểm:* Đã bị chứng minh có khả năng xảy ra va chạm mã băm (Hash Collision) do tấn công cố ý, không còn đạt tiêu chuẩn an toàn thông tin hiện đại.
3. **Phương án C: Thuật toán Mật mã học SHA-256 (Secure Hash Algorithm 256-bit)**
   * *Ưu điểm:* 
     * Không gian địa chỉ $2^{256}$ khả năng va chạm mã băm về mặt lý thuyết là xấp xỉ bằng $0$.
     * Được hỗ trợ tăng tốc phần cứng (Hardware Acceleration) trên mọi CPU hiện đại, tốc độ tính toán đạt hàng trăm MB/s.
     * Tích hợp sẵn trong thư viện chuẩn `hashlib` của Python.

---

## 4. Quyết Định (Decision)
**Quyết định lựa chọn Phương án C (Thuật toán SHA-256).**  
Áp dụng kỹ thuật **Stream Chunking 64KB** trong `backend/app/services/file_service.py`:
* Không nạp toàn bộ file vào bộ nhớ RAM cùng một lúc.
* Đọc từng khối 64KB từ luồng upload và truyền liên tục vào `hashlib.sha256()`.
* Lưu chuỗi hex 64 ký tự vào trường `file_hash` của bảng `documents` có chỉ mục B-Tree `ix_documents_file_hash`.

---

## 5. Hệ Quả & Đánh Đổi (Consequences)
* **Tích cực:** 
  * Phát hiện chính xác 100% các tệp tin trùng lặp nội dung bất kể tên file bị thay đổi.
  * Mức độ tiêu thụ RAM của máy chủ được khống chế ở mức tối thiểu (~64KB per upload stream), loại bỏ hoàn toàn nguy cơ quá tải bộ nhớ (Out-Of-Memory).
* **Tiêu cực / Rủi ro:** 
  * Tốn thêm một lượng nhỏ chu kỳ CPU khi người dùng tải lên tệp tin lớn (> 40MB). Thời gian tính toán đo lường thực tế chỉ mất < 200ms trên CPU tiêu chuẩn.
