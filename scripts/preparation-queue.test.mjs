import assert from "node:assert/strict";
import { createServer } from "vite";

class MemoryStorage {
  values = new Map();
  failKey = null;

  get length() {
    return this.values.size;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key) {
    return this.values.get(String(key)) ?? null;
  }

  setItem(key, value) {
    if (key === this.failKey) {
      throw new Error("Simulated storage write failure");
    }
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }

  clear() {
    this.values.clear();
    this.failKey = null;
  }
}

const local = new MemoryStorage();
const session = new MemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: local,
});

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: session,
});

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const kds = await server.ssrLoadModule(
    "/src/pages/shared/sales-preparation.ts",
  );
  const store = await server.ssrLoadModule(
    "/src/pages/shared/sales-orders-store.ts",
  );
  const auth = await server.ssrLoadModule("/src/utils/auth.ts");

  function login(staffId) {
    session.setItem(
      auth.STAFF_SESSION_KEY,
      JSON.stringify({ version: 2, staffId }),
    );
  }

  function makeItem(overrides = {}) {
    return {
      id: "line-1",
      productId: "TS01",
      sku: "TS01",
      posProductId: 1,
      name: "Tên snapshot lịch sử",
      size: "M",
      sugar: "50%",
      ice: "Ít đá",
      toppings: [],
      note: "",
      quantity: 1,
      unitPrice: 12345,
      ...overrides,
    };
  }

  function makeOrder(overrides = {}) {
    return {
      ...structuredClone(store.INITIAL_ORDERS[1]),
      id: "DH-A2-TEST",
      branchId: "CN01",
      channel: "counter",
      preparation: "waiting",
      delivery: "pickup",
      payment: "paid",
      createdAt: "2026-11-17T00:00:00.000Z",
      items: [makeItem()],
      orderNote: "Ghi chú toàn đơn phải được giữ",
      ...overrides,
    };
  }

  function seed(orders) {
    local.clear();
    local.setItem(store.STORAGE_ORDERS, JSON.stringify(orders));
    local.setItem(store.STORAGE_INVOICES, '{"sentinel":"historical-bill"}');
    local.setItem("inventory-sentinel", '{"quantity":987}');
    login("NV-POS-01");
  }

  function act(overrides = {}) {
    return {
      orderId: "DH-A2-TEST",
      branchId: "CN01",
      expectedStatus: "waiting",
      actorStaffId: "NV-POS-01",
      action: "start",
      ...overrides,
    };
  }

  // Hai dòng giống nhau gom lại; khác đường hoặc note phải tách.
  const grouped = kds.groupPreparationItems([
    makeItem({ id: "a" }),
    makeItem({ id: "b" }),
    makeItem({ id: "c", sugar: "70%" }),
    makeItem({ id: "d", note: "Để topping riêng" }),
  ]);

  assert.equal(grouped.length, 3);
  assert.equal(grouped[0].quantity, 2);
  assert.equal(grouped[0].sources.length, 2);

  for (const quantity of [0, -1, 0.5, NaN, Infinity]) {
    assert.throws(() => kds.groupPreparationItems([makeItem({ quantity })]));
  }
  assert.throws(() => kds.groupPreparationItems([makeItem({ toppings: null })]));
  assert.throws(() => kds.groupPreparationItems([
    makeItem({ quantity: Number.MAX_SAFE_INTEGER }), makeItem({ id: "overflow" }),
  ]));

  // Note không bị trim để ghép nhầm.
  assert.equal(
    kds.groupPreparationItems([
      makeItem({ note: "ghi chú" }),
      makeItem({ id: "b", note: "ghi chú " }),
    ]).length,
    2,
  );

  // Thứ tự topping không ảnh hưởng nhóm.
  assert.equal(
    kds.groupPreparationItems([
      makeItem({
        toppings: ["Pudding trứng", "Trân châu hoàng kim"],
      }),
      makeItem({
        id: "b",
        toppings: ["Trân châu hoàng kim", "Pudding trứng"],
      }),
    ]).length,
    1,
  );

  // Khác size, đá hoặc topping phải tách.
  for (const different of [
    { size: "L" },
    { ice: "Không đá" },
    { toppings: ["Pudding trứng"] },
  ]) {
    assert.equal(
      kds.groupPreparationItems([
        makeItem(),
        makeItem({ id: "b", ...different }),
      ]).length,
      2,
    );
  }

  // Ly vẫn truy được về dòng gốc, không chỉ còn summary.
  const cups = kds.groupPreparationItems([
    makeItem({ quantity: 2 }),
    makeItem({ id: "line-2" }),
  ])[0];

  assert.equal(kds.getPreparationCup(cups, 0).item.id, "line-1");
  assert.equal(kds.getPreparationCup(cups, 1).cupNumber, 2);
  assert.equal(kds.getPreparationCup(cups, 2).item.id, "line-2");
  assert.equal(kds.getPreparationCup(cups, 3), null);

  // Không mapping theo tên hay numeric ID đơn độc.
  const legacy = makeItem({
    productId: undefined,
    sku: undefined,
    posProductId: 1,
    name: "Trà sữa trân châu",
  });

  assert.equal(kds.resolvePreparationProduct(legacy).product, null);
  assert.equal(kds.buildPreparationRecipe(legacy, 1).rows.length, 0);
  assert.equal(
    kds.groupPreparationItems([
      legacy,
      { ...legacy, id: "legacy-2" },
    ]).length,
    2,
  );

  assert.equal(
    kds.resolvePreparationProduct(makeItem({ sku: "UNKNOWN" })).product,
    null,
  );
  assert.equal(
    kds.resolvePreparationProduct(makeItem({ posProductId: 2 })).product,
    null,
  );

  // Recipe dùng SKU, không dùng tên snapshot để tra gần đúng.
  const snapshot = makeItem({
    size: "L",
    sugar: "50%",
    ice: "Ít đá",
    toppings: ["Pudding trứng"],
  });

  const beforeRecipe = JSON.stringify(snapshot);
  const preview = kds.buildPreparationRecipe(snapshot, 2);

  assert.equal(preview.complete, true);
  assert.equal(preview.product.sku, "TS01");
  assert.equal(
    preview.rows.find(row => row.name === "Cốt hồng trà").previewAmount,
    375,
  );
  assert.equal(
    preview.rows.find(row => row.name === "Nước đường").previewAmount,
    31.25,
  );
  assert.equal(
    preview.rows.find(row => row.name === "Đá viên").previewAmount,
    225,
  );
  assert.equal(
    preview.rows.find(row => row.name === "Pudding trứng").previewAmount,
    80,
  );
  assert.equal(JSON.stringify(snapshot), beforeRecipe);

  const noSugarIce = kds.buildPreparationRecipe(
    makeItem({ sugar: "0%", ice: "Không đá" }),
    1,
  );

  assert.equal(
    noSugarIce.rows.find(row => row.name === "Nước đường").previewAmount,
    0,
  );
  assert.equal(
    noSugarIce.rows.find(row => row.name === "Đá viên").previewAmount,
    0,
  );

  // Topping lạ/tùy chọn cũ chưa hỗ trợ: cảnh báo, không đoán.
  assert.equal(
    kds.buildPreparationRecipe(
      makeItem({ toppings: ["Kem phô mai macchiato"] }),
      1,
    ).complete,
    false,
  );
  assert.equal(
    kds.buildPreparationRecipe(makeItem({ sugar: "60%" }), 1).rows.length,
    0,
  );

  // Scope CN và loại bỏ đơn hết điều kiện, kể cả với owner.
  seed([
    makeOrder(),
    makeOrder({ id: "OTHER-BRANCH", branchId: "CN02" }),
    makeOrder({ id: "DELIVERED", delivery: "delivered" }),
    makeOrder({ id: "REFUNDED", payment: "refunded" }),
    makeOrder({ id: "REJECTED", onlineDecision: "rejected" }),
    makeOrder({ id: "ONLINE-PENDING", channel: "online", preparation: null }),
  ]);

  assert.deepEqual(
    kds.loadPreparationQueue().map(order => order.id),
    ["DH-A2-TEST"],
  );

  login("NV-ADMIN-01");
  assert.deepEqual(
    kds.loadPreparationQueue().map(order => order.id),
    ["DH-A2-TEST", "OTHER-BRANCH"],
  );
  assert.equal(kds.canManagePreparation("CN01"), false);

  // Chuyển bước lưu thật và tải lại; không thay giá/bill/kho.
  const original = makeOrder();
  seed([original]);

  const billBefore = local.getItem(store.STORAGE_INVOICES);
  const inventoryBefore = local.getItem("inventory-sentinel");

  kds.changePreparation(act());
  assert.equal(store.loadOrders()[0].preparation, "preparing");
  assert.equal(kds.loadPreparationQueue()[0].status, "preparing");

  // Snapshot cũ không được nhảy thêm bước.
  const afterStart = local.getItem(store.STORAGE_ORDERS);
  assert.throws(() => kds.changePreparation(act()));
  assert.equal(local.getItem(store.STORAGE_ORDERS), afterStart);

  kds.changePreparation(act({
    expectedStatus: "preparing",
    action: "ready",
  }));
  assert.equal(kds.loadPreparationQueue()[0].status, "ready");

  kds.changePreparation(act({
    expectedStatus: "ready",
    action: "handover",
  }));

  const finalOrder = store.loadOrders()[0];

  assert.equal(finalOrder.delivery, "delivered");
  assert.deepEqual(
    finalOrder,
    { ...original, preparation: "ready", delivery: "delivered" },
  );
  assert.deepEqual(kds.loadPreparationQueue(), []);
  assert.equal(local.getItem(store.STORAGE_INVOICES), billBefore);
  assert.equal(local.getItem("inventory-sentinel"), inventoryBefore);
  assert.throws(() => kds.changePreparation(act({
    expectedStatus: "ready",
    action: "handover",
  })));

  // Không được ready trực tiếp từ waiting.
  seed([makeOrder()]);
  assert.throws(() => kds.changePreparation(act({ action: "ready" })));

  // Đổi phiên cùng CN sau render cũng bị chặn.
  seed([makeOrder()]);
  login("NV-QL-CN01");
  assert.throws(() => kds.changePreparation(act()));

  // Manager đúng CN có thể thao tác bằng chính staffId của mình.
  kds.changePreparation(act({ actorStaffId: "NV-QL-CN01" }));
  assert.equal(store.loadOrders()[0].preparation, "preparing");

  // Sai CN, owner và guest không ghi được.
  for (const staffId of ["NV-POS-CN02", "NV-ADMIN-01"]) {
    seed([makeOrder()]);
    login(staffId);
    assert.throws(() => kds.changePreparation(act({
      actorStaffId: staffId,
    })));
  }

  seed([makeOrder()]);
  session.clear();
  assert.throws(() => kds.changePreparation(act()));

  // Đơn đã bị refund sau khi UI đọc: không ghi.
  seed([makeOrder({ payment: "refunded" })]);
  assert.throws(() => kds.changePreparation(act()));

  // Không chèn ghi KDS vào checkout journal đang tồn tại.
  seed([makeOrder()]);
  local.setItem(store.CHECKOUT_PENDING_KEY, '{"pending":true}');
  assert.throws(() => kds.changePreparation(act()));

  // Lỗi ghi phải ném lỗi, không đổi dữ liệu.
  seed([makeOrder()]);
  const beforeFailure = local.getItem(store.STORAGE_ORDERS);
  local.failKey = store.STORAGE_ORDERS;
  assert.throws(() => kds.changePreparation(act()));
  assert.equal(local.getItem(store.STORAGE_ORDERS), beforeFailure);
  local.failKey = null;

  // [] hợp lệ; JSON hỏng không bị seed/ghi đè.
  seed([]);
  assert.deepEqual(kds.loadPreparationQueue(), []);

  local.setItem(store.STORAGE_ORDERS, "{invalid-json");
  assert.throws(() => kds.loadPreparationQueue());
  assert.throws(() => kds.changePreparation(act()));
  assert.equal(local.getItem(store.STORAGE_ORDERS), "{invalid-json");

  console.log("PASS: A2 grouping, recipes, scope, transitions, persistence and guards.");
} finally {
  await server.close();
}
