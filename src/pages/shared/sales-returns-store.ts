import { withSalesWriteLock } from "./sales-write-lock";
import {
  canAtBranch,
  currentStaff,
  displayName,
} from "../../utils/auth";
import { sameCounter } from "../../utils/counters";
import { isPosProductAvailable } from "../../data/sales/products";
import {
  calculatePosUnitPrice,
  findPosProduct,
} from "./sales-pricing";
import { loadCashShifts } from "./cash-shifts-store";
import {
  CHECKOUT_PENDING_KEY,
  RETURN_PENDING_KEY,
  STORAGE_INVOICES,
  STORAGE_ORDERS,
  STORAGE_RETURNS,
  loadInvoices,
  loadOrders,
  loadReturns,
} from "./sales-orders-store";
import type {
  InvoiceRecord,
  ReturnRequest,
  SalesOrder,
  SalesOrderItem,
} from "./sales-orders-store";

export type ComplaintResolution = "Bù voucher" | "Hủy trước pha";
export function isComplaintResolution(value: string): value is ComplaintResolution {
  return value === "Bù voucher" || value === "Hủy trước pha";
}

export type ReturnScope = "single-item" | "full-order";
export type ReturnResolution = "refund" | "exchange";
export type ReturnRecordMode = "amend-original" | "new-order";

export interface ReturnSelectedLine {
  itemId: string;
  quantity: number;

  /** Không có SKU: làm lại đúng món và tùy chọn đã mua. */
  replacementSku?: string;
}

export interface ReturnSelection {
  scope: ReturnScope;
  resolutionType: ReturnResolution;
  recordMode: ReturnRecordMode;
  selectedLines: ReturnSelectedLine[];
}

export interface ReturnCostPreview {
  returnedOriginalValue: number;
  allocatedDiscountAmount: number;
  allocatedTaxAmount: number;

  /** Giá trị đã thanh toán của các ly được xử lý. */
  returnedPaidValue: number;

  /** Giá trị sau thuế của món thay thế. */
  replacementValue: number;

  autoRefundAmount: number;
  additionalPaymentAmount: number;

  /** Chưa có nguồn giá vốn, không giả lập bằng giá bán. */
  internalRemakeCost: number | null;

  previousOrderTotal: number;
  newOrderNetTotal: number;
}

export interface OrderReturnAmendment {
  id: string;
  returnCode: string;
  createdAt: string;
  actor: string;
  actorStaffId: string;
  scope: ReturnScope;
  resolutionType: ReturnResolution;
  recordMode: ReturnRecordMode;
  affectedLines: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    replacementName?: string;
    replacementUnitPrice?: number;
  }[];
  autoRefundCustomerAmount: number;
  additionalPaymentAmount: number;
  internalRemakeCost: number | null;
  previousOrderTotal: number;
  newOrderNetTotal: number;
  newCreatedOrderId?: string;
  note: string;
}

export interface ReturnCashMovement {
  id: string;
  returnCode: string;
  orderId: string;
  branchId: string;
  shiftId: string;
  counterId: string;
  createdAt: string;
  actorStaffId: string;
  refundAmount: number;
  additionalPaymentAmount: number;
}

export { RETURN_PENDING_KEY };
export const RETURN_CASH_KEY = "milktyway.returns.cash.v1";
export const RETURNS_CHANGED = "milktyway:returns-changed";

