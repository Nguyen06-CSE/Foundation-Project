import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, BookOpen, Upload, Eye, Edit3, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { documentService } from "@/services/documentService";
import { groupService } from "@/services/groupService";
import { cn } from "@/utils/cn";
import type { CreateTodoInput, TodoTaskType, UserTodo } from "@/types/todo";

interface TodoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTodoInput) => Promise<void>;
  initialTodo?: UserTodo | null;
  isSubmitting?: boolean;
}

const TASK_PRESETS: {
  key: TodoTaskType;
  label: string;
  prefix: string;
  icon: typeof BookOpen;
}[] = [
  { key: "read_document", label: "Đọc tài liệu", prefix: "Đọc tài liệu", icon: BookOpen },
  { key: "upload_to_group", label: "Gửi tài liệu lên nhóm", prefix: "Gửi tài liệu lên nhóm", icon: Upload },
  { key: "view_group_document", label: "Xem tài liệu nhóm", prefix: "Xem tài liệu trong nhóm", icon: Eye },
  { key: "custom", label: "Việc khác", prefix: "", icon: Edit3 },
];

function toDateInput(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInput(iso?: string | null, fallback = "17:00"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TodoFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialTodo,
  isSubmitting = false,
}: TodoFormModalProps) {
  const [taskType, setTaskType] = useState<TodoTaskType>("read_document");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [documentId, setDocumentId] = useState<number | "">("");
  const [workspaceId, setWorkspaceId] = useState<number | "">("");
  const [dateStr, setDateStr] = useState(() => toDateInput());
  const [startTime, setStartTime] = useState("14:00");
  const [dueTime, setDueTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  const { data: docsData } = useQuery({
    queryKey: ["documents", "todo-picker"],
    queryFn: () => documentService.getAll({ page: 1, page_size: 50 }),
    enabled: isOpen,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", "todo-picker"],
    queryFn: groupService.getAll,
    enabled: isOpen,
  });

  const documents = (docsData as any)?.items ?? (Array.isArray(docsData) ? docsData : []);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initialTodo) {
      setTaskType((initialTodo.task_type as TodoTaskType) || "custom");
      setTitle(initialTodo.title);
      setNote(initialTodo.note || "");
      setDocumentId(initialTodo.document_id ?? "");
      setWorkspaceId(initialTodo.workspace_id ?? "");
      setDateStr(toDateInput(initialTodo.due_at || initialTodo.start_at));
      setStartTime(toTimeInput(initialTodo.start_at, "14:00"));
      setDueTime(toTimeInput(initialTodo.due_at, "17:00"));
    } else {
      setTaskType("read_document");
      setTitle("");
      setNote("");
      setDocumentId("");
      setWorkspaceId("");
      setDateStr(toDateInput());
      setStartTime("14:00");
      setDueTime("17:00");
    }
  }, [isOpen, initialTodo]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof TASK_PRESETS)[number]) => {
    setTaskType(preset.key);
    if (!title.trim() && preset.prefix) {
      setTitle(preset.prefix);
    }
  };

  const handleQuickTime = (preset: "in_1h" | "today_18" | "tomorrow_09") => {
    const now = new Date();
    if (preset === "in_1h") {
      const due = new Date(now.getTime() + 60 * 60 * 1000);
      setDateStr(toDateInput(due.toISOString()));
      setStartTime(toTimeInput(now.toISOString()));
      setDueTime(toTimeInput(due.toISOString()));
    } else if (preset === "today_18") {
      setDateStr(toDateInput(now.toISOString()));
      setStartTime("16:00");
      setDueTime("18:00");
    } else {
      const tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setDateStr(toDateInput(tmr.toISOString()));
      setStartTime("08:00");
      setDueTime("10:00");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalTitle = title.trim();
    if (!finalTitle) {
      const selectedDoc = documents.find((d: any) => Number(d.id) === Number(documentId));
      const selectedGroup = groups.find((g: any) => Number(g.id) === Number(workspaceId));
      if (taskType === "read_document" && selectedDoc) {
        finalTitle = `Đọc tài liệu: ${selectedDoc.title}`;
      } else if (taskType === "upload_to_group" && selectedGroup) {
        finalTitle = `Gửi tài liệu lên nhóm ${selectedGroup.name}`;
      } else if (taskType === "view_group_document" && selectedGroup) {
        finalTitle = `Xem tài liệu trong nhóm ${selectedGroup.name}`;
      }
    }

    if (!finalTitle) {
      setError("Vui lòng nhập nội dung việc cần làm");
      return;
    }

    const startAtIso = dateStr && startTime ? new Date(`${dateStr}T${startTime}:00`).toISOString() : null;
    const dueAtIso = dateStr && dueTime ? new Date(`${dateStr}T${dueTime}:00`).toISOString() : null;

    if (startAtIso && dueAtIso && new Date(dueAtIso) < new Date(startAtIso)) {
      setError("Giờ kết thúc (hạn chót) phải sau hoặc bằng giờ bắt đầu");
      return;
    }

    await onSubmit({
      title: finalTitle,
      note: note.trim() || null,
      task_type: taskType,
      document_id: documentId ? Number(documentId) : null,
      workspace_id: workspaceId ? Number(workspaceId) : null,
      start_at: startAtIso,
      due_at: dueAtIso,
      priority: "normal",
      remind_before_minutes: 30,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">
            {initialTodo ? "Chỉnh sửa việc cần làm" : "Thêm việc cần làm mới"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Loại hoạt động */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Loại hoạt động
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const active = taskType === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                      active
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn tài liệu / nhóm liên quan */}
          {(taskType === "read_document" || taskType === "upload_to_group") && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Tài liệu liên quan (tùy chọn)
              </label>
              <select
                value={documentId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setDocumentId(val);
                  const doc = documents.find((d: any) => Number(d.id) === Number(val));
                  if (doc && (!title.trim() || title === "Đọc tài liệu" || title === "Gửi tài liệu lên nhóm")) {
                    setTitle(
                      taskType === "read_document"
                        ? `Đọc tài liệu: ${doc.title}`
                        : `Gửi "${doc.title}" lên nhóm`
                    );
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none"
              >
                <option value="">-- Chọn tài liệu cá nhân --</option>
                {documents.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(taskType === "upload_to_group" || taskType === "view_group_document") && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Nhóm học tập (tùy chọn)
              </label>
              <select
                value={workspaceId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setWorkspaceId(val);
                  const g = groups.find((grp: any) => Number(grp.id) === Number(val));
                  if (
                    g &&
                    (!title.trim() ||
                      title === "Xem tài liệu trong nhóm" ||
                      title === "Gửi tài liệu lên nhóm")
                  ) {
                    setTitle(
                      taskType === "view_group_document"
                        ? `Xem tài liệu nhóm: ${g.name}`
                        : `Gửi tài liệu lên nhóm: ${g.name}`
                    );
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none"
              >
                <option value="">-- Chọn nhóm học tập --</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tiêu đề công việc */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Nội dung việc cần làm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Đọc chương 3 Giải tích, Gửi slide lên nhóm..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none"
            />
          </div>

          {/* Ngày & Khung giờ */}
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Calendar className="h-3.5 w-3.5 text-primary-600" />
                Ngày & Khung giờ thực hiện
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickTime("in_1h")}
                  className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                >
                  +1 giờ
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTime("today_18")}
                  className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                >
                  Chiều nay
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTime("tomorrow_09")}
                  className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                >
                  Sáng mai
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Ngày</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Bắt đầu</label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pr-2.5 pl-8 text-xs text-gray-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Đến hạn</label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pr-2.5 pl-8 text-xs text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialTodo ? "Lưu thay đổi" : "Thêm việc cần làm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
