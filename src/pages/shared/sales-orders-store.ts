import {
  quotePromotionCheckout,
  planPromotionRedemptions,
  notifyPromotionsChanged,
  type AppliedPromotion,
} from "./promotions-store";
import { withSalesWriteLock } from "./sales-write-lock";
import type {
  OrderReturnAmendment,
  ReturnSelection,
  ReturnCostPreview,
} from "./sales-returns-store";
import { isPosProductAvailable } from "../../data/sales/products";
/**
 * Bộ lưu trữ dữ liệu tập trung cho phân hệ Bán Hàng & POS & Pha Chế KDS
 * Kết nối luồng: POS -> Đơn hàng -> Hàng đợi pha chế -> Hóa đơn -> Trừ tồn quầy
 */

import type { BadgeVariant } from "../../components/common/Badge";
import { validatePosItems, calculatePosChange, findPosProduct, type PosLine } from "./sales-pricing";
import { currentStaff, canAtBranch } from "../../utils/auth";
import { sameCounter } from "../../utils/counters";
import { loadCashShifts } from "./cash-shifts-store";
import { INITIAL_STORES } from "./business-demo";

export type SalesChannel = "counter" | "takeaway" | "online";
export type SalesShift = "morning" | "afternoon" | "evening";
export type PaymentStatus = "unpaid" | "paid" | "partially-refunded" | "refunded";
export type PreparationStatus = "waiting" | "preparing" | "ready";
export type DeliveryStatus = "pickup" | "waiting" | "delivering" | "delivered";

export interface SalesOrderItem {
  /** SKU POS; not the inventory product ID. */
  productId?: string;
  sku?: string;
  /** Stable numeric ID of the POS catalogue, not the inventory ID. */
  posProductId?: number;
  id: string;
  name: string;
  size: "M" | "L";
  sugar: string;
  ice: string;
  toppings: readonly string[];
  note: string;
  quantity: number;
  unitPrice: number;
  preparedBeforeExchange?: "ready" | "delivered";
  returnedQty?: number;
  returnAction?: "none" | "refunded" | "exchanged";
  replacementName?: string;
  replacementUnitPrice?: number;

  /**
   * Snapshot tiền được phân bổ cho TOÀN BỘ dòng này.
   * Không phải giá một ly.
   * Được tạo từ hóa đơn gốc khi xử lý A4 lần đầu.
   */
  paidDiscountAmount?: number;
  paidTaxAmount?: number;
}

export interface SalesOrder {
  orderNote?: string;
  checkoutId?: string;
  checkoutFingerprint?: string;
  shiftId?: string;
  counterId?: string;
  createdByStaffId?: string;
  onlineDecision?: "accepted" | "rejected";
  id: string;
  branchId: string;
  shift: SalesShift;
  customer: string;
  phone: string;
  channel: SalesChannel;
  createdAt: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: "cash" | "transfer" | "card";
  payment: PaymentStatus;
  preparation: PreparationStatus | null;
  delivery: DeliveryStatus | null;
  largeOrder: boolean;
  items: SalesOrderItem[];
  appliedPromotions?: AppliedPromotion[];
  amendments?: OrderReturnAmendment[];
  refundedAmount?: number;
  netTotal?: number;
  parentOrderId?: string;
  replacedByOrderId?: string;
}

export interface PreparationOrder {
  id: string;
  branchId: string;
  channel: PreparationChannel;
  receivedAt: string;
  waitingMinutes: number;
  itemSummary: string;
  optionSummary: string | null;
  note: string;
  status: PreparationStatus;
}
export type PreparationChannel = "counter" | "takeaway" | "online";

