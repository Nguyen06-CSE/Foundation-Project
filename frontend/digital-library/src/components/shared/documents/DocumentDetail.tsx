// frontend/digital-library/src/components/shared/DocumentDetail.tsx

// ==========================================
// 1. IMPORTS
// ==========================================
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSettingsStore } from "@/stores/settingsStore";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { renderAsync } from "docx-preview";
import html2canvas from "html2canvas";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import {
  ArrowLeft,
  Download,
  Share2,
  Star,
  FolderInput,
  Edit2,
  Trash2,
  Plus,
  X,
  Search,
  Check,
  ExternalLink,
  Loader2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";

// UI Components
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileIcon } from "@/components/shared/documents/FileIcon";

// Services & Utils
import { documentService } from "@/services/documentService";
import { tagService } from "@/services/tagService";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import type { Document } from "@/types/document";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";

// ==========================================
// 2. TYPES & CONSTANTS
// ==========================================
export interface TagType {
  id: number;
  name: string;
  color?: string;
}

type TabKey = "detail" | "content" | "description" | "note" | "activity";

const TABS: { key: TabKey; label: string }[] = [
  { key: "detail", label: "Bản xem trước" },
  { key: "content", label: "Nội dung OCR" },
  { key: "description", label: "Mô tả" },
  { key: "note", label: "Ghi chú" },
  { key: "activity", label: "Hoạt động" },
];

const COLORS = [
  { hex: "#2E7D32", tw: "bg-[#2E7D32]" },
  { hex: "#1976D2", tw: "bg-[#1976D2]" },
  { hex: "#F57C00", tw: "bg-[#F57C00]" },
  { hex: "#7B1FA2", tw: "bg-[#7B1FA2]" },
  { hex: "#D32F2F", tw: "bg-[#D32F2F]" },
  { hex: "#00BCD4", tw: "bg-[#00BCD4]" },
  { hex: "#E64A19", tw: "bg-[#E64A19]" },
  { hex: "#607D8B", tw: "bg-[#607D8B]" },
];

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/msword": "Word Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word Document",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "image/jpeg": "Hình ảnh JPEG",
  "image/png": "Hình ảnh PNG",
  "text/plain": "Văn bản thuần",
};

const MIME_TO_ICON_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/jpeg": "image",
  "image/png": "image",
};

export interface DocumentDetailPermissions {
  canEdit?: boolean;
  canDelete?: boolean;
  canManageTags?: boolean;
}

export interface SharedDocumentDetailProps {
  documentId?: number;
  fetchDocumentFn?: (id: number) => Promise<any>;
  updateDocumentFn?: (id: number, data: Partial<Document>) => Promise<any>;
  deleteDocumentFn?: (id: number) => Promise<any>;
  updateTagsFn?: (id: number, tagIds: number[]) => Promise<any>;
  removeTagFn?: (id: number, tagId: number) => Promise<any>;
  updateThumbnailPageFn?: (id: number, page: number) => Promise<any>;
  queryKeyPrefix?: string[];
  permissions?: DocumentDetailPermissions;
  backUrl?: string;
  onBack?: () => void;
  onDeleteSuccess?: () => void;
}

// ==========================================
// 3. SUB-COMPONENTS FOR PREVIEW
// ==========================================

interface DocxViewerProps {
  fileUrl: string;
  hasThumbnail: boolean;
  onUpdateThumbnail?: (base64Thumbnail: string) => void;
  isUpdatingThumbnail?: boolean;
}

