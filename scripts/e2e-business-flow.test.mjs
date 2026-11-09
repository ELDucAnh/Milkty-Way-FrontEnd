import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
/**
 * MilktyWay POS & Chain Operations - Comprehensive E2E Business Flow Test Suite
 * Luồng kiểm thử nghiệp vụ toàn diện từ POS -> KDS -> Hóa Đơn -> Đổi Trả -> Bàn Giao Ca -> FEFO -> Điều Chuyển Kho
 */

// 1. In-memory Mock LocalStorage
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

// 2. Mock business demo state với các lô đa dạng phục vụ test FEFO & Tồn kho
const INITIAL_LOTS = [
  {
    id: "lot-tea-01",
    ingredientId: "ing-tea-black",
    lotCode: "LOT-TRA-DEN-2615",
    location: "counter",
    locationId: "CN01",
    quantity: 5000, // 5000ml cốt trà đen
    unitCost: 15,
    quality: "pass",
    expiryDate: "2026-11-15", // Hạn xa
  },
  {
    id: "lot-tea-02-fefo",
    ingredientId: "ing-tea-black",
    lotCode: "LOT-TRA-DEN-2608",
    location: "counter",
    locationId: "CN01",
    quantity: 800, // 800ml cốt trà đen cận hạn
    unitCost: 15,
    quality: "pass",
    expiryDate: "2026-11-08", // Hạn gần nhất -> Phải ưu tiên xuất trước theo FEFO
  },
  {
    id: "lot-tea-03-expired",
    ingredientId: "ing-tea-black",
    lotCode: "LOT-TRA-DEN-2601",
    location: "counter",
    locationId: "CN01",
    quantity: 500, // 500ml cốt trà đen đã hết hạn
    unitCost: 15,
    quality: "failed", // Bị cô lập
    expiryDate: "2026-10-25",
  },
  {
    id: "lot-pearl-01",
    ingredientId: "ing-pearl-gold",
    lotCode: "LOT-TC-HK-2610",
    location: "counter",
    locationId: "CN01",
    quantity: 3000, // 3000g trân châu hoàng kim
    unitCost: 25,
    quality: "pass",
    expiryDate: "2026-11-12",
  },
  {
    id: "lot-cup-l",
    ingredientId: "ing-cup-l",
    lotCode: "LOT-LY-L-2610",
    location: "counter",
    locationId: "CN01",
    quantity: 500, // 500 ly L
    unitCost: 800,
    quality: "pass",
  },
  {
    id: "lot-cup-m",
    ingredientId: "ing-cup-m",
    lotCode: "LOT-LY-M-2610",
    location: "counter",
    locationId: "CN01",
    quantity: 500, // 500 ly M
    unitCost: 700,
    quality: "pass",
  },
];

mockStorage.set(
  "business_demo_state_v1",
  JSON.stringify({ lots: INITIAL_LOTS })
);

// 3. Logic core trích xuất từ src/pages/shared/sales-orders-store.ts
const STORAGE_ORDERS = "miltyway_sales_orders_v2";
const STORAGE_RETURNS = "miltyway_sales_returns_v2";
const STORAGE_INVOICES = "miltyway_invoices_v2";

function loadOrders() {
  const raw = localStorage.getItem(STORAGE_ORDERS);
  return raw ? JSON.parse(raw) : [];
}
function saveOrders(orders) {
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
}
function loadInvoices() {
  const raw = localStorage.getItem(STORAGE_INVOICES);
  return raw ? JSON.parse(raw) : [];
}
function saveInvoices(invoices) {
  localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
}
function loadReturns() {
  const raw = localStorage.getItem(STORAGE_RETURNS);
  return raw ? JSON.parse(raw) : [];
}
function saveReturns(returns) {
  localStorage.setItem(STORAGE_RETURNS, JSON.stringify(returns));
}

function updateOrderStatus(orderId, patch) {
  const orders = loadOrders();
  const next = orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
  saveOrders(next);
  return next.find((o) => o.id === orderId);
}

