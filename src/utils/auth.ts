export type Role = "owner" | "manager" | "cashier" | "warehouse";

export type StaffBusinessRole =
  | "owner"
  | "manager"
  | "cashier"
  | "barista"
  | "warehouse";

export type ProfileField = "name" | "phone" | "address" | "password";

export interface StaffRecord {
  staffId: string;
  name: string;
  businessRole: StaffBusinessRole;
  loginRole: Role | null;
  email: string | null;
  branchId: string | null;
  counterId: string | null;
  canVerifyShift: boolean;
}

export interface StaffSession {
  version: 2;
  staffId: string;
}

export const STAFF_SESSION_CHANGED = "milktyway:staff-session-changed";
function notifySessionChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STAFF_SESSION_CHANGED));
}

export const STAFF_SESSION_KEY = "milktyway.staff.session";

/**
 * Chỉ giữ cho các caller cũ trong Chat 0B.
 * Không dùng hai hằng này để xác định CN của người đang đăng nhập.
 */
export const counterBranch = "CN01";
export const managerBranch = "CN05";

export const primaryStaffIds: Readonly<Record<Role, string>> = {
  owner: "NV-ADMIN-01",
  manager: "NV-QL-CN05",
  cashier: "NV-POS-01",
  warehouse: "NV-KHO-01",
};

const branchIds = ["CN01", "CN02", "CN03", "CN05", "CN08"] as const;

/**
 * Danh bạ dùng chung.
 *
 * Barista có trong danh bạ nhưng chưa có tài khoản đăng nhập,
 * vì ứng dụng hiện chỉ có bốn role đăng nhập.
 *
 * counterId là mã quầy cục bộ trong CN, không phải ID toàn chuỗi.
 * Khi liên kết dữ liệu quầy cần dùng cùng branchId.
 */
export const staffDirectory: readonly StaffRecord[] = [
  {
    staffId: primaryStaffIds.owner,
    name: "Nguyễn Hoàng Long",
    businessRole: "owner",
    loginRole: "owner",
    email: "long.nh@milktyway.vn",
    branchId: null,
    counterId: null,
    canVerifyShift: false,
  },
  {
    staffId: primaryStaffIds.warehouse,
    name: "Vũ Minh Khoa",
    businessRole: "warehouse",
    loginRole: "warehouse",
    email: "khoa.vm@milktyway.vn",
    branchId: null,
    counterId: null,
    canVerifyShift: false,
  },
  ...branchIds.flatMap((branchId): StaffRecord[] => [
    {
      staffId:
        branchId === "CN01"
          ? primaryStaffIds.cashier
          : `NV-POS-${branchId}`,
      name:
        branchId === "CN01"
          ? "Lê Quốc Tuấn Anh"
          : `Thu ngân ${branchId}`,
      businessRole: "cashier",
      loginRole: "cashier",
      email:
        branchId === "CN01"
          ? "anh.lqt@milktyway.vn"
          : `pos.${branchId.toLowerCase()}@milktyway.vn`,
      branchId,
      counterId: "Q1",
      canVerifyShift: false,
    },
    {
      staffId: `NV-POS-B-${branchId}`,
      name: `Ca trưởng ${branchId}`,
      businessRole: "cashier",
      loginRole: "cashier",
      email: `pos.b.${branchId.toLowerCase()}@milktyway.vn`,
      branchId,
      counterId: "Q1",
      canVerifyShift: true,
    },
    {
      staffId: `NV-BAR-${branchId}`,
      name: `Pha chế ${branchId}`,
      businessRole: "barista",
      loginRole: null,
      email: null,
      branchId,
      counterId: null,
      canVerifyShift: false,
    },
    {
      staffId:
        branchId === "CN05"
          ? primaryStaffIds.manager
          : `NV-QL-${branchId}`,
      name:
        branchId === "CN05"
          ? "Trần Thu Hà"
          : `Quản lý ${branchId}`,
      businessRole: "manager",
      loginRole: "manager",
      email:
        branchId === "CN05"
          ? "ha.tt@milktyway.vn"
          : `ql.${branchId.toLowerCase()}@milktyway.vn`,
      branchId,
      counterId: null,
      canVerifyShift: true,
    },
  ]),
];

