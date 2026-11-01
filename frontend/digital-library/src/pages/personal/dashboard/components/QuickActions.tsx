import { BookOpen, FolderPlus, Upload, Users } from "lucide-react";
import { cn } from "@/utils/cn";

export interface QuickActionsProps {
  onUploadSingle: () => void;
  onCreateFolder: () => void;
  onCreateGroup: () => void;
  onContribute: () => void;
}

const baseClass = "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 sm:px-4 sm:text-sm";

export function QuickActions({ onUploadSingle, onCreateFolder, onCreateGroup, onContribute }: QuickActionsProps) {
  const actions = [
    { key: "upload", label: "Tải tài liệu lên", icon: Upload, onClick: onUploadSingle, primary: true },
    { key: "folder", label: "Thư mục mới", icon: FolderPlus, onClick: onCreateFolder },
    { key: "group", label: "Tạo nhóm", icon: Users, onClick: onCreateGroup },
    { key: "contribute", label: "Đóng góp học liệu", icon: BookOpen, onClick: onContribute },
  ];

  return <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-end">
    {actions.map(({ key, label, icon: Icon, onClick, primary }) => <button key={key} type="button" onClick={onClick} className={cn(baseClass, primary ? "border-primary-600 bg-primary-600 text-white hover:bg-primary-700" : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50")}>
      <Icon className="h-4 w-4" />{label}
    </button>)}
  </div>;
}
