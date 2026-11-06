import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Search,
  Check,
  X,
  Clock,
  Package,
  Inbox,
  Share2,
  Send,
  Undo2,
} from "lucide-react";

import { shareService } from "@/services/shareService";
import { documentService } from "@/services/documentService";
import { formatRelativeDate } from "@/utils/formatDate";
import { formatSize } from "@/utils/formatSize";
import { getFileExtension } from "@/utils/file";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { CardSkeleton } from "@/components/shared/feedback/CardSkeleton";
import {
  PersonalDocumentsSection,
  type DocCardType,
} from "./components/PersonalDocumentsSection";
import { ShareDocumentModal } from "@/components/shared/documents/ShareDocumentModal";
import { RenameDocumentModal } from "@/components/shared/modals/RenameDocumentModal";
import { ContributeModal } from "@/components/shared/modals/ContributeModal";

// Helper chuẩn hóa tìm kiếm FE không dấu, không phân biệt hoa/thường và hỗ trợ cả NFD/NFC
function matchesSearch(text?: string | null, query?: string): boolean {
  if (!text || !query) return false;
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  return clean(text).includes(clean(query));
}

export default function SharedWithMe() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: "received" | "requests" | "sent" =
    searchParams.get("tab") === "requests"
      ? "requests"
      : searchParams.get("tab") === "sent"
      ? "sent"
      : "received";
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Modals cho thao tác trên tài liệu đã nhận
  const [shareDoc, setShareDoc] = useState<{ id: number; title: string } | null>(
    null,
  );
  const [renamingDoc, setRenamingDoc] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [contributeDoc, setContributeDoc] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const setActiveTab = (tab: "received" | "requests" | "sent") => {
    if (tab === "received") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // 1. Queries
  const {
    data: receivedShares = [],
    isLoading: isReceivedLoading,
    isFetching: isReceivedFetching,
  } = useQuery({
    queryKey: ["shares-received"],
    queryFn: () => shareService.getReceived(100, 0),
  });

  const { data: pendingShares = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ["shares-pending"],
    queryFn: shareService.getPending,
  });

  const { data: sentShares = [], isLoading: isSentLoading } = useQuery({
    queryKey: ["shares-sent"],
    queryFn: () => shareService.getSent(100, 0),
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

  const withdrawMutation = useMutation({
    mutationFn: (shareId: number) => shareService.withdraw(shareId),
    onSuccess: () => {
      alert("Đã rút lại yêu cầu chia sẻ thành công!");
      queryClient.invalidateQueries({ queryKey: ["shares-sent"] });
      queryClient.invalidateQueries({ queryKey: ["document-share-status"] });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      alert(detail || "Có lỗi xảy ra khi rút yêu cầu chia sẻ.");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => documentService.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares-received"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const renameDocMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      documentService.update(id, { title }),
    onSuccess: () => {
      setRenamingDoc(null);
      queryClient.invalidateQueries({ queryKey: ["shares-received"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  // 3. Map & Filter danh sách Đã nhận -> DocCardType[] để tái sử dụng 3 chế độ hiển thị
  const receivedDocCards = useMemo<DocCardType[]>(() => {
    const q = searchQuery.trim();
    const cards: DocCardType[] = [];

    for (const item of receivedShares) {
      const doc = item.document || item.source_document;
      if (!doc) continue;

      const senderName =
        item.from_user?.full_name || item.from_user?.username || "Người gửi";
      const senderUser = item.from_user?.username || "";

      if (q) {
        const matchTitle = matchesSearch(doc.title, q);
        const matchSenderName = matchesSearch(senderName, q);
        const matchSenderUser = matchesSearch(senderUser, q);
        if (!matchTitle && !matchSenderName && !matchSenderUser) continue;
      }

      cards.push({
        id: String(doc.id),
        name: doc.title,
        type: doc.file_type || "unknown",
        updatedAt: formatRelativeDate(
          item.responded_at || item.created_at || "",
        ),
        size: formatSize(doc.file_size || 0),
        extension: getFileExtension(
          doc.file_path || undefined,
          doc.file_type || undefined,
          doc.title,
        ),
        thumbnail_path: doc.thumbnail_path ?? null,
        markdown_path: doc.markdown_path ?? null,
        file_path: doc.file_path ?? null,
        owner: { name: senderName, avatar: "" },
        rawType: doc.file_type ?? null,
        tags: doc.tags || [],
        is_bundle: Boolean(doc.is_bundle),
        bundle_parent_id: doc.bundle_parent_id ?? null,
        bundle_children_count: doc.bundle_children_count ?? null,
        content: doc.content ?? null,
        view_count: doc.view_count ?? 0,
        trending_score: doc.trending_score ?? 0,
        share_count: doc.share_count ?? 0,
        metadata: doc.metadata ?? null,
      });
    }

    return cards;
  }, [receivedShares, searchQuery]);

  const filteredPending = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return pendingShares;
    return pendingShares.filter((item) => {
      const docTitle = item.source_document?.title || "";
      const senderName = item.from_user?.full_name || "";
      const senderUser = item.from_user?.username || "";
      return (
        matchesSearch(docTitle, q) ||
        matchesSearch(senderName, q) ||
        matchesSearch(senderUser, q)
      );
    });
  }, [pendingShares, searchQuery]);

  const filteredSent = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return sentShares;
    return sentShares.filter((item) => {
      const docTitle =
        item.source_document?.title || item.document?.title || "";
      const recipientName = item.to_user?.full_name || "";
      const recipientUser = item.to_user?.username || "";
      return (
        matchesSearch(docTitle, q) ||
        matchesSearch(recipientName, q) ||
        matchesSearch(recipientUser, q)
      );
    });
  }, [sentShares, searchQuery]);

  const handleDocumentAction = (action: string, documentId: string) => {
    const targetCard = receivedDocCards.find((d) => d.id === documentId);
    const numId = Number(documentId);

    switch (action) {
      case "view":
        navigate(
          targetCard?.is_bundle
            ? `/personal/bundle/${documentId}`
            : `/personal/documents/${documentId}`,
        );
        break;
      case "download":
        if (targetCard?.file_path) {
          const url = `${import.meta.env.VITE_API_URL}/${targetCard.file_path}`;
          const link = window.document.createElement("a");
          link.href = url;
          link.download = targetCard.name;
          link.target = "_blank";
          link.rel = "noreferrer";
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
        }
        break;
      case "download-markdown":
        if (targetCard?.markdown_path) {
          const url = `${import.meta.env.VITE_API_URL}/${targetCard.markdown_path}`;
          const link = window.document.createElement("a");
          link.href = url;
          link.download = `${targetCard.name || "document"}.md`;
          link.target = "_blank";
          link.rel = "noreferrer";
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
        }
        break;
      case "share":
        if (targetCard) {
          setShareDoc({ id: numId, title: targetCard.name });
        }
        break;
      case "rename":
        if (targetCard) {
          setRenamingDoc({ id: numId, title: targetCard.name });
        }
        break;
      case "contribute":
        if (targetCard) {
          setContributeDoc({ id: numId, title: targetCard.name });
        }
        break;
      case "delete":
        if (
          window.confirm(
            "Bạn có chắc chắn muốn chuyển tài liệu này vào thùng rác?",
          )
        ) {
          deleteDocMutation.mutate(numId);
        }
        break;
      default:
        break;
    }
  };

  const calculateDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Share2 className="h-7 w-7 text-primary-600" />
            Đã chia sẻ với tôi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý các tài liệu bạn nhận được từ đồng nghiệp, giảng viên hoặc
            sinh viên khác.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
            placeholder="Tìm theo tên file, người gửi hoặc người nhận..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABS SEGMENT */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("received")}
          className={`relative pb-3 text-sm font-semibold transition-all ${
            activeTab === "received"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Đã nhận ({receivedDocCards.length}
          {searchQuery ? `/${receivedShares.length}` : ""})
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
              {filteredPending.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sent")}
          className={`relative pb-3 text-sm font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "sent"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Đã gửi ({filteredSent.length}
          {searchQuery ? `/${sentShares.length}` : ""})
        </button>
      </div>

      {/* TAB 1: ĐÃ NHẬN (Tái sử dụng 3 chế độ hiển thị Grid / List / Detail) */}
      {activeTab === "received" && (
        <PersonalDocumentsSection
          docsLoading={isReceivedLoading}
          isFetching={isReceivedFetching}
          filteredDocCards={receivedDocCards}
          page={page}
          setPage={setPage}
          onDocumentAction={handleDocumentAction}
          CardSkeleton={CardSkeleton}
          isFilterActive={Boolean(searchQuery.trim())}
          searchQuery={searchQuery}
          showOwner={true}
          sectionTitle="Tài liệu đã nhận"
        />
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
                const ext = getFileExtension(doc.file_path || undefined, doc.file_type || undefined, doc.title).toUpperCase();

                return (
                  <Card
                    key={item.id}
                    className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      {/* FILE INFO */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
                            {doc.is_bundle ? (
                              <Package className="h-6 w-6 text-amber-600" />
                            ) : (
                              <FileIcon type={ext} className="h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                              {doc.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                              <span>{formatSize(doc.file_size || 0)}</span>
                              <span>•</span>
                              {doc.is_bundle ? (
                                <span className="text-amber-700 font-medium">
                                  Gói tài liệu (Bundle)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-gray-100 font-semibold text-[10px] text-gray-700 uppercase">
                                  {ext || "Tài liệu"}
                                </span>
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
                          {(sender.full_name ||
                            sender.username ||
                            "U")[0].toUpperCase()}
                        </div>
                        <span>
                          Người gửi:{" "}
                          <strong className="text-gray-900">
                            {sender.full_name || sender.username}
                          </strong>
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
                        disabled={
                          rejectMutation.isPending || acceptMutation.isPending
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              "Bạn có chắc chắn muốn từ chối tài liệu này?",
                            )
                          ) {
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
                        disabled={
                          acceptMutation.isPending || rejectMutation.isPending
                        }
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

      {/* TAB 3: ĐÃ GỬI */}
      {activeTab === "sent" && (
        <div>
          {isSentLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Đang tải danh sách yêu cầu đã gửi...
            </div>
          ) : filteredSent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSent.map((item) => {
                const doc = item.source_document || item.document;
                const recipient = item.to_user;
                const isPending = item.status === "pending";
                const ext = getFileExtension(doc?.file_path || undefined, doc?.file_type || undefined, doc?.title).toUpperCase();

                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case "pending":
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Clock className="h-3 w-3" />
                          Đang chờ duyệt
                        </span>
                      );
                    case "accepted":
                    case "auto_accepted":
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          <Check className="h-3 w-3" />
                          Đã chấp nhận
                        </span>
                      );
                    case "rejected":
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <X className="h-3 w-3" />
                          Đã từ chối
                        </span>
                      );
                    case "withdrawn":
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          <Undo2 className="h-3 w-3" />
                          Đã rút lại
                        </span>
                      );
                    case "expired":
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Hết hạn
                        </span>
                      );
                    default:
                      return (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          {status}
                        </span>
                      );
                  }
                };

                return (
                  <Card
                    key={item.id}
                    className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      {/* FILE INFO */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
                            {doc?.is_bundle ? (
                              <Package className="h-6 w-6 text-primary-600" />
                            ) : (
                              <FileIcon type={ext} className="h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                              {doc?.title || "Tài liệu"}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                              <span>{formatSize(doc?.file_size || 0)}</span>
                              <span>•</span>
                              {doc?.is_bundle ? (
                                <span className="text-primary-700 font-medium">
                                  Gói tài liệu (Bundle)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-gray-100 font-semibold text-[10px] text-gray-700 uppercase">
                                  {ext || "Tài liệu"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {getStatusBadge(item.status)}
                      </div>

                      {/* RECIPIENT INFO */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                        <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {(recipient?.full_name ||
                            recipient?.username ||
                            "U")[0].toUpperCase()}
                        </div>
                        <span>
                          Người nhận:{" "}
                          <strong className="text-gray-900">
                            {recipient?.full_name || recipient?.username}
                          </strong>
                        </span>
                        {recipient?.role && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-gray-600 capitalize">
                            {recipient.role}
                          </span>
                        )}
                        <span className="text-gray-400 ml-auto">
                          {formatRelativeDate(item.created_at || "")}
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
                    {isPending && (
                      <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={withdrawMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Bạn có chắc chắn muốn rút lại yêu cầu chia sẻ này?",
                              )
                            ) {
                              withdrawMutation.mutate(item.id);
                            }
                          }}
                          className="text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs"
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1" />
                          Rút yêu cầu
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Send className="h-8 w-8 text-gray-400" />}
              title="Chưa có yêu cầu chia sẻ nào"
              description="Các tài liệu hoặc yêu cầu bạn chia sẻ cho người khác sẽ xuất hiện ở đây."
            />
          )}
        </div>
      )}

      {/* MODALS */}
      {shareDoc && (
        <ShareDocumentModal
          documentIds={[shareDoc.id]}
          documentTitle={shareDoc.title}
          onClose={() => setShareDoc(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["shares-received"] });
            queryClient.invalidateQueries({ queryKey: ["documents"] });
          }}
        />
      )}

      <RenameDocumentModal
        isOpen={!!renamingDoc}
        initialTitle={renamingDoc?.title || ""}
        isPending={renameDocMutation.isPending}
        onClose={() => setRenamingDoc(null)}
        onConfirm={(newTitle) => {
          if (renamingDoc) {
            renameDocMutation.mutate({ id: renamingDoc.id, title: newTitle });
          }
        }}
      />

      {contributeDoc && (
        <ContributeModal
          documentId={contributeDoc.id}
          documentTitle={contributeDoc.title}
          onClose={() => setContributeDoc(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["shares-received"] });
            queryClient.invalidateQueries({ queryKey: ["documents"] });
          }}
        />
      )}
    </div>
  );
}
