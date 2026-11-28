---
title: Hiện Trạng Kỹ Thuật & Giới Hạn Đã Biết (Known Limitations)
sidebar_label: ⚠️ Hiện trạng & Giới hạn
sidebar_position: 4
---

# ⚠️ HIỆN TRẠNG KỸ THUẬT & GIỚI HẠN ĐÃ BIẾT (KNOWN LIMITATIONS)

Tài liệu này cung cấp báo cáo đánh giá trung thực, khách quan về các kết quả kỹ thuật đã hoàn thành, các khoảng trống kiểm thử và các giới hạn kiến trúc của **Foundation Project**, phục vụ phần phản biện khoa học trước Hội đồng chấm đồ án.

---

## 1. Đánh Giá Các Kết Quả Kỹ Thuật Đã Đạt Được (Strengths)

1. **Hiện thực hóa trọn vẹn mô hình 3 Kho Lưu Trữ**:
   - Kho cá nhân, Kho nhóm làm việc và Kho học liệu số hoạt động ổn định, phân định ranh giới sở hữu và thẩm quyền truy cập rõ ràng.
2. **Khử trùng lặp lưu trữ vật lý hiệu quả (SHA-256 Deduplication)**:
   - Giúp tiết kiệm đáng kể không gian đĩa cứng trên máy chủ cục bộ khi nhiều người dùng cùng chia sẻ hoặc nộp chung các tài liệu giáo trình nặng.
3. **Tận dụng xuất sắc năng lực CSDL quan hệ PostgreSQL**:
   - Sử dụng thành công chỉ mục GIN trên `tsvector` cho Full-Text Search, Partial Unique Index chống trùng lặp chia sẻ và các ràng buộc khóa ngoại đảm bảo tính toàn vẹn tuyệt đối.
4. **Vận hành độc lập 100% Cục bộ (Localhost-First)**:
   - Hệ thống được cấu hình chuẩn mực để chạy hoàn toàn không cần Internet, sẵn sàng cho mọi kịch bản demo và bảo vệ đồ án.

---

## 2. Các Khoảng Trống Kiểm Thử (Testing Gaps)

Mặc dù hệ thống đã có bộ kiểm thử tích hợp Backend bằng `pytest` đạt độ tin cậy cao, nhóm phát triển thẳng thắn ghi nhận các khoảng trống kiểm thử sau:

| Khoảng trống | Mô tả chi tiết | Tác động & Rủi ro | Giải pháp nâng cấp trong tương lai |
| :--- | :--- | :--- | :--- |
| **Kiểm thử E2E Giao diện Tự động** | Chưa cài đặt framework kiểm thử tự động đầu cuối (như Playwright hoặc Cypress) trên Frontend React. | Có rủi ro phát sinh lỗi hiển thị hoặc hồi quy giao diện khi thay đổi các component React phức tạp. | Bổ sung bộ kịch bản kiểm thử Playwright tự động hóa 6 luồng người dùng cốt lõi. |
| **Kiểm thử Chịu tải Đồng thời (Load/Stress Testing)** | Chưa thực hiện đo kiểm hiệu năng chịu tải dưới áp lực hàng trăm người dùng gửi request cùng lúc (bằng k6 hoặc Locust). | Chưa có số liệu chính xác về ngưỡng nghẽn cổ chai (Bottleneck) khi nhiều người dùng cùng tải tệp tin dung lượng lớn. | Xây dựng kịch bản k6 mô phỏng 500 sinh viên đồng thời truy cập tra cứu mùa thi cử. |

---

## 3. Các Giới Hạn Kiến Trúc Đã Biết (Known Architectural Limitations)

### 3.1. Giới Hạn Lưu Trữ Đơn Máy Chủ (Single-Node Filesystem)
- **Hiện trạng**: Toàn bộ tệp tin được lưu trên đĩa cứng của một máy chủ duy nhất (`backend/storage/`).
- **Giới hạn**: Không có cơ chế nhân bản (Replication) tự động giữa nhiều ổ đĩa. Nếu máy tính bị hỏng ổ cứng vật lý, dữ liệu có nguy cơ bị mất mát nếu không có bản sao lưu (Backup) thủ công.
- **Phương án khắc phục**: Khi hệ thống được nâng cấp lên môi trường phân tán quy mô lớn, có thể chuyển đổi sang cụm lưu trữ MinIO hoặc Ceph On-premises hỗ trợ giao thức S3.

### 3.2. Chưa Có Hàng Đợi Tác Vụ Nặng Độc Lập (Task Queue / Celery)
- **Hiện trạng**: Các tác vụ như trích xuất văn bản từ PDF, sinh ảnh thu nhỏ trang bìa hiện đang chạy bằng `BackgroundTasks` nội tại của FastAPI.
- **Giới hạn**: `BackgroundTasks` chạy chung tiến trình bộ nhớ với API server. Nếu người dùng tải lên đồng thời 50 tệp PDF nặng hàng trăm trang, việc xử lý CPU chuyên sâu có thể làm chậm tạm thời các request HTTP khác.
- **Phương án khắc phục**: Tách riêng một tiến trình xử lý nền bằng Celery hoặc ARQ kết hợp với Redis Message Broker.

### 3.3. Xử Lý Ngôn Ngữ Tự Nhiên Tiếng Việt Trong Full-Text Search
- **Hiện trạng**: PostgreSQL FTS hiện tại sử dụng cấu hình ngôn ngữ `'simple'` để đối khớp các từ tố không dấu.
- **Giới hạn**: Hệ thống chưa có từ điển đồng nghĩa (Synonyms) hoặc từ điển tách từ ghép tiếng Việt chuyên sâu (như từ điển phân tích hình thái học).
- **Phương án khắc phục**: Tích hợp extension `pg_trgm` (Trigram similarity) hoặc mô-đun tách từ tiếng Việt vào PostgreSQL trong giai đoạn phát triển tiếp theo.
# Trạng thái AI/vector

Code/test acceptance có điều kiện; operational DB local deferred. Benchmark TBD. OCR chuyên biệt Phase 7 và advanced QA Phase 8 chưa triển khai.
