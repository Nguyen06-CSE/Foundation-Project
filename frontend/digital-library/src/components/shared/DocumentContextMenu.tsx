import { Dropdown } from "@/components/ui/Dropdown";
import { 
  Eye, 
  Download, 
  Share2, 
  Heart, 
  Edit2, 
  FolderInput, 
  Trash2,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export type DocumentAction = 
  | "view" 
  | "download" 
  | "share" 
  | "favorite" 
  | "rename" 
  | "move" 
  | "delete";

export interface DocumentContextMenuProps {
  onAction: (action: DocumentAction) => void;
}

export function DocumentContextMenu({ onAction }: DocumentContextMenuProps) {
  const items = [
    { icon: <Eye />, label: "Xem/Xem trước", onClick: () => onAction("view") },
    { icon: <Download />, label: "Tải xuống", onClick: () => onAction("download") },
    { icon: <Share2 />, label: "Chia sẻ", onClick: () => onAction("share") },
    { icon: <Heart />, label: "Thêm vào Yêu thích", onClick: () => onAction("favorite") },
    { icon: <Edit2 />, label: "Đổi tên", onClick: () => onAction("rename") },
    { icon: <FolderInput />, label: "Di chuyển", onClick: () => onAction("move") },
    { 
      icon: <Trash2 />, 
      label: "Xóa", 
      onClick: () => onAction("delete"), 
      danger: true 
    },
  ];

  return (
    <Dropdown
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full">
          <MoreVertical className="h-5 w-5" />
        </Button>
      }
      items={items}
      align="right"
    />
  );
}
