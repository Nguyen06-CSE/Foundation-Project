import { Bookmark } from "lucide-react";
import type { MouseEvent } from "react";
import { useFavoriteStore, type FavoriteDocument } from "@/stores/favoriteStore";
import { cn } from "@/utils/cn";

interface TikTokFavoriteButtonProps {
  document: FavoriteDocument;
  variant?: "vertical" | "compact";
  showCount?: boolean;
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

/** Nút lưu/bỏ lưu tài liệu theo phong cách dấu trang TikTok. */
export function TikTokFavoriteButton({
  document,
  variant = "compact",
  showCount = false,
  className,
  onToggle,
}: TikTokFavoriteButtonProps) {
  const isFavorite = useFavoriteStore((state) =>
    state.favorites.some((item) => String(item.id) === String(document.id)),
  );
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const vertical = variant === "vertical";

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(document);
    onToggle?.(!isFavorite);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
      aria-pressed={isFavorite}
      title={isFavorite ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        vertical
          ? "min-w-8 flex-col gap-0.5 rounded-full px-1.5 py-1 text-white drop-shadow-md"
          : "gap-1 rounded-full p-1.5 hover:bg-amber-50",
        className,
      )}
    >
      <Bookmark
        className={cn(
          vertical ? "h-6 w-6" : "h-5 w-5",
          isFavorite ? "fill-amber-400 text-amber-500" : vertical ? "text-white" : "text-gray-600",
        )}
        strokeWidth={2.2}
      />
      {showCount && (
        <span
          className={cn(
            "text-[10px] font-semibold leading-none",
            vertical ? "text-white" : isFavorite ? "text-amber-600" : "text-gray-500",
          )}
        >
          {isFavorite ? "Đã lưu" : "Lưu"}
        </span>
      )}
    </button>
  );
}

export default TikTokFavoriteButton;
