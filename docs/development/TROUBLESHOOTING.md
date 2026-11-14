---
id: TROUBLESHOOTING
title: Cẩm Nang Sửa Lỗi Local
sidebar_position: 6
---

# 🔧 Cẩm Nang Khắc Phục Sự Cố Khi Chạy Local (Local Troubleshooting)

Tài liệu này tổng hợp các lỗi kỹ thuật phổ biến nhất mà lập trình viên thường gặp phải khi cài đặt và chạy hệ thống **Digital Library** ở môi trường máy tính cá nhân (Local Development / Offline Mode), kèm theo nguyên nhân cốt lõi và hướng dẫn sửa lỗi từng bước.

> ⚠️ *Lưu ý: Tài liệu này tập trung vào sự cố trên máy tính cá nhân (Local). Đối với sự cố triển khai hạ tầng đám mây (Cloudflare R2, CDN, SSL), vui lòng tham khảo [Cẩm Nang Sự Cố Deployment (docs/deployment/TROUBLESHOOTING.md)](../deployment/TROUBLESHOOTING.md).*

---

## 1. Sự Cố Xung Đột Cổng Mạng (Port 8000 / 5173 Already in Use)

### Triệu chứng:
Khởi chạy `uvicorn` hoặc `vite` báo lỗi:
`[Errno 48] Address already in use` hoặc `Port 5173 is in use, trying another one...`.

### Nguyên nhân:
Một tiến trình cũ của Python hoặc Node.js chưa được tắt hoàn toàn và vẫn đang chiếm dụng cổng mạng.

### Cách xử lý:
Tìm và giải phóng cổng mạng:
* **Trên macOS / Linux:**
  ```bash
  # Tìm PID của tiến trình đang chiếm cổng 8000
  lsof -i :8000
  # Tắt tiến trình
  kill -9 <PID>
  
  # Làm tương tự với cổng 5173
  lsof -i :5173
  kill -9 <PID>
  ```
* **Trên Windows (PowerShell):**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
  ```

---

## 2. Sự Cố Kết Nối Cơ Sở Dữ Liệu AsyncPG (Database Connection Failed)

### Triệu chứng:
Backend báo lỗi:
`ConnectionRefusedError: [Errno 61] Connect call failed ('127.0.0.1', 5432)` hoặc `asyncpg.exceptions.InvalidCatalogNameError: database "elibrary" does not exist`.

### Nguyên nhân:
1. Dịch vụ PostgreSQL chưa được khởi chạy.
2. Hoặc database có tên `elibrary` chưa được tạo trước khi chạy ứng dụng.

### Cách xử lý:
1. Kiểm tra xem container Docker PostgreSQL có đang chạy không:
   ```bash
   docker ps
   # Nếu chưa chạy, khởi động lại:
   docker start elibrary-postgres
   ```
2. Nếu database chưa tồn tại, tạo database mới:
   ```bash
   psql -U postgres -h localhost -c "CREATE DATABASE elibrary;"
   ```
3. Kiểm tra lại chuỗi `DATABASE_URL` trong file `.env` xem user và mật khẩu có khớp với PostgreSQL local hay không.

---

## 3. Sự Cố Thiếu Công Cụ Tesseract OCR (TesseractNotFoundError)

### Triệu chứng:
Khi tải lên một file ảnh scan hoặc PDF dạng ảnh, Backend ghi log lỗi:
`pytesseract.pytesseract.TesseractNotFoundError: tesseract is not installed or it's not in your PATH`.

### Nguyên nhân:
Thư viện Python `pytesseract` chỉ là lớp bọc (wrapper), yêu cầu máy tính phải cài đặt công cụ nhị phân Tesseract OCR thực tế.

### Cách xử lý:
* **Trên macOS:**
  ```bash
  brew install tesseract tesseract-lang
  ```
* **Trên Linux Ubuntu:**
  ```bash
  sudo apt install tesseract-ocr tesseract-ocr-vie
  ```
* *Giải pháp thay thế:* Nếu bạn không cần kiểm thử tính năng nhận diện chữ tiếng Việt từ ảnh scan, bạn có thể bỏ qua lỗi này; hệ thống vẫn xử lý bình thường mọi loại tệp PDF text, Word, Excel, Slide và Code.

---

## 4. Sự Cố Chặn Chia Sẻ Tài Nguyên Nguồn Gốc Chéo (CORS Error)

### Triệu chứng:
Tại tab Console của trình duyệt xuất hiện dòng chữ đỏ:
`Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`.

### Nguyên nhân:
Frontend chạy trên cổng `5173` trong khi Backend chạy trên cổng `8000`, và địa chỉ nguồn gốc `http://localhost:5173` chưa được cho phép trong cấu hình CORS Middleware.

### Cách xử lý:
Kiểm tra file `backend/app/main.py`:
Đảm bảo mảng `origins` có chứa cổng của Vite:
```python
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
```

---

## 5. Sự Cố Quyền Ghi Thư Mục Lưu Trữ Cục Bộ (Permission Denied)

### Triệu chứng:
Khi tải file lên ở chế độ `STORAGE_BACKEND=local`, Backend báo lỗi:
`PermissionError: [Errno 13] Permission denied: 'backend/storage/...'`.

### Nguyên nhân:
Thư mục lưu trữ tệp cục bộ chưa được cấp quyền ghi cho tiến trình Python của người dùng hiện tại.

### Cách xử lý:
Tạo thư mục và cấp quyền ghi đầy đủ:
```bash
mkdir -p backend/storage/temp backend/storage/documents backend/storage/thumbnails
chmod -R 755 backend/storage
```

---

## 6. Sự Cố Lệch Pha Di Chuyển Lược Đồ Alembic (Migration Desync)

### Triệu chứng:
Chạy `alembic upgrade head` báo lỗi:
`alembic.util.exc.CommandError: Can't locate revision identified by 'xxxx'` hoặc `Target database is not up to date`.

### Nguyên nhân:
Cơ sở dữ liệu đang lưu bảng `alembic_version` với mã revision từ một nhánh Git khác không còn tồn tại trong thư mục `alembic/versions/`.

### Cách xử lý:
Đồng bộ hóa lại bảng version hoặc hạ cấp sạch sẽ:
```bash
# Xem revision hiện tại của database
alembic current

# Đưa revision về bản mới nhất trong mã nguồn
alembic stamp head
```
