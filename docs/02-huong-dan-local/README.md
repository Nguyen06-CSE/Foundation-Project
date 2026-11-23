---
title: Hướng Dẫn Vận Hành Cục Bộ (Localhost Guide)
sidebar_label: 💻 Hướng dẫn Local
sidebar_position: 1
---

# 💻 HƯỚNG DẪN VẬN HÀNH CỤC BỘ (100% OFFLINE LOCALHOST)

Chào mừng bạn đến với khu vực hướng dẫn cài đặt và vận hành hệ thống **Foundation Project** hoàn toàn trên môi trường máy tính cá nhân (Localhost / Offline-First).

Tài liệu này được biên soạn đặc biệt phục vụ các thành viên nhóm phát triển, giảng viên hướng dẫn và Hội đồng chấm đồ án có thể thiết lập, chạy thử và kiểm tra toàn bộ các tính năng của nền tảng mà không cần kết nối mạng Internet hay bất kỳ tài khoản dịch vụ đám mây thương mại nào.

---

## 🧭 Lộ Trình Triển Khai 4 Bước

```
  [ Bước 1: Chuẩn Bị ]       [ Bước 2: Khởi Tạo DB ]       [ Bước 3: Chạy Backend ]       [ Bước 4: Chạy Frontend ]
  Cài Python 3.10+,          Tạo CSDL PostgreSQL           Chạy Alembic migration,        npm install, npm run dev,
  Node.js 18+, PostgreSQL   local: elibrary_db            khởi động Uvicorn :8000        truy cập :5173
```

---

## 📚 Danh Mục Tài Liệu Chi Tiết

| Tài liệu | Nội dung hướng dẫn |
| :--- | :--- |
| [**Yêu Cầu Môi Trường (Prerequisites)**](./cai-dat-moi-truong.md) | Danh mục công cụ bắt buộc: Python, Node.js, PostgreSQL và cách cài đặt trên macOS / Linux / Windows |
| [**Khởi Chạy Hệ Thống Từng Bước**](./khoi-chay-he-thong.md) | Hướng dẫn chi tiết từng dòng lệnh từ clone code, cấu hình `.env`, chạy migration đến bật server |
| [**Chuẩn Hóa Biến Môi Trường**](./cau-hinh-va-bien-moi-truong.md) | Bảng tra cứu toàn bộ các tham số cấu hình trong tệp `.env` cho chế độ Localhost |
| [**Khắc Phục Sự Cố Thường Gặp**](./xu-ly-su-co-local.md) | Xử lý lỗi kết nối DB, lỗi cổng mạng 8000/5173, xung đột migration và quyền ghi file `storage/` |

---

## ⚡ Điểm Cần Nhớ Khi Chạy Môi Trường Cục Bộ

1. **Chế độ lưu trữ tệp tin**: Đặt `STORAGE_BACKEND=local` trong `backend/.env`. Tệp tin tải lên sẽ được lưu trữ trực tiếp tại thư mục `backend/storage/{owner_id}/`.
2. **Cơ sở dữ liệu**: Sử dụng PostgreSQL cục bộ tại cổng `5432` với chuỗi kết nối bất đồng bộ:  
   `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/elibrary_db`
3. **Frontend API Endpoint**: Trỏ `VITE_API_URL=http://localhost:8000` trong `frontend/digital-library/.env`.
