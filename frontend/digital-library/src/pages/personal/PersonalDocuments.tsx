// src/pages/personal/PersonalDocuments.tsx

import { useState } from "react";
import { Search, Upload, ChevronDown, FolderPlus, FileX, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FolderCard } from "@/components/shared/FolderCard";
import {  type FolderAction } from "@/components/shared/FolderContextMenu";
import { DocumentCard } from "@/components/shared/DocumentCard";
import EmptyState from "@/components/shared/EmptyState";
import { type DocumentAction } from "@/components/shared/DocumentContextMenu";
import { folderService } from "@/services/folderService";
import { documentService } from "@/services/documentService";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { CreateFolderModal, type FolderInitialData } from "./components/CreateFolderModal";

type TabKey = "all" | "document" | "image" | "pdf" | "other";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "document", label: "Tài liệu" },
  { key: "image", label: "Hình ảnh" },
  { key: "pdf", label: "PDF" },
  { key: "other", label: "Khác" },
];

function FilterDropdown({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
      {label}
      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
    </button>
  );
}

const getNormalizedExtension = (type?: string | null) => {
  if (!type) return "";
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);

  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };

  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

const getFileExtension = (filePath?: string, fileType?: string, title?: string): string => {
  if (filePath && filePath.includes(".")) return filePath.split(".").pop()?.toLowerCase() || "";
  if (title && title.includes(".")) return title.split(".").pop()?.toLowerCase() || "";
  return fileType || "";
};

export function PersonalDocuments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  
  // State quản lý Modal và Data chỉnh sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderInitialData | null>(null);

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: folderService.getAll,
  });

  const { data: docData, isLoading: docsLoading, isFetching } = useQuery({
    queryKey: ["documents", selectedFolderId, page],
    queryFn: () =>
      documentService.getAll({
        folder_id: selectedFolderId ?? undefined,
        page,
        page_size: 20,
      }),
    placeholderData: (prev) => prev,
  });

  // Xử lý action từ menu 3 chấm của Folder
  const handleFolderAction = async (action: FolderAction, folderId: number) => {
    if (action === "edit") {
      try {
        // 1. Lấy chi tiết folder thật từ Backend
        const folderDetail = await folderService.getById(folderId);
        
        // 2. Map dữ liệu nhận được vào state editingFolder
        setEditingFolder({
          id: folderDetail.id,
          name: folderDetail.name,
          color: folderDetail.color || "#4CAF50",
          tagIds: folderDetail.tags?.map((t: any) => t.id) || folderDetail.tag_ids || [],
        });
        
        // 3. Mở Modal ở chế độ Chỉnh sửa
        setIsModalOpen(true);
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết thư mục:", error);
      }
    } else if (action === "share") {
      console.log("Chia sẻ folder:", folderId);
    } else if (action === "delete") {
      console.log("Xóa folder:", folderId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFolder(null);
  };

  const handleDocumentAction = (action: DocumentAction, documentId: string) => {
    if (action === "view") {
      navigate(`/ca-nhan/tai-lieu/${documentId}`);
    } else {
      console.log("Action:", action, "on document:", documentId);
    }
  };

  const allDocCards = (docData?.items ?? []).map((doc) => ({
    id: doc.id.toString(),
    name: doc.title,
    type: doc.file_type || "unknown",
    updatedAt: formatRelativeDate(doc.created_at),
    size: formatSize(doc.file_size || 0),
    extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
    owner: { name: "You", avatar: "" },
  }));

  const filteredDocCards = allDocCards.filter((doc) => {
    if (activeTab === "all") return true;
    const ext = getNormalizedExtension(doc.extension || doc.type);
    const isDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext);
    const isImg = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
    const isPdf = ext === "pdf";

    if (activeTab === "document") return isDoc;
    if (activeTab === "image") return isImg;
    if (activeTab === "pdf") return isPdf;
    if (activeTab === "other") return !isDoc && !isImg && !isPdf;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Tìm nhanh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown label="nhãn dán" />
          <FilterDropdown label="người gửi" />
          <FilterDropdown label="loại tài liệu" />
        </div>
        <div className="ml-auto">
          <Button variant="primary" icon={<Upload className="h-4 w-4" />}>
            + Tải lên
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "pb-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
              activeTab === tab.key
                ? "border-b-2 border-primary-600 text-primary-600 font-semibold"
                : "border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Folders section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Thư mục cá nhân</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {foldersLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <CardSkeleton key={index} variant="folder" />
            ))
          ) : (
            <>
              {/* Folder Tất cả */}
              <div
                className={cn(
                  "cursor-pointer rounded-xl border p-4 hover:border-primary-300 transition-colors bg-white",
                  selectedFolderId === null ? "border-primary-500 shadow-sm" : "border-gray-200"
                )}
                onClick={() => {
                  setSelectedFolderId(null);
                  setPage(1);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Tất cả</h3>
                  </div>
                </div>
              </div>

              {/* Danh sách Folder từ DB */}
              {folders?.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "rounded-xl border transition-colors bg-white",
                    selectedFolderId === folder.id
                      ? "border-primary-500 shadow-sm"
                      : "border-gray-200"
                  )}
                >
                  <FolderCard
                    id={folder.id}
                    name={folder.name}
                    count={folder.document_count}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setPage(1);
                    }}
                    onAction={handleFolderAction}
                  />
                </div>
              ))}
            </>
          )}

          {/* Add folder button */}
          <button
            onClick={() => {
              setEditingFolder(null); // Reset mode Tạo Mới
              setIsModalOpen(true);
            }}
            className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
          >
            <FolderPlus className="h-5 w-5" />
            + Thêm thư mục
          </button>
        </div>
      </section>

      {/* All Documents section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tài liệu</h2>
        <div
          className={cn(
            "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
            isFetching && "opacity-60 pointer-events-none"
          )}
        >
          {docsLoading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <CardSkeleton key={index} variant="document" />
            ))
          ) : filteredDocCards.length > 0 ? (
            filteredDocCards.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onAction={handleDocumentAction}
              />
            ))
          ) : (
            <div className="col-span-full">
              {selectedFolderId !== null ? (
                <EmptyState
                  icon={<FolderOpen className="h-6 w-6" />}
                  title="Thư mục này chưa có tài liệu"
                  description="Tải tài liệu lên hoặc thêm tag phù hợp vào thư mục này"
                  actionLabel="Tải lên ngay"
                  onAction={() => console.log("Upload")}
                />
              ) : (
                <EmptyState
                  icon={<FileX className="h-6 w-6" />}
                  title={
                    activeTab !== "all"
                      ? "Không có tài liệu loại này"
                      : "Bạn chưa có tài liệu nào"
                  }
                  description={
                    activeTab !== "all"
                      ? "Vui lòng chọn loại tài liệu khác hoặc tải lên."
                      : "Tải lên tài liệu đầu tiên của bạn ngay."
                  }
                  actionLabel="Tải lên ngay"
                  onAction={() => console.log("Upload first document")}
                />
              )}
            </div>
          )}
        </div>

        {docData && docData.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-600">
            <span>
              Trang {page} / {docData.total_pages} • Tổng {docData.total} tài liệu
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === docData.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Tiếp →
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Render Modal */}
      {isModalOpen && (
        <CreateFolderModal
          onClose={handleCloseModal}
          initialData={editingFolder}
        />
      )}
    </div>
  );
}

interface CardSkeletonProps {
  variant: "folder" | "document";
}

function CardSkeleton({ variant }: CardSkeletonProps) {
  if (variant === "folder") {
    return (
      <div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-[1/0.82] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-[60%] bg-gray-200 animate-pulse" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}