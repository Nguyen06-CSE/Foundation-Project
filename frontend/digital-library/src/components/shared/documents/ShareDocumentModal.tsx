import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  RecipientPicker,
  type InviteMode,
} from "@/components/shared/recipients/RecipientPicker";
import { shareService, type SharePreviewPayload } from "@/services/shareService";
import { useDebounce } from "@/hooks/useDebounce";
import type { User } from "@/types/user";

interface ShareDocumentModalProps {
  documentIds: number[];
  documentTitle?: string;
  sourceWorkspaceId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareDocumentModal({
  documentIds,
  documentTitle,
  sourceWorkspaceId,
  onClose,
  onSuccess,
}: ShareDocumentModalProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<InviteMode>("basic");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const totalCriteriaCount =
    selectedUsers.length +
    patterns.length +
    selectedClassIds.length +
    selectedFacultyIds.length;

  // Lấy nhanh trạng thái chia sẻ của tài liệu qua React Query
  const { data: docStatusData } = useQuery({
    queryKey: ["document-share-status", documentIds],
    queryFn: () => shareService.getDocumentShareStatus(documentIds),
    enabled: documentIds.length > 0,
    staleTime: 1000 * 30,
  });

  const previewPayload: SharePreviewPayload = useMemo(
    () => ({
      document_ids: documentIds,
      source_workspace_id: sourceWorkspaceId,
      identifiers: selectedUsers.map((u) => u.username || u.email),
      class_ids: selectedClassIds,
      faculty_ids: selectedFacultyIds,
      student_code_patterns: patterns,
    }),
    [documentIds, sourceWorkspaceId, selectedUsers, selectedClassIds, selectedFacultyIds, patterns],
  );

  const debouncedPayload = useDebounce(previewPayload, 300);

  const { data: previewData, isFetching: isPreviewLoading } = useQuery({
    queryKey: ["share-preview", debouncedPayload],
    queryFn: () => shareService.preview(debouncedPayload),
    enabled: totalCriteriaCount > 0 && documentIds.length > 0,
    staleTime: 1000 * 20,
  });

  const predictedMap = useMemo(() => {
    const map = new Map<
      number,
      {
        status: "auto" | "pending" | "already_pending" | "already_owned" | "duplicate";
        reason?: string;
        share_id?: number;
      }
    >();

    // 1. Điền trước từ docStatusData (phản hồi tức thì ngay khi mở modal)
    if (docStatusData) {
      docStatusData.pending_user_ids.forEach((uid) => {
        map.set(uid, {
          status: "already_pending",
          reason: "Đang có yêu cầu chia sẻ chờ người này duyệt",
        });
      });
      docStatusData.owned_user_ids.forEach((uid) => {
        map.set(uid, {
          status: "already_owned",
          reason: "Người này đã sở hữu tài liệu này trong kho",
        });
      });
    }

    // 2. Bổ sung / cập nhật chính xác từ previewData
    if (previewData?.users) {
      previewData.users.forEach((u) => {
        map.set(u.id, {
          status: u.status,
          reason: u.reason,
          share_id: u.share_id,
        });
      });
    }
    return map;
  }, [docStatusData, previewData]);

  const shareMutation = useMutation({
    mutationFn: async (confirmBulk: boolean = false) => {
      return await shareService.create({
        ...previewPayload,
        message,
        confirm_bulk: confirmBulk,
      });
    },
    onSuccess: (data) => {
      // Invalidate React Query cache để đồng bộ các nơi hiển thị
      queryClient.invalidateQueries({ queryKey: ["document-share-status"] });
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });

      alert(data.message || "Chia sẻ tài liệu thành công!");
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 428) {
        setShowBulkConfirm(true);
      } else {
        alert(typeof detail === "string" ? detail : "Có lỗi xảy ra khi chia sẻ tài liệu.");
      }
    },
  });

  const handleInitialSubmit = () => {
    if (previewData?.requires_bulk_confirm) {
      setShowBulkConfirm(true);
    } else {
      shareMutation.mutate(false);
    }
  };

  const renderBadge = (user: User) => {
    const info = predictedMap.get(user.id);
    if (!info) return null;
    if (info.status === "auto") {
      return (
        <span
          title={info.reason || "Tự động nhận vào kho ngay"}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
          Nhận ngay
        </span>
      );
    }
    if (info.status === "pending") {
      return (
        <span
          title={info.reason || "Cần người nhận xác nhận"}
          className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800"
        >
          Cần xác nhận
        </span>
      );
    }
    if (info.status === "already_pending") {
      return (
        <span
          title={info.reason || "Đang có yêu cầu chia sẻ chờ duyệt"}
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
        >
          <Clock className="h-2.5 w-2.5" />
          Đang chờ duyệt
        </span>
      );
    }
    if (info.status === "already_owned") {
      return (
        <span
          title={info.reason || "Đã sở hữu tài liệu này trong kho cá nhân"}
          className="inline-flex items-center rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700"
        >
          Đã có trong kho
        </span>
      );
    }
    return (
      <span
        title={info.reason}
        className="inline-flex items-center rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700"
      >
        Đã có
      </span>
    );
  };

  const isAllDuplicates = Boolean(
    previewData &&
    previewData.users.length > 0 &&
    previewData.auto_count === 0 &&
    previewData.pending_count === 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl overflow-visible my-6 flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Chia sẻ tài liệu
              </h2>
              <p className="text-xs text-gray-500">
                {documentTitle
                  ? `Đang chia sẻ: "${documentTitle}"`
                  : `Đang chia sẻ ${documentIds.length} tài liệu đã chọn`}
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
            renderUserBadge={renderBadge}
          />

          {isAllDuplicates && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Tất cả người nhận được chọn đều <strong>đã có tài liệu</strong> hoặc <strong>đang có yêu cầu chờ duyệt</strong>. Không cần gửi thêm yêu cầu chia sẻ.
              </span>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Lời nhắn đính kèm (tuỳ chọn)
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Nhập lời nhắn gửi đến người nhận..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-2xl">
          <div className="text-xs font-medium text-gray-600">
            {isPreviewLoading ? (
              <span className="text-gray-400">Đang dự đoán trạng thái...</span>
            ) : previewData ? (
              <span>
                Đã chọn{" "}
                <strong className="text-gray-900">{previewData.users.length}</strong>{" "}
                người (
                <strong className="text-emerald-600">
                  {previewData.auto_count} nhận ngay
                </strong>
                ,{" "}
                <strong className="text-blue-600">
                  {previewData.pending_count} chờ xác nhận
                </strong>
                {previewData.already_pending_count > 0 && (
                  <span className="text-amber-600 font-medium">
                    , {previewData.already_pending_count} đang chờ duyệt
                  </span>
                )}
                {previewData.already_owned_count > 0 && (
                  <span className="text-gray-500">
                    , {previewData.already_owned_count} đã có trong kho
                  </span>
                )}
                )
              </span>
            ) : (
              <span>Chưa chọn người nhận</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={shareMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              disabled={
                totalCriteriaCount === 0 ||
                shareMutation.isPending ||
                isPreviewLoading ||
                isAllDuplicates
              }
              onClick={handleInitialSubmit}
            >
              {shareMutation.isPending ? "Đang chia sẻ..." : "Chia sẻ ngay"}
            </Button>
          </div>
        </div>
      </Card>

      {/* CONFIRM MODAL FOR BULK SHARE */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-semibold text-gray-900">
                Xác nhận chia sẻ số lượng lớn
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn đang thực hiện chia sẻ tài liệu theo diện rộng (toàn bộ Lớp, Khoa hoặc danh sách nhiều hơn 20 người).
              Hệ thống sẽ gửi thông báo và tài liệu tới tất cả người nhận phù hợp. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkConfirm(false)}
                disabled={shareMutation.isPending}
              >
                Xem lại
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowBulkConfirm(false);
                  shareMutation.mutate(true);
                }}
                disabled={shareMutation.isPending}
              >
                Xác nhận gửi
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
