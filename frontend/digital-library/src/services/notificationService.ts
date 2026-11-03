import api from "@/services/api";
import type { Notification } from "@/types/notification";

export const notificationService = {
  getAll: async (params?: {
    unread_only?: boolean;
    types?: string;
    page?: number;
    page_size?: number;
  }): Promise<Notification[]> => {
    const res = await api.get("/notifications/", { params });
    return res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get("/notifications/unread-count");
    return res.data?.count ?? 0;
  },

  markAsRead: async (id: number): Promise<Notification> => {
    const res = await api.patch(`/notifications/${id}`);
    return res.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post("/notifications/mark-all-read");
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
