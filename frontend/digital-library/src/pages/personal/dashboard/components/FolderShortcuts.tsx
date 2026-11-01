import { Link } from "react-router-dom";
import { Folder as FolderIcon, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatRelativeDate } from "@/utils/formatDate";
import type { Folder } from "@/types/document";

export interface FolderShortcutsProps {
  folders: Folder[];
  isLoading?: boolean;
  onCreateFolder: () => void;
}

export function FolderShortcuts({ folders, isLoading, onCreateFolder }: FolderShortcutsProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Thư mục cá nhân <span className="font-normal text-gray-500">· {folders.length} thư mục</span></h2>
        </div>
        <Link to="/personal/documents" className="text-xs font-medium text-primary-700 hover:underline">Quản lý</Link>
      </div>

      {isLoading ? <div className="py-8 text-center text-xs text-gray-400">Đang tải thư mục…</div> : (
        <div className="mt-3 max-h-[270px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {folders.map((folder) => {
            const color = folder.color || "#2F6B3C";
            return (
              <Link key={folder.id} to={`/personal/documents?folder=${folder.id}`} className="group min-h-[104px] rounded-lg border border-gray-200 p-3 transition-colors hover:border-primary-500 hover:bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50" style={{ color }}><FolderIcon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900 group-hover:text-primary-700">{folder.name}</span>
                    <span className="block text-xs text-gray-500">{folder.document_count} tài liệu</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-400">{folder.created_at ? formatRelativeDate(folder.created_at) : ""}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(folder.tags ?? []).slice(0, 3).map((tag) => <span key={tag.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{tag.name}</span>)}
                  {(folder.tags ?? []).length === 0 && <span className="text-[10px] italic text-gray-400">Chưa gắn tag</span>}
                  {(folder.tags ?? []).length > 3 && <span className="text-[10px] text-gray-500">+{folder.tags.length - 3}</span>}
                </div>
              </Link>
            );
          })}
          <button type="button" onClick={onCreateFolder} className="flex min-h-[104px] items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:border-primary-500 hover:bg-primary-50/30 hover:text-primary-700">
            <Plus className="h-4 w-4" /> Thư mục mới
          </button>
          </div>
        </div>
      )}
    </Card>
  );
}
