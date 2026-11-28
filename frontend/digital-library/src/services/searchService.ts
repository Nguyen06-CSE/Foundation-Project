import api from "./api";
import type {
  QuickSearchResponse,
  FullSearchResponse,
  SearchMode,
  SearchMatchField,
} from "@/types/search";

export const searchService = {
  quickSearch: (query: string): Promise<QuickSearchResponse> =>
    api.get(`/search/quick?q=${encodeURIComponent(query)}`).then((r) => r.data),

  fullTextSearch: async (
    query: string,
    page = 1,
    pageSize = 20,
    mode: SearchMode = "keyword",
    matchFields: SearchMatchField[] = [],
  ): Promise<FullSearchResponse> => {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      page_size: String(pageSize),
      mode,
    });
    matchFields.forEach((field) => params.append("match_fields", field));

    const response = await api.get<FullSearchResponse>("/search/full", {
      params,
    });
    return response.data;
  },
};
