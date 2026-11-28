// src/components/shared/documents/DocumentDetail/hooks/useDocumentInsights.ts

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { insightService } from "@/services/insightService";

const PENDING_STATUSES = ["pending", "retry", "queued", "processing", "indexing"];
const READY_STATUSES = ["ready", "complete", "completed", "done"];

export function useDocumentInsights(
  documentId: number,
  chunkId: number,
  enabled: boolean,
  includeTagSuggestions: boolean,
) {
  const queryClient = useQueryClient();
  const indexStatus = useQuery({
    queryKey: ["document-index-status", documentId],
    queryFn: () => insightService.getIndexStatus(documentId),
    enabled: enabled && documentId > 0,
    retry: false,
    refetchInterval: (query) =>
      ["pending", "retry"].includes(query.state.data?.status ?? "")
        ? 3000
        : false,
  });

  const summary = useQuery({
    queryKey: ["document-summary", documentId],
    queryFn: () => insightService.getSummary(documentId),
    enabled: enabled && documentId > 0,
    retry: false,
    staleTime: 60_000,
  });

  const related = useQuery({
    queryKey: ["document-related", documentId],
    queryFn: () => insightService.getRelated(documentId),
    enabled: enabled && documentId > 0,
    retry: false,
    staleTime: 60_000,
  });

  const tagSuggestions = useQuery({
    queryKey: ["document-tag-suggestions", documentId],
    queryFn: () => insightService.getTagSuggestions(documentId),
    enabled: enabled && includeTagSuggestions && documentId > 0,
    retry: false,
    staleTime: 60_000,
  });

  const chunk = useQuery({
    queryKey: ["chunk-context", documentId, chunkId],
    queryFn: () => insightService.getChunk(documentId, chunkId),
    enabled: enabled && chunkId > 0,
    retry: false,
  });

  const status = indexStatus.data?.status ?? "";
  const previousStatusRef = useRef(status);
  useEffect(() => {
    const previous = previousStatusRef.current;
    if (previous === status) return;
    previousStatusRef.current = status;
    if (!PENDING_STATUSES.includes(previous) || !READY_STATUSES.includes(status)) {
      return;
    }
    [
      ["document-summary", documentId],
      ["document-related", documentId],
      ["document-tag-suggestions", documentId],
    ].forEach((queryKey) => queryClient.resetQueries({ queryKey }));
  }, [status, documentId, queryClient]);

  return { indexStatus, summary, related, tagSuggestions, chunk };
}