// Sub-component xem trước file DOCX
function DocxViewer({
  fileUrl,
  hasThumbnail,
  onUpdateThumbnail,
  isUpdatingThumbnail = false,
}: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const hasThumbnailRef = useRef(hasThumbnail);
  const onUpdateThumbnailRef = useRef(onUpdateThumbnail);

  useEffect(() => {
    hasThumbnailRef.current = hasThumbnail;
    onUpdateThumbnailRef.current = onUpdateThumbnail;
  }, [hasThumbnail, onUpdateThumbnail]);

  const capturePage = async (pageNumber: number): Promise<string | null> => {
    if (!containerRef.current) return null;

    const pages = containerRef.current.querySelectorAll("section");
    const targetElement =
      pages.length > 0
        ? (pages[Math.max(0, Math.min(pageNumber - 1, pages.length - 1))] as HTMLElement)
        : (containerRef.current.firstElementChild as HTMLElement) || containerRef.current;

    if (!targetElement) return null;

    try {
      const canvas = await html2canvas(targetElement, {
        scale: 0.6,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      return canvas.toDataURL("image/webp", 0.75);
    } catch (err) {
      console.error("Lỗi khi chụp trang tài liệu:", err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let captureTimeout: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError(null);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải tập tin Word");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (containerRef.current && isMounted) {
          containerRef.current.innerHTML = "";
          return renderAsync(buffer, containerRef.current, undefined, {
            className: "docx-preview-wrapper",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          });
        }
      })
      .then(() => {
        if (!isMounted) return;
        setLoading(false);

        captureTimeout = setTimeout(async () => {
          if (!isMounted || !containerRef.current) return;

          const pages = containerRef.current.querySelectorAll("section");
          const pageCount = pages.length || 1;
          setTotalPages(pageCount);
          setSelectedPage((page) => Math.min(page, pageCount));

          if (!hasThumbnailRef.current && onUpdateThumbnailRef.current) {
            const firstPageThumbnail = await capturePage(1);
            if (isMounted && firstPageThumbnail) {
              onUpdateThumbnailRef.current?.(firstPageThumbnail);
            }
          }
        }, 600);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Lỗi xem trước DOCX:", err);
          setError(
            "Không thể xem trước tài liệu Word này. Định dạng file có thể không hợp lệ hoặc bị khóa.",
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (captureTimeout) clearTimeout(captureTimeout);
    };
  }, [fileUrl]);

  const handleSetCover = async () => {
    setIsCapturing(true);
    try {
      const base64 = await capturePage(selectedPage);
      if (base64 && onUpdateThumbnail) {
        onUpdateThumbnail(base64);
      } else {
        alert("Không thể chụp trang đã chọn. Vui lòng thử lại!");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {!loading && !error && (
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <ImageIcon className="h-4 w-4 text-primary-600" />
            <span>
              Tổng số trang:{" "}
              <strong className="text-gray-900">{totalPages}</strong>
            </span>
          </div>

          {onUpdateThumbnail && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="docx-cover-page"
                className="text-xs text-gray-500 font-medium"
              >
                Chọn trang bìa:
              </label>
              <input
                id="docx-cover-page"
                type="number"
                min={1}
                max={totalPages}
                value={selectedPage}
                onChange={(event) => {
                  const page = Number.parseInt(event.target.value, 10);
                  if (!Number.isNaN(page)) {
                    setSelectedPage(Math.max(1, Math.min(page, totalPages)));
                  }
                }}
                className="w-16 px-2 py-1 text-center text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetCover}
                disabled={isCapturing || isUpdatingThumbnail}
                className="h-8 text-xs flex items-center gap-1.5 border-primary-500 text-primary-600 hover:bg-primary-50"
              >
                {isCapturing || isUpdatingThumbnail ? (
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
          )}
        </div>
      )}

      <div className="w-full min-h-[700px] max-h-[800px] overflow-auto bg-gray-200/70 p-4 rounded-xl flex flex-col items-center custom-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto py-20 text-gray-500 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="text-sm font-medium">
              Đang tải và định dạng văn bản Word...
            </span>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center my-auto py-20 text-red-500 gap-2">
            <p className="text-sm text-center max-w-md">{error}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "w-full max-w-4xl bg-white shadow-md rounded-lg p-2 transition-opacity duration-300",
            loading || error ? "hidden" : "block",
          )}
        />
      </div>
    </div>
  );
}

// Sub-component xem tài liệu Markdown
function MarkdownViewer({ markdownPath }: { markdownPath: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${import.meta.env.VITE_API_URL}/${markdownPath}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải file Markdown");
        return res.text();
      })
      .then((text) => {
        if (isMounted) { setContent(text); setLoading(false); }
      })
      .catch((err) => {
        if (isMounted) { setError(err.message); setLoading(false); }
      });

    return () => { isMounted = false; };
  }, [markdownPath]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="text-sm">Đang tải nội dung Markdown...</span>
      </div>
    );

  if (error)
    return (
      <div className="py-12 text-center text-sm text-red-500">{error}</div>
    );

  return (
    <div className="prose prose-sm max-w-none overflow-auto max-h-[750px] p-5 bg-white rounded-xl border border-gray-200 custom-scrollbar">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ""}</ReactMarkdown>
    </div>
  );
}

