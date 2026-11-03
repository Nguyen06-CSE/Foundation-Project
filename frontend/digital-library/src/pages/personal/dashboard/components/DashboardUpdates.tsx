import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock3,
  FileCheck2,
  Trash2,
  ShieldAlert,
  Plus,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { groupService } from "@/services/groupService";
import { notificationService } from "@/services/notificationService";
import { libraryService } from "@/services/libraryService";
import { todoService } from "@/services/todoService";
import { useAuthStore } from "@/stores/authStore";
import { isAdminRole } from "@/utils/roles";
import { invalidateDashboard } from "@/utils/dashboardUtils";
import { formatRelativeDate } from "@/utils/formatDate";
import { getActionLabel, getActionColor } from "@/utils/activityUtils";
import {
  getTodoState,
  TODO_STATE_STYLE,
  TODO_BADGE_STYLE,
  formatTodoSchedule,
} from "@/utils/todoStatus";
import { useHighlightElement } from "@/hooks/useHighlightElement";
import { cn } from "@/utils/cn";
import { TodoFormModal } from "./TodoFormModal";
import type { DashboardSummary, RecentActivityItem } from "@/types/dashboard";
import type { WorkspaceInvitation } from "@/types/group";
import type { Notification } from "@/types/notification";
import type { UserTodo } from "@/types/todo";

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
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const [tab, setTab] = useState<UpdateTab>(
    initialTabParam === "todo" || initialTabParam === "activity"
      ? initialTabParam
      : "notifications"
  );
  const [now, setNow] = useState(() => new Date());
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<UserTodo | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminRole(user?.role);

  useHighlightElement("highlight_todo", "todo-");

  useEffect(() => {
    if (
      initialTabParam === "todo" ||
      initialTabParam === "activity" ||
      initialTabParam === "notifications"
    ) {
      setTab(initialTabParam);
    }
  }, [initialTabParam]);

  // Cập nhật thời gian mỗi 60 giây để tự động đổi màu khi đến hạn
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const { data: userTodos = [] } = useQuery({
    queryKey: ["user-todos"],
    queryFn: () => todoService.getAll("all"),
    retry: false,
  });

  const createTodoMutation = useMutation({
    mutationFn: todoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-todos"] });
      setTodoModalOpen(false);
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      todoService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-todos"] });
      setEditingTodo(null);
      setTodoModalOpen(false);
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: todoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-todos"] });
    },
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
  const fallbackAdminSubs = submissionNotifs.length === 0 ? pendingAdminSubs : [];

  const noticeCount =
    pendingInvitations.length +
    summary.rejected_recent_count +
    (summary.expiring_trash_count > 0 ? 1 : 0) +
    systemNotifications.length +
    fallbackAdminSubs.length;

  const openTodosCount = userTodos.filter((t) => !t.is_completed && !t.completed_at).length;

  const tabs: { key: UpdateTab; label: string; count?: number }[] = [
    { key: "notifications", label: "Thông báo", count: noticeCount },
    { key: "activity", label: "Hoạt động" },
    { key: "todo", label: "Việc cần làm", count: openTodosCount || undefined },
  ];

  return (
    <>
      <Card className="flex min-h-[260px] flex-col p-4 sm:p-5 xl:h-[380px]">
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
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

          {tab === "todo" && (
            <button
              type="button"
              onClick={() => {
                setEditingTodo(null);
                setTodoModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm việc cần làm
            </button>
          )}
        </div>

        <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "notifications" && (
            <div className="divide-y divide-gray-100">
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
                      <p className="mt-0.5 text-[11px] font-medium text-blue-600">
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
            <div className="space-y-2 py-2">
              {userTodos.map((todo) => {
                const state = getTodoState(todo, now);
                const scheduleText = formatTodoSchedule(todo, now);
                const isDone = state === "done";
                return (
                  <div
                    key={todo.id}
                    id={`todo-${todo.id}`}
                    className={cn(
                      "flex items-start justify-between gap-2.5 rounded-lg border border-gray-100 p-2.5 transition-colors",
                      TODO_STATE_STYLE[state]
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) =>
                          updateTodoMutation.mutate({
                            id: todo.id,
                            payload: { is_completed: e.target.checked },
                          })
                        }
                        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-snug">{todo.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px]",
                              TODO_BADGE_STYLE[state]
                            )}
                          >
                            {scheduleText}
                          </span>
                          {todo.document_id && (
                            <Link
                              to={`/personal/documents/${todo.document_id}`}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary-700 hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              {todo.document_title || "Mở tài liệu"}
                            </Link>
                          )}
                          {todo.workspace_id && (
                            <Link
                              to={`/groups/${todo.workspace_id}`}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary-700 hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              {todo.workspace_name || "Mở nhóm"}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Chỉnh sửa"
                        onClick={() => {
                          setEditingTodo(todo);
                          setTodoModalOpen(true);
                        }}
                        className="rounded p-1 text-gray-500 hover:bg-white/70 hover:text-gray-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Xóa việc"
                        onClick={() => deleteTodoMutation.mutate(todo.id)}
                        className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Gợi ý hệ thống */}
              <div className="divide-y divide-gray-100 pt-1">
                {pendingInvitations.length > 0 && (
                  <Link
                    to="/groups?tab=notifications"
                    className="flex items-center gap-2.5 py-2.5 text-xs text-gray-800"
                  >
                    <Clock3 className="h-4 w-4 text-orange-600" />
                    Phản hồi {pendingInvitations.length} lời mời nhóm
                  </Link>
                )}
                {summary.contributions.pending > 0 && (
                  <Link
                    to="/library"
                    className="flex items-center gap-2.5 py-2.5 text-xs text-gray-800"
                  >
                    <FileCheck2 className="h-4 w-4 text-primary-600" />
                    {summary.contributions.pending} đóng góp đang chờ duyệt
                  </Link>
                )}
                {summary.expiring_trash_count > 0 && (
                  <Link
                    to="/personal/trash"
                    className="flex items-center gap-2.5 py-2.5 text-xs text-gray-800"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                    Kiểm tra {summary.expiring_trash_count} tài liệu trong thùng rác
                  </Link>
                )}
              </div>

              {userTodos.length === 0 &&
                pendingInvitations.length === 0 &&
                summary.contributions.pending === 0 &&
                summary.expiring_trash_count === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-sm text-gray-500">
                    <Check className="h-5 w-5 text-primary-600" />
                    <span>Không còn việc nào đang chờ.</span>
                  </div>
                )}
            </div>
          )}
        </div>
      </Card>

      <TodoFormModal
        isOpen={todoModalOpen}
        onClose={() => {
          setTodoModalOpen(false);
          setEditingTodo(null);
        }}
        initialTodo={editingTodo}
        isSubmitting={createTodoMutation.isPending || updateTodoMutation.isPending}
        onSubmit={async (payload) => {
          if (editingTodo) {
            await updateTodoMutation.mutateAsync({ id: editingTodo.id, payload });
          } else {
            await createTodoMutation.mutateAsync(payload);
          }
        }}
      />
    </>
  );
}