function isRole(value: unknown): value is Role {
  return (
    value === "owner" ||
    value === "manager" ||
    value === "cashier" ||
    value === "warehouse"
  );
}

export function findStaff(staffId: string): StaffRecord | null {
  return staffDirectory.find(staff => staff.staffId === staffId) ?? null;
}

export function staffProfileKey(
  staffId: string,
  field: ProfileField,
): string {
  return `milktyway.staff.${staffId}.${field}`;
}

/**
 * Khóa staffId luôn được ưu tiên.
 * Chỉ tài khoản chính của manager/cashier/warehouse đọc khóa legacy.
 * Owner trước đây không lưu hồ sơ qua ProfilePage nên không đọc legacy.
 *
 * Lỗi truy cập localStorage được chuyển cho caller xử lý.
 */
export function readStaffProfile(
  staff: StaffRecord,
  field: ProfileField,
): string | null {
  const saved = localStorage.getItem(
    staffProfileKey(staff.staffId, field),
  );

  if (saved !== null) return saved;

  const role = staff.loginRole;
  if (
    !role ||
    role === "owner" ||
    primaryStaffIds[role] !== staff.staffId
  ) {
    return null;
  }

  return localStorage.getItem(`milktyway.${role}.${field}`);
}

export function displayName(staff: StaffRecord): string {
  try { return readStaffProfile(staff, "name")?.trim() || staff.name; }
  catch { return staff.name; }
}

function expectedPassword(staff: StaffRecord): string {
  return readStaffProfile(staff, "password") ?? "123456";
}

function decodeSession(raw: string): StaffRecord | null {
  // Migration phiên cũ chỉ lưu chuỗi role.
  if (isRole(raw)) {
    return findStaff(primaryStaffIds[raw]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    parsed.version !== 2 ||
    !("staffId" in parsed) ||
    typeof parsed.staffId !== "string"
  ) {
    return null;
  }

  const staff = findStaff(parsed.staffId);
  return staff?.loginRole ? staff : null;
}

function encodeSession(staffId: string): string {
  const session: StaffSession = { version: 2, staffId };
  return JSON.stringify(session);
}

/**
 * Đọc phiên thật, không giả làm owner khi chưa đăng nhập.
 *
 * sessionStorage có ưu tiên cao hơn localStorage.
 * Phiên legacy hợp lệ được ghi lại ngay thành v2 trong cùng storage.
 * Nếu migration không ghi được, phiên role-only vẫn đọc được.
 * Phiên hỏng trong sessionStorage không fallback sang phiên localStorage.
 */
export function currentStaff(): StaffRecord | null {
  try {
    const tabSession = sessionStorage.getItem(STAFF_SESSION_KEY);
    const storage = tabSession !== null ? sessionStorage : localStorage;
    const raw = tabSession ?? localStorage.getItem(STAFF_SESSION_KEY);

    if (raw === null) return null;

    const staff = decodeSession(raw);
    if (!staff?.loginRole) return null;

    if (isRole(raw)) {
      try {
        storage.setItem(
          STAFF_SESSION_KEY,
          encodeSession(staff.staffId),
        );
      } catch {
        // Giữ khả năng đọc phiên cũ nếu storage không ghi được.
      }
    }

    return staff;
  } catch {
    // Không truy cập được storage: từ chối nhận diện phiên.
    return null;
  }
}

export function checkLogin(): Role | null {
  return currentStaff()?.loginRole ?? null;
}

/**
 * Không nuốt lỗi logout để caller không tưởng phiên đã được xóa.
 */
export function logout(): void {
  sessionStorage.removeItem(STAFF_SESSION_KEY);
  localStorage.removeItem(STAFF_SESSION_KEY);
  notifySessionChanged();
}

/**
 * Chỉ kiểm tra thông tin đăng nhập, không đổi phiên.
 * Dùng khi cần xác thực riêng người ký thứ hai.
 *
 * Đây là mock frontend, không phải cơ chế bảo mật thay backend.
 */
export function authenticateStaff(
  email: string,
  password: string,
): StaffRecord | null {
  const normalizedEmail = email.trim().toLowerCase();

  const staff = staffDirectory.find(
    candidate =>
      candidate.loginRole !== null &&
      candidate.email?.toLowerCase() === normalizedEmail,
  );

  if (!staff) return null;

  try {
    return password === expectedPassword(staff) ? staff : null;
  } catch {
    return null;
  }
}

/**
 * Giữ return type Role | null để tương thích caller cũ.
 * Đăng nhập thất bại không thay phiên đang có.
 */
export function loginByEmail(
  email: string,
  password: string,
  remember: boolean,
): Role | null {
  const staff = authenticateStaff(email, password);
  if (!staff?.loginRole) return null;

  try {
    logout();

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STAFF_SESSION_KEY, encodeSession(staff.staffId));
    notifySessionChanged();

    return currentStaff()?.staffId === staff.staffId
      ? staff.loginRole
      : null;
  } catch {
    return null;
  }
}

