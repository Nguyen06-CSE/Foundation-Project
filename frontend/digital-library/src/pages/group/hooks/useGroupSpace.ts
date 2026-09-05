// frontend/digital-library/src/pages/group/hooks/useGroupSpace.ts

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FolderAction } from "@/components/shared/FolderContextMenu";
import { groupService } from "@/services/groupService";
import { groupTagService } from "@/services/tagService";
import { groupFolderService } from "@/services/folderService";
import { documentService } from "@/services/documentService";
import { useAuthStore } from "@/stores/authStore";
import type { PermissionLevel } from "@/types/group";
import type { GroupTab } from "../types/groupSpace.types";

export function useGroupSpace() {
  // --------------------------------------------------------------------------
  // ROUTING & NAVIGATION
  // --------------------------------------------------------------------------
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as GroupTab) || "documents";

  // --------------------------------------------------------------------------
  // GLOBAL STORES & QUERY CLIENT
  // --------------------------------------------------------------------------
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // --------------------------------------------------------------------------
  // LOCAL STATES
  // --------------------------------------------------------------------------
  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);

  // Modals
  const [shareModal, setShareModal] = useState<"documents" | "folder" | "invite" | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Quản lý Thư mục (Sửa & Xóa)
  const [editingFolder, setEditingFolder] = useState<{
    id: number;
    name: string;
    color: string;
    tagIds: number[];
  } | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<{ id: number; name: string } | null>(null);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // --------------------------------------------------------------------------
  // QUERIES (FETCHING DATA)
  // --------------------------------------------------------------------------
  const { data: workspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId,
  });

  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types", groupId],
    queryFn: () => documentService.getFileTypes(),
  });

  const { data: groupTagsData = [] } = useQuery({
    queryKey: ["group-tags", groupId],
    queryFn: () => groupTagService.getAll(groupId),
    enabled: !isNaN(groupId),
  });

  const {
    data: workspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
  } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getById(groupId),
    enabled: !isNaN(groupId),
  });

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["group-documents", groupId],
    queryFn: () => groupService.getDocuments(groupId),
    enabled: !!workspace,
  });

  const { data: foldersData = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["group-folders", groupId],
    queryFn: () => groupService.getFolders(groupId),
    enabled: !!workspace,
  });

  const { data: membersData = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !!workspace,
  });

  const { data: invitationsData = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: groupService.getMyInvitations,
  });

  // --------------------------------------------------------------------------
  // DERIVED DATA & PERMISSIONS
  // --------------------------------------------------------------------------
  const documents = documentsData?.items ?? [];
  const folders = foldersData;
  const members = membersData;
  const invitations = invitationsData;
  const groupTags = groupTagsData;

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isOwner =
    currentMember?.is_owner ??
    (!!workspace?.owner_id && workspace.owner_id === currentUser?.id);
  const permission: PermissionLevel = currentMember?.permission_level ?? "view";
  const canManageDocuments = isOwner || permission === "full";

  // Trash Query (Chỉ fetch khi người dùng là Owner)
  const { data: trashData = [] } = useQuery({
    queryKey: ["group-trash", groupId],
    queryFn: () => groupService.getTrash(groupId),
    enabled: isOwner,
  });
  const trash = trashData;

  // Lọc tài liệu theo Bộ lọc (Search, Tag, FileType)
  const filteredDocuments = (documents || []).filter((doc: any) => {
    const docName = doc.title || doc.name || "";
    if (searchQuery && !docName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (selectedTagId !== null) {
      const hasTag = doc.tags?.some(
        (t: any) => t.id === selectedTagId || t.tag_id === selectedTagId
      );
      if (!hasTag) return false;
    }

    if (selectedFileType !== null) {
      const fileType = doc.file_type || doc.rawType;
      if (fileType !== selectedFileType) return false;
    }

    return true;
  });

  // --------------------------------------------------------------------------
  // EFFECTS & NAVIGATION GUARDS
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!id || isNaN(groupId)) {
      navigate("/groups", { replace: true });
    }
  }, [id, groupId, navigate]);

  // --------------------------------------------------------------------------
  // MUTATIONS
  // --------------------------------------------------------------------------
  const documentMutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  };

  const saveDocument = useMutation({
    mutationFn: (docId: number) => groupService.saveToPersonal(groupId, docId),
    ...documentMutationOptions,
  });

  const deleteDocument = useMutation({
    mutationFn: (docId: number) => groupService.deleteDocument(groupId, docId),
    ...documentMutationOptions,
  });

  // --------------------------------------------------------------------------
  // EVENT HANDLERS
  // --------------------------------------------------------------------------
  const setTab = (tab: GroupTab) =>
    setSearchParams(tab === "documents" ? {} : { tab });

  const handleFolderAction = async (action: FolderAction, folderId: number) => {
    if (action === "edit") {
      const targetFolder = folders.find((f) => f.id === folderId);
      if (targetFolder) {
        setEditingFolder({
          id: targetFolder.id,
          name: targetFolder.name,
          color: targetFolder.color || "#4CAF50",
          tagIds: (targetFolder as any).tags?.map((t: any) => t.id) || [],
        });
        setIsFolderModalOpen(true);
      }
      return;
    }

    if (action === "share") {
      setShareModal("folder");
      return;
    }

    if (action === "delete") {
      const targetFolder = folders.find((f) => f.id === folderId);
      if (targetFolder) {
        setDeletingFolder({ id: targetFolder.id, name: targetFolder.name });
        setIsDeleteFolderOpen(true);
      }
    }
  };

  const handleCancelDeleteFolder = () => {
    if (isDeletingFolder) return;
    setIsDeleteFolderOpen(false);
    setDeletingFolder(null);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder) return;

    try {
      setIsDeletingFolder(true);
      await groupFolderService.delete(deletingFolder.id, groupId);

      queryClient.invalidateQueries({
        queryKey: ["group-folders", groupId],
      });

      setIsDeleteFolderOpen(false);
      setDeletingFolder(null);
    } catch (error) {
      console.error("Lỗi khi xóa thư mục nhóm:", error);
    } finally {
      setIsDeletingFolder(false);
    }
  };

  return {
    groupId,
    navigate,
    activeTab,
    queryClient,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    shareModal,
    setShareModal,
    isFolderModalOpen,
    setIsFolderModalOpen,
    isUploadModalOpen,
    setIsUploadModalOpen,
    editingFolder,
    setEditingFolder,
    deletingFolder,
    isDeleteFolderOpen,
    isDeletingFolder,
    workspaceTags,
    fileTypes,
    groupTags,
    workspace,
    workspaceLoading,
    workspaceError,
    docsLoading,
    foldersData,
    foldersLoading,
    documents,
    folders,
    members,
    invitations,
    isOwner,
    permission,
    canManageDocuments,
    trash,
    filteredDocuments,
    saveDocument,
    deleteDocument,
    setTab,
    handleFolderAction,
    handleCancelDeleteFolder,
    handleConfirmDeleteFolder,
  };
}
