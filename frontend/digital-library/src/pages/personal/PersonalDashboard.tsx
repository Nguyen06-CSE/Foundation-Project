// src/pages/personal/PersonalDashboard.tsx

import { useEffect, useState } from "react";
import { Upload, FileText, Share2, Star, HardDrive, FileX } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/shared/StatCard";
import { DocumentRow } from "@/components/shared/DocumentRow";
import EmptyState from "@/components/shared/EmptyState";
import { ProcessingDonut } from "@/components/shared/ProcessingDonut";
import { TagDistribution } from "@/components/shared/TagDistribution";
import { type DocumentAction } from "@/components/shared/DocumentContextMenu";
import { documents } from "@/mocks/documents";
import { personalStats, processingStats, tagDistribution } from "@/mocks/stats";

export function PersonalDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const handleDocumentAction = (action: DocumentAction, documentId: string) => {
    console.log("Action:", action, "on document:", documentId);
  };

  // Hàm lấy đuôi file linh hoạt (Xử lý được cả file_path, title, lẫn MIME type)
  const getFileExtension = (input: string | undefined | null) => {
    if (!input) return "";
    
    // Nếu là tên file hoặc đường dẫn có chứa dấu chấm (vd: /docs/report.pdf hoặc report.docx)
    if (input.includes(".")) {
      const parts = input.split(".");
      return `.${parts.pop()}`.toLowerCase();
    }
    
    // Nếu là dạng MIME type (vd: application/pdf)
    if (input.includes("/")) {
      const mimeExt = input.split("/")[1];
      return mimeExt ? `.${mimeExt.toLowerCase()}` : "";
    }
    
    return input.startsWith(".") ? input.toLowerCase() : `.${input.toLowerCase()}`;
  };

  const recentDocuments = documents.slice(0, 5).map((doc: any) => ({
    id: doc.id?.toString(),
    name: doc.title || doc.name,
    type: doc.fileType || doc.file_type || 'unknown',
    updatedAt: doc.updatedAtLabel || doc.created_at,
    size: doc.sizeLabel || doc.file_size,
    // Lấy đuôi file ưu tiên theo file_path -> file_type -> title
    extension: getFileExtension(doc.filePath || doc.file_path || doc.fileType || doc.file_type || doc.title),
    owner: doc.owner || { name: 'You', avatar: '' },
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Xin chào, Cao Khôi Nguyên
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Hôm nay bạn muốn học tập và nghiên cứu tài liệu gì?
        </p>
      </Card>

      {/* Stat Cards — 4 cột */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={<FileText className="h-6 w-6 text-primary-600" />}
              iconBg="bg-primary-50"
              label="Tổng tài liệu"
              value={personalStats.totalDocuments}
              subLabel={personalStats.totalDocumentsLabel}
            />
            <StatCard
              icon={<Share2 className="h-6 w-6 text-blue-500" />}
              iconBg="bg-blue-50"
              label="Đã chia sẻ"
              value={personalStats.sharedCount}
              subLabel={personalStats.sharedCountLabel}
            />
            <StatCard
              icon={<HardDrive className="h-6 w-6 text-orange-500" />}
              iconBg="bg-orange-50"
              label="Dung lượng đã dùng"
              value={personalStats.storageUsed}
              subLabel={personalStats.storageLabel}
            />
            <StatCard
              icon={<Star className="h-6 w-6 text-yellow-500" />}
              iconBg="bg-yellow-50"
              label="Yêu thích"
              value={personalStats.favoriteCount}
              subLabel={personalStats.favoriteLabel}
            />
          </>
        )}
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">
        {/* Left: Recent Documents */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tài liệu gần đây</h2>
            <Link
              to="/personal/documents"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 border-b border-gray-100 px-2 py-3 last:border-0">
                  <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                  </div>
                  <div className="hidden h-4 w-12 rounded bg-gray-200 animate-pulse sm:block" />
                  <div className="hidden h-4 w-16 rounded bg-gray-200 animate-pulse sm:block" />
                </div>
              ))
            ) : recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  onAction={handleDocumentAction}
                />
              ))
            ) : (
              <EmptyState
                icon={<FileX className="h-6 w-6" />}
                title="Chưa có tài liệu nào"
                description="Tải lên tài liệu đầu tiên để bắt đầu xây dựng thư viện cá nhân."
                actionLabel="Tải tài liệu đầu tiên"
                onAction={() => console.log("Upload first document")}
              />
            )}
          </div>
        </Card>

        {/* Right column: Upload + ProcessingDonut + TagDistribution */}
        <div className="flex flex-col gap-4">
          {/* Upload Button */}
          <Button
            variant="primary"
            className="w-full text-base py-8 h-auto"
            icon={<Upload className="h-5 w-5" />}
          >
            + Tải tài liệu lên
          </Button>

          {/* Processing Donut */}
          <ProcessingDonut
            percent={processingStats.percent}
            legendItems={processingStats.legendItems}
          />

          {/* Tag Distribution */}
          <TagDistribution tags={tagDistribution} />
        </div>
      </div>
    </div>
  );
}