export interface InvoiceRecord {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  tier: "Member" | "Silver" | "Gold" | "VIP";
  initials: string;
  avatarBg: string;
  branch: string;
  branchAddress: string;
  type: "Bán Lẻ" | "Đơn Sỉ B2B" | "Giao Hàng" | "Hoàn Tiền";
  typeVariant: BadgeVariant;
  date: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  status: "Đã Thanh Toán" | "Thanh Toán 50%" | "Chờ Thanh Toán" | "Hoàn Một Phần / Đã Điều Chỉnh" | "Đã Hoàn Tiền";
  statusVariant: BadgeVariant;
  items: SalesOrderItem[];
  appliedPromotions?: AppliedPromotion[];
  amendments?: OrderReturnAmendment[];
  refundedAmount?: number;
  netTotal?: number;
  parentOrderId?: string;
  replacedByOrderId?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customer: string;
  createdAt: string;
  resolution: string;
  reason: string;
  amount: number;
  points: number;
  memberId: string | null;
  status: "Pending" | "Approved" | "Rejected";
  branchId?: string;
  createdByStaffId?: string;
  details?: ReturnSelection;
  preview?: ReturnCostPreview;
  reviewedByStaffId?: string;
  reviewer?: string;
  reviewedAt?: string;
  reviewNote?: string;
  newCreatedOrderId?: string;
}

export const STORAGE_ORDERS = "miltyway_sales_orders_v2";
export const RETURN_PENDING_KEY = "milktyway.returns.pending.v1";
export const STORAGE_RETURNS = "miltyway_sales_returns_v2";
export const STORAGE_INVOICES = "miltyway_invoices_v2";

export const INITIAL_ORDERS: SalesOrder[] = [
  {
    id: "DH-00125",
    branchId: "CN01",
    shift: "morning",
    customer: "Nguyễn An",
    phone: "0903 123 456",
    channel: "online",
    createdAt: "2026-10-28T09:15:00+07:00",
    subtotal: 450000,
    discount: 0,
    tax: 0,
    total: 450000,
    paymentMethod: "transfer",
    payment: "paid",
    preparation: "preparing",
    delivery: "waiting",
    largeOrder: true,
    items: [
      {
        id: "item-1",
        name: "Trà sữa trân châu hoàng kim",
        size: "L",
        sugar: "50%",
        ice: "Ít đá",
        toppings: ["Pudding trứng", "Trân châu hoàng kim"],
        note: "Để topping riêng",
        quantity: 5,
        unitPrice: 50000,
      },
      {
        id: "item-2",
        name: "Trà oolong nướng kem phô mai",
        size: "M",
        sugar: "70%",
        ice: "Vừa đá",
        toppings: ["Kem phô mai macchiato"],
        note: "Ít ngọt",
        quantity: 4,
        unitPrice: 50000,
      }
    ],
  },
  {
    id: "DH-00124",
    branchId: "CN01",
    shift: "morning",
    customer: "Trần Bình",
    phone: "0912 345 678",
    channel: "takeaway",
    createdAt: "2026-10-28T09:12:00+07:00",
    subtotal: 35000,
    discount: 0,
    tax: 0,
    total: 35000,
    paymentMethod: "cash",
    payment: "paid",
    preparation: "ready",
    delivery: "pickup",
    largeOrder: false,
    items: [
      {
        id: "item-3",
        name: "Trà đào cam sả tươi",
        size: "M",
        sugar: "30%",
        ice: "Bình thường",
        toppings: [],
        note: "Mang đi ngay",
        quantity: 1,
        unitPrice: 35000,
      }
    ],
  },
  {
    id: "DH-00123",
    branchId: "CN02",
    shift: "morning",
    customer: "Lê Minh Tuấn",
    phone: "0988 777 666",
    channel: "counter",
    createdAt: "2026-10-28T09:05:00+07:00",
    subtotal: 78000,
    discount: 0,
    tax: 0,
    total: 78000,
    paymentMethod: "cash",
    payment: "paid",
    preparation: "ready",
    delivery: "pickup",
    largeOrder: false,
    items: [
      {
        id: "item-4",
        name: "Sữa tươi trân châu đường đen",
        size: "M",
        sugar: "100%",
        ice: "Vừa đá",
        toppings: ["Trân châu hoàng kim"],
        note: "",
        quantity: 2,
        unitPrice: 39000,
      }
    ],
  },
  {
    id: "DH-00122",
    branchId: "CN05",
    shift: "morning",
    customer: "Trần Văn An",
    phone: "0908 123 456",
    channel: "counter",
    createdAt: "2026-10-28T08:45:00+07:00",
    subtotal: 89000,
    discount: 0,
    tax: 0,
    total: 89000,
    paymentMethod: "cash",
    payment: "paid",
    preparation: "ready",
    delivery: "pickup",
    largeOrder: false,
    items: [
      {
        id: "item-5",
        name: "Trà sữa trân châu hoàng kim",
        size: "L",
        sugar: "50%",
        ice: "Vừa đá",
        toppings: ["Trân châu hoàng kim"],
        note: "",
        quantity: 1,
        unitPrice: 44000,
      },
      {
        id: "item-6",
        name: "Trà sữa ô long",
        size: "L",
        sugar: "70%",
        ice: "Ít đá",
        toppings: [],
        note: "",
        quantity: 1,
        unitPrice: 45000,
      }
    ],
  }
];

