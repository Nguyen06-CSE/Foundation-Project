---
title: Khung Mẫu Ca Kiểm Thử (Test Case Template)
sidebar_label: 🧪 Mẫu Test Case
sidebar_position: 3
---

# Khung Mẫu Ca Kiểm Thử Chuẩn (Test Case Template)

> 💡 **Hướng dẫn**: Sử dụng khung mẫu này khi biên soạn các ca kiểm thử mới cho hệ thống hoặc bổ sung vào tài liệu `docs/testing/TEST_CASES.md`.

---

## TC-[MODULE]-[MÃ SỐ]: [Tiêu Đề Ca Kiểm Thử Ngắn Gọn]

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã ca kiểm thử (Test Case ID)** | `TC-[MODULE]-[01]` (VD: `TC-AUTH-03`, `TC-DOC-05`) |
| **Phân hệ tính năng (Module)** | Auth / Documents / Sharing / Library / Groups / Search |
| **Ánh xạ Use Case (Mapping)** | [UC0X — Tên Use Case](../requirements/use-cases/README.md) |
| **Loại kiểm thử (Test Type)** | Unit Test / Integration Test / Security Test / Manual UI |
| **Mức độ ưu tiên (Priority)** | `Critical` / `High` / `Medium` / `Low` |
| **Trạng thái tự động hóa** | `Automated (Pytest)` / `Manual` / `Pending` |

---

### 1. Điều Kiện Tiên Quyết (Preconditions)
- Người dùng đã đăng nhập với tài khoản có vai trò: `student` | `teacher` | `faculty_admin` | `school_admin`.
- Dữ liệu thử nghiệm đã được chuẩn bị sẵn trong cơ sở dữ liệu (ID tài liệu, ID thư mục, v.v.).

---

### 2. Dữ Liệu Đầu Vào (Test Data)
- **Endpoint**: `POST /api/example/endpoint`
- **Headers**: `Authorization: Bearer <VALID_JWT_TOKEN>`
- **Request Body**:
  ```json
  {
    "field_a": "value_a",
    "field_b": 123
  }
  ```

---

### 3. Các Bước Thực Hiện (Execution Steps)

1. Gửi yêu cầu HTTP tương ứng với dữ liệu đầu vào đã chuẩn bị.
2. Kiểm tra mã trạng thái HTTP phản hồi từ server.
3. Kiểm tra cấu trúc và giá trị của JSON body trả về.
4. Truy vấn trực tiếp cơ sở dữ liệu PostgreSQL để xác minh trạng thái thay đổi của bản ghi.

---

### 4. Kết Quả Kỳ Vọng (Expected Results)

- **Mã HTTP Status**: `200 OK` (hoặc `201 Created` / `400 Bad Request` / `401 Unauthorized` / `403 Forbidden`).
- **Phản hồi Body**: Khớp chính xác với Pydantic Response Schema.
- **Dữ liệu Database**: Bản ghi được tạo mới / cập nhật đúng các trường, khóa ngoại toàn vẹn.
- **Log / Side-effects**: Không sinh lỗi unhandled exception trong terminal backend.

---

### 5. Mã Kiểm Thử Tự Động Tương Ứng (Automated Test Reference)
- File kiểm thử: `backend/tests/test_[module].py::test_[function_name]`
- Lệnh chạy kiểm thử:
  ```bash
  .venv/bin/pytest backend/tests/test_[module].py -k "test_[function_name]" -v
  ```
