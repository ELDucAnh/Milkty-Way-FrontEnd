/**
 * Import và kiểm tra trực tiếp src/utils/auth.ts.
 * Chạy: node scripts/auth-matrix.test.mjs
 */
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const root = new URL("../", import.meta.url);
const read = rel => readFileSync(new URL(rel, root), "utf8");

function makeStorage() {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: key => void map.delete(key),
    clear: () => map.clear(),
  };
}

globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

const js = transformSync(read("src/utils/auth.ts"), {
  loader: "ts",
  format: "esm",
}).code;

const auth = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

let passed = 0;
const failures = [];

function check(condition, message) {
  if (condition) passed++;
  else failures.push(message);
}

function reset() {
  localStorage.clear();
  sessionStorage.clear();
}

function throws(fn) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const ROLES = {
  owner: "O",
  manager: "M",
  cashier: "C",
  warehouse: "W",
};

const EMAIL = {
  owner: "long.nh@milktyway.vn",
  manager: "ha.tt@milktyway.vn",
  cashier: "anh.lqt@milktyway.vn",
  warehouse: "khoa.vm@milktyway.vn",
};

const ROUTES = {
  "/dashboard": "OM",
  "/sales": "OMC",
  "/sales/pos": "OC",
  "/sales/returns": "OMC",
  "/sales/shifts": "OMC",
  "/sales/preparation": "OMC",
  "/sales/promotions": "OMCW",
  "/customers": "O",
  "/marketing": "OMCW",
  "/marketing/promotions": "OMCW",
  "/marketing/branch-promotions": "OMC",
  "/inventory": "OMCW",
  "/inventory/products": "OMCW",
  "/inventory/products/new": "O",
  "/inventory/products/:id": "O",
  "/inventory/add-product": "O",
  "/inventory/branches": "O",
  "/inventory/categories": "O",
  "/inventory/ingredients": "OMW",
  "/inventory/stock-adjustment": "OMW",
  "/inventory/units": "O",
  "/production": "O",
  "/production/recipes": "O",
  "/production/batches": "OW",
  "/production/planning": "OMW",
  "/purchases": "OM",
  "/purchases/new": "OM",
  "/purchases/add-purchase": "OM",
  "/purchases/purchases": "OM",
  "/purchases/transfers": "OW",
  "/purchases/receipts": "OW",
  "/purchases/stock-transfers": "OW",
  "/distribution": "OMW",
  "/distribution/planning": "OMW",
  "/stores": "OMW",
  "/stores/ingredients": "OMW",
  "/stores/shift-reconciliation": "OMW",
  "/invoices": "OMC",
  "/invoices/invoices": "OMC",
  "/invoices/:id": "OMC",
  "/invoices/invoice-details": "OMC",
  "/expenses": "O",
  "/expenses/expenses": "O",
  "/suppliers": "O",
  "/suppliers/suppliers": "O",
  "/users": "OM",
  "/users/users": "OM",
  "/users/roles": "OM",
  "/reports": "OM",
  "/reports/sales-report": "OM",
  "/reports/inventory-report": "OMW",
  "/reports/profit-loss": "OM",
  "/reports/customer-report": "O",
  "/reports/purchase-report": "O",
  "/reports/supplier-report": "O",
  "/settings": "O",
  "/settings/general": "O",
  "/settings/inventory": "O",
  "/settings/sales": "O",
  "/settings/purchases": "O",
  "/settings/notifications": "O",
  "/settings/offline-sync": "O",
  "/profile": "OMCW",
  "/pages/profile": "OMCW",
};

const ACTIONS = [
  "product.manage",
  "product.lockAtBranch",
  "promotion.manage",
  "ingredient.manage",
  "stock.count",
  "stock.approveAdjustment",
  "purchase.create",
  "purchase.receive",
  "batch.manage",
  "transfer.manage",
  "pos.use",
  "order.create",
  "order.reportShortage",
  "payment.refundReview",
  "complaint.handle",
  "user.manageBranch",
  "role.assign",
  "shift.openBranch",
  "shift.closeRequestBranch",
  "shift.verifySecondParty",
  "staff.assignBranch",
];

