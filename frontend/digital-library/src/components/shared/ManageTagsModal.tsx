// src/components/shared/ManageTagsModal.tsx
import React, { useState, useMemo } from "react";
import { X, Search, Check, Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface TagItem {
  id: number;
  name: string;
  color?: string; // Nếu DB bạn có lưu màu
}

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagItem[];
  onCreateTag?: (name: string, color: string) => Promise<void>;
  onEditTag?: (id: number, newName: string, newColor: string) => Promise<void>;
  onDeleteTag?: (id: number) => Promise<void>;
}

// Bảng màu chuẩn (bạn có thể đưa vào thư mục constants/colors.ts)
const COLORS = [
  { hex: "#ef4444", tw: "bg-red-500" },
  { hex: "#f97316", tw: "bg-orange-500" },
  { hex: "#eab308", tw: "bg-yellow-500" },
  { hex: "#22c55e", tw: "bg-green-500" },
  { hex: "#3b82f6", tw: "bg-blue-500" },
  { hex: "#a855f7", tw: "bg-purple-500" },
  { hex: "#ec4899", tw: "bg-pink-500" },
  { hex: "#64748b", tw: "bg-slate-500" },
];

export function ManageTagsModal({
  isOpen,
  onClose,
  tags,
  onCreateTag,
  onEditTag,
  onDeleteTag,
}: ManageTagsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // State dùng chung cho việc tạo mới HOẶC edit
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLORS[4].hex);
  const [isLoading, setIsLoading] = useState(false);

  // Lọc tag theo ô tìm kiếm
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    return tags.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [tags, searchQuery]);

  const isExactMatch = tags.some(
    (t) => t.name.toLowerCase() === searchQuery.toLowerCase().trim()
  );

  if (!isOpen) return null;

  // Xử lý tạo mới
  const handleCreate = async () => {
    if (!onCreateTag || !searchQuery.trim()) return;
    setIsLoading(true);
    try {
      await onCreateTag(searchQuery.trim(), editColor);
      setSearchQuery(""); // Reset sau khi tạo thành công
    } finally {
      setIsLoading(false);
    }
  };

  // Bắt đầu chế độ sửa
  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || COLORS[4].hex);
  };

  // Lưu sửa đổi
  const handleSaveEdit = async () => {
    if (!onEditTag || !editingId || !editName.trim()) return;
    setIsLoading(true);
    try {
      await onEditTag(editingId, editName.trim(), editColor);
      setEditingId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý xóa
  const handleDelete = async (id: number) => {
    if (!onDeleteTag || !confirm("Bạn có chắc chắn muốn xóa nhãn dán này?")) return;
    setIsLoading(true);
    try {
      await onDeleteTag(id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Tag className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Quản lý nhãn dán</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
          {/* Ô Tìm kiếm / Tạo mới */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hoặc nhập tên tag mới..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Form Tạo mới (Chỉ hiện khi gõ mà chưa có tag trùng tên) */}
          {searchQuery.trim() !== "" && !isExactMatch && onCreateTag && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/30 p-3 animate-in fade-in slide-in-from-top-2">
              <p className="mb-2 text-xs font-medium text-gray-700">Chọn màu cho tag mới:</p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setEditColor(color.hex)}
                    className={cn(
                      `flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                      editColor === color.hex ? "ring-2 ring-gray-900 ring-offset-1" : "ring-1 ring-black/10"
                    )}
                  >
                    {editColor === color.hex && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full flex justify-center gap-2"
                onClick={handleCreate}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                {isLoading ? "Đang xử lý..." : `Tạo thẻ "${searchQuery.trim()}"`}
              </Button>
            </div>
          )}

          {/* Danh sách Tags */}
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Danh sách nhãn dán ({filteredTags.length})
            </p>
            
            {filteredTags.length === 0 && searchQuery.trim() === "" ? (
              <div className="text-center py-6 text-sm text-gray-400">Bạn chưa có nhãn dán nào.</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm hover:border-gray-200"
                  >
                    {editingId === tag.id ? (
                      // CHẾ ĐỘ SỬA
                      <div className="flex w-full flex-col gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5">
                            {COLORS.map((color) => (
                              <button
                                key={color.hex}
                                onClick={() => setEditColor(color.hex)}
                                className={cn(
                                  `h-5 w-5 rounded-full ${color.tw}`,
                                  editColor === color.hex ? "ring-2 ring-gray-900 ring-offset-1" : ""
                                )}
                              />
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Hủy</Button>
                            <Button size="sm" variant="primary" onClick={handleSaveEdit} disabled={isLoading}>Lưu</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // CHẾ ĐỘ HIỂN THỊ
                      <>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full shadow-inner"
                            style={{ backgroundColor: tag.color || COLORS[4].hex }}
                          />
                          <span className="text-sm font-medium text-gray-700">{tag.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100 md:opacity-100">
                          {onEditTag && (
                            <button onClick={() => startEdit(tag)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDeleteTag && (
                            <button onClick={() => handleDelete(tag.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}