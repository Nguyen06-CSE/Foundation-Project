---
title: Khắc Phục Sự Cố Thường Gặp Khi Chạy Local
sidebar_label: 🛠️ Xử lý sự cố
sidebar_position: 5
---

# 🛠️ KHẮC PHỤC SỰ CỐ THƯỜNG GẶP KHI CHẠY LOCAL

Trong quá trình thiết lập và vận hành hệ thống trên máy cá nhân, bạn có thể gặp một số tình huống lỗi thường gặp. Dưới đây là bảng tổng hợp nguyên nhân và giải pháp khắc phục nhanh.

---

## 1. Lỗi Kết Nối Cơ Sở Dữ Liệu PostgreSQL

### Triệu chứng
Backend báo lỗi: `asyncpg.exceptions.InvalidPasswordError: password authentication failed for user "postgres"` hoặc `ConnectionRefusedError: [Errno 61] Connect call failed ('127.0.0.1', 5432)`.

### Nguyên nhân & Cách khắc phục
1. **Dịch vụ PostgreSQL chưa được bật**:
   - Trên macOS: Chạy `brew services restart postgresql@15`.
   - Trên Linux: Chạy `sudo systemctl restart postgresql`.
   - Trên Windows: Mở `services.msc` và đảm bảo dịch vụ `postgresql-x64-15` đang ở trạng thái **Running**.
2. **Sai mật khẩu trong `DATABASE_URL`**:
   - Mở tệp `backend/.env` và đối chiếu lại `postgres:mật_khẩu_của_bạn@localhost:5432/elibrary_db`.
   - Đặt lại mật khẩu mặc định qua psql:
     ```bash
     psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
     ```

---

## 2. Xung Đột Cổng Mạng (Port Conflict)

### Triệu chứng
Uvicorn báo: `[Errno 48] Address already in use` (cổng 8000) hoặc Vite báo cổng 5173 đã bị chiếm dụng.

### Nguyên nhân & Cách khắc phục
Đang có tiến trình khác chạy ngầm chiếm cổng mạng. Tìm và tắt tiến trình:

```bash
# Tìm tiến trình đang chiếm cổng 8000 (macOS / Linux)
lsof -i :8000
# Tắt tiến trình bằng PID tương ứng
kill -9 <PID>

# Tìm tiến trình trên Windows PowerShell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 3. Lỗi Lệch Phiên Bản Migration Alembic

### Triệu chứng
Alembic báo lỗi: `alembic.util.exc.CommandError: Can't locate revision identified by '...'` hoặc `Target database is not up to date`.

### Nguyên nhân & Cách khắc phục
Cơ sở dữ liệu đang ở phiên bản migration không đồng bộ với mã nguồn hiện tại.
1. Kiểm tra phiên bản hiện tại trong CSDL:
   ```bash
   alembic current
   ```
2. Đưa CSDL về phiên bản mới nhất:
   ```bash
   alembic upgrade head
   ```
3. Nếu CSDL bị xung đột nặng trong lúc phát triển, hãy xóa CSDL và tạo lại từ đầu:
   ```bash
   dropdb -U postgres elibrary_db
   createdb -U postgres elibrary_db
   alembic upgrade head
   ```

---

## 4. Lỗi Quyền Ghi File Trong Thư Mục `storage/`

### Triệu chứng
Khi tải file lên, backend trả về lỗi HTTP 500 với log: `PermissionError: [Errno 13] Permission denied: 'storage/...'`.

### Cách khắc phục
Cấp quyền ghi cho người dùng hiện tại trên thư mục lưu trữ:

```bash
mkdir -p backend/storage
chmod -R 755 backend/storage
```
