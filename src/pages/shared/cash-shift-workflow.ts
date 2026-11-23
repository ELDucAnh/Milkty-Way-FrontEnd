import {
  RETURN_PENDING_KEY,
  loadReturnCashMovements,
} from "./sales-returns-store";
import {
  authenticateStaff, authenticateShiftVerifier,
  can,
  canAtBranch,
  canVerifyShiftAs,
  currentStaff,
  displayName,
  findStaff,
} from "../../utils/auth";
import {
  counterLabel, normalizeCounterId,
  sameCounter,
} from "../../utils/counters";
import {
  DEMO_STORAGE_KEY,
  INITIAL_DEMO_STATE,
} from "./business-demo";
import {
  loadCashShifts,
  STORAGE_SHIFTS,
} from "./cash-shifts-store";
import type { CashShift } from "./cash-shifts-store";
import {
  CHECKOUT_PENDING_KEY,
  loadOrders,
} from "./sales-orders-store";
import {
  validateShiftInventory,
} from "./cash-shift-rules";
import type {
  CashShiftAudit,
  ShiftInventoryInput,
  ShiftSignature,
} from "./cash-shift-rules";
import type { StaffRecord } from "../../utils/auth";

export const CASH_SHIFTS_CHANGED = "milktyway:cash-shifts-changed";

export interface ManagerCredentials {
  email: string;
  password: string;
}

