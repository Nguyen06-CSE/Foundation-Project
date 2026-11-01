import { Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import type { ContributionStats } from "@/types/dashboard";

export interface ContributionCardProps {
  contributions: ContributionStats;
  onContribute: () => void;
}

const MILESTONES = [1, 5, 10, 25, 50];

export function ContributionCard({ contributions, onContribute }: ContributionCardProps) {
  const approved = contributions.approved;
  const nextMilestone = MILESTONES.find((milestone) => approved < milestone) ?? 50;
  const previousMilestone = [...MILESTONES].reverse().find((milestone) => approved >= milestone) ?? 0;
  const progress = approved >= 50 ? 100 : Math.round(((approved - previousMilestone) / (nextMilestone - previousMilestone)) * 100);
  const items = [
    { label: "Đã gửi", value: contributions.total },
    { label: "Đã duyệt", value: contributions.approved },
    { label: "Chờ duyệt", value: contributions.pending },
    { label: "Từ chối", value: contributions.rejected },
  ];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary-600" /><h2 className="text-sm font-semibold text-gray-900">Đóng góp học liệu</h2></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {items.map((item) => <div key={item.label}><p className="text-2xl font-bold leading-none text-gray-900">{item.value}</p><p className="mt-1 text-[11px] text-gray-500">{item.label}</p></div>)}
      </div>
      <div className="mt-3"><ProgressBar value={progress} color="bg-primary-600" className="h-1.5" /><p className="mt-1.5 text-[11px] text-gray-500">{approved >= 50 ? "Bạn đã đạt mốc đóng góp cao nhất." : `Còn ${nextMilestone - approved} tài liệu được duyệt để đạt mốc ${nextMilestone}.`}</p></div>
      <Button size="sm" variant="outline" onClick={onContribute} className="mt-3">Đóng góp thêm</Button>
    </Card>
  );
}
