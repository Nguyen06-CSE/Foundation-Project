// src/pages/group/components/sections/GroupDocumentsSection.tsx

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileBox, CheckSquare } from "lucide-react";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { ViewToggle, type ViewMode } from "@/components/shared/feedback/ViewToggle";
import {
  DocumentListView,
  DocumentDetailView,
  type DocumentListItem,
} from "@/components/shared/documents";
import { DocumentBulkActionBar } from "@/components/shared/documents/DocumentBulkActionBar";
import { ContributeModal } from "@/components/shared/modals/ContributeModal";
import LocalGroupDocumentCard from "../cards/LocalGroupDocumentCard";
import { groupDocumentService } from "@/services/documentService";
import type { Document, Folder } from "@/types/document";
import type { PermissionLevel } from "@/types/group";

export interface GroupDocumentsSectionProps {
  documents: Document[];
  folders?: Folder[] | { id: number; name: string; document_count?: number; color?: string | null }[];
  selectedFolderId?: number | null;
  onSelectFolder?: (id: number | null) => void;
  isLoading?: boolean;
  permission?: PermissionLevel | "owner" | "full" | "view";
  isOwner?: boolean;
  groupId: number;
  onSave?: (docId: number) => Promise<unknown>;
  onDelete?: (docId: number) => Promise<unknown>;
  onRename?: (docId: string | number, currentTitle: string) => void;
  currentView?: "grid" | "list" | "detail";
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

function parseSizeToBytes(size?: string | number): number | undefined {
  if (typeof size === "number") return size;
  if (!size) return undefined;
  const match = size.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return undefined;

  const value = parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(value)) return undefined;

  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  return value * (multipliers[unit] ?? 1);
}

