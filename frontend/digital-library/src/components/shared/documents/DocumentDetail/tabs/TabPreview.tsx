// src/components/shared/documents/DocumentDetail/tabs/TabPreview.tsx

import { getThumbnailUrl } from "@/utils/getThumbnailUrl";
import { cn } from "@/utils/cn";
import { CODE_EXTENSIONS, type TabPreviewProps } from "../DocumentDetail.types";
import { DocxViewer } from "../viewers/DocxViewer";
import { PdfViewer } from "../viewers/PdfViewer";
import { CodeViewer } from "../viewers/CodeViewer";
import { MarkdownViewer } from "../viewers/MarkdownViewer";
import { OfficeViewer } from "../viewers/OfficeViewer";
import { DocumentCoverSelector } from "../components/DocumentCoverSelector";

/**
 * TabPreview - Tab "Bản xem trước" tổng hợp của tài liệu
 *
 * Tính năng chính:
 * 1. Nhận diện định dạng file (ảnh, pdf, docx, code, pptx, xlsx, doc, hoặc các file khác)
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
  viewMode = "original",
}: TabPreviewProps) {
  const fileType = doc.file_type?.toLowerCase() || "";

  // Helper bóc tách phần mở rộng chính xác (tránh lỗi url chứa chuỗi như .r trong .r2.dev)
  const getExtension = (pathOrUrl?: string, title?: string): string => {
    const raw = pathOrUrl || "";
    try {
      const url = new URL(raw);
      const pathname = url.pathname;
      const lastDot = pathname.lastIndexOf(".");
      if (lastDot !== -1) return pathname.substring(lastDot).toLowerCase();
    } catch {
      const clean = raw.split("?")[0].split("#")[0];
      const lastDot = clean.lastIndexOf(".");
      if (lastDot !== -1) return clean.substring(lastDot).toLowerCase();
    }
    if (title) {
      const clean = title.split("?")[0].split("#")[0];
      const lastDot = clean.lastIndexOf(".");
      if (lastDot !== -1) return clean.substring(lastDot).toLowerCase();
    }
    return "";
  };

  const fileExt = getExtension(doc.file_path, doc.title);

  // Nhận diện loại tệp
  const isImage =
    fileType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"].includes(fileExt);

  const isPdf = fileType === "application/pdf" || fileExt === ".pdf";
  
  // DOCX chuẩn (XML zip) render cục bộ bằng docx-preview
  const isDocx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileExt === ".docx";

  // DOC cũ (Word 97-2003 binary) không hỗ trợ bởi docx-preview, hiển thị bằng OfficeViewer
  const isLegacyDoc =
    fileType === "application/msword" ||
    fileExt === ".doc";

  const isPptx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileType === "application/vnd.ms-powerpoint" ||
    fileExt === ".pptx" ||
    fileExt === ".ppt";

  const isXlsx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.ms-excel" ||
    fileExt === ".xlsx" ||
    fileExt === ".xls";

  // Chỉ nhận diện là Code nếu không thuộc các loại tài liệu Office/Media ở trên
  const isCode =
    !isImage &&
    !isPdf &&
    !isDocx &&
    !isLegacyDoc &&
    !isPptx &&
    !isXlsx &&
    (fileType.startsWith("text/") ||
      CODE_EXTENSIONS.includes(fileExt) ||
      (doc.title || "").toLowerCase().includes("dockerfile"));

  const hasMarkdown = !isImage && !!doc.markdown_path;

  const thumbnailUrl = getThumbnailUrl(doc.thumbnail_path);

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full">
      {/* Vùng xem trước chính */}
      <div className="w-full min-w-0 flex flex-col">
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
            <div className="w-full flex items-center justify-center p-4 bg-gray-50/60 rounded-xl border border-gray-200">
              <img
                src={fileUrl}
                alt={doc.title}
                className="max-w-full max-h-[700px] mx-auto rounded-lg object-contain shadow-sm bg-white"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : isPdf ? (
            <PdfViewer
              doc={doc}
              fileUrl={fileUrl}
              onUpdateCover={onUpdateThumbnailPage}
              isUpdatingCover={isUpdatingThumbnailPage}
              onUpdateThumbnailPage={onUpdateThumbnailPage}
              isUpdatingThumbnailPage={isUpdatingThumbnailPage}
            />
          ) : isDocx ? (
            <DocxViewer
              fileUrl={fileUrl}
              documentId={doc.id}
              hasThumbnail={!!doc.thumbnail_path}
              onUpdateThumbnail={onUpdateThumbnail}
              isUpdatingThumbnail={isUpdatingThumbnail}
              onUpdateThumbnailPage={onUpdateThumbnailPage}
              isUpdatingThumbnailPage={isUpdatingThumbnailPage}
              onUpdateCover={onUpdateThumbnailPage}
              isUpdatingCover={isUpdatingThumbnailPage}
            />
          ) : isCode ? (
            <CodeViewer
              documentId={doc.id}
              filePath={doc.file_path}
              title={doc.title}
            />
          ) : isPptx || isXlsx || isLegacyDoc ? (
            <OfficeViewer
              doc={doc}
              fileUrl={fileUrl}
              onUpdateThumbnail={onUpdateThumbnail}
              isUpdatingThumbnail={isUpdatingThumbnail}
            />
          ) : (
            /* Fallback đối với các định dạng khác */
            <div className="w-full flex flex-col items-center justify-center space-y-4 py-16 bg-gray-50/60 rounded-xl border border-gray-200">
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
                <div className="mt-4">
                  <DocumentCoverSelector
                    variant="upload"
                    onUploadCover={onUpdateThumbnail}
                    isUpdating={isUpdatingThumbnail}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
