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
import { documents } from "@/mocks/documents";

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

function TabDetail({ description }: { description: string }) {
  return (
    <div className="space-y-6">
      {/* Book cover preview */}
      <div className="flex justify-center rounded-xl bg-gray-100 py-8">
        <div className="flex h-60 w-44 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-red-600 to-red-700 px-6 text-white shadow-lg">
          <p className="mb-3 text-xs font-medium tracking-widest uppercase opacity-80">ĐẠI HỌC QUỐC GIA</p>
          <p className="text-center text-base font-extrabold leading-tight uppercase tracking-wide">
            CẤU TRÚC DỮ LIỆU &amp; GIẢI THUẬT
          </p>
          <p className="mt-4 text-xs opacity-60">Tài liệu lưu hành nội bộ</p>
        </div>
      </div>
      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Mô tả tài liệu</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("detail");
  const [tags, setTags] = useState(["giáo trình", "CTDLGT", "Đại Học"]);

  // Find document by id, fallback to first
  const rawDoc = documents.find((d) => d.id === id) ?? documents[0];

  // Enrich with static detail fields
  const doc = {
    ...rawDoc,
    description:
      "Giáo trình cung cấp các kiến thức cơ bản về các cấu trúc dữ liệu cơ bản như Danh sách liên kết, Ngăn xếp, Hàng đợi, Cây nhị phân và các giải thuật tìm kiếm, sắp xếp kinh điển.",
    pageCount: 326,
    folder: "Giáo trình / Năm 2",
    language: "Tiếng Việt",
    fileTypeLabel:
      rawDoc.fileType === "pdf"
        ? "PDF Document"
        : rawDoc.fileType === "docx" || rawDoc.fileType === "doc"
        ? "Word Document"
        : rawDoc.fileType === "pptx" || rawDoc.fileType === "ppt"
        ? "PowerPoint"
        : rawDoc.fileType === "zip"
        ? "ZIP Archive"
        : "Code File",
    viewCount: 25,
    downloadCount: 12,
    shareCount: 5,
    uploadedAt: "Hôm qua, 10:30",
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column ────────────────────────────────────────────── */}
        <Card className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <FileIcon type={rawDoc.fileType} className="h-12 w-12 shrink-0" iconClassName="h-6 w-6" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-snug">{rawDoc.title}</h1>
              <p className="text-sm text-gray-400 mt-1">
                Dung lượng: {rawDoc.sizeLabel} &nbsp;•&nbsp; Ngày tải: {doc.uploadedAt}
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
            {activeTab === "detail" && <TabDetail description={doc.description} />}
            {activeTab === "description" && <TabDescription description={doc.description} />}
            {activeTab === "note" && <TabNote />}
            {activeTab === "activity" && <TabActivity />}
          </div>
        </Card>

        {/* ── Right column ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* File info card */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Thông tin tệp</h2>
            <div>
              <InfoRow label="Tên tệp" value={rawDoc.title.length > 22 ? rawDoc.title.slice(0, 22) + "…" : rawDoc.title} />
              <InfoRow label="Loại tệp" value={doc.fileTypeLabel} />
              <InfoRow label="Số trang" value={`${doc.pageCount} trang`} />
              <InfoRow label="Thư mục" value={doc.folder} />
              <InfoRow label="Ngôn ngữ" value={doc.language} />
            </div>

            {/* Tags */}
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

            {/* Stats */}
            <div className="mt-5 flex justify-around border-t border-gray-100 pt-4">
              <StatItem label="Lượt xem" value={doc.viewCount} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Tải xuống" value={doc.downloadCount} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Đã chia sẻ" value={doc.shareCount} />
            </div>
          </Card>

          {/* Actions card */}
          <Card className="flex flex-col gap-3">
            <Button
              variant="primary"
              className="w-full py-3 h-auto text-base"
              icon={<Download className="h-5 w-5" />}
              onClick={() => console.log("Download")}
            >
              Tải xuống tài liệu
            </Button>

            <div className="flex flex-col mt-1">
              {[
                { icon: Share2, label: "Chia sẻ tài liệu", danger: false },
                { icon: Star, label: "Thêm vào yêu thích", danger: false },
                { icon: FolderInput, label: "Di chuyển tệp", danger: false },
                { icon: Edit2, label: "Đổi tên tệp", danger: false },
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
  );
}
