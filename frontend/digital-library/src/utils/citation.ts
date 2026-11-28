// src/utils/citation.ts

import type { Citation, CitationLocation } from "@/types/ai";

const UNIT_LABELS: Record<string, string> = {
  page: "trang",
  pages: "trang",
  slide: "slide",
  slides: "slide",
  section: "mục",
  sections: "mục",
  chunk: "đoạn",
  chunks: "đoạn",
  document: "tài liệu",
  documents: "tài liệu",
};

const SOURCE_LABELS: Record<string, string> = {
  ocr: "OCR",
  pdf: "PDF",
  pdf_text: "PDF (text layer)",
  pdf_scan: "PDF (scan/OCR)",
  pdf_mixed: "PDF (text + scan)",
  docx: "DOCX",
  pptx: "PPTX",
  text: "Văn bản",
  markdown: "Markdown",
  description: "Mô tả",
};

export function formatCitationLocation(
  location?: CitationLocation,
): string | null {
  if (!location) return null;

  const parts: string[] = [];
  if (location.page != null) parts.push(`Trang ${location.page}`);
  if (location.slide != null) parts.push(`Slide ${location.slide}`);
  if (location.section) parts.push(`Mục ${location.section}`);
  return parts.length > 0 ? parts.join(" • ") : null;
}

export function formatCitationSource(source?: string): string | null {
  if (!source) return null;
  return SOURCE_LABELS[source] ?? source;
}

export function formatCoverageUnit(unit?: string): string {
  if (!unit) return "";
  return UNIT_LABELS[unit] ?? unit;
}

function withChunk(url: string, chunkId?: number): string {
  if (!chunkId || /[?&]chunk=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}chunk=${chunkId}`;
}

export function citationUrl(citation: Citation): string | null {
  if (!citation.url) return null;
  return withChunk(citation.url, citation.chunk_id);
}

export function searchUrlWithCitation(
  url: string,
  citation?: Citation | null,
): string {
  return citation ? withChunk(url, citation.chunk_id) : url;
}
