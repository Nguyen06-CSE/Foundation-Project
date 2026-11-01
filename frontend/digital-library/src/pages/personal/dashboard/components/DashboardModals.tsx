import { UploadModal } from "@/components/shared/modals/UploadModal";
import { CreateFolderModal, type FolderSubmitData } from "@/components/shared/modals/CreateFolderModal";
import type { Tag } from "@/types/document";

export interface DashboardModalsProps {
  uploadOpen: boolean;
  folderOpen: boolean;
  tags: Tag[];
  isUploading: boolean;
  isCreatingFolder: boolean;
  onCloseUpload: () => void;
  onCloseFolder: () => void;
  onUpload: (formData: FormData) => Promise<void>;
  onCreateFolder: (data: FolderSubmitData) => Promise<void>;
}

export function DashboardModals({ uploadOpen, folderOpen, tags, isUploading, isCreatingFolder, onCloseUpload, onCloseFolder, onUpload, onCreateFolder }: DashboardModalsProps) {
  return <>
    {uploadOpen && <UploadModal onClose={onCloseUpload} initialMode="single" availableTags={tags} onUpload={(formData) => onUpload(formData)} isUploading={isUploading} />}
    {folderOpen && <CreateFolderModal onClose={onCloseFolder} availableTags={tags} onSubmitData={onCreateFolder} isSubmitting={isCreatingFolder} />}
  </>;
}