const ALLOWED_ACTIONS = {
  manager: [
    "product.lockAtBranch",
    "ingredient.manage",
    "stock.approveAdjustment",
    "purchase.create",
    "payment.refundReview",
    "complaint.handle",
    "user.manageBranch",
    "role.assign",
    "shift.openBranch",
    "shift.closeRequestBranch",
    "shift.verifySecondParty",
  ],
  cashier: [
    "pos.use",
    "order.create",
    "order.reportShortage",
    "shift.openBranch",
    "shift.closeRequestBranch",
  ],
  warehouse: [
    "order.reportShortage",
    "purchase.receive",
    "batch.manage",
    "transfer.manage",
    "stock.count",
  ],
};

const SHIFT_ACTIONS = new Set([
  "shift.openBranch",
  "shift.closeRequestBranch",
  "shift.verifySecondParty",
]);

// 1. Đối chiếu route thật.
const routesSrc = read("src/routes/AppRoutes.tsx");

const AUTH_PATHS = new Set([
  "/login", "/pages/login", "/logout",
  "/register", "/pages/register",
  "/forgot-password", "/pages/forgot-password",
  "/reset-password", "/pages/reset-password", "*",
]);

const realPaths = [...routesSrc.matchAll(/path="([^"]+)"/g)]
  .map(match => match[1])
  .filter(path => !AUTH_PATHS.has(path));

for (const path of realPaths) {
  check(path in ROUTES, `Route "${path}" thiếu trong ma trận`);
}

for (const path of Object.keys(ROUTES)) {
  check(
    realPaths.includes(path),
    `Ma trận có "${path}" nhưng AppRoutes không có`,
  );
}

for (const [role, letter] of Object.entries(ROLES)) {
  for (const [path, who] of Object.entries(ROUTES)) {
    check(
      auth.canVisit(path, role) === who.includes(letter),
      `canVisit("${path}", "${role}") sai`,
    );
  }

  check(
    auth.canVisit("/production/planning", role) ===
      auth.canVisit("/distribution/planning", role),
    `${role}: hai URL planning phải cùng chính sách`,
  );

  check(
    auth.canVisit(auth.homePath(role), role),
    `${role}: homePath phải truy cập được`,
  );
}

check(
  !auth.canVisit("/sales/pos", null),
  "Guest không vào được POS",
);
check(
  !auth.canVisit("/dashboard", null),
  "Guest không vào được dashboard",
);
check(
  !auth.canVisit("/khong-ton-tai", "manager"),
  "Manager không vào route lạ",
);
check(auth.homePath(null) === "/login", "Guest homePath là /login");

const redirects = [
  ...routesSrc.matchAll(
    /path="([^"]+)" element=\{<Navigate to="([^"]+)"/g,
  ),
].filter(([, from]) => !AUTH_PATHS.has(from));

for (const [, from, to] of redirects) {
  if (!(from in ROUTES)) continue;

  for (const role of Object.keys(ROLES)) {
    if (auth.canVisit(from, role)) {
      check(
        auth.canVisit(to, role),
        `${role}: redirect ${from} -> ${to} bị chặn`,
      );
    }
  }
}

// 2. Quyền role.
for (const role of Object.keys(ROLES)) {
  for (const action of ACTIONS) {
    const expected =
      role === "owner"
        ? !SHIFT_ACTIONS.has(action)
        : ALLOWED_ACTIONS[role].includes(action);

    check(
      auth.can(action, role) === expected,
      `can("${action}", "${role}") phải là ${expected}`,
    );
  }
}

for (const action of ACTIONS) {
  check(!auth.can(action, null), `Guest không có quyền ${action}`);
}

// 3. Tài khoản chính.
const SCOPE = {
  owner: null,
  manager: "CN05",
  cashier: "CN01",
  warehouse: null,
};

