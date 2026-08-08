# Foundation-Project
# Backend - FastAPI & Swagger UI

Phần backend của dự án được phát triển bằng **FastAPI**, một framework Python hiện đại, hiệu năng cao để xây dựng các API.

## Công nghệ & Phiên bản sử dụng

| Công nghệ / Thư viện | Phiên bản | Mô tả |
| :--- | :--- | :--- |
| **Python** | >= 3.10 | Ngôn ngữ lập trình chính |
| **FastAPI** | 0.111.0 | Web API Framework |
| **Uvicorn** | 0.30.1 | ASGI Server chạy ứng dụng |
| **Pydantic v2** | 2.7.4 | Xác thực dữ liệu và quản lý Schema |
| **SQLAlchemy** | 2.0.31 | Thư viện ORM tương tác Database |
| **asyncpg** | 0.29.0 | Driver kết nối không đồng bộ tới PostgreSQL |

---

## Hướng dẫn cài đặt và chạy cục bộ (Local Development)

### 1. Tạo môi trường ảo (Virtual Environment)
Mở terminal tại thư mục `backend/`:

**Trên macOS/Linux:**
```bash
python3.10 -m venv venv
source venv/bin/activate
```

**Trên Windows:**
```bash
python -m venv venv
.\venv\Scripts\activate
```

### 2. Cài đặt các thư viện (Dependencies)
Sau khi kích hoạt môi trường ảo, chạy:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Chạy Server Development
Chạy lệnh sau để khởi động server hỗ trợ hot-reload (tự động cập nhật khi sửa code):
```bash
uvicorn app.main:app --reload --port 8000
```
Server sẽ chạy tại địa chỉ: `http://localhost:8000`

### 4. lưu í các thư viện trong dự án chỉ phù hợp với phiên bản python 3.10
Nếu đã tải phiên bản python khác hãy xoá môi trường ảo cũ đi, tạo với phiên bản 3.10
các bước trên MacOS
```bash
deactivate

cd backend

rm -rf venv

python3.10 -m venv venv

source venv/bin/activate
```

---

## Tài liệu API (Swagger UI & ReDoc)

Một trong những ưu điểm của FastAPI là tự động sinh tài liệu API (Interactive API documentation). Sau khi chạy server, bạn có thể truy cập:

- **Swagger UI**: `http://localhost:8000/docs` (Giao diện trực quan cho phép gọi thử API trực tiếp)
- **ReDoc**: `http://localhost:8000/redoc` (Giao diện tài liệu API dạng tĩnh)

---

## Hướng dẫn Dockerize Backend (Tùy chọn)

Nếu bạn muốn chạy Backend trong một Docker container:
1. Đảm bảo bạn đã cài đặt Docker.
2. Build Docker Image:
   ```bash
   docker build -t fastapi-backend .
   ```
3. Chạy Container:
   ```bash
   docker run -d -p 8000:8000 --name backend-container fastapi-backend
   ```
