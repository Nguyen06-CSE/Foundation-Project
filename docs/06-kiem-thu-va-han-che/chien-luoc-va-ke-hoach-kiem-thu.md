---
title: Chiến Lược & Kế Hoạch Kiểm Thử Phần Mềm
sidebar_label: 📋 Chiến lược kiểm thử
sidebar_position: 2
---

# 📋 CHIẾN LƯỢC & KẾ HOẠCH KIỂM THỬ PHẦN MỀM

## 1. Kim Tự Tháp Kiểm Thử (Test Pyramid)

Chiến lược kiểm thử của **Foundation Project** được thiết kế cân đối theo mô hình kim tự tháp:

```
                  /                  /                   / E2E \          -> Kiểm thử thủ công (Manual QA 6 kịch bản Use Case)
               /-------              /  Integ  \        -> Pytest Backend Integration Tests (test_auth, test_storage, test_library)
             /-----------            /  TypeCheck  \      -> TypeScript Static Analysis, Pydantic V2 Schemas & Oxlint
           /---------------```

1. **Tầng Kiểm Tra Kiểu Tĩnh (Static Type Checking & Schemas)**:
   - Frontend: TypeScript compiler (`tsc`) và bộ linter hiện đại Oxlint kiểm soát chặt chẽ kiểu dữ liệu của component và API response.
   - Backend: Pydantic V2 kiểm thực kiểu dữ liệu của mọi Request Body và Query Params tại cổng tiếp nhận.
2. **Tầng Kiểm Thử Tích Hợp Backend (Backend Integration Tests)**:
   - Sử dụng `pytest` kết hợp `pytest-asyncio` và `httpx.AsyncClient` để gửi request trực tiếp đến các API endpoints chạy trên database test chuyên dụng.
   - Bao phủ các nghiệp vụ cốt lõi: Đăng ký/đăng nhập, tính toán checksum SHA-256, phân quyền chia sẻ, đếm số lượng tài liệu thư viện theo môn học.
3. **Tầng Kiểm Thử Thủ Công (Manual Exploratory QA)**:
   - Kiểm tra trải nghiệm người dùng, tính tương thích giao diện trên các kích thước màn hình và luồng tải lên các tệp tin kích thước lớn.

---

## 2. Công Cụ & Thư Viện Kiểm Thử

| Công cụ | Phiên bản | Vai trò trong quy trình QA |
| :--- | :--- | :--- |
| **pytest** | `>= 7.4.0` | Khung thực thi kiểm thử tiêu chuẩn cho Python |
| **pytest-asyncio** | `>= 0.21.0` | Hỗ trợ chạy các test function bất đồng bộ (`async def test_*`) |
| **httpx** | `>= 0.24.0` | Máy khách HTTP bất đồng bộ để gọi API kiểm thử nội bộ |
| **TypeScript (tsc)** | `>= 5.0` | Kiểm tra tính đúng đắn của kiểu dữ liệu trên toàn bộ mã nguồn Frontend |

---

## 3. Quy Trình Chạy Kiểm Thử Backend

```bash
# Di chuyển vào thư mục backend
cd backend

# Kích hoạt môi trường ảo
source venv/bin/activate

# Chạy toàn bộ các test cases với báo cáo chi tiết
pytest -v

# Chạy riêng phân hệ kiểm thử lưu trữ và khử trùng lặp
pytest tests/test_storage_dedup.py -v

# Chạy kiểm tra bộ đếm tài liệu thư viện học liệu
pytest tests/test_library_counts.py -v
```
