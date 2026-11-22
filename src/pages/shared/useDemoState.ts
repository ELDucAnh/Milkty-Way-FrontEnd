import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEMO_STORAGE_KEY, INITIAL_DEMO_STATE } from "./business-demo";
import type { DemoState } from "./business-demo";
import { getTodayISO } from "./formatters";

function loadDemoState(): DemoState {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return INITIAL_DEMO_STATE;

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
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

    for (const field of arrayFields) {
      if (!Array.isArray(saved[field])) {
        saved[field] = INITIAL_DEMO_STATE[field];
      } else {
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
    } as DemoState;
  } catch {
    return INITIAL_DEMO_STATE;
  }
}

export function useDemoState(): [
  DemoState,
  Dispatch<SetStateAction<DemoState>>,
] {
  const [state, setState] = useState<DemoState>(loadDemoState);
  const stateRef = useRef(state);

  const setDemoState = useCallback<Dispatch<SetStateAction<DemoState>>>(
    (update) => {
      const next =
        typeof update === "function" ? update(stateRef.current) : update;
      stateRef.current = next;
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Demo interactions still work for the current mounted page without storage.
      }
      setState(next);
    },
    [],
  );

  return [state, setDemoState];
}
