// frontend/digital-library/src/pages/group/GroupSpace.tsx

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArchiveRestore,
  Download,
  FileBox,
  FileDown,
  FilePlus,
  FolderUp,
  MoreVertical,
  Search,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import EmptyState from "@/components/shared/EmptyState";
import { FileIcon } from "@/components/shared/FileIcon";
import { FolderCard } from "@/components/shared/FolderCard";
import { groupService } from "@/services/groupService";
import { useAuthStore } from "@/stores/authStore";
import type { Document } from "@/types/document";
import type { PermissionLevel, WorkspaceInvitation, WorkspaceMember } from "@/types/group";
import { cn } from "@/utils/cn";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
type GroupTab = "documents" | "members" | "requests" | "settings" | "trash";

const TAB_LABELS: Record<GroupTab, string> = {
  documents: "Tài liệu",
  members: "Thành viên",
  requests: "Yêu cầu ",
  settings: "Cài đặt",
  trash: "Thùng rác",
};

export default function GroupSpace() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as GroupTab) || "documents";
  const [searchQuery, setSearchQuery] = useState("");
  const [shareModal, setShareModal] = useState<"documents" | "folder" | "invite" | null>(null);
  
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Guard điều hướng sớm nếu id không hợp lệ
  useEffect(() => {
    if (!id || isNaN(groupId)) {
      navigate("/groups", { replace: true });
    }
  }, [id, groupId, navigate]);

  // Fetch dữ liệu với dependency và loading/error state
  const {
    data: workspace,
    isLoading: workspaceLoading,
    isError: workspaceError
  } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getById(groupId),
    enabled: !isNaN(groupId),
  });

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["group-documents", groupId],
    queryFn: () => groupService.getDocuments(groupId),
    enabled: !!workspace,
  });

  const { data: foldersData = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["group-folders", groupId],
    queryFn: () => groupService.getFolders(groupId),
    enabled: !!workspace,
  });

  const { data: membersData = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !!workspace,
  });

  const { data: invitationsData = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: groupService.getMyInvitations,
  });

  // Gán data
  const documents = documentsData?.items ?? [];
  const folders = foldersData;
  const members = membersData;
  const invitations = invitationsData;

  // Tính toán quyền hạn (cần membersData và workspace có sẵn)
  const currentMember = members.find((m) => m.user_id === currentUser?.id);
