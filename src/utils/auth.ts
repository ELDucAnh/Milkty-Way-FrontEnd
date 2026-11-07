const accounts = {
  owner: "long.nh@milktyway.vn",
  manager: "ha.tt@milktyway.vn",
  cashier: "anh.lqt@milktyway.vn",
  warehouse: "khoa.vm@milktyway.vn",
};
type Role = keyof typeof accounts;
const key = "milktyway.staff.session";
export const counterBranch = "CN01";
export function checkLogin(): Role | null {
  const role = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  return role && Object.prototype.hasOwnProperty.call(accounts, role) ? role as Role : null;
}
export function logout() {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}
export function login(role: string, email: string, password: string, remember: boolean) {
  if (!Object.prototype.hasOwnProperty.call(accounts, role) || accounts[role as Role] !== email.trim().toLowerCase() || password !== (role === "cashier" ? localStorage.getItem("milktyway.cashier.password") || "123456" : "123456")) return false;
  logout();
  (remember ? localStorage : sessionStorage).setItem(key, role);
  return checkLogin() === role;
}


export const isCashier = () => checkLogin() === "cashier";
const cashierPages = new Set([
  "/sales/pos", "/sales", "/sales/preparation", "/sales/shifts", "/sales/returns",
  "/invoices", "/marketing/promotions", "/sales/promotions", "/inventory/products", "/profile", "/pages/profile", "/logout",
]);
export function cashierCanVisit(path: string) {
  const normalized = path.replace(/\/+$/, "").toLowerCase();
  return cashierPages.has(normalized) || /^\/invoices\/[^/]+$/.test(normalized);
}
export function cashierName() {
  return localStorage.getItem("milktyway.cashier.name") || "Lê Quốc Tuấn Anh";
}
