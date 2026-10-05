import { cn } from "@/utils/cn";

export interface ProgressBarProps {
  value: number; // 0 to 100
  color?: string; // Optional tailwind background color class, defaults to primary-500 if not specified
  className?: string;
}

const ProgressBar = ({ value, color, className }: ProgressBarProps) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gray-100", className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-300", color || "bg-primary-500")}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};

export { ProgressBar };
