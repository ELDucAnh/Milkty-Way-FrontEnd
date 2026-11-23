import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `
      export * as auth from "./src/utils/auth";
      export * as sales from "./src/pages/shared/sales-orders-store";
      export * as returns from "./src/pages/shared/sales-returns-store";
      export * as shifts from "./src/pages/shared/cash-shift-workflow";
      export * as kds from "./src/pages/shared/sales-preparation";
    `,
    resolveDir: process.cwd(),
  },
  write: false, bundle: true, platform: "node", format: "esm",
});
const { auth, sales, returns, shifts, kds } = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].contents).toString("base64")
);

class Storage {
  data = new Map();
  failOnce = "";
  getItem(key) { return this.data.get(key) ?? null; }
  removeItem(key) { this.data.delete(key); }
  setItem(key, value) {
    if (key === this.failOnce) {
      this.failOnce = "";
      throw Error("Storage write failed");
    }
    this.data.set(key, String(value));
  }
}
globalThis.localStorage = new Storage();
globalThis.sessionStorage = new Storage();
function login(email) {
  assert(auth.loginByEmail(email, "123456", false));
  return auth.currentStaff().staffId;
}
const cashier = () => login("anh.lqt@milktyway.vn");
const manager = () => login("ql.cn01@milktyway.vn");
const source = {
  ...sales.INITIAL_ORDERS[1],
  items: [{ ...sales.INITIAL_ORDERS[1].items[0], quantity: 3, unitPrice: 10000 }],
  subtotal: 30000, discount: 1001, tax: 2320, total: 31319,
  delivery: "delivered", shiftId: "past", counterId: "Q1",
};
const readOrder = id => sales.loadOrders().find(order => order.id === id);
const readInvoice = id => sales.loadInvoices().find(invoice => invoice.orderId === id);
function reset() {
  localStorage.data.clear();
  sessionStorage.data.clear();
  localStorage.setItem("miltyway_shifts_v1", "[]");
  sales.saveReturns([]);
  sales.saveOrders([source]);
  sales.saveInvoices([{
    ...sales.INITIAL_INVOICES[2], items: source.items,
    subtotal: source.subtotal, discount: source.discount, tax: source.tax,
    total: source.total, paid: source.total, change: 0,
  }]);
  return shifts.openApprovedCashShift({
    actorStaffId: cashier(), branchId: "CN01", counterId: "Q1", openingCash: 100000,
  });
}
function submit(extra = {}, order = source) {
  return returns.createReturnRequest({
    actorStaffId: cashier(), orderId: order.id, reason: "Sai món",
    selection: {
      scope: "single-item", resolutionType: "refund", recordMode: "amend-original",
      selectedLines: [{ itemId: order.items[0].id, quantity: 1 }],
      ...extra,
    },
  });
}
const review = (request, shift, extra = {}) => returns.reviewReturnRequest({
  actorStaffId: auth.currentStaff().staffId, decision: "Approved",
  note: "", requestId: request.id, cashShiftId: shift.id, ...extra,
});

let shift = reset();
const first = await submit();
const competing = await submit();
assert.deepEqual(readOrder(source.id), source);
await assert.rejects(review(first, shift));
login("ha.tt@milktyway.vn");
await assert.rejects(review(first, shift));
login("long.nh@milktyway.vn");
await assert.rejects(review(first, shift));
manager();
localStorage.failOnce = sales.STORAGE_INVOICES;
await assert.rejects(review(first, shift));
assert.deepEqual(readOrder(source.id), source);
assert.equal(localStorage.getItem(returns.RETURN_PENDING_KEY), null);
assert.equal(returns.loadReturnCashMovements().length, 0);
await review(first, shift);
assert.equal(readOrder(source.id).payment, "partially-refunded");
assert.equal(readInvoice(source.id).amendments[0].id, first.id);
await assert.rejects(review(first, shift));
await assert.rejects(review(competing, shift));
await review(competing, shift, { decision: "Rejected", note: "Trùng phiếu" });
for (let i = 0; i < 2; i++) {
  const request = await submit();
  manager();
  await review(request, shift);
}
assert.equal(readOrder(source.id).payment, "refunded");
assert.equal(readOrder(source.id).netTotal, 0);
assert.equal(readInvoice(source.id).refundedAmount, 31319);
assert.equal(readInvoice(source.id).total, 31319);
assert.deepEqual(shifts.getShiftCashSummary(shift), { cashSales: -31319, expectedCash: 68681 });
assert.deepEqual(kds.loadPreparationQueue(), []);

shift = reset();
const exchange = await submit({ resolutionType: "exchange", recordMode: "new-order" });
manager();
const approved = await review(exchange, shift);
const child = readOrder(approved.newCreatedOrderId);
assert.equal(child.parentOrderId, source.id);
assert.equal(readOrder(source.id).replacedByOrderId, child.id);
assert.equal(readInvoice(source.id).items.length, 1);
assert.equal(readInvoice(child.id).total, child.total);
assert.equal(child.items.reduce((n, line) => n + line.quantity, 0), 3);
assert.equal(readOrder(source.id).netTotal + child.netTotal, source.total);
assert.equal(returns.loadReturnCashMovements().length, 0);
assert.equal(kds.loadPreparationQueue().length, 1);
assert.equal(kds.loadPreparationQueue()[0].groups[0].quantity, 1);
assert.equal(kds.loadPreparationQueue()[0].status, "waiting");
const full = await submit({
  scope: "full-order",
  selectedLines: child.items.map(item => ({ itemId: item.id, quantity: item.quantity })),
}, child);
manager();
await review(full, shift);
assert.equal(readInvoice(child.id).refundedAmount, source.total);
assert.equal(kds.loadPreparationQueue().length, 0);

shift = reset();
const upgrade = await submit({
  resolutionType: "exchange",
  selectedLines: [{ itemId: source.items[0].id, quantity: 1, replacementSku: "TS01" }],
});
assert(upgrade.preview.additionalPaymentAmount > 0);
manager();
await assert.rejects(review(upgrade, shift));
await review(upgrade, shift, { confirmAdditionalPayment: true });
assert.equal(shifts.getShiftCashSummary(shift).cashSales, upgrade.preview.additionalPaymentAmount);
assert.equal(kds.loadPreparationQueue()[0].groups[0].quantity, 1);
assert.equal(readInvoice(source.id).items.length, 1);
console.log("PASS A4: partial/full refunds, rounding, permissions, rejection, retry, rollback, cash shifts, exchange, linked bills and KDS.");
