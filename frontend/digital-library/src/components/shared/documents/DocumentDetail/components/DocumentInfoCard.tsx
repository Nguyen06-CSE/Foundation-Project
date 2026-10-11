// src/components/shared/documents/DocumentDetail/components/DocumentInfoCard.tsx

import { Card } from "@/components/ui/Card";
import type { TagType } from "../DocumentDetail.types";
import { DocumentTagSection } from "./DocumentTagSection";

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">
        {value}
      </span>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}

export function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}

interface DocumentInfoCardProps {
  title: string;
  fileTypeLabel: string;
  sizeLabel: string;
  uploadedAt: string;
  tags: TagType[];
  canManageTags: boolean;
  allTags: TagType[];
  isLoadingTags: boolean;
  onSaveTags: (tagIds: number[]) => void;
  isSavingTags: boolean;
  onCreateTag: (newTag: { name: string; color: string }, onCreated?: (tag: TagType) => void) => void;
  isCreatingTag: boolean;
  onRemoveTag: (tagId: number) => void;
  isRemovingTag: boolean;
}

/**
 * DocumentInfoCard - Card hiển thị chi tiết thuộc tính tệp, nhãn dán và thống kê
 */
export function DocumentInfoCard({
  title,
  fileTypeLabel,
  sizeLabel,
  uploadedAt,
  tags,
  canManageTags,
  allTags,
  isLoadingTags,
  onSaveTags,
  isSavingTags,
  onCreateTag,
  isCreatingTag,
  onRemoveTag,
  isRemovingTag,
}: DocumentInfoCardProps) {
  const displayTitle = title.length > 22 ? title.slice(0, 22) + "…" : title;

  return (
    <Card>
      <h2 className="text-base font-semibold text-gray-900 mb-3">
        Thông tin tệp
      </h2>

      <div>
        <InfoRow label="Tên tệp" value={displayTitle} />
        <InfoRow label="Loại tệp" value={fileTypeLabel} />
        <InfoRow label="Dung lượng" value={sizeLabel} />
        <InfoRow label="Ngày tải lên" value={uploadedAt} />
      </div>

      {/* Quản lý danh sách nhãn dán */}
      <DocumentTagSection
        tags={tags}
        canManageTags={canManageTags}
        allTags={allTags}
        isLoadingTags={isLoadingTags}
        onSaveTags={onSaveTags}
        isSavingTags={isSavingTags}
        onCreateTag={onCreateTag}
        isCreatingTag={isCreatingTag}
        onRemoveTag={onRemoveTag}
        isRemovingTag={isRemovingTag}
      />

      {/* Thống kê tương tác */}
      <div className="mt-6 flex justify-around border-t border-gray-100 pt-4">
        <StatItem label="Lượt xem" value={0} />
        <div className="w-px bg-gray-100" />
        <StatItem label="Tải xuống" value={0} />
        <div className="w-px bg-gray-100" />
        <StatItem label="Đã chia sẻ" value={0} />
      </div>
    </Card>
  );
}
