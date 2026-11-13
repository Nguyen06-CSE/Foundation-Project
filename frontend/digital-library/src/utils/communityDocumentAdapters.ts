// src/utils/communityDocumentAdapters.ts

import type { CommunityDocument } from "@/types/library";
import type { DocumentItem } from "@/components/shared/documents/DocumentCard/DocumentCard.types";
import type { DocumentListItem } from "@/components/shared/documents/documentView.types";
import { formatRelativeDate } from "@/utils/formatDate";
import { formatSize } from "@/utils/formatSize";

export function toCommunityDocItem(doc: CommunityDocument): DocumentItem {
  return {
    id: String(doc.id),
    name: doc.title,
    type: doc.file_type || "pdf",
    updatedAt: doc.created_at ? formatRelativeDate(doc.created_at) : "Mới đây",
    size: formatSize(doc.file_size || 0),
    extension: doc.file_type || "pdf",
    owner: { name: doc.contributed_by },
    rating_avg: doc.rating_avg,
    rating_count: doc.rating_count,
    download_count: doc.download_count,
    doc_type: doc.doc_type,
    academic_year: doc.academic_year,
    tags: [
      ...(doc.doc_type ? [{ id: 1, name: doc.doc_type }] : []),
      ...(doc.academic_year ? [{ id: 2, name: doc.academic_year }] : []),
    ],
  };
}

export function toCommunityListItem(doc: CommunityDocument): DocumentListItem {
  return {
    id: doc.id,
    title: doc.title,
    type: doc.file_type || "pdf",
    extension: doc.file_type || "pdf",
    updatedAt: doc.created_at || undefined,
    size: doc.file_size || 0,
    owner: { full_name: doc.contributed_by },
    workspace_type: "community",
    description: doc.description || undefined,
    rating_avg: doc.rating_avg,
    rating_count: doc.rating_count,
    download_count: doc.download_count,
    view_count: doc.download_count,
    doc_type: doc.doc_type,
    academic_year: doc.academic_year,
    tags: [
      ...(doc.doc_type ? [{ id: 1, name: doc.doc_type }] : []),
      ...(doc.academic_year ? [{ id: 2, name: doc.academic_year }] : []),
    ],
  };
}
