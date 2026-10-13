//frontend/digital-library/src/services/api.ts

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// Tự động gắn token vào mọi request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Xử lý response lỗi tập trung
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ → logout
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/**
 * Helper chuẩn hóa URL tài liệu/hình ảnh:
 * - Nếu filePath đã là Full URL (http:// hoặc https://) hoặc base64 data URL: giữ nguyên
 * - Nếu là đường dẫn tương đối: ghép với VITE_R2_PUBLIC_URL (ưu tiên) hoặc API_BASE_URL
 */
export const getFullFileUrl = (filePath: string | null | undefined): string => {
  if (!filePath) return ''
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return filePath
  }
  // Bỏ qua flag đặc biệt
  if (filePath.startsWith('__') && filePath.endsWith('__')) {
    return filePath
  }
  const base = import.meta.env.VITE_R2_PUBLIC_URL || API_BASE_URL
  return `${base.replace(/\/+$/, '')}/${filePath.replace(/^\/+/, '')}`
}

export default api
