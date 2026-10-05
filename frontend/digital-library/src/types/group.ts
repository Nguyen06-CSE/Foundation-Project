// frontend/digital-library/src/types/group.ts

import type { Document, Folder } from "@/types/document";

export type PermissionLevel = "view" | "full";

export interface Workspace {
  id: number;
  name: string;
  description?: string | null;
  owner_id: number;
  default_member_permission: PermissionLevel;
  is_dissolving: boolean;
  dissolve_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface WorkspaceMember {
  user_id: number;
  username: string;
  full_name?: string | null;
  role: string;
  student_code?: string | null;
  permission_level: PermissionLevel;
  joined_at: string;
  is_owner: boolean;
}

export interface WorkspaceInvitation {
  id: number;
  workspace_id: number;
  workspace_name: string;
  invited_by_name: string;
  message?: string | null;
  permission_level: PermissionLevel;
  created_at: string;
  status: "pending" | "accepted" | "rejected";
}

export interface GroupListItem extends Workspace {
  member_count: number;
  my_permission: PermissionLevel;
  is_owner: boolean;
  last_updated: string;
  role?: string;
}

export interface GroupDocument extends Document {
  owner_id?: number;
  source_document_id?: number | null;
}

export type GroupFolder = Folder;
