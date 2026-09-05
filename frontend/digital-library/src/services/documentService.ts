// frontend/digital-library/src/services/documentService.ts

import api from '@/services/api'
import type { PaginatedDocuments, Document } from '@/types/document'

export const createDocumentService = (getBaseUrl: (groupId?: number | string) => string) => ({
  getAll: (params?: {
    folder_id?: number
    page?: number
    page_size?: number
  }, groupId?: number | string) =>
    api.get<PaginatedDocuments>(`${getBaseUrl(groupId)}/`, { params })
      .then(r => r.data),

  getFileTypes: async (groupId?: number | string): Promise<string[]> => {
    const response = await api.get<string[]>(`${getBaseUrl(groupId)}/file-types`)
    return response.data
  },

  getById: (id: number, groupId?: number | string) =>
    api.get<Document>(`${getBaseUrl(groupId)}/${id}`)
      .then(r => r.data),

  upload: (formData: FormData, groupId?: number | string) =>
    api.post<Document>(`${getBaseUrl(groupId)}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(r => r.data),

  update: (id: number, payload: Partial<Document>, groupId?: number | string) =>
    api.patch<Document>(
      `${getBaseUrl(groupId)}/${id}`,
      payload
    ).then(r => r.data),

  updateTags: (
    documentId: number,
    tagIds: number[],
    groupId?: number | string
  ) =>
    api.patch<Document>(
      `${getBaseUrl(groupId)}/${documentId}/tags`,
      {
        tag_ids: tagIds,
      }
    ).then(r => r.data),

  // XÓA MỘT TAG KHỎI DOCUMENT
  removeTag: (
    documentId: number,
    tagId: number,
    groupId?: number | string
  ) =>
    api.delete<Document>(
      `${getBaseUrl(groupId)}/${documentId}/tags/${tagId}`
    ).then(r => r.data),

  delete: (id: number, groupId?: number | string) =>
    api.delete(`${getBaseUrl(groupId)}/${id}`),
})

export const documentService = createDocumentService(() => '/documents')

export const groupDocumentService = {
  ...createDocumentService((groupId) => `/groups/${groupId}/documents`),
  saveToPersonal: (groupId: number | string, documentId: number) =>
    api.post(`/groups/${groupId}/documents/${documentId}/save-to-personal`).then(r => r.data),
  attachTag: (groupId: number | string, documentId: number, tagId: number) =>
    api.post(`/groups/${groupId}/documents/${documentId}/tags`, { tag_id: tagId }).then(r => r.data),
  detachTag: (groupId: number | string, documentId: number, tagId: number) =>
    api.delete(`/groups/${groupId}/documents/${documentId}/tags/${tagId}`).then(r => r.data),
}
