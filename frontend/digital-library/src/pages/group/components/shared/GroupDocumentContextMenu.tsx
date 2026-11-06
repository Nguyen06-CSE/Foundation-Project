// frontend/digital-library/src/pages/group/components/GroupDocumentContextMenu.tsx

import { DocumentContextMenu, type DocumentAction, type DocumentMenuItem } from "@/components/shared/documents/DocumentContextMenu";
import { Save, Share2 } from "lucide-react";

export type GroupPermission = "owner" | "full" | "view";

export interface GroupDocumentContextMenuProps {
  onAction: (action: DocumentAction | string) => void;
  permission: GroupPermission;
  markdownPath?: string | null;
}

export function GroupDocumentContextMenu({ onAction, permission, markdownPath }: GroupDocumentContextMenuProps) {
  let allowedActions: DocumentAction[] = [];

  if (permission === "owner" || permission === "full") {
    allowedActions = ["view", "download", "download-markdown", "share", "favorite", "rename", "move", "delete"];
  } else if (permission === "view") {
    allowedActions = ["view", "download", "download-markdown", "favorite"];
  }

  const extraItems: DocumentMenuItem[] = [
    ...(permission === "view"
      ? [
          {
            action: "share",
            icon: <Share2 className="h-4 w-4" />,
            label: "Chia sẻ",
            disabled: true,
            tooltip: "Bạn chỉ có quyền xem trong nhóm này, không thể chia sẻ tài liệu.",
          },
        ]
      : []),
    {
      action: "save-to-personal",
      icon: <Save className="h-4 w-4" />,
      label: "Lưu về cá nhân",
    },
  ];

  return (
    <DocumentContextMenu
      onAction={onAction}
      allowedActions={allowedActions}
      extraItems={extraItems}
      markdownPath={markdownPath}
    />
  );
}
