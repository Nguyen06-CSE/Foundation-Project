//frontend/digital-library/src/services/api.ts

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
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

export default api
