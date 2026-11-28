// src/types/ai.ts

export interface CitationLocation {
  page?: number;
  slide?: number;
  section?: string;
}

export interface Citation {
  document_id: number;
  chunk_id?: number;
  run_id?: number;
  title?: string;
  url?: string;
  text?: string;
  heading?: string;
  quote?: string;
  snippet?: string;
  source?: string;
  location?: CitationLocation;
}

export interface IndexCoverage {
  state: string;
  unit: string;
  read: number;
  total: number;
}

export interface IndexStatus {
  status: string;
  coverage: IndexCoverage;
}

export interface ChunkContext {
  chunk_id: number;
  document_id: number;
  run_id: number;
  text: string;
  heading: string;
  location: CitationLocation;
  source: string;
}

export interface QuestionAnswer {
  status: "answered" | "insufficient" | "not_ready";
  answer: string | null;
  citations: Citation[];
  index_status?: string;
}

export interface SummaryItem {
  text: string;
  citation: Citation;
}

export interface SummaryResponse {
  text: string;
  items: SummaryItem[];
  coverage: IndexCoverage;
}

export interface ExistingTagSuggestion {
  tag_id: number;
  name: string;
  citation: Citation;
}

export interface NewTagSuggestion {
  name: string;
  tag_id: null;
  citation: Citation;
}

export interface TagSuggestionsResponse {
  existing: ExistingTagSuggestion[];
  new: NewTagSuggestion[];
}

export interface RelatedItem {
  document_id: number;
  title: string;
  url: string;
  source: Citation;
  target: Citation;
}

export interface RelatedResponse {
  items: RelatedItem[];
}
