---
title: "ADR-003: Sử Dụng PostgreSQL Full-Text Search Thay Vì Elasticsearch"
sidebar_label: "ADR-003: PostgreSQL FTS"
sidebar_position: 3
---

# ADR-003: SỬ DỤNG POSTGRESQL FULL-TEXT SEARCH THAY VÌ ELASTICSEARCH

- **Trạng thái**: Đã chấp thuận (Accepted)
- **Ngày quyết định**: 2026-10-18

---

## 1. Bối Cảnh
Hệ thống cần chức năng tìm kiếm tài liệu theo tiêu đề và nội dung trích xuất với tốc độ cao, hỗ trợ tiếng Việt không dấu và xếp hạng độ liên quan.

## 2. Quyết Định
Chúng tôi quyết định sử dụng tính năng **Full-Text Search tích hợp sẵn của PostgreSQL** kết hợp chỉ mục **GIN Index** và hàm kích hoạt (Trigger) PL/pgSQL, thay vì tích hợp cụm công cụ tìm kiếm độc lập bên ngoài như Elasticsearch hoặc Meilisearch:
- Định nghĩa cột `search_vector tsvector` trên bảng `documents`.
- Đánh chỉ mục `CREATE INDEX ix_documents_search_vector ON documents USING gin(search_vector)`.
- Trigger tự động đồng bộ khi `title` hoặc `content` thay đổi.

## 3. Hệ Quả
- **Ưu điểm**:
  - Không cần cài đặt Java/JVM hay dịch vụ ngoại vi nặng nề.
  - Đảm bảo tính nhất quán dữ liệu 100% trong cùng một giao dịch ACID (không có độ trễ đồng bộ).
  - Hiệu năng tìm kiếm đáp ứng dưới 50ms cho tập dữ liệu hàng chục nghìn tài liệu.
- **Hạn chế**:
  - Cấu hình phân tích ngữ pháp tiếng Việt dừng ở mức cấu hình `'simple'` loại bỏ dấu, chưa hỗ trợ tách từ chuyên sâu (N-gram tokenizer phức tạp) như Elasticsearch.
