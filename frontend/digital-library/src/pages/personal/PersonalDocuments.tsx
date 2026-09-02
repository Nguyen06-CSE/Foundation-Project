// src/pages/personal/PersonalDocuments.tsx

import { useState, useRef, useEffect } from "react";

import {
  Search,
  Upload,
  ChevronDown,
  FolderPlus,
  FileX,
  FolderOpen,
  Check,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FolderCard } from "@/components/shared/FolderCard";
import { type FolderAction } from "@/components/shared/FolderContextMenu";
import { DocumentCard } from "@/components/shared/DocumentCard";
import EmptyState from "@/components/shared/EmptyState";
import { type DocumentAction } from "@/components/shared/DocumentContextMenu";
import { folderService } from "@/services/folderService";
import { documentService } from "@/services/documentService";
import { tagService } from "@/services/tagService";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { UploadModal } from "./components/UploadModal";

import {
  CreateFolderModal,
  type FolderInitialData,
} from "./components/CreateFolderModal";

type TabKey = "all" | "document" | "image" | "pdf" | "other";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "document", label: "Tài liệu" },
  { key: "image", label: "Hình ảnh" },
  { key: "pdf", label: "PDF" },
  { key: "other", label: "Khác" },
];

// ==========================================
// 1. COMPONENT DROPDOWN ĐỘNG (ĐẶT Ở NGOÀI)
// ==========================================
interface FilterDropdownProps {
  label: string;
  options: { value: string | number; label: string }[];
  selectedValue: string | number | null;
  onChange: (value: string | number | null) => void;
}

