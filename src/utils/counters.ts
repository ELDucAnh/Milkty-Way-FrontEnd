/**
 * Mã quầy chuẩn trong phiên mới: Q1, Q2, Q3.
 *
 * Đọc tương thích POS01/POS02/POS03 của dữ liệu cũ.
 * Mã quầy chỉ có ý nghĩa khi đi cùng branchId.
 */
export function normalizeCounterId(counterId: string): string {
  const normalized = counterId.trim().toUpperCase();
  const match = /^(?:POS|Q)0*([1-9]\d*)$/.exec(normalized);

  return match ? `Q${match[1]}` : normalized;
}

export function sameCounter(
  first: string | null | undefined,
  second: string | null | undefined,
): boolean {
  if (!first?.trim() || !second?.trim()) return false;

  return normalizeCounterId(first) === normalizeCounterId(second);
}

export function counterLabel(counterId: string): string {
  const normalized = normalizeCounterId(counterId);
  const match = /^Q([1-9]\d*)$/.exec(normalized);

  return match
    ? `Quầy ${match[1].padStart(2, "0")}`
    : normalized;
}