const isOwner = currentMember?.is_owner ?? (!!workspace?.owner_id && workspace.owner_id === currentUser?.id);  const permission: PermissionLevel = currentMember?.permission_level ?? "view";
  const canManageDocuments = isOwner || permission === "full";

  // Fetch trash dựa vào isOwner
  const { data: trashData = [] } = useQuery({
    queryKey: ["group-trash", groupId],
    queryFn: () => groupService.getTrash(groupId),
    enabled: isOwner,
  });
  const trash = trashData;

  const documentMutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  };

  const saveDocument = useMutation({
    mutationFn: (docId: number) => groupService.saveToPersonal(groupId, docId),
    ...documentMutationOptions,
  });

  const deleteDocument = useMutation({
    mutationFn: (docId: number) => groupService.deleteDocument(groupId, docId),
    ...documentMutationOptions,
  });

  const filteredDocuments = useMemo(
    () => documents.filter((document) => document.title.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [documents, searchQuery],
  );

  const setTab = (tab: GroupTab) => setSearchParams(tab === "documents" ? {} : { tab });

  // Render Guard: Loading
  if (workspaceLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-24 w-full animate-pulse rounded-xl bg-gray-200" />
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  // Render Guard: Error hoặc không tìm thấy
  if (workspaceError || !workspace) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-gray-500">Không tìm thấy nhóm hoặc bạn không có quyền truy cập.</p>
        <Button variant="outline" onClick={() => navigate("/groups")}>
          Quay lại danh sách nhóm
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{workspace.name}</h1>
            <p className="mt-1 text-xs text-gray-400">{members.length} thành viên · Cập nhật gần đây</p>
          </div>
        </div>
        {canManageDocuments && (
          <Dropdown
            trigger={<Button icon={<FilePlus className="h-4 w-4" />}>+ Thêm tài liệu</Button>}
            items={[
              { icon: <Upload className="h-4 w-4" />, label: "Upload tài liệu mới", onClick: () => console.log("Upload group document") },
              { icon: <FileBox className="h-4 w-4" />, label: "Chia sẻ từ kho cá nhân", onClick: () => setShareModal("documents") },
              { icon: <FolderUp className="h-4 w-4" />, label: "Chia sẻ cả thư mục", onClick: () => setShareModal("folder") },
            ]}
          />
        )}
      </Card>

      {workspace.is_dissolving && workspace.dissolve_at && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          Nhóm này sẽ bị giải tán vào {formatRelativeDate(workspace.dissolve_at)}. Hãy lưu tài liệu bạn cần.
        </div>
      )}

      <div className="flex flex-wrap gap-6 border-b border-gray-200">
        {(Object.keys(TAB_LABELS) as GroupTab[])
          .filter((tab) => isOwner || (tab !== "settings" && tab !== "trash"))
          .map((tab) => (
            <button
              key={tab}
              className={cn(
                "pb-3 text-sm transition-colors",
                activeTab === tab ? "border-b-2 border-primary-600 font-semibold text-primary-600" : "border-b-2 border-transparent text-gray-600 hover:text-gray-900",
              )}
              onClick={() => setTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
      </div>

      {activeTab === "documents" && (
        <DocumentsTab
          documents={filteredDocuments}
          folders={folders}
          isLoading={docsLoading || foldersLoading}
          searchQuery={searchQuery}
          canManage={canManageDocuments}
          onSearchChange={setSearchQuery}
          onSave={(docId) => saveDocument.mutateAsync(docId)}
          onDelete={(docId) => deleteDocument.mutateAsync(docId)}
        />
      )}
      {activeTab === "members" && <MembersTab members={members} isOwner={isOwner} onInvite={() => setShareModal("invite")} groupId={groupId} />}
      {activeTab === "requests" && <RequestsTab invitations={invitations} />}
      {activeTab === "settings" && isOwner && <SettingsTab groupName={workspace.name} members={members} onDissolve={() => groupService.dissolve(groupId).then(() => queryClient.invalidateQueries({ queryKey: ["group", groupId] }))} />}
      {activeTab === "trash" && isOwner && <TrashTab documents={trash} groupId={groupId} />}

      {/* Truyền documents thay vì dùng mock trong SimpleShareModal */}
      {shareModal === "documents" && <SimpleShareModal title="Chia sẻ từ kho cá nhân" documents={documents} onClose={() => setShareModal(null)} />}
      {shareModal === "folder" && <SimpleShareModal title="Chia sẻ cả thư mục" documents={documents} onClose={() => setShareModal(null)} />}
      {shareModal === "invite" && <InviteModal groupId={groupId} onClose={() => setShareModal(null)} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTS PHỤ TRỢ
// ----------------------------------------------------------------------

interface DocumentsTabProps {
  documents: Document[];
  folders: { id: number; name: string; document_count: number; color?: string | null }[];
  isLoading: boolean;
  searchQuery: string;
  canManage: boolean;
  onSearchChange: (value: string) => void;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
}

function DocumentsTab({ documents, folders, isLoading, searchQuery, canManage, onSearchChange, onSave, onDelete }: DocumentsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <Input icon={<Search className="h-4 w-4" />} placeholder="Tìm tệp trong không gian..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Thư mục học tập</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {folders.map((folder) => <FolderCard key={folder.id} id={folder.id} name={folder.name} count={folder.document_count} color={folder.color} onClick={() => console.log(folder.id)} />)}
          <button className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600">
            + Thêm thư mục
          </button>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Tài liệu mới nhất</h2>
        {documents.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {documents.map((document) => <GroupDocumentCard key={document.id} document={document} canManage={canManage} onSave={onSave} onDelete={onDelete} />)}
          </div>
        ) : (
          <EmptyState icon={<FileBox className="h-6 w-6" />} title="Chưa có tài liệu nào" description="Chia sẻ hoặc upload tài liệu để nhóm cùng sử dụng." />
        )}
      </section>
    </div>
  );
}

interface GroupDocumentCardProps {
  document: Document;
  canManage: boolean;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
}

function GroupDocumentCard({ document, canManage, onSave, onDelete }: GroupDocumentCardProps) {
  return (
    <Card className="group relative flex aspect-[1/0.82] flex-col overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-[0_0_60%] items-center justify-center bg-gray-50">
        <FileIcon type={document.file_type} className="h-16 w-16" iconClassName="h-8 w-8" />
      </div>
      <div className="flex flex-1 items-start gap-2 px-3 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{document.title}</h3>
          <p className="mt-1 text-xs text-gray-400">{formatSize(document.file_size)} · Tin tức</p>
        </div>
        <Dropdown
          trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400"><MoreVertical className="h-5 w-5" /></Button>}
          items={[
            { icon: <FileBox className="h-4 w-4" />, label: "Xem/Xem trước", onClick: () => console.log("view") },
            { icon: <Download className="h-4 w-4" />, label: "Tải xuống", onClick: () => console.log("download") },
            { icon: <FileDown className="h-4 w-4" />, label: "Lưu về cá nhân", onClick: () => void onSave(document.id) },
            ...(canManage ? [
              { icon: <Settings className="h-4 w-4" />, label: "Đổi tên", onClick: () => console.log("rename") },
              { icon: <Trash2 className="h-4 w-4" />, label: "Xóa", onClick: () => void onDelete(document.id), danger: true },
            ] : []),
          ]}
        />
      </div>
    </Card>
  );
}

function MembersTab({ members, isOwner, onInvite, groupId }: { members: WorkspaceMember[]; isOwner: boolean; onInvite: () => void; groupId: number }) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
  
  const updatePermission = useMutation({
    mutationFn: ({ userId, permission }: { userId: number; permission: PermissionLevel }) => groupService.updateMemberPermission(groupId, userId, permission),
    onSuccess,
  });
  
  const removeMember = useMutation({
    mutationFn: (userId: number) => groupService.removeMember(groupId, userId),
    onSuccess,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{isOwner && <Button icon={<UserPlus className="h-4 w-4" />} onClick={onInvite}>+ Mời thành viên</Button>}</div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
            <tr><th className="px-4 py-3">Thành viên</th><th>Vai trò</th><th>Quyền hạn</th><th>Tham gia lúc</th><th>Thao tác</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{member.full_name || member.username}</div>
                  <div className="text-xs text-gray-400">{member.student_code}</div>
                </td>
                <td><Badge variant={member.is_owner ? "primary" : member.permission_level === "full" ? "success" : "default"}>{member.role}</Badge></td>
                <td>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.permission_level === "full" ? "primary" : "default"}>{member.permission_level === "full" ? "Full (Toàn quyền)" : "View (Chỉ xem)"}</Badge>
                    {isOwner && !member.is_owner && (
                      <Dropdown trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Settings className="h-4 w-4" /></Button>} items={[
                        { label: "Đổi sang View", onClick: () => updatePermission.mutate({ userId: member.user_id, permission: "view" }) },
                        { label: "Đổi sang Full", onClick: () => updatePermission.mutate({ userId: member.user_id, permission: "full" }) },
                      ]} />
                    )}
                  </div>
                </td>
                <td className="text-gray-500">
                  {formatRelativeDate(member.joined_at)}
                </td>
                <td>
                  {isOwner && !member.is_owner && (
                    <button className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50" disabled={removeMember.isPending} onClick={() => removeMember.mutate(member.user_id)}>
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Chú thích quyền hạn:</p>
        <p className="mt-1">Full: upload, sửa, xóa, chỉnh sửa và chia sẻ tài liệu của nhóm. View: chỉ xem, tải và lưu tài liệu về kho cá nhân.</p>
      </Card>
    </div>
  );
}

function RequestsTab({ invitations }: { invitations: WorkspaceInvitation[] }) {
  const queryClient = useQueryClient();
  const accept = useMutation({ mutationFn: groupService.acceptInvitation, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-invitations"] }) });
  const reject = useMutation({ mutationFn: groupService.rejectInvitation, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-invitations"] }) });
  const pending = invitations.filter((item) => item.status === "pending");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Lời mời đang chờ phản hồi</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {pending.map((invitation) => (
          <Card key={invitation.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Users className="h-5 w-5" /></div>
              <div><h3 className="font-semibold text-gray-900">{invitation.workspace_name}</h3><p className="text-xs text-gray-400">Mời bởi {invitation.invited_by_name}</p></div>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{invitation.message}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Gửi lúc: {formatRelativeDate(invitation.created_at)}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => reject.mutate(invitation.id)}>Từ chối</Button>
                <Button size="sm" onClick={() => accept.mutate(invitation.id)}>Chấp nhận</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ groupName, members, onDissolve }: { groupName: string; members: WorkspaceMember[]; onDissolve: () => Promise<unknown> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Thông tin nhóm</h2>
        <Input defaultValue={groupName} />
        <textarea className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600" defaultValue="Không gian học tập chung của nhóm." />
        <Button>Lưu thay đổi</Button>
      </Card>
      <Card className="space-y-4 border-red-100 bg-red-50/30">
        <h2 className="text-lg font-semibold text-red-600">Khu vực nguy hiểm</h2>
        <p className="text-sm text-gray-600">Giải tán nhóm sẽ thông báo cho thành viên trước 24h. Tài liệu chưa được lưu về cá nhân có thể chuyển sang vùng orphaned.</p>
        <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
          {members.filter((member) => !member.is_owner).map((member) => <option key={member.user_id}>{member.full_name || member.username}</option>)}
        </select>
        <Button variant="danger" onClick={() => void onDissolve()}>Giải tán nhóm</Button>
      </Card>
    </div>
  );
}

function TrashTab({ documents, groupId }: { documents: Document[]; groupId: number }) {
  const queryClient = useQueryClient();
  const restore = useMutation({
    mutationFn: (documentId: number) => groupService.restoreFromTrash(groupId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
    },
  });
  return documents.length ? (
    <div className="space-y-3">
      {documents.map((document) => (
        <Card key={document.id} className="flex items-center justify-between">
          <span className="font-medium text-gray-900">{document.title}</span>
          <Button variant="outline" icon={<ArchiveRestore className="h-4 w-4" />} disabled={restore.isPending} onClick={() => restore.mutate(document.id)}>Khôi phục</Button>
        </Card>
      ))}
    </div>
  ) : (
    <EmptyState icon={<Trash2 className="h-6 w-6" />} title="Chưa có tài liệu nào" description="Thùng rác nhóm đang trống." />
  );
}

function SimpleShareModal({ title, documents, onClose }: { title: string; documents: Document[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900">{title}</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="mt-5 space-y-3">
          {documents.slice(0, 3).map((doc) => (
            <label key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input type="checkbox" className="h-4 w-4" />
              <FileIcon type={doc.file_type} />
              <span className="text-sm font-medium text-gray-900">{doc.title}</span>
            </label>
          ))}
          {documents.length === 0 && <p className="text-sm text-gray-500">Bạn chưa có tài liệu nào để chia sẻ.</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Quay lại</Button><Button onClick={onClose}>Chia sẻ</Button></div>
      </Card>
    </div>
  );
}

function InviteModal({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const invite = useMutation({ mutationFn: () => groupService.invite(groupId, { identifier, message }), onSuccess: onClose });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900">Mời thành viên</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="mt-5 space-y-4">
          <Input icon={<Search className="h-4 w-4" />} placeholder="Tìm theo MSSV, email hoặc username..." value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          <textarea className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600" placeholder="Lời nhắn (tuỳ chọn)" value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Quay lại</Button><Button disabled={!identifier.trim() || invite.isPending} onClick={() => invite.mutate()}>Gửi lời mời</Button></div>
      </Card>
    </div>
  );
}