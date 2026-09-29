import { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

export interface StatCardProps {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  subLabel?: string;
  className?: string;
}

export function StatCard({ icon, iconBg, label, value, subLabel, className }: StatCardProps) {
  return (
    <Card className={cn("flex items-center gap-4 p-5", className)}>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center h-12 w-12 rounded-xl",
            iconBg
          )}
        >
          {icon}
        </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="text-3xl font-bold text-gray-900 leading-tight">{value}</div>
        {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
      </div>
    </Card>
  );
}
