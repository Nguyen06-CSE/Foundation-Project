import api from '@/services/api'
import type { Folder } from '@/types/document'

export const folderService = {
  getAll: () =>
    api.get<Folder[]>('/folders/').then(r => r.data),

  create: (payload: { name: string; color?: string; tag_ids?: number[] }) =>
    api.post<Folder>('/folders/', payload).then(r => r.data),

  // update: (id: number, payload: { name?: string; color?: string }) =>
  //   api.patch<Folder>(`/folders/${id}`, payload).then(r => r.data),

  // delete: (id: number) =>
  //   api.delete(`/folders/${id}`),

  // addTags: (folderId: number, tagIds: number[]) =>
  //   api.post(`/folders/${folderId}/tags`, { tag_ids: tagIds }),

  // removeTag: (folderId: number, tagId: number) =>
  //   api.delete(`/folders/${folderId}/tags/${tagId}`),


  //== sử lí chức năng sửa folder ==

  // 1. Lấy chi tiết 1 thư mục (Để lấy màu và tags khi nhấn Sửa)
  getById: async (id: number) => {
    const res = await api.get(`/folders/${id}`);
    return res.data;
  },

  // 2. Cập nhật Tên và Màu
  update: async (id: number, data: { name?: string; color?: string }) => {
    const res = await api.patch(`/folders/${id}`, data);
    return res.data;
  },

  // 3. Thêm Tags vào thư mục
  addTags: async (folderId: number, tagIds: number[]) => {
    const res = await api.post(`/folders/${folderId}/tags`, { tag_ids: tagIds });
    return res.data;
  },

  // 4. Xóa Tag khỏi thư mục
  removeTag: async (folderId: number, tagId: number) => {
    const res = await api.delete(`/folders/${folderId}/tags/${tagId}`);
    return res.data;
  },
}
