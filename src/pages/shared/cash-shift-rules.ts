export interface ShiftSignature {
  staffId: string;
  name: string;
  signedAt: string;
}

export type InventoryBand = "pass" | "explain" | "recount";

export interface ShiftInventoryInput {
  group?: "A" | "B";
  lotId: string;
  ingredientId: string;
  ingredientName: string;
  lotCode: string;
  unit: string;
  theoretical: number;
  counted: number;
  recounted: number | null;
  reason: string;
}

export interface ShiftInventoryResult extends ShiftInventoryInput {
  /** Cùng quy ước B6: lý thuyết − thực đếm; âm là thừa. */
  difference: number;
  /** null khi lý thuyết = 0 nhưng thực đếm > 0. */
  variancePercent: number | null;
  initialBand: InventoryBand;
  finalBand: InventoryBand;
  recountRequired: boolean;
}

export interface CashShiftHandover {
  first: ShiftSignature;
  differentCloserApproval?: ShiftSignature;
  second?: ShiftSignature;
  confirmations?: { cash: boolean; inventory: boolean; recount: boolean };
  inventorySource: "inventory-store";
  inventoryReference: string;
  inventory: ShiftInventoryResult[];
  handoverReason: string;
  cashSales: number;
  cashDifference: number;
}

export interface CashShiftAudit {
  version: 1;
  openApproval?: ShiftSignature;
  /**
   * Chỉ dùng cho ca legacy thiếu ID người mở.
   * Đây là xác nhận khai báo của quản lý, không phải chữ ký mở ca lịch sử.
   */
  legacyOpenerConfirmation?: ShiftSignature;
  handover?: CashShiftHandover;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validQuantity(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1_000_000_000_000;
}


function isSignature(value: unknown): value is ShiftSignature {
  return record(value) &&
    typeof value.staffId === "string" &&
    Boolean(value.staffId.trim()) &&
    typeof value.name === "string" &&
    Boolean(value.name.trim()) &&
    typeof value.signedAt === "string" &&
    Number.isFinite(Date.parse(value.signedAt));
}

export function inventoryBand(
  theoretical: number,
  counted: number,
): InventoryBand {
  if (!validQuantity(theoretical) || !validQuantity(counted)) {
    throw new Error("Lượng kiểm kê phải là số hữu hạn không âm.");
  }

  if (theoretical === 0) {
    return counted === 0 ? "pass" : "recount";
  }

  const difference = Math.abs(theoretical - counted);
  const scaled = difference * 100;
  const tolerance = Number.EPSILON *
    Math.max(1, scaled, theoretical * 100) * 8;

  if (scaled <= theoretical * 2 + tolerance) return "pass";
  if (scaled <= theoretical * 5 + tolerance) return "explain";
  return "recount";
}

export function assessShiftInventory(
  input: ShiftInventoryInput,
): ShiftInventoryResult {
  if (
    !input.lotId?.trim() ||
    !input.ingredientId?.trim() ||
    !input.ingredientName?.trim() ||
    !input.lotCode?.trim() ||
    !input.unit?.trim() ||
    typeof input.reason !== "string" ||
    !validQuantity(input.theoretical) ||
    !validQuantity(input.counted) ||
    (
      input.recounted !== null &&
      !validQuantity(input.recounted)
    )
  ) {
    throw new Error("Thông tin dòng kiểm kê không hợp lệ.");
  }

  const effectiveCount = input.recounted ?? input.counted;
  const initialBand = inventoryBand(input.theoretical, input.counted);
  const finalBand = inventoryBand(input.theoretical, effectiveCount);

  return {
    ...input,
    reason: input.reason.trim(),
    difference: input.theoretical - effectiveCount,
    variancePercent: input.theoretical === 0
      ? effectiveCount === 0 ? 0 : null
      : Math.abs(input.theoretical - effectiveCount) /
        input.theoretical * 100,
    initialBand,
    finalBand,
    recountRequired: initialBand === "recount",
  };
}

export function validateShiftInventory(
  input: ShiftInventoryInput,
): ShiftInventoryResult {
  const result = assessShiftInventory(input);

  if (result.recountRequired && result.recounted === null) {
    throw new Error(
      `${result.ingredientName}: lệch trên 5% hoặc tồn lý thuyết bằng 0 có phát sinh; phải đếm lại.`,
    );
  }

  if (
    (
      result.initialBand !== "pass" ||
      result.finalBand !== "pass"
    ) &&
    !result.reason
  ) {
    throw new Error(
      `${result.ingredientName}: cần giải trình chênh lệch.`,
    );
  }

  return result;
}

/** Kiểm tra dữ liệu mới mà không loại bỏ ca legacy chưa có audit. */
export function isCashShiftAudit(value: unknown): value is CashShiftAudit {
  if (!record(value) || value.version !== 1) return false;

  if (
    value.openApproval !== undefined &&
    !isSignature(value.openApproval)
  ) return false;

  if (
    value.legacyOpenerConfirmation !== undefined &&
    !isSignature(value.legacyOpenerConfirmation)
  ) return false;

  if (value.handover === undefined) return true;

  const handover = value.handover;

  if (
    !record(handover) ||
    !isSignature(handover.first) ||
    (
      handover.second !== undefined &&
      !isSignature(handover.second)
    ) ||
    handover.inventorySource !== "inventory-store" ||
    typeof handover.inventoryReference !== "string" ||
    !handover.inventoryReference.trim() ||
    typeof handover.handoverReason !== "string" ||
    (typeof handover.cashSales !== "number" || !Number.isSafeInteger(handover.cashSales)) ||
    typeof handover.cashDifference !== "number" ||
    !Number.isSafeInteger(handover.cashDifference) ||
    !Array.isArray(handover.inventory) ||
    handover.inventory.length === 0
  ) return false;

  if (handover.differentCloserApproval !== undefined && !isSignature(handover.differentCloserApproval)) return false;
  if (handover.second !== undefined) {
    if (handover.first.staffId === handover.second.staffId || !record(handover.confirmations) ||
        handover.confirmations.cash !== true || handover.confirmations.inventory !== true ||
        typeof handover.confirmations.recount !== "boolean") return false;
  }

  try {
    const ids = new Set<string>();

    for (const value of handover.inventory) {
      if (!record(value)) return false;
      const line = value as unknown as ShiftInventoryInput;
      const assessed = validateShiftInventory(line);
      for (const key of ["difference", "variancePercent", "initialBand", "finalBand", "recountRequired"] as const) {
        if (value[key] !== assessed[key]) return false;
      }

      if (ids.has(line.lotId)) return false;
      ids.add(line.lotId);
    }

    return true;
  } catch {
    return false;
  }
}
