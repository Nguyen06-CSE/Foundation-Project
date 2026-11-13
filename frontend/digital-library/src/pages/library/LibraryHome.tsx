// frontend/digital-library/src/pages/library/LibraryHome.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, GraduationCap, BookOpen, Layers, AlertCircle, X, Clock3, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { FacultyCard } from "@/components/library/FacultyCard";
import { libraryService } from "@/services/libraryService";
import { CardSkeleton } from "@/components/shared/feedback/CardSkeleton";
import { DocumentCard } from "@/components/shared/documents";
import { toCommunityDocItem } from "@/utils/communityDocumentAdapters";

export function LibraryHome() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: faculties = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["library-faculties"],
    queryFn: libraryService.getFaculties,
  });

  const sortedFaculties = [...faculties].sort((a, b) => {
    if (a.document_count > 0 && b.document_count === 0) return -1;
    if (a.document_count === 0 && b.document_count > 0) return 1;
    return b.document_count - a.document_count;
  });

  const filteredFaculties = sortedFaculties.filter((f) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
  });

  const totalSubjects = faculties.reduce((acc, f) => acc + (f.subject_count || 0), 0);
  const totalDocuments = faculties.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const activeFacultyCount = faculties.filter((faculty) => faculty.document_count > 0).length;
  const emptyFacultyCount = faculties.length - activeFacultyCount;
  const searchLabel = searchTerm.trim();

  const emptyFacultyExamples = useMemo(
    () => sortedFaculties.filter((faculty) => faculty.document_count === 0).slice(0, 3),
    [sortedFaculties],
  );

  const recentFacultyIds = useMemo(
    () => sortedFaculties.filter((faculty) => faculty.document_count > 0).slice(0, 3).map((faculty) => faculty.id),
    [sortedFaculties],
  );
  
  const { data: recentSearchData, isLoading: isRecentLoading } = useQuery({
    queryKey: ["library-home-recent-documents"],
    queryFn: () => libraryService.search({ sort: "newest", page: 1, page_size: 5 }),
    enabled: !isLoading && !isError,
  });
  const recentDocuments = recentSearchData?.items || [];

  return (
    <PublicLayout>
      {/* Sử dụng w-full và px linh hoạt để nội dung trải rộng ra các cạnh màn hình */}
      <div className="flex flex-col gap-8 w-full px-2 sm:px-4 lg:px-6">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 sm:p-8 text-white shadow-sm w-full">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            {/* Bên trái: Thông tin + Stats */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Kho Học Liệu Cộng Đồng
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <BookOpen className="h-3.5 w-3.5" /> Học liệu mở DLU
                </span>
              </div>

              <p className="text-sm sm:text-base text-primary-100">
                Giáo trình, bài giảng và đề thi do sinh viên & giảng viên ĐH Đà Lạt đóng góp.
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs sm:text-sm font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/15 px-3 py-1.5">
                  <GraduationCap className="h-4 w-4 text-primary-200" />
                  {faculties.length} Khoa
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/15 px-3 py-1.5">
                  <Layers className="h-4 w-4 text-primary-200" />
                  {totalSubjects} Môn học
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/15 px-3 py-1.5">
                  <BookOpen className="h-4 w-4 text-primary-200" />
                  {totalDocuments} Tài liệu
                </span>
              </div>
            </div>

            {/* Bên phải: Thanh tìm kiếm */}
            <form onSubmit={(event) => event.preventDefault()} className="w-full md:w-96 lg:w-[420px] shrink-0">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã khoa..."
                  aria-label="Tìm khoa theo tên hoặc mã"
                  className="w-full h-12 rounded-xl bg-white pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </form>

          </div>
        </div>

        {/* Recent Documents Section - Tăng số cột lên tối đa 5 trên màn hình lớn */}
        {!isLoading && !isError && recentDocuments.length > 0 && (
          <section className="flex flex-col gap-4" aria-labelledby="recent-library-documents">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary-600">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Vừa được chia sẻ</span>
                </div>
                <h2 id="recent-library-documents" className="mt-1 text-xl font-bold text-gray-900">Học liệu mới cập nhật</h2>
                <p className="mt-0.5 text-sm text-gray-500">Tài liệu mới nhất trong các môn đang có học liệu.</p>
              </div>
              <button 
                type="button" 
                onClick={() => navigate("/library/faculty/" + recentFacultyIds[0])} 
                className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 sm:inline-flex"
              >
                Khám phá kho <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {(isRecentLoading ? [] : recentDocuments).map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={toCommunityDocItem(document)} 
                  variant="community" 
                  basePath="/library/document" 
                  onAction={(action, id) => { if (action === "view") navigate(`/library/document/${id}`); }} 
                  allowedActions={["view"]} 
                />
              ))}
              {isRecentLoading && Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} variant="document" />)}
            </div>
          </section>
        )}

        {/* Faculties Section - Tăng lưới hiển thị khoa lên 3-4 cột lấp đầy chiều ngang */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Khám phá theo Khoa</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Chọn khoa để xem danh sách môn học và tài liệu tương ứng
              </p>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {filteredFaculties.length} khoa
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardSkeleton key={i} variant="folder" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">Chưa tải được danh sách khoa</h3>
              <p className="mt-1 text-sm text-gray-500">Kiểm tra kết nối rồi thử tải lại.</p>
              <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Thử lại</button>
            </div>
          ) : filteredFaculties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFaculties.map((faculty, index) => (
                <FacultyCard
                  key={faculty.id}
                  faculty={faculty}
                  index={index}
                  onClick={() => navigate(`/library/faculty/${faculty.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">Không tìm thấy khoa phù hợp</h3>
              <p className="mt-1 text-sm text-gray-500">Thử tên đầy đủ hoặc mã khoa khác.</p>
              <button type="button" onClick={() => setSearchTerm("")} className="mt-4 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"><X className="h-4 w-4" /> Xóa tìm kiếm</button>
            </div>
          )}
        </section>

        {/* Banner đóng góp */}
        {!isLoading && !isError && searchLabel === "" && emptyFacultyExamples.length > 0 && (
          <aside className="rounded-xl border border-primary-100 bg-primary-50/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 w-full">
            <div>
              <p className="text-sm font-semibold text-gray-900">Cùng bổ sung học liệu cho các khoa còn trống</p>
              <p className="mt-1 text-sm text-gray-600">{emptyFacultyExamples.map((faculty) => faculty.name).join(" · ")}{emptyFacultyCount > emptyFacultyExamples.length ? " · và các khoa khác" : ""}</p>
            </div>
            <button type="button" onClick={() => navigate("/personal/documents")} className="mt-4 inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 sm:mt-0">
              <BookOpen className="h-4 w-4" /> Chọn tài liệu để đóng góp
            </button>
          </aside>
        )}
      </div>
    </PublicLayout>
  );
}

export default LibraryHome;