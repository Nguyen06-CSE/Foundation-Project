// src/components/shared/FolderCard.tsx
import { Folder } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FolderContextMenu, type FolderAction } from "./FolderContextMenu";

export interface FolderCardProps {
  id: number;
  name: string;
  count: number;
  onClick: () => void;
  onAction?: (action: FolderAction, folderId: number) => void;
}

export function FolderCard({ id, name, count, onClick, onAction }: FolderCardProps) {
  return (
    <Card
      className="relative flex min-h-[64px] items-center justify-between gap-3 cursor-pointer p-4 hover:border-primary-300 hover:bg-primary-50 transition-all duration-150 group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex shrink-0 items-center justify-center h-10 w-10 rounded-lg text-primary-600 transition-colors">
          <Folder className="h-6 w-6" fill="currentColor" fillOpacity={0.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate text-sm">{name}</h3>
          <p className="text-xs text-gray-400">{count} tài liệu</p>
        </div>
      </div>

      {/* Menu 3 chấm chỉ hiện khi hover */}
      {onAction && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <FolderContextMenu onAction={(action) => onAction(action, id)} />
        </div>
      )}
    </Card>
  );
}