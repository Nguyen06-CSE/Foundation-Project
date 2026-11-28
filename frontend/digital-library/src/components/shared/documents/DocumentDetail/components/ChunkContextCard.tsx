// src/components/shared/documents/DocumentDetail/components/ChunkContextCard.tsx

import { AlertCircle, Quote } from "lucide-react";
import { CitationMeta } from "@/components/shared/ai/CitationMeta";
import type { ChunkContext } from "@/types/ai";

interface ChunkContextCardProps {
  chunk?: ChunkContext | null;
  isLoading: boolean;
  requested: boolean;
}

export function ChunkContextCard({
  chunk,
  isLoading,
  requested,
}: ChunkContextCardProps) {
  if (!requested) return null;

  if (isLoading) {
    return (
      <div className="mb-4 h-20 animate-pulse rounded-xl bg-gray-100" />
    );
  }

  if (!chunk) {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        Ngữ cảnh trích dẫn không còn khả dụng. Tài liệu có thể đã được xử lý lại.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Quote className="h-4 w-4 text-primary-600" />
        <span className="text-sm font-semibold text-gray-900">
          Ngữ cảnh trích dẫn
        </span>
        {chunk.heading && (
          <span className="truncate text-xs text-gray-500">
            {chunk.heading}
          </span>
        )}
      </div>

      <CitationMeta
        citation={{
          document_id: chunk.document_id,
          source: chunk.source,
          location: chunk.location,
        }}
      />

      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700 custom-scrollbar">
        {chunk.text}
      </p>
    </div>
  );
}

export default ChunkContextCard;