export const INITIAL_INVOICES: InvoiceRecord[] = [
  {
    id: "HD-CN05-001247",
    orderId: "DH-00122",
    customerName: "Trần Văn An",
    customerPhone: "0908 123 456",
    tier: "Gold",
    initials: "TA",
    avatarBg: "var(--primary)",
    branch: "CN05 - Hàng Xanh (Bình Thạnh)",
    branchAddress: "20 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM",
    type: "Bán Lẻ",
    typeVariant: "info",
    date: "28/10/2026 14:32",
    subtotal: 89000,
    discount: 0,
    tax: 0,
    total: 89000,
    paid: 100000,
    change: 11000,
    paymentMethod: "Tiền mặt",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: [
      {
        id: "item-5",
        name: "Trà sữa trân châu hoàng kim",
        size: "L",
        sugar: "50%",
        ice: "Vừa đá",
        toppings: ["Trân châu hoàng kim"],
        note: "",
        quantity: 1,
        unitPrice: 44000,
      },
      {
        id: "item-6",
        name: "Trà sữa ô long",
        size: "L",
        sugar: "70%",
        ice: "Ít đá",
        toppings: [],
        note: "",
        quantity: 1,
        unitPrice: 45000,
      }
    ]
  },
  {
    id: "HD-CN01-003814",
    orderId: "DH-00125",
    customerName: "Nguyễn An",
    customerPhone: "0903 123 456",
    tier: "VIP",
    initials: "NA",
    avatarBg: "var(--info)",
    branch: "CN01 - Bến Nghé (Quận 1)",
    branchAddress: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    type: "Giao Hàng",
    typeVariant: "purple",
    date: "28/10/2026 09:15",
    subtotal: 450000,
    discount: 0,
    tax: 0,
    total: 450000,
    paid: 450000,
    change: 0,
    paymentMethod: "Chuyển khoản QR",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: INITIAL_ORDERS[0].items
  },
  {
    id: "HD-CN01-001248",
    orderId: "DH-00124",
    customerName: "Trần Bình",
    customerPhone: "0912 345 678",
    tier: "Silver",
    initials: "TB",
    avatarBg: "var(--info)",
    branch: "CN01 - Bến Nghé (Quận 1)",
    branchAddress: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    type: "Bán Lẻ",
    typeVariant: "info",
    date: "28/10/2026 09:12",
    subtotal: 35000,
    discount: 0,
    tax: 0,
    total: 35000,
    paid: 35000,
    change: 0,
    paymentMethod: "Tiền mặt",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: INITIAL_ORDERS[1].items
  },
  {
    id: "HD-CN02-001249",
    orderId: "DH-00123",
    customerName: "Lê Minh Tuấn",
    customerPhone: "0988 777 666",
    tier: "Member",
    initials: "LT",
    avatarBg: "var(--primary)",
    branch: "CN02 - Bàn Cờ (Quận 3)",
    branchAddress: "45 Nguyễn Đình Chiểu, Quận 3, TP.HCM",
    type: "Bán Lẻ",
    typeVariant: "info",
    date: "28/10/2026 09:05",
    subtotal: 78000,
    discount: 0,
    tax: 0,
    total: 78000,
    paid: 78000,
    change: 0,
    paymentMethod: "Tiền mặt",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: INITIAL_ORDERS[2].items
  },
  {
    id: "SI-CN08-000042",
    orderId: "DH-00120",
    customerName: "Cty TNHH Tech Valley",
    customerPhone: "0987 654 321",
    tier: "VIP",
    initials: "CT",
    avatarBg: "var(--warning)",
    branch: "CN08 - Cityland (Gò Vấp)",
    branchAddress: "Khu Cityland, Gò Vấp, TP.HCM",
    type: "Đơn Sỉ B2B",
    typeVariant: "warning",
    date: "27/10/2026 09:00",
    subtotal: 12600000,
    discount: 0,
    tax: 0,
    total: 12600000,
    paid: 6300000,
    change: 0,
    paymentMethod: "Chuyển khoản QR",
    status: "Thanh Toán 50%",
    statusVariant: "warning",
    items: [
      {
        id: "item-b2b-1",
        name: "Combo Trà sữa sự kiện doanh nghiệp (Size L)",
        size: "L",
        sugar: "70%",
        ice: "Vừa đá",
        toppings: ["Trân châu hoàng kim"],
        note: "Giao tận nơi",
        quantity: 280,
        unitPrice: 45000,
      }
    ]
  },
  {
    id: "RT-CN03-000089",
    orderId: "DH-00119",
    customerName: "Phạm Quốc Hùng",
    customerPhone: "0971 234 567",
    tier: "Member",
    initials: "PH",
    avatarBg: "var(--danger)",
    branch: "CN03 - Chợ Lớn (Quận 5)",
    branchAddress: "18 Trần Hưng Đạo, Quận 5, TP.HCM",
    type: "Hoàn Tiền",
    typeVariant: "danger",
    date: "26/10/2026 16:45",
    subtotal: 45000,
    discount: 0,
    tax: 0,
    total: 45000,
    paid: 45000,
    change: 0,
    paymentMethod: "Tiền mặt",
    status: "Đã Hoàn Tiền",
    statusVariant: "danger",
    items: [
      {
        id: "item-rt-1",
        name: "Trà sữa ô long",
        size: "L",
        sugar: "50%",
        ice: "Ít đá",
        toppings: [],
        note: "Hoàn tiền cho khách",
        quantity: 1,
        unitPrice: 45000,
      }
    ]
  }
];

