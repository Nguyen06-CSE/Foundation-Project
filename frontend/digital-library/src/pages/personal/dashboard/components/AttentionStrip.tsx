// frontend/digital-library/src/pages/personal/dashboard/components/AttentionStrip.tsx

import { Link } from "react-router-dom";
import { Bell, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import type { RejectedSubmissionBrief } from "@/types/dashboard";

export interface AttentionStripProps {
  pendingInvitations: number;
  rejectedRecentCount: number;
  latestRejected?: RejectedSubmissionBrief | null;
  expiringTrash: number;
  onRejectedClick?: () => void;
}

export function AttentionStrip({
  pendingInvitations,
  rejectedRecentCount,
  latestRejected,
  expiringTrash,
  onRejectedClick,
}: AttentionStripProps) {
  const hasItems =
    pendingInvitations > 0 ||
    rejectedRecentCount > 0 ||
    expiringTrash > 0;

  if (!hasItems) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 shadow-sm">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-medium text-amber-950">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
            !
          </span>
          <span>Việc đang chờ bạn xử lý:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingInvitations > 0 && (
            <Link
              to="/groups?tab=notifications"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100/80"
            >
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              <span>
                <strong>{pendingInvitations}</strong> lời mời nhóm
              </span>
              <ArrowRight className="h-3 w-3 text-amber-500" />
            </Link>
          )}

          {rejectedRecentCount > 0 && (
            <button
              type="button"
              onClick={onRejectedClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-50 cursor-pointer"
            >
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span>
                <strong>{rejectedRecentCount}</strong> đóng góp bị từ chối
                {latestRejected?.title ? ` ("${latestRejected.title}")` : ""}
              </span>
              <ArrowRight className="h-3 w-3 text-red-400" />
            </button>
          )}

          {expiringTrash > 0 && (
            <Link
              to="/personal/trash"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100/80"
            >
              <Trash2 className="h-3.5 w-3.5 text-amber-600" />
              <span>
                <strong>{expiringTrash}</strong> tài liệu sắp hết hạn xóa (≤ 3 ngày)
              </span>
              <ArrowRight className="h-3 w-3 text-amber-500" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
