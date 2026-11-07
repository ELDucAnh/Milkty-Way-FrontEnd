/**
 * Bộ lưu trữ dữ liệu tập trung cho phân hệ Bán Hàng & POS & Pha Chế KDS
 * Kết nối luồng: POS -> Đơn hàng -> Hàng đợi pha chế -> Hóa đơn -> Trừ tồn quầy
 */

import type { BadgeVariant } from "../../components/common/Badge";
import type { PosCartItem } from "../../components/sales/PosCart";

export type SalesChannel = "counter" | "takeaway" | "online";
export type SalesShift = "morning" | "afternoon" | "evening";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type PreparationStatus = "waiting" | "preparing" | "ready";
export type DeliveryStatus = "pickup" | "waiting" | "delivering" | "delivered";

export interface SalesOrderItem {
  id: string;
  name: string;
  size: "M" | "L";
  sugar: string;
  ice: string;
  toppings: readonly string[];
  note: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrder {
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
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  status: "Đã Thanh Toán" | "Thanh Toán 50%" | "Chờ Thanh Toán" | "Đã Hoàn Tiền";
  statusVariant: BadgeVariant;
  items: SalesOrderItem[];
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
}

const STORAGE_ORDERS = "miltyway_sales_orders_v2";
const STORAGE_RETURNS = "miltyway_sales_returns_v2";
const STORAGE_INVOICES = "miltyway_invoices_v2";

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
        unitPrice: 51000,
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
        unitPrice: 49000,
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
    branchAddress: "247 Xô Viết Nghệ Tĩnh, P.17, Q. Bình Thạnh, TP.HCM",
    type: "Bán Lẻ",
    typeVariant: "info",
    date: "28/10/2026 14:32",
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
    branchAddress: "12 Pasteur, P. Bến Nghé, Quận 1, TP.HCM",
    type: "Giao Hàng",
    typeVariant: "purple",
    date: "28/10/2026 09:15",
    total: 450000,
    paid: 450000,
    change: 0,
    paymentMethod: "Chuyển khoản QR",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: INITIAL_ORDERS[0].items
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
];

// Helper functions for orders
export function loadOrders(): SalesOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS);
    if (!raw) return INITIAL_ORDERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ORDERS;
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveOrders(orders: SalesOrder[]): void {
  try {
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.error("Failed to save orders to localStorage", e);
  }
}

// Helper functions for invoices
export function loadInvoices(): InvoiceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_INVOICES);
    if (!raw) return INITIAL_INVOICES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_INVOICES;
  } catch {
    return INITIAL_INVOICES;
  }
}

export function saveInvoices(invoices: InvoiceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
  } catch (e) {
    console.error("Failed to save invoices to localStorage", e);
  }
}

// Helper functions for returns
export function loadReturns(): ReturnRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_RETURNS);
    if (!raw) return INITIAL_RETURNS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_RETURNS;
  } catch {
    return INITIAL_RETURNS;
  }
}

export function saveReturns(returns: ReturnRequest[]): void {
  try {
    localStorage.setItem(STORAGE_RETURNS, JSON.stringify(returns));
  } catch (e) {
    console.error("Failed to save returns to localStorage", e);
  }
}

/**
 * Tạo một đơn hàng mới từ POS, đồng thời:
 * 1. Lưu vào danh sách đơn hàng
 * 2. Tạo hóa đơn tương ứng
 * 3. Trừ tồn kho quầy bar trong business_demo_state_v1 nếu có
 */
