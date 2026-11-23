---
title: Kiến Trúc Backend FastAPI & Bất Đồng Bộ
sidebar_label: ⚡ Backend FastAPI
sidebar_position: 3
---

# ⚡ KIẾN TRÚC BACKEND FASTAPI & VẬN HÀNH BẤT ĐỒNG BỘ

Backend của **Foundation Project** được xây dựng hoàn toàn bằng **FastAPI** — framework web Python hiện đại, hiệu năng cao, dựa trên chuẩn giao diện máy chủ bất đồng bộ ASGI (Asynchronous Server Gateway Interface).

---

## 1. Lý Do Lựa Chọn FastAPI

1. **Hiệu năng I/O bất đồng bộ vượt trội**: Vận hành trên nhân `uvicorn` và vòng lặp sự kiện `uvloop`, FastAPI cho phép xử lý hàng nghìn kết nối đồng thời với mức tiêu tốn tài nguyên RAM và CPU tối thiểu.
2. **Kiểm thực dữ liệu mạnh mẽ với Pydantic V2**: Mọi dữ liệu đầu vào và đầu ra đều được kiểm tra kiểu dữ liệu tĩnh tại thời điểm chạy (Runtime Type Validation), tự động loại trừ các trường nhạy cảm (như mật khẩu băm).
3. **Tự động sinh tài liệu chuẩn OpenAPI 3.1**: Toàn bộ hệ thống endpoints được tài liệu hóa tự động tại `/docs` (Swagger UI) và `/redoc`.
4. **Hệ thống Dependency Injection chuẩn mực**: Cho phép quản lý vòng đời kết nối CSDL và ngữ cảnh xác thực một cách thanh lịch, dễ bảo trì và dễ viết kiểm thử giả lập (Mocking).

---

## 2. Tổ Chức Mã Nguồn Theo Phân Tầng Trách Nhiệm

```
backend/app/
├── core/               # Cấu hình hệ thống, bảo mật JWT, kết nối CSDL, RBAC
│   ├── config.py       # Pydantic Settings đọc từ biến môi trường .env
│   ├── database.py     # create_async_engine, async_sessionmaker, get_db()
│   ├── dependencies.py # get_current_user, get_optional_user, verify_faculty
│   └── security.py     # bcrypt hashing, JWT create/decode
├── models/             # 26 Thực thể SQLAlchemy ORM kế thừa từ Base
├── schemas/            # Schemas Pydantic định nghĩa Data Transfer Objects (DTO)
├── routers/            # Tiếp nhận HTTP request, ánh xạ URL và gọi Service
│   ├── auth.py         # Đăng ký, đăng nhập, hồ sơ
│   ├── documents.py    # Quản lý tài liệu cá nhân, upload, xem trước
│   ├── workspaces.py   # Quản lý kho nhóm, thành viên, giải thể
│   ├── library.py      # Kho học liệu cộng đồng, duyệt bài, rating
│   └── dashboard.py    # Thống kê cá nhân, danh sách đọc, hoạt động
└── services/           # Lớp thực thi Business Logic thuần túy
    ├── document_service.py # Xử lý upload, checksum, thùng rác
    ├── file_service.py     # Đọc/ghi tệp tin trên ổ cứng cục bộ
    └── activity_service.py # Ghi log nhật ký và tính toán điểm xu hướng
```

---

## 3. Vòng Đời Phiên Làm Việc Cơ Sở Dữ Liệu (`AsyncSession`)

Mỗi HTTP request đến một endpoint cần thao tác dữ liệu sẽ nhận một phiên kết nối CSDL độc lập thông qua hàm khởi tạo phụ thuộc `get_db()`:

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Tự động kiểm tra tính sống còn của kết nối trước khi dùng
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Tránh lỗi expired attribute sau commit
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Quy trình xử lý lỗi và Transaction:
- Khi một endpoint thực thi thành công, service gọi `await db.commit()` để chốt giao dịch.
- Nếu xảy ra bất kỳ ngoại lệ nào (`Exception`), khối context manager tự động kích hoạt `rollback` an toàn, ngăn chặn tình trạng dữ liệu mồ côi hoặc không nhất quán.
