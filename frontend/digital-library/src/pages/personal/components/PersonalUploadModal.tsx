// frontend/digital-library/src/pages/personal/components/PersonalUploadModal.tsx

import { UploadModal } from "@/components/shared/UploadModal"

interface PersonalUploadModalProps {
  onClose: () => void
  tags?: Array<{ id: number; name: string }>
  createTagMutation: { mutateAsync: (name: string) => Promise<any> }
  uploadMutation: { mutateAsync: (fd: FormData) => Promise<any>; isPending: boolean }
}

export function PersonalUploadModal({
  onClose,
  tags = [],
  createTagMutation,
  uploadMutation,
}: PersonalUploadModalProps) {
  const handleUpload = async (formData: FormData, selectedTagIds: number[]) => {
    if (selectedTagIds.length > 0) {
      selectedTagIds.forEach((id) => {
        formData.append("tag_ids", id.toString())
      })
    }
    await uploadMutation.mutateAsync(formData)
    onClose()
  }

  return (
    <UploadModal
      onClose={onClose}
      availableTags={tags}
      onCreateTag={async (name) => {
        return await createTagMutation.mutateAsync(name)
      }}
      onUpload={handleUpload}
      isUploading={uploadMutation.isPending}
    />
  )
}