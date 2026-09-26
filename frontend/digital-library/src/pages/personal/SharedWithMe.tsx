// src/pages/personal/SharedWithMe.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { documentService } from "@/services/documentService";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { CardSkeleton } from "@/components/shared/CardSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { getFileExtension } from "@/utils/file";
import type { SharedDocument } from "@/types/document";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";

const PAGE_SIZE = 20;

export default function SharedWithMe() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["documents", "shared-with-me", page],
    queryFn: () => documentService.getSharedWithMe({ page, page_size: PAGE_SIZE }),
  });

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  const handleDocumentAction = (action: DocumentAction | string, documentId: string) => {
    if (action === "view") {
      navigate(`/personal/documents/${documentId}`);
    } else if (action === "download") {
      const targetDoc = items.find((d) => d.id.toString() === documentId);
      if (targetDoc?.file_path) {
        const fileDownloadUrl = `${import.meta.env.VITE_API_URL}/${targetDoc.file_path}`;
        const link = document.createElement("a");
        link.href = fileDownloadUrl;
        link.download = targetDoc.title;
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-gray-900">Đã chia sẻ với tôi</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} variant="document" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-gray-900">Đã chia sẻ với tôi</h1>
        <EmptyState
          icon={<Share2 className="h-6 w-6 text-red-500" />}
          title="Không thể tải danh sách chia sẻ"
          description={
            (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại sau."
          }
          actionLabel="Thử lại"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && page === 1) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-gray-900">Đã chia sẻ với tôi</h1>
        <EmptyState
          icon={<Share2 className="h-6 w-6" />}
          title="Chưa có tài liệu nào"
          description="Khi ai đó chia sẻ tài liệu cho bạn, chúng sẽ xuất hiện ở đây."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Đã chia sẻ với tôi</h1>

      {/* Grid tài liệu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((doc: SharedDocument) => (
          <div key={doc.share_id ?? `doc-${doc.id}`} className="flex flex-col gap-0">
            <DocumentCard
              document={{
                id: doc.id.toString(),
                name: doc.title,
                type: doc.file_type || "unknown",
                updatedAt: formatRelativeDate(doc.created_at),
                size: formatSize(doc.file_size || 0),
                extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
                thumbnail_path: doc.thumbnail_path ?? null,
                tags: doc.tags || [],
                is_bundle: doc.is_bundle,
                bundle_parent_id: doc.bundle_parent_id,
                bundle_children_count: doc.bundle_children_count,
              }}
              onAction={handleDocumentAction}
              allowedActions={["view", "download"]}
            />

            {/* Khung lời nhắn từ người chia sẻ */}
            {(doc.shared_by || doc.share_message) && (
              <div className="mx-1 -mt-1 rounded-b-xl border border-t-0 border-gray-200/80 bg-amber-50/60 px-3 py-2.5">
                {doc.shared_by && (
                  <p className="text-xs font-medium text-gray-600">
                    Từ{" "}
                    <span className="text-amber-700">
                      {doc.shared_by.full_name || doc.shared_by.username}
                    </span>
                    {doc.shared_at && (
                      <span className="text-gray-400 ml-1.5">
                        · {formatRelativeDate(doc.shared_at)}
                      </span>
                    )}
                  </p>
                )}
                {doc.share_message && (
                  <p className="mt-1 text-xs italic text-gray-500 leading-relaxed">
                    &ldquo;{doc.share_message}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </button>
          <span className="text-sm text-gray-500">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
