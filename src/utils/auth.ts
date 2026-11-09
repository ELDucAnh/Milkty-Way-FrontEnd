const accounts = {
  owner: "long.nh@milktyway.vn",
  manager: "ha.tt@milktyway.vn",
  cashier: "anh.lqt@milktyway.vn",
  warehouse: "khoa.vm@milktyway.vn",
};
export type Role = keyof typeof accounts;
const key = "milktyway.staff.session";
export const counterBranch = "CN01";
export const managerBranch = "CN05";
export function checkLogin(): Role | null {
  const role = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  return role && Object.prototype.hasOwnProperty.call(accounts, role) ? role as Role : null;
}
export function logout() {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}
export function loginByEmail(email: string, password: string, remember: boolean): Role | null {
  const normalizedEmail = email.trim().toLowerCase();
  const matchedEntry = (Object.entries(accounts) as [Role, string][]).find(
    ([, accEmail]) => accEmail.toLowerCase() === normalizedEmail
  );
  if (!matchedEntry) return null;
  const [matchedRole] = matchedEntry;
  const expectedPassword =
    matchedRole === "cashier" || matchedRole === "manager" || matchedRole === "warehouse"
      ? localStorage.getItem(`milktyway.${matchedRole}.password`) || "123456"
      : "123456";
  if (password !== expectedPassword) return null;
  logout();
  (remember ? localStorage : sessionStorage).setItem(key, matchedRole);
  return checkLogin() === matchedRole ? matchedRole : null;
}
export function login(role: string, email: string, password: string, remember: boolean) {
  if (!Object.prototype.hasOwnProperty.call(accounts, role) || accounts[role as Role] !== email.trim().toLowerCase()) {
    return loginByEmail(email, password, remember) !== null;
  }
  return loginByEmail(email, password, remember) === role;
}

export const isCashier = () => checkLogin() === "cashier";
export const isManager = () => checkLogin() === "manager";
export const isWarehouse = () => checkLogin() === "warehouse";

/** Chi nhánh bị ràng buộc theo vai trò (thu ngân: CN01, quản lý chi nhánh: CN05); null nếu xem toàn chuỗi. */
export function scopedBranch(): string | null {
  const role = checkLogin();
  return role === "cashier" ? counterBranch : role === "manager" ? managerBranch : null;
}
export const isBranchScoped = () => scopedBranch() !== null;

// ---- Quyền truy cập trang theo vai trò (ma trận phân quyền) ----
const cashierPages = new Set([
  "/sales/pos", "/sales", "/sales/preparation", "/sales/shifts", "/sales/returns",
  "/invoices", "/marketing", "/marketing/promotions", "/sales/promotions",
  "/inventory", "/inventory/products", "/profile", "/pages/profile", "/logout",
]);
const managerPages = new Set([
  "/dashboard", "/sales", "/sales/preparation", "/sales/shifts", "/sales/returns", "/sales/promotions",
  "/invoices", "/marketing", "/marketing/promotions",
  "/inventory", "/inventory/products", "/inventory/ingredients", "/inventory/stock-adjustment",
  "/purchases", "/purchases/new", "/purchases/add-purchase", "/purchases/purchases",
  "/distribution", "/distribution/planning", "/stores", "/stores/ingredients",
  "/reports", "/reports/sales-report", "/reports/inventory-report", "/reports/profit-loss",
  "/users", "/users/users", "/users/roles",
  "/profile", "/pages/profile", "/logout",
]);
const warehousePages = new Set([
  "/inventory", "/inventory/products", "/inventory/ingredients", "/inventory/stock-adjustment",
  "/purchases/receipts", "/purchases/transfers", "/purchases/stock-transfers",
  "/production/batches",
  "/stores", "/stores/ingredients", "/stores/shift-reconciliation",
  "/marketing", "/marketing/promotions", "/sales/promotions",
  "/reports/inventory-report",
  "/profile", "/pages/profile", "/logout",
]);
const detailPages = [/^\/invoices\/[^/]+$/];

export function canVisit(path: string, role: Role | null = checkLogin()) {
  const normalized = path.replace(/\/+$/, "").toLowerCase() || "/";
  if (role === "cashier") return cashierPages.has(normalized) || detailPages.some(rule => rule.test(normalized));
  if (role === "manager") return managerPages.has(normalized) || detailPages.some(rule => rule.test(normalized));
  if (role === "warehouse") return warehousePages.has(normalized);
  return role !== null;
}
export const cashierCanVisit = (path: string) => canVisit(path, "cashier");
export const homePath = (role: Role | null = checkLogin()) =>
  role === "cashier" ? "/sales/pos" : role === "warehouse" ? "/inventory/ingredients" : "/dashboard";

// ---- Quyền thao tác trong trang (ma trận phân quyền theo vai trò) ----
export type Action =
  | "product.manage" | "product.lockAtBranch"
  | "promotion.manage"
  | "ingredient.manage"
  | "stock.count" | "stock.approveAdjustment"
  | "purchase.create" | "purchase.receive"
  | "batch.manage" | "transfer.manage"
  | "pos.use" | "order.create" | "order.reportShortage"
  | "payment.refundReview" | "complaint.handle"
  | "user.manageBranch" | "role.assign";
const managerActions = new Set<Action>([
  "product.lockAtBranch", "ingredient.manage", "stock.approveAdjustment", "purchase.create",
  "payment.refundReview", "complaint.handle", "user.manageBranch", "role.assign",
]);
const cashierActions = new Set<Action>(["pos.use", "order.create", "order.reportShortage"]);
const warehouseActions = new Set<Action>([
  "order.reportShortage", "purchase.receive", "batch.manage", "transfer.manage", "stock.count",
]);
export function can(action: Action, role: Role | null = checkLogin()) {
  if (role === "manager") return managerActions.has(action);
  if (role === "cashier") return cashierActions.has(action);
  if (role === "warehouse") return warehouseActions.has(action);
  return role !== null;
}

// ---- Thông tin người dùng đăng nhập (mock) ----
const profiles: Record<Role, { name: string; roleLabel: string; branchLabel: string }> = {
  owner: { name: "Nguyễn Hoàng Long", roleLabel: "Quản trị viên", branchLabel: "Toàn chuỗi" },
  manager: { name: "Trần Thu Hà", roleLabel: "Quản lý chi nhánh", branchLabel: "CN05 — Sư Vạn Hạnh (Q.10)" },
  cashier: { name: "Lê Quốc Tuấn Anh", roleLabel: "Nhân viên POS", branchLabel: "CN01 — Nguyễn Huệ (Q.1)" },
  warehouse: { name: "Vũ Minh Khoa", roleLabel: "Nhân viên kho", branchLabel: "Kho Tổng & Điều Phối CN" },
};
export function cashierName() {
  return localStorage.getItem("milktyway.cashier.name") || profiles.cashier.name;
}
export function sessionUser() {
  const role = checkLogin() ?? "owner";
  const base = profiles[role];
  const email = accounts[role];
  const storedName = role === "cashier" || role === "manager" || role === "warehouse" ? localStorage.getItem(`milktyway.${role}.name`) : null;
  return { role, email, ...base, name: storedName || base.name };
}
