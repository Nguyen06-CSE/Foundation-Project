// src/components/shared/documents/DocumentDetail/tabs/AiSummarySection.tsx

import { Link } from "react-router-dom";
import { ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CitationMeta } from "@/components/shared/ai/CitationMeta";
import { citationUrl, formatCoverageUnit } from "@/utils/citation";
import type { IndexStatus, SummaryResponse } from "@/types/ai";

interface AiSummarySectionProps {
  summary?: SummaryResponse | null;
  isLoading: boolean;
  error?: string | null;
  elapsedMs?: number | null;
  indexStatus?: IndexStatus | null;
  indexError?: string | null;
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

export function AiSummarySection({
  summary,
  isLoading,
  error = null,
  elapsedMs = null,
  indexStatus,
  indexError = null,
}: AiSummarySectionProps) {
  const elapsedLabel =
    elapsedMs === null ? "" : ` (${(elapsedMs / 1000).toFixed(1)}s)`;
  const cachedItems = summary?.items ?? [];
  const isPending = ["pending", "retry", "queued", "processing", "indexing"].includes(
    indexStatus?.status ?? "",
  );

  return (
    <section className="mt-6 border-t border-gray-200 pt-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary-600" />
        <h4 className="text-sm font-semibold text-gray-900">Tóm tắt AI</h4>
        {!isLoading && !error && elapsedMs !== null && (
          <span className="text-xs text-gray-400">{elapsedLabel.trim()}</span>
        )}
      </div>

      {!isLoading && indexError && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700"
        >
          {indexError}
        </p>
      )}

      {!isLoading && error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600"
        >
          {cachedItems.length > 0 || (summary && summary.text)
            ? `Không thể tải lại tóm tắt: ${error}${elapsedLabel}. Đang hiển thị kết quả đã lưu.`
            : `Không thể tạo tóm tắt: ${error}${elapsedLabel}. Vui lòng thử lại.`}
        </p>
      )}

      {isLoading ? (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang tạo tóm tắt...
        </p>
      ) : summary && (summary.text || cachedItems.length > 0) ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-2xs">
            <p className="text-sm leading-relaxed text-gray-800 font-normal">
              {summary.text || cachedItems.map((it) => it.text).join(" ")}
            </p>
          </div>

          {cachedItems.length > 0 && (
            <details className="group rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-xs">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-600 hover:text-gray-900 select-none">
                <span>Xem nguồn ({cachedItems.length} câu trích dẫn)</span>
                <span className="text-gray-400 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-3 space-y-2 border-t border-gray-200/60 pt-3">
                {cachedItems.map((item, index) => {
                  const href = citationUrl(item.citation);
                  return (
                    <div
                      key={`${item.citation.document_id}-${index}`}
                      className="rounded-md border border-gray-100 bg-white p-2.5"
                    >
                      {href ? (
                        href.startsWith("/") ? (
                          <Link
                            to={href}
                            className="text-xs leading-relaxed text-gray-700 hover:text-primary-600 hover:underline"
                          >
                            {item.text}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs leading-relaxed text-gray-700 hover:text-primary-600 hover:underline"
                          >
                            {item.text}
                          </a>
                        )
                      ) : (
                        <p className="text-xs leading-relaxed text-gray-700">
                          {item.text}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                        <CitationMeta citation={item.citation} />
                        {href &&
                          (href.startsWith("/") ? (
                            <Link
                              to={href}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:underline"
                            >
                              Mở ngữ cảnh
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:underline"
                            >
                              Mở ngữ cảnh
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{coverageLabel(summary.coverage.state)}</span>
              <span>
                {summary.coverage.read}/{summary.coverage.total}{" "}
                {formatCoverageUnit(summary.coverage.unit)}
              </span>
            </div>
            <ProgressBar
              value={
                summary.coverage.total > 0
                  ? (summary.coverage.read / summary.coverage.total) * 100
                  : 0
              }
            />
          </div>
        </div>
      ) : error ? null : isPending ? (
        <p className="text-xs text-gray-500">
          {`Tài liệu đang được xử lý${elapsedLabel}; tóm tắt sẽ sẵn sàng sau khi lập chỉ mục xong.`}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          {`Chưa có nội dung để tóm tắt${elapsedLabel}.`}
        </p>
      )}
    </section>
  );
}
