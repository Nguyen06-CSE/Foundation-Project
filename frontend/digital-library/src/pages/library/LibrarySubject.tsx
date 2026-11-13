// frontend/digital-library/src/pages/library/LibrarySubject.tsx

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
  Upload,
  FileText,
} from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { StarRating } from "@/components/shared/feedback/StarRating";
import { ViewToggle, type ViewMode } from "@/components/shared/feedback/ViewToggle";
import { CardSkeleton } from "@/components/shared/feedback/CardSkeleton";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  DocumentCard,
  DocumentListView,
  DocumentDetailView,
} from "@/components/shared/documents";
import { ContributeModal } from "@/components/shared/modals/ContributeModal";
import { useAuthStore } from "@/stores/authStore";
import { libraryService } from "@/services/libraryService";
import {
  toCommunityDocItem,
  toCommunityListItem,
} from "@/utils/communityDocumentAdapters";

const DOC_TYPE_TABS = [
  "Tất cả",
  "Giáo trình",
  "Đề thi",
  "Slide bài giảng",
  "Bài tập",
  "Khác",
];

const ACADEMIC_YEARS = [
  "Tất cả",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
];

export function LibrarySubject() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const sId = Number(subjectId);

  // States
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [selectedYear, setSelectedYear] = useState("Tất cả");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rating">("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);

  // Query documents
  const { data: docData, isLoading } = useQuery({
    queryKey: ["library-subject-documents", sId, page, sortBy, activeTab, selectedYear],
    queryFn: () =>
      libraryService.getDocuments(sId, {
        page,
        page_size: 12,
        sort: sortBy,
        doc_type: activeTab,
        academic_year: selectedYear,
      }),
    enabled: Boolean(sId),
  });

  // Save to personal mutation
  const saveMutation = useMutation({
    mutationFn: (docId: number) => libraryService.saveToPersonal(docId),
    onSuccess: (res) => {
      setActionSuccessMessage(res.message || "Đã lưu tài liệu về kho cá nhân thành công!");
      setTimeout(() => setActionSuccessMessage(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      alert("Đã có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại sau.");
    },
  });

  const handleSaveToPersonal = (docId: number | string) => {
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", window.location.pathname);
      navigate("/login");
      return;
    }
    saveMutation.mutate(Number(docId));
  };

  const handleDownload = (docId: number | string) => {
    const downloadUrl = libraryService.getDownloadUrl(Number(docId));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = (docId: number | string) => {
    const url = `${window.location.origin}/library/document/${docId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setActionSuccessMessage("Đã sao chép liên kết tài liệu vào bộ nhớ tạm!");
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  const handleAction = (action: string, docId: string | number) => {
    switch (action) {
      case "view":
        navigate(`/library/document/${docId}`);
        break;
      case "download":
        handleDownload(docId);
        break;
      case "save-to-personal":
      case "save":
        handleSaveToPersonal(docId);
        break;
      case "share":
        handleShare(docId);
        break;
      default:
        break;
    }
  };

  const handleOpenContribute = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", window.location.pathname);
      navigate("/login");
      return;
    }
    setIsContributeModalOpen(true);
  };

  const firstDoc = docData?.items?.[0];
  const subjectName = firstDoc?.subject_name || `Môn học #${sId}`;
  const facultyName = firstDoc?.faculty_name || "Khoa";
  const facultyId = firstDoc?.faculty_id;

  const totalDocs = docData?.total || 0;
  const totalDownloads = (docData?.items || []).reduce((acc, d) => acc + d.download_count, 0);
  const avgRatings = (docData?.items || []).filter((d) => d.rating_avg > 0);
  const subjectAvgRating =
    avgRatings.length > 0
      ? avgRatings.reduce((acc, d) => acc + d.rating_avg, 0) / avgRatings.length
      : 0;

  const items = docData?.items || [];
  const listItems = items.map(toCommunityListItem);

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 flex-wrap">
          <Link to="/library" className="hover:text-primary-600 transition-colors flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Kho học liệu
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          {facultyId ? (
            <Link to={`/library/faculty/${facultyId}`} className="hover:text-primary-600 transition-colors">
              {facultyName}
            </Link>
          ) : (
            <span>{facultyName}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold truncate">{subjectName}</span>
        </nav>

        {/* Success alert message */}
        {actionSuccessMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center justify-between animate-in fade-in">
            <span>{actionSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Subject Details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 uppercase">
                  {facultyName}
                </span>
                <h1 className="mt-1 text-2xl font-bold text-gray-900 leading-tight">
                  {subjectName}
                </h1>
                {/* Stats Bar */}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-gray-400" />
                    <span>{totalDocs} tài liệu</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5 text-gray-400" />
                    <span>{totalDownloads} lượt tải</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <StarRating value={subjectAvgRating} size="sm" showValue={subjectAvgRating > 0} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenContribute}
                icon={<Upload className="h-4 w-4" />}
              >
                Đóng góp tài liệu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (facultyId ? navigate(`/library/faculty/${facultyId}`) : navigate("/library"))}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Về danh sách môn
              </Button>
            </div>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-4">
          {/* Tabs loại tài liệu */}
          <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-100">
            {DOC_TYPE_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-primary-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Năm học + Sắp xếp + ViewToggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Dropdown Năm học */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500 font-medium">Năm học:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 font-medium focus:border-primary-500 focus:outline-none cursor-pointer"
                >
                  {ACADEMIC_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500 font-medium">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 font-medium focus:border-primary-500 focus:outline-none cursor-pointer"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Tải nhiều nhất</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {/* ViewToggle (grid, list, detail) */}
            <div className="ml-auto">
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>
        </div>

        {/* Documents Views */}
        <section className="flex flex-col gap-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardSkeleton key={i} variant="document" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              {/* GRID VIEW */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={toCommunityDocItem(doc)}
                      variant="community"
                      basePath="/library/document"
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}

              {/* LIST VIEW */}
              {viewMode === "list" && (
                <DocumentListView
                  documents={listItems}
                  workspaceType="community"
                  showOwner={true}
                  navigationPath={(id) => `/library/document/${id}`}
                  onAction={handleAction}
                />
              )}

              {/* DETAIL VIEW */}
              {viewMode === "detail" && (
                <DocumentDetailView
                  documents={listItems}
                  workspaceType="community"
                  showOwner={true}
                  navigationPath={(id) => `/library/document/${id}`}
                  onAction={handleAction}
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={<FileText className="h-8 w-8 text-gray-400" />}
              title="Chưa có tài liệu nào"
              description="Không tìm thấy tài liệu phù hợp với bộ lọc đã chọn trong môn học này."
              actionLabel="Đóng góp tài liệu cho môn này"
              onAction={handleOpenContribute}
            />
          )}

          {/* Pagination */}
          {docData && docData.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white p-4 rounded-xl text-sm text-gray-600 shadow-sm">
              <span>
                Trang {page} / {docData.total_pages} • Tổng {docData.total} tài liệu
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === docData.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Modal đóng góp tài liệu */}
        {isContributeModalOpen && (
          <ContributeModal
            initialFacultyId={facultyId || undefined}
            initialSubjectId={sId}
            onClose={() => setIsContributeModalOpen(false)}
            onSuccess={() => {
              setActionSuccessMessage("Yêu cầu đóng góp của bạn đã được gửi tới người kiểm duyệt!");
              setTimeout(() => setActionSuccessMessage(null), 3500);
              queryClient.invalidateQueries({
                queryKey: ["library-subject-documents", sId],
              });
            }}
          />
        )}
      </div>
    </PublicLayout>
  );
}

export default LibrarySubject;
