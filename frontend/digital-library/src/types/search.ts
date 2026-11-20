// src/types/search.ts

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
}

export interface QuickSearchResponse {
  items: SearchResultItem[];
}

export interface FullSearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
}
