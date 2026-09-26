// src/components/shared/ShareDocumentModal.tsx
import { useState } from "react";
import { X, Search, Share2, User as UserIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { userService } from "@/services/userService";
import { documentService } from "@/services/documentService";
import type { User } from "@/types/user";

interface ShareDocumentModalProps {
  documentId: number;
  documentTitle: string;
  onClose: () => void;
}

export function ShareDocumentModal({
  documentId,
  documentTitle,
  onClose,
}: ShareDocumentModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  // Tìm kiếm user (chỉ khi gõ >= 2 ký tự)
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["user-search", searchQuery],
    queryFn: () => userService.searchUsers(searchQuery.trim()),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 10 * 1000,
  });

  const shareMutation = useMutation({
    mutationFn: () =>
      documentService.share(
        documentId,
        selectedUser!.id,
        message.trim() || undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "shared-with-me"] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Không thể chia sẻ. Vui lòng thử lại.";
      alert(msg);
    },
  });

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery("");
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Chia sẻ tài liệu
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">
                {documentTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {/* Hiển thị user đã chọn hoặc ô tìm kiếm */}
          {selectedUser ? (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 shrink-0">
                <UserIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {selectedUser.full_name || selectedUser.username}
                </p>
                <p className="text-xs text-gray-500">@{selectedUser.username}</p>
              </div>
              <button
                onClick={handleClearUser}
                className="rounded-full p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Ô tìm kiếm */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm người nhận (nhập ít nhất 2 ký tự)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Kết quả tìm kiếm */}
              {searchQuery.trim().length >= 2 && (
                <div className="mt-2 max-h-[200px] overflow-y-auto">
                  {isSearching ? (
                    <div className="flex flex-col gap-2 py-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <UserIcon className="h-6 w-6 mb-2" />
                      <p className="text-sm">Không tìm thấy người dùng</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 shrink-0">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {user.full_name || user.username}
                            </p>
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Ô nhập lời nhắn — chỉ hiện sau khi đã chọn user */}
          {selectedUser && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Lời nhắn <span className="text-gray-400 font-normal">(không bắt buộc)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                placeholder='Ví dụ: "Đọc trước chương 3 nhé"'
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">
                {message.length}/300
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={shareMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={!selectedUser || shareMutation.isPending}
            onClick={() => shareMutation.mutate()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {shareMutation.isPending ? "Đang chia sẻ..." : "Chia sẻ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
