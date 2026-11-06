import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Folder as FolderIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { documentService } from "@/services/documentService";
import { folderService } from "@/services/folderService";
import { groupService } from "@/services/groupService";
import type { SimpleShareModalProps } from "../../types/groupSpace.types";

export default function SimpleShareModal({
  title,
  groupId,
  mode = "documents",
  onClose,
}: SimpleShareModalProps) {
  const queryClient = useQueryClient();
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: personalDocsData, isLoading: docsLoading } = useQuery({
    queryKey: ["personal-docs-for-group-share"],
    queryFn: () => documentService.getAll({ page: 1, page_size: 100 }),
    enabled: mode === "documents",
  });

  const { data: personalFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["personal-folders-for-group-share"],
    queryFn: () => folderService.getAll(),
    enabled: mode === "folder",
  });

  const personalDocs = personalDocsData?.items ?? [];
  const filteredDocs = personalDocs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredFolders = personalFolders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error("Thiếu thông tin nhóm");
      if (mode === "documents") {
        return groupService.shareDocuments(groupId, selectedDocIds);
      } else {
        if (!selectedFolderId) throw new Error("Vui lòng chọn thư mục");
        return groupService.shareFolder(groupId, selectedFolderId);
      }
    },
    onSuccess: () => {
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
        queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(
        err?.response?.data?.detail || err?.message || "Chia sẻ thất bại.",
      );
    },
  });

  const toggleDoc = (id: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const canSubmit =
    mode === "documents"
      ? selectedDocIds.length > 0
      : selectedFolderId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              mode === "documents"
                ? "Tìm tài liệu trong kho cá nhân..."
                : "Tìm thư mục cá nhân..."
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {mode === "documents" ? (
            docsLoading ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Đang tải tài liệu cá nhân...
              </p>
            ) : filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => {
                const checked = selectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      checked
                        ? "border-primary-400 bg-primary-50/40"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-primary-600 bg-primary-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <FileIcon
                      type={doc.file_type}
                      className="h-8 w-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {doc.title}
                      </p>
                      {doc.is_bundle && (
                        <span className="text-[11px] text-primary-600">
                          Gói tài liệu ({doc.bundle_children_count || 0} tệp)
                        </span>
                      )}
                    </div>
                  </label>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                Bạn chưa có tài liệu cá nhân nào phù hợp để chia sẻ.
              </p>
            )
          ) : foldersLoading ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Đang tải thư mục cá nhân...
            </p>
          ) : filteredFolders.length > 0 ? (
            filteredFolders.map((folder) => {
              const checked = selectedFolderId === folder.id;
              return (
                <label
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    checked
                      ? "border-primary-400 bg-primary-50/40"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      checked
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {checked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                  <FolderIcon
                    className="h-5 w-5 shrink-0"
                    style={{ color: folder.color || "#3b82f6" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {folder.document_count ?? 0} tài liệu
                    </p>
                  </div>
                </label>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-gray-500">
              Bạn chưa có thư mục cá nhân nào để chia sẻ.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-500">
            {mode === "documents"
              ? `Đã chọn ${selectedDocIds.length} tài liệu`
              : selectedFolderId
                ? "Đã chọn 1 thư mục"
                : "Chưa chọn thư mục"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              disabled={!canSubmit || shareMutation.isPending}
              onClick={() => shareMutation.mutate()}
            >
              {shareMutation.isPending ? "Đang chia sẻ..." : "Chia sẻ vào nhóm"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
