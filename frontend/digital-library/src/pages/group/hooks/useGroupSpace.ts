// src/pages/group/hooks/useGroupSpace.ts
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { GroupTab } from "../types/groupSpace.types";

import { useGroupData } from "./useGroupData";
import { useGroupDocuments } from "./useGroupDocuments";
import { useGroupFolders } from "./useGroupFolders";
import { useGroupFilters } from "./useGroupFilters";

export function useGroupSpace() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as GroupTab) || "documents";

  const [shareModal, setShareModal] = useState<"documents" | "folder" | "invite" | null>(null);

  // 1. Quản lý Dữ liệu nhóm & Thành viên
  const groupData = useGroupData(groupId);

  // 2. Quản lý Thư mục (Khởi tạo trước để lấy danh sách groupFolders.folders)
  const groupFolders = useGroupFolders(
    groupId,
    !!groupData.workspace,
    (deletedId) => {
      if (groupFilters.selectedFolderId === deletedId) {
        groupFilters.setSelectedFolderId(null);
      }
    }
  );

  // 3. Quản lý Bộ lọc & Instant Search (Server-side queryParams)
  const groupFilters = useGroupFilters(groupFolders.folders);

  // 4. Quản lý Tài liệu với useInfiniteQuery và Server-side filtering
  const groupDocs = useGroupDocuments(groupId, !!groupData.workspace, groupFilters.queryParams);

  // Lọc tài liệu theo người tải lên (nếu người dùng chọn từ dropdown)
  const filteredDocuments = useMemo(() => {
    if (groupFilters.selectedUploaderId !== null) {
      return groupDocs.documents.filter((doc: any) => {
        const uploaderId =
          doc.uploader_id ?? doc.user_id ?? doc.created_by ?? doc.uploaded_by ?? doc.owner?.id ?? doc.owner_id;
        return Number(uploaderId) === Number(groupFilters.selectedUploaderId);
      });
    }
    return groupDocs.documents;
  }, [groupDocs.documents, groupFilters.selectedUploaderId]);

  // Guard điều hướng
  useEffect(() => {
    if (!id || isNaN(groupId)) {
      navigate("/groups", { replace: true });
    }
  }, [id, groupId, navigate]);

  const setTab = (tab: GroupTab) =>
    setSearchParams(tab === "documents" ? {} : { tab });

  return {
    groupId,
    navigate,
    activeTab,
    setTab,
    queryClient,
    shareModal,
    setShareModal,

    ...groupData,
    ...groupDocs,
    ...groupFolders,
    ...groupFilters,
    filteredDocuments,

    // Ghi đè hàm handleFolderAction để hỗ trợ setShareModal
    handleFolderAction: (action: any, folderId: number) =>
      groupFolders.handleFolderAction(action, folderId, setShareModal),
  };
}
