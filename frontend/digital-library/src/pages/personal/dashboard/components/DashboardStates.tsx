import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface DashboardErrorProps {
  onRetry: () => void;
}

export function DashboardError({ onRetry }: DashboardErrorProps) {
  return <Card className="flex flex-col items-center justify-center p-12 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertTriangle className="h-6 w-6" /></div>
    <h2 className="mt-4 text-base font-semibold text-gray-900">Không thể tải dữ liệu trang tổng quan</h2>
    <p className="mt-1 max-w-md text-xs text-gray-500">Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại sau.</p>
    <Button variant="primary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry} className="mt-4">Thử lại</Button>
  </Card>;
}

export function DashboardLoading() {
  return <div className="flex animate-pulse flex-col gap-4">
    <div className="h-12 rounded-xl bg-gray-200" />
    <div className="h-20 rounded-xl bg-gray-200" />
    <div className="h-64 rounded-xl bg-gray-200" />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-52 rounded-xl bg-gray-200" />)}</div>
  </div>;
}