export const INITIAL_RETURNS: ReturnRequest[] = [
  {
    id: "HT-0001",
    orderId: "DH-00125",
    customer: "Nguyễn An",
    createdAt: "2026-10-28T09:30:00+07:00",
    resolution: "Hoàn tiền",
    reason: "Sai mức đường",
    amount: 45000,
    points: -45,
    memberId: "HV-0001",
    status: "Pending",
  },
  {
    id: "HT-0002",
    orderId: "DH-00124",
    customer: "Trần Bình",
    createdAt: "2026-10-28T09:40:00+07:00",
    resolution: "Đổi món",
    reason: "Nhầm món",
    amount: 0,
    points: 0,
    memberId: null,
    status: "Pending",
  },
  {
    id: "HT-0003",
    orderId: "DH-00122",
    customer: "Trần Văn An",
    createdAt: "2026-10-28T15:10:00+07:00",
    resolution: "Hoàn tiền",
    reason: "Pha nhầm mức đá tại CN05",
    amount: 44000,
    points: -4,
    memberId: "HV-0002",
    status: "Pending",
  },
];

function readRecords<T extends { id: string }>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return structuredClone(seed);
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(row => !row || typeof row.id !== "string") || new Set(value.map(row => row.id)).size !== value.length) {
    throw new Error(`Dữ liệu ${key} không hợp lệ. Không ghi đè dữ liệu đã lưu.`);
  }
  return value as T[];
}
export function loadOrders(): SalesOrder[] { return readRecords(STORAGE_ORDERS, INITIAL_ORDERS); }
export function saveOrders(orders: SalesOrder[]): void { localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders)); }
export function loadInvoices(): InvoiceRecord[] { return readRecords(STORAGE_INVOICES, INITIAL_INVOICES); }
export function saveInvoices(invoices: InvoiceRecord[]): void { localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices)); }

