// src/pages/personal/PersonalDocuments.tsx

// ==========================================
// 1. IMPORTS
// ==========================================
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Upload,
  ChevronDown,
  FolderPlus,
  FileX,
  FolderOpen,
  Check,
} from "lucide-react"

// UI Components & Icons
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { FolderCard } from "@/components/shared/FolderCard"
import { type FolderAction } from "@/components/shared/FolderContextMenu"
import { DocumentCard } from "@/components/shared/DocumentCard"
import { type DocumentAction } from "@/components/shared/DocumentContextMenu"
import EmptyState from "@/components/shared/EmptyState"
import { getNormalizedExtension, useDocumentFilters, type TabKey } from "@/hooks/useDocumentFilters"

// Modals
import { UploadModal } from "./components/UploadModal"
import {
  CreateFolderModal,
  type FolderInitialData,
} from "./components/CreateFolderModal"

// Services & Utils
import { folderService } from "@/services/folderService"
import { documentService } from "@/services/documentService"
import { tagService } from "@/services/tagService"
import { formatSize } from "@/utils/formatSize"
import { formatRelativeDate } from "@/utils/formatDate"
import { cn } from "@/utils/cn"
import { DynamicFilterDropdown } from "@/components/shared/DynamicFilterDropdown"

// ==========================================
// 2. TYPES & CONSTANTS
// ==========================================

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "document", label: "Tài liệu" },
  { key: "image", label: "Hình ảnh" },
  { key: "pdf", label: "PDF" },
  { key: "other", label: "Khác" },
]

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

const getFileExtension = (
  filePath?: string,
  fileType?: string,
  title?: string
): string => {
  if (filePath && filePath.includes("."))
    return filePath.split(".").pop()?.toLowerCase() || ""
  if (title && title.includes("."))
    return title.split(".").pop()?.toLowerCase() || ""
  return fileType || ""
}

// ==========================================
// 4. SUB-COMPONENTS
// ==========================================
interface FilterDropdownProps {
  label: string
  options: { value: string | number; label: string }[]
  selectedValue: string | number | null
  onChange: (value: string | number | null) => void
}


