// frontend/digital-library/src/hooks/useDocumentFilters.ts

import { useState, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import type { DocumentQueryParams } from "@/types/document";

export type TabKey = "all" | "document" | "image" | "pdf" | "code" | "other";

export const CODE_EXTENSIONS = [
  "py", "js", "ts", "jsx", "tsx", "cpp", "c", "h", "java", "cs", 
  "go", "rs", "php", "rb", "swift", "kt", "scala", "r", "m",
  "sql", "json", "yaml", "yml", "toml", "xml", "csv",
  "html", "css", "scss", "sass", "less", "svelte", "vue",
  "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
  "md", "mdx", "rst", "tex",
  "env", "gitignore", "dockerignore", "makefile", "mk", "dockerfile"
];

export const getNormalizedExtension = (type?: string | null) => {
  if (!type) return "";
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);
  
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };
  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

export interface UseDocumentFiltersOptions {
  initialFolderId?: number | null;
  initialSort?: string;
  initialCategory?: TabKey;
}

/**
 * Hook quản lý trạng thái truy vấn & bộ lọc tài liệu phía server (Server-side Query State).
 * Hỗ trợ Debounce 300ms cho ô tìm kiếm, quản lý các state lọc và tạo `queryParams` ổn định
 * để đưa vào TanStack Query `queryKey` và `queryFn`.
 */
export function useDocumentFilters(options: UseDocumentFiltersOptions = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>(options.initialCategory || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(options.initialFolderId ?? null);
  const [selectedSort, setSelectedSort] = useState<string>(options.initialSort || "trending");
  const [selectedUploadTime, setSelectedUploadTime] = useState<string | null>(null);
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(null);

  const handleSelectFolder = useCallback((id: number | null) => {
    setSelectedFolderId((prev) => (prev === id ? null : id));
  }, []);

  const resetFilters = useCallback(() => {
    setActiveTab("all");
    setSearchQuery("");
    setSelectedTagId(null);
    setSelectedFileType(null);
    setSelectedFolderId(null);
    setSelectedSort("trending");
    setSelectedUploadTime(null);
    setSelectedAccessTime(null);
  }, []);

  // Đối tượng query parameters ổn định cho queryKey và queryFn
  const rawQueryParams: DocumentQueryParams = useMemo(() => {
    const params: DocumentQueryParams = {};

    const trimmedQ = debouncedSearchQuery.trim();
    if (trimmedQ) params.q = trimmedQ;
    if (selectedTagId !== null) params.tag_id = selectedTagId;
    if (activeTab !== "all") params.category = activeTab;
    if (selectedFileType) params.file_type = selectedFileType;
    if (selectedFolderId !== null) params.folder_id = selectedFolderId;
    if (selectedUploadTime) params.uploaded_within = selectedUploadTime;
    if (selectedAccessTime) params.accessed_within = selectedAccessTime;
    if (selectedSort) params.sort = selectedSort;

    return params;
  }, [
    debouncedSearchQuery,
    selectedTagId,
    activeTab,
    selectedFileType,
    selectedFolderId,
    selectedUploadTime,
    selectedAccessTime,
    selectedSort,
  ]);

  // Debounce mọi filter (dropdown/tab) để tránh spam request khi bấm liên tiếp.
  const queryParams = useDebounce(rawQueryParams, 150);

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    // Category / Tabs (Aliases for full UI compatibility)
    category: activeTab,
    setCategory: setActiveTab,
    activeTab,
    setActiveTab,
    activeDocumentTab: activeTab,
    setActiveDocumentTab: setActiveTab,

    // Tags & Types
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,

    // Folder
    folderId: selectedFolderId,
    setFolderId: setSelectedFolderId,
    selectedFolderId,
    setSelectedFolderId,
    handleSelectFolder,

    // Sort & Time
    sort: selectedSort,
    setSort: setSelectedSort,
    selectedSort,
    setSelectedSort,
    uploadedWithin: selectedUploadTime,
    setUploadedWithin: setSelectedUploadTime,
    selectedUploadTime,
    setSelectedUploadTime,
    accessWithin: selectedAccessTime,
    setAccessWithin: setSelectedAccessTime,
    selectedAccessTime,
    setSelectedAccessTime,

    // Utilities
    resetFilters,
    queryParams,
  };
}
