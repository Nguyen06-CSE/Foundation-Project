import { DocumentCard, type DocumentCardProps } from "@/components/shared/DocumentCard";
import { type GroupPermission } from "./GroupDocumentContextMenu";
import { type DocumentAction, type DocumentMenuItem } from "@/components/shared/DocumentContextMenu";
import { Save } from "lucide-react";

export interface GroupDocumentCardProps extends Omit<DocumentCardProps, "allowedActions" | "extraItems" | "basePath"> {
  groupId: number | string;
  permission: GroupPermission;
}

export function GroupDocumentCard({ groupId, permission, ...props }: GroupDocumentCardProps) {
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

  const basePath = `/groups/${groupId}/documents`;

  return (
    <DocumentCard
      {...props}
      basePath={basePath}
      allowedActions={allowedActions}
      extraItems={extraItems}
    />
  );
}
