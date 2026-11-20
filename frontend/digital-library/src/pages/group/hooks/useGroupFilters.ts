// src/pages/group/hooks/useGroupFilters.ts

import { useState, useEffect } from "react";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import type { Folder } from "@/types/document";

export function useGroupFilters(folders: Folder[] | any[] = []) {
  const filters = useDocumentFilters({ initialSort: "trending" });
  const [selectedUploaderId, setSelectedUploaderId] = useState<number | null>(null);
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(null);

  const { activeTab: _docTab, setActiveTab: _setDocTab, ...restFilters } = filters;
  const { selectedFolderId, setSelectedFolderId } = filters;

  // Tự động bỏ chọn folder nếu folder đó bị xóa khỏi danh sách (chỉ kiểm tra khi danh sách folders đã tải xong)
  useEffect(() => {
    if (
      selectedFolderId !== null &&
      folders &&
      folders.length > 0 &&
      !folders.some((f: any) => f.id === selectedFolderId)
    ) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId, setSelectedFolderId]);

  return {
    ...restFilters,
    activeDocumentTab: filters.activeTab,
    setActiveDocumentTab: filters.setActiveTab,
    selectedUploaderId,
    setSelectedUploaderId,
    selectedAccessTime,
    setSelectedAccessTime,
  };
}
