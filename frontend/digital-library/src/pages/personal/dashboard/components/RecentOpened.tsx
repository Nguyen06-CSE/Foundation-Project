import { useState } from "react";
import { Link } from "react-router-dom";
import { Box, FileText, Package, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/utils/formatDate";
import { formatSize } from "@/utils/formatSize";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";
import type { Document } from "@/types/document";
import type { RecentViewedDocument } from "@/types/dashboard";

type ShelfTab = "recent" | "trending" | "shared" | "favorites";

interface ShelfDocument {
  id: number;
  title: string;
  file_type?: string | null;
  is_bundle?: boolean;
  children_count?: number;
  bundle_children_count?: number | null;
  thumbnail_path?: string | null;
  last_viewed_at?: string | null;
  updated_at?: string;
  file_size?: number;
  tags?: { id: number; name: string }[];
}

export interface RecentOpenedProps {
  documents: RecentViewedDocument[];
  trendingDocuments: Document[];
  sharedCount: number;
  favoriteCount: number;
  isTrendingLoading?: boolean;
}

function fileLabel(fileType?: string | null) {
  const type = (fileType ?? "").toLowerCase();
  if (type.includes("pdf")) return "PDF";
  if (type.includes("wordprocessing") || type.includes("msword") || type.includes("document")) return "DOCX";
  if (type.includes("presentation") || type.includes("powerpoint")) return "PPTX";
  if (type.includes("spreadsheet") || type.includes("excel")) return "XLSX";
  if (type.includes("image")) return "ẢNH";
  const ext = type.split(/[/.]/).filter(Boolean).at(-1);
  return ext && ext.length <= 6 ? ext.toUpperCase() : "TỆP";
}

export function RecentOpened({ documents, trendingDocuments, sharedCount, favoriteCount, isTrendingLoading }: RecentOpenedProps) {
  const [activeTab, setActiveTab] = useState<ShelfTab>("recent");
  const recentItems: ShelfDocument[] = documents.map((doc) => {
    const details = trendingDocuments.find((item) => item.id === doc.id);
    return { ...details, ...doc, file_size: details?.file_size, tags: details?.tags ?? [], thumbnail_path: doc.thumbnail_path || details?.thumbnail_path };
  });
  const trending: ShelfDocument[] = trendingDocuments.slice(0, 5);
  const tabs: { id: ShelfTab; label: string; count: number }[] = [
    { id: "recent", label: "Mở gần đây", count: documents.length },
    { id: "trending", label: "Đang thịnh hành", count: trendingDocuments.length },
    { id: "shared", label: "Được chia sẻ với tôi", count: sharedCount },
    { id: "favorites", label: "Yêu thích", count: favoriteCount },
  ];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
              {tab.label}<span className={activeTab === tab.id ? "text-gray-300" : "text-gray-400"}>{tab.count}</span>
            </button>
          ))}
        </div>
        <Link to={activeTab === "favorites" ? "/personal/favorites" : activeTab === "shared" ? "/personal/shared" : "/personal/documents"} className="text-xs font-medium text-primary-700 hover:underline">
          Xem tất cả tài liệu
        </Link>
      </div>

      {activeTab === "recent" || activeTab === "trending" ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(activeTab === "recent" ? recentItems : trending).map((doc) => {
            const isBundle = doc.is_bundle ?? false;
            const fileType = doc.file_type;
            const thumb = getThumbnailUrl(doc.thumbnail_path);
            const href = isBundle ? `/personal/bundle/${doc.id}` : `/personal/documents/${doc.id}`;
            const size = doc.file_size;
            const tags = doc.tags ?? [];
            const openedAt = doc.last_viewed_at || doc.updated_at;
            const childrenCount = doc.children_count ?? doc.bundle_children_count;

            return (
              <Link key={`${activeTab}-${doc.id}`} to={href} className="group overflow-hidden rounded-lg border border-gray-200 transition-colors hover:border-primary-500">
                <div className="relative flex h-24 items-center justify-center bg-gray-50 sm:h-28">
                  <Badge variant={isBundle ? "primary" : "default"} className="absolute left-2 top-2 text-[10px] uppercase">{isBundle ? "BUNDLE" : fileLabel(fileType)}</Badge>
                  {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : isBundle ? <Package className="h-8 w-8 text-primary-600" /> : <FileText className="h-7 w-7 text-gray-500" />}
                  {activeTab === "trending" && <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"><Sparkles className="mr-1 inline h-3 w-3" />Xu hướng</span>}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary-700">{doc.title}</p>
                  {isBundle && <p className="mt-0.5 text-[11px] font-medium text-purple-700">{childrenCount ?? 0} tài liệu bên trong</p>}
                  <p className="mt-0.5 text-xs text-gray-500">{size !== undefined ? `${formatSize(size)} · ` : ""}{openedAt ? `Mở ${formatRelativeDate(openedAt)}` : ""}</p>
                  <div className="mt-2 flex min-h-5 flex-wrap gap-1 border-t border-gray-100 pt-2">
                    {tags.slice(0, 2).map((tag) => <span key={tag.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{tag.name}</span>)}
                    {tags.length === 0 && <span className="text-[10px] italic text-gray-400">Chưa có tag</span>}
                    {tags.length > 2 && <span className="text-[10px] text-gray-500">+{tags.length - 2}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
          {activeTab === "recent" && documents.length === 0 && <div className="col-span-full py-10 text-center text-sm text-gray-500">Chưa có tài liệu nào mở gần đây.</div>}
          {activeTab === "trending" && !isTrendingLoading && trending.length === 0 && <div className="col-span-full py-10 text-center text-sm text-gray-500">Chưa có tài liệu thịnh hành.</div>}
          {activeTab === "trending" && isTrendingLoading && <div className="col-span-full py-10 text-center text-sm text-gray-500">Đang tải tài liệu…</div>}
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center">
          <Box className="h-6 w-6 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Mở danh sách {activeTab === "shared" ? "được chia sẻ với bạn" : "yêu thích"} để xem tài liệu</p>
          <Link className="text-xs font-medium text-primary-700 hover:underline" to={activeTab === "shared" ? "/personal/shared" : "/personal/favorites"}>Đi tới danh sách</Link>
        </div>
      )}
    </Card>
  );
}
