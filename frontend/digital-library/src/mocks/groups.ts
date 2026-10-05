import type { Document, Folder } from "@/types/document";
import type { GroupListItem, Workspace, WorkspaceInvitation, WorkspaceMember } from "@/types/group";

export const mockGroups: GroupListItem[] = [
  { id: 1, name: "Nhóm dự án Website bán hàng", description: "Không gian lưu tài liệu đồ án.", owner_id: 1, default_member_permission: "view", is_dissolving: false, created_at: "2024-02-10T08:00:00Z", updated_at: "2024-02-18T08:00:00Z", member_count: 8, my_permission: "full", is_owner: true, last_updated: "Cập nhật 2 giờ trước" },
  { id: 2, name: "Nhóm học tập CSDL", description: "Tài liệu học tập và bài tập cơ sở dữ liệu.", owner_id: 2, default_member_permission: "view", is_dissolving: false, created_at: "2024-02-01T08:00:00Z", updated_at: "2024-02-12T08:00:00Z", member_count: 12, my_permission: "view", is_owner: false, last_updated: "Cập nhật hôm qua" },
  { id: 3, name: "Nhóm nghiên cứu AI", description: "Tổng hợp paper, slide và ghi chú seminar AI.", owner_id: 3, default_member_permission: "view", is_dissolving: false, created_at: "2024-01-20T08:00:00Z", updated_at: "2024-02-09T08:00:00Z", member_count: 8, my_permission: "view", is_owner: false, last_updated: "Cập nhật 3 ngày trước" },
];

export const mockWorkspace: Workspace = {
  id: 2,
  name: "Nhóm học tập CSDL",
  description: "Không gian học tập chung cho môn Cơ sở dữ liệu.",
  owner_id: 1,
  default_member_permission: "view",
  is_dissolving: false,
  created_at: "2024-02-01T08:00:00Z",
  updated_at: "2024-02-12T08:00:00Z",
};

export const mockGroupFolders: Folder[] = [
  { id: 101, name: "Bài giảng", color: "primary", tag_count: 1, document_count: 12, tags: [], created_at: "2024-02-01" },
  { id: 102, name: "Bài tập", color: "primary", tag_count: 1, document_count: 22, tags: [], created_at: "2024-02-02" },
  { id: 103, name: "Đề thi / Kiểm tra", color: "primary", tag_count: 1, document_count: 8, tags: [], created_at: "2024-02-03" },
];

export const mockGroupDocuments: Document[] = [
  { id: 201, title: "Bai_giang_CSDL_Full.pdf", file_type: "pdf", file_size: 7864320, created_at: "2024-02-15", updated_at: "2024-02-15", is_important: false },
  { id: 202, title: "De_cuong_on_tap_giua_ky.docx", file_type: "docx", file_size: 4404019, created_at: "2024-02-14", updated_at: "2024-02-14", is_important: false },
  { id: 203, title: "Bai_tap_nop_tuan_3.zip", file_type: "zip", file_size: 5347737, created_at: "2024-02-13", updated_at: "2024-02-13", is_important: false },
  { id: 204, title: "Slide_chuong_3_SQL.pptx", file_type: "pptx", file_size: 9332326, created_at: "2024-02-12", updated_at: "2024-02-12", is_important: false },
];

export const mockMembers: WorkspaceMember[] = [
  { user_id: 1, username: "caokhoinguyen", full_name: "Cao Khôi Nguyên", role: "Trưởng nhóm", student_code: "MSSV 21120412", permission_level: "full", joined_at: "2024-02-10", is_owner: true },
  { user_id: 2, username: "nguyenvana", full_name: "Nguyễn Văn An", role: "Cố vấn", student_code: "Giảng viên khoa CNTT", permission_level: "full", joined_at: "2024-02-12", is_owner: false },
  { user_id: 3, username: "tranbichngoc", full_name: "Trần Thị Bích Ngọc", role: "Cố vấn", student_code: "Giảng viên khoa CNTT", permission_level: "full", joined_at: "2024-02-12", is_owner: false },
  { user_id: 4, username: "leminhduc", full_name: "Lê Minh Đức", role: "Thành viên", student_code: "MSSV 21120415", permission_level: "view", joined_at: "2024-02-14", is_owner: false },
];

export const mockInvitations: WorkspaceInvitation[] = [
  { id: 301, workspace_id: 5, workspace_name: "Nhóm học tập Trí tuệ nhân tạo", invited_by_name: "Nguyễn Văn An", message: "Mời bạn tham gia nhóm nghiên cứu giải thuật AI nâng cao học kỳ này.", permission_level: "view", created_at: "2024-05-20", status: "pending" },
  { id: 302, workspace_id: 6, workspace_name: "Nhóm dự án - Website bán hàng", invited_by_name: "Trần Thị Bích Ngọc", message: "Vào nhóm giúp code và review tài liệu dự án môn học CNPM.", permission_level: "full", created_at: "2024-05-18", status: "pending" },
];
