import { useState, useRef } from "react"
import { X, Upload, FileText, AlertCircle } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { documentService } from "@/services/documentService"

interface UploadModalProps {
  onClose: () => void
}

const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/webp",
  "text/plain",
]
const MAX_MB = 50

export function UploadModal({ onClose }: UploadModalProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

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
    setTitle(f.name.replace(/\.[^/.]+$/, "")) // bỏ extension
  }

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append("file", file!)
      fd.append("title", title.trim() || file!.name)
      if (description.trim()) fd.append("description", description.trim())
      return documentService.upload(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      onClose()
    },
    onError: (err: any) => {
      setError(
        err?.response?.status === 409
          ? "Tài liệu này đã tồn tại trong thư viện của bạn"
          : "Tải lên thất bại, vui lòng thử lại"
      )
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Tải tài liệu lên</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPTED_MIME.join(",")}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-primary-600" />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  Kéo thả hoặc <span className="text-primary-600">chọn file</span>
                </p>
                <p className="text-xs text-gray-400">PDF, DOCX, PPTX, JPG, PNG — tối đa {MAX_MB}MB</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên tài liệu..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mô tả <span className="font-normal text-gray-400">(tuỳ chọn)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Huỷ</Button>
            <Button
              variant="primary"
              disabled={!file || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Đang tải lên..." : "Tải lên"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}