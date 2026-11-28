// src/utils/requestErrorLabel.ts

import axios from "axios";

export function requestErrorLabel(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) {
      return "không tìm thấy tài liệu hoặc bạn không còn quyền truy cập";
    }
    if (status === 409) return "phiên bản chỉ mục đã cũ";
    if (status) return `HTTP ${status}`;
    return "không thể kết nối tới máy chủ";
  }
  if (error instanceof Error && error.message) return error.message;
  return "lỗi không xác định";
}