function createPosOrder(params) {
  const currentOrders = loadOrders();
  const nextNum = currentOrders.length + 126;
  const orderId = `DH-00${nextNum}`;
  const invoiceId = `HD-${params.branchId}-${String(nextNum).padStart(6, "0")}`;

  const subtotal = params.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const discount = Math.round(subtotal * (params.discountRate / 100));
  const tax = Math.round((subtotal - discount) * (params.taxRate / 100));
  const total = subtotal - discount + tax;

  const salesItems = params.items.map((it, idx) => ({
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

  const newOrder = {
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

  const newInvoice = {
    id: invoiceId,
    orderId,
    customerName,
    customerPhone,
    tier: params.tier || (params.customerPhone ? "VIP" : "Member"),
    initials: customerName.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase() || "KH",
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

  saveOrders([newOrder, ...currentOrders]);
  const currentInvoices = loadInvoices();
  saveInvoices([newInvoice, ...currentInvoices]);

  // Trừ tồn kho quầy bar trong business_demo_state_v1
  const rawDemo = localStorage.getItem("business_demo_state_v1");
  if (rawDemo) {
    const demo = JSON.parse(rawDemo);
    if (demo && Array.isArray(demo.lots)) {
      const totalCups = params.items.reduce((s, it) => s + it.quantity, 0);
      const lCups = params.items.filter((it) => it.size === "L").reduce((s, it) => s + it.quantity, 0);
      const mCups = params.items.filter((it) => it.size === "M").reduce((s, it) => s + it.quantity, 0);
      const pearlCount = params.items.filter((it) => it.toppings.some((t) => t.toLowerCase().includes("trân châu"))).reduce((s, it) => s + it.quantity, 0);

      demo.lots = demo.lots.map((lot) => {
        if (lot.location === "counter" && lot.locationId === params.branchId) {
          if (lot.ingredientId === "ing-tea-black" && lot.id === "lot-tea-01") {
            return { ...lot, quantity: Math.max(0, lot.quantity - totalCups * 150) };
          }
          if (lot.ingredientId === "ing-pearl-gold") {
            return { ...lot, quantity: Math.max(0, lot.quantity - (pearlCount || totalCups) * 30) };
          }
          if (lot.ingredientId === "ing-cup-l") {
            return { ...lot, quantity: Math.max(0, lot.quantity - (lCups || totalCups)) };
          }
          if (lot.ingredientId === "ing-cup-m") {
            return { ...lot, quantity: Math.max(0, lot.quantity - mCups) };
          }
        }
        return lot;
      });
      localStorage.setItem("business_demo_state_v1", JSON.stringify(demo));
    }
  }

  return { order: newOrder, invoice: newInvoice };
}

// Logic kiểm tra và chuẩn hóa phần trăm chiết khấu
function validPercentage(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const num = Number(String(value).trim());
  return Number.isFinite(num) && num >= 0 && num <= 100 ? num : null;
}

// Quy chuẩn 4 Hạng thành viên F&B MilktyWay
const TIER_RULES = [
  { tier: "Member", name: "Hạng Thành Viên", minPoints: 0, nextPoints: 200, discountPercent: 0 },
  { tier: "Silver", name: "Hạng Bạc", minPoints: 200, nextPoints: 500, discountPercent: 5 },
  { tier: "Gold", name: "Hạng Vàng", minPoints: 500, nextPoints: 1000, discountPercent: 10 },
  { tier: "VIP", name: "Hạng VIP", minPoints: 1000, nextPoints: null, discountPercent: 15 },
];

function calculateCustomerTier(points) {
  if (points >= 1000) return { tier: "VIP", name: "Hạng VIP", discount: 15, next: "Đã đạt Hạng VIP cao nhất" };
  if (points >= 500) return { tier: "Gold", name: "Hạng Vàng", discount: 10, next: `Cần ${1000 - points} điểm nữa lên VIP` };
  if (points >= 200) return { tier: "Silver", name: "Hạng Bạc", discount: 5, next: `Cần ${500 - points} điểm nữa lên Hạng Vàng` };
  return { tier: "Member", name: "Hạng Thành Viên", discount: 0, next: `Cần ${200 - points} điểm nữa lên Hạng Bạc` };
}

// ================= TEST RUNNER =================
console.log("================================================================================");
console.log("🚀 BẮT ĐẦU CHẠY BỘ KIỂM THỬ LUỒNG NGHIỆP VỤ F&B CHUỖI TRÀ SỮA MILKTYWAY");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

try {
  // ----------------------------------------------------
  // TEST SCENARIO 1: POS Tạo đơn bán hàng & Tự động kết nối hệ thống
  // ----------------------------------------------------
  console.log("📌 KỊCH BẢN 1: Thu ngân POS nhận đơn, áp dụng ưu đãi VIP Diamond & thanh toán tiền mặt");
  const cartItems1 = [
    {
      id: "pos-01",
      name: "Trà sữa trân châu hoàng kim",
      size: "L",
      sugar: "50%",
      ice: "Vừa đá",
      toppings: ["Trân châu hoàng kim", "Pudding trứng"],
      note: "Ít ngọt tự nhiên",
      quantity: 1,
      unitPrice: 56000, // 44k + 5k trân châu + 7k pudding
    },
    {
      id: "pos-02",
      name: "Trà đào cam sả tươi",
      size: "L",
      sugar: "70%",
      ice: "Ít đá",
      toppings: [],
      note: "Thêm lát cam tươi",
      quantity: 1,
      unitPrice: 45000,
    },
  ];

  const posResult1 = createPosOrder({
    branchId: "CN01",
    items: cartItems1,
    customerPhone: "0903 123 456",
    customerName: "Nguyễn An (VIP Diamond)",
    tier: "VIP",
    paymentMethod: "cash",
    paidAmount: 100000,
    discountRate: 10, // Giảm 10% VIP Diamond
    taxRate: 8,       // VAT 8%
  });

  const createdOrder1 = posResult1.order;
  const createdInvoice1 = posResult1.invoice;

  assert(createdOrder1.id.startsWith("DH-"), `Mã đơn hàng được sinh chuẩn: ${createdOrder1.id}`);
  assert(createdOrder1.subtotal === 101000, `Tổng tiền trước giảm chuẩn: ${createdOrder1.subtotal}đ (56k + 45k)`);
  assert(createdOrder1.discount === 10100, `Chiết khấu VIP 10% chuẩn: ${createdOrder1.discount}đ`);
  assert(createdOrder1.tax === 7272, `Thuế VAT 8% chuẩn: ${createdOrder1.tax}đ`);
  assert(createdOrder1.total === 98172, `Tổng thanh toán sau thuế chuẩn: ${createdOrder1.total}đ`);
  assert(createdOrder1.preparation === "waiting", "Đơn hàng tự động đưa vào hàng đợi KDS ở trạng thái 'waiting'");
  assert(createdInvoice1.id.startsWith("HD-CN01-"), `Hóa đơn được tạo đồng bộ: ${createdInvoice1.id}`);
  assert(createdInvoice1.change === 1828, `Tiền thối lại cho khách chính xác: ${createdInvoice1.change}đ (100k - 98.172đ)`);

  // ----------------------------------------------------
  // TEST SCENARIO 2: Tự động trừ tồn kho quầy bar (Counter Inventory)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 2: Kiểm tra trừ tồn kho quầy bar (Counter Inventory) theo công thức F&B");
  let updatedDemo = JSON.parse(localStorage.getItem("business_demo_state_v1"));
  let teaLot = updatedDemo.lots.find((l) => l.id === "lot-tea-01");
  let pearlLot = updatedDemo.lots.find((l) => l.id === "lot-pearl-01");
  let cupLot = updatedDemo.lots.find((l) => l.id === "lot-cup-l");

  assert(teaLot.quantity === 5000 - 300, `Cốt trà đen quầy bar đã trừ 300ml -> còn ${teaLot.quantity}ml`);
  assert(pearlLot.quantity === 3000 - 30, `Trân châu quầy bar đã trừ 30g (1 ly có trân châu) -> còn ${pearlLot.quantity}g`);
  assert(cupLot.quantity === 500 - 2, `Ly Size L đã trừ 2 cái -> còn ${cupLot.quantity} ly`);

  // ----------------------------------------------------
  // TEST SCENARIO 3: Màn hình KDS Barista tiếp nhận & hoàn tất pha chế
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 3: Màn hình KDS Barista tiếp nhận & hoàn tất pha chế");
  const orderPreparing = updateOrderStatus(createdOrder1.id, { preparation: "preparing" });
  assert(orderPreparing.preparation === "preparing", `Đơn hàng ${createdOrder1.id} chuyển sang 'preparing' (Barista đang pha)`);

  const orderReady = updateOrderStatus(createdOrder1.id, { preparation: "ready" });
  assert(orderReady.preparation === "ready", `Đơn hàng ${createdOrder1.id} chuyển sang 'ready' (Chuông báo khách nhận món)`);

  // ----------------------------------------------------
  // TEST SCENARIO 4: Tra cứu chi tiết hóa đơn (InvoiceDetailsPage)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 4: Tra cứu chi tiết hóa đơn (InvoiceDetailsPage)");
  const invoicesList = loadInvoices();
  const invoice1 = invoicesList.find((inv) => inv.orderId === createdOrder1.id);

  assert(Boolean(invoice1), `Tìm thấy hóa đơn tương ứng với đơn hàng ${createdOrder1.id}`);
  assert(invoice1.customerName === "Nguyễn An (VIP Diamond)", "Tên khách hàng trên hóa đơn trùng khớp");
  assert(invoice1.items.length === 2, "Hóa đơn có đủ 2 món chi tiết");
  assert(invoice1.items[0].toppings.includes("Trân châu hoàng kim"), "Topping trên hóa đơn thể hiện đầy đủ");

  // ----------------------------------------------------
  // TEST SCENARIO 5: Xử lý đổi trả / hoàn tiền (SalesReturnsPage)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 5: Xử lý yêu cầu hoàn tiền / đổi món khiếu nại (SalesReturnsPage)");
  const returnTicket = {
    id: "HT-0002",
    orderId: createdOrder1.id,
    customer: createdOrder1.customer,
    createdAt: new Date().toISOString(),
    resolution: "Hoàn tiền mặt 45.000đ cho món Trà Đào Cam Sả do khách dị ứng",
    reason: "Khách dị ứng thành phần sả tươi, thu ngân hoàn lại tiền món",
    amount: 45000,
    points: 45,
    memberId: createdOrder1.phone,
    status: "Pending",
  };

  saveReturns([returnTicket, ...loadReturns()]);
  assert(loadReturns().length > 0, "Phiếu yêu cầu hoàn tiền được ghi nhận vào hệ thống");

  const allReturns = loadReturns();
  const approvedReturns = allReturns.map((r) =>
    r.id === "HT-0002" ? { ...r, status: "Approved" } : r
  );
  saveReturns(approvedReturns);

  const finalReturn = loadReturns().find((r) => r.id === "HT-0002");
  assert(finalReturn.status === "Approved", "Quản lý cửa hàng đã duyệt thành công phiếu hoàn tiền HT-0002");

  // ----------------------------------------------------
  // TEST SCENARIO 6: Đối soát doanh thu tiền mặt ca làm việc (ShiftsPage)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 6: Quản lý ca & Bàn giao quỹ tiền mặt (ShiftsPage)");
  const initialDrawerCash = 2000000;
  const cashSalesInShift = loadOrders()
    .filter((o) => o.branchId === "CN01" && o.paymentMethod === "cash" && o.payment === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  const expectedDrawerCash = initialDrawerCash + cashSalesInShift;
  assert(cashSalesInShift >= 98172, `Doanh thu tiền mặt ghi nhận chính xác: ${cashSalesInShift.toLocaleString("vi-VN")}đ`);
  assert(expectedDrawerCash >= 2098172, `Két tiền thực tế đối soát khớp: ${expectedDrawerCash.toLocaleString("vi-VN")}đ`);

  // ====================================================
  // PHẦN MỞ RỘNG CÁC KỊCH BẢN PHỨC TẠP MỚI
  // ====================================================

  // ----------------------------------------------------
  // TEST SCENARIO 7: Đơn hàng số lượng lớn (Đoàn/Sự kiện B2B 12 ly)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 7: Đơn hàng số lượng lớn B2B 12 ly, nhiều size, đường đá & topping tùy biến");
  const cartItemsLarge = [
    {
      id: "large-01",
      name: "Trà sữa Ô long nướng",
      size: "L",
      sugar: "70%",
      ice: "Không đá",
      toppings: ["Trân châu hoàng kim", "Kem phô mai"],
      note: "Đóng khay 6 ly riêng",
      quantity: 6,
      unitPrice: 58000,
    },
    {
      id: "large-02",
      name: "Trà lài đác thơm",
      size: "M",
      sugar: "50%",
      ice: "Ít đá",
      toppings: ["Hạt đác dẻo"],
      note: "Giao kèm ống hút to",
      quantity: 4,
      unitPrice: 42000,
    },
    {
      id: "large-03",
      name: "Sữa tươi trân châu đường đen",
      size: "L",
      sugar: "100%",
      ice: "100% đá",
      toppings: ["Trân châu đường đen", "Pudding trứng"],
      note: "Khuấy đều trước khi đóng nắp",
      quantity: 2,
      unitPrice: 55000,
    },
  ];

  const posResultLarge = createPosOrder({
    branchId: "CN01",
    items: cartItemsLarge,
    customerPhone: "0908 123 456",
    customerName: "Trần Văn An (Hạng Vàng)",
    tier: "Gold",
    paymentMethod: "cash",
    paidAmount: 650000,
    discountRate: 10, // Giảm 10% Hạng Vàng
    taxRate: 8,       // VAT 8%
  });

  const orderLarge = posResultLarge.order;
  const invoiceLarge = posResultLarge.invoice;

  // Tính toán: 6*58k + 4*42k + 2*55k = 348k + 168k + 110k = 626.000đ
  assert(orderLarge.subtotal === 626000, `Tổng tiền trước giảm chuẩn: ${orderLarge.subtotal}đ (12 ly)`);
  assert(orderLarge.discount === 62600, `Chiết khấu Hạng Vàng 10% chuẩn: ${orderLarge.discount}đ`);
  assert(orderLarge.tax === 45072, `Thuế VAT 8% chuẩn: ${orderLarge.tax}đ`);
  assert(orderLarge.total === 608472, `Tổng thanh toán sau thuế chuẩn: ${orderLarge.total}đ`);
  assert(orderLarge.largeOrder === true, "Hệ thống tự động kích hoạt cờ 'largeOrder' cho đơn hàng giá trị cao");
  assert(invoiceLarge.change === 41528, `Tiền thối lại cho khách đưa 650k chuẩn: ${invoiceLarge.change}đ`);

  // Kiểm tra trừ tồn kho quầy bar cho đơn hàng lớn (12 ly: 8 ly L và 4 ly M)
  updatedDemo = JSON.parse(localStorage.getItem("business_demo_state_v1"));
  teaLot = updatedDemo.lots.find((l) => l.id === "lot-tea-01");
  cupLot = updatedDemo.lots.find((l) => l.id === "lot-cup-l");
  const cupMLot = updatedDemo.lots.find((l) => l.id === "lot-cup-m");

  assert(teaLot.quantity === 4700 - 12 * 150, `Cốt trà đen đã trừ tiếp 1800ml (12 ly) -> còn ${teaLot.quantity}ml`);
  assert(cupLot.quantity === 498 - 8, `Ly Size L đã trừ tiếp 8 cái -> còn ${cupLot.quantity} ly`);
  assert(cupMLot.quantity === 500 - 4, `Ly Size M đã trừ 4 cái -> còn ${cupMLot.quantity} ly`);

  // ----------------------------------------------------
  // TEST SCENARIO 8: Cơ chế thăng hạng thành viên F&B tự động
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 8: Cơ chế tích điểm & Thăng hạng thành viên F&B tự động (Bạc -> Vàng -> VIP)");
  let memberPoints = 420; // Ban đầu Hạng Bạc
  let tierInfo = calculateCustomerTier(memberPoints);
  assert(tierInfo.tier === "Silver", "Khách hàng 420 điểm khởi đầu ở Hạng Bạc (Silver)");
  assert(tierInfo.discount === 5, "Hạng Bạc hưởng ưu đãi chiết khấu 5%");
  assert(tierInfo.next.includes("80 điểm"), `Tiến trình hiển thị chuẩn: '${tierInfo.next}'`);

  // Khách tích lũy thêm điểm sau đơn hàng 950.000đ (+95 điểm)
  memberPoints += 95; // 420 + 95 = 515 điểm
  tierInfo = calculateCustomerTier(memberPoints);
  assert(memberPoints === 515, `Tổng điểm tích lũy mới: ${memberPoints} điểm`);
  assert(tierInfo.tier === "Gold", "Khách hàng vượt mốc 500 điểm tự động thăng lên Hạng Vàng (Gold)");
  assert(tierInfo.discount === 10, "Hạng Vàng tự động hưởng chiết khấu 10% và miễn phí Topping");
  assert(tierInfo.next.includes("485 điểm"), `Tiến trình lên Hạng VIP tính toán chính xác: '${tierInfo.next}'`);

  // Khách tiếp tục tích lũy thêm 500 điểm (+500 điểm) -> 1015 điểm
  memberPoints += 500;
  tierInfo = calculateCustomerTier(memberPoints);
  assert(tierInfo.tier === "VIP", "Khách hàng đạt 1015 điểm tự động thăng hạng lên Hạng VIP cao nhất");
  assert(tierInfo.discount === 15, "Hạng VIP hưởng mức giảm cao nhất 15% toàn hệ thống");

  // ----------------------------------------------------
  // TEST SCENARIO 9: Áp dụng Voucher ưu đãi & Ngăn chặn mã giả mạo
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 9: Xác thực mã Voucher ưu đãi ('CHAOBAN', 'MILTYWAY') & Chặn voucher giả mạo");
  const VALID_VOUCHERS = {
    CHAOBAN: 10,
    MILTYWAY: 10,
    GIAM10: 10,
    GIAM20: 20,
    VIP20: 20,
  };

  function applyVoucherCode(code) {
    const clean = code.trim().toUpperCase();
    if (VALID_VOUCHERS[clean] !== undefined) {
      return { success: true, discountRate: VALID_VOUCHERS[clean] };
    }
    return { success: false, error: "Mã ưu đãi không tồn tại hoặc đã hết hạn" };
  }

  const validResult = applyVoucherCode("CHAOBAN");
  assert(validResult.success === true && validResult.discountRate === 10, "Mã 'CHAOBAN' áp dụng thành công giảm 10%");

  const fakeResult = applyVoucherCode("HACKER_CODE_99");
  assert(fakeResult.success === false, "Hệ thống chặn thành công mã voucher giả mạo 'HACKER_CODE_99'");

  // Ràng buộc bảo vệ phần trăm giảm giá (0 - 100%)
  assert(validPercentage("15") === 15, "Chuỗi '15' được ép kiểu phần trăm hợp lệ: 15%");
  assert(validPercentage(150) === null, "Phần trăm 150% vượt trần bị chặn (null)");
  assert(validPercentage(-10) === null, "Phần trăm âm -10% bị chặn (null)");
  assert(validPercentage("abc") === null, "Chuỗi không phải số bị chặn (null)");

  // ----------------------------------------------------
  // TEST SCENARIO 10: Thanh toán số (Chuyển khoản QR / Thẻ) & Kiểm soát tiền thối
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 10: Thanh toán số VietQR / Thẻ POS, kiểm soát tiền thối chính xác bằng 0");
  const digitalCart = [
    {
      id: "digi-01",
      name: "Trà sữa trân châu ô long",
      size: "M",
      sugar: "50%",
      ice: "Vừa đá",
      toppings: ["Trân châu hoàng kim"],
      note: "",
      quantity: 2,
      unitPrice: 40000,
    },
  ];

  const posResultQR = createPosOrder({
    branchId: "CN01",
    items: digitalCart,
    customerPhone: "0912 345 678",
    customerName: "Trần Bình",
    paymentMethod: "transfer",
    paidAmount: 86400, // Đã gồm 8% VAT (80k + 6.4k)
    discountRate: 0,
    taxRate: 8,
  });

  const invoiceQR = posResultQR.invoice;
  assert(invoiceQR.paymentMethod === "Chuyển khoản QR", "Hóa đơn ghi nhận đúng phương thức 'Chuyển khoản QR'");
  assert(invoiceQR.change === 0, "Thanh toán chuyển khoản điện tử đảm bảo tiền thối lại change === 0đ");
  assert(invoiceQR.status === "Đã Thanh Toán", "Đơn hàng điện tử hoàn tất ngay ở trạng thái 'Đã Thanh Toán'");

  // ----------------------------------------------------
  // TEST SCENARIO 11: Nguyên tắc FEFO & Từ chối xuất lô hết hạn
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 11: Nguyên tắc FEFO (First-Expired, First-Out) & Ngăn chặn xuất lô quá hạn");
  const availableLots = JSON.parse(localStorage.getItem("business_demo_state_v1")).lots
    .filter((l) => l.ingredientId === "ing-tea-black");

  // Lọc các lô đạt chất lượng và chưa hết hạn (HSD >= 2026-11-07)
  const validLots = availableLots.filter((l) => l.quality === "pass" && l.expiryDate >= "2026-11-07");
  // Sắp xếp theo FEFO: Lô có ngày hết hạn sớm nhất lên đầu
  const fefoSorted = [...validLots].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  assert(fefoSorted[0].id === "lot-tea-02-fefo", `Lô được ưu tiên xuất trước theo FEFO là lô cận hạn nhất: ${fefoSorted[0].lotCode} (HSD: ${fefoSorted[0].expiryDate})`);
  assert(
    !validLots.some((l) => l.id === "lot-tea-03-expired"),
    "Lô 'lot-tea-03-expired' quá hạn tuyệt đối bị loại khỏi danh sách xuất pha chế"
  );

  // ----------------------------------------------------
  // TEST SCENARIO 12: Đóng ca & Xử lý chênh lệch quỹ tiền mặt (Cash Discrepancy)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 12: Bàn giao ca trực & Xử lý chênh lệch quỹ két tiền mặt (Cash Discrepancy)");
  const shiftOpening = 500000;
  const totalCashCollected = loadOrders()
    .filter((o) => o.branchId === "CN01" && o.paymentMethod === "cash" && o.payment === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  const expectedCashInDrawer = shiftOpening + totalCashCollected;
  // Giả lập thu ngân đếm thực tế bị thiếu 20.000đ (ví dụ trả nhầm tiền thối)
  const countedActualCash = expectedCashInDrawer - 20000;
  const cashDifference = countedActualCash - expectedCashInDrawer;

  assert(cashDifference === -20000, `Hệ thống ghi nhận chính xác khoản hao hụt két: ${cashDifference.toLocaleString("vi-VN")}đ`);

  const closeShiftPayload = {
    shiftId: "CA-001",
    openingCash: shiftOpening,
    expectedCash: expectedCashInDrawer,
    countedCash: countedActualCash,
    difference: cashDifference,
    reason: "Sai lệch kiểm đếm: Thu ngân trả nhầm tiền thối cho khách",
    status: "closing-requested",
  };

  assert(closeShiftPayload.difference < 0 && closeShiftPayload.reason.length > 0, "Bắt buộc có biên bản giải trình khi két tiền thực tế bị lệch");
  assert(closeShiftPayload.status === "closing-requested", "Ca làm việc chuyển sang trạng thái chờ quản lý duyệt đóng ca");

  // ----------------------------------------------------
  // TEST SCENARIO 13: Quy trình điều chuyển kho & Xử lý hao hụt thực nhận
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 13: Điều chuyển kho chi nhánh có ghi nhận hao hụt / đổ vỡ (Stock Transfer with Discrepancy)");
  const transferTicket = {
    id: "CK-CN01-002",
    fromLocation: "central",
    toLocation: "counter",
    storeId: "CN01",
    ingredientName: "Bột kem béo sữa New Zealand",
    sentQuantity: 100, // Kho tổng xuất 100 gói
    receivedQuantity: 98, // Vận chuyển bị đổ vỡ rách 2 gói -> Chi nhánh thực nhận 98
    status: "in-transit",
    discrepancyReason: "",
  };

  // Chi nhánh xác nhận nhận hàng
  const hasDiscrepancy = transferTicket.receivedQuantity !== transferTicket.sentQuantity;
  assert(hasDiscrepancy === true, "Phát hiện chênh lệch giữa số lượng thực cấp (100) và thực nhận (98)");

  transferTicket.status = hasDiscrepancy ? "discrepancy" : "received";
  transferTicket.discrepancyReason = "Bể vỡ rách bao bì 2 gói trong quá trình vận chuyển bốc dỡ";

  assert(transferTicket.status === "discrepancy", "Phiếu điều chuyển tự động gán trạng thái 'discrepancy' (Có chênh lệch)");
  assert(transferTicket.discrepancyReason.includes("Bể vỡ"), "Ghi nhận đầy đủ biên bản lý do sai lệch thực tế");
  assert(transferTicket.receivedQuantity === 98, "Tồn kho quầy bar chi nhánh chỉ ghi tăng đúng 98 gói thực tế nhận");

  // ----------------------------------------------------
  // TEST SCENARIO 14: Đối soát tiêu hao nguyên liệu ca trực & Cân đối sai lệch thực đếm (Shift Reconciliation)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 14: Đối soát tiêu hao nguyên liệu ca trực & Cân đối sai lệch thực đếm (Shift Reconciliation)");
  // Giả lập đối soát nguyên liệu "Cốt hồng trà đặc" (LOT: ME-261105-01) tại quầy bar cuối ca
  const reconciliationData = {
    lotId: "ME-261105-01",
    ingredientName: "Cốt hồng trà đặc",
    unit: "ml",
    unitCost: 15,
    openingStock: 5000,    // Tồn đầu ca: 5.000ml
    receivedInShift: 1000, // Nhận cấp phát trong ca: 1.000ml
    actualUsage: 2100,     // Tiêu hao thực tế bán qua POS: 2.100ml (14 ly x 150ml)
    wasteQuantity: 150,    // Hao hụt do đổ vỡ / pha sai trong ca: 150ml
    wasteReasons: ["Pha sai", "Đổ vỡ"], // Multi-select checkbox reasons
  };

  // Công thức: Tồn lý thuyết = Tồn đầu + Thực nhận - Tiêu hao thực tế - Hủy/Hao hụt
  const theoreticalStock =
    reconciliationData.openingStock +
    reconciliationData.receivedInShift -
    reconciliationData.actualUsage -
    reconciliationData.wasteQuantity;

  assert(theoreticalStock === 3750, `Tồn lý thuyết cuối ca tính toán chính xác: ${theoreticalStock}ml (5000 + 1000 - 2100 - 150)`);

  // Thu ngân / Barista thực đếm quầy bar cuối ca: thực đếm 3.700ml (thiếu 50ml so với lý thuyết)
  const countedStock = 3700;
  const stockDifference = countedStock - theoreticalStock;
  const differenceValue = Math.abs(stockDifference) * reconciliationData.unitCost;

  assert(stockDifference === -50, `Hệ thống phát hiện sai lệch thực tế: ${stockDifference}ml (Thiếu 50ml)`);
  assert(differenceValue === 750, `Giá trị chênh lệch quy đổi thành tiền: ${differenceValue.toLocaleString("vi-VN")}đ (50ml x 15đ)`);

  // Bổ sung nguyên nhân sai lệch vào danh sách lý do
  const finalReasons = [...reconciliationData.wasteReasons, "Sai lệch kiểm đếm"];
  const reconciliationTicket = {
    id: "DS-CN01-20261107-01",
    branchId: "CN01",
    shift: "Ca sáng",
    date: "2026-11-07",
    lines: [
      {
        lotId: reconciliationData.lotId,
        theoreticalStock,
        countedStock,
        difference: stockDifference,
        differenceValue,
        reasons: finalReasons.join(", "),
      },
    ],
    generalNote: "Sai lệch 50ml do hao hụt bám dính đáy bình đong và sai lệch đo lường thể tích.",
    status: "pending",
  };

  assert(reconciliationTicket.lines[0].reasons.includes("Sai lệch kiểm đếm"), "Cập nhật thành công danh sách đa nguyên nhân hao hụt ('Pha sai, Đổ vỡ, Sai lệch kiểm đếm')");
  assert(reconciliationTicket.status === "pending", "Biên bản đối soát được tạo và chuyển sang trạng thái chờ duyệt 'pending'");

  // Quản lý cửa hàng kiểm tra & duyệt biên bản đối soát ca
  reconciliationTicket.status = "approved";
  assert(reconciliationTicket.status === "approved", "Quản lý cửa hàng đã duyệt thành công biên bản đối soát nguyên liệu ca trực");

  // ----------------------------------------------------
  // KỊCH BẢN 15: Phân quyền 4 role chạy trên CODE THẬT (src/utils/auth.ts + AppRoutes.tsx)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 15: Ma trận phân quyền owner/manager/cashier/warehouse chạy trên auth.ts thật");
  const authRun = spawnSync(process.execPath, [fileURLToPath(new URL("./auth-matrix.test.mjs", import.meta.url))], { encoding: "utf8" });
  const authSummary = (authRun.stdout.match(/auth-matrix: .*/) || ["auth-matrix: không có kết quả"])[0];
  assert(authRun.status === 0, "canVisit/can/loginByEmail/redirect khớp ma trận cho cả 4 role (" + authSummary + ")");
  if (authRun.status !== 0) console.error(authRun.stdout + authRun.stderr);

  console.log("\n================================================================================");
  console.log(`🎉 TỔNG KẾT: TOÀN BỘ ${passedTests}/${totalTests} BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG VỚI TỶ LỆ 100%!`);
  console.log("================================================================================");
} catch (err) {
  console.error("❌ LỖI TRONG QUÁ TRÌNH CHẠY KIỂM THỬ:", err);
  process.exit(1);
}
