import api from "@/services/api";
import type { UserTodo, CreateTodoInput, UpdateTodoInput } from "@/types/todo";

export const todoService = {
  getAll: async (status?: "open" | "done" | "all"): Promise<UserTodo[]> => {
    const res = await api.get("/todos/", { params: status ? { status } : undefined });
    return res.data;
  },

  create: async (payload: CreateTodoInput): Promise<UserTodo> => {
    const res = await api.post("/todos/", payload);
    return res.data;
  },

  update: async (id: number, payload: UpdateTodoInput): Promise<UserTodo> => {
    const res = await api.patch(`/todos/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/todos/${id}`);
  },
};
