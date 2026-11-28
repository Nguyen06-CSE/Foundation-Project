// src/components/shared/documents/DocumentDetail/tabs/TabInsights.tsx

import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CircleAlert,
  Link2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CitationMeta } from "@/components/shared/ai/CitationMeta";
import { QuestionAnswerPanel } from "@/components/shared/ai/QuestionAnswerPanel";
import { formatCoverageUnit } from "@/utils/citation";
import type { IndexStatus, RelatedItem } from "@/types/ai";

interface TabInsightsProps {
  documentId: number;
  indexStatus?: IndexStatus | null;
  indexError?: string | null;
  isIndexLoading: boolean;
  related?: RelatedItem[] | null;
  isRelatedLoading: boolean;
}

function statusLabel(index: IndexStatus): string {
  if (index.status === "ready" && index.coverage.state === "partial") {
    return "Đã đọc một phần";
  }
  if (index.status === "empty" || index.coverage.state === "empty") {
    return "Chưa có nội dung";
  }
  const labels: Record<string, string> = {
    pending: "Đang xử lý",
    queued: "Đang xử lý",
    retry: "Có thể thử lại",
    processing: "Đang xử lý",
    indexing: "Đang xử lý",
    ready: "Sẵn sàng",
    complete: "Sẵn sàng",
    completed: "Sẵn sàng",
    done: "Sẵn sàng",
    failed: "Lập chỉ mục thất bại",
    error: "Lập chỉ mục thất bại",
    obsolete: "Không còn hiệu lực",
  };
  return labels[index.status] ?? index.status;
}

function coverageLabel(state: string): string {
  const labels: Record<string, string> = {
    full: "Đã đọc đầy đủ",
    partial: "Đã đọc một phần",
    empty: "Chưa có nội dung",
    unknown: "Chưa xác định",
  };
  return labels[state] ?? state;
}

function statusVariant(
  status: string,
): "default" | "primary" | "success" | "danger" | "warning" {
  if (["ready", "complete", "completed", "done"].includes(status)) {
    return "success";
  }
  if (["failed", "error"].includes(status)) return "danger";
  if (["pending", "queued", "retry"].includes(status)) return "warning";
  if (["processing", "indexing"].includes(status)) return "primary";
  return "default";
}

function IndexCoverage({
  coverage,
}: {
  coverage: IndexStatus["coverage"];
}) {
  const percent =
    coverage.total > 0 ? (coverage.read / coverage.total) * 100 : 0;
  const unit = formatCoverageUnit(coverage.unit);
  const state = coverageLabel(coverage.state);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{state}</span>
        <span>
          {coverage.read}/{coverage.total} {unit}
        </span>
      </div>
      <ProgressBar value={percent} />
    </div>
  );
}

export function TabInsights({
  documentId,
  indexStatus,
  indexError = null,
  isIndexLoading,
  related = [],
  isRelatedLoading,
}: TabInsightsProps) {
  const isPending = ["pending", "retry"].includes(indexStatus?.status ?? "");
  const relatedItems = related ?? [];

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Chỉ mục nội dung
          </h3>
          {indexStatus && (
            <Badge variant={statusVariant(indexStatus.status)}>
              {statusLabel(indexStatus)}
            </Badge>
          )}
        </div>

        {indexError ? (
          <p
            role="status"
            className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700"
          >
            {indexError}
          </p>
        ) : isIndexLoading ? (
          <div className="h-14 animate-pulse rounded-lg bg-gray-100" />
        ) : indexStatus ? (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <IndexCoverage coverage={indexStatus.coverage} />
            {isPending && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang xử lý, trạng thái tự cập nhật.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Chưa có thông tin chỉ mục cho tài liệu này.
          </p>
        )}
      </section>

      <QuestionAnswerPanel key={documentId} documentId={documentId} />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Tài liệu liên quan
          </h3>
        </div>

        {isRelatedLoading ? (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
          </div>
        ) : relatedItems.length > 0 ? (
          <div className="space-y-2">
            {relatedItems.map((item) => (
              <Link
                key={`${item.document_id}-${item.target.chunk_id ?? "doc"}`}
                to={item.url}
                className="block rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400" />
                </div>
                <CitationMeta citation={item.target} className="mt-1.5" />
                {item.source.title && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    <CircleAlert className="h-3 w-3" />
                    Từ: {item.source.title}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Chưa tìm thấy tài liệu liên quan.
          </p>
        )}
      </section>
    </div>
  );
}

export default TabInsights;
