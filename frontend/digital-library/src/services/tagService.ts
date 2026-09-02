// src/services/tagService.ts

import api from "./api"

export interface Tag {
  id: number
  name: string
  color?: string
}

export interface CreateTagRequest {
  name: string
  color: string
}

export const tagService = {
  async getAll(): Promise<Tag[]> {
    const response = await api.get("/tags")

    return response.data
  },

  async create(data: CreateTagRequest): Promise<Tag> {
    const response = await api.post("/tags", data)

    return response.data
  },
}