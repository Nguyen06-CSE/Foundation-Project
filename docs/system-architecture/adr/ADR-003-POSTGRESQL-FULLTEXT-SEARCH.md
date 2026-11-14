---
id: ADR-003-POSTGRESQL-FULLTEXT-SEARCH
title: "ADR-003: Tìm Kiếm Toàn Văn Tích Hợp Qua PostgreSQL FTS"
sidebar_position: 4
---

# 📜 ADR-003: Lựa Chọn PostgreSQL Full-Text Search (FTS) Thay Vì Elasticsearch

---

## 1. Trạng Thái
* **Trạng thái:** `Accepted` (Đã phê duyệt và đang vận hành)
* **Ngày quyết định:** 12/10/2026
* **Người phê duyệt:** Nhóm Kỹ Thuật Dữ Liệu

---

## 2. Bối Cảnh (Context)
Tính năng tìm kiếm tài liệu theo từ khóa ngữ nghĩa bên trong nội dung văn bản (Full-Text Search) là một trong những tính năng cốt lõi nhất của dự án. Nhóm cần quyết định hạ tầng phục vụ chức năng tìm kiếm giữa:
1. Triển khai một cụm công cụ tìm kiếm độc lập chuyên dụng như **Elasticsearch** hoặc **Meilisearch**.
2. Tận dụng cỗ máy tìm kiếm toàn văn tích hợp sẵn của **PostgreSQL** (`tsvector` + `tsquery`).

---

## 3. Các Phương Án Đã Cân Nhắc
1. **Phương án A: Triển khai cụm Elasticsearch**
   * *Ưu điểm:* Khả năng tìm kiếm mờ (Fuzzy matching) rất mạnh, xử lý hàng triệu bản ghi dễ dàng.
   * *Nhược điểm:* 
     * Rất tốn bộ nhớ RAM (yêu cầu tối thiểu 2GB - 4GB RAM chỉ cho tiến trình Java JVM).
     * Phức tạp hóa hạ tầng: Cần xây dựng đường ống đồng bộ dữ liệu (Change Data Capture / Dual Write) từ PostgreSQL sang Elasticsearch, dễ dẫn đến tình trạng dữ liệu tìm kiếm bị trễ (Sync Lag) hoặc không nhất quán.
     * Rất cồng kềnh khi sinh viên muốn chạy thử nghiệm đồ án ở chế độ Offline trên máy tính cá nhân.
2. **Phương án B: Sử dụng PostgreSQL Full-Text Search tích hợp**
   * *Ưu điểm:* 
     * **0đ chi phí hạ tầng bổ sung:** Tận dụng trực tiếp máy chủ PostgreSQL hiện có.
     * **Tính nhất quán tuyệt đối:** Tìm kiếm luôn phản ánh ngay lập tức dữ liệu vừa commit (ACID), không có độ trễ đồng bộ.
     * Cung cấp chỉ mục GIN (Generalized Inverted Index) đạt tốc độ truy vấn dưới **50ms** cho kho hàng chục ngàn tài liệu.
     * Chạy hoàn hảo ở chế độ Local Offline.

---

## 4. Quyết Định (Decision)
**Quyết định lựa chọn Phương án B (PostgreSQL Full-Text Search tích hợp).**  
Thêm cột `search_vector tsvector` vào bảng `documents`, thiết lập chỉ mục `USING gin(search_vector)`, kết hợp hàm phân tích trọng số ngữ nghĩa `setweight()` cho Tiêu đề (A), Mô tả (B) và Nội dung trích xuất (C).

---

## 5. Hệ Quả & Đánh Đổi (Consequences)
* **Tích cực:** 
  * Giản lược tối đa kiến trúc hệ thống, giảm thiểu chi phí RAM và công sức bảo trì hạ tầng.
  * Đảm bảo trải nghiệm chạy offline mượt mà trên mọi máy tính cá nhân.
* **Tiêu cực / Rủi ro:** 
  * Xử lý từ đồng nghĩa tiếng Việt phức tạp hơn so với các bộ phân tích (Analyzers) chuyên sâu của Elasticsearch. Được khắc phục bằng cách cấu hình từ điển `simple` và bổ sung tiện ích mở rộng `pg_trgm`.
