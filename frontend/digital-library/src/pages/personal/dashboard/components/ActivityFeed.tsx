// frontend/digital-library/src/pages/personal/dashboard/components/ActivityFeed.tsx

import { Link } from "react-router-dom";
import { Activity, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getActionColor, getActionLabel } from "@/utils/activityUtils";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import type { RecentActivityItem } from "@/types/dashboard";

export interface ActivityFeedProps {
  activities: RecentActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="flex min-h-[280px] flex-col p-4 sm:p-5 xl:h-[360px]">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Hoạt động gần đây</h2>
        </div>
        <Link
          to="/stats"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <span>Xem lịch sử</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            Chưa có hoạt động nào được ghi nhận.
          </div>
        ) : (
          <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {activities.map((act) => {
              const colorDot = getActionColor(act.action);
              const label = getActionLabel(act.action);

              return (
                <div key={act.id} className="relative flex items-start gap-2.5 text-xs">
                  {/* Timeline Dot */}
                  <span
                    className={cn(
                      "absolute -left-4 mt-1.5 h-2 w-2 rounded-full ring-4 ring-white shrink-0",
                      colorDot
                    )}
                  />

                  <div className="min-w-0 flex-1 leading-relaxed">
                    <p className="text-gray-700">
                      <span>Bạn {label} </span>
                      {act.document_id && act.document_title ? (
                        <Link
                          to={`/personal/documents/${act.document_id}`}
                          className="font-medium text-gray-900 hover:text-primary-600 underline-offset-2 hover:underline"
                        >
                          "{act.document_title}"
                        </Link>
                      ) : act.document_title ? (
                        <span className="font-medium text-gray-900">
                          "{act.document_title}"
                        </span>
                      ) : null}
                    </p>
                    <span className="text-[11px] text-gray-400">
                      {formatRelativeDate(act.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
