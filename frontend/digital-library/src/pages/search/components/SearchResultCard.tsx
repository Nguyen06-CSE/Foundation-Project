import { useNavigate } from "react-router-dom";
import { FileText, Folder, Users } from "lucide-react";
import { CitationMeta } from "@/components/shared/ai/CitationMeta";
import { Badge } from "@/components/ui/Badge";
import { searchUrlWithCitation } from "@/utils/citation";
import type { SearchMatchMethod, SearchResultItem } from "@/types/search";

interface SearchResultCardProps {
  item: SearchResultItem;
}

const METHOD_LABELS: Record<SearchMatchMethod, string> = {
  lexical_title: "FTS · Tiêu đề",
  lexical_content: "FTS · Nội dung",
  semantic: "Theo nghĩa",
};

function renderIcon(type: string) {
  switch (type) {
    case "group_doc":
      return <Users className="h-5 w-5 text-green-600" />;
    case "folder":
      return <Folder className="h-5 w-5 text-amber-500" />;
    default:
      return <FileText className="h-5 w-5 text-blue-600" />;
  }
}

export function SearchResultCard({ item }: SearchResultCardProps) {
  const navigate = useNavigate();
  const target = searchUrlWithCitation(item.url, item.citation);
  const searchTarget = item.type === "personal_doc" || item.type === "group_doc"
    ? `${target}${target.includes("?") ? "&" : "?"}from_search=1`
    : target;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(searchTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(searchTarget);
        }
      }}
      className="group flex cursor-pointer items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 transition-colors group-hover:bg-primary-50">
        {renderIcon(item.type)}
      </div>
      <div className="flex-1 overflow-hidden">
        <h4 className="truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-primary-600">
          {item.title}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium">
            {item.subtitle}
          </span>
          {item.citation && <CitationMeta citation={item.citation} />}
          {(item.match?.methods ?? []).map((method) => (
            <Badge key={method} variant="primary">
              {METHOD_LABELS[method]}
            </Badge>
          ))}
        </div>
        {item.snippet && (
          <p className="mt-2 line-clamp-2 rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5 text-xs leading-relaxed text-gray-600">
            {item.snippet}
          </p>
        )}
      </div>
    </div>
  );
}

export default SearchResultCard;
