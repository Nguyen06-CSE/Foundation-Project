// src/components/shared/documents/DocumentDetail/viewers/PdfViewer.tsx

import type { PdfViewerProps } from "../DocumentDetail.types";
import { DocumentCoverSelector } from "../components/DocumentCoverSelector";

/**
 * PdfViewer - Hiển thị bản xem trước tài liệu PDF
 */
export function PdfViewer({
  doc,
  fileUrl,
  onUpdateCover,
  isUpdatingCover = false,
  onUpdateThumbnailPage,
  isUpdatingThumbnailPage = false,
}: PdfViewerProps) {
  const handleCover = onUpdateCover || onUpdateThumbnailPage;
  const isUpdating = isUpdatingCover || isUpdatingThumbnailPage;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Thanh công cụ: Chọn trang làm ảnh bìa PDF */}
      {handleCover && (
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-end gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-xs">
          <DocumentCoverSelector
            variant="page"
            onSetPageCover={handleCover}
            isUpdating={isUpdating}
          />
        </div>
      )}

      {/* Vùng hiển thị PDF qua iframe */}
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=0`}
        className="w-full h-[750px] rounded-lg shadow-sm bg-white border border-gray-200"
        title={doc?.title || "Tài liệu PDF"}
      />
    </div>
  );
}
