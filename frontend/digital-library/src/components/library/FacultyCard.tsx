// frontend/digital-library/src/components/library/FacultyCard.tsx

import { GraduationCap, BookOpen, Layers, ArrowRight } from "lucide-react";

interface Faculty {
  id: string | number;
  name: string;
  code: string;
  description?: string;
  subject_count?: number;
  document_count?: number;
}

interface FacultyCardProps {
  faculty: Faculty;
  index?: number;
  totalLibraryDocs?: number;
  onClick: () => void;
}

export function FacultyCard({
  faculty,
  totalLibraryDocs = 0,
  onClick,
}: FacultyCardProps) {
  const subjectCount = faculty.subject_count || 0;
  const docCount = faculty.document_count || 0;

  const docPercentage =
    totalLibraryDocs > 0 ? Math.round((docCount / totalLibraryDocs) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500/60 hover:shadow-md cursor-pointer min-h-[200px]"
    >
      {/* Chữ Watermark Mã Khoa in chìm cực nhẹ ở góc phải */}
      <span className="pointer-events-none absolute right-3 top-2 select-none text-5xl font-black tracking-tighter text-gray-900/[0.025] group-hover:text-primary-900/[0.04] transition-colors">
        {faculty.code}
      </span>

      {/* Phần Đầu Card: Icon + Mã Khoa + Tên Khoa + Mô tả */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-200">
            <GraduationCap className="h-5 w-5" />
          </div>

          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors uppercase">
            {faculty.code}
          </span>
        </div>

        <h3 className="mt-4 text-base sm:text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1">
          {faculty.name}
        </h3>

        <p className="mt-1.5 text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {faculty.description ||
            `Tổng hợp giáo trình, bài giảng, đề cương và đề thi các học phần thuộc ${faculty.name}.`}
        </p>
      </div>

      {/* Phần Cuối Card: Thống kê + Thanh tiến độ đơn sắc nhẹ nhàng */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-gray-400" />
              <strong className="font-semibold text-gray-800">{subjectCount}</strong> môn học
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <strong className="font-semibold text-gray-800">{docCount}</strong> tài liệu
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all">
            Xem khoa
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Thanh tiến độ màu xám nhạt, chỉ chuyển xanh lá dịu khi hover */}
        <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-300 group-hover:bg-primary-500 transition-colors duration-300"
            style={{ width: `${Math.max(docPercentage, docCount > 0 ? 10 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default FacultyCard;
