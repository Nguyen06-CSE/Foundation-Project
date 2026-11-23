// frontend/digital-library/src/utils/matchesLoadedFilters.ts

import { CODE_EXTENSIONS, getNormalizedExtension } from "@/hooks/useDocumentFilters";
import type { DocumentQueryParams } from "@/types/document";

type LoadedDoc = {
  file_type?: string | null;
  rawType?: string | null;
  file_path?: string | null;
  created_at?: string | null;
  is_bundle?: boolean | null;
  tags?: { id?: number }[] | null;
};

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "svg", "gif"];
const DOC_EXTS = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"];

function withinStart(value?: string): Date | null {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (value === "today") return new Date(today);
  if (value === "last_7_days" || value === "last_30_days") {
    const days = value === "last_7_days" ? 7 : 30;
    return new Date(today - days * 86_400_000);
  }
  if (value === "this_year") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return null;
}

// Chỉ ẩn item chắc chắn không khớp; q/folder/accessed_within/sort vẫn chờ server.
export function matchesLoadedFilters(doc: LoadedDoc, params?: DocumentQueryParams): boolean {
  if (!params) return true;

  const ft = (doc.rawType ?? doc.file_type ?? "").toLowerCase();
  const fp = (doc.file_path ?? "").toLowerCase();
  const ext = fp.includes(".") ? fp.split(".").pop()! : getNormalizedExtension(ft);
  const has = (list: string[]) => list.includes(ext);

  if (params.file_type) {
    const type = params.file_type.trim().toLowerCase();
    if (!ft.includes(type) && !fp.endsWith(`.${type}`)) return false;
  }

  if (params.category && params.category !== "all") {
    const known = has(["pdf", ...IMAGE_EXTS, ...DOC_EXTS, ...CODE_EXTENSIONS]);
    const matched =
      params.category === "pdf" ? ext === "pdf" || ft.includes("pdf") :
      params.category === "image" ? has(IMAGE_EXTS) || ft.startsWith("image/") :
      params.category === "document" ? has(DOC_EXTS) || /word|presentation|spreadsheet/.test(ft) :
      params.category === "code" ? has(CODE_EXTENSIONS) :
      !known;
    if (!matched) return false;
  }

  if (params.tag_id && !doc.is_bundle && !doc.tags?.some((tag) => tag.id === params.tag_id)) {
    return false;
  }

  const start = withinStart(params.uploaded_within);
  if (start && doc.created_at && new Date(doc.created_at) < start) return false;

  return true;
}