for (const [role, email] of Object.entries(EMAIL)) {
  reset();

  check(
    auth.loginByEmail(email, "sai", true) === null,
    `${role}: từ chối mật khẩu sai`,
  );
  check(auth.currentStaff() === null, `${role}: không tạo phiên sai`);

  check(
    auth.loginByEmail(email.toUpperCase(), "123456", false) === role,
    `${role}: email không phân biệt hoa thường`,
  );

  check(auth.checkLogin() === role, `${role}: role đúng`);
  check(
    auth.currentStaff()?.staffId === auth.primaryStaffIds[role],
    `${role}: staffId tài khoản chính đúng`,
  );
  check(
    auth.scopedBranch() === SCOPE[role],
    `${role}: CN đúng`,
  );

  const stored = JSON.parse(
    sessionStorage.getItem(auth.STAFF_SESSION_KEY),
  );

  check(stored.version === 2, `${role}: schema phiên v2`);
  check(
    stored.staffId === auth.primaryStaffIds[role],
    `${role}: storage lưu staffId`,
  );
  check(
    localStorage.getItem(auth.STAFF_SESSION_KEY) === null,
    `${role}: không remember thì không lưu localStorage`,
  );

  const user = auth.sessionUser();
  check(
    user.role === role && user.email === email,
    `${role}: thông tin sessionUser đúng`,
  );

  auth.logout();
  check(auth.currentStaff() === null, `${role}: logout xóa phiên`);
}

reset();
check(auth.sessionUser().role === null, "Guest không giả làm owner");
check(auth.sessionUser().staffId === null, "Guest không có staffId");
check(
  auth.loginByEmail("khong.co@milktyway.vn", "123456", true) === null,
  "Email lạ bị từ chối",
);

// 4. Migration phiên cũ ở cả hai storage.
for (const storage of [localStorage, sessionStorage]) {
  for (const role of Object.keys(ROLES)) {
    reset();
    storage.setItem(auth.STAFF_SESSION_KEY, role);

    check(
      auth.currentStaff()?.staffId === auth.primaryStaffIds[role],
      `${role}: phiên cũ ánh xạ tài khoản chính`,
    );

    const migrated = JSON.parse(
      storage.getItem(auth.STAFF_SESSION_KEY),
    );

    check(
      migrated.version === 2 &&
        migrated.staffId === auth.primaryStaffIds[role],
      `${role}: phiên cũ được migration v2`,
    );
  }
}

for (const raw of [
  "{",
  "khong-co-role",
  JSON.stringify({ version: 2, staffId: "KHONG-TON-TAI" }),
  JSON.stringify({ version: 3, staffId: "NV-POS-01" }),
  JSON.stringify({ version: 2, staffId: "NV-BAR-CN01" }),
]) {
  reset();
  sessionStorage.setItem(auth.STAFF_SESSION_KEY, raw);
  check(auth.currentStaff() === null, `Từ chối phiên hỏng: ${raw}`);
}

// Phiên tab hỏng không được rơi về owner đã remember.
reset();
localStorage.setItem(auth.STAFF_SESSION_KEY, "owner");
sessionStorage.setItem(auth.STAFF_SESSION_KEY, "{");
check(
  auth.currentStaff() === null,
  "Phiên tab hỏng không fallback sang owner localStorage",
);

// 5. Hồ sơ legacy chỉ áp dụng tài khoản chính.
for (const role of ["manager", "cashier", "warehouse"]) {
  reset();

  localStorage.setItem(`milktyway.${role}.password`, "legacyPass8");

  check(
    auth.loginByEmail(EMAIL[role], "123456", true) === null,
    `${role}: mật khẩu legacy thay mật khẩu mặc định`,
  );
  check(
    auth.loginByEmail(EMAIL[role], "legacyPass8", true) === role,
    `${role}: đọc được mật khẩu legacy`,
  );
}

reset();
localStorage.setItem("milktyway.manager.password", "legacyCN05");
localStorage.setItem("milktyway.manager.name", "Tên quản lý CN05");

