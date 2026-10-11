// src/components/shared/documents/DocumentDetail/DocumentDetail.tsx

import { Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import {
  TABS,
  FILE_TYPE_LABELS,
  MIME_TO_ICON_TYPE,
  type SharedDocumentDetailProps,
} from "./DocumentDetail.types";
import { useDocumentDetail } from "./hooks/useDocumentDetail";
import { DocumentTitleHeader } from "./components/DocumentTitleHeader";
import { DocumentInfoCard } from "./components/DocumentInfoCard";
import { DocumentActionCard } from "./components/DocumentActionCard";
import { TabPreview } from "./tabs/TabPreview";
import { TabContent } from "./tabs/TabContent";
import {
  TabDescription,
  TabNote,
  TabActivity,
} from "./tabs/TabPanels";

/**
 * DocumentDetail - Màn hình xem chi tiết tài liệu dùng chung
 *
 * Tính năng chính:
 * 1. Hiển thị thông tin tệp, các nhãn dán (tags) và thống kê
 * 2. Hỗ trợ xem trước đa định dạng (PDF, DOCX, Code, Markdown, Ảnh, Office PPTX/XLSX...)
 * 3. Hỗ trợ 5 tab nội dung: Bản xem trước, Nội dung OCR, Mô tả, Ghi chú, Lịch sử hoạt động
 * 4. Các tác vụ tài liệu: Đổi tên inline, Tải xuống (bản gốc/markdown), Xóa, Chọn ảnh bìa
 * 5. Tự động chuyển hướng nếu tài liệu là Gói tài liệu (Bundle)
 */
export function DocumentDetail(props: SharedDocumentDetailProps = {}) {
  const {
    doc,
    isLoading,
    isError,
    params,
    permissions,
    activeTab,
    setActiveTab,
    isRenaming,
    tempTitle,
    setTempTitle,
    handleStartRename,
    handleConfirmRename,
    handleCancelRename,
    handleBack,
    currentTags,
    allTags,
    isLoadingTags,
    handleCreateTag,
    isCreatingTag,
    handleSaveTags,
    isSavingTags,
    handleRemoveTag,
    isRemovingTag,
    renameMutation,
    updateThumbnailMutation,
    updateThumbnailPageMutation,
    deleteMutation,
  } = useDocumentDetail(props);

  // --- TRẠNG THÁI LOADING ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // --- TRẠNG THÁI LỖI / KHÔNG TÌM THẤY ---
  if (isError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500">Không tìm thấy tài liệu.</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // --- CHUYỂN HƯỚNG NẾU LÀ GÓI TÀI LIỆU (BUNDLE) ---
  if (doc.is_bundle) {
    const isGroup = !!(params.id && params.docId);
    const targetUrl = isGroup
      ? `/groups/${params.id}/bundle/${doc.id}`
      : `/personal/bundle/${doc.id}`;
    return <Navigate to={targetUrl} replace />;
  }

  // --- CHUẨN BỊ DỮ LIỆU HIỂN THỊ ---
  const fileTypeLabel =
    FILE_TYPE_LABELS[doc.file_type ?? ""] ?? doc.file_type ?? "Không xác định";
  const iconType = MIME_TO_ICON_TYPE[doc.file_type ?? ""] ?? "default";
  const sizeLabel = formatSize(doc.file_size ?? 0);
  const uploadedAt = formatRelativeDate(doc.created_at);
  const fileDownloadUrl = doc.file_path
    ? `${import.meta.env.VITE_API_URL}/${doc.file_path}`
    : "#";
  const markdownDownloadUrl = doc.markdown_path
    ? `${import.meta.env.VITE_API_URL}/${doc.markdown_path}`
    : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Nút quay lại */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Cột trái: Header, Tabs & Xem trước nội dung ── */}
        <Card className="flex flex-col gap-4 min-w-0">
          <DocumentTitleHeader
            title={doc.title}
            iconType={iconType}
            sizeLabel={sizeLabel}
            uploadedAt={uploadedAt}
            canEdit={permissions.canEdit}
            isRenaming={isRenaming}
            tempTitle={tempTitle}
            setTempTitle={setTempTitle}
            onConfirmRename={handleConfirmRename}
            onCancelRename={handleCancelRename}
            isRenamePending={renameMutation.isPending}
          />

          {/* Thanh chuyển tab */}
          <div className="flex items-center border-b border-gray-200 -mx-5 px-5 gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors focus:outline-none",
                  activeTab === tab.key
                    ? "border-b-2 border-primary-600 text-primary-600"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Nội dung tương ứng theo từng tab */}
          <div className="pt-1">
            {activeTab === "detail" && (
              <TabPreview
                doc={doc}
                fileUrl={fileDownloadUrl}
                onUpdateThumbnail={
                  permissions.canEdit
                    ? (base64) => updateThumbnailMutation.mutate(base64)
                    : undefined
                }
                isUpdatingThumbnail={
                  permissions.canEdit
                    ? updateThumbnailMutation.isPending
                    : false
                }
                onUpdateThumbnailPage={
                  permissions.canEdit
                    ? (page) => updateThumbnailPageMutation.mutate(page)
                    : undefined
                }
                isUpdatingThumbnailPage={
                  permissions.canEdit
                    ? updateThumbnailPageMutation.isPending
                    : false
                }
              />
            )}
            {activeTab === "content" && (
              <TabContent content={doc.content || ""} />
            )}
            {activeTab === "description" && (
              <TabDescription
                description={doc.description ?? "Chưa có mô tả."}
              />
            )}
            {activeTab === "note" && <TabNote />}
            {activeTab === "activity" && <TabActivity />}
          </div>
        </Card>

        {/* ── Cột phải: Thông tin tệp, Nhãn dán & Hành động ── */}
        <div className="flex flex-col gap-4">
          <DocumentInfoCard
            title={doc.title}
            fileTypeLabel={fileTypeLabel}
            sizeLabel={sizeLabel}
            uploadedAt={uploadedAt}
            tags={currentTags}
            canManageTags={permissions.canManageTags}
            allTags={allTags}
            isLoadingTags={isLoadingTags}
            onSaveTags={handleSaveTags}
            isSavingTags={isSavingTags}
            onCreateTag={handleCreateTag}
            isCreatingTag={isCreatingTag}
            onRemoveTag={handleRemoveTag}
            isRemovingTag={isRemovingTag}
          />

          <DocumentActionCard
            fileTitle={doc.title}
            fileDownloadUrl={fileDownloadUrl}
            markdownDownloadUrl={markdownDownloadUrl}
            fileTypeLabel={fileTypeLabel}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
            isRenamePending={renameMutation.isPending}
            isDeletePending={deleteMutation.isPending}
            onStartRename={handleStartRename}
            onDelete={() => deleteMutation.mutate()}
          />
        </div>
      </div>
    </div>
  );
}
export default DocumentDetail;
