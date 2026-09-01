// src/components/ui/Tag.tsx

import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface TagProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

const Tag = ({ label, onRemove, className }: TagProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-primary-700 hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export { Tag };
