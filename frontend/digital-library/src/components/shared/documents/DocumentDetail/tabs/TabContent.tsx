// src/components/shared/documents/DocumentDetail/tabs/TabContent.tsx
//
// TabContent - Hiển thị nội dung văn bản bóc tách qua OCR
// Hỗ trợ highlight an toàn (không dangerouslySetInnerHTML) và tự cuộn tới match đầu tiên.

import { useEffect, useMemo, useRef } from "react";

// --- Helpers ---

/** Vietnamese vowel/diacritic expansion map for accent-insensitive matching. */
const VI_MAP: Record<string, string> = {
  a: "[aàáảãạăằắẳẵặâầấẩẫậ]",
  e: "[eèéẻẽẹêềếểễệ]",
  i: "[iìíỉĩị]",
  o: "[oòóỏõọôồốổỗộơờớởỡợ]",
  u: "[uùúủũụưừứửữự]",
  y: "[yỳýỷỹỵ]",
  d: "[dđ]",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

/**
 * Build a regex pattern that matches query terms against accented Vietnamese text.
 * Each character expands to a character class covering all diacritics.
 */
function buildHighlightRegex(query: string): RegExp | null {
  const terms = [
    ...new Set(
      normalize(query)
        .split(/\s+/)
        .filter((t) => t.length > 1)
    ),
  ]
    .sort((a, b) => b.length - a.length)
    .slice(0, 8); // cap to avoid catastrophic backtracking
  if (terms.length === 0) return null;

  const patterns = terms.map((term) =>
    term
      .split("")
      .map((ch) => VI_MAP[ch] ?? escapeRegex(ch))
      .join("")
  );
  try {
    return new RegExp(`(${patterns.join("|")})`, "gi");
  } catch {
    return null;
  }
}

// --- Component ---

interface TabContentProps {
  content: string;
  highlightQuery?: string;
}

export function TabContent({ content, highlightQuery }: TabContentProps) {
  const firstMatchRef = useRef<HTMLElement | null>(null);

  const regex = useMemo(
    () => (highlightQuery ? buildHighlightRegex(highlightQuery) : null),
    [highlightQuery]
  );

  // Memoize việc cắt chuỗi OCR lớn để tránh re-split trên mỗi lần component re-render
  const { parts, firstMatchIndex } = useMemo(() => {
    if (!regex || !content) {
      return { parts: [] as string[], firstMatchIndex: -1 };
    }
    const splitParts = content.split(regex);
    const matchIndex = splitParts.findIndex((_, i) => i % 2 === 1);
    return { parts: splitParts, firstMatchIndex: matchIndex };
  }, [content, regex]);

  // Scroll to first highlighted match once content/query is available (handles async OCR load).
  useEffect(() => {
    if (!firstMatchRef.current) return;
    firstMatchRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [content, highlightQuery]);

  if (!content) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500">
          Tài liệu này chưa có dữ liệu văn bản (OCR).
        </p>
      </div>
    );
  }

  if (!regex) {
    return (
      <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 max-h-[700px] overflow-y-auto custom-scrollbar">
        <p className="text-sm text-gray-700 leading-loose whitespace-pre-wrap font-serif">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 max-h-[700px] overflow-y-auto custom-scrollbar">
      <p className="text-sm text-gray-700 leading-loose whitespace-pre-wrap font-serif">
        {parts.map((part, i) => {
          if (i % 2 === 1) {
            // Odd indices are matched segments from the capturing group
            return (
              <mark
                key={i}
                ref={i === firstMatchIndex ? firstMatchRef : undefined}
                className="bg-amber-200 font-bold px-0.5 rounded not-italic"
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </p>
    </div>
  );
}
