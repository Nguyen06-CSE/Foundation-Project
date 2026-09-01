import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";

export interface ProcessingLegendItem {
  label: string;
  value: number;
  color: string;
}

export interface ProcessingDonutProps {
  percent: number;
  legendItems: ProcessingLegendItem[];
}

export function ProcessingDonut({ percent, legendItems }: ProcessingDonutProps) {
  // We use recharts with the legend data
  const data = legendItems.map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color,
  }));

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Xử lý tài liệu</h3>
      </div>
      <div className="flex items-center">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{percent}%</span>
          </div>
        </div>
        <div className="ml-6 flex-1 space-y-2">
          {legendItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
