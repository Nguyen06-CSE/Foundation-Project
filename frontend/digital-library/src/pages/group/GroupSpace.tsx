// frontend/digital-library/src/pages/group/GroupSpace.tsx

// ============================================================================
// 1. IMPORTS & DEPENDENCIES
// ============================================================================
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  FileBox,
  FilePlus,
  FolderUp,
  Search,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import EmptyState from "@/components/shared/EmptyState";
import { FileIcon } from "@/components/shared/FileIcon";
import { FolderCard } from "@/components/shared/FolderCard";
import { type FolderAction } from "@/components/shared/FolderContextMenu";

import { CreateFolderModal } from "@/pages/personal/components/CreateFolderModal";
import { UploadModal } from "@/pages/personal/components/UploadModal";

import { getNormalizedExtension, useDocumentFilters } from "@/hooks/useDocumentFilters";
import { groupService } from "@/services/groupService";
import { groupTagService } from "@/services/tagService";
import { groupFolderService } from "@/services/folderService";
import { documentService, groupDocumentService } from "@/services/documentService";
import { useAuthStore } from "@/stores/authStore";

import type { Document } from "@/types/document";
import type { PermissionLevel, WorkspaceInvitation, WorkspaceMember } from "@/types/group";

import { cn } from "@/utils/cn";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";

// ============================================================================
// 2. TYPES & CONSTANTS
// ============================================================================
type GroupTab = "documents" | "members" | "requests" | "settings" | "trash";

