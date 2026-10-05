import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, FileText, HardDrive, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { groupService } from "@/services/groupService";
import { formatSize } from "@/utils/formatSize";
import { groupDocsIntoBatches } from "@/utils/trashUtils";
import {
  TrashStatCard,
  TrashEmptyState,
  TrashConfirmModal,
  TrashBatchRow,
  MobileTrashBatch,
} from "@/components/shared/trash";
import type { TrashTabProps } from "../../types/groupSpace.types";

export default function TrashTab({ documents, groupId }: TrashTabProps) {
  const queryClient = useQueryClient();
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  // Kế thừa helper groupDocsIntoBatches từ shared
  const batches = useMemo(() => groupDocsIntoBatches(documents), [documents]);

  const restoreMutation = useMutation({
    mutationFn: async (docIds: number[]) => {
      await Promise.all(
        docIds.map((docId) => groupService.restoreFromTrash(groupId, docId))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      setExpandedBatchId(null);
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const allDocIds = documents.map((doc) => doc.id);
      await Promise.all(
        allDocIds.map((docId) => groupService.restoreFromTrash(groupId, docId))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      setShowEmptyConfirm(false);
    },
  });

  const totalDocuments = documents.length;
  const totalStorageBytes = documents.reduce(
    (sum: number, d: any) => sum + (d.file_size ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header riêng cho Nhóm */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Thùng rác nhóm</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Các tài liệu bị xóa trong nhóm sẽ được lưu trữ tạm thời trong 30 ngày.
        </p>
      </section>

      {/* Reused Shared Stat Cards */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TrashStatCard
          icon={<ArchiveRestore className="h-5 w-5" />}
          iconClassName="bg-green-50 text-green-600"
          label="Gói xóa"
          value={batches.length}
          description="Gói lưu trữ nhóm"
        />
        <TrashStatCard
          icon={<FileText className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Tài liệu"
          value={totalDocuments}
          description="Tổng số tệp tin"
        />
        <TrashStatCard
          icon={<HardDrive className="h-5 w-5" />}
          iconClassName="bg-yellow-50 text-yellow-600"
          label="Dung lượng"
          value={formatSize(totalStorageBytes)}
          description="Dung lượng khôi phục"
        />
      </section>

      {/* Main Table Container */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Các gói xóa gần đây</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Danh sách tài liệu đã bị xóa khỏi nhóm.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={batches.length === 0 || emptyTrashMutation.isPending}
            onClick={() => setShowEmptyConfirm(true)}
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            Dọn sạch thùng rác
          </Button>
        </div>

        {batches.length === 0 ? (
          <TrashEmptyState
            title="Thùng rác nhóm đang trống"
            description="Không có tài liệu nào bị xóa trong nhóm này."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Tên gói xóa</th>
                    <th className="px-4 py-3 font-medium">Số tài liệu</th>
                    <th className="px-4 py-3 font-medium">Dung lượng</th>
                    <th className="px-4 py-3 font-medium">Tự động xóa sau</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <TrashBatchRow
                      key={batch.id}
                      batch={batch}
                      expanded={expandedBatchId === batch.id}
                      isRestoring={restoreMutation.isPending}
                      onToggle={() =>
                        setExpandedBatchId((c) => (c === batch.id ? null : batch.id))
                      }
                      onRestore={() => restoreMutation.mutate(batch.docIds)}
                      // Mở rộng tương lai: Có thể truyền renderExtraMeta để hiển thị Avatar người xóa trong nhóm
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {batches.map((batch) => (
                <MobileTrashBatch
                  key={batch.id}
                  batch={batch}
                  expanded={expandedBatchId === batch.id}
                  isRestoring={restoreMutation.isPending}
                  onToggle={() =>
                    setExpandedBatchId((c) => (c === batch.id ? null : batch.id))
                  }
                  onRestore={() => restoreMutation.mutate(batch.docIds)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <Star className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <p className="text-xs leading-5 text-green-700">
          <span className="font-semibold">Mẹo:</span> Thành viên nhóm có thể khôi phục lại tài liệu đã xóa nếu cần thiết.
        </p>
      </div>

      <TrashConfirmModal
        isOpen={showEmptyConfirm}
        title="Dọn sạch thùng rác nhóm?"
        description="Tất cả tài liệu bị xóa trong nhóm này sẽ được xử lý. Bạn có chắc chắn muốn tiếp tục?"
        isLoading={emptyTrashMutation.isPending}
        onClose={() => setShowEmptyConfirm(false)}
        onConfirm={() => emptyTrashMutation.mutate()}
      />
    </div>
  );
}