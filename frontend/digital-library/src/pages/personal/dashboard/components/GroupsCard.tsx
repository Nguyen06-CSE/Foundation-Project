// frontend/digital-library/src/pages/personal/dashboard/components/GroupsCard.tsx

import { Link } from "react-router-dom";
import { Users, FileText, ArrowRight, ShieldCheck, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/utils/formatDate";
import type { RecentGroupItem } from "@/types/dashboard";

export interface GroupsCardProps {
  groupsCount: number;
  totalGroupDocs: number;
  recentGroups: RecentGroupItem[];
}

export function GroupsCard({
  groupsCount,
  totalGroupDocs,
  recentGroups,
}: GroupsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Nhóm học tập</h2>
        </div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Summary counters */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-gray-50/70 p-2.5 text-center text-xs">
        <div>
          <span className="text-[11px] text-gray-400">Tham gia</span>
          <p className="text-base font-bold text-gray-800">{groupsCount} nhóm</p>
        </div>
        <div className="border-l border-gray-200 pl-2">
          <span className="text-[11px] text-gray-400">Tài liệu trong nhóm</span>
          <p className="text-base font-bold text-gray-800">{totalGroupDocs} tệp</p>
        </div>
      </div>

      {/* Top 3 recent groups */}
      <div className="mt-3 divide-y divide-gray-100">
        {recentGroups.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            Bạn chưa tham gia nhóm nào.
          </div>
        ) : (
          recentGroups.map((g) => {
            const isLeader =
              g.role === "Trưởng nhóm" || g.role === "owner" || g.role === "admin";
            return (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-gray-50/70 -mx-2 px-2 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-medium text-gray-800 group-hover:text-primary-600">
                      {g.name}
                    </p>
                    <Badge
                      variant={isLeader ? "primary" : "default"}
                      className="text-[10px] py-0 px-1.5 shrink-0"
                    >
                      {isLeader ? (
                        <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
                      ) : (
                        <User className="mr-0.5 h-2.5 w-2.5" />
                      )}
                      {g.role}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {g.member_count}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {g.document_count} tệp
                    </span>
                  </div>
                </div>

                {g.updated_at && (
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {formatRelativeDate(g.updated_at)}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
