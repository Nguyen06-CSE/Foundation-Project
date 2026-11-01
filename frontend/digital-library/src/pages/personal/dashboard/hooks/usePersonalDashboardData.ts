import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { documentService } from "@/services/documentService";
import { folderService } from "@/services/folderService";
import { groupService } from "@/services/groupService";
import { tagService } from "@/services/tagService";
import { useToastStore } from "@/stores/toastStore";
import { invalidateDashboard } from "@/utils/dashboardUtils";

export function usePersonalDashboardData() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const summaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: dashboardService.getSummary, staleTime: 15_000 });
  const invitationsQuery = useQuery({ queryKey: ["my-invitations"], queryFn: groupService.getMyInvitations });
  const trendingQuery = useQuery({
    queryKey: ["documents", "trending"],
    queryFn: () => documentService.getAll({ page: 1, page_size: 5, sort: "trending" }),
    staleTime: 120_000,
  });
  const foldersQuery = useQuery({ queryKey: ["folders"], queryFn: () => folderService.getAll(), staleTime: 5 * 60_000 });
  const tagsQuery = useQuery({ queryKey: ["tags"], queryFn: () => tagService.getAll(), staleTime: 5 * 60_000 });
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => documentService.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      invalidateDashboard(queryClient);
      addToast({ message: "Tải lên tài liệu thành công.", variant: "success" });
    },
  });
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; color?: string; tagIds?: number[] }) => folderService.create({ name: data.name, color: data.color, tag_ids: data.tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      invalidateDashboard(queryClient);
      addToast({ message: "Tạo thư mục thành công.", variant: "success" });
    },
  });

  return {
    summaryQuery,
    invitations: invitationsQuery.data ?? [],
    trendingData: trendingQuery.data,
    isTrendingLoading: trendingQuery.isLoading,
    folders: foldersQuery.data ?? [],
    isFoldersLoading: foldersQuery.isLoading,
    tags: tagsQuery.data ?? [],
    uploadMutation,
    createFolderMutation,
  };
}
