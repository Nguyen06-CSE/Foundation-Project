import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  RecipientPicker,
  type InviteMode,
} from "@/components/shared/recipients/RecipientPicker";
import { groupService } from "@/services/groupService";
import { useDebounce } from "@/hooks/useDebounce";
import type { User } from "@/types/user";

interface GroupInviteModalProps {
  groupId: number | string;
  onClose: () => void;
}

export default function GroupInviteModal({ groupId, onClose }: GroupInviteModalProps) {
  const [mode, setMode] = useState<InviteMode>("basic");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  const totalCriteriaCount =
    selectedUsers.length +
    patterns.length +
    selectedClassIds.length +
    selectedFacultyIds.length;

  // ponytail: useMemo để tránh tạo object mới mỗi render, cần cho useDebounce reference equality
  const bulkPayload = useMemo(
    () => ({
      identifiers: selectedUsers.map((u) => u.email || u.username),
      class_ids: selectedClassIds,
      faculty_ids: selectedFacultyIds,
      student_code_patterns: patterns,
      message: "",
    }),
    [selectedUsers, selectedClassIds, selectedFacultyIds, patterns],
  );

  const debouncedBulkPayload = useDebounce(bulkPayload, 300);

  const { data: previewData, isFetching: isPreviewLoading } = useQuery({
    queryKey: ["invite-preview-count", groupId, debouncedBulkPayload],
    queryFn: () =>
      groupService.previewInviteCount(Number(groupId), debouncedBulkPayload),
    enabled: totalCriteriaCount > 0,
    staleTime: 1000 * 30,
  });

  const targetUserCount = previewData?.count ?? 0;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      return await groupService.inviteBulk(Number(groupId), {
        ...bulkPayload,
        message,
      });
    },
    onSuccess: (data: any) => {
      alert(data?.message || "Đã gửi lời mời thành công!");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.detail || "Có lỗi xảy ra khi gửi lời mời.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl overflow-visible my-6 flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Mời thành viên vào nhóm
              </h2>
              <p className="text-xs text-gray-500">
                Lựa chọn linh hoạt theo cá nhân, mã sinh viên, lớp hoặc khoa
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          <RecipientPicker
            mode={mode}
            onModeChange={setMode}
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
            patterns={patterns}
            setPatterns={setPatterns}
            selectedClassIds={selectedClassIds}
            setSelectedClassIds={setSelectedClassIds}
            selectedFacultyIds={selectedFacultyIds}
            setSelectedFacultyIds={setSelectedFacultyIds}
          />

          {/* LỜI NHẮN ĐÍNH KÈM */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Lời nhắn đính kèm (tuỳ chọn)
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Nhập lời nhắn gửi đến các thành viên..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-2xl">
          <span className="text-xs font-medium text-gray-500">
            Đã chọn tổng cộng{" "}
            <strong className="text-primary-600">{totalCriteriaCount}</strong>{" "}
            điều kiện với tổng số{" "}
            <strong className="text-primary-600">
              {isPreviewLoading ? "..." : targetUserCount}
            </strong>{" "}
            lời mời
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={inviteMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              disabled={
                totalCriteriaCount === 0 ||
                inviteMutation.isPending ||
                isPreviewLoading
              }
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending ? "Đang gửi..." : "Gửi lời mời"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
