// frontend/digital-library/src/pages/personal/dashboard/components/TrendingList.tsx

import { Link } from "react-router-dom";
import { TrendingUp, Eye, Download, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Document } from "@/types/document";

export interface TrendingListProps {
  documents: Document[];
  isLoading?: boolean;
}

export function TrendingList({ documents, isLoading }: TrendingListProps) {
  const top3 = documents.slice(0, 3);
  const maxScore = Math.max(...top3.map((d) => d.trending_score ?? 0), 1);

  const isRecentCreated = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    const now = Date.now();
    return now - created <= 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Xu hướng học tập</h2>
        </div>
        <Link
          to="/personal/documents"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <span>Xem thêm</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-gray-400">Đang tải xu hướng...</div>
        ) : top3.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            Chưa có tài liệu nổi bật nào.
          </div>
        ) : (
          top3.map((doc, idx) => {
            const scorePercent = Math.min(
              100,
              Math.max(10, Math.round(((doc.trending_score ?? 0) / maxScore) * 100))
            );
            const isHotNew = isRecentCreated(doc.created_at);
            const linkHref = doc.is_bundle
              ? `/ca-nhan/goi-tai-lieu/${doc.id}`
              : `/ca-nhan/tai-lieu/${doc.id}`;

            return (
              <div
                key={doc.id}
                className="group rounded-lg border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:border-primary-200 hover:bg-primary-50/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-gray-600 shadow-xs border border-gray-200">
                      {idx + 1}
                    </span>
                    <Link
                      to={linkHref}
                      className="truncate text-xs font-medium text-gray-800 hover:text-primary-600"
                    >
                      {doc.title}
                    </Link>
                  </div>
                  {isHotNew && (
                    <Badge variant="success" className="shrink-0 gap-1 text-[10px] py-0 px-2">
                      <Sparkles className="h-2.5 w-2.5" />
                      Mới tăng nhanh
                    </Badge>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {doc.view_count ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {doc.download_count ?? 0}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Điểm: {Math.round(doc.trending_score ?? 0)}
                  </span>
                </div>

                <div className="mt-1.5">
                  <ProgressBar
                    value={scorePercent}
                    color="bg-primary-500"
                    className="h-1"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
