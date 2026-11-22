import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `
      export * as auth from "./src/utils/auth";
      export * as sales from "./src/pages/shared/sales-orders-store";
      export * as promotions from "./src/pages/shared/promotions-store";
      export * as returns from "./src/pages/shared/sales-returns-store";
    `, resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: "node", format: "esm",
});
const { auth, sales, promotions: p, returns: r } = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].contents).toString("base64")
);
class Storage {
  data = new Map();
  fail = "";
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) {
    if (this.fail === key) { this.fail = ""; throw Error("write failed"); }
    this.data.set(key, String(value));
  }
  removeItem(key) { this.data.delete(key); }
}
globalThis.localStorage = new Storage();
globalThis.sessionStorage = new Storage();
const login = email => auth.loginByEmail(email, "123456", false);
const owner = () => login("long.nh@milktyway.vn");
const cashier = () => login("anh.lqt@milktyway.vn");
const campaign = {
  ...p.initialPromotions[0], id: "TEST", code: "TEST",
  branchMode: "all", branchIds: [], channel: "all", shift: "all",
  startDate: "2020-01-01", endDate: "2099-12-31",
  hourFrom: "00:00", hourTo: "23:59", status: "active",
  discountType: "percent", discountValue: 10, budget: 100000,
  usageLimit: 100, stackWithMemberTier: true,
};
const item = {
  id: "line", productId: "TS01", name: "Tea", size: "M",
  sugar: "50%", ice: "Vừa đá", toppings: [], note: "",
  quantity: 2, unitPrice: 39000,
};
const quoteInput = {
  items: [item], branchId: "CN01", channel: "counter",
  discountRate: 0, flatDiscount: 0, taxRate: 10, promotionCodes: ["TEST"],
};
function seed(overrides = {}) {
  localStorage.data.clear();
  localStorage.setItem(p.STORAGE_PROMOTIONS, JSON.stringify([{ ...campaign, ...overrides }]));
  cashier();
}
seed();
const quote = p.quotePromotionCheckout(quoteInput);
assert.equal(quote.total, 77220);
const input = {
  ...quoteInput, staffId: auth.currentStaff().staffId,
  counterId: "Q1", shiftId: "CA-001", checkoutId: "checkout",
  paymentMethod: "transfer", paidAmount: quote.total, expectedTotal: quote.total,
};
localStorage.fail = p.PROMOTION_REDEMPTIONS_KEY;
await assert.rejects(sales.createPosOrderExclusive(input));
assert.equal(p.loadPromotions()[0].usageCount, 0);
assert.equal(localStorage.getItem(sales.CHECKOUT_PENDING_KEY), null);
const sale = await sales.createPosOrderExclusive(input);
assert.equal(p.loadPromotions()[0].usageCount, 1);
assert.equal(p.loadPromotions()[0].budgetUsed, 7800);
assert.equal((await sales.createPosOrderExclusive(input)).order.id, sale.order.id);
assert.equal(p.loadPromotionRedemptions().length, 1);
const preview = r.getReturnCostPreview(sale.order, {
  scope: "single-item", resolutionType: "refund", recordMode: "amend-original",
  selectedLines: [{ itemId: item.id, quantity: 1 }],
});
assert.equal(preview.autoRefundAmount, 38610);
assert.equal(sale.order.items[0].paidDiscountAmount, 7800);
assert.equal(sale.invoice.items[0].paidTaxAmount, 7020);

for (const overrides of [
  { budget: 1 }, { usageLimit: 1, usageCount: 1 },
  { endDate: "2020-01-02" }, { branchMode: "exclude", branchIds: ["CN01"] },
]) {
  seed(overrides);
  assert.throws(() => p.quotePromotionCheckout(quoteInput));
}
seed();
await assert.rejects(p.setBranchPromotions("CN01", false, "TEST"));
login("ql.cn01@milktyway.vn");
await assert.rejects(p.upsertPromotion(campaign, 1));
owner();
await p.setBranchPromotions("CN01", false, "TEST");
assert.equal(p.promotionAppliesAtBranch(p.loadPromotions()[0], "CN01"), false);
assert.equal(p.promotionAppliesAtBranch(p.loadPromotions()[0], "CN02"), true);
await p.setBranchPromotions("CN01", true, "TEST");
assert.equal(p.promotionAppliesAtBranch(p.loadPromotions()[0], "CN01"), true);

seed({ oncePerMember: true });
assert.throws(() => p.quotePromotionCheckout(quoteInput));
const memberInput = { ...input, customerPhone: "0903 123 456" };
await sales.createPosOrderExclusive(memberInput);
assert.throws(() => p.quotePromotionCheckout({ ...quoteInput, customerPhone: "0903123456" }));
assert(p.quotePromotionCheckout({ ...quoteInput, customerPhone: "0908123456" }));

seed({ usageScope: "daily", usageLimit: 1 });
await sales.createPosOrderExclusive(input);
assert.throws(() => p.quotePromotionCheckout(quoteInput));
assert(p.quotePromotionCheckout({ ...quoteInput, now: new Date(Date.now() + 86400000) }));
seed({ usageScope: "branch", usageLimit: 1 });
await sales.createPosOrderExclusive(input);
assert.throws(() => p.quotePromotionCheckout(quoteInput));
assert(p.quotePromotionCheckout({ ...quoteInput, branchId: "CN02" }));
seed({ discountType: "buy_x_get_y", buyQuantity: 2, giftQuantity: 1 });
assert.throws(() => p.quotePromotionCheckout(quoteInput));
assert.equal(p.quotePromotionCheckout({
  ...quoteInput, items: [{ ...item, quantity: 3 }],
}).discount, 39000);
localStorage.setItem(p.STORAGE_PROMOTIONS, "[]");
assert.deepEqual(p.loadPromotions(), []);
localStorage.setItem(p.STORAGE_PROMOTIONS, "{");
assert.throws(() => p.loadPromotions());
console.log("PASS A5: quotas, budgets, branch scope, owner guards, membership, daily reset, checkout retry/rollback and A4 allocation.");