function money(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} không hợp lệ.`);
  }
  return value;
}

function add(a: number, b: number): number {
  return money(a + b, "Tổng tiền");
}

/** Phân bổ lũy kế, có kiểm tra giới hạn phép nhân trung gian. */
function portion(total: number, offset: number, weight: number): number {
  money(total, "Số tiền phân bổ");
  money(offset, "Trọng số");
  money(weight, "Tổng trọng số");

  if (offset > weight) throw new Error("Trọng số phân bổ không hợp lệ.");
  if (weight === 0) {
    if (total !== 0) throw new Error("Không thể phân bổ tiền trên tổng bằng 0.");
    return 0;
  }

  const product = total * offset;
  if (!Number.isSafeInteger(product)) {
    throw new Error("Giá trị vượt giới hạn phân bổ an toàn.");
  }

  return Math.round(product / weight);
}

function quantity(value: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error("Số lượng vượt số ly còn được xử lý.");
  }
}

function returned(item: SalesOrderItem): number {
  const value = item.returnedQty ?? 0;
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > item.quantity
  ) {
    throw new Error(`Số lượng đã xử lý của ${item.name} không hợp lệ.`);
  }
  return value;
}

export function remainingReturnQuantity(item: SalesOrderItem): number {
  quantity(item.quantity, 999);
  return item.quantity - returned(item);
}

/**
 * Chụp phân bổ giảm/VAT từ snapshot đơn đã thanh toán.
 * Không gọi bộ tính giá menu để tính lại hóa đơn lịch sử.
 */
function pricedItems(order: SalesOrder): SalesOrderItem[] {
  const items = structuredClone(order.items);
  const ids = new Set<string>();

  for (const item of items) {
    if (!item.id || ids.has(item.id)) {
      throw new Error("Đơn có ID dòng món thiếu hoặc trùng.");
    }
    ids.add(item.id);
    quantity(item.quantity, 999);
    money(item.unitPrice, "Đơn giá gốc");
    returned(item);
  }

  const snapshots = items.filter(item =>
    item.paidDiscountAmount !== undefined ||
    item.paidTaxAmount !== undefined,
  );

  if (snapshots.length) {
    if (snapshots.length !== items.length) {
      throw new Error("Snapshot giá của đơn không đầy đủ.");
    }
    for (const item of items) {
      money(item.paidDiscountAmount!, "Giảm giá dòng");
      money(item.paidTaxAmount!, "Thuế dòng");
      if (item.paidDiscountAmount! > item.unitPrice * item.quantity) {
        throw new Error("Giảm giá dòng vượt giá gốc.");
      }
    }
    const subtotal = items.reduce(
      (total, item) => add(
        total,
        money(item.unitPrice * item.quantity, "Tiền dòng"),
      ),
      0,
    );
    const discount = items.reduce(
      (total, item) => add(total, item.paidDiscountAmount!),
      0,
    );
    const tax = items.reduce(
      (total, item) => add(total, item.paidTaxAmount!),
      0,
    );

    /*
     * Sau đổi món, order.items có thể chứa cả dòng gốc đã xử lý
     * và dòng thay thế; không so tổng toàn bộ các dòng đó với bill gốc.
     */
    if (!(order.amendments?.length)) {
      if (
        subtotal !== order.subtotal ||
        discount !== order.discount ||
        tax !== order.tax ||
        subtotal - discount + tax !== order.total
      ) {
        throw new Error("Snapshot dòng không khớp giá đã thanh toán.");
      }
    }
    return items;
  }

  if (items.some(item => returned(item) !== 0)) {
    throw new Error("Đơn cũ đã xử lý nhưng thiếu snapshot phân bổ. Cần đối soát.");
  }

  const subtotal = items.reduce(
    (sum, item) => add(sum, money(item.unitPrice * item.quantity, "Tiền dòng")),
    0,
  );

  money(order.subtotal, "Tạm tính gốc");
  money(order.discount, "Giảm giá gốc");
  money(order.tax, "Thuế gốc");
  money(order.total, "Tổng tiền gốc");

  if (
    subtotal !== order.subtotal ||
    order.discount > subtotal ||
    subtotal - order.discount + order.tax !== order.total
  ) {
    throw new Error("Tổng dòng món không khớp giá đã thanh toán. Cần đối soát.");
  }

  let grossOffset = 0;
  let taxableOffset = 0;
  const taxableTotal = subtotal - order.discount;

  for (const item of items) {
    const gross = item.unitPrice * item.quantity;
    const discount =
      portion(order.discount, grossOffset + gross, subtotal) -
      portion(order.discount, grossOffset, subtotal);

    const taxable = gross - discount;
    const tax =
      portion(order.tax, taxableOffset + taxable, taxableTotal) -
      portion(order.tax, taxableOffset, taxableTotal);

    item.paidDiscountAmount = discount;
    item.paidTaxAmount = tax;
    grossOffset += gross;
    taxableOffset += taxable;
  }

  return items;
}

function slice(
  item: SalesOrderItem,
  start: number,
  count: number,
) {
  const gross = money(item.unitPrice * count, "Giá gốc ly được chọn");
  const discount =
    portion(item.paidDiscountAmount!, start + count, item.quantity) -
    portion(item.paidDiscountAmount!, start, item.quantity);
  const tax =
    portion(item.paidTaxAmount!, start + count, item.quantity) -
    portion(item.paidTaxAmount!, start, item.quantity);

  return {
    gross,
    discount,
    tax,
    paid: money(gross - discount + tax, "Giá đã thanh toán"),
  };
}

function assertOrder(order: SalesOrder): void {
  if (
    order.payment === "unpaid" ||
    order.payment === "refunded" ||
    order.replacedByOrderId
  ) {
    throw new Error("Đơn chưa thanh toán, đã hoàn hết hoặc đã được thay thế.");
  }

  if (!order.items.length) throw new Error("Đơn không có món để xử lý.");
}

function evaluate(order: SalesOrder, selection: ReturnSelection) {
  assertOrder(order);

  if (
    !["single-item", "full-order"].includes(selection.scope) ||
    !["refund", "exchange"].includes(selection.resolutionType) ||
    !["amend-original", "new-order"].includes(selection.recordMode)
  ) {
    throw new Error("Lựa chọn đổi trả không hợp lệ.");
  }

  const items = pricedItems(order);
  const lines = selection.selectedLines;

  if (
    !Array.isArray(lines) ||
    !lines.length ||
    new Set(lines.map(line => line.itemId)).size !== lines.length
  ) {
    throw new Error("Vui lòng chọn món; không chọn trùng dòng.");
  }

  if (selection.scope === "full-order") {
    const available = items.filter(item => remainingReturnQuantity(item) > 0);
    if (
      lines.length !== available.length ||
      available.some(item => !lines.some(line =>
        line.itemId === item.id &&
        line.quantity === remainingReturnQuantity(item),
      ))
    ) {
      throw new Error("Phạm vi toàn đơn phải gồm toàn bộ số ly còn được xử lý.");
    }
  }

  let returnedOriginalValue = 0;
  let allocatedDiscountAmount = 0;
  let allocatedTaxAmount = 0;
  let returnedPaidValue = 0;
  let replacementValue = 0;

  const replacements: SalesOrderItem[] = [];

  for (const line of lines) {
    const item = items.find(value => value.id === line.itemId);
    if (!item) throw new Error("Dòng món không còn tồn tại.");

    quantity(line.quantity, remainingReturnQuantity(item));
    const value = slice(item, returned(item), line.quantity);

    returnedOriginalValue = add(returnedOriginalValue, value.gross);
    allocatedDiscountAmount = add(allocatedDiscountAmount, value.discount);
    allocatedTaxAmount = add(allocatedTaxAmount, value.tax);
    returnedPaidValue = add(returnedPaidValue, value.paid);

    if (selection.resolutionType !== "exchange") continue;

    if (!line.replacementSku) {
      // Làm lại đúng món: giữ nguyên giá trị đã thanh toán.
      replacements.push({
        ...item,
        id: `replacement-${line.itemId}`,
        quantity: line.quantity,
        returnedQty: 0,
        returnAction: "none",
        replacementName: undefined,
        replacementUnitPrice: undefined,
        paidDiscountAmount: value.discount,
        paidTaxAmount: value.tax,
      });
      replacementValue = add(replacementValue, value.paid);
      continue;
    }

    const product = findPosProduct(line.replacementSku);
    if (!product || !isPosProductAvailable(product, order.branchId)) {
      throw new Error("Món thay thế đã hết hoặc bị khóa tại chi nhánh.");
    }

    const unitPrice = calculatePosUnitPrice({
      productId: product.sku,
      size: "M",
      toppings: [],
    });

    const gross = money(unitPrice * line.quantity, "Giá món thay thế");

    // Tỷ lệ VAT hiệu dụng theo phần giá trị đã trả của dòng gốc.
    const taxableOriginal = value.gross - value.discount;
    let tax = 0;
    if (taxableOriginal > 0) {
      const productAmount = gross * value.tax;
      if (!Number.isSafeInteger(productAmount)) {
        throw new Error("Giá trị thuế món thay thế vượt giới hạn an toàn.");
      }
      tax = money(Math.round(productAmount / taxableOriginal), "VAT món thay thế");
    }

    replacements.push({
      id: `replacement-${line.itemId}`,
      productId: product.sku,
      sku: product.sku,
      posProductId: product.id,
      name: product.name,
      size: "M",
      sugar: item.sugar,
      ice: item.ice,
      toppings: [],
      note: `Đổi từ ${item.name}`,
      quantity: line.quantity,
      unitPrice,
      returnedQty: 0,
      returnAction: "none",
      paidDiscountAmount: 0,
      paidTaxAmount: tax,
    });

    replacementValue = add(replacementValue, add(gross, tax));
  }

  const previousOrderTotal = money(order.netTotal ?? order.total, "Thực thu hiện tại");
  const autoRefundAmount = Math.max(0, returnedPaidValue - replacementValue);
  const additionalPaymentAmount = Math.max(0, replacementValue - returnedPaidValue);
  const newOrderNetTotal = money(
    previousOrderTotal - autoRefundAmount + additionalPaymentAmount,
    "Thực thu sau điều chỉnh",
  );

  const preview: ReturnCostPreview = {
    returnedOriginalValue,
    allocatedDiscountAmount,
    allocatedTaxAmount,
    returnedPaidValue,
    replacementValue,
    autoRefundAmount,
    additionalPaymentAmount,
    internalRemakeCost: selection.resolutionType === "exchange" ? null : 0,
    previousOrderTotal,
    newOrderNetTotal,
  };

  return { items, replacements, preview };
}

export function getReturnCostPreview(
  order: SalesOrder,
  selection: ReturnSelection,
): ReturnCostPreview {
  return evaluate(order, selection).preview;
}

export function loadReturnCashMovements(): ReturnCashMovement[] {
  const raw = localStorage.getItem(RETURN_CASH_KEY);
  const parsed: unknown = raw === null ? [] : JSON.parse(raw);

  if (!Array.isArray(parsed)) throw new Error("Sổ tiền đổi trả không hợp lệ.");

  const ids = new Set<string>();
  for (const entry of parsed as ReturnCashMovement[]) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      ids.has(entry.id) ||
      typeof entry.returnCode !== "string" ||
      typeof entry.orderId !== "string" ||
      typeof entry.branchId !== "string" ||
      typeof entry.shiftId !== "string" ||
      typeof entry.counterId !== "string" ||
      typeof entry.actorStaffId !== "string" ||
      !Number.isFinite(Date.parse(entry.createdAt))
    ) {
      throw new Error("Phát sinh tiền đổi trả thiếu thông tin hoặc bị trùng.");
    }
    money(entry.refundAmount, "Tiền hoàn");
    money(entry.additionalPaymentAmount, "Tiền thu thêm");
    ids.add(entry.id);
  }

  return parsed as ReturnCashMovement[];
}

function assertWritable(): void {
  if (
    localStorage.getItem(RETURN_PENDING_KEY) !== null ||
    localStorage.getItem(CHECKOUT_PENDING_KEY) !== null
  ) {
    throw new Error("Có giao dịch chưa đối soát xong. Không ghi thêm dữ liệu.");
  }
}

/**
 * Journal + rollback trong cùng lần ghi.
 * Nếu rollback thất bại, giữ journal để khóa các lần ghi tiếp theo.
 */
function commit(entries: [string, unknown][]): void {
  assertWritable();

  const before = entries.map(([key]) => ({
    key,
    value: localStorage.getItem(key),
  }));

  localStorage.setItem(RETURN_PENDING_KEY, JSON.stringify({
    createdAt: new Date().toISOString(),
    before,
  }));

  try {
    for (const [key, value] of entries) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    localStorage.removeItem(RETURN_PENDING_KEY);
  } catch {
    let restored = true;

    for (const item of before) {
      try {
        if (item.value === null) localStorage.removeItem(item.key);
        else localStorage.setItem(item.key, item.value);
      } catch {
        restored = false;
      }
    }

    if (restored) {
      try {
        localStorage.removeItem(RETURN_PENDING_KEY);
      } catch {
        restored = false;
      }
    }

    throw new Error(
      restored
        ? "Không lưu được đổi trả. Dữ liệu cũ đã được khôi phục."
        : "Đổi trả có ghi một phần. Cần đối soát journal trước khi tiếp tục.",
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RETURNS_CHANGED));
  }
}

/**
 * Dùng chung khóa ghi với checkout POS A5.
 * Web Locks không thay thế transaction/backend hoặc đồng bộ nhiều thiết bị.
 */
function exclusive<T>(operation: () => T): Promise<T> {
  return withSalesWriteLock(operation);
}

function actor(staffId: string) {
  const staff = currentStaff();
  if (!staff || staff.staffId !== staffId) {
    throw new Error("Phiên đăng nhập đã thay đổi. Vui lòng tải lại.");
  }
  return staff;
}

export function createReturnRequest(params: {
  actorStaffId: string;
  orderId: string;
  reason: string;
} & (
  | { selection: ReturnSelection; expectedPreview?: ReturnCostPreview; complaint?: never }
  | { complaint: ComplaintResolution; selection?: never; expectedPreview?: never }
)): Promise<ReturnRequest> {
  return exclusive(() => {
    assertWritable();
    const staff = actor(params.actorStaffId);
    const order = loadOrders().find(item => item.id === params.orderId);

    if (
      !order ||
      staff.loginRole !== "cashier" ||
      !canAtBranch("order.create", order.branchId)
    ) {
      throw new Error("Chỉ thu ngân được tạo phiếu tại chi nhánh được giao.");
    }

    const reason = params.reason.trim();
    if (!reason) throw new Error("Vui lòng nhập lý do.");

    const selection = params.selection;
    if (!selection && !isComplaintResolution(params.complaint ?? "")) {
      throw new Error("Hướng xử lý khiếu nại không hợp lệ.");
    }
    const preview = selection ? getReturnCostPreview(order, selection) : undefined;
    if (params.expectedPreview && JSON.stringify(params.expectedPreview) !== JSON.stringify(preview)) {
      throw new Error("Đơn đã thay đổi. Vui lòng kiểm tra lại số tiền trước khi gửi.");
    }
    const requests = loadReturns();
    const next = requests.reduce((max, request) => {
      const match = request.id.match(/^(?:HT|RT)-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

    const request: ReturnRequest = {
      id: `RT-${String(next).padStart(4, "0")}`,
      orderId: order.id,
      branchId: order.branchId,
      createdByStaffId: staff.staffId,
      customer: order.customer,
      createdAt: new Date().toISOString(),
      resolution: params.complaint ?? (selection?.resolutionType === "refund" ? "Hoàn tiền" : "Đổi món"),
      reason,
      amount: preview?.autoRefundAmount ?? 0,
      points: 0,
      memberId: null,
      status: "Pending",
      details: selection && structuredClone(selection),
      preview,
    };

    commit([[STORAGE_RETURNS, [request, ...requests]]]);
    return request;
  });
}

function activeItems(items: SalesOrderItem[]): SalesOrderItem[] {
  return items.flatMap(item => {
    const count = remainingReturnQuantity(item);
    if (!count) return [];

    const value = slice(item, returned(item), count);
    return [{
      ...item,
      quantity: count,
      returnedQty: 0,
      returnAction: "none" as const,
      replacementName: undefined,
      replacementUnitPrice: undefined,
      paidDiscountAmount: value.discount,
      paidTaxAmount: value.tax,
    }];
  });
}

function syncInvoice(invoice: InvoiceRecord, order: SalesOrder): InvoiceRecord {
  return {
    ...invoice,
    items: invoice.items.map(item => ({
      ...item,
      returnedQty: order.items.find(line => line.id === item.id)?.returnedQty,
    })),
    amendments: structuredClone(order.amendments ?? []),
    refundedAmount: order.refundedAmount ?? 0,
    netTotal: order.netTotal ?? order.total,
    parentOrderId: order.parentOrderId,
    replacedByOrderId: order.replacedByOrderId,
    status: order.payment === "refunded"
      ? "Đã Hoàn Tiền"
      : order.payment === "partially-refunded"
        ? "Hoàn Một Phần / Đã Điều Chỉnh"
        : "Đã Thanh Toán",
    statusVariant: order.payment === "refunded"
      ? "danger"
      : order.payment === "partially-refunded" ? "warning" : "success",
  };
}

/** Biến đổi dữ liệu thuần; chỉ reviewReturnRequest() được ghi xuống storage. */
export function applyReturnToOriginalOrder(
  order: SalesOrder,
  amendment: OrderReturnAmendment,
  updatedItems: SalesOrderItem[],
): SalesOrder {
  const active = updatedItems.filter(item => remainingReturnQuantity(item) > 0);
  const hasActiveItems = active.length > 0;
  const alreadyPrepared = hasActiveItems && active.every(item => item.preparedBeforeExchange);
  const allDelivered = alreadyPrepared && active.every(item => item.preparedBeforeExchange === "delivered");
  let preparation = hasActiveItems ? order.preparation : null;
  let delivery = hasActiveItems ? order.delivery : null;
  if (alreadyPrepared) {
    preparation = "ready";
    delivery = allDelivered ? "delivered" : "pickup";
  } else if (amendment.resolutionType === "exchange") {
    preparation = order.preparation === "preparing" ? "preparing" : "waiting";
    delivery = order.channel === "online" ? "waiting" : "pickup";
  }

  return {
    ...order,
    items: updatedItems,
    amendments: [...(order.amendments ?? []), amendment],
    refundedAmount: add(
      order.refundedAmount ?? 0,
      amendment.autoRefundCustomerAmount,
    ),
    netTotal: amendment.newOrderNetTotal,
    payment: hasActiveItems ? "partially-refunded" : "refunded",
    preparation,
    delivery,
  };
}

export function createNewOrderFromReturn(
  original: SalesOrder,
  newOrderId: string,
): SalesOrder {
  const items = activeItems(original.items);
  const subtotal = items.reduce((sum, item) => add(sum, item.unitPrice * item.quantity), 0);
  const discount = items.reduce((sum, item) => add(sum, item.paidDiscountAmount!), 0);
  const tax = items.reduce((sum, item) => add(sum, item.paidTaxAmount!), 0);
  const total = money(subtotal - discount + tax, "Giá trị đơn thay thế");

  return {
    ...original,
    id: newOrderId,
    parentOrderId: original.id,
    replacedByOrderId: undefined,
    checkoutId: undefined,
    checkoutFingerprint: undefined,
    // Đơn chuyển tiếp không ghi nhận tiêu thụ chiến dịch lần nữa.
    appliedPromotions: undefined,


    // Giá trị chuyển tiếp, KHÔNG ghi nhận là bán/thu tiền mới trong ca.
    shiftId: undefined,
    counterId: undefined,

    createdAt: new Date().toISOString(),
    items,
    subtotal,
    discount,
    tax,
    total,
    netTotal: total,
    refundedAmount: 0,
    amendments: [],
    payment: total > 0 || items.length ? "paid" : "refunded",
    preparation: items.length ? original.preparation : null,
    delivery: items.length ? original.delivery : null,
    orderNote: `Đơn thay thế từ ${original.id}. Không thu lại giá trị đã chuyển tiếp.`,
  };
}

export function reviewReturnRequest(params: {
  actorStaffId: string;
  requestId: string;
  decision: "Approved" | "Rejected";
  note: string;
  cashShiftId?: string;
  confirmAdditionalPayment?: boolean;
}): Promise<ReturnRequest> {
  return exclusive(() => {
    assertWritable();
    const staff = actor(params.actorStaffId);
    const requests = loadReturns();
    const orders = loadOrders();
    const invoices = loadInvoices();
    const request = requests.find(item => item.id === params.requestId);
    const order = orders.find(item => item.id === request?.orderId);

    if (
      !request ||
      !order ||
      staff.loginRole !== "manager" ||
      !canAtBranch("payment.refundReview", order.branchId)
    ) {
      throw new Error("Không có quyền duyệt phiếu tại chi nhánh này.");
    }
    if (request.branchId && request.branchId !== order.branchId) {
      throw new Error("Chi nhánh phiếu không khớp đơn gốc.");
    }
    if (request.status !== "Pending") {
      throw new Error("Phiếu đã được xử lý. Không thể duyệt lại.");
    }
    if (params.decision !== "Approved" && params.decision !== "Rejected") {
      throw new Error("Quyết định không hợp lệ.");
    }
    if (params.decision === "Rejected" && !params.note.trim()) {
      throw new Error("Cần nhập lý do từ chối.");
    }

    const reviewed: ReturnRequest = {
      ...request,
      status: params.decision,
      reviewedByStaffId: staff.staffId,
      reviewer: displayName(staff),
      reviewedAt: new Date().toISOString(),
      reviewNote: params.note.trim(),
    };

    if (params.decision === "Rejected" || isComplaintResolution(request.resolution)) {
      commit([[STORAGE_RETURNS, requests.map(item => item.id === request.id ? reviewed : item)]]);
      return reviewed;
    }

    if (!request.details || !request.preview) {
      throw new Error(
        "Phiếu cũ thiếu dòng/số lượng. Hãy từ chối và lập phiếu mới; không duyệt theo số tiền nhập tay.",
      );
    }

    const result = evaluate(order, request.details);

    // Recheck giá, lượng còn lại và tài chính tại thời điểm duyệt.
    if (JSON.stringify(result.preview) !== JSON.stringify(request.preview)) {
      throw new Error(
        "Giá hoặc trạng thái tài chính đã thay đổi. Hãy lập lại phiếu với preview mới.",
      );
    }

    const preview = result.preview;
    if (preview.additionalPaymentAmount > 0 && !params.confirmAdditionalPayment) {
      throw new Error("Cần xác nhận đã thu khoản khách bù thêm.");
    }

    const movements = loadReturnCashMovements();
    const changesMoney = preview.autoRefundAmount > 0 || preview.additionalPaymentAmount > 0;

    if (order.paymentMethod === "cash" && changesMoney) {
      const shifts = loadCashShifts();
      const target = shifts.find(shift => shift.id === params.cashShiftId);

      if (
        !target ||
        target.branchId !== order.branchId ||
        target.status !== "open" ||
        shifts.filter(shift =>
          shift.branchId === target.branchId &&
          sameCounter(shift.counterId, target.counterId) &&
          shift.status !== "closed",
        ).length !== 1
      ) {
        throw new Error("Chọn đúng ca tiền mặt đang mở tại chi nhánh xử lý.");
      }

      let balance = target.openingCash;
      for (const sale of orders) {
        if (sale.shiftId !== target.id) continue;
        if (
          sale.branchId !== target.branchId ||
          !sameCounter(sale.counterId, target.counterId)
        ) {
          throw new Error("Có đơn liên kết ca sai chi nhánh/quầy.");
        }

        if (
          !sale.parentOrderId &&
          sale.paymentMethod === "cash" &&
          (
            sale.payment === "paid" ||
            sale.payment === "partially-refunded" ||
            Boolean(sale.amendments?.length)
          )
        ) balance += sale.total;
      }

      for (const movement of movements.filter(item => item.shiftId === target.id)) {
        if (
          movement.branchId !== target.branchId ||
          !sameCounter(movement.counterId, target.counterId)
        ) throw new Error("Sổ tiền đổi trả sai chi nhánh/quầy.");

        balance += movement.additionalPaymentAmount - movement.refundAmount;
      }

      money(
        balance + preview.additionalPaymentAmount - preview.autoRefundAmount,
        "Số dư tiền mặt sau hoàn; quỹ ca có thể không đủ",
      );

      movements.push({
        id: request.id,
        returnCode: request.id,
        orderId: order.id,
        branchId: order.branchId,
        shiftId: target.id,
        counterId: target.counterId,
        createdAt: reviewed.reviewedAt!,
        actorStaffId: staff.staffId,
        refundAmount: preview.autoRefundAmount,
        additionalPaymentAmount: preview.additionalPaymentAmount,
      });
    }

    const sourceInvoice = invoices.find(invoice => invoice.orderId === order.id);
    if (!sourceInvoice ||
        invoices.filter(invoice => invoice.orderId === order.id).length !== 1 ||
        !sourceInvoice.branch.startsWith(order.branchId) ||
        sourceInvoice.total !== order.total || sourceInvoice.subtotal !== order.subtotal ||
        sourceInvoice.discount !== order.discount || sourceInvoice.tax !== order.tax) {
      throw new Error("Hóa đơn gốc bị thiếu hoặc không khớp đơn hàng. Cần đối soát trước khi duyệt.");
    }

    const updatedItems = result.items;
    if (request.details.resolutionType === "exchange") {
      for (const item of updatedItems) {
        if (order.delivery === "delivered") item.preparedBeforeExchange = "delivered";
        else if (order.preparation === "ready") item.preparedBeforeExchange ??= "ready";
      }
    }
    for (const line of request.details.selectedLines) {
      const item = updatedItems.find(value => value.id === line.itemId)!;
      const replacement = result.replacements.find(value =>
        value.id === `replacement-${line.itemId}`,
      );

      item.returnedQty = returned(item) + line.quantity;
      item.returnAction = request.details.resolutionType === "refund" ? "refunded" : "exchanged";
      item.replacementName = replacement?.name;
      item.replacementUnitPrice = replacement?.unitPrice;
    }

    for (const [index, replacement] of result.replacements.entries()) {
      updatedItems.push({
        ...replacement,
        preparedBeforeExchange: undefined,
        id: `${request.id}-replacement-${index + 1}`,
      });
    }

    const amendment: OrderReturnAmendment = {
      id: request.id,
      returnCode: request.id,
      createdAt: reviewed.reviewedAt!,
      actor: displayName(staff),
      actorStaffId: staff.staffId,
      scope: request.details.scope,
      resolutionType: request.details.resolutionType,
      recordMode: request.details.recordMode,
      affectedLines: request.details.selectedLines.map(line => {
        const item = result.items.find(value => value.id === line.itemId)!;
        const replacement = result.replacements.find(value =>
          value.id === `replacement-${line.itemId}`,
        );
        return {
          itemId: item.id,
          itemName: item.name,
          quantity: line.quantity,
          unitPrice: item.unitPrice,
          replacementName: replacement?.name,
          replacementUnitPrice: replacement?.unitPrice,
        };
      }),
      autoRefundCustomerAmount: preview.autoRefundAmount,
      additionalPaymentAmount: preview.additionalPaymentAmount,
      internalRemakeCost: preview.internalRemakeCost,
      previousOrderTotal: preview.previousOrderTotal,
      newOrderNetTotal: preview.newOrderNetTotal,
      note: params.note.trim() || request.reason,
    };

    let updatedOriginal = applyReturnToOriginalOrder(order, amendment, updatedItems);
    let nextOrders = orders.map(item => item.id === order.id ? updatedOriginal : item);
    let nextInvoices = invoices;

    if (request.details.recordMode === "new-order") {
      let index = 1;
      while (orders.some(item => item.id === `${order.id}-R${index}`)) index++;
      const newId = `${order.id}-R${index}`;

      const newOrder = createNewOrderFromReturn(updatedOriginal, newId);
      if (newOrder.total !== preview.newOrderNetTotal) {
        throw new Error("Giá trị chuyển tiếp không khớp thực thu sau điều chỉnh.");
      }

      amendment.newCreatedOrderId = newId;
      reviewed.newCreatedOrderId = newId;

      updatedOriginal = {
        ...updatedOriginal,
        payment: "refunded",
        replacedByOrderId: newId,

        // Toàn bộ giá trị còn lại đã chuyển sang đơn con.
        netTotal: 0,
        preparation: null,
        delivery: null,
      };

      nextOrders = [
        newOrder,
        ...orders.map(item => item.id === order.id ? updatedOriginal : item),
      ];

      const newInvoiceId = `${sourceInvoice.id}-R${index}`;
      if (invoices.some(invoice => invoice.id === newInvoiceId)) {
        throw new Error("Mã hóa đơn thay thế bị trùng. Cần kiểm tra dữ liệu.");
      }

      const newInvoice = syncInvoice({
        ...sourceInvoice,
        id: newInvoiceId,
        orderId: newId,
        appliedPromotions: undefined,

        items: newOrder.items,
        date: new Date().toLocaleString("vi-VN"),
        subtotal: newOrder.subtotal,
        discount: newOrder.discount,
        tax: newOrder.tax,
        total: newOrder.total,
        paid: newOrder.total,
        change: 0,
      }, newOrder);

      nextInvoices = [newInvoice, ...invoices];
    }

    nextInvoices = nextInvoices.map(invoice =>
      invoice.orderId === order.id
        ? syncInvoice(invoice, updatedOriginal)
        : invoice,
    );

    commit([
      [STORAGE_ORDERS, nextOrders],
      [STORAGE_INVOICES, nextInvoices],
      [STORAGE_RETURNS, requests.map(item => item.id === request.id ? reviewed : item)],
      [RETURN_CASH_KEY, movements],
    ]);

    return reviewed;
  });
}
