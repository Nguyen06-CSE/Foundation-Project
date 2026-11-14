// src/pages/group/hooks/useGroupFilters.ts

import { useState, useEffect } from "react";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import type { Folder } from "@/types/document";

export function useGroupFilters(folders: Folder[] | any[] = []) {
  const filters = useDocumentFilters({ initialSort: "trending" });
  const [selectedUploaderId, setSelectedUploaderId] = useState<number | null>(null);
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(null);

  // Tự động bỏ chọn folder nếu folder đó bị xóa khỏi danh sách
  useEffect(() => {
    if (
      filters.selectedFolderId !== null &&
      folders &&
      !folders.some((f: any) => f.id === filters.selectedFolderId)
    ) {
      filters.setSelectedFolderId(null);
    }
  }, [folders, filters.selectedFolderId, filters.setSelectedFolderId]);

  const { activeTab: _docTab, setActiveTab: _setDocTab, ...restFilters } = filters;

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
