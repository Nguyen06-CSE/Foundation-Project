// frontend/digital-library/src/components/shared/TagSelector.tsx

import { useState, useMemo } from "react";
import { Search, Plus, Check } from "lucide-react";
import { cn } from "@/utils/cn";

export interface TagItem {
  id: number;
  name: string;
  color?: string;
}

export const TAG_COLORS = [
  { hex: "#4CAF50", tw: "bg-green-500" },
  { hex: "#2196F3", tw: "bg-blue-500" },
  { hex: "#F59E0B", tw: "bg-amber-500" },
  { hex: "#9C27B0", tw: "bg-purple-500" },
  { hex: "#EF4444", tw: "bg-red-500" },
  { hex: "#06B6D4", tw: "bg-cyan-500" },
  { hex: "#F97316", tw: "bg-orange-500" },
  { hex: "#64748B", tw: "bg-slate-500" },
];

export interface TagSelectorProps {
  availableTags: TagItem[];
  selectedTagIds: number[];
  onToggleTag: (tag: TagItem) => void;
  onCreateTag?: (name: string, color: string) => Promise<void>;
  isLoading?: boolean;
  isCreating?: boolean;
  className?: string;
  listMaxHeight?: string;
  placeholder?: string;
}

export function TagSelector({
  availableTags = [],
  selectedTagIds = [],
  onToggleTag,
  onCreateTag,
  isLoading = false,
  isCreating = false,
  className,
  listMaxHeight = "max-h-36",
  placeholder = "Tìm hoặc tạo tag mới...",
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].hex);

  const filteredTags = useMemo(() => {
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableTags, searchQuery]);

  const isExactMatch = useMemo(() => {
    return availableTags.some(
      (tag) => tag.name.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [availableTags, searchQuery]);

  const handleCreate = async () => {
    const name = searchQuery.trim();
    if (!name || !onCreateTag) return;
    
    await onCreateTag(name, newTagColor);
    setSearchQuery("");
    setNewTagColor(TAG_COLORS[0].hex);
  };

  const showCreateOptions = searchQuery.trim() !== "" && !isExactMatch && onCreateTag;

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-gray-50/50 p-3", className)}>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {showCreateOptions && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
          <label className="mb-2 block text-xs font-semibold text-gray-700">
            Màu sắc cho tag mới
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {TAG_COLORS.map((color) => {
              const isSelected = newTagColor === color.hex;
              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setNewTagColor(color.hex)}
                  className={cn(
                    `flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                    isSelected
                      ? "ring-2 ring-gray-900 ring-offset-1"
                      : "ring-1 ring-black/10"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={cn("overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar", listMaxHeight)}>
        {isLoading ? (
          <div className="w-full text-center text-xs text-gray-500 py-2">
            Đang tải nhãn dán...
          </div>
        ) : (
          <>
            {showCreateOptions && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {isCreating ? "Đang tạo..." : `Tạo mới "${searchQuery.trim()}"`}
              </button>
            )}

            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      isSelected
                        ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                    )}
                  >
                    {tag.name}
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                );
              })
            ) : (!showCreateOptions && searchQuery.trim() !== "") ? (
              <div className="w-full text-center text-xs text-gray-500 py-2">
                Không tìm thấy tag phù hợp.
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}