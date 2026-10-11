// src/components/shared/documents/DocumentDetail/components/DocumentTitleHeader.tsx

import { Check, X } from "lucide-react";
import { FileIcon } from "@/components/shared/documents/FileIcon";

interface DocumentTitleHeaderProps {
  title: string;
  iconType: string;
  sizeLabel: string;
  uploadedAt: string;
  canEdit: boolean;
  isRenaming: boolean;
  tempTitle: string;
  setTempTitle: (val: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  isRenamePending: boolean;
}

/**
 * DocumentTitleHeader - Header của Card chi tiết tài liệu
 *
 * Tính năng chính:
 * 1. Hiển thị Icon tương ứng với định dạng tệp
 * 2. Hiển thị tiêu đề tài liệu kèm chức năng đổi tên trực tiếp (Inline Rename)
 * 3. Hỗ trợ phím tắt Enter (Lưu) và Escape (Hủy) khi đổi tên
 * 4. Hiển thị dung lượng và ngày tải lên
 */
export function DocumentTitleHeader({
  title,
  iconType,
  sizeLabel,
  uploadedAt,
  canEdit,
  isRenaming,
  tempTitle,
  setTempTitle,
  onConfirmRename,
  onCancelRename,
  isRenamePending,
}: DocumentTitleHeaderProps) {
  return (
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
                if (e.key === "Enter") onConfirmRename();
                if (e.key === "Escape") onCancelRename();
              }}
              autoFocus
              className="w-full text-xl font-bold text-gray-900 rounded-lg border border-primary-500 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
            />
            <button
              type="button"
              onClick={onConfirmRename}
              disabled={isRenamePending}
              className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shrink-0 disabled:opacity-50"
              title="Lưu"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCancelRename}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
              title="Hủy"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-gray-900 leading-snug truncate">
            {title}
          </h1>
        )}
        <p className="text-sm text-gray-400 mt-1">
          Dung lượng: {sizeLabel} &nbsp;•&nbsp; Ngày tải: {uploadedAt}
        </p>
      </div>
    </div>
  );
}