const TAB_LABELS: Record<GroupTab, string> = {
  documents: "Tài liệu",
  members: "Thành viên",
  requests: "Yêu cầu ",
  settings: "Cài đặt",
  trash: "Thùng rác",
};

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================
export default function GroupSpace() {
  // --------------------------------------------------------------------------
  // 3.1. ROUTING & NAVIGATION
  // --------------------------------------------------------------------------
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as GroupTab) || "documents";

  // --------------------------------------------------------------------------
  // 3.2. GLOBAL STORES & QUERY CLIENT
  // --------------------------------------------------------------------------
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // --------------------------------------------------------------------------
  // 3.3. LOCAL STATES
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
  // 3.4. QUERIES (FETCHING DATA)
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
  // 3.5. DERIVED DATA & PERMISSIONS
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
  // 3.6. EFFECTS & NAVIGATION GUARDS
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!id || isNaN(groupId)) {
      navigate("/groups", { replace: true });
    }
  }, [id, groupId, navigate]);

  // --------------------------------------------------------------------------
  // 3.7. MUTATIONS
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
  // 3.8. EVENT HANDLERS
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

  // --------------------------------------------------------------------------
  // 3.9. CONDITIONAL RENDER GUARDS (LOADING & ERROR)
  // --------------------------------------------------------------------------
  if (workspaceLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-24 w-full animate-pulse rounded-xl bg-gray-200" />
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (workspaceError || !workspace) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-gray-500">
          Không tìm thấy nhóm hoặc bạn không có quyền truy cập.
        </p>
        <Button variant="outline" onClick={() => navigate("/groups")}>
          Quay lại danh sách nhóm
        </Button>
      </div>
    );
  }

 return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {workspace.name}
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              {members.length} thành viên · Cập nhật gần đây
            </p>
          </div>
        </div>
        {canManageDocuments && (
          <Dropdown
            trigger={
              <Button icon={<FilePlus className="h-4 w-4" />}>
                + Thêm tài liệu
              </Button>
            }
            items={[
              {
                icon: <Upload className="h-4 w-4" />,
                label: "Upload tài liệu mới",
                onClick: () => setIsUploadModalOpen(true),
              },
              {
                icon: <FileBox className="h-4 w-4" />,
                label: "Chia sẻ từ kho cá nhân",
                onClick: () => setShareModal("documents"),
              },
              {
                icon: <FolderUp className="h-4 w-4" />,
                label: "Chia sẻ cả thư mục",
                onClick: () => setShareModal("folder"),
              },
            ]}
          />
        )}
      </Card>

      {workspace.is_dissolving && workspace.dissolve_at && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          Nhóm này sẽ bị giải tán vào{" "}
          {formatRelativeDate(workspace.dissolve_at)}. Hãy lưu tài liệu bạn cần.
        </div>
      )}

      <div className="flex flex-wrap gap-6 border-b border-gray-200">
        {(Object.keys(TAB_LABELS) as GroupTab[])
          .filter((tab) => isOwner || (tab !== "settings" && tab !== "trash"))
          .map((tab) => (
            <button
              key={tab}
              className={cn(
                "pb-3 text-sm transition-colors",
                activeTab === tab
                  ? "border-b-2 border-primary-600 font-semibold text-primary-600"
                  : "border-b-2 border-transparent text-gray-600 hover:text-gray-900",
              )}
              onClick={() => setTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
      </div>

      {/* TAB TÀI LIỆU KÈM THANH TÌM KIẾM & BỘ LỌC ĐỘNG */}
      {activeTab === "documents" && (
        <div className="flex flex-col gap-4">
          {/* Thanh Tìm kiếm & Bộ lọc */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[240px] flex-1 max-w-md">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Tìm tệp trong không gian..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DynamicFilterDropdown
                label="Nhãn dán"
                options={workspaceTags.map((t) => ({
                  value: t.tag_id,
                  label: t.name,
                }))}
                selectedValue={selectedTagId}
                onChange={(val) => setSelectedTagId(val as number | null)}
              />

              <DynamicFilterDropdown
                label="Loại tài liệu"
                options={fileTypes.map((ft: string) => ({
                  value: ft,
                  label: getNormalizedExtension(ft).toUpperCase() || "Khác",
                }))}
                selectedValue={selectedFileType}
                onChange={(val) => setSelectedFileType(val as string | null)}
              />
            </div>
          </div>

          {/* Component DocumentsTab hiển thị danh sách đã qua bộ lọc */}
          <DocumentsTab
            documents={filteredDocuments} // Truyền mảng documents đã được lọc theo searchQuery, selectedTagId, selectedFileType
            folders={folders}
            isLoading={docsLoading || foldersLoading}
            permission={permission}
            isOwner={isOwner}
            groupId={groupId}
            onSave={(docId) => saveDocument.mutateAsync(docId)}
            onDelete={(docId) => deleteDocument.mutateAsync(docId)}
            onAddFolder={() => {
              setEditingFolder(null);
              setIsFolderModalOpen(true);
            }}
            onFolderAction={handleFolderAction}
          />
        </div>
      )}

      {activeTab === "members" && (
        <MembersTab
          members={members}
          isOwner={isOwner}
          onInvite={() => setShareModal("invite")}
          groupId={groupId}
        />
      )}
      {activeTab === "requests" && <RequestsTab invitations={invitations} />}
      {activeTab === "settings" && isOwner && (
        <SettingsTab
          groupName={workspace.name}
          members={members}
          onDissolve={() =>
            groupService
              .dissolve(groupId)
              .then(() =>
                queryClient.invalidateQueries({ queryKey: ["group", groupId] }),
              )
          }
        />
      )}
      {activeTab === "trash" && isOwner && (
        <TrashTab documents={trash} groupId={groupId} />
      )}

      {/* Modals for documents tab */}
      {isFolderModalOpen && (
        <CreateFolderModal
          onClose={() => {
            setIsFolderModalOpen(false);
            setEditingFolder(null);
          }}
          availableTags={groupTags}
          onCreateTag={async (name) => {
            return await groupTagService.create(
              { name, color: "#2F6B3C" },
              groupId,
            );
          }}
          onSubmitData={async (data) => {
            if (editingFolder) {
              await groupFolderService.update(
                editingFolder.id,
                {
                  name: data.name,
                  color: data.color,
                },
                groupId,
              );
            } else {
              const newFolder = await groupFolderService.create(
                {
                  name: data.name,
                  color: data.color,
                },
                groupId,
              );

              if (data.tagIds.length > 0) {
                await Promise.all(
                  data.tagIds.map((tagId) =>
                    groupFolderService.attachFolderTag(
                      groupId,
                      newFolder.id,
                      tagId,
                    ),
                  ),
                );
              }
            }

            setIsFolderModalOpen(false);
            setEditingFolder(null);
            queryClient.invalidateQueries({
              queryKey: ["group-folders", groupId],
            });
          }}
          isSubmitting={false}
        />
      )}

      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          availableTags={groupTags}
          onCreateTag={async (name) => {
            return await groupTagService.create(
              { name, color: "#2F6B3C" },
              groupId,
            );
          }}
          onUpload={async (fd, selectedTagIds) => {
            const newDoc = await groupDocumentService.upload(fd, groupId);

            if (selectedTagIds.length > 0) {
              await Promise.all(
                selectedTagIds.map((tagId) =>
                  groupDocumentService.attachTag(groupId, newDoc.id, tagId),
                ),
              );
            }
            queryClient.invalidateQueries({
              queryKey: ["group-documents", groupId],
            });
          }}
          isUploading={false}
        />
      )}

      {shareModal === "documents" && (
        <SimpleShareModal
          title="Chia sẻ từ kho cá nhân"
          documents={documents}
          onClose={() => setShareModal(null)}
        />
      )}
      {shareModal === "folder" && (
        <SimpleShareModal
          title="Chia sẻ cả thư mục"
          documents={documents}
          onClose={() => setShareModal(null)}
        />
      )}
      {shareModal === "invite" && (
        <InviteModal groupId={groupId} onClose={() => setShareModal(null)} />
      )}

      {/* Modal Xác nhận xóa thư mục nhóm */}
{isDeleteFolderOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Xóa thư mục nhóm?
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Bạn có chắc muốn xóa thư mục này khỏi không gian nhóm không?
          </p>
        </div>

        <button
          type="button"
          onClick={handleCancelDeleteFolder}
          disabled={isDeletingFolder}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-800">
            {deletingFolder?.name || "Thư mục"}
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
          <p className="text-xs leading-5 text-green-700">
            <span className="font-semibold">Lưu ý:</span> Xóa thư mục sẽ không xóa các tài liệu hoặc nhãn (tag) bên trong. Các tài liệu và tag vẫn được giữ nguyên trong nhóm.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
        <Button
          variant="outline"
          onClick={handleCancelDeleteFolder}
          disabled={isDeletingFolder}
        >
          Hủy
        </Button>

        <Button
          variant="primary"
          onClick={handleConfirmDeleteFolder}
          disabled={isDeletingFolder}
          className="bg-red-600 hover:bg-red-700"
        >
          {isDeletingFolder ? "Đang xóa..." : "Xóa thư mục"}
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTS PHỤ TRỢ
// ----------------------------------------------------------------------

interface DocumentsTabProps {
  documents: Document[];
  folders: {
    id: number;
    name: string;
    document_count: number;
    color?: string | null;
  }[];
  isLoading: boolean;
  permission: PermissionLevel;
  isOwner: boolean;
  groupId: number;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
  onAddFolder: () => void;
  onFolderAction: (action: FolderAction, folderId: number) => void;
}

function DocumentsTab({
  documents,
  folders,
  isLoading,
  permission,
  isOwner,
  groupId,
  onSave,
  onDelete,
  onAddFolder,
  onFolderAction,
}: DocumentsTabProps) {
  // ... existing inside DocumentsTab ...
  const docCards = documents.map((doc) => ({
    id: doc.id,
    name: doc.title,
    rawType: doc.file_type || null,
    extension: null as string | null,
    type: doc.file_type || "unknown",
    tags: (doc as any).tags || [],
    _original: doc,
  }));
  const { data: workspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId,
  });
  // Helper lấy danh sách tag chi tiết cho từng folder
const getFolderTags = (folder: any) => {
  // Trường hợp 1: Backend folder đã trả về full danh sách object tags
  if (Array.isArray(folder.tags) && folder.tags.length > 0) {
    return folder.tags;
  }

  // Trường hợp 2: Backend folder chỉ trả về tag_ids -> Map từ workspaceTags
  if (Array.isArray(folder.tag_ids) && folder.tag_ids.length > 0) {
    return workspaceTags.filter((t: any) => folder.tag_ids.includes(t.id));
  }

  return [];
};
  

  const {
    searchQuery,
    setSearchQuery,
    filteredDocuments: filteredCards,
  } = useDocumentFilters(docCards);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  const effectivePermission: "owner" | "full" | "view" = isOwner
    ? "owner"
    : permission === "full"
      ? "full"
      : "view";

  return (
    <div className="space-y-5">
      {/* <div className="max-w-md">
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Tìm tệp trong không gian..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div> */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Thư mục học tập
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              id={folder.id}
              name={folder.name}
              count={folder.document_count}
              color={folder.color}
              tags={getFolderTags(folder)}
              onClick={() => console.log(folder.id)}
              onAction={(action) =>
                onFolderAction(action as FolderAction, folder.id)
              }
            />
          ))}
          {effectivePermission !== "view" && (
            <button
              onClick={onAddFolder}
              className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
            >
              + Thêm thư mục
            </button>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Tài liệu mới nhất
        </h2>
        {filteredCards.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredCards.map((card) => (
              <LocalGroupDocumentCard
                key={card.id}
                document={card._original}
                permission={effectivePermission}
                groupId={groupId}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileBox className="h-6 w-6" />}
            title="Chưa có tài liệu nào"
            description="Chia sẻ hoặc upload tài liệu để nhóm cùng sử dụng."
          />
        )}
      </section>
    </div>
  );
}

interface LocalGroupDocumentCardProps {
  document: Document;
  permission: "owner" | "full" | "view";
  groupId: number;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
}

import { GroupDocumentContextMenu } from "@/pages/group/components/GroupDocumentContextMenu";
import { DynamicFilterDropdown } from "@/components/shared/DynamicFilterDropdown";

function LocalGroupDocumentCard({
  document,
  permission,
  groupId,
  onSave,
  onDelete,
}: LocalGroupDocumentCardProps) {
  const navigate = useNavigate();

  const handleAction = async (action: string) => {
    switch (action) {
      case "view":
        navigate(`/groups/${groupId}/documents/${document.id}`);
        break;
      case "download":
        // mock download for now, actual implementation needs backend support
        console.log("Download", document.id);
        break;
      case "save-to-personal":
        await onSave(document.id);
        break;
      case "delete":
        if (
          window.confirm("Bạn có chắc chắn muốn xóa tài liệu này khỏi nhóm?")
        ) {
          await onDelete(document.id);
        }
        break;
      default:
        console.log("Action not handled in LocalGroupDocumentCard:", action);
    }
  };

  return (
    <Card className="group relative flex aspect-[1/0.82] flex-col overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-[0_0_60%] items-center justify-center bg-gray-50">
        <FileIcon
          type={document.file_type}
          className="h-16 w-16"
          iconClassName="h-8 w-8"
        />
      </div>
      <div className="flex flex-1 items-start gap-2 px-3 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
            {document.title}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {formatSize(document.file_size)} ·{" "}
            {formatRelativeDate(document.created_at)}
          </p>
        </div>
        <GroupDocumentContextMenu
          onAction={handleAction}
          permission={permission}
        />
      </div>
    </Card>
  );
}

function MembersTab({
  members,
  isOwner,
  onInvite,
  groupId,
}: {
  members: WorkspaceMember[];
  isOwner: boolean;
  onInvite: () => void;
  groupId: number;
}) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });

  const updatePermission = useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: number;
      permission: PermissionLevel;
    }) => groupService.updateMemberPermission(groupId, userId, permission),
    onSuccess,
  });

  const removeMember = useMutation({
    mutationFn: (userId: number) => groupService.removeMember(groupId, userId),
    onSuccess,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isOwner && (
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={onInvite}>
            + Mời thành viên
          </Button>
        )}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3">Thành viên</th>
              <th>Vai trò</th>
              <th>Quyền hạn</th>
              <th>Tham gia lúc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">
                    {member.full_name || member.username}
                  </div>
                  <div className="text-xs text-gray-400">
                    {member.student_code}
                  </div>
                </td>
                <td>
                  <Badge
                    variant={
                      member.is_owner
                        ? "primary"
                        : member.permission_level === "full"
                          ? "success"
                          : "default"
                    }
                  >
                    {member.role}
                  </Badge>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        member.permission_level === "full"
                          ? "primary"
                          : "default"
                      }
                    >
                      {member.permission_level === "full"
                        ? "Full (Toàn quyền)"
                        : "View (Chỉ xem)"}
                    </Badge>
                    {isOwner && !member.is_owner && (
                      <Dropdown
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        }
                        items={[
                          {
                            label: "Đổi sang View",
                            onClick: () =>
                              updatePermission.mutate({
                                userId: member.user_id,
                                permission: "view",
                              }),
                          },
                          {
                            label: "Đổi sang Full",
                            onClick: () =>
                              updatePermission.mutate({
                                userId: member.user_id,
                                permission: "full",
                              }),
                          },
                        ]}
                      />
                    )}
                  </div>
                </td>
                <td className="text-gray-500">
                  {formatRelativeDate(member.joined_at)}
                </td>
                <td>
                  {isOwner && !member.is_owner && (
                    <button
                      className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate(member.user_id)}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Chú thích quyền hạn:</p>
        <p className="mt-1">
          Full: upload, sửa, xóa, chỉnh sửa và chia sẻ tài liệu của nhóm. View:
          chỉ xem, tải và lưu tài liệu về kho cá nhân.
        </p>
      </Card>
    </div>
  );
}

