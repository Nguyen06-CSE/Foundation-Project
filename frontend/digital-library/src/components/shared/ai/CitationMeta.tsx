import { FileText, MapPin } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  formatCitationLocation,
  formatCitationSource,
} from "@/utils/citation";
import type { Citation } from "@/types/ai";

interface CitationMetaProps {
  citation: Citation;
  className?: string;
}

export function CitationMeta({ citation, className }: CitationMetaProps) {
  const location = formatCitationLocation(citation.location);
  const source = formatCitationSource(citation.source);

  if (!location && !source) return null;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500",
        className,
      )}
    >
      {location && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {location}
        </span>
      )}
      {source && (
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {source}
        </span>
      )}
    </span>
  );
}

export default CitationMeta;
