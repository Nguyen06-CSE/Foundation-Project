import api from '@/services/api'
import type { Tag } from '@/types/document'

export const tagService = {
  getAll: () => api.get<Tag[]>('/tags/').then(r => r.data),
  create: (payload: { name: string, owner_id?: number }) => api.post<Tag>('/tags/', payload).then(r => r.data)
}