export function GroupDocumentsSection({
  documents,
  folders = [],
  selectedFolderId = null,
  onSelectFolder,
  isLoading = false,
  permission = "view",
  isOwner = false,
  groupId,
  onSave,
  onDelete,
  onRename,
  currentView = "detail",
  viewMode: controlledViewMode,
  onViewModeChange: controlledOnViewModeChange,
}: GroupDocumentsSectionProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(
    (currentView as ViewMode) || "detail"
  );

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = controlledOnViewModeChange ?? setInternalViewMode;

  useEffect(() => {
    if (currentView && currentView !== internalViewMode) {
      setInternalViewMode(currentView as ViewMode);
    }
  }, [currentView, internalViewMode]);

  const effectivePermission: "owner" | "full" | "view" = isOwner
    ? "owner"
    : permission === "full"
      ? "full"
      : "view";

  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkContributeDocs, setBulkContributeDocs] = useState<{ id: number; title: string }[] | null>(null);

  const toggleSelectDoc = useCallback((docId: string | number) => {
    const numId = Number(docId);
    setSelectedIds((prev) =>
      prev.includes(numId) ? prev.filter((id) => id !== numId) : [...prev, numId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(documents.map((d) => Number(d.id)));
  }, [documents]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      await groupDocumentService.bulkDownloadZip(selectedIds, groupId);
    } catch {
      alert("Không thể tải xuống các tài liệu đã chọn.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Chuyển ${selectedIds.length} tài liệu nhóm đã chọn vào thùng rác?`)) return;
    setIsBulkProcessing(true);
    try {
      const res = await groupDocumentService.bulkDelete(selectedIds, groupId);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
      if (res.skipped_ids?.length > 0) {
        alert(`Đã xóa ${res.deleted_count} tài liệu (${res.skipped_ids.length} tài liệu bị bỏ qua do không đủ quyền).`);
      }
    } catch {
      alert("Không thể xóa các tài liệu đã chọn.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkContribute = () => {
    const docsToContribute = documents
      .filter((d: any) => selectedIds.includes(Number(d.id)) && !d.is_bundle)
      .map((d: any) => ({ id: Number(d.id), title: d.title || d.name }));
    if (docsToContribute.length === 0) {
      alert("Vui lòng chọn ít nhất 1 tệp tài liệu đơn lẻ để đóng góp.");
      return;
    }
    setBulkContributeDocs(docsToContribute);
  };

  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  // Map data sang DocumentListItem cho List / Detail View
  const listItems: DocumentListItem[] = documents.map((doc: any) => ({
    id: doc.id,
    title: doc.title || doc.name,
    type: doc.file_type || doc.rawType || "default",
    updatedAt: doc.created_at || doc.updated_at || doc.updatedAt,
    size: typeof doc.file_size === "number" ? doc.file_size : parseSizeToBytes(doc.size),
    thumbnail_path: doc.thumbnail_path ?? null,
    markdown_path: doc.markdown_path ?? doc.markdownPath ?? null,
    owner: doc.owner
      ? {
          full_name: doc.owner.full_name || doc.owner.username || doc.owner.name,
          username: doc.owner.username,
          avatar_url: doc.owner.avatar_url ?? undefined,
        }
      : undefined,
    tags: doc.tags || [],
    workspace_type: "group",
    is_bundle: Boolean(doc.is_bundle),
    bundle_parent_id: doc.bundle_parent_id ?? null,
    bundle_children_count: doc.bundle_children_count ?? null,
    content: doc.content ?? null,
    pages: doc.pages ?? null,
  }));

  // Handler cho actions trong List & Detail View
  const handleListAction = (action: string, docId: string | number) => {
    const numericId = Number(docId);
    const doc = documents.find((d: any) => Number(d.id) === numericId);

    switch (action) {
      case "save_personal":
      case "save":
        onSave?.(numericId);
        break;
      case "delete":
        onDelete?.(numericId);
        break;
      case "rename":
        if (doc) onRename?.(numericId, doc.title || (doc as any).name);
        break;
      case "download": {
        const downloadUrl = `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/groups/${groupId}/documents/${numericId}/download`;
        const link = window.document.createElement("a");
        link.href = downloadUrl;
        link.download = doc?.title || (doc as any).name || "download";
        link.target = "_blank";
        link.rel = "noreferrer";
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        break;
      }
      case "download-markdown": {
        const mdPath = doc?.markdown_path || (doc as any)?.markdownPath;
        if (!mdPath) {
          console.warn("Tài liệu không có markdown_path, bỏ qua");
          break;
        }
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const url = `${apiBase}/${mdPath}`;
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${doc?.title || (doc as any)?.name || "document"}.md`;
        link.target = "_blank";
        link.rel = "noreferrer";
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        break;
      }
      default:
        break;
    }
  };

  // Handler cho Bundle toggle
  const handleToggleBundle = async (
    bundleId: string | number
  ): Promise<DocumentListItem[]> => {
    const children = await groupDocumentService.getBundleChildren(
      groupId,
      Number(bundleId)
    );
    return children.map(
      (c: any): DocumentListItem => ({
        id: String(c.id),
        title: c.title,
        type: c.file_type || "file",
        updatedAt: c.updated_at || c.created_at,
        size: c.file_size,
        thumbnail_path: c.thumbnail_path ?? null,
        markdown_path: c.markdown_path ?? c.markdownPath ?? null,
        owner: c.owner
          ? { full_name: c.owner.full_name || c.owner.username }
          : undefined,
        tags: c.tags,
        workspace_type: "group",
        is_bundle: false,
        bundle_parent_id: Number(bundleId),
        bundle_children_count: null,
        content: c.content ?? null,
        pages: c.pages ?? null,
      })
    );
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {currentFolder
              ? `Tài liệu trong "${currentFolder.name}"`
              : "Tài liệu nhóm"}
          </h2>
          {documents.length > 0 && (
            <button
              type="button"
              onClick={
                selectedIds.length === documents.length
                  ? handleClearSelection
                  : handleSelectAll
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedIds.length > 0
                ? `Đã chọn ${selectedIds.length}/${documents.length}`
                : "Chọn nhiều"}
            </button>
          )}
          {selectedFolderId !== null && (
            <button
              onClick={() => onSelectFolder?.(null)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Tất cả tài liệu
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      ) : documents.length > 0 ? (
        <>
          {/* GRID VIEW */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {documents.map((doc: any) => (
                <LocalGroupDocumentCard
                  key={doc.id}
                  document={doc}
                  permission={effectivePermission}
                  groupId={groupId}
                  onSave={onSave || (async () => {})}
                  onDelete={onDelete || (async () => {})}
                  onRename={onRename}
                  isSelected={selectedIds.includes(Number(doc.id))}
                  onToggleSelect={toggleSelectDoc}
                />
              ))}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === "list" && (
            <DocumentListView
              documents={listItems}
              isLoading={isLoading}
              showOwner={true}
              workspaceType="group"
              permission={effectivePermission}
              navigationPath={(id) => `/groups/${groupId}/documents/${id}`}
              onAction={handleListAction}
              onToggleBundle={handleToggleBundle}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectDoc}
            />
          )}

          {/* DETAIL VIEW */}
          {viewMode === "detail" && (
            <DocumentDetailView
              documents={listItems}
              isLoading={isLoading}
              showOwner={true}
              workspaceType="group"
              permission={effectivePermission}
              navigationPath={(id) => `/groups/${groupId}/documents/${id}`}
              onAction={handleListAction}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectDoc}
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={<FileBox className="h-6 w-6" />}
          title={selectedFolderId ? "Thư mục trống" : "Chưa có tài liệu nào"}
          description="Chia sẻ hoặc upload tài liệu để nhóm cùng sử dụng."
        />
      )}

      <DocumentBulkActionBar
        selectedCount={selectedIds.length}
        totalCount={documents.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDownload={handleBulkDownload}
        onBulkContribute={handleBulkContribute}
        onBulkDelete={effectivePermission !== "view" ? handleBulkDelete : undefined}
        isProcessing={isBulkProcessing}
      />

      {bulkContributeDocs && (
        <ContributeModal
          documents={bulkContributeDocs}
          onClose={() => setBulkContributeDocs(null)}
          onSuccess={() => {
            setBulkContributeDocs(null);
            setSelectedIds([]);
          }}
        />
      )}
    </section>
  );
}

export default GroupDocumentsSection;