check(
  auth.loginByEmail("ql.cn01@milktyway.vn", "123456", true) ===
    "manager",
  "Quản lý CN01 không dùng mật khẩu legacy CN05",
);
check(
  auth.sessionUser().name === "Quản lý CN01",
  "Quản lý CN01 không dùng tên legacy CN05",
);

// 6. Hồ sơ cá nhân, đổi mật khẩu và logout/login.
const manager01 = auth.currentStaff();
check(manager01?.branchId === "CN01", "Quản lý phụ thuộc CN01");

auth.saveStaffProfile(manager01.staffId, {
  name: "Nguyễn Quản Lý Một",
  phone: "0901000001",
  address: "Địa chỉ CN01",
  password: "newCN01pass8",
});

check(
  auth.sessionUser().name === "Nguyễn Quản Lý Một",
  "Tên mới được đọc ngay",
);
check(
  auth.sessionUser().staffId === manager01.staffId,
  "Đổi tên không đổi staffId",
);
check(
  localStorage.getItem("milktyway.manager.password") === "legacyCN05",
  "Ghi hồ sơ không sửa mật khẩu legacy",
);
check(
  localStorage.getItem(
    auth.staffProfileKey(manager01.staffId, "password"),
  ) === "newCN01pass8",
  "Mật khẩu mới lưu theo staffId",
);

auth.logout();

check(
  auth.loginByEmail("ql.cn01@milktyway.vn", "123456", true) === null,
  "Mật khẩu cũ của CN01 hết hiệu lực",
);
check(
  auth.loginByEmail(
    "ql.cn01@milktyway.vn",
    "newCN01pass8",
    true,
  ) === "manager",
  "Mật khẩu mới của CN01 đăng nhập được",
);

auth.logout();

check(
  auth.loginByEmail(EMAIL.manager, "legacyCN05", true) === "manager",
  "Đổi mật khẩu CN01 không đổi mật khẩu CN05",
);
check(
  auth.sessionUser().name === "Tên quản lý CN05",
  "CN05 vẫn đọc tên legacy riêng",
);
check(auth.scopedBranch() === "CN05", "Quản lý chính vẫn thuộc CN05");

check(
  throws(() =>
    auth.saveStaffProfile(manager01.staffId, {
      name: "Không được ghi",
      phone: "0900000000",
      address: "",
    }),
  ),
  "Phiên khác người không được ghi hồ sơ CN01",
);

// 7. canAtBranch.
reset();
auth.loginByEmail("ql.cn01@milktyway.vn", "123456", true);

check(
  auth.canAtBranch("product.lockAtBranch", "CN01"),
  "Quản lý CN01 khóa món CN01",
);
check(
  !auth.canAtBranch("product.lockAtBranch", "CN05"),
  "Quản lý CN01 không khóa món CN05",
);
check(
  auth.canAtBranch("shift.openBranch", "CN01"),
  "Quản lý CN01 có quyền mở ca cùng CN",
);
check(
  auth.canAtBranch("shift.verifySecondParty", "CN01"),
  "Quản lý CN01 có quyền xác minh cùng CN",
);
check(
  !auth.canAtBranch("shift.verifySecondParty", "CN05"),
  "Quản lý CN01 không xác minh khác CN",
);
check(
  !auth.canAtBranch("product.lockAtBranch", ""),
  "Không thao tác khi branchId rỗng",
);

for (const role of ["owner", "warehouse"]) {
  reset();
  auth.loginByEmail(EMAIL[role], "123456", true);

  for (const action of SHIFT_ACTIONS) {
    check(
      !auth.canAtBranch(action, "CN01"),
      `${role}: không có quyền ${action}`,
    );
  }
}

// 8. Xác thực riêng người ký 2.
reset();
auth.loginByEmail(EMAIL.cashier, "123456", false);

const firstSigner = auth.currentStaff();
const originalSession = sessionStorage.getItem(auth.STAFF_SESSION_KEY);

