import { Sparkles } from "lucide-react";
import type { SearchMode } from "@/types/search";
import { cn } from "@/utils/cn";

interface SearchModeToggleProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

const MODES: { key: SearchMode; label: string }[] = [
  { key: "keyword", label: "Từ khóa" },
  { key: "hybrid", label: "Kết hợp" },
];

export function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  return (
    <div className="mt-3 flex items-center gap-2" role="group" aria-label="Chế độ tìm kiếm">
      <span className="text-xs text-gray-500">Chế độ:</span>
      {MODES.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={mode === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
            mode === option.key
              ? "border-primary-300 bg-primary-50 font-medium text-primary-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          {option.key === "hybrid" && <Sparkles className="h-3 w-3" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SearchModeToggle;
