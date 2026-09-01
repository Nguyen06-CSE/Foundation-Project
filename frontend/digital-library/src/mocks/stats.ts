import { type ProcessingLegendItem } from "@/components/shared/ProcessingDonut";
import { type TagDistributionItem } from "@/components/shared/TagDistribution";

export interface PersonalStats {
  totalDocuments: number;
  totalDocumentsLabel: string;
  sharedCount: number;
  sharedCountLabel: string;
  storageUsed: string;
  storageTotal: string;
  storageLabel: string;
  favoriteCount: number;
  favoriteLabel: string;
}

export const personalStats: PersonalStats = {
  totalDocuments: 142,
  totalDocumentsLabel: "Tài liệu đã tải lên",
  sharedCount: 24,
  sharedCountLabel: "Chia sẻ với đồng nghiệp",
  storageUsed: "2.45 GB",
  storageTotal: "15 GB",
  storageLabel: "Trên tổng số 15 GB",
  favoriteCount: 18,
  favoriteLabel: "Được gắn dấu sao",
};

export const processingStats: { percent: number; legendItems: ProcessingLegendItem[] } = {
  percent: 75,
  legendItems: [
    { label: "Giáo trình CTDL", value: 48, color: "var(--color-primary-600)" },
    { label: "Slide Bài giảng", value: 35, color: "var(--color-primary-500)" },
    { label: "Bài tập lớn", value: 24, color: "var(--color-primary-100)" },
    { label: "Tài liệu tham khảo", value: 35, color: "var(--color-gray-200)" },
  ],
};

// Total = 24 + 18 + 15 + 9 + 6 = 72
const totalTags = 72;
export const tagDistribution: TagDistributionItem[] = [
  { name: "#CSDL", count: 24, percent: Math.round((24 / totalTags) * 100) },
  { name: "#Giáo_trình", count: 18, percent: Math.round((18 / totalTags) * 100) },
  { name: "#Bài_tập", count: 15, percent: Math.round((15 / totalTags) * 100) },
  { name: "#Tham_Khảo", count: 9, percent: Math.round((9 / totalTags) * 100) },
  { name: "#Khác", count: 6, percent: Math.round((6 / totalTags) * 100) },
];