function RequestsTab({ invitations }: { invitations: WorkspaceInvitation[] }) {
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: groupService.acceptInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] }),
  });
  const reject = useMutation({
    mutationFn: groupService.rejectInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] }),
  });
  const pending = invitations.filter((item) => item.status === "pending");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">
        Lời mời đang chờ phản hồi
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {pending.map((invitation) => (
          <Card key={invitation.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {invitation.workspace_name}
                </h3>
                <p className="text-xs text-gray-400">
                  Mời bởi {invitation.invited_by_name}
                </p>
              </div>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              {invitation.message}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Gửi lúc: {formatRelativeDate(invitation.created_at)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reject.mutate(invitation.id)}
                >
                  Từ chối
                </Button>
                <Button size="sm" onClick={() => accept.mutate(invitation.id)}>
                  Chấp nhận
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({
  groupName,
  members,
  onDissolve,
}: {
  groupName: string;
  members: WorkspaceMember[];
  onDissolve: () => Promise<unknown>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Thông tin nhóm</h2>
        <Input defaultValue={groupName} />
        <textarea
          className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600"
          defaultValue="Không gian học tập chung của nhóm."
        />
        <Button>Lưu thay đổi</Button>
      </Card>
      <Card className="space-y-4 border-red-100 bg-red-50/30">
        <h2 className="text-lg font-semibold text-red-600">
          Khu vực nguy hiểm
        </h2>
        <p className="text-sm text-gray-600">
          Giải tán nhóm sẽ thông báo cho thành viên trước 24h. Tài liệu chưa
          được lưu về cá nhân có thể chuyển sang vùng orphaned.
        </p>
        <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
          {members
            .filter((member) => !member.is_owner)
            .map((member) => (
              <option key={member.user_id}>
                {member.full_name || member.username}
              </option>
            ))}
        </select>
        <Button variant="danger" onClick={() => void onDissolve()}>
          Giải tán nhóm
        </Button>
      </Card>
    </div>
  );
}

function TrashTab({
  documents,
  groupId,
}: {
  documents: Document[];
  groupId: number;
}) {
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

function SimpleShareModal({
  title,
  documents,
  onClose,
}: {
  title: string;
  documents: Document[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {documents.slice(0, 3).map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <input type="checkbox" className="h-4 w-4" />
              <FileIcon type={doc.file_type} />
              <span className="text-sm font-medium text-gray-900">
                {doc.title}
              </span>
            </label>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-gray-500">
              Bạn chưa có tài liệu nào để chia sẻ.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button onClick={onClose}>Chia sẻ</Button>
        </div>
      </Card>
    </div>
  );
}

function InviteModal({
  groupId,
  onClose,
}: {
  groupId: number;
  onClose: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const invite = useMutation({
    mutationFn: () => groupService.invite(groupId, { identifier, message }),
    onSuccess: onClose,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Mời thành viên
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Tìm theo MSSV, email hoặc username..."
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <textarea
            className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Lời nhắn (tuỳ chọn)"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button
            disabled={!identifier.trim() || invite.isPending}
            onClick={() => invite.mutate()}
          >
            Gửi lời mời
          </Button>
        </div>
      </Card>
    </div>
  );
}
