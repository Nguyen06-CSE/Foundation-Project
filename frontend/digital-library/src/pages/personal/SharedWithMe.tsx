import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Search,
  Check,
  X,
  Clock,
  Download,
  ExternalLink,
  Package,
  Inbox,
  Share2,
} from "lucide-react";

import { shareService, type DocumentShareItem } from "@/services/shareService";
import { formatRelativeDate } from "@/utils/formatDate";
import { formatSize } from "@/utils/formatSize";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { activityService } from "@/services/activityService";

export default function SharedWithMe() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") === "requests" ? "requests" : "received";
  const [searchQuery, setSearchQuery] = useState("");

  const setActiveTab = (tab: "received" | "requests") => {
    if (tab === "requests") {
      setSearchParams({ tab: "requests" });
    } else {
      setSearchParams({});
    }
  };

  // 1. Queries
  const { data: receivedShares = [], isLoading: isReceivedLoading } = useQuery({
    queryKey: ["shares-received"],
    queryFn: () => shareService.getReceived(100, 0),
  });

  const { data: pendingShares = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ["shares-pending"],
    queryFn: shareService.getPending,
  });

  // 2. Mutations
  const acceptMutation = useMutation({
    mutationFn: (shareId: number) => shareService.accept(shareId),
    onSuccess: () => {
      alert("Đã chấp nhận tài liệu và sao chép vào kho cá nhân thành công!");
      queryClient.invalidateQueries({ queryKey: ["shares-received"] });
      queryClient.invalidateQueries({ queryKey: ["shares-pending"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setActiveTab("received");
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      alert(detail || "Có lỗi xảy ra khi chấp nhận tài liệu.");
      queryClient.invalidateQueries({ queryKey: ["shares-pending"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (shareId: number) => shareService.reject(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares-pending"] });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      alert(detail || "Có lỗi xảy ra khi từ chối tài liệu.");
    },
  });

  // 3. Filter theo search query
  const filteredReceived = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return receivedShares;
    return receivedShares.filter((item) => {
      const docTitle = item.document?.title?.toLowerCase() || item.source_document?.title?.toLowerCase() || "";
      const senderName = (item.from_user?.full_name || item.from_user?.username || "").toLowerCase();
      return docTitle.includes(q) || senderName.includes(q);
    });
  }, [receivedShares, searchQuery]);

  const filteredPending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingShares;
    return pendingShares.filter((item) => {
      const docTitle = item.source_document?.title?.toLowerCase() || "";
      const senderName = (item.from_user?.full_name || item.from_user?.username || "").toLowerCase();
      return docTitle.includes(q) || senderName.includes(q);
    });
  }, [pendingShares, searchQuery]);

  const handleDownload = (item: DocumentShareItem) => {
    const targetDoc = item.document || item.source_document;
    if (!targetDoc) return;
    if (targetDoc.id) {
      activityService.downloadDocumentFile(targetDoc.id, targetDoc.title || "document").catch(() => {
        if (targetDoc.file_path) {
          const url = `${import.meta.env.VITE_API_URL}/${targetDoc.file_path}`;
          const link = document.createElement("a");
          link.href = url;
          link.download = targetDoc.title;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
    }
  };

  const calculateDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Share2 className="h-7 w-7 text-primary-600" />
            Đã chia sẻ với tôi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý các tài liệu bạn nhận được từ đồng nghiệp, giảng viên hoặc sinh viên khác.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
            placeholder="Tìm theo tên file hoặc người gửi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABS SEGMENT */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("received")}
          className={`relative pb-3 text-sm font-semibold transition-all ${
            activeTab === "received"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Đã nhận ({receivedShares.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`relative pb-3 text-sm font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "requests"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Thông báo & Yêu cầu
          {pendingShares.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {pendingShares.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ĐÃ NHẬN */}
      {activeTab === "received" && (
        <div>
          {isReceivedLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Đang tải danh sách tài liệu...
            </div>
          ) : filteredReceived.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50/75 text-gray-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Tài liệu</th>
                    <th scope="col" className="px-5 py-3.5">Người chia sẻ</th>
                    <th scope="col" className="px-5 py-3.5">Ngày nhận</th>
                    <th scope="col" className="px-5 py-3.5">Kích thước</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredReceived.map((item) => {
                    const doc = item.document || item.source_document;
                    if (!doc) return null;
                    const sender = item.from_user;
                    const senderInitial = (sender.full_name || sender.username || "U")[0].toUpperCase();

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          if (item.document_id) {
                            navigate(`/ca-nhan/tai-lieu/${item.document_id}`);
                          }
                        }}
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
                              {doc.is_bundle ? (
                                <Package className="h-5 w-5" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 line-clamp-1 flex items-center gap-2">
                                {doc.title}
                                {doc.is_bundle && (
                                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                    Bundle
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {doc.file_type || "Tài liệu"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {senderInitial}
                            </div>
                            <span className="font-medium text-gray-800">
                              {sender.full_name || sender.username}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                          {formatRelativeDate(item.responded_at || item.created_at || "")}
                        </td>

                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                          {formatSize(doc.file_size || 0)}
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Tải xuống"
                              onClick={() => handleDownload(item)}
                            >
                              <Download className="h-4 w-4 text-gray-600" />
                            </Button>
                            {item.document_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Xem chi tiết"
                                onClick={() => navigate(`/ca-nhan/tai-lieu/${item.document_id}`)}
                              >
                                <ExternalLink className="h-4 w-4 text-primary-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Inbox className="h-8 w-8 text-gray-400" />}
              title="Chưa có tài liệu nào"
              description="Khi có người chia sẻ tài liệu với bạn và được chấp nhận, tài liệu sẽ hiển thị ở đây."
            />
          )}
        </div>
      )}

      {/* TAB 2: THÔNG BÁO & YÊU CẦU */}
      {activeTab === "requests" && (
        <div>
          {isPendingLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Đang tải danh sách yêu cầu...
            </div>
          ) : filteredPending.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPending.map((item) => {
                const doc = item.source_document;
                if (!doc) return null;
                const sender = item.from_user;
                const daysRemaining = calculateDaysRemaining(item.expires_at);

                return (
                  <Card key={item.id} className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      {/* FILE INFO */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                            {doc.is_bundle ? (
                              <Package className="h-6 w-6" />
                            ) : (
                              <FileText className="h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                              {doc.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                              <span>{formatSize(doc.file_size || 0)}</span>
                              <span>•</span>
                              <span>{doc.file_type || "Tài liệu"}</span>
                              {doc.is_bundle && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-medium">Gói tài liệu (Bundle)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {daysRemaining !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 shrink-0">
                            <Clock className="h-3 w-3" />
                            Còn {daysRemaining} ngày
                          </span>
                        )}
                      </div>

                      {/* SENDER INFO */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {(sender.full_name || sender.username || "U")[0].toUpperCase()}
                        </div>
                        <span>
                          Người gửi: <strong className="text-gray-900">{sender.full_name || sender.username}</strong>
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-gray-600 capitalize">
                          {sender.role}
                        </span>
                      </div>

                      {/* MESSAGE */}
                      {item.message && (
                        <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 italic">
                          &quot;{item.message}&quot;
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={rejectMutation.isPending || acceptMutation.isPending}
                        onClick={() => {
                          if (window.confirm("Bạn có chắc chắn muốn từ chối tài liệu này?")) {
                            rejectMutation.mutate(item.id);
                          }
                        }}
                        className="text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Từ chối
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        onClick={() => acceptMutation.mutate(item.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Chấp nhận
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Inbox className="h-8 w-8 text-gray-400" />}
              title="Không có lời mời nào đang chờ"
              description="Bạn đã xử lý hết tất cả các lời mời chia sẻ tài liệu."
            />
          )}
        </div>
      )}
    </div>
  );
}
