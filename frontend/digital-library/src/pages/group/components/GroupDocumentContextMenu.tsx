// frontend/digital-library/src/pages/group/components/GroupDocumentContextMenu.tsx

import { DocumentContextMenu, type DocumentAction, type DocumentMenuItem } from "@/components/shared/DocumentContextMenu";
import { Save } from "lucide-react";

export type GroupPermission = "owner" | "full" | "view";

export interface GroupDocumentContextMenuProps {
  onAction: (action: DocumentAction | string) => void;
  permission: GroupPermission;
}

export function GroupDocumentContextMenu({ onAction, permission }: GroupDocumentContextMenuProps) {
  let allowedActions: DocumentAction[] = [];

  if (permission === "owner" || permission === "full") {
    allowedActions = ["view", "download", "share", "favorite", "rename", "move", "delete"];
  } else if (permission === "view") {
    allowedActions = ["view", "download", "favorite"];
  }

  const extraItems: DocumentMenuItem[] = [
    {
      action: "save-to-personal",
      icon: <Save className="h-4 w-4" />,
      label: "Lưu về cá nhân",
    }
  ];

  return (
    <DocumentContextMenu
      onAction={onAction}
      allowedActions={allowedActions}
      extraItems={extraItems}
    />
  );
}