export interface PosCheckoutContext { staffId: string; branchId: string; counterId: string; shiftId: string; }
export function assertPosContext(context: PosCheckoutContext, checkShift = true): void {
  if (localStorage.getItem(RETURN_PENDING_KEY) !== null) {
    throw new Error(
      "Có giao dịch đổi trả chưa đối soát xong. Không thanh toán mới trước khi kiểm tra dữ liệu.",
    );
  }

  const staff = currentStaff();
  if (!staff || staff.staffId !== context.staffId || staff.branchId !== context.branchId || !sameCounter(staff.counterId, context.counterId) || !canAtBranch("pos.use", context.branchId) || !canAtBranch("order.create", context.branchId)) {
    throw new Error("Phiên hoặc phân công quầy đã thay đổi. Vui lòng tải lại POS.");
  }
  if (checkShift) {
    const shifts = loadCashShifts().filter(s => s.branchId === context.branchId && sameCounter(s.counterId, context.counterId) && s.status !== "closed");
    if (shifts.length !== 1 || shifts[0].status !== "open" || shifts[0].id !== context.shiftId) throw new Error("Ca đã thay đổi hoặc không còn mở. Không thể thanh toán giỏ này.");
  }
}
export const CHECKOUT_PENDING_KEY = "milktyway.pos.checkout.pending.v1";
/** Guard editing/holding/restoring without silently discarding an unresolved payment. */
export function assertPosCheckoutEditable(context: PosCheckoutContext, checkoutId?: string): void {
  assertPosContext(context);
  if (localStorage.getItem(CHECKOUT_PENDING_KEY) !== null) throw new Error("Giao dịch chưa đối soát xong. Không sửa, xóa hoặc giữ/khôi phục giỏ lúc này.");
  if (checkoutId && loadOrders().some(order => order.checkoutId === checkoutId)) throw new Error("Giao dịch này đã hoàn tất. Kiểm tra hóa đơn trước khi tạo giỏ mới.");
}


// Helper functions for returns
export function loadReturns(): ReturnRequest[] {
  return readRecords(STORAGE_RETURNS, INITIAL_RETURNS);
}

export function saveReturns(returns: ReturnRequest[]): void {
  localStorage.setItem(STORAGE_RETURNS, JSON.stringify(returns));
}

/**
 * Tạo một đơn hàng mới từ POS, đồng thời:
 * 1. Lưu vào danh sách đơn hàng
 * 2. Tạo hóa đơn tương ứng
 * Tồn kho chưa cập nhật: chờ mapping SKU/BOM chính xác.
 */
