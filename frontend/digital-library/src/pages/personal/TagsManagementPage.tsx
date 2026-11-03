import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag as TagIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  Folder,
  GitMerge,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { tagService, type TagStats } from "@/services/tagService";
import { useToastStore } from "@/stores/toastStore";
import { cn } from "@/utils/cn";

const TAG_COLORS = [
  { hex: "#ef4444", label: "Đỏ" },
  { hex: "#f97316", label: "Cam" },
  { hex: "#eab308", label: "Vàng" },
  { hex: "#22c55e", label: "Xanh lá" },
  { hex: "#3b82f6", label: "Xanh dương" },
  { hex: "#a855f7", label: "Tím" },
  { hex: "#ec4899", label: "Hồng" },
  { hex: "#64748b", label: "Xám" },
];

export function TagsManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "used" | "unused">("all");

  // Tạo nhãn mới
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[4].hex);

  // Chỉnh sửa nhãn
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(TAG_COLORS[4].hex);

  // Tích chọn nhiều nhãn để gộp / xóa
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<number | "">("");

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags", "stats"],
    queryFn: tagService.getStats,
  });

  const invalidateAllTagData = () => {
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const createMutation = useMutation({
    mutationFn: () => tagService.create({ name: newName.trim(), color: newColor }),
    onSuccess: () => {
      setNewName("");
      invalidateAllTagData();
      addToast({ message: "Đã tạo nhãn dán mới", variant: "success" });
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.detail || "Không thể tạo nhãn dán",
        variant: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: number; name: string; color: string }) =>
      tagService.update(id, { name, color }),
    onSuccess: () => {
      setEditingId(null);
      invalidateAllTagData();
      addToast({ message: "Đã cập nhật nhãn dán", variant: "success" });
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.detail || "Không thể cập nhật nhãn dán",
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tagService.delete(id),
    onSuccess: (_, deletedId) => {
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
      invalidateAllTagData();
      addToast({ message: "Đã xóa nhãn dán", variant: "success" });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ sourceIds, targetId }: { sourceIds: number[]; targetId: number }) =>
      tagService.merge(sourceIds, targetId),
    onSuccess: () => {
      setSelectedIds([]);
      setMergeTargetId("");
      invalidateAllTagData();
      addToast({ message: "Đã gộp các nhãn dán thành công", variant: "success" });
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.detail || "Không thể gộp nhãn dán",
        variant: "error",
      });
    },
  });

  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      const matchName =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const totalUsed = (t.document_count || 0) + (t.folder_count || 0);
      const matchFilter =
        filterMode === "all" ||
        (filterMode === "used" && totalUsed > 0) ||
        (filterMode === "unused" && totalUsed === 0);
      return matchName && matchFilter;
    });
  }, [tags, searchQuery, filterMode]);

  const usedCount = useMemo(
    () => tags.filter((t) => (t.document_count || 0) + (t.folder_count || 0) > 0).length,
    [tags]
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const startEdit = (tag: TagStats) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || TAG_COLORS[4].hex);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý nhãn dán (Tags)</h1>
          <p className="text-sm text-gray-500">
            Tạo mới, đổi tên, chọn màu sắc, gộp hoặc xóa các nhãn phân loại tài liệu và thư mục cá nhân.
          </p>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Tổng số nhãn</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{tags.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <TagIcon className="h-5 w-5" />
          </div>
        </Card>
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Đang gắn tài liệu / thư mục</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{usedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileText className="h-5 w-5" />
          </div>
        </Card>
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Chưa sử dụng</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{tags.length - usedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Folder className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Form Tạo Nhãn Mới */}
      <Card className="p-5">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Tên nhãn dán mới
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập tên nhãn (vd: Đề cương ôn thi, Học kỳ 1, Quan trọng...)"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Màu sắc
            </label>
            <div className="flex items-center gap-2 py-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setNewColor(c.hex)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform",
                    newColor === c.hex ? "scale-125 ring-2 ring-gray-900 ring-offset-2" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            icon={<Plus className="h-4 w-4" />}
          >
            {createMutation.isPending ? "Đang tạo..." : "Thêm nhãn"}
          </Button>
        </form>
      </Card>

      {/* Bộ lọc & Thanh thao tác gộp/xóa nhiều */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhãn dán theo tên..."
              className="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-9 text-sm text-gray-800 focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "used", label: "Đang dùng" },
                { key: "unused", label: "Chưa dùng" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilterMode(item.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  filterMode === item.key
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thanh gộp / xóa khi chọn nhiều nhãn */}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-3">
            <span className="text-xs font-semibold text-primary-900">
              Đã chọn {selectedIds.length} nhãn dán
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length >= 2 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value ? Number(e.target.value) : "")}
                    className="rounded-lg border border-primary-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
                  >
                    <option value="">-- Chọn nhãn đích để gộp vào --</option>
                    {tags
                      .filter((t) => selectedIds.includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!mergeTargetId || mergeMutation.isPending}
                    onClick={() => {
                      if (!mergeTargetId) return;
                      mergeMutation.mutate({
                        sourceIds: selectedIds.filter((id) => id !== Number(mergeTargetId)),
                        targetId: Number(mergeTargetId),
                      });
                    }}
                    icon={<GitMerge className="h-3.5 w-3.5" />}
                  >
                    Gộp nhãn
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                variant="danger"
                onClick={async () => {
                  if (!confirm(`Xóa ${selectedIds.length} nhãn đã chọn?`)) return;
                  await Promise.all(selectedIds.map((id) => tagService.delete(id)));
                  setSelectedIds([]);
                  invalidateAllTagData();
                  addToast({ message: "Đã xóa các nhãn đã chọn", variant: "success" });
                }}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Xóa ({selectedIds.length})
              </Button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-500 underline hover:text-gray-800"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Danh sách nhãn */}
        <div className="mt-4 divide-y divide-gray-100">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-gray-500">Đang tải danh sách nhãn...</p>
          ) : filteredTags.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              Không tìm thấy nhãn dán nào phù hợp.
            </p>
          ) : (
            filteredTags.map((tag) => {
              const isEditing = editingId === tag.id;
              const isSelected = selectedIds.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className={cn(
                    "flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                    isSelected && "bg-primary-50/40 px-2 rounded-lg"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(tag.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600"
                    />

                    {isEditing ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border border-primary-400 px-2.5 py-1 text-sm text-gray-900 focus:outline-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-1.5">
                          {TAG_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setEditColor(c.hex)}
                              className={cn(
                                "h-5 w-5 rounded-full",
                                editColor === c.hex && "ring-2 ring-gray-900 ring-offset-1"
                              )}
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateMutation.mutate({
                              id: tag.id,
                              name: editName.trim(),
                              color: editColor,
                            })
                          }
                          disabled={!editName.trim() || updateMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          <X className="h-3.5 w-3.5" />
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: tag.color || "#3b82f6" }}
                        />
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {tag.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">
                            {tag.document_count || 0} tài liệu
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">
                            {tag.folder_count || 0} thư mục
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/personal/documents?tag=${tag.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Xem tài liệu
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(tag)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const used = (tag.document_count || 0) + (tag.folder_count || 0);
                          const msg =
                            used > 0
                              ? `Nhãn "${tag.name}" đang gắn với ${tag.document_count} tài liệu và ${tag.folder_count} thư mục. Bạn có chắc chắn muốn xóa?`
                              : `Xóa nhãn "${tag.name}"?`;
                          if (confirm(msg)) {
                            deleteMutation.mutate(tag.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

export default TagsManagementPage;
