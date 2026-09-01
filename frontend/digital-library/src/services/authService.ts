import api from '@/services/api'
import type { User } from '@/types/user'

interface LoginPayload {
  identifier: string
  password: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload).then(r => r.data),

  getMe: () =>
    api.get<User>('/auth/me').then(r => r.data),

  logout: () => {
    // JWT stateless — chỉ xóa state local
    // Nếu cần blacklist token thì thêm: api.post('/auth/logout')
  },
}
