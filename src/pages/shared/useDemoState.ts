import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEMO_STORAGE_KEY, INITIAL_DEMO_STATE } from "./business-demo";
import type { DemoState } from "./business-demo";
import { getTodayISO } from "./formatters";

function loadDemoState(strict = false): DemoState {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return INITIAL_DEMO_STATE;

    const parsed: unknown = JSON.parse(stored);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      if (strict) throw new Error("Dữ liệu demo không hợp lệ.");
      return INITIAL_DEMO_STATE;
    }

    const saved = parsed as Record<string, unknown>;
    const arrayFields: (keyof DemoState)[] = [
      "stores",
      "categories",
      "ingredients",
      "units",
      "products",
      "recipes",
      "lots",
      "batches",
      "purchaseOrders",
      "receipts",
      "plans",
      "allocations",
      "countSnapshots",
      "counts",
      "reconciliations",
      "ignoredThresholds",
      "masterFixedPlans",
      "temporaryOverrides",
      "distributionHistory",
      "branchStaff",
    ];

    const today = getTodayISO();
    const isCurrentSchema = saved.schemaVersion === 2;

    for (const field of arrayFields) {
      if (!Array.isArray(saved[field])) {
        saved[field] = INITIAL_DEMO_STATE[field];
      } else if (!isCurrentSchema) {
        const existing = saved[field] as Record<string, unknown>[];
        const seeds = INITIAL_DEMO_STATE[field] as unknown as Record<string, unknown>[];
        const existingIds = new Set(existing.map((item) => String(item.id ?? "")));
        const missing = seeds.filter((seed) => {
          const sid = String(seed.id ?? "");
          return sid && !existingIds.has(sid);
        });

        const seedById = new Map(seeds.map((s) => [String(s.id ?? ""), s]));
        const enriched = existing.map((item) => {
          const id = String(item.id ?? "");
          const seed = seedById.get(id);
          if (!seed) return item;

          const merged = { ...seed, ...item };
          if (field === "lots" && id !== "lot-central-expiring-1") {
            const exp = typeof item.expiryDate === "string" ? item.expiryDate : null;
            if (exp && exp < today && typeof seed.expiryDate === "string") {
              merged.expiryDate = seed.expiryDate;
            }
          }
          if (field === "batches" && typeof seed.expiryDate === "string") {
            const exp = typeof item.expiryDate === "string" ? item.expiryDate : "";
            if (exp && exp < today) {
              merged.expiryDate = seed.expiryDate;
            }
          }
          return merged;
        });

        saved[field] = missing.length > 0 ? [...enriched, ...missing] : enriched;
      }
    }

    return {
      ...INITIAL_DEMO_STATE,
      ...saved,
      schemaVersion: 2,
    } as DemoState & { schemaVersion?: number };
  } catch (error) {
    if (strict) throw error;
    return INITIAL_DEMO_STATE;
  }
}

const DEMO_STATE_CHANGED_EVENT = "milktyway:demo-state-changed";

export function useDemoState(): [
  DemoState,
  Dispatch<SetStateAction<DemoState>>,
] {
  const [state, setState] = useState<DemoState>(() => loadDemoState());

  useEffect(() => {
    function refresh() {
      try {
        setState(loadDemoState(true));
      } catch {
        // Không ghi đè state hiện tại bằng seed khi dữ liệu lưu bị lỗi.
        // Các thao tác ghi bên dưới vẫn đọc nghiêm ngặt và sẽ báo lỗi.
      }
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.storageArea === localStorage &&
        (event.key === DEMO_STORAGE_KEY || event.key === null)
      ) {
        refresh();
      }
    }

    window.addEventListener(DEMO_STATE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", handleStorage);

    // Đọc lại sau khi đăng ký listener.
    refresh();

    return () => {
      window.removeEventListener(DEMO_STATE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setDemoState = useCallback<Dispatch<SetStateAction<DemoState>>>(
    update => {
      // Đọc bản mới nhất, không dùng snapshot riêng của page.
      const current = loadDemoState(true);
      const next =
        typeof update === "function" ? update(current) : update;

      // Chỉ cập nhật UI sau khi lưu thành công.
      // Không nuốt lỗi: caller phải bắt lỗi và không báo thành công.
      const toStore = { ...next, schemaVersion: 2 };
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(toStore));

      setState(next);
      window.dispatchEvent(new Event(DEMO_STATE_CHANGED_EVENT));
    },
    [],
  );

  return [state, setDemoState];
}
