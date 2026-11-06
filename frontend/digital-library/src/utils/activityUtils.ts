// frontend/digital-library/src/utils/activityUtils.ts

export const ACTION_LABELS: Record<string, string> = {
  DOCUMENT_VIEWED: "đã xem tài liệu",
  DOCUMENT_DOWNLOADED: "đã tải xuống",
  DOCUMENT_SAVED: "đã lưu về cá nhân",
  DOCUMENT_SHARED: "đã chia sẻ tài liệu",
  DOCUMENT_RECEIVED: "đã nhận tài liệu chia sẻ",
  DOCUMENT_CONTRIBUTED: "đã đóng góp vào kho học liệu",
  DOCUMENT_RENAMED: "đã đổi tên",
  DOCUMENT_DELETED: "đã xóa tài liệu",
  DOCUMENT_RESTORED: "đã khôi phục",
  TAG_ADDED: "đã gắn nhãn",
  TAG_REMOVED: "đã gỡ nhãn",
  BUNDLE_CREATED: "đã tạo gói tài liệu",
  DOCUMENT_UPLOADED: "đã tải lên tài liệu",
  view: "đã xem tài liệu",
  download: "đã tải xuống",
};

export const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_VIEWED: "bg-blue-500",
  DOCUMENT_DOWNLOADED: "bg-purple-500",
  DOCUMENT_UPLOADED: "bg-green-500",
  DOCUMENT_SAVED: "bg-teal-500",
  DOCUMENT_SHARED: "bg-orange-500",
  DOCUMENT_RECEIVED: "bg-indigo-500",
  DOCUMENT_CONTRIBUTED: "bg-amber-500",
  DOCUMENT_DELETED: "bg-red-500",
  DOCUMENT_RESTORED: "bg-emerald-400",
  TAG_ADDED: "bg-gray-400",
  TAG_REMOVED: "bg-gray-300",
  BUNDLE_CREATED: "bg-purple-400",
  view: "bg-blue-500",
  download: "bg-purple-500",
};

export const getActionLabel = (action: string): string => {
  return ACTION_LABELS[action] || action.toLowerCase().replace(/_/g, " ");
};

export const getActionColor = (action: string): string => {
  return ACTION_COLORS[action] || "bg-gray-400";
};
