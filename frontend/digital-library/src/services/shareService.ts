import api from "./api";
import type { User } from "@/types/user";

export interface SharePreviewPayload {
  document_ids: number[];
  source_workspace_id?: number | null;
  identifiers?: string[];
  class_ids?: number[];
  faculty_ids?: number[];
  student_code_patterns?: string[];
  message?: string;
  confirm_bulk?: boolean;
}

export interface PredictedUser {
  id: number;
  username: string;
  full_name?: string | null;
  role: string;
  status: "auto" | "pending" | "already_pending" | "already_owned" | "duplicate";
  reason?: string;
  share_id?: number;
}

export interface SharePreviewResponse {
  users: PredictedUser[];
  auto_count: number;
  pending_count: number;
  already_pending_count: number;
  already_owned_count: number;
  duplicate_count: number;
  requires_bulk_confirm: boolean;
}

export interface ShareRecipientResult {
  user_id: number;
  username: string;
  full_name?: string | null;
  document_id: number;
  status: "created" | "auto_accepted" | "already_pending" | "already_owned";
  share_id?: number | null;
}

export interface ShareCreateResponse {
  message: string;
  auto_accepted_count: number;
  pending_count: number;
  already_pending_count: number;
  already_owned_count: number;
  skipped_duplicates_count: number;
  results?: ShareRecipientResult[];
}

export interface DocumentShareStatusResponse {
  pending_user_ids: number[];
  owned_user_ids: number[];
  pending_shares: {
    user_id: number;
    document_id: number;
    share_id: number;
    created_at?: string | null;
  }[];
}

export interface DocumentMini {
  id: number;
  title: string;
  file_type?: string | null;
  file_size?: number | null;
  file_path?: string | null;
  thumbnail_path?: string | null;
  markdown_path?: string | null;
  content?: string | null;
  tags?: any[];
  is_bundle: boolean;
  bundle_parent_id?: number | null;
  bundle_children_count?: number | null;
  view_count?: number;
  download_count?: number;
  share_count?: number;
  trending_score?: number;
  metadata?: Record<string, any> | null;
}

export interface DocumentShareItem {
  id: number;
  source_document_id?: number;
  document_id?: number;
  from_user: User;
  to_user: User;
  share_type: string;
  status: string;
  message?: string;
  expires_at?: string;
  responded_at?: string;
  created_at?: string;
  document?: DocumentMini;
  source_document?: DocumentMini;
}

export const shareService = {
  preview: async (payload: SharePreviewPayload): Promise<SharePreviewResponse> => {
    const res = await api.post("/shares/preview", payload);
    return res.data;
  },

  create: async (payload: SharePreviewPayload): Promise<ShareCreateResponse> => {
    const res = await api.post("/shares", payload);
    return res.data;
  },

  getReceived: async (limit = 50, offset = 0): Promise<DocumentShareItem[]> => {
    const res = await api.get("/shares/received", { params: { limit, offset } });
    return res.data;
  },

  getPending: async (): Promise<DocumentShareItem[]> => {
    const res = await api.get("/shares/pending");
    return res.data;
  },

  accept: async (shareId: number): Promise<DocumentShareItem> => {
    const res = await api.post(`/shares/${shareId}/accept`);
    return res.data;
  },

  reject: async (shareId: number): Promise<DocumentShareItem> => {
    const res = await api.post(`/shares/${shareId}/reject`);
    return res.data;
  },

  getSent: async (limit = 50, offset = 0): Promise<DocumentShareItem[]> => {
    const res = await api.get("/shares/sent", { params: { limit, offset } });
    return res.data;
  },

  withdraw: async (shareId: number): Promise<DocumentShareItem> => {
    const res = await api.post(`/shares/${shareId}/withdraw`);
    return res.data;
  },

  getDocumentShareStatus: async (documentIds: number[]): Promise<DocumentShareStatusResponse> => {
    const res = await api.get("/shares/document-status", {
      params: { document_ids: documentIds.join(",") },
    });
    return res.data;
  },
};
