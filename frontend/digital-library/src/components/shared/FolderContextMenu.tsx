// src/components/shared/FolderContextMenu.tsx
import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Share2, Trash2 } from "lucide-react";

export type FolderAction = "edit" | "share" | "delete" | string;

export interface FolderMenuItem {
  action: string;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}

interface FolderContextMenuProps {
  onAction: (action: FolderAction) => void;
  allowedActions?: string[];
  extraItems?: FolderMenuItem[];
}

export function FolderContextMenu({ onAction, allowedActions, extraItems = [] }: FolderContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (e: React.MouseEvent, action: FolderAction) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài thẻ FolderCard
    setIsOpen(false);
    onAction(action);
  };
  
  const DEFAULT_ITEMS: FolderMenuItem[] = [
    { action: "edit", icon: <Edit2 className="h-4 w-4" />, label: "Sửa" },
    { action: "share", icon: <Share2 className="h-4 w-4" />, label: "Chia sẻ" },
    { action: "delete", icon: <Trash2 className="h-4 w-4" />, label: "Xoá", danger: true },
  ];
  
  let displayItems = DEFAULT_ITEMS;
  if (allowedActions) {
    displayItems = displayItems.filter(item => allowedActions.includes(item.action));
  }
  
  displayItems = [...displayItems, ...extraItems];
  
  if (displayItems.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-100 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95">
          {displayItems.map((item, index) => {
            const isDanger = item.danger;
            return (
              <div key={item.action}>
                {isDanger && index > 0 && <div className="my-1 h-px bg-gray-100" />}
                <button
                  onClick={(e) => handleAction(e, item.action)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    isDanger 
                      ? "text-red-600 hover:bg-red-50" 
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
