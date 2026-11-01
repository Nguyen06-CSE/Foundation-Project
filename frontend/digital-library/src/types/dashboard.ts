// frontend/digital-library/src/types/dashboard.ts

export interface RejectedSubmissionBrief {
  submission_id: number;
  title: string;
  reason?: string | null;
}

export interface ContributionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approved_downloads: number;
}

export interface RecentGroupItem {
  id: number;
  name: string;
  role: string;
  member_count: number;
  document_count: number;
  updated_at?: string | null;
}

export interface GroupStats {
  total: number;
  owned: number;
  total_docs: number;
  recent: RecentGroupItem[];
}

export interface RecentViewedDocument {
  id: number;
  title: string;
  file_type?: string | null;
  is_bundle: boolean;
  children_count: number;
  thumbnail_path?: string | null;
  last_viewed_at?: string | null;
}

export interface RecentActivityItem {
  id: number;
  action: string;
  document_id: number;
  document_title?: string | null;
  created_at: string;
}

export interface DashboardSummary {
  pending_invitations: number;
  pending_invitation_names: string[];
  rejected_recent_count: number;
  latest_rejected?: RejectedSubmissionBrief | null;
  expiring_trash_count: number;
  total_docs: number;
  new_docs_7d: number;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  shared_docs_count: number;
  favorite_count: number;
  contributions: ContributionStats;
  groups: GroupStats;
  recent_viewed: RecentViewedDocument[];
  recent_activities: RecentActivityItem[];
}
