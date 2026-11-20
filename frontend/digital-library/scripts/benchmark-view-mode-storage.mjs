// scripts/benchmark-view-mode-storage.mjs
//
// Benchmark + kiểm tra hành vi lưu viewMode bằng:
//   1. Module-level object (RAM thuần)
//   2. TanStack Query cache (RAM, đúng config app: gcTime 10 phút)
//   3. localStorage payload (không đo được RAM trình duyệt, chỉ đo bytes lưu)
//
// Chạy:
//   node --expose-gc scripts/benchmark-view-mode-storage.mjs
//
// N là số entry dùng để đo; càng lớn số liệu per-entry càng ổn định.
//   N=10000 node --expose-gc scripts/benchmark-view-mode-storage.mjs

import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";

const N = Number(process.env.N ?? 10_000);
const STORAGE_KEY = "digital-library:documents-view-mode";
const STORAGE_VALUE = "grid";
const QUERY_KEY = ["ui", STORAGE_KEY];
const APP_GC_TIME = 10 * 60 * 1000; // giống App.tsx
const APP_STALE_TIME = 30 * 1000;

const hasGc = typeof global.gc === "function";

function forceGc() {
  if (!hasGc) return;
  global.gc();
  global.gc();
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "n/a";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes.toFixed(0)} B`;
  if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function measure(label, count, factory, release) {
  if (!hasGc) {
    console.log(`- ${label}: bỏ qua (chạy lại với --expose-gc để đo heap)`);
    return null;
  }

  forceGc();
  const before = process.memoryUsage().heapUsed;
  const keep = factory(count);
  forceGc();
  const after = process.memoryUsage().heapUsed;
  const total = after - before;

  release?.(keep);

  const result = { label, count, total, perItem: total / count };
  console.log(
    `- ${label}: ${formatBytes(total)} cho ${count.toLocaleString("vi-VN")} entry ` +
      `(~${formatBytes(result.perItem)}/entry)`
  );
  return result;
}

function makeClient(gcTime) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: APP_STALE_TIME,
        gcTime,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

console.log("=== MÔI TRƯỜNG ===");
console.log(`Node: ${process.version}`);
console.log(`Heap measurement: ${hasGc ? "bật (--expose-gc)" : "tắt"}`);
console.log(`Số entry đo: ${N.toLocaleString("vi-VN")}`);

console.log("\n=== KÍCH THƯỚC PAYLOAD ===");

const utf8Bytes = Buffer.byteLength(STORAGE_KEY + STORAGE_VALUE, "utf8");
const utf16Bytes = (STORAGE_KEY.length + STORAGE_VALUE.length) * 2;
console.log(`- localStorage key + value: "${STORAGE_KEY}" = "${STORAGE_VALUE}"`);
console.log(`  UTF-8: ${utf8Bytes} B | UTF-16 (Web Storage thực tế): ${utf16Bytes} B`);
console.log(`- Quota localStorage thường gặp: ~5 MiB/origin`);
console.log(
  `- Tỷ lệ dùng quota: ${((utf16Bytes / (5 * 1024 * 1024)) * 100).toExponential(2)}%`
);

const sampleClient = makeClient(APP_GC_TIME);
sampleClient.setQueryData(QUERY_KEY, STORAGE_VALUE);
const sampleQuery = sampleClient.getQueryCache().getAll()[0];
const queryJson = JSON.stringify(sampleQuery);
const stateJson = JSON.stringify(sampleQuery.state);
console.log(`- React Query entry (JSON.stringify toàn bộ Query): ${Buffer.byteLength(queryJson)} B`);
console.log(`- Riêng state (data + metadata): ${Buffer.byteLength(stateJson)} B`);
console.log(`- Query key: ${JSON.stringify(QUERY_KEY)}`);
sampleClient.clear();

console.log("\n=== RAM THỰC TẾ (heap) ===");

// 1. Module-level object: đây là chi phí tối thiểu của RAM thuần.
measure(
  "Module-level object",
  N,
  (count) => Array.from({ length: count }, () => ({ viewMode: STORAGE_VALUE })),
  () => {}
);

// 2. React Query với gcTime = Infinity: đo riêng object Query, không có timer GC.
measure(
  "React Query (gcTime = Infinity)",
  N,
  (count) => {
    const client = makeClient(Infinity);
    for (let i = 0; i < count; i += 1) {
      client.setQueryData(["ui", STORAGE_KEY, i], STORAGE_VALUE);
    }
    return client;
  },
  (client) => client.clear()
);

// 3. React Query đúng config app: mỗi Query có một timer GC 10 phút.
measure(
  "React Query (gcTime = 10 phút, giống app)",
  N,
  (count) => {
    const client = makeClient(APP_GC_TIME);
    for (let i = 0; i < count; i += 1) {
      client.setQueryData(["ui", STORAGE_KEY, i], STORAGE_VALUE);
    }
    return client;
  },
  (client) => client.clear()
);

console.log("\n=== KIỂM TRA HÀNH VI ===");

let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${name}: ${error.message}`);
  }
}

await check("React Query giữ được giá trị khi đọc lại", () => {
  const client = makeClient(APP_GC_TIME);
  client.setQueryData(QUERY_KEY, STORAGE_VALUE);
  assert.equal(client.getQueryData(QUERY_KEY), STORAGE_VALUE);
  client.clear();
});

await check("queryClient.clear() xóa mất giá trị (login/logout đang gọi hàm này)", () => {
  const client = makeClient(APP_GC_TIME);
  client.setQueryData(QUERY_KEY, STORAGE_VALUE);
  client.clear();
  assert.equal(client.getQueryData(QUERY_KEY), undefined);
});

await check("gcTime hết hạn thì React Query tự xóa entry (test với 40ms)", async () => {
  const client = makeClient(40);
  client.setQueryData(QUERY_KEY, STORAGE_VALUE);
  assert.equal(client.getQueryData(QUERY_KEY), STORAGE_VALUE);
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(client.getQueryData(QUERY_KEY), undefined);
});

await check("localStorage payload không vượt quá 100 B", () => {
  assert.ok(utf16Bytes <= 100, `payload thực tế ${utf16Bytes} B`);
});

console.log("\n=== KẾT LUẬN ===");
if (failures > 0) {
  console.log(`${failures} kiểm tra thất bại.`);
  process.exitCode = 1;
} else {
  console.log("Tất cả kiểm tra hành vi đều đạt.");
}

// Đảm bảo process thoát ngay, không bị giữ bởi timer GC 10 phút.
process.exit(process.exitCode ?? 0);
