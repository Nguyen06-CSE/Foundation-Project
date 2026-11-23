---
title: Chuẩn Hóa Biến Môi Trường (Environment Variables)
sidebar_label: 🔐 Biến môi trường
sidebar_position: 4
---

# 🔐 CHUẨN HÓA BIẾN MÔI TRƯỜNG CHO CHẾ ĐỘ LOCAL

Tài liệu này cung cấp định nghĩa chi tiết, kiểu dữ liệu, giá trị mặc định và mục đích bảo mật của toàn bộ các biến môi trường được sử dụng trong hệ thống khi vận hành ở chế độ Cục bộ (Localhost).

---

## 1. Biến Môi Trường Backend (`backend/.env`)

| Tên biến | Kiểu dữ liệu | Giá trị chuẩn Localhost | Bắt buộc | Mô tả chi tiết |
| :--- | :--- | :--- | :---: | :--- |
| `DATABASE_URL` | String (URI) | `postgresql+asyncpg://postgres:postgres@localhost:5432/elibrary_db` | **Có** | Chuỗi kết nối bất đồng bộ đến CSDL PostgreSQL thông qua driver `asyncpg`. |
| `STORAGE_BACKEND` | String | `local` | **Có** | Cơ chế lưu trữ tệp tin. Đặt `local` để lưu trực tiếp vào thư mục đĩa cứng `backend/storage/`. |
| `SECRET_KEY` | String | `chuỗi_ngẫu_nhiên_an_toàn` | **Có** | Khóa bí mật dùng để ký và giải mã chữ ký điện tử của JSON Web Token (JWT). |
| `ALGORITHM` | String | `HS256` | Không | Thuật toán mã hóa chữ ký JWT. Mặc định là HMAC với SHA-256. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | `1440` (24 giờ) | Không | Thời hạn sống của mã thông báo truy cập (Access Token), tính theo phút. |
| `STORAGE_QUOTA_BYTES` | Integer | `16106127360` (15 GB) | Không | Hạn ngạch dung lượng lưu trữ tối đa cấp cho một tài khoản người dùng (tính bằng byte). |
| `CORS_ORIGINS` | JSON Array | `["http://localhost:5173", "http://127.0.0.1:5173"]` | Không | Danh sách các nguồn gốc (Origin) được phép gửi yêu cầu HTTP chéo miền đến API. |

---

## 2. Biến Môi Trường Frontend (`frontend/digital-library/.env`)

| Tên biến | Kiểu dữ liệu | Giá trị chuẩn Localhost | Bắt buộc | Mô tả chi tiết |
| :--- | :--- | :--- | :---: | :--- |
| `VITE_API_URL` | String (URL) | `http://localhost:8000` | **Có** | Địa chỉ máy chủ Backend API để Axios client thực hiện các lệnh gọi RESTful. |

---

## 3. Nguyên Tắc An Toàn Mã Nguồn

> [!CAUTION]
> Tuyệt đối không bao giờ commit các tệp `.env` chứa mật khẩu thực tế hoặc `SECRET_KEY` lên kho lưu trữ Git công khai.  
> Cả hai thư mục `backend/` và `frontend/digital-library/` đều đã cấu hình `.gitignore` để tự động bỏ qua các tệp `.env`.
