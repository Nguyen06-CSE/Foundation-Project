import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, FileCheck2, Trash2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { groupService } from "@/services/groupService";
import { notificationService } from "@/services/notificationService";
import { libraryService } from "@/services/libraryService";
import { useAuthStore } from "@/stores/authStore";
import { isAdminRole } from "@/utils/roles";
import { invalidateDashboard } from "@/utils/dashboardUtils";
import { formatRelativeDate } from "@/utils/formatDate";
import { getActionLabel, getActionColor } from "@/utils/activityUtils";
import { cn } from "@/utils/cn";
import type { DashboardSummary, RecentActivityItem } from "@/types/dashboard";
import type { WorkspaceInvitation } from "@/types/group";
import type { Notification } from "@/types/notification";

type UpdateTab = "notifications" | "activity" | "todo";

interface DashboardUpdatesProps {
  summary: DashboardSummary;
  invitations: WorkspaceInvitation[];
  activities: RecentActivityItem[];
  onRejectedClick: () => void;
}

export function DashboardUpdates({
  summary,
  invitations,
  activities,
  onRejectedClick,
}: DashboardUpdatesProps) {
  const [tab, setTab] = useState<UpdateTab>("notifications");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminRole(user?.role);

  const { data: systemNotifications = [] } = useQuery({
    queryKey: ["notifications", "dashboard"],
    queryFn: () => notificationService.getAll({ unread_only: true, page: 1, page_size: 10 }),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: adminPendingSubs } = useQuery({
    queryKey: ["library-admin-submissions", "dashboard-pending"],
    queryFn: () => libraryService.getAdminSubmissions({ status: "pending", page: 1, page_size: 5 }),
    enabled: isAdmin,
    refetchInterval: 30000,
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const accept = useMutation({
    mutationFn: groupService.acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      invalidateDashboard(queryClient);
    },
  });
  const reject = useMutation({
    mutationFn: groupService.rejectInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      invalidateDashboard(queryClient);
    },
  });

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    } else if (n.type === "community_submission_received") {
      navigate("/library/admin/submissions?status=pending");
    }
  };

  const pendingInvitations = invitations.filter((item) => item.status === "pending");
  const submissionNotifs = systemNotifications.filter(
    (n) => n.type === "community_submission_received"
  );
  const otherNotifs = systemNotifications.filter(
    (n) => n.type !== "community_submission_received"
  );
  const pendingAdminSubs = isAdmin ? (adminPendingSubs?.items ?? []) : [];
  // Nếu có bài chờ duyệt mà chưa có notification tương ứng (ví dụ dữ liệu seed), hiển thị trực tiếp từ danh sách chờ duyệt
  const fallbackAdminSubs =
    submissionNotifs.length === 0 ? pendingAdminSubs : [];

  const noticeCount =
    pendingInvitations.length +
    summary.rejected_recent_count +
    (summary.expiring_trash_count > 0 ? 1 : 0) +
    systemNotifications.length +
    fallbackAdminSubs.length;

  const tabs: { key: UpdateTab; label: string; count?: number }[] = [
    { key: "notifications", label: "Thông báo", count: noticeCount },
    { key: "activity", label: "Hoạt động" },
    { key: "todo", label: "Việc cần làm" },
  ];

  return (
    <Card className="flex min-h-[230px] flex-col p-4 sm:p-5 xl:h-[340px]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-3">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
              tab === item.key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {item.label}
            {item.count ? (
              <span
                className={cn(
                  "ml-1.5",
                  tab === item.key ? "text-gray-300" : "text-gray-400"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === "notifications" && (
          <div className="divide-y divide-gray-100">
            {/* Thông báo đóng góp học liệu cho Admin */}
            {isAdmin &&
              submissionNotifs.map((n) => (
                <button
                  key={`notif-${n.id}`}
                  type="button"
                  onClick={() => handleNotifClick(n)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-1 py-3 text-left transition-colors hover:bg-blue-50/60"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-blue-600 font-medium">
                      Nhấn để chuyển đến trang duyệt học liệu →
                    </p>
                  </div>
                </button>
              ))}

            {isAdmin &&
              fallbackAdminSubs.map((sub) => (
                <button
                  key={`sub-${sub.id}`}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/library/admin/submissions?status=pending&highlight_submission=${sub.id}`
                    )
                  }
                  className="flex w-full items-start gap-2.5 rounded-lg px-1 py-3 text-left transition-colors hover:bg-blue-50/60"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900">
                      Đóng góp mới: “{sub.source_document_title}”
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {sub.submitter_name} · {sub.subject_name}
                    </p>
                  </div>
                </button>
              ))}

            {otherNotifs.map((n) => (
              <button
                key={`notif-${n.id}`}
                type="button"
                onClick={() => handleNotifClick(n)}
                className="flex w-full items-start gap-2.5 rounded-lg px-1 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900">{n.message}</p>
                  {n.created_at && (
                    <p className="text-[11px] text-gray-500">
                      {formatRelativeDate(n.created_at)}
                    </p>
                  )}
                </div>
              </button>
            ))}

            {pendingInvitations.slice(0, 2).map((invitation) => (
              <div key={invitation.id} className="flex gap-2.5 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900">
                    Lời mời vào “{invitation.workspace_name}”
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {invitation.invited_by_name} · {formatRelativeDate(invitation.created_at)}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => accept.mutate(invitation.id)}
                      disabled={accept.isPending}
                    >
                      Chấp nhận
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject.mutate(invitation.id)}
                      disabled={reject.isPending}
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {summary.rejected_recent_count > 0 && (
              <div className="flex items-start gap-2.5 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900">
                    Đóng góp “{summary.latest_rejected?.title || "Học liệu"}” bị từ chối
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {summary.latest_rejected?.reason || "Xem lý do để cập nhật và gửi lại."}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={onRejectedClick}>
                  Xem
                </Button>
              </div>
            )}
            {summary.expiring_trash_count > 0 && (
              <div className="flex items-center gap-2.5 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900">
                    {summary.expiring_trash_count} tài liệu sắp bị xóa vĩnh viễn
                  </p>
                  <p className="text-[11px] text-gray-500">Hãy khôi phục nếu bạn vẫn cần dùng.</p>
                </div>
                <Link
                  to="/personal/trash"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mở
                </Link>
              </div>
            )}
            {noticeCount === 0 && (
              <p className="flex min-h-24 items-center justify-center text-center text-sm text-gray-500">
                Bạn đã xem hết thông báo.
              </p>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div className="divide-y divide-gray-100">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5 py-3">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    getActionColor(activity.action)
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-gray-800">
                    Bạn {getActionLabel(activity.action)}{" "}
                    <span className="font-medium">“{activity.document_title || "tài liệu"}”</span>
                  </p>
                  <span className="text-[11px] text-gray-500">
                    {formatRelativeDate(activity.created_at)}
                  </span>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="flex min-h-24 items-center justify-center text-center text-sm text-gray-500">
                Chưa có hoạt động nào.
              </p>
            )}
            <Link
              to="/stats"
              className="block pt-3 text-right text-xs font-medium text-primary-700 hover:underline"
            >
              Xem toàn bộ hoạt động
            </Link>
          </div>
        )}

        {tab === "todo" && (
          <div className="divide-y divide-gray-100">
            {pendingInvitations.length > 0 && (
              <Link
                to="/groups?tab=notifications"
                className="flex items-center gap-2.5 py-3 text-xs text-gray-800"
              >
                <Clock3 className="h-4 w-4 text-orange-600" />
                Phản hồi {pendingInvitations.length} lời mời nhóm
              </Link>
            )}
            {summary.contributions.pending > 0 && (
              <Link
                to="/library"
                className="flex items-center gap-2.5 py-3 text-xs text-gray-800"
              >
                <FileCheck2 className="h-4 w-4 text-primary-600" />
                {summary.contributions.pending} đóng góp đang chờ duyệt
              </Link>
            )}
            {summary.expiring_trash_count > 0 && (
              <Link
                to="/personal/trash"
                className="flex items-center gap-2.5 py-3 text-xs text-gray-800"
              >
                <Trash2 className="h-4 w-4 text-gray-500" />
                Kiểm tra {summary.expiring_trash_count} tài liệu trong thùng rác
              </Link>
            )}
            {pendingInvitations.length === 0 &&
              summary.contributions.pending === 0 &&
              summary.expiring_trash_count === 0 && (
                <div className="flex flex-col items-center gap-2 py-9 text-sm text-gray-500">
                  <Check className="h-5 w-5 text-primary-600" />
                  Không còn việc nào đang chờ.
                </div>
              )}
          </div>
        )}
      </div>
    </Card>
  );
}