// Sub-component xem mã nguồn (Code)
function CodeViewer({ documentId, filePath }: { documentId: number; filePath?: string }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchAndHighlight = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/documents/${documentId}/raw`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        
        if (!res.ok) throw new Error("Không thể tải nội dung file code");
        
        const text = await res.text();
        if (!isMounted) return;

        // Map extension to shiki language
        let lang = "text";
        if (filePath) {
          const ext = filePath.split('.').pop()?.toLowerCase() || "";
          const langMap: Record<string, string> = {
            py: "python", js: "javascript", ts: "typescript", jsx: "jsx", tsx: "tsx",
            cpp: "cpp", c: "c", h: "c", java: "java", cs: "csharp", go: "go", rs: "rust",
            php: "php", rb: "ruby", swift: "swift", kt: "kotlin", scala: "scala", r: "r", m: "objective-c",
            sql: "sql", json: "json", yaml: "yaml", yml: "yaml", toml: "toml", xml: "xml", csv: "csv",
            html: "html", css: "css", scss: "scss", sass: "sass", less: "less", svelte: "svelte", vue: "vue",
            sh: "bash", bash: "bash", zsh: "bash", fish: "fish", ps1: "powershell", bat: "bat", cmd: "bat",
            md: "markdown", mdx: "mdx", rst: "rst", tex: "tex",
            env: "ini", gitignore: "ignore", dockerignore: "ignore", makefile: "makefile", mk: "makefile"
          };
          if (langMap[ext]) lang = langMap[ext];
          else if (filePath.toLowerCase().includes("dockerfile")) lang = "dockerfile";
        }

        // Dynamically import shiki to avoid bundle bloat
        const { codeToHtml } = await import("shiki");
        const highlightedHtml = await codeToHtml(text, {
          lang,
          theme: "github-light",
        }).catch(() => {
           // fallback if lang not supported
           return codeToHtml(text, { lang: "text", theme: "github-light" }).catch(() => `<pre><code>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`);
        });

        if (isMounted) {
          setHtmlContent(highlightedHtml);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchAndHighlight();

    return () => { isMounted = false; };
  }, [documentId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="text-sm">Đang tải mã nguồn...</span>
      </div>
    );

  if (error)
    return (
      <div className="py-12 text-center text-sm text-red-500">{error}</div>
    );

  return (
    <div className="w-full max-w-full h-full min-h-[500px] max-h-[750px] overflow-hidden bg-[#f6f8fa] rounded-xl border border-gray-200 text-sm flex flex-col">
      <div 
        className="w-full h-full overflow-auto p-5 custom-scrollbar [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0"
        dangerouslySetInnerHTML={{ __html: htmlContent || "" }} 
      />
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">
        {value}
      </span>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}
function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}

function PdfViewer({ doc, fileUrl, onUpdateCover, isUpdatingCover }: { doc: any; fileUrl: string; onUpdateCover?: (page: number) => void; isUpdatingCover?: boolean }) {
  const [selectedPage, setSelectedPage] = useState(1);
  return (
    <div className="w-full flex flex-col items-center gap-3">
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
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=0`}
        className="w-full h-[750px] rounded-lg shadow-sm bg-white border-0"
        title={doc.title}
      />
    </div>
  );
}

