// src/pages/group/hooks/useGroupDocuments.ts

import { useState, useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { groupService } from "@/services/groupService";
import { groupDocumentService } from "@/services/documentService";
import type { Document, DocumentQueryParams, PaginatedDocuments } from "@/types/document";

export function useGroupDocuments(
  groupId: number,
  hasWorkspace: boolean,
  queryParams?: DocumentQueryParams
) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [isGroupRenameModalOpen, setIsGroupRenameModalOpen] = useState(false);
  const [renamingGroupDoc, setRenamingGroupDoc] = useState<{ id: string | number; title: string } | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // 3.2: useInfiniteQuery cho tài liệu nhóm với page_size: 20
  const {
    data: infiniteData,
    isLoading: docsLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["documents", `group:${groupId}`, user?.id, queryParams],
    queryFn: ({ pageParam = 1 }) =>
      groupService.getDocuments(groupId, {
        ...queryParams,
        page: pageParam as number,
        page_size: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    staleTime: 15 * 1000, // 15s cho nhóm
    enabled: hasWorkspace && !isNaN(groupId) && groupId > 0 && Boolean(user?.id),
  });

  // Khử trùng theo id khi gộp các trang
  const documents = useMemo(() => {
    if (!infiniteData?.pages) return [];
    const seen = new Set<number>();
    const result: Document[] = [];
    for (const page of infiniteData.pages) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
    }
    return result;
  }, [infiniteData]);

  const total = infiniteData?.pages[0]?.total ?? 0;

  // 3.5: Mutations với setQueryData
  const deleteDocument = useMutation({
    mutationFn: (docId: number) => groupService.deleteDocument(groupId, docId),
    onSuccess: (_, deletedId) => {
      // Cập nhật trực tiếp cache các trang đã nạp
      queryClient.setQueriesData<InfiniteData<PaginatedDocuments>>(
        { queryKey: ["documents", `group:${groupId}`] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((p) => ({
              ...p,
              items: p.items.filter((doc) => doc.id !== deletedId),
              total: Math.max(0, p.total - 1),
            })),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
    },
  });

  const renameGroupDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: string | number; title: string }) =>
      groupService.updateDocument(groupId, Number(id), { title }),
    onSuccess: (_, { id, title }) => {
      // Cập nhật trực tiếp tên trong cache
      queryClient.setQueriesData<InfiniteData<PaginatedDocuments>>(
        { queryKey: ["documents", `group:${groupId}`] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((p) => ({
              ...p,
              items: p.items.map((doc) =>
                doc.id === Number(id) ? { ...doc, title } : doc
              ),
            })),
          };
        }
      );
      setIsGroupRenameModalOpen(false);
      setRenamingGroupDoc(null);
    },
  });

  const saveDocument = useMutation({
    mutationFn: (docId: number) => groupService.saveToPersonal(groupId, docId),
    onSuccess: () => {
      // 1.5 & 3.5: Lưu từ nhóm về cá nhân -> invalidate cá nhân
      queryClient.invalidateQueries({ queryKey: ["documents", "personal"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => groupDocumentService.upload(fd, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", `group:${groupId}`] });
    },
  });

  const handleRenameDocument = (docId: string | number, currentTitle: string) => {
    setRenamingGroupDoc({ id: docId, title: currentTitle });
    setIsGroupRenameModalOpen(true);
  };

  return {
    documents,
    docsLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
    total,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isGroupRenameModalOpen,
    setIsGroupRenameModalOpen,
    renamingGroupDoc,
    setRenamingGroupDoc,
    saveDocument,
    deleteDocument,
    renameGroupDocumentMutation,
    uploadMutation,
    handleRenameDocument,
  };
}
