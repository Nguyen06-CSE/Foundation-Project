// frontend/digital-library/src/components/library/LibraryStatsPanel.tsx

import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Layers,
  GraduationCap,
  TrendingUp,
  UploadCloud,
  FileCheck2,
  ShieldAlert,
} from "lucide-react";
import type { Faculty } from "@/types/library";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

export interface LibraryStatsPanelProps {
  faculties: Faculty[];
  totalSubjects: number;
  totalDocuments: number;
  className?: string;
}

export function LibraryStatsPanel({
  faculties,
  totalSubjects,
  totalDocuments,
  className = "",
}: LibraryStatsPanelProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Sắp xếp top 5 khoa có nhiều tài liệu nhất (dữ liệu thật từ backend)
  const topFaculties = [...faculties]
    .sort((a, b) => (b.document_count || 0) - (a.document_count || 0))
    .slice(0, 5);

  const handleContributeClick = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", "/personal/documents");
      navigate("/login");
    } else {
      navigate("/personal/documents");
    }
  };

  return (
    <aside className={`flex flex-col gap-5 ${className}`}>
      {/* 1. Panel Thống Kê Tổng Quan */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">
              Thống kê học liệu
            </h2>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Dữ liệu thực
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {/* Tổng tài liệu */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50/80 p-3 border border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">
                Tài liệu công khai
              </span>
            </div>
            <span className="text-base font-bold text-gray-900">
              {totalDocuments.toLocaleString("vi-VN")}
            </span>
          </div>

          {/* Tổng môn học */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50/80 p-3 border border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">
                Môn học có học liệu
              </span>
            </div>
            <span className="text-base font-bold text-gray-900">
              {totalSubjects.toLocaleString("vi-VN")}
            </span>
          </div>

          {/* Khoa đào tạo */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50/80 p-3 border border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">
                Khoa đào tạo
              </span>
            </div>
            <span className="text-base font-bold text-gray-900">
              {faculties.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Khoa Sôi Nổi Nhất */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">
              Khoa đóng góp nhiều nhất
            </h2>
          </div>
        </div>

        <div className="mt-3 divide-y divide-gray-100">
          {topFaculties.map((f, idx) => {
            const pct =
              totalDocuments > 0
                ? Math.round(((f.document_count || 0) / totalDocuments) * 100)
                : 0;

            return (
              <Link
                key={f.id}
                to={`/library/faculty/${f.id}`}
                className="group flex flex-col py-2.5 transition-colors hover:bg-gray-50/60 rounded-lg px-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800"
                          : idx === 1
                            ? "bg-gray-200 text-gray-700"
                            : idx === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className="font-medium text-gray-800 group-hover:text-primary-700 truncate"
                      title={f.name}
                    >
                      {f.name}
                    </span>
                  </div>

                  <span className="shrink-0 text-[11px] font-semibold text-gray-600">
                    {f.document_count || 0} tài liệu
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${Math.max(pct, (f.document_count || 0) > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-7 text-right">
                    {pct}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Call-to-action Đóng Góp Tài Liệu */}
      <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/70 via-white to-primary-50/40 p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-xs">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Chia sẻ tài liệu của bạn
            </h3>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              Cùng xây dựng kho tài liệu phong phú cho sinh viên Đại học Đà Lạt. Mọi tài liệu đóng góp đều được duyệt trước khi công khai.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleContributeClick}
          className="mt-4 w-full justify-center font-semibold text-xs"
          icon={<FileCheck2 className="h-4 w-4" />}
        >
          {isAuthenticated ? "Đóng góp tài liệu ngay" : "Đăng nhập để đóng góp"}
        </Button>
      </div>

      {/* 4. Quy Định & Lưu Ý Học Liệu */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500 shadow-xs">
        <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-gray-400" />
          <span>Quy chế kho học liệu mở</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-500">
          Chỉ chia sẻ tài liệu phục vụ học tập, nghiên cứu. Vui lòng tôn trọng quyền tác giả và không tải lên nội dung vi phạm bản quyền.
        </p>
      </div>
    </aside>
  );
}

export default LibraryStatsPanel;
