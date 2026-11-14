---
id: ADR-001-HYBRID-STORAGE-R2-LOCAL
title: "ADR-001: Kiến Trúc Lưu Trữ Lai (Cloudflare R2 + Local)"
sidebar_position: 2
---

# 📜 ADR-001: Lựa Chọn Kiến Trúc Lưu Trữ Lai (Cloudflare R2 + Local Filesystem)

---

## 1. Trạng Thái
* **Trạng thái:** `Accepted` (Đã phê duyệt và đang vận hành)
* **Ngày quyết định:** 05/10/2026
* **Người phê duyệt:** Nhóm Kiến Trúc & Trưởng Dự Án

---

## 2. Bối Cảnh (Context)
Hệ thống Thư Viện Số quản lý hàng chục ngàn tài liệu học tập (PDF, DOCX, Code, Slide) phục vụ hàng ngàn sinh viên trong trường đại học. Khi triển khai trên môi trường đám mây:
1. Các dịch vụ lưu trữ đối tượng truyền thống như **AWS S3** hay **Google Cloud Storage** áp dụng mức phí truyền dữ liệu ra ngoài (**Data Egress Fees**) rất cao (khoảng $0.09 / GB). Khi sinh viên tải tài liệu ồ ạt trong các tuần thi cử, chi phí phát sinh có thể vượt ngân sách nhà trường.
2. Đồng thời, đồ án cần có khả năng vận hành kiểm thử, chấm điểm và bảo vệ ngoại tuyến hoàn toàn (**100% Offline / Localhost**) mà không cần phụ thuộc vào tài khoản đám mây hay mạng Internet.

---

## 3. Các Phương Án Đã Cân Nhắc
1. **Phương án A: Chỉ dùng Local Filesystem**
   * *Ưu điểm:* Dễ cài đặt, không tốn chi phí bên ngoài.
   * *Nhược điểm:* Khó mở rộng nhiều máy chủ (Multi-instance), nguy cơ mất dữ liệu khi máy chủ gặp sự cố đĩa cứng.
2. **Phương án B: Dùng AWS S3 thuần túy**
   * *Ưu điểm:* Ổn định, độ sẵn sàng 99.99%.
   * *Nhược điểm:* Chi phí băng thông tải về (Egress) đắt đỏ; không thể chạy offline khi bảo vệ đồ án.
3. **Phương án C: Kiến trúc Lưu trữ Lai (Cloudflare R2 + Local Filesystem Fallback)**
   * *Ưu điểm:* Tương thích giao thức chuẩn S3 API (dùng chung thư viện `boto3`); **0đ chi phí egress** từ Cloudflare R2; tự động chuyển đổi sang Local Filesystem khi chạy ngoại tuyến.

---

## 4. Quyết Định (Decision)
**Quyết định lựa chọn Phương án C.**  
Xây dựng lớp trừu tượng hóa tầng lưu trữ (`backend/app/services/file_service.py`):
* Nếu biến môi trường `R2_BUCKET_NAME` được cấu hình: Tự động kích hoạt driver S3 kết nối tới Cloudflare R2 Bucket.
* Nếu không có cấu hình R2 (hoặc cờ `OFFLINE_MODE=True`): Tự động rơi về lưu trữ tại thư mục cục bộ `backend/storage/` và phục vụ file tĩnh qua FastAPI `StaticFiles`.

---

## 5. Hệ Quả & Đánh Đổi (Consequences)
* **Tích cực:** 
  * Tiết kiệm 100% ngân sách băng thông truyền tải ra ngoài cho nhà trường.
  * Giúp sinh viên và giảng viên dễ dàng thiết lập môi trường chạy offline 100% chỉ trong 5 phút.
* **Tiêu cực / Rủi ro:** 
  * Cần duy trì song song hai nhánh xử lý đường dẫn (`file_path` dạng URL CDN trên Cloud và đường dẫn cục bộ trên Local).
  * Đã được giải quyết triệt để thông qua chuẩn hóa URL trong `DocumentOut` schema.
