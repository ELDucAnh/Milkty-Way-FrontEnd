/**
 * Kiểm thử phân quyền THẬT: biên dịch và import trực tiếp src/utils/auth.ts
 * (không dùng object tự khai báo), đối chiếu với toàn bộ route trong AppRoutes.tsx.
 * Chạy: node scripts/auth-matrix.test.mjs
 */
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), "utf8");

// ---- Giả lập storage của trình duyệt ----
const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
};
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

const js = transformSync(read("src/utils/auth.ts"), { loader: "ts", format: "esm" }).code;
const auth = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

let passed = 0;
const failures = [];
function check(cond, message) {
  if (cond) passed++;
  else failures.push(message);
}

const ROLES = { owner: "O", manager: "M", cashier: "C", warehouse: "W" };
const EMAIL = {
  owner: "long.nh@milktyway.vn",
  manager: "ha.tt@milktyway.vn",
  cashier: "anh.lqt@milktyway.vn",
  warehouse: "khoa.vm@milktyway.vn",
};

// ---- Ma trận route kỳ vọng (O=owner, M=quản lý CN, C=nhân viên POS, W=nhân viên kho) ----
const ROUTES = {
  "/dashboard": "OM",
  "/sales": "OMC", "/sales/pos": "OC", "/sales/returns": "OMC", "/sales/shifts": "OMC",
  "/sales/preparation": "OMC", "/sales/promotions": "OMCW",
  "/customers": "O",
  "/marketing": "OMCW", "/marketing/promotions": "OMCW", "/marketing/branch-promotions": "O",
  "/inventory": "OMCW", "/inventory/products": "OMCW", "/inventory/products/new": "O",
  "/inventory/products/:id": "O", "/inventory/add-product": "O", "/inventory/branches": "O",
  "/inventory/categories": "O", "/inventory/ingredients": "OMW", "/inventory/stock-adjustment": "OMW",
  "/inventory/units": "O",
  "/production": "O", "/production/recipes": "O", "/production/batches": "OW",
  "/purchases": "OM", "/purchases/new": "OM", "/purchases/add-purchase": "OM", "/purchases/purchases": "OM",
  "/purchases/transfers": "OW", "/purchases/receipts": "OW", "/purchases/stock-transfers": "OW",
  "/distribution": "OM", "/distribution/planning": "OM",
  "/stores": "OMW", "/stores/ingredients": "OMW", "/stores/shift-reconciliation": "OW",
  "/invoices": "OMC", "/invoices/invoices": "OMC", "/invoices/:id": "OMC", "/invoices/invoice-details": "OMC",
  "/expenses": "O", "/expenses/expenses": "O",
  "/suppliers": "O", "/suppliers/suppliers": "O",
  "/users": "OM", "/users/users": "OM", "/users/roles": "OM",
  "/reports": "OM", "/reports/sales-report": "OM", "/reports/inventory-report": "OMW",
  "/reports/profit-loss": "OM", "/reports/customer-report": "O", "/reports/purchase-report": "O",
  "/reports/supplier-report": "O",
  "/settings": "O", "/settings/general": "O", "/settings/inventory": "O", "/settings/sales": "O",
  "/settings/purchases": "O", "/settings/notifications": "O", "/settings/offline-sync": "O",
  "/profile": "OMCW", "/pages/profile": "OMCW",
};

// ---- Ma trận action kỳ vọng ----
const ACTIONS = [
  "product.manage", "product.lockAtBranch", "promotion.manage", "ingredient.manage",
  "stock.count", "stock.approveAdjustment", "purchase.create", "purchase.receive",
  "batch.manage", "transfer.manage", "pos.use", "order.create", "order.reportShortage",
  "payment.refundReview", "complaint.handle", "user.manageBranch", "role.assign",
];
const ALLOWED_ACTIONS = {
  manager: ["product.lockAtBranch", "ingredient.manage", "stock.approveAdjustment", "purchase.create",
    "payment.refundReview", "complaint.handle", "user.manageBranch", "role.assign"],
  cashier: ["pos.use", "order.create", "order.reportShortage"],
  warehouse: ["order.reportShortage", "purchase.receive", "batch.manage", "transfer.manage", "stock.count"],
};

// 1. Mọi route thật trong AppRoutes phải có trong ma trận kỳ vọng
const routesSrc = read("src/routes/AppRoutes.tsx");
const AUTH_PATHS = new Set(["/login", "/pages/login", "/logout", "/register", "/pages/register",
  "/forgot-password", "/pages/forgot-password", "/reset-password", "/pages/reset-password", "*"]);
const realPaths = [...routesSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => !AUTH_PATHS.has(p));
for (const p of realPaths) check(p in ROUTES, `Route "${p}" có trong AppRoutes nhưng thiếu trong ma trận test`);
for (const p of Object.keys(ROUTES)) check(realPaths.includes(p), `Ma trận test có route "${p}" không tồn tại trong AppRoutes`);

