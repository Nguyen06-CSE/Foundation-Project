import type { UserTodo } from "@/types/todo";

export type TodoState = "done" | "overdue" | "due_soon" | "today" | "upcoming" | "no_due";

export function getTodoState(
  todo: Pick<UserTodo, "due_at" | "completed_at" | "is_completed">,
  now = new Date()
): TodoState {
  if (todo.is_completed || todo.completed_at) return "done";
  if (!todo.due_at) return "no_due";
  const due = new Date(todo.due_at);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 60 * 60 * 1000) return "due_soon";
  if (due.toDateString() === now.toDateString()) return "today";
  return "upcoming";
}

export const TODO_STATE_STYLE: Record<TodoState, string> = {
  overdue: "border-l-4 border-l-red-500 bg-red-50/80 text-red-900",
  due_soon: "border-l-4 border-l-orange-500 bg-orange-50/80 text-orange-900",
  today: "border-l-4 border-l-amber-400 bg-amber-50/60 text-amber-900",
  upcoming: "border-l-4 border-l-primary-400 bg-white text-gray-800",
  no_due: "border-l-4 border-l-gray-200 bg-white text-gray-800",
  done: "border-l-4 border-l-emerald-300 bg-gray-50/70 text-gray-400 line-through",
};

export const TODO_BADGE_STYLE: Record<TodoState, string> = {
  overdue: "bg-red-100 text-red-700 font-semibold",
  due_soon: "bg-orange-100 text-orange-700 font-semibold animate-pulse",
  today: "bg-amber-100 text-amber-700 font-medium",
  upcoming: "bg-sky-50 text-sky-700",
  no_due: "bg-gray-100 text-gray-500",
  done: "bg-emerald-50 text-emerald-600",
};

export function formatTodoSchedule(todo: UserTodo, now = new Date()): string {
  if (todo.is_completed || todo.completed_at) return "Đã hoàn thành";
  if (!todo.due_at) return "Không giới hạn";

  const due = new Date(todo.due_at);
  const diffMin = Math.round((due.getTime() - now.getTime()) / 60000);
  const timeFmt = due.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const startFmt = todo.start_at
    ? new Date(todo.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : null;
  const rangeStr = startFmt ? `${startFmt}–${timeFmt}` : timeFmt;

  if (diffMin < 0) {
    const absMin = Math.abs(diffMin);
    if (absMin < 60) return `Quá hạn ${absMin}p (${rangeStr})`;
    if (absMin < 1440) return `Quá hạn ${Math.floor(absMin / 60)}h`;
    return `Quá hạn ${Math.floor(absMin / 1440)} ngày`;
  }
  if (diffMin <= 60) {
    return `Còn ${diffMin}p (${rangeStr})`;
  }
  if (due.toDateString() === now.toDateString()) {
    return `Hôm nay · ${rangeStr}`;
  }
  const dateFmt = due.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${dateFmt} · ${rangeStr}`;
}
