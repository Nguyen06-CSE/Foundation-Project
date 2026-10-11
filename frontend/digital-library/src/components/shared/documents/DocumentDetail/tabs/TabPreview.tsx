// src/components/shared/documents/DocumentDetail/tabs/TabPreview.tsx

import { useState } from "react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { Camera, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";
import { cn } from "@/utils/cn";
import { CODE_EXTENSIONS, type TabPreviewProps } from "../DocumentDetail.types";
import { DocxViewer } from "../viewers/DocxViewer";
import { PdfViewer } from "../viewers/PdfViewer";
import { CodeViewer } from "../viewers/CodeViewer";
import { MarkdownViewer } from "../viewers/MarkdownViewer";

/**
 * TabPreview - Tab "Bản xem trước" tổng hợp của tài liệu
 *
 * Tính năng chính:
 * 1. Nhận diện định dạng file (ảnh, pdf, docx, code, pptx, xlsx, hoặc các file khác)
 * 2. Điều phối render component viewer phù hợp
 * 3. Hỗ trợ chuyển đổi linh hoạt giữa "Bản gốc" và "Markdown" (nếu có markdown_path)
 * 4. Hỗ trợ tải lên ảnh bìa đại diện cho PPTX, XLSX và các định dạng fallback
 */
export function TabPreview({
  doc,
  fileUrl,
  onUpdateThumbnail,
  isUpdatingThumbnail,
  onUpdateThumbnailPage,
  isUpdatingThumbnailPage,
}: TabPreviewProps) {
  const { defaultPreviewMode } = useSettingsStore();

  const fileType = doc.file_type?.toLowerCase() || "";
  const filePath = doc.file_path?.toLowerCase() || "";

  // Nhận diện loại tệp
  const isImage = fileType.startsWith("image/");
  const isPdf = fileType === "application/pdf" || filePath.endsWith(".pdf");
  const isDocx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword" ||
    filePath.endsWith(".docx") ||
    filePath.endsWith(".doc");

  const isPptx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileType === "application/vnd.ms-powerpoint" ||
    filePath.endsWith(".pptx") ||
    filePath.endsWith(".ppt");

  const isXlsx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.ms-excel" ||
    filePath.endsWith(".xlsx") ||
    filePath.endsWith(".xls");

  const targetCheck = `${filePath} ${doc.title || ""}`.toLowerCase();
  const isCode =
    fileType.startsWith("text/") ||
    CODE_EXTENSIONS.some((ext) => targetCheck.includes(ext)) ||
    targetCheck.includes("dockerfile");

  const hasMarkdown = !isImage && !!doc.markdown_path;

  // Chế độ xem: ưu tiên markdown nếu được cấu hình hoặc file pptx/xlsx
  const [viewMode, setViewMode] = useState<"original" | "markdown">(
    hasMarkdown && !isCode && (isPptx || isXlsx || defaultPreviewMode === "markdown")
      ? "markdown"
      : "original",
  );

  const thumbnailUrl = getThumbnailUrl(doc.thumbnail_path);

  /**
   * Đọc file ảnh upload từ máy tính và chuyển sang chuỗi Base64
   */
  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateThumbnail) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onUpdateThumbnail(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full">
      {/* Nút chuyển đổi Bản gốc / Markdown khi tài liệu có OCR markdown */}
      {hasMarkdown && (
        <div className="flex items-center self-end bg-gray-100 rounded-full p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode("original")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors",
              viewMode === "original"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            Bản gốc
          </button>
          <button
            type="button"
            onClick={() => setViewMode("markdown")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors",
              viewMode === "markdown"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            Markdown
          </button>
        </div>
      )}

      {/* Vùng xem trước chính */}
      <div className="w-full min-w-0 flex flex-col items-center justify-center rounded-xl bg-gray-100/80 p-2 min-h-[500px] border border-gray-200 overflow-hidden">
        {/* Chế độ Markdown: Giữ trong DOM, ẩn/hiện bằng CSS để tránh re-fetch */}
        {hasMarkdown && (
          <div
            className={cn(
              "w-full min-w-0",
              viewMode === "markdown" ? "block" : "hidden",
            )}
          >
            <MarkdownViewer markdownPath={doc.markdown_path} />
          </div>
        )}

        {/* Chế độ Bản gốc */}
        <div
          className={cn(
            "w-full min-w-0",
            !hasMarkdown || viewMode === "original" ? "block" : "hidden",
          )}
        >
          {isImage ? (
            <img
              src={fileUrl}
              alt={doc.title}
              className="max-w-full max-h-[700px] mx-auto rounded-lg object-contain shadow-sm bg-white"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : isPdf ? (
            <PdfViewer
              doc={doc}
              fileUrl={fileUrl}
              onUpdateCover={onUpdateThumbnailPage}
              isUpdatingCover={isUpdatingThumbnailPage}
            />
          ) : isDocx ? (
            <DocxViewer
              fileUrl={fileUrl}
              hasThumbnail={!!doc.thumbnail_path}
              onUpdateThumbnail={onUpdateThumbnail}
              isUpdatingThumbnail={isUpdatingThumbnail}
            />
          ) : isCode ? (
            <CodeViewer
              documentId={doc.id}
              filePath={doc.file_path}
              title={doc.title}
            />
          ) : isPptx || isXlsx ? (
            <div className="w-full h-[800px] min-h-[750px] bg-white rounded-xl overflow-hidden border border-gray-200 flex flex-col gap-3">
              {onUpdateThumbnail && (
                <div className="w-full flex items-center justify-end px-4 py-2 border-b border-gray-200">
                  <label className="text-xs text-gray-500 font-medium mr-2">
                    Ảnh bìa:
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadCover}
                    />
                    <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border border-primary-500 text-primary-600 rounded-md hover:bg-primary-50">
                      {isUpdatingThumbnail ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      {isUpdatingThumbnail ? "Đang lưu..." : "Tải lên ảnh bìa"}
                    </span>
                  </label>
                </div>
              )}
              <DocViewer
                documents={[{ uri: fileUrl }]}
                pluginRenderers={DocViewerRenderers}
                style={{ width: "100%", height: "750px", minHeight: "750px" }}
                config={{ header: { disableHeader: true } }}
              />
            </div>
          ) : (
            /* Fallback đối với các định dạng khác */
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={doc.title}
                  className="h-60 rounded object-contain shadow"
                />
              ) : (
                <div className="flex h-40 w-32 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-gray-400 to-gray-500 text-white shadow">
                  <span className="text-xs font-bold text-center px-2">
                    {doc.title}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-500 max-w-sm text-center leading-relaxed">
                Hệ thống hiện chưa hỗ trợ xem trước định dạng này trực tiếp. Vui
                lòng nhấn <strong>"Mở trong thẻ mới"</strong> hoặc{" "}
                <strong>"Tải xuống"</strong> để xem.
              </p>
              {onUpdateThumbnail && (
                <label className="cursor-pointer mt-4">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadCover}
                  />
                  <span className="inline-flex items-center gap-2 h-9 px-4 text-sm border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                    {isUpdatingThumbnail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {isUpdatingThumbnail ? "Đang lưu..." : "Tải lên ảnh bìa"}
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
