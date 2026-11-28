// frontend/digital-library/src/pages/stats/StatsPage.tsx

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  Eye,
  Download,
  Activity,
  BarChart2,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/shared/feedback/StatCard";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { activityService } from "@/services/activityService";
import type { ActivityLog } from "@/types/activity";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { ACTION_LABELS, ACTION_COLORS } from "@/utils/activityUtils";

const groupByDay = (activities: ActivityLog[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return activities.reduce((groups, activity) => {
    const date = new Date(activity.created_at);
    date.setHours(0, 0, 0, 0);
    let label: string;
    if (date.getTime() >= today.getTime()) {
      label = "Hôm nay";
    } else if (date.getTime() >= yesterday.getTime()) {
      label = "Hôm qua";
    } else {
      label = formatRelativeDate(activity.created_at) || "Trước đó";
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
    return groups;
  }, {} as Record<string, ActivityLog[]>);
};

export default function StatsPage() {
  const [scope, setScope] = useState<"me" | "my_documents">("me");
  const [days, setDays] = useState<7 | 30>(30);

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-stats", scope, days],
    queryFn: () => activityService.getMyStats({ scope, days }),
  });

  const chartData = useMemo(() => {
    if (!stats?.activity_by_day) return [];
    return stats.activity_by_day.map((d) => {
      const parts = d.date.split("-");
      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
      return {
        date: d.date,
        formattedDate: formatted,
        count: d.count,
      };
    });
  }, [stats?.activity_by_day]);

  const groupedActivities = useMemo(() => {
    if (!stats?.recent_activities) return {};
    return groupByDay(stats.recent_activities);
  }, [stats?.recent_activities]);

  const hasActivities = (stats?.recent_activities?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-7xl mx-auto w-full">
      {/* Header & Scope Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Thống kê & Hoạt động
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi tổng quan tài liệu, lượt tương tác và dòng thời gian hoạt động của bạn.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope("me")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              scope === "me"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Hoạt động của tôi
          </button>
          <button
            type="button"
            onClick={() => setScope("my_documents")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              scope === "my_documents"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Tài liệu của tôi
          </button>
        </div>
      </div>

      {scope === "me" && isError && (
        <Card className="flex items-center justify-between gap-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">Không thể tải thống kê chủ đề quan tâm.</p>
          <button type="button" onClick={() => refetch()} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700">Thử lại</button>
        </Card>
      )}

      {scope === "me" && !isLoading && !isError && !stats?.interests && (
        <Card><p className="text-sm text-gray-500">Chưa có dữ liệu chủ đề quan tâm.</p></Card>
      )}

      {scope === "me" && stats?.interests && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Chủ đề bạn quan tâm</h2>
              <p className="text-xs text-gray-500">Dựa trên tài liệu cá nhân và những lần bạn mở đọc.</p>
            </div>
            <select aria-label="Khoảng thời gian thống kê" value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 30)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value={7}>7 ngày</option><option value={30}>30 ngày</option>
            </select>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <p>Tài liệu cá nhân: <strong>{stats.interests.personal_documents}</strong></p>
            <p>Lượt đọc: <strong>{stats.interests.read_views}</strong></p>
            <p>Tài liệu đã đọc: <strong>{stats.interests.read_documents}</strong></p>
            <p>Tài liệu đã mở từ tìm kiếm: <strong>{stats.interests.opened_from_search}</strong></p>
          </div>
          {stats.interests.subjects.every((x) => x.read_views === 0) ? (
            <p className="text-sm text-gray-500">Chưa có hoạt động đọc trong khoảng thời gian này.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(["faculties", "subjects", "tags"] as const).map((kind) => (
                <div key={kind}>
                  <h3 className="mb-2 text-sm font-medium">{kind === "faculties" ? "Khoa" : kind === "subjects" ? "Môn học" : "Chủ đề (tag đã gắn)"}</h3>
                  {stats.interests?.[kind].filter((x) => x.read_views > 0).sort((a, b) => b.read_views - a.read_views).slice(0, 5).map((topic) => (
                    <p key={`${topic.name}-${topic.scope ?? kind}-${topic.workspace_id ?? "none"}`} className="flex justify-between gap-2 border-t py-1.5 text-xs"><span>{topic.name}{kind === "tags" && topic.scope === "group" ? ` · Nhóm #${topic.workspace_id}` : ""}</span><span>{topic.read_views} lượt · {topic.read_documents} tài liệu</span></p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Section 1 — Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Upload className="h-6 w-6 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Tài liệu đã tải lên"
          value={isLoading ? "..." : (stats?.total_uploads ?? 0)}
          subLabel="Tài liệu đang hoạt động"
        />
        <StatCard
          icon={<Eye className="h-6 w-6 text-purple-600" />}
          iconBg="bg-purple-50"
          label={scope === "me" ? "Lượt xem tài liệu" : "Lượt xem trên tài liệu của tôi"}
          value={isLoading ? "..." : (stats?.total_views ?? 0)}
          subLabel={scope === "me" ? "Bạn đã xem" : "Người khác đã xem"}
        />
        <StatCard
          icon={<Download className="h-6 w-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label={scope === "me" ? "Lượt tải xuống" : "Lượt tải trên tài liệu của tôi"}
          value={isLoading ? "..." : (stats?.total_downloads ?? 0)}
          subLabel={scope === "me" ? "Bạn đã tải về" : "Người khác đã tải về"}
        />
      </div>

      {/* Section 2 — Biểu đồ hoạt động theo ngày */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Biểu đồ tương tác 30 ngày gần nhất
            </h2>
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> 30 ngày qua
          </span>
        </div>

        {isLoading ? (
          <div className="h-64 w-full rounded-lg bg-gray-50 flex items-center justify-center animate-pulse">
            <span className="text-xs text-gray-400">Đang tải dữ liệu biểu đồ...</span>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-md">
                          <p className="font-semibold">{item.date}</p>
                          <p className="text-primary-300 mt-0.5">
                            {item.count} lượt hoạt động
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Lượt hoạt động"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Section 3 — Activity Feed */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Nhật ký hoạt động gần đây
            </h2>
          </div>
          {hasActivities && (
            <span className="text-xs text-gray-400">
              {stats?.recent_activities?.length ?? 0} sự kiện gần nhất
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4 pt-2">
            <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ) : !hasActivities ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="Chưa có hoạt động nào"
            description="Bạn chưa thực hiện hành động nào hoặc chưa có tương tác trên tài liệu."
          />
        ) : (
          <div className="space-y-6 pt-2">
            {Object.entries(groupedActivities).map(([dayLabel, items]) => (
              <div key={dayLabel} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {dayLabel}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({items.length} hoạt động)
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>

                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50/50 overflow-hidden">
                  {items.map((act) => {
                    const actionLabel =
                      ACTION_LABELS[act.action] ||
                      act.action.toLowerCase().replace(/_/g, " ");
                    const dotColor = ACTION_COLORS[act.action] || "bg-gray-400";
                    const actor = act.actor_name || "Bạn";
                    const docTitle = act.document_title;
                    const relativeTime = formatRelativeDate(act.created_at);

                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3.5 hover:bg-white transition-colors text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full shrink-0",
                              dotColor
                            )}
                          />
                          <div className="truncate">
                            <span className="font-medium text-gray-900">
                              {actor}
                            </span>{" "}
                            <span className="text-gray-600">{actionLabel}</span>
                            {docTitle && (
                              <>
                                <span className="text-gray-400 mx-1">•</span>
                                <Link
                                  to={`/personal/documents/${act.document_id}`}
                                  className="font-medium text-primary-600 hover:underline hover:text-primary-700"
                                >
                                  "{docTitle}"
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                          {relativeTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