/**
 * Wrapper tương thích caller cũ.
 * Nếu truyền role hợp lệ thì role phải khớp tài khoản.
 */
export function login(
  role: string,
  email: string,
  password: string,
  remember: boolean,
): boolean {
  const staff = authenticateStaff(email, password);
  if (!staff?.loginRole) return false;
  if (!isRole(role) || staff.loginRole !== role) return false;

  return loginByEmail(email, password, remember) === staff.loginRole;
}

export const isCashier = () => checkLogin() === "cashier";
export const isManager = () => checkLogin() === "manager";
export const isWarehouse = () => checkLogin() === "warehouse";

/**
 * null nghĩa là không có CN giới hạn.
 * Guest cũng trả null, vì vậy không được dùng scopedBranch() một mình
 * để kết luận có quyền xem toàn chuỗi.
 */
export function scopedBranch(): string | null {
  return currentStaff()?.branchId ?? null;
}

export const isBranchScoped = () => scopedBranch() !== null;

// ---- Quyền truy cập trang ----

const cashierPages = new Set([
  "/sales/pos", "/sales", "/sales/preparation", "/sales/shifts", "/sales/returns",
  "/invoices", "/marketing", "/marketing/promotions", "/marketing/branch-promotions", "/sales/promotions",
  "/inventory", "/inventory/products", "/profile", "/pages/profile", "/logout",
]);
const managerPages = new Set([
  "/dashboard", "/sales", "/sales/preparation", "/sales/shifts", "/sales/returns", "/sales/promotions",
  "/invoices", "/marketing", "/marketing/promotions", "/marketing/branch-promotions",
  "/inventory", "/inventory/products", "/inventory/ingredients", "/inventory/stock-adjustment",
  "/purchases", "/purchases/new", "/purchases/add-purchase", "/purchases/purchases",
  "/distribution", "/distribution/planning", "/production/planning", "/stores", "/stores/ingredients", "/stores/shift-reconciliation",
  "/reports", "/reports/sales-report", "/reports/inventory-report", "/reports/profit-loss",
  "/users", "/users/users", "/users/roles",
  "/profile", "/pages/profile", "/logout",
]);
const warehousePages = new Set([
  "/inventory", "/inventory/products", "/inventory/ingredients", "/inventory/stock-adjustment",
  "/purchases/receipts", "/purchases/transfers", "/purchases/stock-transfers",
  "/production/batches", "/production/planning", "/distribution", "/distribution/planning",
  "/stores", "/stores/ingredients", "/stores/shift-reconciliation",
  "/marketing", "/marketing/promotions", "/sales/promotions",
  "/reports/inventory-report",
  "/profile", "/pages/profile", "/logout",
]);
const detailPages = [/^\/invoices\/[^/]+$/];

export function canVisit(
  path: string,
  role: Role | null = checkLogin(),
): boolean {
  const normalized = path.replace(/\/+$/, "").toLowerCase() || "/";

  if (role === "cashier") {
    return (
      cashierPages.has(normalized) ||
      detailPages.some(rule => rule.test(normalized))
    );
  }

  if (role === "manager") {
    return (
      managerPages.has(normalized) ||
      detailPages.some(rule => rule.test(normalized))
    );
  }

  if (role === "warehouse") return warehousePages.has(normalized);
  return role === "owner";
}

