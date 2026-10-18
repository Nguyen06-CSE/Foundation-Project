// frontend/digital-library/src/pages/personal/FavoritesPage.tsx

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  Search,
  LayoutGrid,
  List as ListIcon,
  Download,
  ExternalLink,
  Trash2,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { useFavoriteStore } from "@/stores/favoriteStore";
import { TikTokFavoriteButton } from "@/components/shared/documents/TikTokFavoriteButton";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";

type TabFilter = "all" | "pdf" | "word" | "image" | "other";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const allFavorites = useFavoriteStore((s) => s.getAllFavorites());
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Lọc tài liệu theo từ khóa tìm kiếm và tab loại tệp
  const filteredDocs = useMemo(() => {
    return allFavorites.filter((doc) => {
      const title = (doc.title || doc.name || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      if (query && !title.includes(query)) {
        return false;
      }

      const type = (doc.type || doc.file_type || "").toLowerCase();
      if (activeTab === "pdf") {
        return type.includes("pdf");
      }
      if (activeTab === "word") {
        return type.includes("doc") || type.includes("word");
      }
      if (activeTab === "image") {
        return (
          type.includes("image") ||
          type.includes("png") ||
          type.includes("jpg") ||
          type.includes("jpeg") ||
          type.includes("webp")
        );
      }
      if (activeTab === "other") {
        return (
          !type.includes("pdf") &&
          !type.includes("doc") &&
          !type.includes("word") &&
          !type.includes("image")
        );
      }
      return true;
    });
  }, [allFavorites, searchQuery, activeTab]);

  const handleDownload = (doc: any) => {
    if (doc.file_path) {
      const url = `${import.meta.env.VITE_API_URL || ""}/${doc.file_path}`;
      window.open(url, "_blank");
    } else {
      alert(`Đang tải xuống tài liệu: ${doc.title || doc.name}`);
    }
  };

  const handleOpenDoc = (docId: string | number) => {
    navigate(`/personal/documents/${docId}`);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header trang */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-xs">
              <Bookmark className="h-6 w-6 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Tài liệu yêu thích
              </h1>
              <p className="text-xs text-gray-500">
                Lưu trữ và truy cập nhanh các tài liệu quan trọng của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Thống kê số lượng */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/80">
            <Bookmark className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            {allFavorites.length} tài liệu đã lưu
          </span>
        </div>
      </div>

      {/* Thanh công cụ: Tìm kiếm, Tabs lọc & Chuyển đổi Grid/List */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        {/* Tìm kiếm */}
        <div className="w-full sm:max-w-xs">
          <Input
            icon={<Search className="h-4 w-4 text-gray-400" />}
            placeholder="Tìm kiếm tài liệu yêu thích..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs lọc loại file */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "pdf", label: "PDF" },
              { key: "word", label: "Word" },
              { key: "image", label: "Hình ảnh" },
              { key: "other", label: "Khác" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toggle Grid / List */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-gray-100 text-gray-900 shadow-xs"
                : "text-gray-400 hover:text-gray-600"
            )}
            title="Dạng lưới"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-gray-100 text-gray-900 shadow-xs"
                : "text-gray-400 hover:text-gray-600"
            )}
            title="Dạng danh sách"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {/* Nội dung danh sách tài liệu yêu thích */}
      {filteredDocs.length > 0 ? (
        viewMode === "grid" ? (
          /* DẠNG GRID CARD */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredDocs.map((doc) => {
              const thumbnailUrl = doc.thumbnail_path
                ? getThumbnailUrl(doc.thumbnail_path)
                : null;
              const title = doc.title || doc.name || "Tài liệu không tên";
              const sizeLabel =
                typeof doc.size === "string"
                  ? doc.size
                  : doc.file_size
                  ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                  : "—";

              return (
                <div
                  key={doc.id}
                  className="group relative flex h-[290px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
                >
                  {/* Thumbnail / Preview Area */}
                  <div
                    className="relative h-[140px] w-full shrink-0 cursor-pointer overflow-hidden bg-gray-50 flex items-center justify-center"
                    onClick={() => handleOpenDoc(doc.id)}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <FileIcon
                        type={doc.file_type || doc.type || "unknown"}
                        className="h-16 w-16"
                      />
                    )}

                    {/* TikTok Favorite Button (Nút Yêu thích phong cách TikTok ở góc trên phải) */}
                    <div
                      className="absolute right-2 top-2 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="rounded-full bg-white/90 p-0.5 shadow-sm backdrop-blur-xs">
                        <TikTokFavoriteButton
                          document={doc}
                          variant="compact"
                          showCount={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Information */}
                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <div>
                      <h3
                        onClick={() => handleOpenDoc(doc.id)}
                        className="line-clamp-2 cursor-pointer text-sm font-semibold text-gray-800 transition-colors hover:text-primary-600"
                        title={title}
                      >
                        {title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span>{sizeLabel}</span>
                        <span>·</span>
                        <span>{doc.updatedAt || "Đã lưu gần đây"}</span>
                      </p>
                    </div>

                    {/* Actions row */}
                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDoc(doc.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Xem chi tiết"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Tải xuống"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => toggleFavorite(doc)}
                        className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        Bỏ lưu
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DẠNG LIST ROW */
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-gray-100">
              {filteredDocs.map((doc) => {
                const title = doc.title || doc.name || "Tài liệu không tên";
                const sizeLabel =
                  typeof doc.size === "string"
                    ? doc.size
                    : doc.file_size
                    ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                    : "—";

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-gray-50/80 cursor-pointer"
                    onClick={() => handleOpenDoc(doc.id)}
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <FileIcon
                        type={doc.file_type || doc.type || "unknown"}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3
                          className="truncate text-sm font-semibold text-gray-900 hover:text-primary-600"
                          title={title}
                        >
                          {title}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {sizeLabel} · {doc.updatedAt || "Đã lưu gần đây"}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* TikTok Favorite Button */}
                      <TikTokFavoriteButton
                        document={doc}
                        variant="horizontal"
                        showCount={true}
                      />

                      <button
                        onClick={() => handleDownload(doc)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Tải xuống"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => toggleFavorite(doc)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Bỏ khỏi mục yêu thích"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )
      ) : (
        /* EMPTY STATE KHI KHÔNG CÓ TÀI LIỆU YÊU THÍCH */
        <Card className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-inner">
            <Bookmark className="h-8 w-8 fill-amber-200 text-amber-500" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900">
            {searchQuery
              ? "Không tìm thấy tài liệu phù hợp"
              : "Chưa có tài liệu yêu thích"}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-gray-500">
            {searchQuery
              ? `Không tìm thấy tài liệu nào khớp với từ khóa "${searchQuery}".`
              : "Nhấn vào biểu tượng dấu trang (Bookmark) trên các tài liệu để lưu lại và truy cập nhanh tại đây bất cứ lúc nào."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {searchQuery ? (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Xóa tìm kiếm
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<FolderOpen className="h-4 w-4" />}
                onClick={() => navigate("/personal/documents")}
              >
                Khám phá kho tài liệu
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
