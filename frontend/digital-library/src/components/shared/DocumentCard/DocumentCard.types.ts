import type { FileTypeMap } from "@/components/shared/FileIcon";
import type { DocumentAction, DocumentMenuItem } from "@/components/shared/DocumentContextMenu";

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
  tags?: DocumentTag[];
  is_bundle?: boolean;
  bundle_parent_id?: number | null;
  bundle_children_count?: number | null;
}

export interface DocumentCardProps {
  document: DocumentItem;
  onAction: (action: DocumentAction | string, documentId: string) => void;
  basePath?: string;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
}