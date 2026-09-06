// frontend/digital-library/src/components/shared/UploadModal.tsx

import { useState, useRef } from "react"
import { X, Upload, FileText, AlertCircle, Search, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/utils/cn"

export interface TagItem {
  id: number
  name: string
  color?: string
}

export interface UploadModalProps {
  onClose: () => void
  availableTags?: TagItem[]
  onCreateTag?: (name: string) => Promise<TagItem>
  onUpload: (formData: FormData, selectedTagIds: number[]) => Promise<void>
  isUploading: boolean
}

const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]
const MAX_MB = 50

export function UploadModal({
  onClose,
  availableTags = [],
  onCreateTag,
  onUpload,
  isUploading,
}: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Safe Fallback cho Tags để chống lỗi TypeError undefined
  const safeTags = availableTags ?? []

  // States cho Tags
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [tagSearchQuery, setTagSearchQuery] = useState("")
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  const handleFile = (f: File) => {
    setError(null)
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError("Định dạng không hỗ trợ. Chấp nhận: PDF, DOCX, PPTX, JPG, PNG")
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File quá lớn, tối đa ${MAX_MB}MB`)
      return
    }
    setFile(f)
    setTitle(f.name.replace(/\.[^/.]+$/, "")) // Bỏ extension
  }

  const handleUploadSubmit = async () => {
    try {
      setError(null)
      const fd = new FormData()
      fd.append("file", file!)
      fd.append("title", title.trim() || file!.name)

      if (description.trim()) {
        fd.append("description", description.trim())
      }

      await onUpload(fd, selectedTagIds)
      onClose()
    } catch (err: any) {
      setError(
        err?.response?.status === 409
          ? "Tài liệu này đã tồn tại trong thư viện của bạn"
          : "Tải lên thất bại, vui lòng thử lại"
      )
    }
  }

  // Tag Helpers
  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const filteredTags = safeTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )

  const isExactMatch = safeTags.some(
    (tag) => tag.name.toLowerCase() === tagSearchQuery.toLowerCase().trim()
  )

  const handleCreateNewTag = async () => {
    const name = tagSearchQuery.trim()
    if (!name || !onCreateTag) return
    setIsCreatingTag(true)
    try {
      const newTag = await onCreateTag(name)
      setSelectedTagIds((prev) => [...prev, newTag.id])
      setTagSearchQuery("")
    } finally {
      setIsCreatingTag(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Tải tài liệu lên</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto custom-scrollbar">
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            onDragOver={(e) => e.preventDefault()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPTED_MIME.join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-primary-600" />
                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  Kéo thả hoặc <span className="text-primary-600">chọn file</span>
                </p>
                <p className="text-xs text-gray-400">
                  PDF, DOCX, PPTX, JPG, PNG — tối đa {MAX_MB}MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tiêu đề
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên tài liệu..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Tags Section */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Gắn nhãn dán (Tags)</span>
              <span className="text-xs font-normal text-gray-400">
                Đã chọn {selectedTagIds.length}
              </span>
            </label>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Tìm hoặc tạo tag mới..."
                  className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="max-h-32 overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar">
                {tagSearchQuery.trim() !== "" && !isExactMatch && onCreateTag && (
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    disabled={isCreatingTag}
                    className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreatingTag
                      ? "Đang tạo..."
                      : `Tạo mới "${tagSearchQuery.trim()}"`}
                  </button>
                )}

                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                          isSelected
                            ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                        )}
                      >
                        {tag.name}
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    )
                  })
                ) : isExactMatch || tagSearchQuery.trim() === "" ? null : (
                  <div className="w-full text-center text-xs text-gray-500 py-2">
                    Không tìm thấy tag phù hợp.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mô tả <span className="font-normal text-gray-400">(tuỳ chọn)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn..."
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 shrink-0 border-t border-gray-100 mt-2">
            <Button variant="outline" onClick={onClose} className="mt-2">
              Huỷ
            </Button>
            <Button
              variant="primary"
              disabled={!file || isUploading || isCreatingTag}
              onClick={handleUploadSubmit}
              className="mt-2"
            >
              {isUploading ? "Đang tải lên..." : "Tải lên"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}