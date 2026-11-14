export function getThumbnailUrl(path?: string | null, version?: string | number | null): string | null {
  if (!path) return null;
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return version ? `${baseUrl}${cleanPath}?v=${version}` : `${baseUrl}${cleanPath}`;
}