export function createPosOrder(params: {
  branchId: string;
  items: PosCartItem[];
  customerPhone?: string;
  customerName?: string;
  tier?: "Member" | "Silver" | "Gold" | "VIP";
  paymentMethod: "cash" | "transfer" | "card";
  paidAmount: number;
  discountRate: number;
  taxRate: number;
}): { order: SalesOrder; invoice: InvoiceRecord } {
  const currentOrders = loadOrders();
  const nextNum = currentOrders.length + 126;
  const orderId = `DH-00${nextNum}`;
  const invoiceId = `HD-${params.branchId}-${String(nextNum).padStart(6, "0")}`;

  const subtotal = params.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const discount = Math.round(subtotal * (params.discountRate / 100));
  const tax = Math.round((subtotal - discount) * (params.taxRate / 100));
  const total = subtotal - discount + tax;

  const salesItems: SalesOrderItem[] = params.items.map((it, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    name: it.name,
    size: it.size,
    sugar: it.sugar,
    ice: it.ice,
    toppings: it.toppings,
    note: it.note,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
  }));

  const customerName = params.customerName?.trim() || (params.customerPhone ? "Khách Hội Viên" : "Khách Vãng Lai");
  const customerPhone = params.customerPhone?.trim() || "0900 000 000";

  const newOrder: SalesOrder = {
    id: orderId,
    branchId: params.branchId,
    shift: "morning",
    customer: customerName,
    phone: customerPhone,
    channel: "counter",
    createdAt: new Date().toISOString(),
    subtotal,
    discount,
    tax,
    total,
    paymentMethod: params.paymentMethod,
    payment: "paid",
    preparation: "waiting", // Đưa vào hàng đợi KDS
    delivery: "pickup",
    largeOrder: total >= 300000,
    items: salesItems,
  };

  const newInvoice: InvoiceRecord = {
    id: invoiceId,
    orderId,
    customerName,
    customerPhone,
    tier: params.tier || (params.customerPhone ? "Gold" : "Member"),
    initials: customerName.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase() || "KH",
    avatarBg: "var(--primary)",
    branch: `${params.branchId} - Bến Nghé (Quận 1)`,
    branchAddress: "12 Pasteur, P. Bến Nghé, Quận 1, TP.HCM",
    type: "Bán Lẻ",
    typeVariant: "info",
    date: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    total,
    paid: params.paidAmount || total,
    change: Math.max(0, (params.paidAmount || total) - total),
    paymentMethod: params.paymentMethod === "cash" ? "Tiền mặt" : params.paymentMethod === "card" ? "Thẻ ngân hàng" : "Chuyển khoản QR",
    status: "Đã Thanh Toán",
    statusVariant: "success",
    items: salesItems,
  };

  // Lưu Order và Invoice
  saveOrders([newOrder, ...currentOrders]);
  const currentInvoices = loadInvoices();
  saveInvoices([newInvoice, ...currentInvoices]);

  // Trừ tồn kho nguyên liệu quầy trong useDemoState (business_demo_state_v1)
  try {
    const rawDemo = localStorage.getItem("business_demo_state_v1");
    if (rawDemo) {
      const demo = JSON.parse(rawDemo);
      if (demo && Array.isArray(demo.lots)) {
        // Mỗi ly bán ra tiêu hao khoảng:
        // Cốt trà: 150ml, Sữa/bột béo: 30g, Trân châu (nếu có topping): 30g, Ly/nắp: 1 cái
        const totalCups = params.items.reduce((s, it) => s + it.quantity, 0);
        demo.lots = demo.lots.map((lot: any) => {
          if (lot.location === "counter") {
            if (lot.ingredientId === "ing-black-tea" || lot.ingredientId === "ing-olong-tea") {
              const deduction = totalCups * 150; // ml
              return { ...lot, quantity: Math.max(0, lot.quantity - deduction) };
            }
            if (lot.ingredientId === "ing-fresh-milk" || lot.ingredientId === "ing-condensed-milk") {
              const deduction = totalCups * 30; // g
              return { ...lot, quantity: Math.max(0, lot.quantity - deduction) };
            }
            if (lot.ingredientId === "ing-cup-m" || lot.ingredientId === "ing-cup-l") {
              const deduction = totalCups;
              return { ...lot, quantity: Math.max(0, lot.quantity - deduction) };
            }
            if (lot.ingredientId === "ing-tapioca-pearl") {
              const pearlCount = params.items.filter(it => it.toppings.some(t => t.toLowerCase().includes("trân châu"))).reduce((s, it) => s + it.quantity, 0);
              const deduction = pearlCount * 30;
              return { ...lot, quantity: Math.max(0, lot.quantity - deduction) };
            }
          }
          return lot;
        });
        localStorage.setItem("business_demo_state_v1", JSON.stringify(demo));
      }
    }
  } catch (err) {
    console.warn("Could not auto-deduct counter lots", err);
  }

  return { order: newOrder, invoice: newInvoice };
}

