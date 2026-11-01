import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatSize } from "@/utils/formatSize";

export interface StatCardsProps {
  totalPersonalDocs: number;
  newDocs7d: number;
  usedBytes: number;
  quotaBytes: number;
  sharedDocsCount: number;
  favoriteCount: number;
  approvedContributions: number;
  contributedDownloads: number;
}

export function StatCards({
  totalPersonalDocs,
  newDocs7d,
  usedBytes,
  quotaBytes,
  sharedDocsCount,
  favoriteCount,
  approvedContributions,
  contributedDownloads,
}: StatCardsProps) {
  const percentUsed = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-3 xl:grid-cols-5">
      <div className="min-w-0 border-b border-r border-gray-100 p-4 sm:border-b-0 xl:p-5">
        <p className="text-xs font-medium text-gray-500">Tổng tài liệu</p>
        <p className="mt-1 text-2xl font-bold leading-none text-gray-900">{totalPersonalDocs.toLocaleString()}</p>
        <p className="mt-1 text-[11px] text-gray-500">+{newDocs7d} trong 7 ngày</p>
      </div>
      <div className="min-w-0 border-b border-gray-100 p-4 sm:border-r xl:border-b-0 xl:p-5">
        <p className="text-xs font-medium text-gray-500">Dung lượng</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold leading-none text-gray-900">{formatSize(usedBytes)}</span>
          <span className="text-xs text-gray-500">/ {formatSize(quotaBytes)}</span>
        </p>
        <div className="mt-2">
          <ProgressBar value={percentUsed} color={percentUsed > 90 ? "bg-red-500" : percentUsed > 75 ? "bg-amber-500" : "bg-primary-600"} className="h-1.5" />
        </div>
      </div>
      <div className="min-w-0 border-b border-r border-gray-100 p-4 sm:border-b-0 sm:border-r-0 xl:border-r xl:p-5">
        <p className="text-xs font-medium text-gray-500">Đã chia sẻ</p>
        <p className="mt-1 text-2xl font-bold leading-none text-gray-900">{sharedDocsCount.toLocaleString()}</p>
        <p className="mt-1 text-[11px] text-gray-500">Vào các nhóm</p>
      </div>
      <div className="min-w-0 border-r border-gray-100 p-4 xl:p-5">
        <p className="text-xs font-medium text-gray-500">Yêu thích</p>
        <p className="mt-1 text-2xl font-bold leading-none text-gray-900">{favoriteCount.toLocaleString()}</p>
        <p className="mt-1 text-[11px] text-gray-500">Tài liệu gắn sao</p>
      </div>
      <div className="min-w-0 p-4 xl:p-5">
        <p className="text-xs font-medium text-gray-500">Học liệu đã đóng góp</p>
        <p className="mt-1 text-2xl font-bold leading-none text-gray-900">{approvedContributions.toLocaleString()}</p>
        <p className="mt-1 text-[11px] text-gray-500">{contributedDownloads.toLocaleString()} lượt tải</p>
      </div>
    </div>
  );
}
