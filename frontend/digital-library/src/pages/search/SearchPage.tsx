// frontend/digital-library/src/pages/search/SearchPage.tsx

import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { searchService } from "@/services/searchService";
import type { SearchMatchField, SearchMode } from "@/types/search";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_MATCH_FIELDS,
  SEARCH_MATCH_FIELDS,
  matchFieldsKey,
  parseMatchFields,
} from "@/utils/searchFields";
import { SearchModeToggle } from "./components/SearchModeToggle";
import { SearchFieldFilter } from "./components/SearchFieldFilter";
import { SearchResults } from "./components/SearchResults";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const modeParam = searchParams.get("mode");
  const mode: SearchMode = modeParam === "hybrid" ? "hybrid" : "keyword";
  const fields = parseMatchFields(searchParams.get("fields"), mode);
  const fieldsKey = matchFieldsKey(fields);

  const [page, setPage] = useState(1);
  const [prevQuery, setPrevQuery] = useState(query);
  const [prevMode, setPrevMode] = useState(mode);
  const [prevFieldsKey, setPrevFieldsKey] = useState(fieldsKey);
  const pageSize = 20;

  if (query !== prevQuery || mode !== prevMode || fieldsKey !== prevFieldsKey) {
    setPrevQuery(query);
    setPrevMode(mode);
    setPrevFieldsKey(fieldsKey);
    setPage(1);
  }

  const { data, isFetching, isError } = useQuery({
    queryKey: ["full-search", query, page, mode, fieldsKey],
    queryFn: () => searchService.fullTextSearch(query, page, pageSize, mode, fields),
    enabled: query.trim().length > 0,
  });

  const updateParams = (changes: {
    q?: string;
    mode?: SearchMode;
    fields?: SearchMatchField[];
  }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (changes.q !== undefined) next.set("q", changes.q);
      if (changes.mode !== undefined) next.set("mode", changes.mode);
      if (changes.fields !== undefined) {
        next.set("fields", matchFieldsKey(changes.fields));
      }
      return next;
    });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newQuery = String(formData.get("searchInput") ?? "").trim();
    if (newQuery) updateParams({ q: newQuery });
  };

  const handleModeChange = (nextMode: SearchMode) => {
    updateParams({ mode: nextMode, fields: [...DEFAULT_MATCH_FIELDS[nextMode]] });
  };

  const handleFieldToggle = (field: SearchMatchField) => {
    const next = fields.includes(field)
      ? fields.filter((current) => current !== field)
      : SEARCH_MATCH_FIELDS.filter(
          (current) => current === field || fields.includes(current),
        );
    if (next.length) updateParams({ fields: [...next] });
  };

  const total = data?.total ?? 0;
  const effectivePageSize = data?.page_size || pageSize;
  const totalPages = Math.ceil(total / effectivePageSize);
  const items = data?.items ?? [];
  const semanticUnavailable =
    data?.unavailable_match_fields?.includes("semantic") ?? false;
  const semanticOnly = fields.length === 1 && fields[0] === "semantic";

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Tìm kiếm toàn văn bản
          </h1>
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex max-w-2xl items-center"
          >
            <Search className="absolute left-4 h-5 w-5 text-gray-400" />
            <input
              key={query}
              name="searchInput"
              type="text"
              defaultValue={query}
              placeholder="Nhập từ khóa nội dung tài liệu..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-24 text-base shadow-sm outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <Button
              type="submit"
              className="absolute right-1.5 h-9"
              disabled={isFetching}
            >
              Tìm kiếm
            </Button>
          </form>

          <SearchModeToggle mode={mode} onChange={handleModeChange} />
          <SearchFieldFilter fields={fields} onToggle={handleFieldToggle} />
        </div>

        {!query && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">
              Hãy nhập từ khóa để tìm kiếm
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Hệ thống sẽ quét toàn bộ nội dung (OCR) của các tài liệu.
            </p>
          </div>
        )}

        {query && (
          <SearchResults
            query={query}
            items={items}
            total={total}
            page={page}
            totalPages={totalPages}
            isFetching={isFetching}
            isError={isError}
            semanticUnavailable={semanticUnavailable}
            semanticOnly={semanticOnly}
            onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
            onNextPage={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          />
        )}
      </div>
    </div>
  );
}

export default SearchPage;
