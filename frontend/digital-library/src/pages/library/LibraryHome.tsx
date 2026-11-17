// frontend/digital-library/src/pages/library/LibraryHome.tsx

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  GraduationCap,
  BookOpen,
  Layers,
  X,
  Flame,
  FileText,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { FacultyCard } from "@/components/library/FacultyCard";
import { CommunityDocumentCard } from "@/components/library/CommunityDocumentCard";
import { LibraryStatsPanel } from "@/components/library/LibraryStatsPanel";
import {
  LibraryFilterChips,
  type SortOption,
} from "@/components/library/LibraryFilterChips";
import { libraryService } from "@/services/libraryService";
import { CardSkeleton } from "@/components/shared/feedback/CardSkeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { matchFuzzyContain } from "@/utils/searchUtils";
import { cn } from "@/utils/cn";

export function LibraryHome() {
  const navigate = useNavigate();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);

  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Tab: 'documents' | 'faculties'
  const [activeTab, setActiveTab] = useState<"documents" | "faculties">("documents");

  // Query 1: Faculties list
  const {
    data: faculties = [],
    isLoading: isLoadingFaculties,
    isError: isErrorFaculties,
    refetch: refetchFaculties,
  } = useQuery({
    queryKey: ["library-faculties"],
    queryFn: libraryService.getFaculties,
  });

  const isSearching = Boolean(debouncedSearch.trim());

  // Query 2: Documents (search & popular feed)
  // Khi người dùng nhập từ khóa tìm kiếm (isSearching = true), ta tải danh sách ứng viên (page_size: 100)
  // để thuật toán FE thực hiện so khớp mờ (fuzzy contain, không dấu, typo-tolerant) và xếp hạng.
  // Khi không tìm kiếm, dùng phân trang trực tiếp từ server.
  const {
    data: docData,
    isLoading: isLoadingDocs,
    isError: isErrorDocs,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: [
      "library-documents",
      {
        faculty_id: selectedFacultyId,
        doc_type: selectedDocType,
        sort: sortBy,
        page: isSearching ? 1 : page,
        page_size: isSearching ? 100 : pageSize,
      },
    ],
    queryFn: () =>
      libraryService.search({
        faculty_id: selectedFacultyId ?? undefined,
        doc_type: selectedDocType ?? undefined,
        sort: sortBy,
        page: isSearching ? 1 : page,
        page_size: isSearching ? 100 : pageSize,
      }),
  });

  // Lọc tài liệu theo logic .contain, không phân biệt dấu và khoan dung lỗi chính tả (Fuzzy Matching)
  const filteredDocuments = useMemo(() => {
    const rawItems = docData?.items || [];
    if (!isSearching) return rawItems;

    return rawItems
      .map((doc) => {
        const match = matchFuzzyContain(
          debouncedSearch,
          doc.title,
          doc.subject_name,
          doc.faculty_name,
          doc.description,
          doc.doc_type,
          doc.academic_year
        );
        return {
          doc,
          score: match.score,
          isMatch: match.isMatch,
        };
      })
      .filter((item) => item.isMatch)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.doc);
  }, [docData?.items, debouncedSearch, isSearching]);

  // Phân trang danh sách hiển thị
  const totalDisplayDocuments = isSearching
    ? filteredDocuments.length
    : (docData?.total ?? 0);

  const totalDisplayPages = isSearching
    ? Math.max(1, Math.ceil(filteredDocuments.length / pageSize))
    : (docData?.total_pages ?? 1);

  const paginatedDocuments = useMemo(() => {
    if (!isSearching) return filteredDocuments;
    const start = (page - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, isSearching, page, pageSize]);

  // Real stats calculated directly from faculties data
  const totalSubjects = useMemo(
    () => faculties.reduce((acc, f) => acc + (f.subject_count || 0), 0),
    [faculties]
  );
  const totalDocuments = useMemo(
    () => faculties.reduce((acc, f) => acc + (f.document_count || 0), 0),
    [faculties]
  );

  // Filtered faculties for the Faculties Directory view (Fuzzy contain & unaccented)
  const filteredFaculties = useMemo(() => {
    if (!debouncedSearch.trim()) return faculties;
    return faculties
      .map((f) => {
        const match = matchFuzzyContain(debouncedSearch, f.name, f.code);
        return {
          faculty: f,
          score: match.score,
          isMatch: match.isMatch,
        };
      })
      .filter((item) => item.isMatch)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.faculty);
  }, [faculties, debouncedSearch]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedFacultyId !== null || selectedDocType !== null || sortBy !== "popular"
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedFacultyId(null);
    setSelectedDocType(null);
    setSortBy("popular");
    setPage(1);
  };

  const handleFacultySelect = (fId: number | null) => {
    setSelectedFacultyId(fId);
    setPage(1);
    setActiveTab("documents");
  };

  const handleDocTypeSelect = (dt: string | null) => {
    setSelectedDocType(dt);
    setPage(1);
    setActiveTab("documents");
  };

  const handleSortSelect = (sort: SortOption) => {
    setSortBy(sort);
    setPage(1);
  };

  return (
    <PublicLayout>
      <div className="w-full flex flex-col gap-6">
        {/* ============================================================
            1. HERO SECTION (Thanh tìm kiếm & Giới thiệu Thư viện số ĐHĐL)
        ============================================================ */}
        <section className="relative overflow-hidden rounded-2xl bg-primary-700 px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
          {/* Subtle background decoration */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            {/* Real Stats Pill Badge */}
            <div className="mb-3 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-medium text-white shadow-xs backdrop-blur-xs">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary-200" />
                <strong>{faculties.length}</strong> Khoa đào tạo
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary-200" />
                <strong>{totalSubjects.toLocaleString("vi-VN")}</strong> Môn học
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary-200" />
                <strong>{totalDocuments.toLocaleString("vi-VN")}</strong> Tài liệu công khai
              </span>
            </div>

            {/* Main Title & Subtitle */}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl text-white">
              Kho Học Liệu Mở Đại Học Đà Lạt
            </h1>
           

            {/* Big Search Bar */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 w-full max-w-2xl"
            >
              <div className="relative flex items-center shadow-lg rounded-xl">
                <Search className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm kiếm tài liệu, môn học hoặc khoa (VD: Lập trình Web, Giải tích, CNTT)..."
                  className="h-12 w-full rounded-xl bg-white pl-12 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-white/40 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setPage(1);
                    }}
                    className="absolute right-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Xóa từ khóa tìm kiếm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* ============================================================
            2. HORIZONTAL FILTER CHIPS (Khoa, Loại tài liệu, Sắp xếp)
        ============================================================ */}
        <LibraryFilterChips
          faculties={faculties}
          selectedFacultyId={selectedFacultyId}
          onSelectFaculty={handleFacultySelect}
          selectedDocType={selectedDocType}
          onSelectDocType={handleDocTypeSelect}
          sortBy={sortBy}
          onSelectSort={handleSortSelect}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* ============================================================
            3. MAIN CONTENT (2 Columns: Feed trái + Stats Panel phải)
        ============================================================ */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* CỘT CHÍNH: Tabs + Danh sách tài liệu + Danh mục Khoa */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
            {/* View Mode Toggle: Tài liệu vs Danh mục Khoa */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div className="inline-flex items-center rounded-xl bg-gray-100 p-1 border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("documents")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all",
                    activeTab === "documents"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 text-primary-600" />
                  <span>Tài liệu học tập</span>
                  <span className="rounded-full bg-primary-50 px-1.5 py-0.2 text-[10px] font-bold text-primary-700">
                    {totalDisplayDocuments}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("faculties")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all",
                    activeTab === "faculties"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <GraduationCap className="h-3.5 w-3.5 text-primary-600" />
                  <span>Khoa đào tạo</span>
                  <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] font-bold text-gray-700">
                    {filteredFaculties.length}
                  </span>
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {activeTab === "documents" ? (
                  <span>
                    {hasActiveFilters ? (
                      <>
                        Kết quả lọc: <strong>{totalDisplayDocuments}</strong> tài liệu
                      </>
                    ) : (
                      <>
                        Xếp theo:{" "}
                        <strong className="text-gray-700">
                          {sortBy === "popular"
                            ? "Phổ biến nhất"
                            : sortBy === "rating"
                              ? "Đánh giá cao"
                              : "Mới cập nhật"}
                        </strong>
                      </>
                    )}
                  </span>
                ) : (
                  <span>
                    Tổng cộng: <strong>{filteredFaculties.length}</strong> khoa
                  </span>
                )}
              </div>
            </div>

            {/* TAB CONTENT 1: DOCUMENTS FEED */}
            {activeTab === "documents" && (
              <section className="flex flex-col gap-5">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      {sortBy === "popular" ? (
                        <Flame className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                        {hasActiveFilters
                          ? "Kết quả tài liệu phù hợp"
                          : "Tài liệu nổi bật & phổ biến"}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {sortBy === "popular"
                          ? "Xếp hạng dựa trên tín hiệu xem, lượt tải và tương tác thực tế."
                          : sortBy === "rating"
                            ? "Xếp hạng theo điểm đánh giá trung bình từ người học."
                            : "Danh sách tài liệu mới được chia sẻ gần đây."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {isLoadingDocs && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <CardSkeleton key={i} variant="document" />
                    ))}
                  </div>
                )}

                {/* Error State */}
                {isErrorDocs && !isLoadingDocs && (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Không thể tải danh sách tài liệu
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Đã có lỗi khi kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền mạng hoặc thử lại.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchDocs()}
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-2xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingDocs && !isErrorDocs && paginatedDocuments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-900">
                      Không tìm thấy tài liệu phù hợp
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                      {searchTerm
                        ? `Không có tài liệu nào khớp với từ khóa "${searchTerm}".`
                        : "Chưa có tài liệu nào theo bộ lọc đang chọn."}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Xóa toàn bộ bộ lọc
                      </button>
                    )}
                  </div>
                )}

                {/* Documents Grid */}
                {!isLoadingDocs && !isErrorDocs && paginatedDocuments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedDocuments.map((doc) => (
                      <CommunityDocumentCard
                        key={doc.id}
                        document={doc}
                        onClick={() => navigate(`/library/document/${doc.id}`)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {!isLoadingDocs && !isErrorDocs && totalDisplayPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-xs text-gray-500">
                      Trang <strong>{page}</strong> / {totalDisplayPages} (Tổng {totalDisplayDocuments} tài liệu)
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Trang trước
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalDisplayPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Trang sau
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Mini Preview of Top Faculties when scrolling down */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Khám phá theo Khoa đào tạo
                      </h3>
                      <p className="text-xs text-gray-500">
                        Học liệu được phân loại theo từng khoa và môn học tương ứng.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("faculties")}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Xem tất cả ({faculties.length}) →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {faculties.slice(0, 3).map((faculty, index) => (
                      <FacultyCard
                        key={faculty.id}
                        faculty={faculty}
                        index={index}
                        totalLibraryDocs={totalDocuments}
                        onClick={() => navigate(`/library/faculty/${faculty.id}`)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* TAB CONTENT 2: FACULTIES DIRECTORY */}
            {activeTab === "faculties" && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                      Danh mục Khoa đào tạo
                    </h2>
                    <p className="text-xs text-gray-500">
                      Chọn một khoa để khám phá danh sách học phần và tài liệu chuyên ngành.
                    </p>
                  </div>
                </div>

                {isLoadingFaculties ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <CardSkeleton key={i} variant="folder" />
                    ))}
                  </div>
                ) : isErrorFaculties ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <p className="text-xs text-red-600 font-medium">
                      Không thể tải danh sách khoa. Vui lòng thử lại.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchFaculties()}
                      className="mt-2 text-xs font-semibold text-primary-600 underline"
                    >
                      Tải lại
                    </button>
                  </div>
                ) : filteredFaculties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredFaculties.map((faculty, index) => (
                      <FacultyCard
                        key={faculty.id}
                        faculty={faculty}
                        index={index}
                        totalLibraryDocs={totalDocuments}
                        onClick={() => navigate(`/library/faculty/${faculty.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center bg-white shadow-xs">
                    <GraduationCap className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-900">
                      Không tìm thấy khoa nào
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Không có khoa nào phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="mt-4 inline-flex items-center rounded-lg bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* CỘT PHẢI: PANEL THỐNG KÊ TỔNG QUAN (Desktop sidebar / Responsive) */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0">
            <LibraryStatsPanel
              faculties={faculties}
              totalSubjects={totalSubjects}
              totalDocuments={totalDocuments}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default LibraryHome;
