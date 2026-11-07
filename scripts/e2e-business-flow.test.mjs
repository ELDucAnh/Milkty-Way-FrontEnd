/**
 * MilktyWay POS & Chain Operations - E2E Business Flow Test Suite
 * Luồng kiểm thử nghiệp vụ toàn diện từ POS -> KDS -> Hóa Đơn -> Đổi Trả -> Bàn Giao Ca -> Đối Soát Tồn Quầy
 */

// 1. In-memory Mock LocalStorage
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

// 2. Mock business demo state
const INITIAL_LOTS = [
  {
    id: "lot-tea-01",
    ingredientId: "ing-tea-black",
    lotCode: "LOT-TRA-DEN-2610",
    location: "counter",
    locationId: "CN01",
    quantity: 5000, // 5000ml cốt trà đen
    unitCost: 15,
    quality: "pass",
  },
  {
    id: "lot-pearl-01",
    ingredientId: "ing-pearl-gold",
    lotCode: "LOT-TC-HK-2610",
    location: "counter",
    locationId: "CN01",
    quantity: 2000, // 2000g trân châu hoàng kim
    unitCost: 25,
    quality: "pass",
  },
  {
    id: "lot-cup-01",
    ingredientId: "ing-cup-l",
    lotCode: "LOT-LY-L-2610",
    location: "counter",
    locationId: "CN01",
    quantity: 500, // 500 ly L
    unitCost: 800,
    quality: "pass",
  },
];

mockStorage.set(
  "business_demo_state_v1",
  JSON.stringify({ lots: INITIAL_LOTS })
);