// Sub-component Tab Detail (Bản xem trước tổng hợp)
function TabDetail({
  doc,
  fileUrl,
  onUpdateThumbnail,
  isUpdatingThumbnail,
  onUpdateThumbnailPage,
  isUpdatingThumbnailPage,
}: {
  doc: any;
  fileUrl: string;
  onUpdateThumbnail?: (base64: string) => void;
  isUpdatingThumbnail?: boolean;
  onUpdateThumbnailPage?: (page: number) => void;
  isUpdatingThumbnailPage?: boolean;
}) {
  const { defaultPreviewMode } = useSettingsStore();
  const fileType = doc.file_type?.toLowerCase() || "";
  const filePath = doc.file_path?.toLowerCase() || "";

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

  const CODE_EXTENSIONS = [
    ".py", ".js", ".ts", ".jsx", ".tsx", ".cpp", ".c", ".h", ".java", ".cs", 
    ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".scala", ".r", ".m",
    ".sql", ".json", ".yaml", ".yml", ".toml", ".xml", ".csv",
    ".html", ".css", ".scss", ".sass", ".less", ".svelte", ".vue",
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
    ".md", ".mdx", ".rst", ".tex",
    ".env", ".gitignore", ".dockerignore", ".makefile", ".mk", "dockerfile"
  ];
  const isCode = fileType.startsWith("text/") || CODE_EXTENSIONS.some(ext => filePath.endsWith(ext)) || filePath.includes("dockerfile");

  const hasMarkdown = !isImage && !!doc.markdown_path;
  // If markdown not available, always show original regardless of stored pref
  const [viewMode, setViewMode] = useState<"original" | "markdown">(
    hasMarkdown && !isCode && (isPptx || isXlsx || defaultPreviewMode === "markdown") ? "markdown" : "original",
  );

  const thumbnailUrl = getThumbnailUrl(doc.thumbnail_path);

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle pill — only when markdown is available */}
      {hasMarkdown && (
        <div className="flex items-center self-end bg-gray-100 rounded-full p-0.5 text-xs font-medium">
          <button
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

      <div className="flex flex-col items-center justify-center rounded-xl bg-gray-100/80 p-2 min-h-[500px] border border-gray-200">
        {viewMode === "markdown" && hasMarkdown ? (
          <MarkdownViewer markdownPath={doc.markdown_path} />
        ) : isImage ? (
          <img
            src={fileUrl}
            alt={doc.title}
            className="max-w-full max-h-[700px] rounded-lg object-contain shadow-sm bg-white"
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
          <CodeViewer documentId={doc.id} filePath={doc.file_path} />
        ) : (isPptx || isXlsx) ? (
          <div className="w-full h-full min-h-[600px] bg-white rounded-xl overflow-hidden border border-gray-200 flex flex-col gap-3">
             {onUpdateThumbnail && (
               <div className="w-full flex items-center justify-end px-4 py-2 border-b border-gray-200">
                 <label className="text-xs text-gray-500 font-medium mr-2">Ảnh bìa:</label>
                 <label className="cursor-pointer">
                   <input
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onload = (ev) => {
                           if (ev.target?.result) {
                             onUpdateThumbnail(ev.target.result as string);
                           }
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                   <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border border-primary-500 text-primary-600 rounded-md hover:bg-primary-50">
                     {isUpdatingThumbnail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                     {isUpdatingThumbnail ? "Đang lưu..." : "Tải lên ảnh bìa"}
                   </span>
                 </label>
               </div>
             )}
             <DocViewer 
               documents={[{ uri: fileUrl }]} 
               pluginRenderers={DocViewerRenderers} 
               style={{ width: "100%", height: "100%", minHeight: "600px" }}
               config={{ header: { disableHeader: true } }}
             />
          </div>
        ) : (
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          onUpdateThumbnail(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <span className="inline-flex items-center gap-2 h-9 px-4 text-sm border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                  {isUpdatingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {isUpdatingThumbnail ? "Đang lưu..." : "Tải lên ảnh bìa"}
                </span>
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// Sub-component Tab Content (Nội dung OCR)
function TabContent({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500">
          Tài liệu này chưa có dữ liệu văn bản (OCR).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 max-h-[700px] overflow-y-auto custom-scrollbar">
      <p className="text-sm text-gray-700 leading-loose whitespace-pre-wrap font-serif">
        {content}
      </p>
    </div>
  );
}

function TabDescription({ description }: { description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Mô tả chi tiết
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function TabNote() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Ghi chú cá nhân
      </h3>
      <textarea
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        rows={6}
        placeholder="Nhập ghi chú của bạn về tài liệu này..."
      />
    </div>
  );
}

function TabActivity() {
  const activities = [
    { action: "Tải lên", time: "10 phút trước", user: "Tôi" },
    { action: "Xem", time: "2 giờ trước", user: "Nguyễn Văn A" },
    { action: "Tải xuống", time: "Hôm qua", user: "Trần Thị B" },
  ];
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Lịch sử hoạt động
      </h3>
      {activities.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
        >
          <div>
            <span className="font-medium text-gray-800">{a.user}</span>
            <span className="text-gray-500">
              {" "}
              đã {a.action.toLowerCase()} tài liệu
            </span>
          </div>
          <span className="text-xs text-gray-400">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 4. MAIN COMPONENT
// ==========================================
export function DocumentDetail(props: SharedDocumentDetailProps = {}) {
  const {
    documentId: propDocumentId,
    fetchDocumentFn = documentService.getById,
    updateDocumentFn = documentService.update,
    deleteDocumentFn = documentService.delete,
    updateTagsFn = documentService.updateTags,
    removeTagFn = documentService.removeTag,
    updateThumbnailPageFn = documentService.updateThumbnailPage,
    queryKeyPrefix = ["document"],
    permissions = {},
    backUrl = "/personal/documents",
    onBack,
    onDeleteSuccess,
  } = props;

  const canEdit = permissions.canEdit ?? true;
  const canDelete = permissions.canDelete ?? true;
  const canManageTags = permissions.canManageTags ?? true;

  const params = useParams<{ id?: string; docId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const id = propDocumentId ?? Number(params.id);

  const [activeTab, setActiveTab] = useState<TabKey>("detail");

  // State cho menu tải xuống (Bản gốc / Markdown)
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  // States cho quản lý Tag
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [originalTags, setOriginalTags] = useState<TagType[]>([]);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);

  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  // Đóng menu tải xuống khi click ra ngoài
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isDownloadMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(e.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDownloadMenuOpen]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  // --- QUERIES & MUTATIONS ---
  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...queryKeyPrefix, id],
    queryFn: () => fetchDocumentFn(id),
    enabled: !isNaN(id) && id > 0,
  });

  // Mutation cập nhật tên tài liệu
  const renameMutation = useMutation({
    mutationFn: (newTitle: string) => updateDocumentFn(id, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyPrefix, id] });
      setIsRenaming(false);
    },
    onError: (error) => {
      console.error("Lỗi khi đổi tên tài liệu:", error);
    },
  });

  const updateThumbnailMutation = useMutation({
    mutationFn: (base64: string) =>
      updateDocumentFn(id, { thumbnail_path: base64 } as any),
    onSuccess: (updated, base64) => {
      queryClient.setQueryData([...queryKeyPrefix, id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          thumbnail_path: updated?.thumbnail_path || base64,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      console.error("Không thể lưu ảnh bìa:", error);
    },
  });

  const updateThumbnailPageMutation = useMutation({
    mutationFn: (pageNumber: number) => {
      if (!updateThumbnailPageFn) {
        throw new Error("Không hỗ trợ tính năng này.");
      }
      return updateThumbnailPageFn(id, pageNumber);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...queryKeyPrefix, id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          thumbnail_path: updated?.thumbnail_path,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      console.error("Không thể lưu ảnh bìa PDF:", error);
      alert("Lỗi khi cập nhật ảnh bìa PDF");
    },
  });

  const handleStartRename = () => {
    if (!canEdit) return;
    setTempTitle(doc?.title || "");
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== doc?.title) {
      renameMutation.mutate(trimmed);
    } else {
      setIsRenaming(false);
    }
  };

  // Lấy danh sách Tag từ DB
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery<TagType[]>({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!doc) return;

    const tags: TagType[] = Array.isArray(doc.tags)
      ? doc.tags.map((tag: any) => ({
          id: Number(tag.id),
          name: tag.name,
          color: tag.color,
        }))
      : [];

    setSelectedTags(tags);
    setOriginalTags(tags);
  }, [doc]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocumentFn(id),
    onSuccess: () => {
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigate(backUrl);
      }
    },
  });

  // API TẠO TAG MỚI
  const createTagMutation = useMutation({
    mutationFn: (newTag: { name: string; color: string }) =>
      tagService.create(newTag),

    onSuccess: async (createdTag) => {
      setSelectedTags((prev) => {
        const exists = prev.some((tag) => tag.id === createdTag.id);
        if (exists) return prev;
        return [...prev, createdTag];
      });

      queryClient.setQueryData<TagType[]>(["all-tags"], (currentTags = []) => {
        const exists = currentTags.some((tag) => tag.id === createdTag.id);
        if (exists) return currentTags;
        return [...currentTags, createdTag];
      });

      setTagSearchQuery("");
      setSelectedColor(COLORS[0].hex);
    },
    onError: (error: any) => {
      console.error("Không thể tạo tag:", error);
      alert(error?.message || "Không thể tạo nhãn dán. Vui lòng thử lại.");
    },
  });

  // API LƯU TAGS CHO DOCUMENT
  const saveTagsMutation = useMutation({
    mutationFn: (tagIds: number[]) => {
      if (!id) {
        throw new Error("Không tìm thấy document ID");
      }
      return updateTagsFn(id, tagIds);
    },

    onSuccess: async (updatedDocument) => {
      const savedTags = updatedDocument?.tags ?? [];

      setSelectedTags(savedTags);
      setOriginalTags(savedTags);

      queryClient.setQueryData([...queryKeyPrefix, id], updatedDocument);

      await queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, id],
      });

      setIsTagEditorOpen(false);
      setTagSearchQuery("");
    },

    onError: (error: any) => {
      console.error("Không thể lưu tags:", error);
      alert(
        error?.response?.data?.detail ||
          "Không thể lưu nhãn dán. Vui lòng thử lại.",
      );
    },
  });

  // --- TAG HANDLERS ---
  const removeTagMutation = useMutation({
    mutationFn: (tagId: number) => {
      if (!id) {
        throw new Error("Không tìm thấy document ID");
      }
      return removeTagFn(id, tagId);
    },

    onSuccess: async (updatedDocument) => {
      const updatedTags: TagType[] = Array.isArray(updatedDocument?.tags)
        ? updatedDocument.tags.map((tag: any) => ({
            id: Number(tag.id),
            name: tag.name,
            color: tag.color,
          }))
        : [];

      setSelectedTags(updatedTags);
      setOriginalTags(updatedTags);

      queryClient.setQueryData([...queryKeyPrefix, id], updatedDocument);

      await queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, id],
      });
    },

    onError: (error: any) => {
      console.error("Không thể xóa tag:", error);
      alert(
        error?.response?.data?.detail ||
          "Không thể xóa nhãn dán. Vui lòng thử lại.",
      );
    },
  });

  const removeTag = (tagId: number) => {
    if (!id) {
      console.error("Document ID không hợp lệ");
      return;
    }

    if (removeTagMutation.isPending) {
      return;
    }

    removeTagMutation.mutate(tagId);
  };

  const toggleTag = (tag: TagType) => {
    setSelectedTags((prev) => {
      const exists = prev.some((item) => item.id === tag.id);
      if (exists) return prev.filter((item) => item.id !== tag.id);
      return [...prev, tag];
    });
  };

  const handleCreateNewTag = () => {
    if (tagSearchQuery.trim() === "") return;
    createTagMutation.mutate({
      name: tagSearchQuery.trim(),
      color: selectedColor,
    });
  };

  const handleSaveTags = () => {
    if (!id) {
      console.error("Document ID không hợp lệ");
      return;
    }
    const tagIds = selectedTags
      .map((tag) => Number(tag.id))
      .filter((tagId) => Number.isInteger(tagId));

    saveTagsMutation.mutate(tagIds);
  };

  // Derived state cho Tag Popover
  const selectedTagIds = selectedTags.map((t) => t.id);
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
  );
  const isExactMatch = allTags.some(
    (t) => t.name.toLowerCase() === tagSearchQuery.toLowerCase().trim(),
  );

  // --- LOADING / ERROR STATES ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500">Không tìm thấy tài liệu.</p>
        <button
          onClick={handleBack}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // Nếu đây là gói tài liệu (bundle), tự động điều hướng sang BundleDetailPage
  if (doc.is_bundle) {
    const isGroup = !!(params.id && params.docId);
    const targetUrl = isGroup
      ? `/groups/${params.id}/bundle/${doc.id}`
      : `/personal/bundle/${doc.id}`;
    return <Navigate to={targetUrl} replace />;
  }

  // --- DATA MAPPING ---
  const fileTypeLabel =
    FILE_TYPE_LABELS[doc.file_type ?? ""] ?? doc.file_type ?? "Không xác định";
  const iconType = MIME_TO_ICON_TYPE[doc.file_type ?? ""] ?? "default";
  const sizeLabel = formatSize(doc.file_size ?? 0);
  const uploadedAt = formatRelativeDate(doc.created_at);
  const fileDownloadUrl = doc.file_path
    ? `${import.meta.env.VITE_API_URL}/${doc.file_path}`
    : "#";

  // URL tải Markdown (nếu có)
  const markdownDownloadUrl = doc.markdown_path
    ? `${import.meta.env.VITE_API_URL}/${doc.markdown_path}`
    : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left Column: Preview & Content ── */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <FileIcon
              type={iconType}
              className="h-12 w-12 shrink-0"
              iconClassName="h-6 w-6"
            />
            <div className="min-w-0 flex-1">
              {isRenaming && canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename();
                      if (e.key === "Escape") setIsRenaming(false);
                    }}
                    autoFocus
                    className="w-full text-xl font-bold text-gray-900 rounded-lg border border-primary-500 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
                  />
                  <button
                    onClick={handleConfirmRename}
                    disabled={renameMutation.isPending}
                    className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shrink-0"
                    title="Lưu"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
                    title="Hủy"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900 leading-snug truncate">
                  {doc.title}
                </h1>
              )}
              <p className="text-sm text-gray-400 mt-1">
                Dung lượng: {sizeLabel} &nbsp;•&nbsp; Ngày tải: {uploadedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center border-b border-gray-200 -mx-5 px-5 gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors focus:outline-none",
                  activeTab === tab.key
                    ? "border-b-2 border-primary-600 text-primary-600"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-1">
            {activeTab === "detail" && (
              <TabDetail
                doc={doc}
                fileUrl={fileDownloadUrl}
                onUpdateThumbnail={
                  canEdit
                    ? (base64) => updateThumbnailMutation.mutate(base64)
                    : undefined
                }
                isUpdatingThumbnail={
                  canEdit ? updateThumbnailMutation.isPending : false
                }
                onUpdateThumbnailPage={
                  canEdit
                    ? (page) => updateThumbnailPageMutation.mutate(page)
                    : undefined
                }
                isUpdatingThumbnailPage={
                  canEdit
                    ? updateThumbnailPageMutation.isPending
                    : false
                }
              />
            )}
            {activeTab === "content" && (
              <TabContent content={doc.content || ""} />
            )}
            {activeTab === "description" && (
              <TabDescription
                description={doc.description ?? "Chưa có mô tả."}
              />
            )}
            {activeTab === "note" && <TabNote />}
            {activeTab === "activity" && <TabActivity />}
          </div>
        </Card>

        {/* ── Right Column: Info & Actions ── */}
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Thông tin tệp
            </h2>
            <div>
              <InfoRow
                label="Tên tệp"
                value={
                  doc.title.length > 22
                    ? doc.title.slice(0, 22) + "…"
                    : doc.title
                }
              />
              <InfoRow label="Loại tệp" value={fileTypeLabel} />
              <InfoRow label="Dung lượng" value={sizeLabel} />
              <InfoRow label="Ngày tải lên" value={uploadedAt} />
            </div>

            {/* Tags Section */}
            <div className="mt-5 relative">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Nhãn dán
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedTags.map((tag) => {
                  const baseColor = tag.color || "#2E7D32";
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{
                        color: baseColor,
                        backgroundColor: `${baseColor}1A`,
                        borderColor: `${baseColor}40`,
                      }}
                    >
                      {tag.name}
                      {canManageTags && (
                        <button
                          type="button"
                          onClick={() => removeTag(tag.id)}
                          disabled={removeTagMutation.isPending}
                          className="opacity-60 hover:opacity-100 transition-opacity focus:outline-none disabled:opacity-30"
                          title="Xóa tag khỏi tài liệu"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}

                {canManageTags && (
                  <button
                    onClick={() => {
                      if (!isTagEditorOpen) {
                        setOriginalTags([...selectedTags]);
                        setTagSearchQuery("");
                        setSelectedColor(COLORS[0].hex);
                      }
                      setIsTagEditorOpen((prev) => !prev);
                    }}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed text-gray-400 transition-colors",
                      isTagEditorOpen
                        ? "border-primary-500 text-primary-600 bg-primary-50"
                        : "border-gray-300 hover:border-primary-500 hover:text-primary-600",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* POPUP TAG EDITOR */}
              {isTagEditorOpen && canManageTags && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="mb-4">
                    <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                      <span>Gắn nhãn dán (Tags)</span>
                      <span className="text-xs font-normal text-gray-400">
                        Đã chọn {selectedTagIds.length}
                      </span>
                    </label>

                    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                      <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          placeholder="Tìm hoặc tạo tag mới..."
                          className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar">
                        {isLoadingTags ? (
                          <div className="w-full text-center text-xs text-gray-500 py-2">
                            Đang tải nhãn dán...
                          </div>
                        ) : tagSearchQuery.trim() !== "" && !isExactMatch ? (
                          <button
                            type="button"
                            onClick={handleCreateNewTag}
                            disabled={createTagMutation.isPending}
                            className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {createTagMutation.isPending
                              ? "Đang tạo..."
                              : `Tạo mới "${tagSearchQuery.trim()}"`}
                          </button>
                        ) : null}

                        {filteredTags.length > 0
                          ? filteredTags.map((tag) => {
                              const isSelected = selectedTagIds.includes(
                                tag.id,
                              );
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => toggleTag(tag)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                                    isSelected
                                      ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                                      : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600",
                                  )}
                                >
                                  {tag.name}
                                  {isSelected && <Check className="h-3 w-3" />}
                                </button>
                              );
                            })
                          : (isExactMatch || tagSearchQuery.trim() === "") &&
                            !isLoadingTags && (
                              <div className="w-full text-center text-xs text-gray-500 py-2">
                                Không tìm thấy tag phù hợp.
                              </div>
                            )}
                      </div>
                    </div>
                  </div>

                  {tagSearchQuery.trim() !== "" && !isExactMatch && (
                    <div className="mb-4 pt-2 border-t border-gray-100">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Màu sắc tag mới
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {COLORS.map((color) => {
                          const isSelected = selectedColor === color.hex;
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setSelectedColor(color.hex)}
                              className={cn(
                                `flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                                isSelected
                                  ? "ring-2 ring-gray-900 ring-offset-2"
                                  : "ring-1 ring-black/10",
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => {
                        setSelectedTags([...originalTags]);
                        setTagSearchQuery("");
                        setSelectedColor(COLORS[0].hex);
                        setIsTagEditorOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Huỷ bỏ
                    </button>
                    <Button
                      variant="primary"
                      className="h-8 text-xs px-4"
                      onClick={handleSaveTags}
                      disabled={
                        saveTagsMutation.isPending ||
                        createTagMutation.isPending
                      }
                    >
                      {saveTagsMutation.isPending
                        ? "Đang lưu..."
                        : "Lưu thay đổi"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 flex justify-around border-t border-gray-100 pt-4">
              <StatItem label="Lượt xem" value={0} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Tải xuống" value={0} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Đã chia sẻ" value={0} />
            </div>
          </Card>

          {/* Actions Card */}
          <Card className="flex flex-col gap-3">
            {/* ── Nút Tải xuống có lựa chọn định dạng ── */}
            <div className="relative" ref={downloadMenuRef}>
              <Button
                variant="primary"
                className="w-full py-3 h-auto text-base flex items-center justify-center gap-2"
                onClick={() => {
                  if (markdownDownloadUrl) {
                    setIsDownloadMenuOpen((prev) => !prev);
                  } else {
                    // Tải bản gốc trực tiếp
                    const link = window.document.createElement("a");
                    link.href = fileDownloadUrl;
                    link.download = doc.title;
                    link.target = "_blank";
                    link.click();
                  }
                }}
                icon={<Download className="h-5 w-5" />}
              >
                <span>Tải xuống tài liệu</span>
                {markdownDownloadUrl && (
                  <span className="text-xs bg-primary-700 px-1.5 py-0.5 rounded ml-1">
                    Tùy chọn ▼
                  </span>
                )}
              </Button>

              {/* Popup Menu lựa chọn định dạng */}
              {isDownloadMenuOpen && markdownDownloadUrl && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 flex flex-col gap-1">
                  <a
                    href={fileDownloadUrl}
                    download={doc.title}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsDownloadMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span>Tải về bản gốc</span>
                    <span className="text-xs text-gray-400 uppercase">
                      {fileTypeLabel.split(" ")[0]}
                    </span>
                  </a>

                  <a
                    href={markdownDownloadUrl}
                    download={`${doc.title}.md`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsDownloadMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border-t border-gray-100"
                  >
                    <span>Tải về định dạng Markdown</span>
                    <span className="text-xs font-bold bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                      .MD
                    </span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-col mt-1">
              {[
                {
                  icon: ExternalLink,
                  label: "Mở trong thẻ mới",
                  onClick: () => window.open(fileDownloadUrl, "_blank"),
                  show: true,
                },
                {
                  icon: Share2,
                  label: "Chia sẻ tài liệu",
                  onClick: () => console.log("Chia sẻ"),
                  show: true,
                },
                {
                  icon: Star,
                  label: "Thêm vào yêu thích",
                  onClick: () => console.log("Yêu thích"),
                  show: true,
                },
                {
                  icon: FolderInput,
                  label: "Di chuyển tệp",
                  onClick: () => console.log("Di chuyển"),
                  show: true,
                },
                ...(canEdit
                  ? [
                      {
                        icon: Edit2,
                        label: renameMutation.isPending
                          ? "Đang lưu..."
                          : "Đổi tên tệp",
                        onClick: handleStartRename,
                        disabled: renameMutation.isPending,
                        show: true,
                      },
                    ]
                  : []),
              ]
                .filter((item) => item.show)
                .map(({ icon: Icon, label, onClick, disabled }) => (
                  <button
                    key={label}
                    disabled={disabled}
                    className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    onClick={onClick}
                  >
                    <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                    {label}
                  </button>
                ))}

              {canDelete && (
                <div className="border-t border-gray-200 mt-1 pt-1">
                  <button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.",
                        )
                      ) {
                        deleteMutation.mutate();
                      }
                    }}
                    className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    {deleteMutation.isPending ? "Đang xóa..." : "Xóa tài liệu"}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}