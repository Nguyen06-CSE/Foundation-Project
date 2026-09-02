import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Share2,
  Star,
  FolderInput,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileIcon } from "@/components/shared/FileIcon";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/utils/cn";
import { useQuery } from "@tanstack/react-query"
import { documentService } from "@/services/documentService"
import { formatSize } from "@/utils/formatSize"
import { formatRelativeDate } from "@/utils/formatDate"

// ── Types ────────────────────────────────────────────────────────────────────

type TabKey = "detail" | "description" | "note" | "activity";

const TABS: { key: TabKey; label: string }[] = [
  { key: "detail", label: "Chi tiết" },
  { key: "description", label: "Mô tả" },
  { key: "note", label: "Ghi chú" },
  { key: "activity", label: "Hoạt động" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
}
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}
function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}

// ── Tab content ────────────────────────────────────────────────────────────────

// Đã cập nhật tham số nhận vào là toàn bộ object doc
function TabDetail({ doc }: { doc: any }) {
  const thumbnailUrl = doc.thumbnail_path
    ? `${import.meta.env.VITE_API_URL}/${doc.thumbnail_path}`
    : null;

  return (
    <div className="space-y-6">
      {/* Preview Thumbnail */}
      <div className="flex justify-center rounded-xl bg-gray-100 py-8">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={doc.title}
            className="max-h-72 rounded-lg shadow-lg object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-60 w-44 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-gray-400 to-gray-500 px-6 text-white shadow-lg">
            <p className="text-center text-base font-bold">{doc.title}</p>
          </div>
        )}
      </div>

      {/* Preview nội dung text từ DB */}
      {doc.content && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Xem nhanh nội dung
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-6 whitespace-pre-line">
            {doc.content.slice(0, 500)}
            {doc.content.length > 500 && "..."}
          </p>
        </div>
      )}
    </div>
  );
}

function TabDescription({ description }: { description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Mô tả chi tiết</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function TabNote() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Ghi chú cá nhân</h3>
      <textarea
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        rows={6}
        placeholder="Nhập ghi chú của bạn về tài liệu này..."
      />
    </div>
  );
}

function TabActivity() {
  const activities = [
    { action: "Tải lên", time: "10 phút trước", user: "Tôi" },
    { action: "Xem", time: "2 giờ trước", user: "Nguyễn Văn A" },
    { action: "Tải xuống", time: "Hôm qua", user: "Trần Thị B" },
  ];
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Lịch sử hoạt động</h3>
      {activities.map((a, i) => (
        <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
          <div>
            <span className="font-medium text-gray-800">{a.user}</span>
            <span className="text-gray-500"> đã {a.action.toLowerCase()} tài liệu</span>
          </div>
          <span className="text-xs text-gray-400">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("detail")
  const [tags, setTags] = useState<string[]>([])

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ["document", id],
    queryFn: () => documentService.getById(Number(id)),
    enabled: !!id,
  })

  // Sync tags từ API khi data load xong (nếu sau này có field tags)
  // Hiện tại để tags rỗng, có thể mở rộng sau

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    )
  }

  // ── Error / not found ──
  if (isError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500">Không tìm thấy tài liệu.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    )
  }

  // ── Map MIME type → label hiển thị ──
  const FILE_TYPE_LABELS: Record<string, string> = {
    "application/pdf": "PDF Document",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-powerpoint": "PowerPoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
    "image/jpeg": "Hình ảnh JPEG",
    "image/png": "Hình ảnh PNG",
    "text/plain": "Văn bản thuần",
  }

  // Map MIME → type string dùng cho FileIcon
  const MIME_TO_ICON_TYPE: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "image",
    "image/png": "image",
  }

  const fileTypeLabel = FILE_TYPE_LABELS[doc.file_type ?? ""] ?? doc.file_type ?? "Không xác định"
  const iconType = MIME_TO_ICON_TYPE[doc.file_type ?? ""] ?? "default"
  const sizeLabel = formatSize(doc.file_size ?? 0)
  const uploadedAt = formatRelativeDate(doc.created_at)
  const fileDownloadUrl = doc.file_path
    ? `${import.meta.env.VITE_API_URL}/${doc.file_path}`
    : "#"

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column ── */}
        <Card className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <FileIcon type={iconType} className="h-12 w-12 shrink-0" iconClassName="h-6 w-6" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-snug">{doc.title}</h1>
              <p className="text-sm text-gray-400 mt-1">
                Dung lượng: {sizeLabel} &nbsp;•&nbsp; Ngày tải: {uploadedAt}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 -mx-5 px-5 gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors focus:outline-none",
                  activeTab === tab.key
                    ? "border-b-2 border-primary-600 text-primary-600"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pt-1">
            {activeTab === "detail" && <TabDetail doc={doc} />}
            {activeTab === "description" && (
              <TabDescription description={doc.description ?? "Chưa có mô tả."} />
            )}
            {activeTab === "note" && <TabNote />}
            {activeTab === "activity" && <TabActivity />}
          </div>
        </Card>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Thông tin tệp</h2>
            <div>
              <InfoRow
                label="Tên tệp"
                value={doc.title.length > 22 ? doc.title.slice(0, 22) + "…" : doc.title}
              />
              <InfoRow label="Loại tệp" value={fileTypeLabel} />
              <InfoRow label="Dung lượng" value={sizeLabel} />
              <InfoRow label="Ngày tải lên" value={uploadedAt} />
            </div>

            {/* Tags — hiện tại để trống, mở rộng sau */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Nhãn dán</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <Tag key={tag} label={tag} onRemove={() => removeTag(tag)} />
                ))}
                <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-primary-500 hover:text-primary-600 transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stats — placeholder, mở rộng sau khi có API */}
            <div className="mt-5 flex justify-around border-t border-gray-100 pt-4">
              <StatItem label="Lượt xem" value={0} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Tải xuống" value={0} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Đã chia sẻ" value={0} />
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <a href={fileDownloadUrl} download={doc.title} target="_blank" rel="noreferrer" className="w-full block">
              <Button variant="primary" className="w-full py-3 h-auto text-base" icon={<Download className="h-5 w-5" />}>
                Tải xuống tài liệu
              </Button>
            </a>

            <div className="flex flex-col mt-1">
              {[
                { icon: Share2, label: "Chia sẻ tài liệu" },
                { icon: Star, label: "Thêm vào yêu thích" },
                { icon: FolderInput, label: "Di chuyển tệp" },
                { icon: Edit2, label: "Đổi tên tệp" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => console.log(label)}
                >
                  <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                  {label}
                </button>
              ))}
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                  onClick={() => console.log("Delete")}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Xóa tài liệu
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}