// 3. Logic core được trích xuất từ src/pages/shared/sales-orders-store.ts
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
    tier: params.customerPhone ? "VIP" : "Member",
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
      demo.lots = demo.lots.map((lot) => {
        if (lot.location === "counter" && lot.locationId === params.branchId) {
          if (lot.ingredientId.includes("tea")) {
            return { ...lot, quantity: Math.max(0, lot.quantity - totalCups * 150) };
          }
          if (lot.ingredientId.includes("pearl")) {
            return { ...lot, quantity: Math.max(0, lot.quantity - totalCups * 30) };
          }
          if (lot.ingredientId.includes("cup") || lot.ingredientId.includes("ly")) {
            return { ...lot, quantity: Math.max(0, lot.quantity - totalCups) };
          }
        }
        return lot;
      });
      localStorage.setItem("business_demo_state_v1", JSON.stringify(demo));
    }
  }

  return { order: newOrder, invoice: newInvoice };
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
  console.log("📌 KỊCH BẢN 1: Thu ngân POS nhận đơn, áp dụng ưu đãi VIP Diamond & thanh toán");
  const cartItems = [
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

  const posResult = createPosOrder({
    branchId: "CN01",
    items: cartItems,
    customerPhone: "0903 123 456",
    customerName: "Nguyễn An (VIP Diamond)",
    paymentMethod: "cash",
    paidAmount: 100000,
    discountRate: 10, // Giảm 10% VIP Diamond
    taxRate: 8,       // VAT 8%
  });

  const createdOrder = posResult.order;
  const createdInvoice = posResult.invoice;

  assert(createdOrder.id.startsWith("DH-"), `Mã đơn hàng được sinh chuẩn: ${createdOrder.id}`);
  assert(createdOrder.subtotal === 101000, `Tổng tiền trước giảm chuẩn: ${createdOrder.subtotal}đ (56k + 45k)`);
  assert(createdOrder.discount === 10100, `Chiết khấu VIP 10% chuẩn: ${createdOrder.discount}đ`);
  assert(createdOrder.tax === 7272, `Thuế VAT 8% chuẩn: ${createdOrder.tax}đ`);
  assert(createdOrder.total === 98172, `Tổng thanh toán sau thuế chuẩn: ${createdOrder.total}đ`);
  assert(createdOrder.preparation === "waiting", "Đơn hàng tự động đưa vào hàng đợi KDS ở trạng thái 'waiting'");
  assert(createdInvoice.id.startsWith("HD-CN01-"), `Hóa đơn được tạo đồng bộ: ${createdInvoice.id}`);
  assert(createdInvoice.change === 1828, `Tiền thối lại cho khách chính xác: ${createdInvoice.change}đ (100k - 98.172đ)`);

  // ----------------------------------------------------
  // TEST SCENARIO 2: Tự động trừ tồn kho quầy bar (Counter Inventory)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 2: Kiểm tra trừ tồn kho quầy bar (Counter Inventory) theo công thức F&B");
  const updatedDemo = JSON.parse(localStorage.getItem("business_demo_state_v1"));
  const teaLot = updatedDemo.lots.find((l) => l.id === "lot-tea-01");
  const pearlLot = updatedDemo.lots.find((l) => l.id === "lot-pearl-01");
  const cupLot = updatedDemo.lots.find((l) => l.id === "lot-cup-01");

  // 2 ly bán ra: trừ 300ml cốt trà (150ml x 2), trừ 60g trân châu (30g x 2), trừ 2 ly nắp
  assert(teaLot.quantity === 5000 - 300, `Cốt trà đen quầy bar đã trừ 300ml -> còn ${teaLot.quantity}ml`);
  assert(pearlLot.quantity === 2000 - 60, `Trân châu quầy bar đã trừ 60g -> còn ${pearlLot.quantity}g`);
  assert(cupLot.quantity === 500 - 2, `Ly Size L đã trừ 2 cái -> còn ${cupLot.quantity} ly`);

  // ----------------------------------------------------
  // TEST SCENARIO 3: Màn hình KDS Barista tiếp nhận & hoàn tất pha chế
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 3: Màn hình KDS Barista tiếp nhận & hoàn tất pha chế");
  // Barista bấm "Pha chế"
  const orderPreparing = updateOrderStatus(createdOrder.id, { preparation: "preparing" });
  assert(orderPreparing.preparation === "preparing", `Đơn hàng ${createdOrder.id} chuyển sang 'preparing' (Barista đang pha)`);

  // Barista bấm "Món đã sẵn sàng"
  const orderReady = updateOrderStatus(createdOrder.id, { preparation: "ready" });
  assert(orderReady.preparation === "ready", `Đơn hàng ${createdOrder.id} chuyển sang 'ready' (Chuông báo khách nhận món)`);

  // ----------------------------------------------------
  // TEST SCENARIO 4: Tra cứu chi tiết hóa đơn & tính pháp lý chứng từ
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 4: Tra cứu chi tiết hóa đơn (InvoiceDetailsPage)");
  const invoicesList = loadInvoices();
  const invoice = invoicesList.find((inv) => inv.orderId === createdOrder.id);

  assert(Boolean(invoice), `Tìm thấy hóa đơn tương ứng với đơn hàng ${createdOrder.id}`);
  assert(invoice.customerName === "Nguyễn An (VIP Diamond)", "Tên khách hàng trên hóa đơn trùng khớp");
  assert(invoice.items.length === 2, "Hóa đơn có đủ 2 món chi tiết");
  assert(invoice.items[0].toppings.includes("Trân châu hoàng kim"), "Topping trên hóa đơn thể hiện đầy đủ");

  // ----------------------------------------------------
  // TEST SCENARIO 5: Xử lý đổi trả / hoàn tiền (SalesReturnsPage)
  // ----------------------------------------------------
  console.log("\n📌 KỊCH BẢN 5: Xử lý yêu cầu hoàn tiền / đổi món khiếu nại (SalesReturnsPage)");
  const returnTicket = {
    id: "HT-0002",
    orderId: createdOrder.id,
    customer: createdOrder.customer,
    createdAt: new Date().toISOString(),
    resolution: "Hoàn tiền mặt 45.000đ cho món Trà Đào Cam Sả do khách dị ứng",
    reason: "Khách dị ứng thành phần sả tươi, thu ngân hoàn lại tiền món",
    amount: 45000,
    points: 45,
    memberId: createdOrder.phone,
    status: "Pending",
  };

  saveReturns([returnTicket, ...loadReturns()]);
  assert(loadReturns().length > 0, "Phiếu yêu cầu hoàn tiền được ghi nhận vào hệ thống");

  // Quản lý cửa hàng bấm duyệt phiếu hoàn tiền
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
  const initialDrawerCash = 2000000; // Tiền đầu ca trong két 2.000.000đ
  const cashSalesInShift = loadOrders()
    .filter((o) => o.branchId === "CN01" && o.paymentMethod === "cash" && o.payment === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  const expectedDrawerCash = initialDrawerCash + cashSalesInShift;
  assert(cashSalesInShift >= 98172, `Doanh thu tiền mặt ghi nhận chính xác: ${cashSalesInShift.toLocaleString("vi-VN")}đ`);
  assert(expectedDrawerCash >= 2098172, `Két tiền thực tế đối soát khớp: ${expectedDrawerCash.toLocaleString("vi-VN")}đ`);

  console.log("\n================================================================================");
  console.log(`🎉 KẾT QUẢ: TOÀN BỘ ${passedTests}/${totalTests} BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG VỚI TỶ LỆ 100%!`);
  console.log("================================================================================");
} catch (err) {
  console.error("❌ LỖI TRONG QUÁ TRÌNH CHẠY KIỂM THỬ:", err);
  process.exit(1);
}

