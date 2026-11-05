import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEMO_STORAGE_KEY, INITIAL_DEMO_STATE } from "./business-demo";
import type { DemoState } from "./business-demo";

function loadDemoState(): DemoState {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);

    if (!stored) return INITIAL_DEMO_STATE;

    const parsed: unknown = JSON.parse(stored);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return INITIAL_DEMO_STATE;
    }

    const saved = parsed as Record<string, unknown>;

    const fields: (keyof DemoState)[] = [
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
    ];

    for (const field of fields) {
      if (!Array.isArray(saved[field])) {
        saved[field] = INITIAL_DEMO_STATE[field];
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
