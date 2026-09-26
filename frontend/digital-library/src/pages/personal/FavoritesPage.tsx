// frontend/digital-library/src/pages/personal/FavoritesPage.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { documentService } from "@/services/documentService";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { CardSkeleton } from "@/components/shared/CardSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { getFileExtension } from "@/utils/file";
import type { FavoriteDocument } from "@/types/document";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";

export default function FavoritesPage() {
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => documentService.listFavorites(),
  });

  const handleDocumentAction = (action: DocumentAction | string, documentId: string) => {
    const docIdNum = Number(documentId);
    if (action === "view") {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      window.open(`${baseUrl}/documents/${documentId}/preview`, "_blank");
    } else if (action === "download") {
      const targetDoc = favorites.find((d) => d.id.toString() === documentId);
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const downloadUrl = `${baseUrl}/documents/${documentId}/download`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = targetDoc?.title || "download";
      link.target = "_blank";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (action === "favorite") {
      if (isNaN(docIdNum)) return;
      documentService.removeFavorite(docIdNum).then(() => {
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-gray-900">Tài liệu yêu thích</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} variant="document" />
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-gray-900">Tài liệu yêu thích</h1>
        <EmptyState
          icon={<Heart className="h-6 w-6 text-rose-500" />}
          title="Chưa có tài liệu yêu thích nào"
          description="Bấm vào biểu tượng trái tim trên menu tài liệu để lưu lại danh sách yêu thích."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Tài liệu yêu thích</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((doc: FavoriteDocument) => (
          <DocumentCard
            key={doc.id}
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
            allowedActions={["view", "download", "favorite"]}
            isFavorited={true}
          />
        ))}
      </div>
    </div>
  );
}
