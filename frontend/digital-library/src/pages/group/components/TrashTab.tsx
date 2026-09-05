import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/shared/EmptyState";
import { groupService } from "@/services/groupService";
import type { TrashTabProps } from "../types/groupSpace.types";

export default function TrashTab({ documents, groupId }: TrashTabProps) {
  const queryClient = useQueryClient();
  const restore = useMutation({
    mutationFn: (documentId: number) =>
      groupService.restoreFromTrash(groupId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
    },
  });
  return documents.length ? (
    <div className="space-y-3">
      {documents.map((document) => (
        <Card key={document.id} className="flex items-center justify-between">
          <span className="font-medium text-gray-900">{document.title}</span>
          <Button
            variant="outline"
            icon={<ArchiveRestore className="h-4 w-4" />}
            disabled={restore.isPending}
            onClick={() => restore.mutate(document.id)}
          >
            Khôi phục
          </Button>
        </Card>
      ))}
    </div>
  ) : (
    <EmptyState
      icon={<Trash2 className="h-6 w-6" />}
      title="Chưa có tài liệu nào"
      description="Thùng rác nhóm đang trống."
    />
  );
}