function DynamicFilterDropdown({
  label,
  options,
  selectedValue,
  onChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === selectedValue);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
          selectedValue !== null
            ? "border-primary-500 bg-primary-50 text-primary-700"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
        )}
      >
        {selectedOption ? `${label}: ${selectedOption.label}` : label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            isOpen && "rotate-180",
            selectedValue !== null ? "text-primary-600" : "text-gray-400",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-48 overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg custom-scrollbar animate-in fade-in zoom-in-95">
          <button
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span>Tất cả {label}</span>
            {selectedValue === null && (
              <Check className="h-4 w-4 text-primary-600" />
            )}
          </button>

          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 italic">Trống</div>
          )}

          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(selectedValue === opt.value ? null : opt.value);
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="truncate pr-2">{opt.label}</span>
              {selectedValue === opt.value && (
                <Check className="h-4 w-4 shrink-0 text-primary-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// CÁC HÀM HỖ TRỢ CHUẨN HÓA ĐỊNH DẠNG FILE
// ==========================================
const getNormalizedExtension = (type?: string | null) => {
  if (!type) return "";
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };
  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

const getFileExtension = (
  filePath?: string,
  fileType?: string,
  title?: string,
): string => {
  if (filePath && filePath.includes("."))
    return filePath.split(".").pop()?.toLowerCase() || "";
  if (title && title.includes("."))
    return title.split(".").pop()?.toLowerCase() || "";
  return fileType || "";
};

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export function PersonalDocuments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // States quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderInitialData | null>(
    null,
  );

  // States bộ lọc động
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);

  // Fetch Folders
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: folderService.getAll,
  });

  // Fetch Tags cho bộ lọc
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: tagService.getAll,
  });

  // Fetch File Types cho bộ lọc
  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types"],
    queryFn: documentService.getFileTypes,
  });

  // Fetch Documents
  const {
    data: docData,
    isLoading: docsLoading,
    isFetching,
  } = useQuery({
    queryKey: ["documents", selectedFolderId, page],
    queryFn: () =>
      documentService.getAll({
        folder_id: selectedFolderId ?? undefined,
        page,
        page_size: 20,
      }),
    placeholderData: (prev) => prev,
  });

  const handleFolderAction = async (action: FolderAction, folderId: number) => {
    if (action === "edit") {
      try {
        const folderDetail = await folderService.getById(folderId);
        setEditingFolder({
          id: folderDetail.id,
          name: folderDetail.name,
          color: folderDetail.color || "#4CAF50",
          tagIds:
            folderDetail.tags?.map((t: any) => t.id) ||
            folderDetail.tag_ids ||
            [],
        });
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

  // Map dữ liệu tài liệu
// src/pages/personal/PersonalDocuments.tsx

// Map dữ liệu tài liệu
const allDocCards = (docData?.items ?? []).map((doc) => ({
  id: doc.id.toString(),
  name: doc.title,
  type: doc.file_type || "unknown",
  updatedAt: formatRelativeDate(doc.created_at),
  size: formatSize(doc.file_size || 0),
  extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
  thumbnail_path: doc.thumbnail_path ?? null, // Đảm bảo không bị thiếu property trong TS
  owner: { name: "You", avatar: "" },
  rawType: doc.file_type,
  tags: doc.tags || [], // Sửa rawTags -> tags để DocumentCard nhận đúng
}));

// Thuật toán lọc kết hợp
const filteredDocCards = allDocCards.filter((doc) => {
  if (
    searchQuery &&
    !doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    return false;
  }
  if (selectedTagId !== null) {
    // Sửa doc.rawTags thành doc.tags
    const hasTag = doc.tags.some((t: any) => t.id === selectedTagId);
    if (!hasTag) return false;
  }
  if (selectedFileType !== null) {
    if (doc.rawType !== selectedFileType) return false;
  }
  if (activeTab !== "all") {
    const ext = getNormalizedExtension(doc.extension || doc.type);
    const isDoc = [
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
    ].includes(ext);
    const isImg = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
    const isPdf = ext === "pdf";

    if (activeTab === "document" && !isDoc) return false;
    if (activeTab === "image" && !isImg) return false;
    if (activeTab === "pdf" && !isPdf) return false;
    if (activeTab === "other" && (isDoc || isImg || isPdf)) return false;
  }
  return true;
});

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Tìm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* Dropdowns lọc động */}
        <div className="flex flex-wrap items-center gap-2">
          <DynamicFilterDropdown
            label="Nhãn dán"
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
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

        <div className="ml-auto">
          <Button
            variant="primary"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => setIsUploadOpen(true)}
          >
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
                : "border-b-2 border-transparent text-gray-600 hover:text-gray-900",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Folders section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Thư mục cá nhân
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {foldersLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <CardSkeleton key={index} variant="folder" />
            ))
          ) : (
            <>
              <div
                className={cn(
                  "cursor-pointer rounded-xl border p-4 hover:border-primary-300 transition-colors bg-white",
                  selectedFolderId === null
                    ? "border-primary-500 shadow-sm"
                    : "border-gray-200",
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
                    <h3 className="text-sm font-semibold text-gray-900">
                      Tất cả
                    </h3>
                  </div>
                </div>
              </div>

              {folders?.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "rounded-xl border transition-colors bg-white",
                    selectedFolderId === folder.id
                      ? "border-primary-500 shadow-sm"
                      : "border-gray-200",
                  )}
                >
                  <FolderCard
  id={folder.id}
  name={folder.name}
  count={folder.document_count}
  color={folder.color}
  tags={folder.tags}
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

          <button
            onClick={() => {
              setEditingFolder(null);
              setIsModalOpen(true);
            }}
            className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
          >
            <FolderPlus className="h-5 w-5" />+ Thêm thư mục
          </button>
        </div>
      </section>

      {/* All Documents section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tải liệu</h2>
        <div
          className={cn(
            "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
            isFetching && "opacity-60 pointer-events-none",
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
              <EmptyState
                icon={<FileX className="h-6 w-6" />}
                title="Không tìm thấy tài liệu"
                description="Không có tài liệu nào phù hợp với bộ lọc hiện tại."
                actionLabel="Tải lên ngay"
                onAction={() => setIsUploadOpen(true)}
              />
            </div>
          )}
        </div>

        {docData && docData.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-600">
            <span>
              Trang {page} / {docData.total_pages} • Tổng {docData.total} tài
              liệu
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

      {/* Modals */}
      {isModalOpen && (
        <CreateFolderModal
          onClose={handleCloseModal}
          initialData={editingFolder}
        />
      )}

      {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} />}
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
