// src/components/shared/documents/DocumentCard/CommunityDocumentCard.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, BookmarkPlus } from "lucide-react";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { StarRating } from "@/components/shared/feedback/StarRating";
import { DocumentContextMenu } from "@/components/shared/documents/DocumentContextMenu";
import { Button } from "@/components/ui/Button";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";
import { cn } from "@/utils/cn";
import {
  getFileExtension,
  FILE_TYPE_THEMES,
  DEFAULT_THEME,
} from "@/utils/fileTypeTheme";
import type { DocumentCardProps } from "./DocumentCard.types";

export function CommunityDocumentCard({
  document,
  onAction,
  basePath = "/library/document",
  allowedActions = ["view", "download", "save-to-personal", "share"],
  extraItems,
}: DocumentCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const targetUrl = `${basePath}/${document.id}`;

  const handleNavigate = () => {
    navigate(targetUrl);
  };

  const ext = getFileExtension(document.extension || document.type, document.name);
  const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME;
  const thumbnailUrl = !imageError
    ? getThumbnailUrl(document.thumbnail_path)
    : null;

  const handleAction = (action: string) => {
    if (action === "view") {
      handleNavigate();
    } else {
      onAction(action, document.id);
    }
  };

  const ratingAvg = document.rating_avg || 0;
  const ratingCount = document.rating_count || 0;
  const downloadCount = document.download_count ?? document.view_count ?? 0;
  const contributor = document.owner?.name || "Người dùng ẩn danh";

  return (
    <div
      id={`community-doc-${document.id}`}
      className={cn(
        "group relative flex h-full min-h-[350px] w-full flex-col justify-between overflow-hidden rounded-xl border border-gray-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-400 hover:shadow-md"
      )}
    >
      <div>
        {/* Preview Frame */}
        <div
          onClick={handleNavigate}
          className={cn(
            "relative h-[150px] w-full shrink-0 cursor-pointer overflow-hidden rounded-lg transition-colors flex items-center justify-center",
            theme.bg
          )}
        >
          {/* File extension badge */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-10">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-xs",
                theme.badgeBg,
                theme.badgeText
              )}
            >
              {ext || "FILE"}
            </span>
          </div>

          {/* Doc Type & Year Badge */}
          {(document.doc_type || document.academic_year) && (
            <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-1">
              {document.doc_type && (
                <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-primary-700 shadow-2xs backdrop-blur-xs">
                  {document.doc_type}
                </span>
              )}
              {document.academic_year && (
                <span className="rounded-md bg-gray-900/60 px-1.5 py-0.2 text-[9px] font-medium text-white shadow-2xs backdrop-blur-xs">
                  {document.academic_year}
                </span>
              )}
            </div>
          )}

          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={document.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
              <FileIcon
                type={document.type}
                className="h-14 w-14 drop-shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="mt-3">
          <div className="flex items-start justify-between gap-1.5">
            <h3
              onClick={handleNavigate}
              className="line-clamp-2 flex-1 cursor-pointer text-sm font-semibold text-gray-900 transition-colors hover:text-primary-600 leading-snug"
              title={document.name}
            >
              {document.name}
            </h3>

            <div
              className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <DocumentContextMenu
                onAction={handleAction}
                allowedActions={allowedActions}
                extraItems={extraItems}
                markdownPath={document.markdown_path || document.markdownPath}
              />
            </div>
          </div>

          <p className="mt-1.5 text-xs text-gray-500 line-clamp-1">
            Bởi: <span className="font-medium text-gray-700">{contributor}</span>
          </p>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <StarRating
            value={ratingAvg}
            size="sm"
            showValue={ratingAvg > 0}
            count={ratingCount}
          />
          <span className="text-[11px] font-medium text-gray-400">
            {document.size}
            {downloadCount > 0 && ` • ${downloadCount} tải`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs h-8 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onAction("download", document.id);
            }}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            Tải về
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-gray-600 hover:text-primary-600"
            title="Lưu về kho cá nhân"
            onClick={(e) => {
              e.stopPropagation();
              onAction("save-to-personal", document.id);
            }}
          >
            <BookmarkPlus className="h-4 w-4 text-primary-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}
