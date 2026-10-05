export const getFileExtension = (type: string) => {
  if (!type) return "";
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);

  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/x-rar-compressed": "rar",
  };

  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

export const FILE_TYPE_THEMES: Record<
  string,
  { bg: string; badgeBg: string; badgeText: string; border: string }
> = {
  pdf: { bg: "bg-rose-50/70 hover:bg-rose-50", badgeBg: "bg-rose-100/90", badgeText: "text-rose-700", border: "group-hover:border-rose-200" },
  doc: { bg: "bg-blue-50/70 hover:bg-blue-50", badgeBg: "bg-blue-100/90", badgeText: "text-blue-700", border: "group-hover:border-blue-200" },
  docx: { bg: "bg-blue-50/70 hover:bg-blue-50", badgeBg: "bg-blue-100/90", badgeText: "text-blue-700", border: "group-hover:border-blue-200" },
  xls: { bg: "bg-emerald-50/70 hover:bg-emerald-50", badgeBg: "bg-emerald-100/90", badgeText: "text-emerald-700", border: "group-hover:border-emerald-200" },
  xlsx: { bg: "bg-emerald-50/70 hover:bg-emerald-50", badgeBg: "bg-emerald-100/90", badgeText: "text-emerald-700", border: "group-hover:border-emerald-200" },
  ppt: { bg: "bg-amber-50/70 hover:bg-amber-50", badgeBg: "bg-amber-100/90", badgeText: "text-amber-700", border: "group-hover:border-amber-200" },
  pptx: { bg: "bg-amber-50/70 hover:bg-amber-50", badgeBg: "bg-amber-100/90", badgeText: "text-amber-700", border: "group-hover:border-amber-200" },
  jpg: { bg: "bg-purple-50/70 hover:bg-purple-50", badgeBg: "bg-purple-100/90", badgeText: "text-purple-700", border: "group-hover:border-purple-200" },
  png: { bg: "bg-purple-50/70 hover:bg-purple-50", badgeBg: "bg-purple-100/90", badgeText: "text-purple-700", border: "group-hover:border-purple-200" },
  zip: { bg: "bg-slate-100/70 hover:bg-slate-100", badgeBg: "bg-slate-200/90", badgeText: "text-slate-700", border: "group-hover:border-slate-300" },
  rar: { bg: "bg-slate-100/70 hover:bg-slate-100", badgeBg: "bg-slate-200/90", badgeText: "text-slate-700", border: "group-hover:border-slate-300" },
};

export const DEFAULT_THEME = {
  bg: "bg-gray-50/70 hover:bg-gray-50",
  badgeBg: "bg-gray-200/80",
  badgeText: "text-gray-700",
  border: "group-hover:border-gray-300",
};