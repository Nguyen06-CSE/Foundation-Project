// src/components/shared/DocumentCard.tsx

import { Check } from "lucide-react";
import { FileDocumentCard } from "./FileDocumentCard";
import { BundleDocumentCard } from "./BundleDocumentCard";
import { cn } from "@/utils/cn";
import type { FileTypeMap } from "@/components/shared/documents/FileIcon";
import type { DocumentAction, DocumentMenuItem } from "@/components/shared/documents/DocumentContextMenu";

// ======================================================
// Types
// ======================================================

export interface DocumentTag {
  id: number;
  name: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: FileTypeMap | string;
  updatedAt: string;
  size: string;
  extension?: string;
  thumbnail_path?: string | null;
  markdown_path?: string | null;
  markdownPath?: string | null;
  tags?: DocumentTag[];
  is_bundle?: boolean;
  bundle_parent_id?: number | null;
  bundle_children_count?: number | null;
  view_count?: number;
  personal_view_count?: number;
  trending_score?: number;
}

export interface DocumentCardProps {
  document: DocumentItem;
  onAction: (action: DocumentAction | string, documentId: string) => void;
  basePath?: string;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

// ======================================================
// Main Router / Wrapper Component
// ======================================================

export function DocumentCard(props: DocumentCardProps) {
  const { isSelected = false, onToggleSelect } = props;

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
      {props.document.is_bundle ? (
        <BundleDocumentCard {...props} />
      ) : (
        <FileDocumentCard {...props} />
      )}
    </div>
  );
}