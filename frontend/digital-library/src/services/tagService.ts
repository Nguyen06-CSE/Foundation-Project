// src/services/tagService.ts

import api from "@/services/api"

export interface Tag {
  id: number
  name: string
  color?: string
}

export interface CreateTagRequest {
  name: string
  color: string
}

export const createTagService = (getBaseUrl: (groupId?: number | string) => string) => ({
  async getAll(groupId?: number | string): Promise<Tag[]> {
    const response = await api.get(`${getBaseUrl(groupId)}/`)
    return response.data
  },

  async create(data: CreateTagRequest, groupId?: number | string): Promise<Tag> {
    const response = await api.post(`${getBaseUrl(groupId)}/`, data)
    return response.data
  },

  async update(id: number, data: Partial<CreateTagRequest>, groupId?: number | string): Promise<Tag> {
    const response = await api.patch(`${getBaseUrl(groupId)}/${id}`, data)
    return response.data
  },

  async delete(id: number, groupId?: number | string): Promise<void> {
    await api.delete(`${getBaseUrl(groupId)}/${id}`)
  }
})

export const tagService = createTagService(() => "/tags")
export const groupTagService = createTagService((groupId) => `/groups/${groupId}/tags`)