export const cashierCanVisit = (path: string) =>
  canVisit(path, "cashier");

export const homePath = (role: Role | null = checkLogin()) =>
  role === "cashier"
    ? "/sales/pos"
    : role === "warehouse"
      ? "/inventory/ingredients"
      : role === null
        ? "/login"
        : "/dashboard";

// ---- Quyền thao tác ----

export type Action =
  | "product.manage"
  | "product.lockAtBranch"
  | "promotion.manage"
  | "ingredient.manage"
  | "stock.count"
  | "stock.approveAdjustment"
  | "purchase.create"
  | "purchase.receive"
  | "batch.manage"
  | "transfer.manage"
  | "pos.use"
  | "order.create"
  | "order.reportShortage"
  | "payment.refundReview"
  | "complaint.handle"
  | "user.manageBranch"
  | "role.assign"
  | "shift.openBranch"
  | "shift.closeRequestBranch"
  | "shift.verifySecondParty"
  | "staff.assignBranch";

const shiftActions = new Set<Action>([
  "shift.openBranch",
  "shift.closeRequestBranch",
  "shift.verifySecondParty",
]);

const managerActions = new Set<Action>([
  "product.lockAtBranch",
  "ingredient.manage",
  "stock.approveAdjustment",
  "purchase.create",
  "payment.refundReview",
  "complaint.handle",
  "user.manageBranch",
  "role.assign",
]);

const cashierActions = new Set<Action>([
  "pos.use",
  "order.create",
  "order.reportShortage",
]);

const warehouseActions = new Set<Action>([
  "order.reportShortage",
  "purchase.receive",
  "batch.manage",
  "transfer.manage",
  "stock.count",
]);

export function can(
  action: Action,
  role: Role | null = checkLogin(),
): boolean {
  // Phải kiểm tra trước nhánh mặc định của owner.
  if (shiftActions.has(action)) {
    if (action === "shift.verifySecondParty") {
      return role === "manager";
    }
    return role === "cashier" || role === "manager";
  }

  if (action === "staff.assignBranch") return role === "owner";

  if (role === "manager") return managerActions.has(action);
  if (role === "cashier") return cashierActions.has(action);
  if (role === "warehouse") return warehouseActions.has(action);
  return role === "owner";
}

/**
 * Kiểm tra quyền với phiên hiện tại và CN bản ghi.
 * Không nhận role/staff từ UI để tránh bỏ qua phiên hiện tại.
 *
 * Những thao tác chưa có quyền: false.
 * Guest hoặc branchId rỗng: false.
 * Người có CN được phân công chỉ thao tác tại đúng CN.
 */
export function canAtBranch(
  action: Action,
  branchId: string,
): boolean {
  const staff = currentStaff();

  if (!staff?.loginRole || !branchId.trim()) return false;
  if (action === "shift.verifySecondParty") {
    return staff.branchId === branchId && staff.canVerifyShift &&
      (staff.loginRole === "manager" || staff.loginRole === "cashier");
  }
  if (!can(action, staff.loginRole)) return false;

  if (
    staff.branchId !== null &&
    staff.branchId !== branchId
  ) {
    return false;
  }

  if (shiftActions.has(action) && staff.branchId !== branchId) {
    return false;
  }


  return true;
}

/**
 * Kiểm tra một nhân sự đã được xác thực có thể ký bên 2 hay không.
 * Không dùng trực tiếp ID từ dropdown làm bằng chứng xác thực.
 */
export function canVerifyShiftAs(
  staffId: string,
  branchId: string,
  firstSignerStaffId: string,
): boolean {
  const staff = findStaff(staffId);

  return Boolean(
    branchId.trim() &&
    firstSignerStaffId.trim() &&
    staff &&
    staff.staffId !== firstSignerStaffId &&
    (staff.loginRole === "manager" || staff.loginRole === "cashier") &&
    staff.canVerifyShift &&
    staff.branchId === branchId,
  );
}

/**
 * Xác thực riêng người ký 2, không thay đổi phiên đang đăng nhập.
 * A3 phải kiểm tra lại trạng thái ca và chữ ký ngay trước khi ghi.
 */
