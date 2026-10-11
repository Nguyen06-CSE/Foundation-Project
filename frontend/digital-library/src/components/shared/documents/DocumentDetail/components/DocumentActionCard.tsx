// src/components/shared/documents/DocumentDetail/components/DocumentActionCard.tsx

import { useState, useRef, useEffect } from "react";
import {
  Download,
  ExternalLink,
  Share2,
  Star,
  FolderInput,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DocumentActionCardProps {
  fileTitle: string;
  fileDownloadUrl: string;
  markdownDownloadUrl: string | null;
  fileTypeLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  isRenamePending: boolean;
  isDeletePending: boolean;
  onStartRename: () => void;
  onDelete: () => void;
}

/**
 * DocumentActionCard - Card thực hiện các hành động với tài liệu
 *
 * Tính năng chính:
 * 1. Nút Tải xuống:
 *    - Tải bản gốc trực tiếp hoặc mở dropdown chọn giữa Bản gốc và Markdown
 *    - Tự động đóng dropdown khi nhấn ra ngoài
 * 2. Các nút hành động nhanh:
 *    - Mở trong thẻ mới
 *    - Chia sẻ tài liệu
 *    - Thêm vào yêu thích
 *    - Di chuyển tệp
 *    - Đổi tên tệp (nếu có quyền sửa)
 *    - Xóa tài liệu kèm hộp thoại xác nhận (nếu có quyền xóa)
 */
export function DocumentActionCard({
  fileTitle,
  fileDownloadUrl,
  markdownDownloadUrl,
  fileTypeLabel,
  canEdit,
  canDelete,
  isRenamePending,
  isDeletePending,
  onStartRename,
  onDelete,
}: DocumentActionCardProps) {
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  /**
   * Đóng menu tải xuống khi click ra ngoài vùng dropdown
   */
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

  /**
   * Xử lý khi nhấn nút Tải xuống
   */
  const handleDownloadClick = () => {
    if (markdownDownloadUrl) {
      setIsDownloadMenuOpen((prev) => !prev);
    } else {
      // Tải bản gốc trực tiếp nếu không có Markdown
      const link = window.document.createElement("a");
      link.href = fileDownloadUrl;
      link.download = fileTitle;
      link.target = "_blank";
      link.click();
    }
  };

  /**
   * Xử lý xác nhận xóa tài liệu
   */
  const handleDeleteClick = () => {
    if (
      window.confirm(
        "Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.",
      )
    ) {
      onDelete();
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      {/* Nút Tải xuống có lựa chọn định dạng */}
      <div className="relative" ref={downloadMenuRef}>
        <Button
          variant="primary"
          className="w-full py-3 h-auto text-base flex items-center justify-center gap-2"
          onClick={handleDownloadClick}
          icon={<Download className="h-5 w-5" />}
        >
          <span>Tải xuống tài liệu</span>
          {markdownDownloadUrl && (
            <span className="text-xs bg-primary-700 px-1.5 py-0.5 rounded ml-1">
              Tùy chọn ▼
            </span>
          )}
        </Button>

        {/* Menu chọn định dạng tải về */}
        {isDownloadMenuOpen && markdownDownloadUrl && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 flex flex-col gap-1">
            <a
              href={fileDownloadUrl}
              download={fileTitle}
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
              download={`${fileTitle}.md`}
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

      {/* Danh sách hành động khác */}
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
                  label: isRenamePending ? "Đang lưu..." : "Đổi tên tệp",
                  onClick: onStartRename,
                  disabled: isRenamePending,
                  show: true,
                },
              ]
            : []),
        ]
          .filter((item) => item.show)
          .map(({ icon: Icon, label, onClick, disabled }) => (
            <button
              key={label}
              type="button"
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
              type="button"
              disabled={isDeletePending}
              onClick={handleDeleteClick}
              className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {isDeletePending ? "Đang xóa..." : "Xóa tài liệu"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
