---
title: "ADR-001: Lựa Chọn Kiến Trúc Lưu Trữ Tập Tin Cục Bộ (Local Filesystem)"
sidebar_label: "ADR-001: Lưu trữ cục bộ"
sidebar_position: 1
---

# ADR-001: LỰA CHỌN KIẾN TRÚC LƯU TRỮ TẬP TIN CỤC BỘ (LOCAL FILESYSTEM)

- **Trạng thái**: Đã chấp thuận (Accepted)
- **Ngày quyết định**: 2026-10-05
- **Người đề xuất**: Nhóm Kiến Trúc & Phát Triển

---

## 1. Bối Cảnh (Context)
Hệ thống Thư viện số cần một giải pháp lưu trữ các tệp tin học liệu nhị phân (PDF, DOCX, PPTX, hình ảnh) đáp ứng yêu cầu:
- Vận hành mượt mà, độc lập trên máy tính cá nhân phục vụ demo và bảo vệ đồ án.
- Không phát sinh chi phí duy trì tài khoản dịch vụ đám mây bên thứ ba.
- Đảm bảo độ tin cậy và không phụ thuộc vào đường truyền mạng Internet của hội trường chấm thi.

## 2. Quyết Định (Decision)
Chúng tôi quyết định chọn **Hệ thống tập tin cục bộ (Local Filesystem)** tại thư mục `backend/storage/{owner_id}/` làm cơ chế lưu trữ chính thức của đồ án:
- Sử dụng hàm I/O bất đồng bộ của Python kết hợp đặt tên file theo UUIDv4.
- Quản lý siêu dữ liệu tập tin (đường dẫn, tên gốc, kích thước, mime type, checksum) trong CSDL PostgreSQL.

## 3. Hệ Quả & Đánh Đổi (Consequences & Trade-offs)
- **Ưu điểm**:
  - Tốc độ đọc/ghi cực nhanh (< 5ms).
  - Không cần mạng Internet, chi phí 0 VNĐ.
  - Mã nguồn gọn gàng, dễ thiết lập và kiểm thử.
- **Hạn chế & Đánh đổi**:
  - Không có khả năng mở rộng quy mô đa máy chủ (Multi-server Scale-out) nếu không có hệ thống tệp tin mạng dùng chung (NFS).
  - Cần quy trình sao lưu ổ đĩa thủ công định kỳ.
