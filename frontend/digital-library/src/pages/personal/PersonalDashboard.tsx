// frontend/digital-library/src/pages/personal/PersonalDashboard.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";

// Sub-components
import { QuickActions } from "./dashboard/components/QuickActions";
import { StatCards } from "./dashboard/components/StatCards";
import { RecentOpened } from "./dashboard/components/RecentOpened";
import { FolderShortcuts } from "./dashboard/components/FolderShortcuts";
import { GroupsCard } from "./dashboard/components/GroupsCard";
import { ContributionCard } from "./dashboard/components/ContributionCard";
import { ActivityFeed } from "./dashboard/components/ActivityFeed";
import { DashboardUpdates } from "./dashboard/components/DashboardUpdates";
import { DashboardError, DashboardLoading } from "./dashboard/components/DashboardStates";
import { DashboardModals } from "./dashboard/components/DashboardModals";
import { usePersonalDashboardData } from "./dashboard/hooks/usePersonalDashboardData";

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function PersonalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const dashboard = usePersonalDashboardData();
  const { data: summary, isLoading: isSummaryLoading, isError, refetch } = dashboard.summaryQuery;
  const {
    invitations,
    trendingData,
    isTrendingLoading,
    folders,
    isFoldersLoading,
    tags,
    uploadMutation,
    createFolderMutation,
  } = dashboard;

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  // Actions
  const handleOpenUpload = () => {
    setIsUploadOpen(true);
  };

  const handleContributeAction = () => {
    addToast({
      message: "Chọn tài liệu cá nhân của bạn rồi bấm 'Đóng góp' trong menu thao tác.",
      variant: "info",
    });
    navigate("/personal/documents");
  };

  const handleRejectedNotice = () => {
    addToast({
      message: "Các đóng góp bị từ chối cần xem lại tài liệu và thông tin trước khi gửi lại.",
      variant: "warning",
    });
    navigate("/personal/documents");
  };

  // Date & Greeting
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const displayName = user?.full_name || user?.username || "bạn";
  const pendingInvitationCount = invitations.filter((item) => item.status === "pending").length;
  const rejectedCount = summary?.rejected_recent_count ?? 0;
  const expiringTrashCount = summary?.expiring_trash_count ?? 0;
  const attentionCount =
    pendingInvitationCount + rejectedCount + (expiringTrashCount > 0 ? 1 : 0);

  if (isError) {
    return <DashboardError onRetry={() => refetch()} />;
  }

  if (isSummaryLoading || !summary) {
    return <DashboardLoading />;
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 pb-8">
      {/* 1. HERO HEADER: Lời chào thông minh + Thao tác nhanh */}
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              {todayStr}
            </span>
            <span className="text-gray-300">•</span>
            {attentionCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {attentionCount} việc cần chú ý
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Mọi thứ đã được cập nhật
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {greeting}, {displayName}!
          </h1>
          <p className="text-sm text-gray-500">
            Quản lý tài liệu cá nhân, thư mục học phần và không gian học tập nhóm của bạn tại một nơi.
          </p>
        </div>

        <div className="shrink-0">
          <QuickActions
            onUploadSingle={handleOpenUpload}
            onCreateFolder={() => setIsCreateFolderOpen(true)}
            onCreateGroup={() => navigate("/groups?create=1")}
            onContribute={handleContributeAction}
          />
        </div>
      </header>

      {/* 2. METRIC STRIP: Chỉ số tổng quan */}
      <section aria-label="Thống kê nhanh">
        <StatCards
          totalPersonalDocs={summary.total_docs}
          newDocs7d={summary.new_docs_7d}
          usedBytes={summary.storage_used_bytes}
          quotaBytes={summary.storage_quota_bytes}
          sharedDocsCount={summary.shared_docs_count}
          favoriteCount={summary.favorite_count}
          approvedContributions={summary.contributions.approved}
          contributedDownloads={summary.contributions.approved_downloads}
        />
      </section>

      {/* 3. BỐ CỤC CHÍNH 2 CỘT: Main Workspace (Trái) & Contextual Rail (Phải) */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* CỘT TRÁI (8/12): Không gian tài liệu, thư mục & cộng tác */}
        <div className="flex flex-col gap-6 xl:col-span-8 2xl:col-span-9">
          {/* 3.1. Tiếp tục công việc (Mở gần đây / Thịnh hành) */}
          <section aria-label="Tài liệu truy cập nhanh">
            <RecentOpened
              documents={summary.recent_viewed}
              trendingDocuments={trendingData?.items ?? []}
              sharedCount={summary.shared_docs_count}
              favoriteCount={summary.favorite_count}
              isTrendingLoading={isTrendingLoading}
            />
          </section>

          {/* 3.2. Thư mục cá nhân */}
          <section aria-label="Thư mục cá nhân">
            <FolderShortcuts
              folders={folders}
              isLoading={isFoldersLoading}
              onCreateFolder={() => setIsCreateFolderOpen(true)}
            />
          </section>

          {/* 3.3. Nhóm học tập & Đóng góp học liệu (Đặt song song cân đối) */}
          <section
            aria-label="Cộng tác và đóng góp"
            className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2"
          >
            <GroupsCard
              groupsCount={summary.groups.total}
              totalGroupDocs={summary.groups.total_docs}
              recentGroups={summary.groups.recent}
            />
            <ContributionCard
              contributions={summary.contributions}
              onContribute={handleContributeAction}
            />
          </section>
        </div>

        {/* CỘT PHẢI (4/12): Trung tâm thông báo, việc cần làm & lịch sử hoạt động */}
        <aside
          aria-label="Thông báo và hoạt động"
          className="flex flex-col gap-6 xl:sticky xl:top-6 xl:col-span-4 2xl:col-span-3"
        >
          {/* Banner nhắc việc thông minh (Chỉ hiển thị khi thực sự có việc cần xử lý) */}
          {attentionCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <h2 className="text-sm font-semibold text-amber-900">
                Cần bạn phản hồi ({attentionCount})
              </h2>
              <ul className="mt-2 space-y-1.5 text-xs text-amber-800">
                {pendingInvitationCount > 0 && (
                  <li className="flex items-center justify-between">
                    <span>• {pendingInvitationCount} lời mời tham gia nhóm học tập</span>
                    <button
                      type="button"
                      onClick={() => navigate("/groups")}
                      className="font-semibold underline hover:text-amber-950"
                    >
                      Xem
                    </button>
                  </li>
                )}
                {rejectedCount > 0 && (
                  <li className="flex items-center justify-between">
                    <span>• {rejectedCount} học liệu đóng góp cần chỉnh sửa</span>
                    <button
                      type="button"
                      onClick={handleRejectedNotice}
                      className="font-semibold underline hover:text-amber-950"
                    >
                      Kiểm tra
                    </button>
                  </li>
                )}
                {expiringTrashCount > 0 && (
                  <li className="flex items-center justify-between">
                    <span>• {expiringTrashCount} tệp trong thùng rác sắp xóa vĩnh viễn</span>
                    <button
                      type="button"
                      onClick={() => navigate("/personal/trash")}
                      className="font-semibold underline hover:text-amber-950"
                    >
                      Mở thùng rác
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Trung tâm cập nhật (Thông báo / Việc cần làm) */}
          <DashboardUpdates
            summary={summary}
            invitations={invitations}
            activities={summary.recent_activities}
            onRejectedClick={handleRejectedNotice}
          />

          {/* Nhật ký hoạt động gần đây */}
          <ActivityFeed activities={summary.recent_activities} />
        </aside>
      </div>

      {/* 4. MODALS */}
      <DashboardModals
        uploadOpen={isUploadOpen}
        folderOpen={isCreateFolderOpen}
        tags={tags}
        isUploading={uploadMutation.isPending}
        isCreatingFolder={createFolderMutation.isPending}
        onCloseUpload={() => setIsUploadOpen(false)}
        onCloseFolder={() => setIsCreateFolderOpen(false)}
        onUpload={async (fd) => {
          await uploadMutation.mutateAsync(fd);
          setIsUploadOpen(false);
        }}
        onCreateFolder={async (data) => {
          await createFolderMutation.mutateAsync({
            name: data.name,
            color: data.color,
            tagIds: data.tagIds,
          });
          setIsCreateFolderOpen(false);
        }}
      />
    </div>
  );
}

export default PersonalDashboard;