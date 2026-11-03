import { CheckSquare, Download, Share2, Trash2, X } from "lucide-react";

export interface DocumentBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkContribute?: () => void;
  onBulkDelete?: () => void;
  isProcessing?: boolean;
}

export function DocumentBulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkContribute,
  onBulkDelete,
  isProcessing = false,
}: DocumentBulkActionBarProps) {
  if (selectedCount === 0) return null;

  const isAllSelected = totalCount > 0 && selectedCount >= totalCount;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
        <span className="inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold">
          {selectedCount}
        </span>
        <span className="text-xs sm:text-sm font-medium text-slate-200">
          đã chọn
        </span>
      </div>

      <button
        type="button"
        onClick={isAllSelected ? onClearSelection : onSelectAll}
        disabled={isProcessing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <CheckSquare className="h-3.5 w-3.5 text-primary-400" />
        {isAllSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${totalCount})`}
      </button>

      <div className="h-4 w-px bg-slate-700 hidden sm:block" />

      <button
        type="button"
        onClick={onBulkDownload}
        disabled={isProcessing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5 text-sky-400" />
        Tải xuống (.zip)
      </button>

      {onBulkContribute && (
        <button
          type="button"
          onClick={onBulkContribute}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <Share2 className="h-3.5 w-3.5" />
          Đóng góp
        </button>
      )}

      {onBulkDelete && (
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/90 hover:bg-red-600 text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xóa ({selectedCount})
        </button>
      )}

      <button
        type="button"
        onClick={onClearSelection}
        disabled={isProcessing}
        title="Đóng thanh chọn"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
