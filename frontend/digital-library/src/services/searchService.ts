import api from "./api";
import type { QuickSearchResponse, FullSearchResponse } from "@/types/search";

export const searchService = {
  quickSearch: (query: string): Promise<QuickSearchResponse> =>
    api.get(`/search/quick?q=${encodeURIComponent(query)}`).then((r) => r.data),
  fullTextSearch: (query: string, page = 1, pageSize = 20): Promise<FullSearchResponse> =>
    api
      .get(`/search/full?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`)
      .then((r) => r.data),
};
