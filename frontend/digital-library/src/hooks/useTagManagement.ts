import { useState, useCallback, useEffect } from "react";
import { tagService, groupTagService, type Tag } from "@/services/tagService";
interface UseTagManagementOptions {
  initialTags?: Tag[];
  groupId?: number | string;
  onTagsChange?: () => void;
}

export function useTagManagement(options: UseTagManagementOptions = {}) {
  const { initialTags = [], groupId, onTagsChange } = options;
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Tự động chọn service tương ứng: Group Space (/workspaces/{groupId}/tags) hoặc Personal Space (/tags)
  const activeService = groupId ? groupTagService : tagService;

  // Cập nhật local tags khi initialTags truyền từ component cha thay đổi
  useEffect(() => {
    if (initialTags.length > 0) {
      setTags(initialTags);
    }
  }, [initialTags]);

  // Tải lại danh sách tag từ API
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await activeService.getAll(groupId);
      setTags(data);
      if (onTagsChange) onTagsChange();
    } catch (error) {
      console.error("Lỗi khi tải nhãn dán:", error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, onTagsChange, activeService]);

  // Tạo tag mới
  const handleCreateTag = async (name: string, color: string) => {
    await activeService.create({ name, color }, groupId);
    await fetchTags();
  };

  // Sửa tag
  const handleEditTag = async (id: number, name: string, color: string) => {
    await activeService.update(id, { name, color }, groupId);
    await fetchTags();
  };

  // Xóa tag
  const handleDeleteTag = async (id: number) => {
    await activeService.delete(id, groupId);
    await fetchTags();
  };

  return {
    tags,
    setTags,
    isLoading,
    isManageModalOpen,
    openManageModal: () => setIsManageModalOpen(true),
    closeManageModal: () => setIsManageModalOpen(false),
    handleCreateTag,
    handleEditTag,
    handleDeleteTag,
    reloadTags: fetchTags,
  };
}