// frontend/digital-library/src/pages/group/GroupList.tsx

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import EmptyState from "@/components/shared/EmptyState";
import { groupService } from "@/services/groupService";
import type { GroupListItem, PermissionLevel } from "@/types/group";
import { cn } from "@/utils/cn";
import { mockGroups } from "@/mocks/groups";
import { formatRelativeDate } from "@/utils/formatDate"


export default function GroupList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: groupService.getAll,
    retry: false,
  });

  const groups = data && data.length > 0 ? data : mockGroups;
  const filteredGroups = useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [groups, searchQuery],
  );

  const createMutation = useMutation({
    mutationFn: groupService.create,
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setIsCreateOpen(false);
      navigate(`/groups/${workspace.id}`);
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Nhóm của tôi</h1>
        <Button onClick={() => setIsCreateOpen(true)}>+ Tạo nhóm</Button>
      </div>
      <div className="max-w-md">
        <Input icon={<Search className="h-4 w-4" />} placeholder="Tìm kiếm nhóm của bạn..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-64 rounded bg-gray-200 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <GroupListCard key={group.id} group={group} onEnter={() => navigate(`/groups/${group.id}`)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Chưa có nhóm nào" description="Tạo nhóm đầu tiên để chia sẻ tài liệu học tập với bạn bè hoặc giảng viên." actionLabel="Tạo nhóm" onAction={() => setIsCreateOpen(true)} />
      )}
      {isCreateOpen && <CreateGroupModal isPending={createMutation.isPending} onClose={() => setIsCreateOpen(false)} onSubmit={(payload) => createMutation.mutate(payload)} />}
    </div>
  );
}

interface GroupListCardProps {
  group: GroupListItem;
  onEnter: () => void;
}

function GroupListCard({ group, onEnter }: GroupListCardProps) {
  const roleLabel = group.is_owner ? "Trưởng nhóm" : group.my_permission === "full" ? "Cố vấn" : "Thành viên";
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Users className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-gray-900">{group.name}</h2>
        <p className="mt-1 text-xs text-gray-400">{group.member_count} thành viên · {formatRelativeDate(group.last_updated)}</p>
      </div>
      <Badge variant={group.is_owner ? "primary" : group.my_permission === "full" ? "success" : "default"} className={cn(!group.is_owner && group.my_permission === "full" && "bg-blue-50 text-blue-600")}>
        {roleLabel}
      </Badge>
      <Button variant="outline" onClick={onEnter}>Vào không gian</Button>
    </Card>
  );
}

interface CreateGroupModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description?: string; default_member_permission: PermissionLevel }) => void;
}

function CreateGroupModal({ isPending, onClose, onSubmit }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permission, setPermission] = useState<PermissionLevel>("view");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg p-0">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Tạo nhóm mới</h2>
          <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form className="space-y-5 p-5" onSubmit={(event) => { event.preventDefault(); onSubmit({ name, description: description || undefined, default_member_permission: permission }); }}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên nhóm</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-600" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "full" as const, label: "Toàn quyền", desc: "Thành viên có thể upload, sửa và xóa tài liệu." },
              { value: "view" as const, label: "Chỉ xem", desc: "Thành viên xem, tải và lưu tài liệu về cá nhân." },
            ].map((option) => (
              <label key={option.value} className={cn("cursor-pointer rounded-xl border p-4", permission === option.value ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white")}>
                <input className="sr-only" type="radio" checked={permission === option.value} onChange={() => setPermission(option.value)} />
                <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                <span className="mt-1 block text-xs text-gray-500">{option.desc}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={isPending || !name.trim()}>Tạo nhóm</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
