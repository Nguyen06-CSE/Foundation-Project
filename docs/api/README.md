---
title: Tổng Quan Hệ Thống API
sidebar_label: 📖 Tổng quan API
sidebar_position: 1
---

# Tổng Quan Hệ Thống API — Foundation Project

Chào mừng bạn đến với tài liệu kỹ thuật API của nền tảng **Thư Viện Số (Foundation Project)**. Hệ thống backend được xây dựng trên nền tảng **FastAPI (Python 3.11)**, cung cấp bộ RESTful API hiệu năng cao, bất đồng bộ (`async`/`await`), tài liệu hóa tự động theo chuẩn **OpenAPI 3.1.0** và **JSON Schema**.

---

## 1. Thông Tin Chung & Điểm Kết Nối

| Thông số | Môi trường Local Development | Môi trường Production / Staging |
| :--- | :--- | :--- |
| **Base URL** | `http://localhost:8000` | Cấu hình qua domain HTTPS (VD: Tailscale funnel / Cloud VPS) |
| **API Format** | JSON (`application/json`) & Multipart (`multipart/form-data`) | Chuẩn hóa UTF-8 |
| **Static Storage Path** | `http://localhost:8000/storage/` | Mount cục bộ kèm HTTP Header `Cache-Control: public, max-age=3600` |
| **Tài liệu Interactive Swagger** | `http://localhost:8000/docs` | FastAPI Swagger UI |
| **Tài liệu Interactive ReDoc** | `http://localhost:8000/redoc` | FastAPI ReDoc UI |
| **OpenAPI Specification** | [`openapi.json`](./openapi.json) / [`openapi.yaml`](./openapi.yaml) | Đồng bộ trực tiếp từ FastAPI runtime (128 endpoints) |

---

## 2. Nguyên Tắc Thiết Kế API

Hệ thống API tuân thủ các nguyên tắc cốt lõi:
1. **Kiến trúc RESTful**: Sử dụng chuẩn HTTP Methods (`GET`, `POST`, `PATCH`, `DELETE`) đại diện cho các hành động trên thực thể dữ liệu.
2. **Phi trạng thái (Stateless)**: Mọi yêu cầu được xác thực thông qua HTTP Header `Authorization: Bearer <JWT_TOKEN>`.
3. **Bất đồng bộ toàn diện (Non-blocking I/O)**: Mọi router tận dụng `async def` và SQLAlchemy 2.0 `AsyncSession` cùng driver `asyncpg`.
4. **Xác thực dữ liệu nghiêm ngặt**: Mọi request body, query params và response payload đều được kiểm tra kiểu dữ liệu tự động bằng **Pydantic V2**.
5. **Đồng bộ mã nguồn & tài liệu**: File đặc tả `openapi.json` và `openapi.yaml` được trích xuất trực tiếp từ mã nguồn thực tế tại `backend/app/main.py`.

---

## 3. Bản Đồ Tài Liệu API

| Tài liệu | Mô tả nội dung | Đối tượng tham chiếu |
| :--- | :--- | :--- |
| [**Quy ước API (API Conventions)**](./API_CONVENTIONS.md) | Định dạng URL, chuẩn đặt tên, xử lý ngày giờ ISO-8601, phân trang, lọc, sắp xếp | Frontend Devs, Backend Devs |
| [**Cơ chế Xác thực (Authentication)**](./AUTHENTICATION.md) | Luồng JWT, Bearer token, phân quyền RBAC (Role-Based Access Control) | Security, Fullstack Engineers |
| [**Xử lý Lỗi (Error Handling)**](./ERROR_HANDLING.md) | Cấu trúc payload lỗi của FastAPI, danh mục mã HTTP Status, hướng dẫn client xử lý lỗi | Frontend Devs, QA Engineers |
| [**Danh mục Endpoint (API Catalog)**](./API_CATALOG.md) | Bảng tra cứu toàn diện 22 nhóm router, 128 endpoints thực tế trong backend | Tech Leads, Quản lý, Nhà phát triển |
| [**Đặc tả OpenAPI Spec (YAML)**](./openapi.yaml) | File đặc tả chuẩn OpenAPI 3.1.0 cho Postman / Insomnia / Swagger Editor | API Integrators, QA Automation |

---

## 4. Kiểm Tra Tình Trạng Hoạt Động (Health Check)

Hệ thống cung cấp endpoint kiểm tra tình trạng kết nối không yêu cầu xác thực:

```http
GET /health HTTP/1.1
Host: localhost:8000
```

**Phản hồi mẫu (`200 OK`):**
```json
{
  "status": "ok"
}
```

Endpoint này được sử dụng bởi Docker container health checks, bộ cân bằng tải (Load Balancer) và kịch bản giám sát CI/CD.
