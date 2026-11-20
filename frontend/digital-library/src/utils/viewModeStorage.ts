// src/utils/viewModeStorage.ts
//
// Lưu bền lựa chọn kiểu hiển thị tài liệu (Grid / List / Detail) vào localStorage.
// Key dùng chung cho các màn hình danh sách tài liệu:
//   - /personal/documents        (Kho tài liệu)
//   - /personal/shared           (Tài liệu đã nhận)
//   - /library/subject/:subjectId (Kho học liệu theo môn)

export type ViewMode = "grid" | "list" | "detail";

export const VIEW_MODES = ["grid", "list", "detail"] as const;

export const DEFAULT_VIEW_MODE: ViewMode = "detail";

/** Key localStorage dùng chung cho cả 3 màn hình. */
export const VIEW_MODE_STORAGE_KEY = "digital-library:documents-view-mode";

/** Event nội bộ để đồng bộ các component đang mount trong cùng tab. */
export const VIEW_MODE_CHANGE_EVENT = "digital-library:documents-view-mode-change";

/** Tối thiểu những method cần dùng để dễ test bằng storage giả. */
export interface ViewModeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isViewMode(value: unknown): value is ViewMode {
  return (
    typeof value === "string" &&
    (VIEW_MODES as readonly string[]).includes(value)
  );
}

/**
 * Đọc giá trị đã lưu. Trả về null nếu chưa có, dữ liệu hỏng,
 * hoặc trình duyệt chặn localStorage.
 */
export function readStoredViewMode(
  storage: ViewModeStorage | null | undefined
): ViewMode | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(VIEW_MODE_STORAGE_KEY);
    return isViewMode(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Ghi giá trị vào storage. Trả về false nếu không ghi được
 * (private mode, quota, storage bị chặn) để caller vẫn có thể
 * đồng bộ tạm thời trong RAM bằng custom event.
 */
export function writeStoredViewMode(
  storage: ViewModeStorage | null | undefined,
  mode: ViewMode
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
