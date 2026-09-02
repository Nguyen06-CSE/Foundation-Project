import api from "./api"

export const trashService = {
  // Lấy danh sách tất cả document trong thùng rác
  getAll: async () => {
    const response = await api.get("/trash/")
    return response.data
  },

  // Khôi phục 1 document
  restore: async (id: number) => {
    const response = await api.post(`/trash/${id}/restore`)
    return response.data
  },

  // Xóa vĩnh viễn toàn bộ thùng rác
  emptyTrash: async () => {
    await api.delete("/trash/empty")
  },
}