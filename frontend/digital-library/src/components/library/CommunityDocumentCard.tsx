// frontend/digital-library/src/components/library/CommunityDocumentCard.tsx

import { Star, Download, Calendar, Layers, GraduationCap, User } from "lucide-react";
import type { CommunityDocument } from "@/types/library";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

export interface CommunityDocumentCardProps {
  document: CommunityDocument;
  onClick?: () => void;
  className?: string;
}

export function CommunityDocumentCard({
  document: doc,
  onClick,
  className,
}: CommunityDocumentCardProps) {
  const hasRating = (doc.rating_count || 0) > 0;
  const ratingAvg = Number(doc.rating_avg || 0).toFixed(1);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all duration-200",
        "hover:-translate-y-1 hover:border-primary-400/80 hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div>
        {/* Top Header: File Icon + Doc Type badge + Academic year */}
        <div className="flex items-start justify-between gap-3">
          <FileIcon type={doc.file_type || "pdf"} className="h-10 w-10 shrink-0" />
          <div className="flex flex-wrap items-center justify-end gap-1.5 text-right">
            {doc.doc_type && (
              <span className="inline-flex items-center rounded-md bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                {doc.doc_type}
              </span>
            )}
            {doc.academic_year && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                <Calendar className="h-3 w-3 text-gray-400" />
                {doc.academic_year}
              </span>
            )}
          </div>
        </div>

        {/* Title: Tăng cỡ chữ lên 15px để dễ đọc hơn */}
        <h3
          className="mt-3.5 text-[15px] font-semibold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug"
          title={doc.title}
        >
          {doc.title}
        </h3>

        {/* Description (if available) */}
        {doc.description && (
          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {doc.description}
          </p>
        )}

        {/* Faculty & Subject Info: Tách dòng hoặc dùng flex-1 để không bị bóp nghẹt */}
        <div className="mt-3.5 flex flex-col gap-1.5 text-xs text-gray-500">
          {doc.subject_name && (
            <span
              className="inline-flex items-center gap-1.5 font-medium text-gray-700 truncate"
              title={doc.subject_name}
            >
              <Layers className="h-3.5 w-3.5 shrink-0 text-primary-600" />
              <span className="truncate">{doc.subject_name}</span>
            </span>
          )}
          {doc.faculty_name && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 truncate"
              title={doc.faculty_name}
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{doc.faculty_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Metadata & Real Signals */}
      <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          {/* Real Rating Signal */}
          <div className="flex items-center gap-1">
            {hasRating ? (
              <div className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <span>{ratingAvg}</span>
                <span className="text-[11px] font-normal text-gray-400">
                  ({doc.rating_count})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-gray-300" />
                Chưa có đánh giá
              </span>
            )}
          </div>

          {/* Real Download Count Signal */}
          <div className="inline-flex items-center gap-1 font-medium text-gray-600 text-xs">
            <Download className="h-3.5 w-3.5 text-gray-400" />
            <span>{doc.download_count ?? 0}</span>
            <span className="text-[11px] text-gray-400">lượt tải</span>
          </div>
        </div>

        {/* Contributor and File Size: Dùng min-w-0 flex-1 thay vì max-w-[160px] cứng */}
        <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
          <span
            className="inline-flex min-w-0 flex-1 items-center gap-1.5"
            title={`Đóng góp bởi ${doc.contributed_by || "Ẩn danh"}`}
          >
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{doc.contributed_by || "Ẩn danh"}</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0 text-gray-400">
            {doc.file_size ? <span>{formatSize(doc.file_size)}</span> : null}
            {doc.created_at && (
              <>
                <span>•</span>
                <span>{formatRelativeDate(doc.created_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityDocumentCard;
