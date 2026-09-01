// src/components/shared/DocumentCard.tsx

import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { FileIcon, type FileTypeMap } from "@/components/shared/FileIcon";
import { DocumentContextMenu, type DocumentAction } from "@/components/shared/DocumentContextMenu";

// Hàm phụ trợ giúp chuyển đổi MIME type thành đuôi file ngắn gọn
const getFileExtension = (type: string) => {
  if (!type) return "";
  // Nếu type đã là dạng ngắn như "pdf", "docx" thì dùng luôn
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) {
    cleanType = cleanType.substring(1);
  }

  // Map từ MIME type sang đuôi file phổ biến
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };

  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

export interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    type: FileTypeMap | string;
    updatedAt: string;
    size: string;
    extension?: string;
  };
  onAction: (action: DocumentAction, documentId: string) => void;
}

export function DocumentCard({ document, onAction }: DocumentCardProps) {
  const navigate = useNavigate();

  const handleAction = (action: DocumentAction, id: string) => {
    if (action === "view") {
      navigate(`/personal/documents/${id}`);
    } else {
      onAction(action, id);
    }
  };

  // Lấy đuôi file đã được làm sạch
  const ext = getFileExtension(document.extension || document.type);
  const formattedExt = ext ? `.${ext}` : "";

  return (
    <Card className="flex aspect-[1/0.82] flex-col relative hover:shadow-md transition-shadow duration-200 hover:-translate-y-0.5 transform transition-transform group cursor-pointer p-0">
      {/* Preview Icon */}
      <div
        className="flex flex-[0_0_60%] items-center justify-center bg-gray-50"
        onClick={() => navigate(`/personal/documents/${document.id}`)}
      >
        <FileIcon type={document.type} className="h-16 w-16" iconClassName="h-8 w-8" />
      </div>

      {/* Footer */}
      <div className="flex flex-1 justify-between items-start gap-2 bg-white px-3 py-3 rounded-b-xl">
        <div className="min-w-0 flex-1" onClick={() => navigate(`/personal/documents/${document.id}`)}>
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug flex items-baseline gap-1" title={document.name}>
            <span className="truncate">{document.name}</span>
            {formattedExt && (
              <span className="text-gray-400 font-normal shrink-0 font-mono text-xs">
                ({formattedExt})
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {document.size} • {document.updatedAt}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1">
          <DocumentContextMenu onAction={(action) => handleAction(action, document.id)} />
        </div>
      </div>
    </Card>
  );
}