// 2. canVisit theo từng role
for (const [role, letter] of Object.entries(ROLES)) {
  for (const [path, who] of Object.entries(ROUTES)) {
    const expected = who.includes(letter);
    check(auth.canVisit(path, role) === expected, `canVisit("${path}", ${role}) phải là ${expected}`);
  }
}
check(auth.canVisit("/login", "cashier") === false, "Đã đăng nhập thì /login bị chặn (guard đẩy về trang chủ)");
check(auth.canVisit("/khong-ton-tai", "manager") === false, "Route lạ bị chặn với manager");
check(auth.canVisit("/dashboard", null) === false, "Chưa đăng nhập không được vào /dashboard");

// 3. Mọi redirect trong AppRoutes phải trỏ tới trang role đó vào được
const redirects = [...routesSrc.matchAll(/path="([^"]+)" element=\{<Navigate to="([^"]+)"/g)]
  .filter(([, from]) => !AUTH_PATHS.has(from));
for (const [, from, to] of redirects) {
  if (!(from in ROUTES)) continue;
  for (const role of Object.keys(ROLES)) {
    if (auth.canVisit(from, role)) check(auth.canVisit(to, role), `${role} vào "${from}" nhưng redirect "${to}" bị chặn`);
  }
}

// 4. homePath phải là trang vào được
for (const role of Object.keys(ROLES)) {
  check(auth.canVisit(auth.homePath(role), role), `homePath(${role}) = ${auth.homePath(role)} không vào được`);
}
check(auth.homePath("cashier") === "/sales/pos", "Home POS là /sales/pos");
check(auth.homePath("warehouse") === "/inventory/ingredients", "Home kho là /inventory/ingredients");
check(auth.homePath("manager") === "/dashboard", "Home quản lý là /dashboard");

// 5. can() theo từng role
for (const role of Object.keys(ROLES)) {
  for (const action of ACTIONS) {
    const expected = role === "owner" ? true : ALLOWED_ACTIONS[role].includes(action);
    check(auth.can(action, role) === expected, `can("${action}", ${role}) phải là ${expected}`);
  }
}

// 6. Đăng nhập: tự nhận diện role từ email, đúng mật khẩu, phiên, phạm vi chi nhánh
const SCOPE = { owner: null, manager: "CN05", cashier: "CN01", warehouse: null };
for (const [role, email] of Object.entries(EMAIL)) {
  localStorage.clear(); sessionStorage.clear();
  check(auth.loginByEmail(email, "sai-mat-khau", true) === null, `${role}: sai mật khẩu phải bị từ chối`);
  check(auth.checkLogin() === null, `${role}: đăng nhập thất bại không được tạo phiên`);
  check(auth.loginByEmail(email.toUpperCase(), "123456", false) === role, `${role}: email không phân biệt hoa thường`);
  check(auth.checkLogin() === role, `${role}: phiên lưu đúng role`);
  check(auth.scopedBranch() === SCOPE[role], `${role}: scopedBranch phải là ${SCOPE[role]}`);
  check(auth.sessionUser().role === role && auth.sessionUser().email === email, `${role}: sessionUser khớp tài khoản`);
  auth.logout();
  check(auth.checkLogin() === null, `${role}: logout xóa phiên`);
}
check(auth.loginByEmail("ai.do@milktyway.vn", "123456", true) === null, "Email lạ phải bị từ chối");

// 7. Đổi mật khẩu ở hồ sơ có hiệu lực (cashier / manager / warehouse)
for (const role of ["cashier", "manager", "warehouse"]) {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem(`milktyway.${role}.password`, "matkhaumoi8");
  check(auth.loginByEmail(EMAIL[role], "123456", true) === null, `${role}: mật khẩu cũ hết hiệu lực sau khi đổi`);
  check(auth.loginByEmail(EMAIL[role], "matkhaumoi8", true) === role, `${role}: mật khẩu mới đăng nhập được`);
}

// 8. Tên hiển thị
localStorage.clear(); sessionStorage.clear();
auth.loginByEmail(EMAIL.warehouse, "123456", true);
localStorage.setItem("milktyway.warehouse.name", "Nguyễn Kho Mới");
check(auth.sessionUser().name === "Nguyễn Kho Mới", "Tên đã chỉnh của NV kho được hiển thị");

// 9. Code các trang không còn hardcode link /dashboard cho role bị chặn
for (const file of ["src/pages/NotFoundPage.tsx", "src/pages/purchases/PurchasesPage.tsx", "src/pages/users/UsersPage.tsx", "src/pages/ModulePendingPage.tsx"]) {
  check(!read(file).includes('to="/dashboard"'), `${file} còn hardcode to="/dashboard", cần dùng homePath()`);
}

console.log(`\nauth-matrix: ${passed} kiểm tra đạt, ${failures.length} lỗi`);
if (failures.length) {
  for (const f of failures) console.error("  ❌ " + f);
  process.exit(1);
}
console.log("✅ Ma trận phân quyền (canVisit / can / đăng nhập / redirect) khớp với code thật.");

