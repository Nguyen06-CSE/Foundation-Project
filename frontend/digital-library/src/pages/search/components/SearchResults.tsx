import { AlertCircle, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SearchResultItem } from "@/types/search";
import { SearchResultCard } from "./SearchResultCard";

interface SearchResultsProps {
  query: string;
  items: SearchResultItem[];
  total: number;
  page: number;
  totalPages: number;
  isFetching: boolean;
  isError: boolean;
  semanticUnavailable: boolean;
  semanticOnly: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function SearchResults({
  query,
  items,
  total,
  page,
  totalPages,
  isFetching,
  isError,
  semanticUnavailable,
  semanticOnly,
  onPrevPage,
  onNextPage,
}: SearchResultsProps) {
  return (
    <div className="space-y-4">
      {semanticUnavailable && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {semanticOnly
            ? "Chưa tìm bằng nghĩa được. Vui lòng thử lại hoặc chọn thêm tiêu đề/nội dung."
            : "Tìm kiếm theo nghĩa chưa sẵn sàng; hệ thống chỉ dùng các trường đã chọn."}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600">
        {isFetching && !items.length ? (
          <span>Đang tìm kiếm...</span>
        ) : semanticUnavailable && semanticOnly ? (
          <span>Chưa thực hiện được tìm kiếm theo nghĩa</span>
        ) : (
          <span>
            Tìm thấy <strong className="text-gray-900">{total}</strong> kết quả
            {semanticUnavailable ? " từ các trường đã chạy" : ""} cho "{query}"
          </span>
        )}
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
          Không thể tải kết quả tìm kiếm. Vui lòng thử lại.
        </p>
      )}

      {isFetching && !items.length && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex animate-pulse items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-1/4 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isFetching && items.length === 0 && !isError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-300" />
          <h3 className="text-base font-medium text-gray-900">
            {semanticUnavailable && semanticOnly
              ? "Chưa tìm bằng nghĩa được"
              : "Không tìm thấy tài liệu nào"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {semanticUnavailable && semanticOnly
              ? "Đây không phải là không có tài liệu; tính năng tìm theo nghĩa đang không sẵn sàng."
              : "Thử tìm với từ khóa khác ngắn gọn hoặc chung chung hơn."}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <SearchResultCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          <Button
            variant="outline"
            onClick={onPrevPage}
            disabled={page === 1 || isFetching}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Trước
          </Button>
          <span className="text-sm text-gray-600">
            Trang <strong className="font-medium text-gray-900">{page}</strong> / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={onNextPage}
            disabled={page === totalPages || isFetching}
          >
            Sau <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default SearchResults;