const verifier = auth.authenticateShiftVerifier(
  "ql.cn01@milktyway.vn",
  "123456",
  "CN01",
  firstSigner.staffId,
);

check(
  verifier?.staffId === "NV-QL-CN01",
  "Quản lý CN01 xác thực được cho thu ngân CN01",
);
check(
  auth.currentStaff()?.staffId === firstSigner.staffId,
  "Xác thực bên 2 không thay người đang đăng nhập",
);
check(
  sessionStorage.getItem(auth.STAFF_SESSION_KEY) === originalSession,
  "Xác thực bên 2 không ghi lại phiên",
);
check(
  auth.authenticateShiftVerifier(
    EMAIL.manager,
    "123456",
    "CN01",
    firstSigner.staffId,
  ) === null,
  "Không nhận quản lý CN05 ký ca CN01",
);
check(
  auth.authenticateShiftVerifier(
    "ql.cn01@milktyway.vn",
    "sai",
    "CN01",
    firstSigner.staffId,
  ) === null,
  "Người xác minh phải nhập đúng mật khẩu",
);
check(
  auth.authenticateShiftVerifier(
    EMAIL.cashier,
    "123456",
    "CN01",
    firstSigner.staffId,
  ) === null,
  "Thu ngân không được tự ký bên 2",
);
check(
  !auth.canVerifyShiftAs("NV-QL-CN01", "CN01", "NV-QL-CN01"),
  "Quản lý cũng không được tự ký hai bên",
);

// 9. Danh bạ đủ ba vai trò nghiệp vụ tại các CN yêu cầu.
const ids = auth.staffDirectory.map(staff => staff.staffId);
check(new Set(ids).size === ids.length, "staffId không trùng");

for (const branchId of ["CN01", "CN02", "CN03", "CN05", "CN08"]) {
  for (const businessRole of ["cashier", "barista", "manager"]) {
    check(
      auth.staffDirectory.some(
        staff =>
          staff.branchId === branchId &&
          staff.businessRole === businessRole,
      ),
      `${branchId}: có nhân sự ${businessRole}`,
    );
  }
}

// 10. Ghi hồ sơ gặp lỗi storage phải ném lỗi và rollback.
reset();
auth.loginByEmail(EMAIL.cashier, "123456", true);

const cashier = auth.currentStaff();
const nameKey = auth.staffProfileKey(cashier.staffId, "name");
const phoneKey = auth.staffProfileKey(cashier.staffId, "phone");

localStorage.setItem(nameKey, "Tên trước khi lỗi");
const originalSetItem = localStorage.setItem;

localStorage.setItem = (key, value) => {
  if (key === phoneKey) throw new Error("Mock storage full");
  originalSetItem(key, value);
};

try {
  check(
    throws(() =>
      auth.saveStaffProfile(cashier.staffId, {
        name: "Tên không được lưu",
        phone: "0900000000",
        address: "",
      }),
    ),
    "Ghi storage lỗi phải báo thất bại",
  );
  check(
    localStorage.getItem(nameKey) === "Tên trước khi lỗi",
    "Rollback tên đã ghi trước bước lỗi",
  );
} finally {
  localStorage.setItem = originalSetItem;
}

// 11. Không hardcode link dashboard cho role bị chặn.
for (const file of [
  "src/pages/NotFoundPage.tsx",
  "src/pages/purchases/PurchasesPage.tsx",
  "src/pages/users/UsersPage.tsx",
  "src/pages/ModulePendingPage.tsx",
]) {
  check(
    !read(file).includes('to="/dashboard"'),
    `${file}: cần dùng homePath() thay dashboard cố định`,
  );
}

console.log(
  `\nauth-matrix: ${passed} kiểm tra đạt, ${failures.length} lỗi`,
);

if (failures.length) {
  for (const failure of failures) {
    console.error("  ❌ " + failure);
  }
  process.exit(1);
}

console.log(
  "✅ Auth, phiên staffId, hồ sơ cá nhân và ma trận quyền khớp kiểm thử.",
);
