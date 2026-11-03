export type NotificationType =
  | 'community_submission_received'
  | 'community_submission_approved'
  | 'community_submission_rejected'
  | 'todo_due'
  | 'group_invitation'
  | 'group_update'
  | 'document_shared'
  | 'document_uploaded'
  | 'member_joined'
  | string;

export interface Notification {
  id: number;
  user_id?: number;
  type: NotificationType;
  title?: string;
  message: string;
  link?: string | null;
  workspace_id?: number | null;
  document_id?: number | null;
  is_read: boolean;
  created_at?: string | null;

  // Backward compatibility fields
  relatedGroupId?: number;
  relatedGroupName?: string;
  relatedDocumentId?: number;
  relatedDocumentName?: string;
  relatedUserId?: number;
  relatedUserName?: string;
  actionUrl?: string;
  status?: 'unread' | 'read';
  createdAt?: string;
  invitationId?: number;
  invitationStatus?: 'pending' | 'accepted' | 'rejected';
}
