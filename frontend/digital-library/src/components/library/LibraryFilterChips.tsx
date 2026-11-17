// frontend/digital-library/src/components/library/LibraryFilterChips.tsx

import { GraduationCap, FileText, ArrowUpDown, RotateCcw } from "lucide-react";
import type { Faculty } from "@/types/library";
import { cn } from "@/utils/cn";

export const DOC_TYPES = [
  "Tất cả loại",
  "Giáo trình",
  "Đề thi",
  "Slide bài giảng",
  "Bài tập",
  "Khác",
] as const;

export type SortOption = "popular" | "rating" | "newest";

export interface LibraryFilterChipsProps {
  faculties: Faculty[];
  selectedFacultyId: number | null;
  onSelectFaculty: (facultyId: number | null) => void;
  selectedDocType: string | null;
  onSelectDocType: (docType: string | null) => void;
  sortBy: SortOption;
  onSelectSort: (sort: SortOption) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  className?: string;
}

export function LibraryFilterChips({
  faculties,
  selectedFacultyId,
  onSelectFaculty,
  selectedDocType,
  onSelectDocType,
  sortBy,
  onSelectSort,
  onResetFilters,
  hasActiveFilters,
  className = "",
}: LibraryFilterChipsProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs", className)}>
      {/* Row 1: Khoa Đào Tạo Chips (Cuộn ngang) */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-500 mr-1 hidden sm:inline-flex">
          <GraduationCap className="h-3.5 w-3.5 text-primary-600" />
          Khoa:
        </span>

        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none custom-scrollbar">
          <button
            type="button"
            onClick={() => onSelectFaculty(null)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              selectedFacultyId === null
                ? "bg-primary-600 text-white shadow-xs font-semibold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            )}
          >
            Tất cả khoa ({faculties.length})
          </button>

          {faculties.map((f) => {
            const isSelected = selectedFacultyId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFaculty(isSelected ? null : f.id)}
                title={f.name}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-primary-600 text-white shadow-xs font-semibold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                )}
              >
                <span>{f.code || f.name}</span>
                {f.document_count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    )}
                  >
                    {f.document_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Row 2: Loại tài liệu & Sắp xếp & Nút Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Loại tài liệu Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-500 mr-1 hidden sm:inline-flex">
            <FileText className="h-3.5 w-3.5 text-primary-600" />
            Loại:
          </span>

          {DOC_TYPES.map((dt) => {
            const isAll = dt === "Tất cả loại";
            const isSelected = isAll
              ? !selectedDocType || selectedDocType === "Tất cả"
              : selectedDocType === dt;

            return (
              <button
                key={dt}
                type="button"
                onClick={() => onSelectDocType(isAll ? null : dt)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-primary-50 text-primary-700 font-semibold border border-primary-200 shadow-2xs"
                    : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"
                )}
              >
                {dt}
              </button>
            );
          })}
        </div>

        {/* Sort Controls & Reset Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500 font-medium hidden sm:inline">Xếp theo:</span>
            <select
              value={sortBy}
              aria-label="Sắp xếp danh sách tài liệu"
              onChange={(e) => onSelectSort(e.target.value as SortOption)}
              className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-800 focus:border-primary-500 focus:outline-none"
            >
              <option value="popular">Phổ biến nhất (thịnh hành & tải)</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="newest">Mới cập nhật</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibraryFilterChips;
