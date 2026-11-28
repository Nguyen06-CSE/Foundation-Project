import type { SearchMatchField } from "@/types/search";
import { SEARCH_MATCH_FIELDS } from "@/utils/searchFields";
import { cn } from "@/utils/cn";

interface SearchFieldFilterProps {
  fields: SearchMatchField[];
  onToggle: (field: SearchMatchField) => void;
}

const FIELD_LABELS: Record<SearchMatchField, string> = {
  title: "Tiêu đề",
  content: "Nội dung",
  semantic: "Theo nghĩa",
};

export function SearchFieldFilter({ fields, onToggle }: SearchFieldFilterProps) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-3"
      role="group"
      aria-label="Trường tìm kiếm"
    >
      <span className="text-xs text-gray-500">Trường:</span>
      {SEARCH_MATCH_FIELDS.map((field) => {
        const checked = fields.includes(field);
        return (
          <label
            key={field}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
              checked
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-200 bg-white text-gray-600",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={checked && fields.length === 1}
              onChange={() => onToggle(field)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
            />
            {FIELD_LABELS[field]}
          </label>
        );
      })}
    </div>
  );
}

export default SearchFieldFilter;
