// frontend/digital-library/src/services/documentService.ts

import api from '@/services/api'
import type { PaginatedDocuments, Document } from '@/types/document'

export const documentService = {
  getAll: (params?: { folder_id?: number; page?: number; page_size?: number }) =>
    api.get<PaginatedDocuments>('/documents/', { params }).then(r => r.data),

  getById: (id: number) =>
    api.get<Document>(`/documents/${id}`).then(r => r.data),

  upload: (formData: FormData) =>
    api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),

  update: (id: number, payload: Partial<Document>) =>
    api.patch<Document>(`/documents/${id}`, payload).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/documents/${id}`),
}
