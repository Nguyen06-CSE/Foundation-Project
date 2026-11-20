// scripts/view-mode-storage.test.mjs
//
// Unit test cho lớp lưu trữ localStorage của view mode.
// Không cần cài thêm test framework; dùng Node Test Runner có sẵn.
//
// Chạy:
//   node --test scripts/view-mode-storage.test.mjs

import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_VIEW_MODE,
  VIEW_MODES,
  VIEW_MODE_STORAGE_KEY,
  isViewMode,
  readStoredViewMode,
  writeStoredViewMode,
} from "../src/utils/viewModeStorage.ts";

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    snapshot() {
      return Object.fromEntries(data);
    },
  };
}

test("key localStorage dùng chung cho cả 3 màn hình", () => {
  assert.equal(
    VIEW_MODE_STORAGE_KEY,
    "digital-library:documents-view-mode"
  );
});

test("chấp nhận đúng 3 giá trị ViewMode", () => {
  assert.deepEqual([...VIEW_MODES], ["grid", "list", "detail"]);

  for (const mode of VIEW_MODES) {
    assert.equal(isViewMode(mode), true);
  }

  for (const invalid of ["GRID", "table", "", null, undefined, 1, {}]) {
    assert.equal(isViewMode(invalid), false);
  }
});

test("đọc được giá trị hợp lệ đã lưu", () => {
  const storage = createStorage({
    [VIEW_MODE_STORAGE_KEY]: "list",
  });

  assert.equal(readStoredViewMode(storage), "list");
});

test("giá trị hỏng/không hợp lệ fallback về null", () => {
  const storage = createStorage({
    [VIEW_MODE_STORAGE_KEY]: "card-view",
  });

  assert.equal(readStoredViewMode(storage), null);
});

test("chưa có key thì trả về null để dùng default của từng màn hình", () => {
  assert.equal(readStoredViewMode(createStorage()), null);
  assert.equal(DEFAULT_VIEW_MODE, "detail");
});

test("ghi đúng key/value và đọc lại được", () => {
  const storage = createStorage();

  assert.equal(writeStoredViewMode(storage, "grid"), true);
  assert.deepEqual(storage.snapshot(), {
    [VIEW_MODE_STORAGE_KEY]: "grid",
  });
  assert.equal(readStoredViewMode(storage), "grid");
});

test("storage bị chặn khi đọc không làm crash", () => {
  const storage = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {},
  };

  assert.equal(readStoredViewMode(storage), null);
});

test("storage bị chặn khi ghi trả về false, không làm crash", () => {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };

  assert.equal(writeStoredViewMode(storage, "detail"), false);
});

test("không truyền storage thì trả về null/false an toàn", () => {
  assert.equal(readStoredViewMode(null), null);
  assert.equal(readStoredViewMode(undefined), null);
  assert.equal(writeStoredViewMode(null, "grid"), false);
  assert.equal(writeStoredViewMode(undefined, "grid"), false);
});
