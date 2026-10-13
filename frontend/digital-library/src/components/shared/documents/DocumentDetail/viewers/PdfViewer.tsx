// src/components/shared/documents/DocumentDetail/viewers/PdfViewer.tsx

import type { PdfViewerProps } from "../DocumentDetail.types";

/**
 * PdfViewer - Hiển thị bản xem trước tài liệu PDF
 */
export function PdfViewer({
  doc,
  fileUrl,
}: PdfViewerProps) {
  return (
    <div className="w-full flex flex-col items-center gap-3">

      {/* Vùng hiển thị PDF qua iframe */}
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=0`}
        className="w-full h-[750px] rounded-lg shadow-sm bg-white border border-gray-200"
        title={doc?.title || "Tài liệu PDF"}
      />
    </div>
  );
}
