// src/hooks/usePersistedViewMode.ts
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VIEW_MODE,
  VIEW_MODE_CHANGE_EVENT,
  VIEW_MODE_STORAGE_KEY,
  isViewMode,
  readStoredViewMode,
  writeStoredViewMode,
  type ViewMode,
  type ViewModeStorage,
} from "@/utils/viewModeStorage";

function getBrowserStorage(): ViewModeStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Đọc/ghi kiểu hiển thị tài liệu vào localStorage với key dùng chung.
 *
 * - `defaultMode`: giá trị fallback khi người dùng chưa từng chọn.
 *   Mỗi màn hình có thể giữ default cũ (personal: detail, library: grid).
 * - Khi người dùng chọn: ghi localStorage + phát custom event để mọi
 *   component đang mount trong cùng tab cập nhật ngay.
 * - Tab khác nhận qua sự kiện `storage` của trình duyệt.
 */
export function usePersistedViewMode(
  defaultMode: ViewMode = DEFAULT_VIEW_MODE
) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return readStoredViewMode(getBrowserStorage()) ?? defaultMode;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromStorage = (event: StorageEvent) => {
      // key === null xảy ra khi localStorage.clear().
      if (event.key !== null && event.key !== VIEW_MODE_STORAGE_KEY) return;

      setViewModeState(
        readStoredViewMode(getBrowserStorage()) ?? defaultMode
      );
    };

    const syncFromCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;

      if (isViewMode(detail)) {
        setViewModeState(detail);
        return;
      }

      setViewModeState(
        readStoredViewMode(getBrowserStorage()) ?? defaultMode
      );
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(VIEW_MODE_CHANGE_EVENT, syncFromCustomEvent);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(VIEW_MODE_CHANGE_EVENT, syncFromCustomEvent);
    };
  }, [defaultMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    writeStoredViewMode(getBrowserStorage(), mode);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<ViewMode>(VIEW_MODE_CHANGE_EVENT, { detail: mode })
      );
    }
  }, []);

  return [viewMode, setViewMode] as const;
}
