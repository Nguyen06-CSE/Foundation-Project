import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { citationUrl } from "@/utils/citation";
import type { Citation } from "@/types/ai";
import { CitationMeta } from "./CitationMeta";

interface CitationCardProps {
  citation: Citation;
  fallbackTitle?: string;
  className?: string;
}

export function CitationCard({
  citation,
  fallbackTitle,
  className,
}: CitationCardProps) {
  const href = citationUrl(citation);
  const title =
    citation.title ?? fallbackTitle ?? `Tài liệu #${citation.document_id}`;
  const context = citation.quote ?? citation.snippet;
  const titleClass = "min-w-0 font-medium text-gray-900";
  const titleLinkClass = cn(titleClass, "hover:text-primary-600 hover:underline");

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {href ? (
          href.startsWith("/") ? (
            <Link to={href} className={titleLinkClass}>
              {title}
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={titleLinkClass}
            >
              {title}
            </a>
          )
        ) : (
          <p className={titleClass}>{title}</p>
        )}
        {href &&
          (href.startsWith("/") ? (
            <Link
              to={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              Mở
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              Mở
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ))}
      </div>

      <CitationMeta citation={citation} className="mt-1.5" />

      {context && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600">
          “{context}”
        </p>
      )}
    </div>
  );
}

export default CitationCard;
