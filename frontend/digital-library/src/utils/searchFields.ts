// src/utils/searchFields.ts

import type { SearchMatchField, SearchMode } from "@/types/search";

export const SEARCH_MATCH_FIELDS: readonly SearchMatchField[] = [
  "title",
  "content",
  "semantic",
];

export const DEFAULT_MATCH_FIELDS: Record<SearchMode, SearchMatchField[]> = {
  keyword: ["title", "content"],
  hybrid: ["title", "content", "semantic"],
};

export function matchFieldsKey(fields: SearchMatchField[]): string {
  return fields.join(",");
}

export function parseMatchFields(
  raw: string | null,
  mode: SearchMode,
): SearchMatchField[] {
  if (raw === null) return [...DEFAULT_MATCH_FIELDS[mode]];
  const requested = raw.split(",").filter((value): value is SearchMatchField =>
    SEARCH_MATCH_FIELDS.includes(value as SearchMatchField),
  );
  const ordered = SEARCH_MATCH_FIELDS.filter((field) => requested.includes(field));
  return ordered.length ? [...ordered] : [...DEFAULT_MATCH_FIELDS[mode]];
}
