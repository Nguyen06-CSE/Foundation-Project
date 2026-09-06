// src/pages/group/components/GroupUploadModal.tsx

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadModal, type TagItem } from "@/components/shared/UploadModal";
import { groupTagService } from "@/services/tagService";
import { groupDocumentService } from "@/services/documentService";

interface GroupUploadModalProps {
  groupId: number;
  groupTags?: TagItem[];
  onClose: () => void;
}

export function GroupUploadModal({
  groupId,
  groupTags = [],
  onClose,
}: GroupUploadModalProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateTag = async (name: string) => {
    return await groupTagService.create({ name, color: "#2F6B3C" }, groupId);
  };

  const handleUpload = async (formData: FormData, selectedTagIds: number[]) => {
    setIsUploading(true);
    try {
      const newDoc = await groupDocumentService.upload(formData, groupId);

      if (selectedTagIds.length > 0) {
        await Promise.all(
          selectedTagIds.map((tagId) =>
            groupDocumentService.attachTag(groupId, newDoc.id, tagId)
          )
        );
      }

      queryClient.invalidateQueries({
        queryKey: ["group-documents", groupId],
      });
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <UploadModal
      onClose={onClose}
      availableTags={groupTags}
      onCreateTag={handleCreateTag}
      onUpload={handleUpload}
      isUploading={isUploading}
    />
  );
}