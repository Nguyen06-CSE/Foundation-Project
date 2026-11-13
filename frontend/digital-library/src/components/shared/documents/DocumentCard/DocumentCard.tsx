// src/components/shared/DocumentCard.tsx

import { Check } from "lucide-react";
import { FileDocumentCard } from "./FileDocumentCard";
import { BundleDocumentCard } from "./BundleDocumentCard";
import { CommunityDocumentCard } from "./CommunityDocumentCard";
import { cn } from "@/utils/cn";
import type {
  DocumentItem,
  DocumentCardProps,
  DocumentTag,
} from "./DocumentCard.types";

export type { DocumentItem, DocumentCardProps, DocumentTag };

// ======================================================
// Main Router / Wrapper Component
// ======================================================

export function DocumentCard(props: DocumentCardProps) {
  const { isSelected = false, onToggleSelect, variant } = props;

  const isCommunity = variant === "community" || props.document.rating_avg !== undefined;

  return (
    <div
      className={cn(
        "relative group/select rounded-xl transition-all",
        isSelected && "ring-2 ring-primary-500 ring-offset-1"
      )}
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(props.document.id);
          }}
          title={isSelected ? "Bỏ chọn tài liệu" : "Chọn tài liệu"}
          className={cn(
            "absolute top-2.5 right-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-md border shadow-xs transition-all cursor-pointer",
            isSelected
              ? "bg-primary-600 border-primary-600 text-white opacity-100"
              : "bg-white/95 border-gray-300 text-transparent opacity-0 group-hover/select:opacity-100 hover:border-primary-500"
          )}
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </button>
      )}
      {isCommunity ? (
        <CommunityDocumentCard {...props} />
      ) : props.document.is_bundle ? (
        <BundleDocumentCard {...props} />
      ) : (
        <FileDocumentCard {...props} />
      )}
    </div>
  );
}