export function authenticateShiftVerifier(
  email: string,
  password: string,
  branchId: string,
  firstSignerStaffId: string,
): StaffRecord | null {
  const staff = authenticateStaff(email, password);

  return staff &&
    canVerifyShiftAs(staff.staffId, branchId, firstSignerStaffId)
    ? staff
    : null;
}

// ---- Hồ sơ ----

export type StaffProfileUpdate = {
  name: string;
  phone: string;
  address: string;
  password?: string;
};

/**
 * Chỉ cho phép phiên hiện tại cập nhật hồ sơ của chính mình.
 * Ghi hoàn toàn vào khóa staffId; không sửa khóa legacy.
 *
 * Có thể ném Error nếu phiên thay đổi, dữ liệu không hợp lệ
 * hoặc localStorage không ghi được.
 */
export function saveStaffProfile(
  staffId: string,
  update: StaffProfileUpdate,
): void {
  const staff = currentStaff();

  if (!staff?.loginRole || staff.staffId !== staffId) {
    throw new Error(
      "Phiên đăng nhập đã thay đổi. Vui lòng tải lại trang hồ sơ.",
    );
  }

  const name = update.name.trim();
  const phone = update.phone.trim();
  const address = update.address.trim();

  if (!name || !phone) {
    throw new Error("Vui lòng nhập họ tên và số điện thoại.");
  }

  if (
    update.password !== undefined &&
    update.password.length < 8
  ) {
    throw new Error("Mật khẩu mới phải có tối thiểu 8 ký tự.");
  }

  const entries: [ProfileField, string][] = [
    ["name", name],
    ["phone", phone],
    ["address", address],
  ];

  if (update.password !== undefined) {
    entries.push(["password", update.password]);
  }

  // Đọc toàn bộ giá trị cũ trước khi bắt đầu ghi.
  const previous = entries.map(([field]) => ({
    key: staffProfileKey(staffId, field),
    value: localStorage.getItem(staffProfileKey(staffId, field)),
  }));

  try {
    for (const [field, value] of entries) {
      localStorage.setItem(staffProfileKey(staffId, field), value);
    }
  } catch {
    // Rollback best-effort. localStorage không phải giao dịch backend.
    for (const item of previous) {
      try {
        if (item.value === null) localStorage.removeItem(item.key);
        else localStorage.setItem(item.key, item.value);
      } catch {
        // Không báo thành công nếu cả ghi và rollback đều thất bại.
      }
    }

    throw new Error(
      "Không lưu được hồ sơ. Vui lòng kiểm tra bộ nhớ trình duyệt và tải lại trang.",
    );
  }
}

// ---- Thông tin hiển thị ----

const roleLabels: Record<Role, string> = {
  owner: "Quản trị viên",
  manager: "Quản lý chi nhánh",
  cashier: "Nhân viên POS",
  warehouse: "Nhân viên kho",
};

function staffBranchLabel(staff: StaffRecord): string {
  if (staff.branchId) return staff.branchId;
  return staff.loginRole === "owner"
    ? "Toàn chuỗi"
    : "Kho Tổng & Điều Phối CN";
}

export interface SessionUser {
  staffId: string | null;
  role: Role | null;
  email: string;
  name: string;
  roleLabel: string;
  branchId: string | null;
  branchLabel: string;
  counterId: string | null;
}

export function sessionUser(): SessionUser {
  const staff = currentStaff();

  if (!staff?.loginRole) {
    return {
      staffId: null,
      role: null,
      email: "",
      name: "Khách",
      roleLabel: "Chưa đăng nhập",
      branchId: null,
      branchLabel: "",
      counterId: null,
    };
  }

  return {
    staffId: staff.staffId,
    role: staff.loginRole,
    email: staff.email ?? "",
    name: displayName(staff),
    roleLabel: roleLabels[staff.loginRole],
    branchId: staff.branchId,
    branchLabel: staffBranchLabel(staff),
    counterId: staff.counterId,
  };
}

/**
 * Caller cũ dùng hàm này để lấy tên người thao tác.
 * Giờ ưu tiên đúng người đang đăng nhập, không cố định thu ngân CN01.
 */
export function cashierName(): string {
  const staff = currentStaff();
  return staff ? displayName(staff) : "Chưa đăng nhập";
}