export function createPosOrder(params: PosCheckoutContext & {
  checkoutId: string;
  items: PosLine[];
  customerPhone?: string;
  customerName?: string;
  tier?: "Member" | "Silver" | "Gold" | "VIP";
  paymentMethod: "cash" | "transfer" | "card";
  paidAmount: number;
  discountRate: number;
  taxRate: number;
  flatDiscount?: number;
  channel?: "counter" | "takeaway";
  orderNote?: string;
  promotionCodes?: string[];
  /** Tổng tiền cart đã hiển thị; chặn thay đổi giá ở thời điểm chốt. */
  expectedTotal?: number;

}): { order: SalesOrder; invoice: InvoiceRecord } {
  assertPosContext(params, false);
  if (!params.checkoutId?.trim()) throw new Error("Thiếu mã giao dịch.");
  const fingerprint = JSON.stringify(params);
  const currentOrders = loadOrders();
  const currentInvoices = loadInvoices();
  if (localStorage.getItem(CHECKOUT_PENDING_KEY) !== null) throw new Error("Có giao dịch chưa đối soát xong. Giữ nguyên giỏ và kiểm tra dữ liệu trước khi thử lại.");
  const previous = currentOrders.find(order => order.checkoutId === params.checkoutId);
  if (previous) {
    const invoice = currentInvoices.find(item => item.orderId === previous.id);
    if (previous.checkoutFingerprint !== fingerprint || !invoice) throw new Error("Mã giao dịch đã dùng với nội dung khác hoặc thiếu hóa đơn. Cần đối soát.");
    return { order: structuredClone(previous), invoice: structuredClone(invoice) };
  }
  assertPosContext(params);
  const validatedItems = validatePosItems(params.items);
  if (params.channel !== undefined && !["counter", "takeaway"].includes(params.channel)) throw new Error("Loại đơn không hợp lệ.");
  if (params.orderNote !== undefined && typeof params.orderNote !== "string") throw new Error("Ghi chú không hợp lệ.");
  for (const item of validatedItems) if (!isPosProductAvailable(findPosProduct(item.productId)!, params.branchId)) throw new Error("Món đã hết hoặc bị khóa tại chi nhánh. Vui lòng cập nhật giỏ.");
  if (!["cash", "transfer", "card"].includes(params.paymentMethod)) throw new Error("Phương thức thanh toán không hợp lệ.");
  const quote = quotePromotionCheckout({
    items: validatedItems,
    branchId: params.branchId,
    channel: params.channel ?? "counter",
    discountRate: params.discountRate,
    flatDiscount: params.flatDiscount ?? 0,
    taxRate: params.taxRate,
    promotionCodes: params.promotionCodes,
    customerPhone: params.customerPhone,
  });

  const { subtotal, discount, tax, total } = quote;

  if (
    params.expectedTotal !== undefined &&
    params.expectedTotal !== total
  ) {
    throw new Error(
      "Giá trị thanh toán đã thay đổi. Vui lòng kiểm tra và áp dụng lại ưu đãi.",
    );
  }

  calculatePosChange(params.paidAmount, total);

  const maxNum = currentOrders.reduce((max, o) => {
    const m = o.id.match(/DH-0*(\d+)/);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 125);
  const nextNum = maxNum + 1;
  const orderId = `DH-${String(nextNum).padStart(5, "0")}`;
  const invoiceId = `HD-${params.branchId}-${String(nextNum).padStart(6, "0")}`;

  const salesItems: SalesOrderItem[] = validatedItems.map((it) => ({
    id: it.id,
    productId: it.productId,
    sku: it.productId,
    posProductId: findPosProduct(it.productId)!.id,
    name: it.name,
    size: it.size,
    sugar: it.sugar,
    ice: it.ice,
    toppings: [...it.toppings],
    note: it.note,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    paidDiscountAmount: quote.lineAmounts.find(line => line.id === it.id)!
      .paidDiscountAmount,
    paidTaxAmount: quote.lineAmounts.find(line => line.id === it.id)!
      .paidTaxAmount,

  }));

  const customerName = params.customerName?.trim() || (params.customerPhone ? "Khách Hội Viên" : "Khách Vãng Lai");
  const customerPhone = params.customerPhone?.trim() || "0900 000 000";

  const matchedStore = INITIAL_STORES.find(s => s.id === params.branchId || s.code === params.branchId);
  const branchTitle = matchedStore
    ? `${matchedStore.code} - ${matchedStore.name} (${matchedStore.area})`
    : `${params.branchId} - Bến Nghé (Quận 1)`;
  const branchAddress = matchedStore
    ? `${matchedStore.address}, ${matchedStore.area}, TP.HCM`
    : "12 Nguyễn Huệ, Quận 1, TP.HCM";

  const vietnamHour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
  const newOrder: SalesOrder = {
    id: orderId,
    branchId: params.branchId,
    shift: vietnamHour < 12 ? "morning" : vietnamHour < 18 ? "afternoon" : "evening",
    shiftId: params.shiftId, counterId: params.counterId, createdByStaffId: params.staffId,
    checkoutId: params.checkoutId, checkoutFingerprint: fingerprint,
    customer: customerName,
    phone: customerPhone,
    channel: params.channel ?? "counter",
    orderNote: params.orderNote?.trim() ?? "",
    createdAt: new Date().toISOString(),
    subtotal,
    discount,
    tax,
    total,
    appliedPromotions: structuredClone(quote.appliedPromotions),
    paymentMethod: params.paymentMethod,
    payment: "paid",
    preparation: "waiting", // Đưa vào hàng đợi KDS
    delivery: "pickup",
    largeOrder: total >= 300000,
    items: structuredClone(salesItems),
  };

  const newInvoice: InvoiceRecord = {
    id: invoiceId,
    orderId,
    customerName,
    customerPhone,
    tier: params.tier || (params.customerPhone ? "Gold" : "Member"),
    initials: customerName.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase() || "KH",
    avatarBg: "var(--primary)",
    branch: branchTitle,
    branchAddress,
    type: "Bán Lẻ",
    typeVariant: "info",
    date: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    subtotal,
    discount,
    tax,
    total,
    appliedPromotions: structuredClone(quote.appliedPromotions),
    paid: params.paidAmount,
    change: Math.max(0, params.paidAmount - total),
    paymentMethod: params.paymentMethod === "cash" ? "Tiền mặt" : params.paymentMethod === "card" ? "Thẻ ngân hàng" : "Chuyển khoản QR",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: structuredClone(salesItems),
  };

  const promotionEntries = planPromotionRedemptions({
    quote,
    customerPhone: params.customerPhone,
    checkoutId: params.checkoutId,
    orderId,
    branchId: params.branchId,
    createdAt: newOrder.createdAt,
  });

  const entries: [string, unknown][] = [
    [STORAGE_ORDERS, [newOrder, ...currentOrders]],
    [STORAGE_INVOICES, [newInvoice, ...currentInvoices]],
    ...promotionEntries,
  ];

  const before = entries.map(([key]) => ({
    key,
    value: localStorage.getItem(key),
  }));

  localStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify({
    checkoutId: params.checkoutId,
    orderId,
    invoiceId,
    before,
  }));

  try {
    for (const [key, value] of entries) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    localStorage.removeItem(CHECKOUT_PENDING_KEY);
  } catch {
    let restored = true;

    for (const { key, value } of before) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        restored = false;
      }
    }

    if (restored) {
      try {
        localStorage.removeItem(CHECKOUT_PENDING_KEY);
      } catch {
        restored = false;
      }
    }

    throw new Error(
      restored
        ? "Không lưu được giao dịch. Giỏ được giữ lại để thử lại."
        : "Giao dịch ghi một phần, cần đối soát trước khi thử lại.",
    );
  }

  if (promotionEntries.length) notifyPromotionsChanged();

  // Inventory deduction awaits an explicit SKU -> recipe/BOM contract.
  return { order: newOrder, invoice: newInvoice };
}

/**
 * Caller UI dùng API này để POS và A4 dùng chung Web Lock.
 * Giữ createPosOrder đồng bộ cho caller cũ và các test hiện có.
 */
export function createPosOrderExclusive(
  params: Parameters<typeof createPosOrder>[0],
): Promise<ReturnType<typeof createPosOrder>> {
  return withSalesWriteLock(() => createPosOrder(params));
}
