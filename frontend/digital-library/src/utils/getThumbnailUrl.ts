export function getThumbnailUrl(path?: string | null): string | null {
  if (!path) return null;
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  return `${import.meta.env.VITE_API_URL || ""}/${path}`;
}
