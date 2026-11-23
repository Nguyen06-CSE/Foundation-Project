// src/pages/personal/hooks/usePersonalDocuments.ts

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { documentService } from "@/services/documentService";
import { activityService } from "@/services/activityService";
import { invalidateDashboard } from "@/utils/dashboardUtils";
import type { DocumentAction } from "@/components/shared/documents/DocumentContextMenu";
import { getFileExtension } from "@/utils/file";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import type { FolderType } from "../components/PersonalFoldersSection";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import type { Document, PaginatedDocuments } from "@/types/document";

export function usePersonalDocuments(
  selectedFolderId: number | null,
  folders: FolderType[] = []
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // --- 1. HOOK QUẢN LÝ BỘ LỌC & QUERY STATE (SERVER-SIDE) ---
  const filters = useDocumentFilters({
    initialFolderId: selectedFolderId,
    initialSort: "trending",
  });

  const { setSelectedFolderId } = filters;

  // Đồng bộ selectedFolderId từ props/URL
  useEffect(() => {
    setSelectedFolderId(selectedFolderId);
  }, [selectedFolderId, setSelectedFolderId]);

  // Bộ lọc phụ client (Q3: Chia sẻ, truy cập gần đây)
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(null);
  const [selectedShareFilter, setSelectedShareFilter] = useState<string | null>(null);

  // --- 2. STATES GIAO DIỆN & MODAL ---
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState<{ id: string; title: string } | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributeDoc, setContributeDoc] = useState<{ id: number; title: string } | null>(null);
  const [shareDoc, setShareDoc] = useState<{ id: number; title: string } | null>(null);

  // --- 3. QUERIES ---
  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types"],
    queryFn: () => documentService.getFileTypes(),
  });

  // 3.2: useInfiniteQuery với page_size: 20 và toàn bộ bộ lọc trong queryKey
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
    queryKey: ["documents", "personal", user?.id, filters.queryParams],
    queryFn: ({ pageParam = 1 }) =>
      documentService.getAll({
        ...filters.queryParams,
        page: pageParam as number,
        page_size: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    staleTime: 30 * 1000,
    enabled: Boolean(user?.id),
  });

  // Khử trùng (deduplicate) theo id khi gộp các trang
  const rawDocuments = useMemo(() => {
    if (!infiniteData?.pages) return [];
    const seen = new Set<number>();
    const result: Document[] = [];
    for (const pageItem of infiniteData.pages) {
      for (const item of pageItem.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
    }
    return result;
  }, [infiniteData]);

  const total = infiniteData?.pages[0]?.total ?? 0;

  const docData = useMemo(
    () => ({
      items: rawDocuments,
      total,
      page: infiniteData?.pages.length ?? 1,
      page_size: 20,
      total_pages: Math.ceil(total / 20) || 1,
      has_more: hasNextPage,
    }),
    [rawDocuments, total, infiniteData?.pages.length, hasNextPage]
  );

  // --- 4. MUTATIONS (TỐI ƯU VỚI setQueryData) ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.delete(Number(id)),
    onSuccess: (_, deletedId) => {
      // 3.5: Cập nhật trực tiếp các trang đã nạp bằng setQueriesData, tránh refetch toàn bộ
      queryClient.setQueriesData<InfiniteData<PaginatedDocuments>>(
        { queryKey: ["documents", "personal"] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((p) => ({
              ...p,
              items: p.items.filter((doc) => doc.id.toString() !== deletedId.toString()),
              total: Math.max(0, p.total - 1),
            })),
          };
        }
      );
      invalidateDashboard(queryClient);
    },
  });

  const renameDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: number | string; title: string }) =>
      documentService.update(Number(id), { title }),
    onSuccess: (_, { id, title }) => {
      // 3.5: Cập nhật trực tiếp tên trong cache bằng setQueriesData
      queryClient.setQueriesData<InfiniteData<PaginatedDocuments>>(
        { queryKey: ["documents", "personal"] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((p) => ({
              ...p,
              items: p.items.map((doc) =>
                doc.id.toString() === id.toString() ? { ...doc, title } : doc
              ),
            })),
          };
        }
      );
      invalidateDashboard(queryClient);
      setIsRenameModalOpen(false);
      setRenamingDoc(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => documentService.upload(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "personal"] });
      invalidateDashboard(queryClient);
    },
  });

  // --- 5. HANDLERS ---
  const handleDocumentAction = useCallback(
    (action: DocumentAction | string, documentId: string) => {
      if (action === "view") {
        navigate(`/ca-nhan/tai-lieu/${documentId}`);
      } else if (action === "download") {
        const targetDoc = rawDocuments.find((d) => d.id.toString() === documentId);
        if (targetDoc) {
          activityService.downloadDocumentFile(targetDoc.id, targetDoc.title || "document").catch((err) => {
            console.error("Lỗi khi tải file qua API, fallback:", err);
            if (targetDoc.file_path) {
              const fileDownloadUrl = `${import.meta.env.VITE_API_URL}/${targetDoc.file_path}`;
              const link = document.createElement("a");
              link.href = fileDownloadUrl;
              link.download = targetDoc.title;
              link.target = "_blank";
              link.rel = "noreferrer";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          });
        } else {
          alert("Không tìm thấy thông tin tài liệu để tải xuống.");
        }
      } else if (action === "download-markdown") {
        const targetDoc = rawDocuments.find((d) => d.id.toString() === documentId);
        const mdPath = targetDoc?.markdown_path;
        if (mdPath) {
          const fileDownloadUrl = `${import.meta.env.VITE_API_URL}/${mdPath}`;
          const link = document.createElement("a");
          link.href = fileDownloadUrl;
          link.download = `${targetDoc.title || "document"}.md`;
          link.target = "_blank";
          link.rel = "noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert("Tài liệu không có tệp Markdown để tải xuống.");
        }
      } else if (action === "share") {
        const docToShare = rawDocuments.find((d) => d.id.toString() === documentId);
        if (docToShare) {
          setShareDoc({ id: docToShare.id, title: docToShare.title });
        }
      } else if (action === "rename") {
        const docToRename = rawDocuments.find((d) => d.id.toString() === documentId);
        if (docToRename) {
          setRenamingDoc({ id: docToRename.id.toString(), title: docToRename.title });
          setIsRenameModalOpen(true);
        }
      } else if (action === "contribute") {
        const docToContribute = rawDocuments.find((d) => d.id.toString() === documentId);
        if (docToContribute) {
          setContributeDoc({ id: docToContribute.id, title: docToContribute.title });
          setIsContributeModalOpen(true);
        }
      } else if (action === "delete") {
        if (window.confirm("Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.")) {
          deleteMutation.mutate(documentId);
        }
      }
    },
    [navigate, rawDocuments, deleteMutation]
  );

  // --- 6. CHUẨN HÓA DỮ LIỆU HIỂN THỊ (DOC CARDS) ---
  const allDocCards = useMemo(() => {
    return rawDocuments.map((doc) => {
      const meta = (doc as any).metadata ?? null;
      const sharedBy = meta?.shared_by;
      const sharerName = sharedBy
        ? sharedBy.full_name || sharedBy.username
        : undefined;

      return {
        id: doc.id.toString(),
        name: doc.title,
        type: doc.file_type || "unknown",
        updatedAt: formatRelativeDate(doc.created_at),
        size: formatSize(doc.file_size || 0),
        extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
        thumbnail_path: doc.thumbnail_path ?? null,
        markdown_path: doc.markdown_path ?? null,
        markdownPath: doc.markdown_path ?? null,
        file_path: doc.file_path ?? null,
        content: doc.content,
        owner: sharerName ? { name: sharerName, avatar: "" } : undefined,
        rawType: doc.file_type,
        tags: doc.tags || [],
        folder_id: (doc as any).folder_id ?? null,
        is_bundle: doc.is_bundle,
        bundle_parent_id: doc.bundle_parent_id,
        bundle_children_count: doc.bundle_children_count,

        // STATS & METADATA
        view_count: doc.view_count ?? 0,
        personal_view_count: doc.personal_view_count ?? 0,
        trending_score: doc.trending_score ?? 0,
        share_count: doc.share_count ?? 0,
        metadata: meta,

        created_at: doc.created_at,
        last_accessed_at: (doc as any).last_accessed_at || (doc as any).updated_at || doc.created_at,
      };
    });
  }, [rawDocuments]);

  // Lọc thư mục theo từ khóa tìm kiếm (Folders load độc lập nên vẫn filter nhẹ ở client)
  const filteredFolders = useMemo(() => {
    const q = filters.searchQuery.toLowerCase().trim();
    return folders.filter((f) => (q ? f.name.toLowerCase().includes(q) : true));
  }, [folders, filters.searchQuery]);

  // Bộ lọc tài liệu đã được máy chủ thực hiện đầy đủ (Chỉ kèm fallback chia sẻ nếu chọn)
  const filteredDocuments = useMemo(() => {
    if (!selectedShareFilter) return allDocCards;
    return allDocCards.filter((doc) => {
      if (selectedShareFilter === "shared_by_me") {
        return doc.metadata?.is_shared === true || (doc.share_count ?? 0) > 0;
      }
      if (selectedShareFilter === "received_from_share") {
        return !!doc.metadata?.shared_by;
      }
      return true;
    });
  }, [allDocCards, selectedShareFilter]);

  return {
    // States
    page,
    setPage,
    isUploadOpen,
    setIsUploadOpen,
    isRenameModalOpen,
    setIsRenameModalOpen,
    renamingDoc,
    setRenamingDoc,
    isContributeModalOpen,
    setIsContributeModalOpen,
    contributeDoc,
    setContributeDoc,
    shareDoc,
    setShareDoc,

    // Filters (từ useDocumentFilters)
    activeTab: filters.activeTab,
    setActiveTab: filters.setActiveTab,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    selectedTagId: filters.selectedTagId,
    setSelectedTagId: filters.setSelectedTagId,
    selectedFileType: filters.selectedFileType,
    setSelectedFileType: filters.setSelectedFileType,
    selectedUploadTime: filters.selectedUploadTime,
    setSelectedUploadTime: filters.setSelectedUploadTime,
    selectedSort: filters.selectedSort,
    setSelectedSort: filters.setSelectedSort,

    // Extra Filters
    selectedAccessTime,
    setSelectedAccessTime,
    selectedShareFilter,
    setSelectedShareFilter,

    // Data
    fileTypes,
    docData,
    docsLoading,
    isFetching,
    filteredFolders,
    filteredDocuments,

    // Infinite Scroll Controls
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isError,
    refetch,
    total,

    // Actions
    deleteMutation,
    renameDocumentMutation,
    uploadMutation,
    handleDocumentAction,
  };
}
