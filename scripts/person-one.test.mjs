import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Chạy từng bộ trong tiến trình riêng, dừng ngay khi một bộ thất bại.
const suites = [
  "auth-matrix", "session-branch", "pos-checkout", "preparation-queue",
  "cash-shifts", "sales-returns", "promotions",
];
for (const suite of suites) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`${suite}.test.mjs`, import.meta.url))], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("PASS: toàn bộ 7 bộ kiểm thử GĐ0 và A1–A5.");
