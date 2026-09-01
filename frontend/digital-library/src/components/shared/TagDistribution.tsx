import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";

export interface TagDistributionItem {
  name: string;
  count: number;
  percent: number;
}

export interface TagDistributionProps {
  tags: TagDistributionItem[];
}

export function TagDistribution({ tags }: TagDistributionProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Phân bổ nhãn dán</h3>
      </div>
      <div className="space-y-4">
        {tags.map((tag, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{tag.name}</span>
              <span className="text-sm text-gray-500">{tag.count}</span>
            </div>
            <ProgressBar value={tag.percent} color="bg-primary-500" />
          </div>
        ))}
      </div>
    </Card>
  );
}
