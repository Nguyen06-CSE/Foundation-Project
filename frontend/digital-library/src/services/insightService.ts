// src/services/insightService.ts

import axios from "axios";
import api from "@/services/api";
import type {
  ChunkContext,
  IndexStatus,
  QuestionAnswer,
  RelatedResponse,
  SummaryResponse,
  TagSuggestionsResponse,
} from "@/types/ai";

const NOT_FOUND_MESSAGE =
  "Không tìm thấy tài liệu hoặc bạn không còn quyền truy cập.";

function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

async function optionalGet<T>(url: string): Promise<T | null> {
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function requiredGet<T>(url: string): Promise<T> {
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    if (isNotFound(error)) throw new Error(NOT_FOUND_MESSAGE);
    throw error;
  }
}

export const insightService = {
  getIndexStatus: (documentId: number) =>
    requiredGet<IndexStatus>(`/documents/${documentId}/index-status`),

  getChunk: (documentId: number, chunkId: number) =>
    optionalGet<ChunkContext>(`/documents/${documentId}/chunks/${chunkId}`),

  askQuestion: async (
    documentId: number,
    question: string,
  ): Promise<QuestionAnswer> => {
    try {
      const response = await api.post<QuestionAnswer>(
        `/documents/${documentId}/questions`,
        { question },
      );
      return response.data;
    } catch (error) {
      if (isNotFound(error)) throw new Error(NOT_FOUND_MESSAGE);
      throw error;
    }
  },

  getSummary: (documentId: number) =>
    requiredGet<SummaryResponse>(`/documents/${documentId}/summary`),

  getTagSuggestions: (documentId: number) =>
    requiredGet<TagSuggestionsResponse>(
      `/documents/${documentId}/tag-suggestions`,
    ),

  getRelated: (documentId: number) =>
    requiredGet<RelatedResponse>(`/documents/${documentId}/related`),
};

export { isNotFound };
