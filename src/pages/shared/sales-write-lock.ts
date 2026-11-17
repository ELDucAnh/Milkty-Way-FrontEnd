/**
 * Tuần tự hóa các luồng ghi nghiệp vụ có sử dụng helper này.
 * Không thay thế transaction/backend.
 *
 * Khi Web Locks không khả dụng: chỉ có journal/guard đồng bộ trong tab.
 */
export function withSalesWriteLock<T>(
  operation: () => T | Promise<T>,
): Promise<T> {
  if (
    typeof window !== "undefined" && typeof navigator !== "undefined" &&
    navigator.locks
  ) {
    return navigator.locks.request(
      "milktyway.sales.write",
      async () => operation(),
    );
  }

  return Promise.resolve().then(operation);
}