function CardSkeleton({ variant }: { variant: "folder" | "document" }) {
  if (variant === "folder") {
    return (
      <div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-[1/0.82] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-[60%] bg-gray-200 animate-pulse" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  )
}

// ==========================================
// 5. MAIN COMPONENT
// ==========================================
export function PersonalDocuments() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State điều hướng & tìm kiếm
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  // State quản lý Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderInitialData | null>(null)

  // State xác nhận xóa thư mục
  const [deletingFolderId, setDeletingFolderId] = useState<number | null>(null)
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)

  // State đổi tên tài liệu
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renamingDoc, setRenamingDoc] = useState<{ id: string; title: string } | null>(null)
  const [newDocumentTitle, setNewDocumentTitle] = useState("")

  // --- QUERIES ---
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: () => folderService.getAll(),
  })

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => tagService.getAll(),
  })

  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types"],
    queryFn: () => documentService.getFileTypes(),
  })

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
  })

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
  })

  const renameDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: number | string; title: string }) =>
      documentService.update(Number(id), { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      setIsRenameModalOpen(false)
      setRenamingDoc(null)
    },
    onError: (error) => {
      console.error("Lỗi đổi tên tài liệu:", error)
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; color: string; tagIds: number[] }) =>
      folderService.create({ name: data.name, color: data.color, tag_ids: data.tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    }
  })

  const updateFolderMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; color: string; tagIds: number[]; initialTagIds: number[] }) => {
      await folderService.update(data.id, { name: data.name, color: data.color })
      
      const tagsToAdd = data.tagIds.filter(id => !data.initialTagIds.includes(id))
      const tagsToRemove = data.initialTagIds.filter(id => !data.tagIds.includes(id))
      
      const tagPromises = []
      if (tagsToAdd.length > 0) {
        tagPromises.push(folderService.addTags(data.id, tagsToAdd))
      }
      tagsToRemove.forEach(tagId => {
        tagPromises.push(folderService.removeTag(data.id, tagId))
      })
      
      await Promise.all(tagPromises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    }
  })

  const createTagMutation = useMutation({
    mutationFn: (name: string) => tagService.create({ name, color: "#2F6B3C" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    }
  })

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => documentService.upload(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    }
  })

  // --- ACTION HANDLERS FOR FOLDERS ---
  const handleFolderAction = async (
    action: FolderAction,
    folderId: number
  ) => {
    if (action === "edit") {
      try {
        const folderDetail = await folderService.getById(folderId)

        setEditingFolder({
          id: folderDetail.id,
          name: folderDetail.name,
          color: folderDetail.color || "#4CAF50",
          tagIds:
            folderDetail.tags?.map((t: any) => t.id) ||
            folderDetail.tag_ids ||
            [],
        })

        setIsModalOpen(true)
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết thư mục:", error)
      }

      return
    }

    if (action === "share") {
      console.log("Chia sẻ folder:", folderId)
      return
    }

    if (action === "delete") {
      setDeletingFolderId(folderId)
      setIsDeleteFolderOpen(true)
    }
  }

  const handleConfirmDeleteFolder = async () => {
    if (deletingFolderId === null) {
      return
    }

    try {
      setIsDeletingFolder(true)

      await folderService.delete(deletingFolderId)

      // Refresh danh sách folder
      await queryClient.invalidateQueries({
        queryKey: ["folders"],
      })

      // Nếu folder đang được chọn thì quay về "Tất cả"
      if (selectedFolderId === deletingFolderId) {
        setSelectedFolderId(null)
        setPage(1)
      }

      // Đóng modal
      setIsDeleteFolderOpen(false)
      setDeletingFolderId(null)

      console.log("Đã xóa folder:", deletingFolderId)
    } catch (error) {
      console.error("Lỗi khi xóa thư mục:", error)
    } finally {
      setIsDeletingFolder(false)
    }
  }

  const handleCancelDeleteFolder = () => {
    if (isDeletingFolder) {
      return
    }

    setIsDeleteFolderOpen(false)
    setDeletingFolderId(null)
  }

  // --- ACTION HANDLERS FOR DOCUMENTS ---
  const handleDocumentAction = (action: DocumentAction| string,documentId: string) => {
    if (action === "view") {
      navigate(`/ca-nhan/tai-lieu/${documentId}`)
    } else if (action === "rename") {
      const docToRename = docData?.items.find((d) => d.id.toString() === documentId)
      if (docToRename) {
        setRenamingDoc({ id: docToRename.id.toString(), title: docToRename.title })
        setNewDocumentTitle(docToRename.title)
        setIsRenameModalOpen(true)
      }
    } else if (action === "delete") {
      if (window.confirm("Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.")) {
        deleteMutation.mutate(documentId)
      }
    } else {
      console.log("Action:", action, "on document:", documentId)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingFolder(null)
  }

  // Lấy folder đang xóa để hiển thị thông tin
  const deletingFolder = folders?.find(
    (folder) => folder.id === deletingFolderId
  )

  // --- DATA PROCESSING & FILTERING ---
  const allDocCards = (docData?.items ?? []).map((doc) => ({
    id: doc.id.toString(),
    name: doc.title,
    type: doc.file_type || "unknown",
    updatedAt: formatRelativeDate(doc.created_at),
    size: formatSize(doc.file_size || 0),
    extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
    thumbnail_path: doc.thumbnail_path ?? null,
    owner: { name: "You", avatar: "" },
    rawType: doc.file_type,
    tags: doc.tags || [],
  }))

  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    filteredDocuments: filteredDocCards
  } = useDocumentFilters(allDocCards)


  return (
    <div className="flex flex-col gap-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Tìm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

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

      {/* Tabs Filter */}
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

      {/* Folders Section */}
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
                    : "border-gray-200"
                )}
                onClick={() => {
                  setSelectedFolderId(null)
                  setPage(1)
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
                      : "border-gray-200"
                  )}
                >
                  <FolderCard
                    id={folder.id}
                    name={folder.name}
                    count={folder.document_count}
                    color={folder.color}
                    tags={folder.tags}
                    onClick={() => {
                      setSelectedFolderId(folder.id)
                      setPage(1)
                    }}
                    onAction={handleFolderAction}
                  />
                </div>
              ))}
            </>
          )}

          <button
            onClick={() => {
              setEditingFolder(null)
              setIsModalOpen(true)
            }}
            className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
          >
            <FolderPlus className="h-5 w-5" />+ Thêm thư mục
          </button>
        </div>
      </section>

      {/* Documents Grid Section */}
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

        {/* Pagination */}
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
          availableTags={tags}
          onCreateTag={async (name) => {
            return await createTagMutation.mutateAsync(name)
          }}
          onSubmitData={async (data) => {
            if (data.id) {
              await updateFolderMutation.mutateAsync({
                id: data.id,
                name: data.name,
                color: data.color,
                tagIds: data.tagIds,
                initialTagIds: (editingFolder?.tagIds || []).map(Number)
              })
            } else {
              await createFolderMutation.mutateAsync({
                name: data.name,
                color: data.color,
                tagIds: data.tagIds
              })
            }
          }}
          isSubmitting={createFolderMutation.isPending || updateFolderMutation.isPending}
        />
      )}

      {/* Modal Đổi tên tài liệu */}
      {isRenameModalOpen && renamingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Đổi tên tài liệu
            </h3>

            <input
              type="text"
              value={newDocumentTitle}
              onChange={(e) => setNewDocumentTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDocumentTitle.trim()) {
                  renameDocumentMutation.mutate({
                    id: renamingDoc.id,
                    title: newDocumentTitle.trim(),
                  })
                }
                if (e.key === "Escape") setIsRenameModalOpen(false)
              }}
              autoFocus
              placeholder="Nhập tên mới..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 mb-5"
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsRenameModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={
                  renameDocumentMutation.isPending || !newDocumentTitle.trim()
                }
                onClick={() => {
                  if (newDocumentTitle.trim()) {
                    renameDocumentMutation.mutate({
                      id: renamingDoc.id,
                      title: newDocumentTitle.trim(),
                    })
                  }
                }}
              >
                {renameDocumentMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          availableTags={tags}
          onCreateTag={async (name) => {
            return await createTagMutation.mutateAsync(name)
          }}
          onUpload={async (fd, selectedTagIds) => {
            if (selectedTagIds.length > 0) {
              selectedTagIds.forEach((id) => {
                fd.append("tag_ids", id.toString())
              })
            }
            await uploadMutation.mutateAsync(fd)
          }}
          isUploading={uploadMutation.isPending}
        />
      )}

      {/* Modal Xác nhận xóa thư mục */}
      {isDeleteFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Xóa thư mục?
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Bạn có chắc muốn xóa thư mục này không?
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
                  <span className="font-semibold">Lưu ý:</span> Xóa thư mục
                  sẽ không xóa các tài liệu hoặc nhãn (tag) bên trong. Các tài
                  liệu và tag vẫn được giữ nguyên.
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
  )
}