export interface ShiftInventoryManifestLine {
  lotId: string;
  ingredientId: string;
  ingredientName: string;
  lotCode: string;
  unit: string;
  theoretical: number;
  group: "A" | "B";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cash(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} phải là số nguyên không âm.`);
  }
  return value;
}

function signature(staff: StaffRecord): ShiftSignature {
  return {
    staffId: staff.staffId,
    name: displayName(staff),
    signedAt: new Date().toISOString(),
  };
}

function requireActor(
  staffId: string,
  branchId: string,
  action: "shift.openBranch" | "shift.closeRequestBranch",
  counterId?: string,
): StaffRecord {
  const staff = currentStaff();

  if (
    !staff?.loginRole ||
    staff.staffId !== staffId ||
    staff.branchId !== branchId ||
    !canAtBranch(action, branchId) ||
    (staff.loginRole === "cashier" && counterId !== undefined && !sameCounter(staff.counterId, counterId))
  ) {
    throw new Error(
      "Phiên hoặc chi nhánh đã thay đổi, hoặc bạn không có quyền thao tác ca này.",
    );
  }

  return staff;
}

function requireManager(
  credentials: ManagerCredentials,
  branchId: string,
): StaffRecord {
  const manager = authenticateStaff(
    credentials.email,
    credentials.password,
  );

  if (
    !manager ||
    manager.loginRole !== "manager" ||
    manager.branchId !== branchId ||
    !manager.canVerifyShift ||
    !can("shift.verifySecondParty", manager.loginRole)
  ) {
    throw new Error(
      "Cần tài khoản và mật khẩu quản lý được phân công tại đúng chi nhánh.",
    );
  }

  return manager;
}

function assertNoPendingCheckout(): void {
  if (localStorage.getItem(RETURN_PENDING_KEY) !== null) {
    throw new Error(
      "Có giao dịch đổi trả chưa đối soát xong. Không thay đổi trạng thái ca lúc này.",
    );
  }

  if (localStorage.getItem(CHECKOUT_PENDING_KEY) !== null) {
    throw new Error(
      "POS có giao dịch chưa đối soát xong. Không thay đổi trạng thái ca lúc này.",
    );
  }
}

function save(shifts: CashShift[]): void {
  localStorage.setItem(STORAGE_SHIFTS, JSON.stringify(shifts));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CASH_SHIFTS_CHANGED));
  }
}

function currentTarget(
  shifts: CashShift[],
  snapshot: CashShift,
): CashShift {
  const target = shifts.find(shift => shift.id === snapshot.id);

  if (
    !target ||
    JSON.stringify(target) !== JSON.stringify(snapshot)
  ) {
    throw new Error(
      "Ca đã thay đổi. Tải lại dữ liệu trước khi thao tác.",
    );
  }

  const active = shifts.filter(
    shift =>
      shift.branchId === target.branchId &&
      sameCounter(shift.counterId, target.counterId) &&
      shift.status !== "closed",
  );

  if (target.status !== "closed" && active.length !== 1) {
    throw new Error(
      "Chi nhánh đang có nhiều ca chưa đóng từ dữ liệu cũ. Cần kiểm tra trước khi tiếp tục.",
    );
  }

  return target;
}

function retainedAudit(shift: CashShift): CashShiftAudit {
  return {
    version: 1,
    openApproval: shift.audit?.openApproval,
    legacyOpenerConfirmation: shift.audit?.legacyOpenerConfirmation,
  };
}

/**
 * Chỉ lấy các đơn đã thanh toán tiền mặt thuộc chính ca này.
 * Đơn legacy thiếu shiftId không được tự gán vào ca.
 */
export function getShiftCashSummary(shift: CashShift): {
  cashSales: number;
  expectedCash: number;
} {
  if (shift.status === "closed") {
    if (shift.expectedCash === null) {
      throw new Error(
        "Ca đã đóng thiếu snapshot tiền dự kiến. Cần đối soát dữ liệu cũ.",
      );
    }

    cash(shift.expectedCash, "Tiền dự kiến đã ký");

    return {
      cashSales:
        shift.audit?.handover?.cashSales ??
        shift.expectedCash - shift.openingCash,
      expectedCash: shift.expectedCash,
    };
  }

  let grossCashSales = 0;

  for (const order of loadOrders()) {
    if (order.shiftId !== shift.id) continue;

    if (
      order.branchId !== shift.branchId ||
      !sameCounter(order.counterId, shift.counterId)
    ) {
      throw new Error(
        `Đơn ${order.id} có liên kết ca nhưng sai chi nhánh/quầy.`,
      );
    }

    if (order.parentOrderId || order.paymentMethod !== "cash") continue;

    const hasRecordedCollection =
      order.payment === "paid" ||
      order.payment === "partially-refunded" ||
      (
        order.payment === "refunded" &&
        Boolean(order.amendments?.length)
      );

    if (!hasRecordedCollection) continue;

    cash(order.total, `Khoản thu ban đầu của ${order.id}`);
    grossCashSales += order.total;
    cash(grossCashSales, "Tổng tiền mặt bán hàng");
  }

  let refundCash = 0;
  let additionalCash = 0;

  for (const movement of loadReturnCashMovements()) {
    if (movement.shiftId !== shift.id) continue;

    if (
      movement.branchId !== shift.branchId ||
      !sameCounter(movement.counterId, shift.counterId)
    ) {
      throw new Error(
        `Phát sinh ${movement.returnCode} có liên kết ca sai chi nhánh/quầy.`,
      );
    }

    refundCash += movement.refundAmount;
    additionalCash += movement.additionalPaymentAmount;

    cash(refundCash, "Tổng tiền mặt hoàn khách");
    cash(additionalCash, "Tổng tiền mặt thu chênh lệch");
  }

  // Có thể âm khi ca này chi hoàn cho đơn được bán ở ca trước.
  const cashSales = grossCashSales + additionalCash - refundCash;
  if (!Number.isSafeInteger(cashSales)) {
    throw new Error("Phát sinh tiền mặt thuần vượt giới hạn an toàn.");
  }

  const expectedCash = shift.openingCash + cashSales;
  cash(expectedCash, "Tiền mặt dự kiến sau đổi trả");

  return { cashSales, expectedCash };
}

/**
 * Đọc tồn quầy hiện tại làm lượng lý thuyết, chụp vào biên bản khi ký.
 * Chưa suy ra tiêu hao theo ca: không dùng recipe mock hoặc snapshot ca khác.
 * Không dùng loader có cơ chế tự bổ sung lại lô seed vào mảng [].
 */
export function loadShiftInventoryManifest(
  branchId: string,
): ShiftInventoryManifestLine[] {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  const state: unknown = raw === null
    ? INITIAL_DEMO_STATE
    : JSON.parse(raw);

  if (
    !isRecord(state) ||
    !Array.isArray(state.lots) ||
    !Array.isArray(state.ingredients)
  ) {
    throw new Error("Không đọc được danh mục lô/nguyên liệu để kiểm kê.");
  }

  const result: ShiftInventoryManifestLine[] = [];
  const ids = new Set<string>();

  for (const value of state.lots) {
    if (!isRecord(value)) {
      throw new Error("Danh mục lô không hợp lệ.");
    }

    if (
      value.location !== "counter" ||
      value.locationId !== branchId
    ) continue;

    if (
      typeof value.id !== "string" ||
      !value.id.trim() ||
      typeof value.ingredientId !== "string" ||
      typeof value.lotCode !== "string" ||
      !value.lotCode.trim() ||
      typeof value.quantity !== "number" || !Number.isFinite(value.quantity) || value.quantity < 0 ||
      ids.has(value.id)
    ) {
      throw new Error("Lô tại chi nhánh thiếu thông tin hoặc bị trùng.");
    }

    const ingredient = state.ingredients.find(
      item => isRecord(item) && item.id === value.ingredientId,
    );

    if (
      !isRecord(ingredient) ||
      typeof ingredient.name !== "string" ||
      !ingredient.name.trim() ||
      typeof ingredient.baseUnit !== "string" ||
      !ingredient.baseUnit.trim()
    ) {
      throw new Error(`Lô ${value.id} thiếu nguyên liệu hoặc đơn vị.`);
    }

    ids.add(value.id);

    result.push({
      lotId: value.id,
      ingredientId: value.ingredientId,
      ingredientName: ingredient.name,
      lotCode: value.lotCode,
      unit: ingredient.baseUnit,
      theoretical: value.quantity,
      group: ingredient.group === "packaging" && ingredient.id !== "ing-cup" ? "B" : "A",
    });
  }

  return result;
}

export function openApprovedCashShift(params: {
  actorStaffId: string;
  branchId: string;
  openingCash: number;
  counterId: string;
}): CashShift {
  const actor = requireActor(
    params.actorStaffId,
    params.branchId,
    "shift.openBranch",
    params.counterId,
  );

  const counterId = normalizeCounterId(params.counterId);
  if (!["Q1", "Q2", "Q3"].includes(counterId)) throw new Error("Quầy không hợp lệ.");

  cash(params.openingCash, "Tiền đầu ca");
  assertNoPendingCheckout();

  const shifts = loadCashShifts();

  if (
    shifts.some(
      shift =>
        shift.branchId === params.branchId &&
        sameCounter(shift.counterId, counterId) &&
        shift.status !== "closed",
    )
  ) {
    throw new Error("Chi nhánh đang có ca mở hoặc đang chờ duyệt đóng.");
  }

  const shift: CashShift = {
    id: `CA-MP-${crypto.randomUUID()}`,
    branchId: params.branchId,
    counterId,
    counterName: counterLabel(counterId),
    openedByStaffId: actor.staffId,
    staffName: displayName(actor),
    openedAt: new Date().toISOString(),
    closedAt: null,
    openingCash: params.openingCash,
    expectedCash: null,
    countedCash: null,
    recipientId: null,
    handoverNote: "",
    pendingOrders: [],
    status: "open",
    audit: {
      version: 1,

    },
  };

  save([shift, ...shifts]);
  return shift;
}

/**
 * Không đoán ID người mở của ca legacy từ tên.
 * Quản lý xác nhận khai báo này bằng thông tin đăng nhập.
 */
export function confirmLegacyShiftOpener(params: {
  actorStaffId: string;
  snapshot: CashShift;
  openerStaffId: string;
  manager: ManagerCredentials;
}): void {
  const shifts = loadCashShifts();
  const target = currentTarget(shifts, params.snapshot);

  requireActor(
    params.actorStaffId,
    target.branchId,
    "shift.closeRequestBranch",
    target.counterId,
  );

  if (target.status !== "open" || target.openedByStaffId) {
    throw new Error("Chỉ xác nhận người mở cho ca cũ đang mở và thiếu staffId.");
  }

  const opener = findStaff(params.openerStaffId);
  const manager = requireManager(params.manager, target.branchId);

  if (
    !opener?.loginRole ||
    !["cashier", "manager"].includes(opener.loginRole) ||
    opener.branchId !== target.branchId
  ) {
    throw new Error("Người mở được khai báo phải là nhân sự cùng chi nhánh.");
  }

  assertNoPendingCheckout();

  save(shifts.map(shift => shift.id === target.id
    ? {
        ...shift,
        openedByStaffId: opener.staffId,
        audit: {
          ...retainedAudit(shift),
          legacyOpenerConfirmation: signature(manager),
        },
      }
    : shift));
}

export function requestCashShiftClose(params: {
  actorStaffId: string;
  snapshot: CashShift;
  countedCash: number;
  recipientId: string;
  note: string;
  handoverReason: string;
  inventoryReference: string;
  inventory: ShiftInventoryInput[];
  handoverManager?: ManagerCredentials;
}): void {
  const shifts = loadCashShifts();
  const target = currentTarget(shifts, params.snapshot);

  const actor = requireActor(
    params.actorStaffId,
    target.branchId,
    "shift.closeRequestBranch",
    target.counterId,
  );

  if (target.status !== "open") {
    throw new Error("Ca không còn ở trạng thái đang mở.");
  }

  if (!target.openedByStaffId) {
    throw new Error(
      "Ca cũ thiếu ID người mở. Cần quản lý xác nhận người mở trước.",
    );
  }

  const opener = findStaff(target.openedByStaffId);

  if (!opener || opener.branchId !== target.branchId) {
    throw new Error("Thông tin người mở ca không hợp lệ.");
  }



  if (
    !canVerifyShiftAs(
      params.recipientId,
      target.branchId,
      actor.staffId,
    )
  ) {
    throw new Error("Người duyệt phải là quản lý cùng CN, khác người đóng.");
  }

  const handoverReason = params.handoverReason.trim();
  const inventoryReference = params.inventoryReference.trim();
  const note = params.note.trim();

  if (actor.staffId !== target.openedByStaffId && (!handoverReason || !note)) {
    throw new Error("Cần chọn lý do bàn giao giữa người mở và người đóng.");
  }



  const differentCloserApproval = actor.staffId !== target.openedByStaffId
    ? signature(requireManager(params.handoverManager ?? {email: "", password: ""}, target.branchId))
    : undefined;
  const manifest = loadShiftInventoryManifest(target.branchId);

  if (!manifest.length) {
    throw new Error(
      "Chưa có danh mục lô kiểm kê tại CN. Không thể coi dữ liệu thiếu là đã kiểm kê đạt.",
    );
  }

  if (
    manifest.some(item => item.group === "A" && !params.inventory.some(line => line.lotId === item.lotId)) ||
    !params.inventory.length || params.inventory.some(line => !manifest.some(item => item.lotId === line.lotId)) ||
    new Set(params.inventory.map(line => line.lotId)).size !== params.inventory.length
  ) {
    throw new Error("Danh sách kiểm kê thiếu, trùng hoặc đã thay đổi.");
  }

  const inventory = manifest.filter(item => params.inventory.some(line => line.lotId === item.lotId)).map(item => {
    const input = params.inventory.find(line => line.lotId === item.lotId);

    if (!input || input.ingredientId !== item.ingredientId || input.theoretical !== item.theoretical) {
      throw new Error("Danh sách lô kiểm kê đã thay đổi. Vui lòng tải lại.");
    }

    return validateShiftInventory({
      ...input,
      ...item,
    });
  });

  cash(params.countedCash, "Tiền thực đếm");

  const { cashSales, expectedCash } = getShiftCashSummary(target);

  if (
    (
      params.countedCash !== expectedCash ||
      target.pendingOrders.length > 0
    ) &&
    !note
  ) {
    throw new Error("Cần ghi chú chênh lệch tiền hoặc đơn đang bàn giao.");
  }

  assertNoPendingCheckout();

  save(shifts.map(shift => shift.id === target.id
    ? {
        ...shift,
        status: "closing-requested",
        closeRequestedByStaffId: actor.staffId,
        expectedCash,
        countedCash: params.countedCash,
        recipientId: params.recipientId,
        handoverNote: note,
        closedAt: null,
        audit: {
          ...retainedAudit(shift),
          handover: {
            first: signature(actor),
            differentCloserApproval,
            inventorySource: "inventory-store",
            inventoryReference: inventoryReference || `Tồn quầy ${target.branchId} tại lúc ký`,
            inventory,
            handoverReason,
            cashSales,
            cashDifference: params.countedCash - expectedCash,
          },
        },
      }
    : shift));
}

export function verifyCashShiftClose(params: {
  actorStaffId: string;
  snapshot: CashShift;
  manager: ManagerCredentials;
  confirmCash: boolean;
  confirmInventory: boolean;
  confirmRecount: boolean;
}): void {
  const shifts = loadCashShifts();
  const target = currentTarget(shifts, params.snapshot);

  requireActor(
    params.actorStaffId,
    target.branchId,
    "shift.closeRequestBranch",
    target.counterId,
  );

  const handover = target.audit?.handover;

  if (
    target.status !== "closing-requested" ||
    target.closedAt !== null ||
    !handover ||
    handover.second
  ) {
    throw new Error(
      "Ca không còn chờ ký hoặc yêu cầu cũ chưa có đủ dữ liệu A3. Cần đọc lại/rút yêu cầu để lập lại.",
    );
  }

  const firstSigner = findStaff(handover.first.staffId);

  if (
    !target.openedByStaffId ||
    !firstSigner ||
    firstSigner.branchId !== target.branchId ||
    !firstSigner.loginRole ||
    !can("shift.closeRequestBranch", firstSigner.loginRole) ||
    handover.first.staffId !== target.closeRequestedByStaffId
  ) {
    throw new Error("Chữ ký bên giao không hợp lệ.");
  }

  if (!params.confirmCash || !params.confirmInventory) throw new Error("Bên 2 phải xác nhận đồng kiểm tiền mặt và kiểm kê nguyên liệu.");
  const recountRequired = Math.abs(handover.cashDifference) > 20000 || handover.inventory.some(line => line.recountRequired || line.finalBand === "recount");
  if (recountRequired && !params.confirmRecount) throw new Error("Bên 2 phải xác nhận đã trực tiếp đếm lại các mục vượt ngưỡng.");
  if (handover.first.staffId !== target.openedByStaffId && (!handover.handoverReason.trim() || !target.handoverNote.trim())) throw new Error("Thiếu lý do/biên bản bàn giao khác người mở.");
  if (handover.first.staffId !== target.openedByStaffId &&
      !handover.differentCloserApproval) throw new Error("Thiếu xác nhận quản lý về việc thay người đóng ca.");
  const manager = authenticateShiftVerifier(params.manager.email, params.manager.password, target.branchId, handover.first.staffId);
  if (!manager || manager.staffId !== target.recipientId) {
    throw new Error(
      "Tài khoản xác thực không phải quản lý được chỉ định hoặc trùng người ký bên giao.",
    );
  }

  for (const line of handover.inventory) {
    validateShiftInventory(line);
  }

  if (target.countedCash === null || target.expectedCash === null) {
    throw new Error("Yêu cầu đóng ca thiếu số tiền.");
  }

  const summary = getShiftCashSummary(target);

  if (
    summary.cashSales !== handover.cashSales ||
    summary.expectedCash !== target.expectedCash ||
    target.countedCash - target.expectedCash !== handover.cashDifference
  ) {
    throw new Error(
      "Số liệu tiền ca đã thay đổi sau chữ ký bên giao. Cần lập lại yêu cầu.",
    );
  }

  assertNoPendingCheckout();

  const second = signature(manager);

  save(shifts.map(shift => shift.id === target.id
    ? {
        ...shift,
        status: "closed",
        closedAt: second.signedAt,
        audit: {
          ...target.audit,
          version: 1,
          handover: {
            ...handover,
            second,
            confirmations: { cash: true, inventory: true, recount: params.confirmRecount },
          },
        },
      }
    : shift));
}

export function withdrawCashShiftClose(params: {
  actorStaffId: string;
  snapshot: CashShift;
}): void {
  const shifts = loadCashShifts();
  const target = currentTarget(shifts, params.snapshot);

  const actor = requireActor(
    params.actorStaffId,
    target.branchId,
    "shift.closeRequestBranch",
    target.counterId,
  );

  if (
    target.status !== "closing-requested" ||
    target.audit?.handover?.second
  ) {
    throw new Error("Không thể rút yêu cầu của ca này.");
  }

  if (
    actor.loginRole !== "manager" &&
    actor.staffId !== target.closeRequestedByStaffId
  ) {
    throw new Error("Chỉ người lập yêu cầu hoặc quản lý CN được rút yêu cầu.");
  }

  assertNoPendingCheckout();

  save(shifts.map(shift => shift.id === target.id
    ? {
        ...shift,
        status: "open",
        closedAt: null,
        expectedCash: null,
        countedCash: null,
        recipientId: null,
        closeRequestedByStaffId: undefined,
        handoverNote: "",
        audit: retainedAudit(shift),
      }
    : shift));
}
