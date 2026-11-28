// src/types/search.ts

import type { Citation } from "@/types/ai";

export type SearchMode = "keyword" | "hybrid";

export type SearchMatchField = "title" | "content" | "semantic";
export type SearchMatchMethod = "lexical_title" | "lexical_content" | "semantic";

export interface SearchMatchProvenance {
  methods: SearchMatchMethod[];
  title_rank?: number | null;
  content_rank?: number | null;
  semantic_rank?: number | null;
  fused_score?: number | null;
}

export type SearchItemType =
  | "personal_doc"
  | "group_doc"
  | "workspace"
  | "personal_folder"
  | "group_folder"
  | (string & {});

export interface SearchResultItem {
  id: number;
  type: SearchItemType;
  title: string;
  subtitle: string;
  url: string;
  snippet?: string | null;
  citation?: Citation | null;
  match?: SearchMatchProvenance | null;
}

export interface QuickSearchResponse {
  items: SearchResultItem[];
}

export interface FullSearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
  fallback?: boolean;
  unavailable_match_fields?: SearchMatchField[];
}
