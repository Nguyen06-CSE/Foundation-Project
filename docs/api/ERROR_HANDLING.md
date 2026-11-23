---
title: Quy Chuẩn Xử Lý Lỗi API
sidebar_label: ⚠️ Xử lý lỗi
sidebar_position: 4
---

# Quy Chuẩn Xử Lý Lỗi API (Error Handling)

Tài liệu này quy định cấu trúc phản hồi lỗi tiêu chuẩn của hệ thống API, danh mục các mã trạng thái HTTP (Status Codes) được sử dụng và các khuyến nghị tối ưu dành cho ứng dụng Frontend (Client-side handling).

---

## 1. Cấu Trúc Phản Hồi Lỗi Chuẩn (Error Response Payloads)

Toàn bộ hệ thống API sử dụng cơ chế bẫy lỗi tự động của FastAPI, chia thành hai định dạng lỗi chính:

### 1.1. Lỗi Nghiệp Vụ & Logic Ứng Dụng (`HTTPException`)
Xảy ra khi các điều kiện nghiệp vụ không được thỏa mãn (ví dụ: tài nguyên không tồn tại, người dùng không có quyền, xung đột dữ liệu):

```json
{
  "detail": "Thông điệp mô tả nguyên nhân lỗi cụ thể"
}
```

**Ví dụ thực tế:**
```json
{
  "detail": "Tài liệu không tồn tại hoặc đã bị xóa vào thùng rác"
}
```

### 1.2. Lỗi Kiểm Tra Dữ Liệu Đầu Vào (`422 Unprocessable Entity`)
Xảy ra khi Pydantic phát hiện dữ liệu từ Request Body, Query Params hoặc Path Params không đúng định dạng:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 6 characters",
      "input": "123",
      "ctx": {
        "min_length": 6
      }
    }
  ]
}
```

---

## 2. Danh Mục Mã Trạng Thái HTTP (HTTP Status Codes)

| Mã trạng thái | Tên chuẩn HTTP | Ngữ cảnh sử dụng trong Foundation Project |
| :--- | :--- | :--- |
| **`200 OK`** | Thành công | Truy vấn dữ liệu danh sách hoặc chi tiết (`GET`), cập nhật một phần (`PATCH`). |
| **`201 Created`** | Đã tạo mới | Tạo tài khoản, upload tài liệu, tạo thư mục hoặc tạo nhóm thành công (`POST`). |
| **`204 No Content`** | Xóa thành công | Xóa tài nguyên hoàn tất mà không cần trả về nội dung body (`DELETE`). |
| **`400 Bad Request`** | Yêu cầu không hợp lệ | Vi phạm ràng buộc nghiệp vụ (VD: chuyển thư mục vào chính con của nó, tự mời chính mình vào nhóm). |
| **`401 Unauthorized`** | Chưa xác thực | Thiếu HTTP Header `Authorization`, token JWT hết hạn hoặc chữ ký token không hợp lệ. |
| **`403 Forbidden`** | Không có quyền | Đã đăng nhập nhưng không đủ quyền hạn (VD: sinh viên cố tình xóa chuyên mục khoa, người ngoài cố sửa tài liệu nhóm riêng tư). |
| **`404 Not Found`** | Không tìm thấy | ID tài liệu, người dùng, thư mục hoặc nhóm không tồn tại trong cơ sở dữ liệu. |
| **`409 Conflict`** | Xung đột dữ liệu | Trùng lặp `username`, `email` khi đăng ký, hoặc trùng tên tag trong cùng một workspace. |
| **`413 Payload Too Large`** | Tệp tin quá lớn | Dung lượng file tải lên vượt quá giới hạn cấu hình (ví dụ: tối đa 50MB cho tệp tài liệu PDF/Word). |
| **`422 Unprocessable Entity`** | Sai định dạng Schema | Dữ liệu Pydantic validation thất bại (email sai định dạng, thiếu trường bắt buộc). |
| **`500 Internal Server Error`** | Lỗi máy chủ nội bộ | Lỗi kết nối cơ sở dữ liệu PostgreSQL, lỗi I/O hệ thống tập tin cục bộ hoặc ngoại lệ chưa được xử lý. |

---

## 3. Hướng Dẫn Tích Hợp Phía Frontend (Client-side Best Practices)

Ứng dụng Frontend (React + TanStack React Query + Axios) cần cài đặt một bộ chặn phản hồi (Axios Interceptor) toàn cục để xử lý đồng nhất:

```typescript
// frontend/digital-library/src/services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Bộ chặn Request: Tự động đính kèm token nếu đã đăng nhập
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bộ chặn Response: Xử lý tập trung các mã lỗi quan trọng
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (status === 401) {
      // Hết phiên đăng nhập -> Dọn dẹp storage và điều hướng về trang Login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?session_expired=true';
    } else if (status === 403) {
      console.error('Lỗi phân quyền:', detail || 'Bạn không có quyền thực hiện hành động này.');
    } else if (status === 422) {
      // Trích xuất thông điệp lỗi Pydantic
      const validationMsg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ')
        : detail;
      console.warn('Lỗi dữ liệu đầu vào:', validationMsg);
    }
    return Promise.reject(error);
  }
);
```
