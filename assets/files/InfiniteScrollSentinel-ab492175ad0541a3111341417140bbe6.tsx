// frontend/digital-library/src/components/shared/documents/InfiniteScrollSentinel.tsx

import React, { useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface InfiniteScrollSentinelProps {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isError?: boolean;
  totalItems?: number;
  rootMargin?: string;
}

export const InfiniteScrollSentinel: React.FC<InfiniteScrollSentinelProps> = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isError,
  totalItems = 0,
  rootMargin = "200px",
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || isError) return;

    let triggered = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && !triggered) {
          triggered = true;
          fetchNextPage();
        }
      },
      {
        rootMargin,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage, rootMargin]);

  if (isError) {
    return (
      <div className="py-6 flex flex-col items-center justify-center gap-2 text-sm text-red-500">
        <p>Không thể tải thêm tài liệu do sự cố kết nối.</p>
        <button
          type="button"
          onClick={() => fetchNextPage()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div
      ref={sentinelRef}
      className="py-6 flex items-center justify-center min-h-[48px]"
    >
      {isFetchingNextPage && (
        <div className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
          <span>Đang tải thêm tài liệu...</span>
        </div>
      )}
      {!hasNextPage && totalItems > 0 && (
        <span className="text-xs text-gray-400 select-none">
          Đã hiển thị tất cả ({totalItems}) tài liệu
        </span>
      )}
    </div>
  );
};
