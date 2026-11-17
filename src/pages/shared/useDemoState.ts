import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEMO_STORAGE_KEY, INITIAL_DEMO_STATE } from "./business-demo";
import type { DemoState } from "./business-demo";

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
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));

      setState(next);
      window.dispatchEvent(new Event(DEMO_STATE_CHANGED_EVENT));
    },
    [],
  );

  return [state, setDemoState];
}
