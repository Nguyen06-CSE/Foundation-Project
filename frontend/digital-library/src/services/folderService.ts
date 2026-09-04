import api from "@/services/api";
import type { Folder } from "@/types/document";

export const folderService = {
  // ============================================================
  // Lấy danh sách folder
  // ============================================================
  getAll: () =>
    api.get<Folder[]>("/folders/").then((r) => r.data),

  // ============================================================
  // Tạo folder
  // ============================================================
  create: (payload: {
    name: string;
    color?: string;
    tag_ids?: number[];
  }) =>
    api
      .post<Folder>("/folders/", payload)
      .then((r) => r.data),

  // ============================================================
  // Lấy chi tiết folder
  // ============================================================
  getById: async (id: number) => {
    const res = await api.get(`/folders/${id}`);
    return res.data;
  },

  // ============================================================
  // Cập nhật folder
  // ============================================================
  update: async (
    id: number,
    data: {
      name?: string;
      color?: string;
    },
  ) => {
    const res = await api.patch(`/folders/${id}`, data);
    return res.data;
  },

  // ============================================================
  // XÓA FOLDER
  // ============================================================
  //
  // Backend:
  // DELETE /folders/{folder_id}
  //
  // TODO:
  // Backend chỉ xóa Folder và quan hệ FolderTag.
  // Không xóa Tag hoặc Document.
  //
  delete: async (id: number) => {
    await api.delete(`/folders/${id}`);
  },

  // ============================================================
  // Thêm Tags vào folder
  // ============================================================
  addTags: async (folderId: number, tagIds: number[]) => {
    const res = await api.post(
      `/folders/${folderId}/tags`,
      {
        tag_ids: tagIds,
      },
    );

    return res.data;
  },

  // ============================================================
  // Xóa Tag khỏi folder
  // ============================================================
  removeTag: async (
    folderId: number,
    tagId: number,
  ) => {
    const res = await api.delete(
      `/folders/${folderId}/tags/${tagId}`,
    );

    return res.data;
  },
};