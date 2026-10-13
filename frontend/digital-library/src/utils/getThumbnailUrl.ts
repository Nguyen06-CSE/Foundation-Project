import { getFullFileUrl } from "@/services/api";

export function getThumbnailUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("data:")) {
    return path;
  }
  const fullUrl = getFullFileUrl(path);
  if (!fullUrl) return null;
  return fullUrl.includes("?") ? `${fullUrl}&t=${Date.now()}` : `${fullUrl}?t=${Date.now()}`;
}

