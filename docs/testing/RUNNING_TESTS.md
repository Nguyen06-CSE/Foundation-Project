---
title: Cẩm Nang Thực Thi Kiểm Thử
sidebar_label: 💻 Chạy kiểm thử
sidebar_position: 3
---

# Cẩm Nang Thực Thi Kiểm Thử (Running Tests Guide)

Tài liệu này cung cấp danh sách đầy đủ các câu lệnh và hướng dẫn từng bước để thiết lập và thực thi các bộ kiểm thử tự động trên toàn hệ thống **Foundation Project**.

---

## 1. Chuẩn Bị Môi Trường Kiểm Thử

Trước khi thực thi kiểm thử, đảm bảo bạn đã hoàn thành các bước sau:
1. Đã kích hoạt môi trường ảo Python và cài đặt đầy đủ dependencies (`pip install -r backend/requirements.txt`).
2. Cơ sở dữ liệu PostgreSQL đang hoạt động và đã chạy migration mới nhất (`alembic upgrade head`).
3. Đã cài đặt thư viện Node.js cho frontend (`npm --prefix frontend/digital-library install`).

---

## 2. Kiểm Thử Backend (Pytest)

### 2.1. Chạy Toàn Bộ Bộ Kiểm Thử Backend
```bash
# Chạy toàn bộ các file test trong thư mục backend/tests/
.venv/bin/pytest backend/tests/ -v
```

### 2.2. Chạy Từng File Kiểm Thử Chuyên Biệt
Khi đang phát triển một tính năng cụ thể, bạn nên chạy riêng file test liên quan để nhận phản hồi nhanh:

```bash
# Kiểm thử xác thực & tài khoản
.venv/bin/pytest backend/tests/test_auth.py -v

# Kiểm thử luồng chia sẻ & phân quyền RBAC
.venv/bin/pytest backend/tests/test_shares.py -v

# Kiểm thử chống nhân bản tệp lưu trữ SHA-256
.venv/bin/pytest backend/tests/test_storage_dedup.py -v

# Kiểm thử bộ đếm tài liệu thư viện cộng đồng
.venv/bin/pytest backend/tests/test_library_counts.py -v

# Kiểm thử thống kê tổng quan Personal Dashboard
.venv/bin/pytest backend/tests/test_dashboard.py -v

# Kiểm thử gom nhóm tài liệu (Bundle) và chế độ xem
.venv/bin/pytest backend/tests/test_new_features.py -v
```

### 2.3. Chạy Một Ca Kiểm Thử Cụ Thể (Filter by Keyword)
```bash
# Chỉ chạy các test case có chứa từ khóa 'auto_accept'
.venv/bin/pytest backend/tests/test_shares.py -k "auto_accept" -v
```

### 2.4. Chạy Kịch Bản Kiểm Tra Điểm Cuối Phase 2
Hệ thống cung cấp một script kiểm tra tích hợp tự động cho các router:
```bash
.venv/bin/python backend/tests/verify_phase2_endpoints.py
```

---

## 3. Kiểm Tra Chất Lượng Frontend (Static Analysis & Linting)

### 3.1. Kiểm Tra Nghiêm Ngặt Kiểu Dữ Liệu TypeScript
Lệnh này biên dịch toàn bộ mã TypeScript phía Frontend để đảm bảo không có lỗi ép kiểu sai lệch:
```bash
npm --prefix frontend/digital-library run build
# Tương đương: tsc -b && vite build
```

### 3.2. Quét Lỗi Cú Pháp & Logic Với Oxlint
Sử dụng bộ linter Oxlint siêu tốc để phát hiện lỗi mã nguồn JavaScript/React:
```bash
npm --prefix frontend/digital-library run lint
# Tương đương: oxlint
```

---

## 4. Kiểm Thử Hệ Thống Tài Liệu Docusaurus

Đảm bảo tài liệu không bị đứt gãy liên kết (Broken links) và build thành công mã tĩnh:
```bash
npm --prefix docs-site run build
```

---

## 5. Xử Lý Các Vấn Đề Thường Gặp Khi Chạy Test

### Vấn đề 1: Lỗi `Connection._cancel was never awaited`
- **Nguyên nhân**: Xảy ra khi chạy đồng thời nhiều test async trong một phiên pytest duy nhất với `asyncio_mode=strict`, do các kết nối trong connection pool của SQLAlchemy được tái sử dụng giữa các event loop khác nhau.
- **Cách khắc phục**:
  1. Chạy test theo từng file độc lập như mục 2.2.
  2. Hoặc cấu hình `poolclass=NullPool` trong file `conftest.py` cho môi trường test để mỗi kết nối đóng ngay sau khi test case hoàn tất.

### Vấn đề 2: Lỗi `connection to server at "localhost", port 5432 failed`
- **Nguyên nhân**: Dịch vụ PostgreSQL cục bộ chưa được bật hoặc cấu hình `DATABASE_URL` trong file `.env` sai thông số.
- **Cách khắc phục**: Khởi động PostgreSQL (`brew services start postgresql@15` hoặc `docker compose up -d db`) và kiểm tra lại biến môi trường.
