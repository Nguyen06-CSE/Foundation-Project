// src/components/shared/documents/DocumentDetail/viewers/PdfViewer.tsx

import { useState } from "react";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PdfViewerProps } from "../DocumentDetail.types";

/**
 * PdfViewer - Hiển thị bản xem trước tài liệu PDF
 *
 * Tính năng chính:
 * 1. Nhúng trực tiếp tài liệu PDF bằng thẻ iframe với toolbar gốc của trình duyệt
 * 2. Cung cấp bộ công cụ chọn trang bất kỳ làm ảnh bìa (thumbnail) cho tài liệu
 */
export function PdfViewer({
  doc,
  fileUrl,
  onUpdateCover,
  isUpdatingCover = false,
}: PdfViewerProps) {
  const [selectedPage, setSelectedPage] = useState(1);

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Thanh công cụ: Chọn trang làm ảnh bìa PDF */}
      {onUpdateCover && (
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-end gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <label
              htmlFor="pdf-cover-page"
              className="text-xs text-gray-500 font-medium"
            >
              Chọn trang bìa:
            </label>
            <input
              id="pdf-cover-page"
              type="number"
              min={1}
              value={selectedPage}
              onChange={(event) => {
                const page = Number.parseInt(event.target.value, 10);
                if (!Number.isNaN(page)) {
                  setSelectedPage(Math.max(1, page));
                }
              }}
              className="w-16 px-2 py-1 text-center text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateCover(selectedPage)}
              disabled={isUpdatingCover}
              className="h-8 text-xs flex items-center gap-1.5 border-primary-500 text-primary-600 hover:bg-primary-50"
            >
              {isUpdatingCover ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  <span>Đặt trang {selectedPage} làm ảnh bìa</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Vùng hiển thị PDF qua iframe */}
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=0`}
        className="w-full h-[750px] rounded-lg shadow-sm bg-white border-0"
        title={doc?.title || "Tài liệu PDF"}
      />
    </div>
  );
}
