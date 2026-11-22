import { findPosMember } from "../../data/sales/members";
import { can, checkLogin, scopedBranch } from "../../utils/auth";
import {
  getSalesBranches,
  salesBranches,
} from "../../data/sales/branches";
import { products } from "../../data/sales/products";
import {
  calculatePosTotals,
  validatePercentage,
  type PosLine,
  type PosTotals,
} from "./sales-pricing";
import { withSalesWriteLock } from "./sales-write-lock";

export type PromotionStatus = "draft" | "scheduled" | "active" | "ended";
export type PromotionChannel = "counter" | "takeaway" | "online" | "all";
export type PromotionShift = "morning" | "afternoon" | "evening" | "all";
export type PromotionDiscountType =
  | "none"
  | "percent"
  | "fixed"
  | "buy_x_get_y";

export interface Promotion {
  id: string;
  code: string;
  name: string;
  version: number;

  branchIds: readonly string[];
  branchMode: "all" | "include" | "exclude";
  channel: PromotionChannel;
  shift: PromotionShift;

  startDate: string;
  endDate: string;
  hourFrom: string;
  hourTo: string;

  budget: number;
  budgetUsed: number;
  usageLimit: number;
  usageCount: number;

  /** "branch": usageLimit áp riêng tại từng CN; ngân sách vẫn toàn chiến dịch. */
  usageScope: "chain" | "branch" | "daily";
  oncePerMember: boolean;
  branchUsage: Record<string, number>;

  status: PromotionStatus;
  description: string;
  productId: string | null;
  productCategory: string | null;
  minQuantity: number | null;
  benefit: string | null;
  giftProductId: string | null;

  /** Giữ trường cũ để tương thích dữ liệu, dùng stackWithOtherPromo khi tính. */
  stackable: boolean | null;

  naturalRuleText: string;
  stackWithMemberTier: boolean;
  stackWithOtherPromo: "exclusive" | "stackable";
  priority: number;
  terminationRule: "whichever_first";

  discountType: PromotionDiscountType;
  discountValue: number;
  buyQuantity: number;
  giftQuantity: number;
}

export interface PromotionRedemption {
  id: string;
  checkoutId: string;
  orderId: string;
  campaignId: string;
  code: string;
  memberPhone?: string;
  campaignVersion: number;
  branchId: string;
  createdAt: string;
  discountAmount: number;
  eligibleSubtotal: number;

  /**
   * Giá trị cả đơn, chỉ để tham chiếu.
   * KHÔNG cộng trường này giữa các campaign để tính doanh thu.
   */
  orderTotal: number;
}

export interface PromotionQuoteInput {
  items: readonly PosLine[];
  branchId: string;
  channel: Exclude<PromotionChannel, "all">;
  discountRate: number;
  flatDiscount: number;
  taxRate: number;
  customerPhone?: string;
  promotionCodes?: readonly string[];
  now?: Date;
}

export interface AppliedPromotion {
  campaignId: string;
  code: string;
  campaignVersion: number;
  discountAmount: number;
  eligibleSubtotal: number;
}

export interface PromotionQuote extends PosTotals {
  memberDiscount: number;
  memberSuppressed: boolean;
  appliedPromotions: AppliedPromotion[];
  ignoredCodes: string[];
  lineAmounts: {
    id: string;
    paidDiscountAmount: number;
    paidTaxAmount: number;
  }[];
}

export const STORAGE_PROMOTIONS = "miltyway_promotions_v1";
export const PROMOTION_REDEMPTIONS_KEY = "milktyway.promotions.redemptions.v1";
export const PROMOTIONS_CHANGED = "milktyway:promotions-changed";

const CHECKOUT_PENDING_KEY = "milktyway.pos.checkout.pending.v1";
const RETURN_PENDING_KEY = "milktyway.returns.pending.v1";

function integer(value: number, label: string, min = 0): number {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new Error(`${label} không hợp lệ.`);
  }
  return value;
}

function sum(values: readonly number[]): number {
  return values.reduce(
    (total, value) => integer(total + value, "Tổng tiền/số lượng"),
    0,
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Bản ghi khuyến mãi không hợp lệ.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} không hợp lệ.`);
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${label} không hợp lệ.`);
  }
  return value as T;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} không hợp lệ.`);
  return value;
}

function numberValue(value: unknown, label: string, min = 0): number {
  if (typeof value !== "number") throw new Error(`${label} không hợp lệ.`);
  return integer(value, label, min);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function normalizePromotion(value: unknown): Promotion {
  const row = record(value);

  if (
    !Array.isArray(row.branchIds) ||
    row.branchIds.some(id => typeof id !== "string") ||
    new Set(row.branchIds).size !== row.branchIds.length
  ) {
    throw new Error("Phạm vi chi nhánh không hợp lệ.");
  }

  const branchUsageRecord = record(row.branchUsage ?? {});
  const branchUsage: Record<string, number> = {};
  for (const [branchId, count] of Object.entries(branchUsageRecord)) {
    branchUsage[branchId] = numberValue(count, "Lượt theo chi nhánh");
  }

  const startDate = text(row.startDate, "Ngày bắt đầu");
  const endDate = text(row.endDate, "Ngày kết thúc");
  const hourFrom = text(row.hourFrom, "Giờ bắt đầu");
  const hourTo = text(row.hourTo, "Giờ kết thúc");
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    !validDate(startDate) ||
    !validDate(endDate) ||
    startDate > endDate ||
    !timePattern.test(hourFrom) ||
    !timePattern.test(hourTo) ||
    hourFrom >= hourTo
  ) {
    throw new Error("Khoảng ngày/giờ khuyến mãi không hợp lệ.");
  }

  const nullableText = (value: unknown, label: string) =>
    value === null || value === undefined ? null : text(value, label);

  const priority = numberValue(row.priority ?? 1, "Ưu tiên", 1);
  if (priority > 5) throw new Error("Ưu tiên phải từ 1 đến 5.");

  const legacyStackable = row.stackable ?? null;
  if (legacyStackable !== null && typeof legacyStackable !== "boolean") {
    throw new Error("Quy tắc cộng dồn cũ không hợp lệ.");
  }

  const promotion: Promotion = {
    id: text(row.id, "ID"),
    code: text(row.code, "Mã").trim().toUpperCase(),
    name: text(row.name, "Tên").trim(),
    version: numberValue(row.version ?? 1, "Phiên bản", 1),
    branchIds: [...row.branchIds] as string[],
    branchMode: enumValue(
      row.branchMode,
      ["all", "include", "exclude"] as const,
      "Phân bổ",
    ),
    channel: enumValue(
      row.channel,
      ["all", "counter", "takeaway", "online"] as const,
      "Kênh",
    ),
    shift: enumValue(
      row.shift,
      ["all", "morning", "afternoon", "evening"] as const,
      "Ca",
    ),
    startDate,
    endDate,
    hourFrom,
    hourTo,
    budget: numberValue(row.budget, "Ngân sách"),
    budgetUsed: numberValue(row.budgetUsed ?? 0, "Ngân sách đã dùng"),
    usageLimit: numberValue(row.usageLimit, "Trần lượt", 1),
    usageCount: numberValue(row.usageCount ?? 0, "Lượt đã dùng"),
    usageScope: enumValue(
      row.usageScope ?? "chain",
      ["chain", "branch", "daily"] as const,
      "Phạm vi trần lượt",
    ),
    oncePerMember: booleanValue(row.oncePerMember ?? false, "Một lượt mỗi hội viên"),
    branchUsage,
    status: enumValue(
      row.status,
      ["draft", "scheduled", "active", "ended"] as const,
      "Trạng thái",
    ),
    description: text(row.description ?? "", "Mô tả"),
    productId: nullableText(row.productId, "SKU"),
    productCategory: nullableText(row.productCategory, "Nhóm món"),
    minQuantity: row.minQuantity === null || row.minQuantity === undefined
      ? null
      : numberValue(row.minQuantity, "Số ly tối thiểu", 1),
    benefit: nullableText(row.benefit, "Ưu đãi"),
    giftProductId: nullableText(row.giftProductId, "SKU quà"),
    stackable: legacyStackable as boolean | null,
    naturalRuleText: text(
      row.naturalRuleText ?? `Áp dụng tối đa ${row.usageLimit} lượt`,
      "Quy định",
    ),
    stackWithMemberTier: booleanValue(
      row.stackWithMemberTier ?? false,
      "Cộng dồn hội viên",
    ),
    stackWithOtherPromo: enumValue(
      row.stackWithOtherPromo ??
        (legacyStackable === true ? "stackable" : "exclusive"),
      ["exclusive", "stackable"] as const,
      "Cộng dồn mã",
    ),
    priority,
    terminationRule: enumValue(
      row.terminationRule ?? "whichever_first",
      ["whichever_first"] as const,
      "Điều kiện kết thúc",
    ),

    // Không đoán mức giảm từ benefit/name của dữ liệu cũ.
    discountType: enumValue(
      row.discountType ?? "none",
      ["none", "percent", "fixed", "buy_x_get_y"] as const,
      "Loại ưu đãi",
    ),
    discountValue: numberValue(row.discountValue ?? 0, "Mức giảm"),
    buyQuantity: numberValue(row.buyQuantity ?? 2, "Số ly mua", 1),
    giftQuantity: numberValue(row.giftQuantity ?? 1, "Số ly tặng", 1),
  };

  if (!promotion.id.trim() || !promotion.code || !promotion.name) {
    throw new Error("Khuyến mãi thiếu ID, mã hoặc tên.");
  }
  if (promotion.discountType === "percent" && promotion.discountValue > 100) {
    throw new Error("Giảm phần trăm không được vượt 100%.");
  }
  if (promotion.budgetUsed > promotion.budget) {
    throw new Error("Ngân sách đã dùng vượt trần. Cần đối soát dữ liệu.");
  }
  if (
    promotion.usageScope === "chain" &&
    promotion.usageCount > promotion.usageLimit
  ) {
    throw new Error("Lượt đã dùng vượt trần. Cần đối soát dữ liệu.");
  }

  return promotion;
}

const seedRows = [
  {
    id: "KM-001", name: "Mua 2 ly tặng trân châu",
    branchIds: ["CN01", "CN02", "CN05"],
    channel: "online", shift: "afternoon",
    startDate: "2026-10-28", endDate: "2026-10-31",
    hourFrom: "14:00", hourTo: "17:00",
    budget: 2000000, usageLimit: 200, status: "active",
  },
  {
    id: "KM-002", name: "Ưu đãi đầu tháng",
    branchIds: getSeedBranchIds(),
    channel: "all", shift: "all",
    startDate: "2026-11-01", endDate: "2026-11-07",
    hourFrom: "08:00", hourTo: "22:00",
    budget: 5000000, usageLimit: 500, status: "scheduled",
  },
  {
    id: "KM-003", name: "Quà tặng cuối tuần",
    branchIds: ["CN03", "CN04"],
    channel: "counter", shift: "evening",
    startDate: "2026-10-31", endDate: "2026-11-01",
    hourFrom: "18:00", hourTo: "21:00",
    budget: 1000000, usageLimit: 100, status: "draft",
  },
];

function getSeedBranchIds(): string[] {
  return salesBranches.map(branch => branch.id);
}

export const initialPromotions: readonly Promotion[] = seedRows.map(row =>
  normalizePromotion({
    ...row,
    code: row.id,
    version: 1,
    branchMode: "include",
    description: "",
    productId: null,
    minQuantity: null,
    benefit: null,
    giftProductId: null,
    stackable: null,
  }),
);

export function loadPromotions(): Promotion[] {
  const raw = localStorage.getItem(STORAGE_PROMOTIONS);
  const parsed: unknown = raw === null ? initialPromotions : JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Danh sách khuyến mãi không hợp lệ. Không ghi đè dữ liệu.");
  }

  const rows = parsed.map(normalizePromotion);
  if (
    new Set(rows.map(row => row.id)).size !== rows.length ||
    new Set(rows.map(row => row.code)).size !== rows.length
  ) {
    throw new Error("ID hoặc mã khuyến mãi bị trùng.");
  }

  return rows;
}

export function loadPromotionRedemptions(): PromotionRedemption[] {
  const raw = localStorage.getItem(PROMOTION_REDEMPTIONS_KEY);
  const parsed: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Sổ sử dụng KM không hợp lệ.");

  const ids = new Set<string>();
  for (const value of parsed) {
    const row = record(value);
    for (const key of [
      "id", "checkoutId", "orderId", "campaignId", "code",
      "branchId", "createdAt",
    ]) text(row[key], key);
    numberValue(row.campaignVersion, "Phiên bản", 1);
    numberValue(row.discountAmount, "Tiền giảm");
    numberValue(row.eligibleSubtotal, "Tiền đủ điều kiện");
    numberValue(row.orderTotal, "Tổng đơn");

    const id = row.id as string;
    if (
      ids.has(id) ||
      !Number.isFinite(Date.parse(row.createdAt as string))
    ) throw new Error("Sổ sử dụng KM có dữ liệu trùng hoặc sai ngày.");

    ids.add(id);
  }

  return parsed as PromotionRedemption[];
}

export function notifyPromotionsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROMOTIONS_CHANGED));
  }
}

function assertAdmin(): void {
  if (checkLogin() !== "owner" || !can("promotion.manage")) {
    throw new Error("Chỉ Admin được điều chỉnh khuyến mãi.");
  }
  if (
    localStorage.getItem(CHECKOUT_PENDING_KEY) !== null ||
    localStorage.getItem(RETURN_PENDING_KEY) !== null
  ) {
    throw new Error("Có giao dịch chưa đối soát xong. Chưa thể sửa khuyến mãi.");
  }
}

export function promotionAppliesAtBranch(
  promotion: Promotion,
  branchId: string,
): boolean {
  if (!branchId) return false;
  if (promotion.branchMode === "all") return true;
  const selected = promotion.branchIds.includes(branchId);
  return promotion.branchMode === "exclude" ? !selected : selected;
}

function vietnamClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(value => value.type === type)?.value ?? "";

  const hour = Number(part("hour"));

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
    shift: hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening",
  };
}

export function promotionUsageCapacity(promotion: Promotion): number {
  if (promotion.usageScope === "chain") return promotion.usageLimit;
  if (promotion.usageScope === "daily") {
    const days = 1 + (Date.parse(promotion.endDate) - Date.parse(promotion.startDate)) / 86400000;
    return integer(days * promotion.usageLimit, "Tổng trần lượt");
  }
  const remaining = getSalesBranches().filter(branch =>
    promotionAppliesAtBranch(promotion, branch.id)
  ).reduce((sum, branch) => sum + Math.max(0, promotion.usageLimit - (promotion.branchUsage[branch.id] ?? 0)), 0);
  return promotion.usageCount + remaining;
}

function assertQuota(promotion: Promotion, branchId: string, date: string, phone = "") {
  const history = promotion.oncePerMember || promotion.usageScope === "daily"
    ? loadPromotionRedemptions().filter(row => row.campaignId === promotion.id)
    : [];
  if (promotion.oncePerMember && (!findPosMember(phone) || history.some(row => row.memberPhone === phone))) {
    throw new Error("Mã yêu cầu SĐT hội viên hợp lệ và mỗi hội viên chỉ được dùng một lần.");
  }
  const used = promotion.usageScope === "daily"
    ? history.filter(row => vietnamClock(new Date(row.createdAt)).date === date).length
    : promotion.usageScope === "branch" ? promotion.branchUsage[branchId] ?? 0 : promotion.usageCount;
  if (used >= promotion.usageLimit) throw new Error("Khuyến mãi đã hết lượt trong phạm vi áp dụng.");
}

export function getPromotionStatus(
  promotion: Promotion,
  now = new Date(),
): PromotionStatus {
  if (promotion.status === "draft" || promotion.status === "ended") {
    return promotion.status;
  }

  const clock = vietnamClock(now);
  const capacity = promotionUsageCapacity(promotion);

  if (
    clock.date > promotion.endDate ||
    (clock.date === promotion.endDate && clock.time >= promotion.hourTo) ||
    promotion.budgetUsed >= promotion.budget ||
    (capacity > 0 && promotion.usageCount >= capacity)
  ) return "ended";

  if (clock.date < promotion.startDate) return "scheduled";
  return "active";
}

export function getPromotionForecast(promotion: Promotion, now = new Date()) {
  const capacity = promotionUsageCapacity(promotion);
  const usageRemaining = Math.max(0, capacity - promotion.usageCount);
  const budgetRemaining = Math.max(0, promotion.budget - promotion.budgetUsed);

  if (budgetRemaining === 0) {
    return {
      predictedBindingLimit: "budget" as const,
      bindingLimitNote: "Ngân sách đã hết; chương trình không nhận thêm đơn.",
    };
  }
  if (capacity > 0 && usageRemaining === 0) {
    return {
      predictedBindingLimit: "usage" as const,
      bindingLimitNote: "Đã đủ số lượt theo phạm vi được phân bổ.",
    };
  }

  const start = Date.parse(
    `${promotion.startDate}T${promotion.hourFrom}:00+07:00`,
  );
  const end = Date.parse(
    `${promotion.endDate}T${promotion.hourTo}:00+07:00`,
  );

  const elapsed = Math.max(1, now.getTime() - start);
  const remainingTime = Math.max(0, end - now.getTime());

  if (promotion.usageCount === 0 || now.getTime() <= start) {
    return {
      predictedBindingLimit: "time" as const,
      bindingLimitNote:
        `Hết hạn ${promotion.endDate} lúc ${promotion.hourTo}. ` +
        "Chưa đủ lịch sử để dự báo tốc độ dùng lượt/ngân sách.",
    };
  }

  const usageEta = usageRemaining * elapsed / promotion.usageCount;
  const budgetEta = promotion.budgetUsed > 0
    ? budgetRemaining * elapsed / promotion.budgetUsed
    : Number.POSITIVE_INFINITY;

  if (remainingTime <= Math.min(usageEta, budgetEta)) {
    return {
      predictedBindingLimit: "time" as const,
      bindingLimitNote:
        `Ước tính hết thời gian ${promotion.endDate} trước theo tốc độ hiện tại.`,
    };
  }
  if (budgetEta <= usageEta) {
    return {
      predictedBindingLimit: "budget" as const,
      bindingLimitNote:
        "Ước tính ngân sách hết trước trần lượt theo tốc độ chi thực tế.",
    };
  }
  return {
    predictedBindingLimit: "usage" as const,
    bindingLimitNote:
      "Ước tính đủ lượt trước khi hết ngân sách theo tốc độ sử dụng hiện tại.",
  };
}

function assertActivatable(promotion: Promotion): void {
  const branches = getSalesBranches();

  if (
    promotion.branchIds.some(id => !branches.some(branch => branch.id === id)) ||
    !branches.some(branch => promotionAppliesAtBranch(promotion, branch.id))
  ) throw new Error("Phạm vi phải chứa ít nhất một chi nhánh hợp lệ.");

  if (
    promotion.productId &&
    !products.some(product => product.sku === promotion.productId)
  ) throw new Error("SKU khuyến mãi không tồn tại.");

  if (
    promotion.productCategory &&
    !products.some(product => product.category === promotion.productCategory)
  ) throw new Error("Nhóm món khuyến mãi không tồn tại.");

  if (
    promotion.discountType === "none" ||
    (
      promotion.discountType !== "buy_x_get_y" &&
      promotion.discountValue < 1
    )
  ) {
    throw new Error(
      "Chương trình thiếu mức ưu đãi có cấu trúc. Hãy sửa trước khi kích hoạt.",
    );
  }

  if (promotion.giftProductId) {
    throw new Error(
      "Quà tặng SKU/topping riêng chưa có quy tắc định giá. " +
      "Không kích hoạt chỉ bằng nội dung mô tả.",
    );
  }
  if (promotion.budget === 0) throw new Error("Ngân sách phải lớn hơn 0.");
}

function writePromotions(rows: Promotion[]): void {
  localStorage.setItem(STORAGE_PROMOTIONS, JSON.stringify(rows));
  notifyPromotionsChanged();
}

export async function upsertPromotion(
  input: Promotion,
  expectedVersion: number | null,
): Promise<void> {
  await withSalesWriteLock(() => {
    assertAdmin();
    const rows = loadPromotions();
    const current = rows.find(row => row.id === input.id);

    if (
      (current?.version ?? null) !== expectedVersion ||
      (!current && expectedVersion !== null)
    ) throw new Error("Chương trình đã thay đổi. Hãy tải lại trước khi lưu.");

    if (rows.some(row => row.id !== input.id &&
      row.code === input.code.trim().toUpperCase())) {
      throw new Error("Mã chương trình đã tồn tại.");
    }

    const next = normalizePromotion({
      ...input,
      version: current ? current.version + 1 : 1,
      usageCount: current?.usageCount ?? 0,
      budgetUsed: current?.budgetUsed ?? 0,
      branchUsage: current?.branchUsage ?? {},
      stackable: input.stackWithOtherPromo === "stackable",
    });

    if (current?.usageCount && (
      current.usageScope !== next.usageScope || current.oncePerMember !== next.oncePerMember ||
      current.code !== next.code
    )) {
      throw new Error("Không đổi mã/phạm vi trần lượt khi chương trình đã có sử dụng.");
    }

    if (Object.values(next.branchUsage).some(count =>
      next.usageScope === "branch" && count > next.usageLimit,
    )) throw new Error("Trần lượt mới thấp hơn số đã dùng tại chi nhánh.");

    if (next.status === "active" || next.status === "scheduled") {
      assertActivatable(next);
    }

    writePromotions(current
      ? rows.map(row => row.id === next.id ? next : row)
      : [next, ...rows]);
  });
}

export async function setPromotionStatus(
  id: string,
  expectedVersion: number,
  status: PromotionStatus,
): Promise<void> {
  const current = loadPromotions().find(row => row.id === id);
  if (!current) throw new Error("Không tìm thấy chương trình.");
  await upsertPromotion({ ...current, status }, expectedVersion);
}

export async function setBranchPromotions(
  branchId: string,
  enabled: boolean,
  promotionId?: string,
): Promise<void> {
  await withSalesWriteLock(() => {
    assertAdmin();

    if (!getSalesBranches().some(branch => branch.id === branchId)) {
      throw new Error("Chi nhánh không tồn tại.");
    }

    const rows = loadPromotions().map(promotion => {
      if (promotionId && promotion.id !== promotionId) return promotion;
      if (promotionAppliesAtBranch(promotion, branchId) === enabled) {
        return promotion;
      }

      // Giữ include/exclude, không làm mất ý nghĩa của các CN ngoài danh sách.
      const shouldContain = promotion.branchMode !== "include" ? !enabled : enabled;
      const ids = new Set(
        promotion.branchMode === "all" ? [] : promotion.branchIds,
      );

      if (shouldContain) ids.add(branchId);
      else ids.delete(branchId);

      return {
        ...promotion,
        branchMode: promotion.branchMode === "all"
          ? "exclude" as const
          : promotion.branchMode,
        branchIds: [...ids],
        version: promotion.version + 1,
      };
    });

    writePromotions(rows);
  });
}

export function listScopedPromotions(): Promotion[] {
  const role = checkLogin();
  if (!role) return [];
  const rows = loadPromotions();
  if (role === "owner" || role === "warehouse") return rows;

  const branch = scopedBranch();
  return branch
    ? rows.filter(row => promotionAppliesAtBranch(row, branch))
    : [];
}

/** Cảnh báo giao nhau, không tự động kết luận hai KM không thể cùng tồn tại. */
export function findPromotionConflicts(
  candidate: Promotion,
  rows: readonly Promotion[],
): Promotion[] {
  const branchIds = getSalesBranches().map(branch => branch.id);
  const matchesProduct = (promotion: Promotion, product: typeof products[number]) =>
    (!promotion.productId || promotion.productId === product.sku) &&
    (!promotion.productCategory || promotion.productCategory === product.category);

  return rows.filter(row =>
    row.id !== candidate.id &&
    (row.status === "active" || row.status === "scheduled") &&
    row.startDate <= candidate.endDate &&
    candidate.startDate <= row.endDate &&
    row.hourFrom < candidate.hourTo &&
    candidate.hourFrom < row.hourTo &&
    (row.channel === "all" || candidate.channel === "all" ||
      row.channel === candidate.channel) &&
    (row.shift === "all" || candidate.shift === "all" ||
      row.shift === candidate.shift) &&
    branchIds.some(branchId =>
      promotionAppliesAtBranch(row, branchId) &&
      promotionAppliesAtBranch(candidate, branchId),
    ) &&
    products.some(product =>
      matchesProduct(row, product) && matchesProduct(candidate, product),
    ),
  );
}

export function parsePromotionCodes(value: string): string[] {
  return [...new Set(
    value.trim().toUpperCase().split(/[,;\s]+/).filter(Boolean),
  )];
}

/** Phân bổ lũy kế, bảo toàn tổng và kiểm tra phép nhân trung gian. */
function allocate(total: number, weights: readonly number[]): number[] {
  integer(total, "Số tiền phân bổ");
  const weightTotal = sum(weights);
  if (weightTotal === 0) {
    if (total !== 0) throw new Error("Không thể phân bổ tiền trên tổng bằng 0.");
    return weights.map(() => 0);
  }

  let offset = 0;
  let previous = 0;

  return weights.map(weight => {
    integer(weight, "Trọng số");
    offset += weight;
    const product = total * offset;
    if (!Number.isSafeInteger(product)) {
      throw new Error("Giá trị vượt giới hạn phân bổ an toàn.");
    }
    const cumulative = Math.round(product / weightTotal);
    const amount = cumulative - previous;
    previous = cumulative;
    return amount;
  });
}

export function quotePromotionCheckout(
  input: PromotionQuoteInput,
): PromotionQuote {
  const base = calculatePosTotals(
    input.items, input.discountRate, input.taxRate, input.flatDiscount,
  );

  validatePercentage(input.discountRate, "Giảm hội viên");
  const codes = [...new Set(
    (input.promotionCodes ?? []).map(code => code.trim().toUpperCase()),
  )];
  const now = input.now ?? new Date();
  const clock = vietnamClock(now);
  const rows = codes.length ? loadPromotions() : [];

  const requested = codes.map(code => {
    const promotion = rows.find(row => row.code === code);
    if (!promotion) throw new Error(`Mã ${code} không tồn tại.`);
    if (
      getPromotionStatus(promotion, now) !== "active" ||
      !promotionAppliesAtBranch(promotion, input.branchId) ||
      (promotion.channel !== "all" && promotion.channel !== input.channel) ||
      (promotion.shift !== "all" && promotion.shift !== clock.shift) ||
      clock.time < promotion.hourFrom ||
      clock.time >= promotion.hourTo
    ) throw new Error(`Mã ${code} không áp dụng tại CN/kênh/thời điểm hiện tại.`);

    assertActivatable(promotion);
    assertQuota(promotion, input.branchId, clock.date, input.customerPhone?.replace(/[ .()-]/g, ""));
    return promotion;
  }).sort((a, b) => b.priority - a.priority);

  // Khi tồn tại mã độc quyền: chỉ giữ mã ưu tiên cao nhất.
  const selected = requested.some(row => row.stackWithOtherPromo === "exclusive")
    ? requested.slice(0, 1)
    : requested;

  const ignoredCodes = requested
    .filter(row => !selected.includes(row))
    .map(row => row.code);

  const memberSuppressed = selected.some(row => !row.stackWithMemberTier);
  const memberDiscount = memberSuppressed ? 0 : base.discount;
  const gross = input.items.map(item =>
    integer(item.unitPrice * item.quantity, "Giá dòng"),
  );
  const discounts = allocate(memberDiscount, gross);
  const appliedPromotions: AppliedPromotion[] = [];

  for (const promotion of selected) {
    const eligible = input.items.map(item => {
      const product = products.find(product => product.sku === item.productId);
      return Boolean(
        product &&
        (!promotion.productId || item.productId === promotion.productId) &&
        (!promotion.productCategory ||
          product.category === promotion.productCategory),
      );
    });

    const eligibleQuantity = sum(input.items.map((item, index) =>
      eligible[index] ? item.quantity : 0,
    ));

    if (eligibleQuantity < (promotion.minQuantity ?? 1)) {
      throw new Error(`Mã ${promotion.code} chưa đủ số ly thuộc phạm vi ưu đãi.`);
    }

    const remaining = gross.map((amount, index) =>
      eligible[index] ? amount - discounts[index] : 0,
    );
    const eligibleSubtotal = sum(remaining);

    let lineDiscounts: number[];

    if (promotion.discountType === "buy_x_get_y") {
      let freeQuantity = Math.floor(
        eligibleQuantity / (promotion.buyQuantity + promotion.giftQuantity),
      ) * promotion.giftQuantity;

      if (freeQuantity === 0) {
        throw new Error(
          `Mã ${promotion.code}: cần đủ ` +
          `${promotion.buyQuantity + promotion.giftQuantity} ly trong giỏ.`,
        );
      }

      lineDiscounts = input.items.map(() => 0);
      const sorted = input.items
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => eligible[index])
        .sort((a, b) => remaining[a.index] / a.item.quantity - remaining[b.index] / b.item.quantity);

      for (const { item, index } of sorted) {
        const count = Math.min(freeQuantity, item.quantity);
        // Phần còn lại sau các ưu đãi trước, không giảm vượt giá dòng.
        lineDiscounts[index] = Math.min(
          remaining[index],
          allocate(remaining[index], [count, item.quantity - count])[0],
        );
        freeQuantity -= count;
        if (freeQuantity === 0) break;
      }
    } else {
      const amount = promotion.discountType === "percent"
        ? calculatePosTotals(
          [{ quantity: 1, unitPrice: eligibleSubtotal }],
          promotion.discountValue, 0,
        ).discount
        : Math.min(promotion.discountValue, eligibleSubtotal);

      lineDiscounts = allocate(amount, remaining);
    }

    const discountAmount = sum(lineDiscounts);
    if (discountAmount === 0) {
      throw new Error(`Mã ${promotion.code} không tạo thêm ưu đãi cho giỏ này.`);
    }
    if (discountAmount > promotion.budget - promotion.budgetUsed) {
      throw new Error(
        `Mã ${promotion.code} không đủ ngân sách cho mức giảm của đơn này.`,
      );
    }

    lineDiscounts.forEach((amount, index) => {
      discounts[index] = integer(discounts[index] + amount, "Giảm giá dòng");
      if (discounts[index] > gross[index]) {
        throw new Error("Giảm giá vượt giá trị dòng.");
      }
    });

    appliedPromotions.push({
      campaignId: promotion.id,
      code: promotion.code,
      campaignVersion: promotion.version,
      discountAmount,
      eligibleSubtotal,
    });
  }

  const subtotal = sum(gross);
  const discount = sum(discounts);
  const taxable = gross.map((value, index) => value - discounts[index]);
  const tax = calculatePosTotals(
    [{ quantity: 1, unitPrice: subtotal - discount }],
    0, input.taxRate,
  ).tax;
  const lineTaxes = allocate(tax, taxable);
  const total = integer(subtotal - discount + tax, "Tổng thanh toán");

  return {
    subtotal, discount, tax, total,
    memberDiscount,
    memberSuppressed,
    appliedPromotions,
    ignoredCodes,
    lineAmounts: input.items.map((item, index) => ({
      id: item.id,
      paidDiscountAmount: discounts[index],
      paidTaxAmount: lineTaxes[index],
    })),
  };
}

/**
 * Chỉ tạo kế hoạch ghi. Caller checkout phải ghi các entry trong cùng journal
 * với orders/invoices; không gọi setItem riêng sau khi đã chốt đơn.
 */
export function planPromotionRedemptions(params: {
  customerPhone?: string;
  quote: PromotionQuote;
  checkoutId: string;
  orderId: string;
  branchId: string;
  createdAt: string;
}): [string, unknown][] {
  if (!params.quote.appliedPromotions.length) return [];

  const rows = loadPromotions();
  const redemptions = loadPromotionRedemptions();

  if (redemptions.some(row => row.checkoutId === params.checkoutId)) {
    throw new Error("Checkout đã có phát sinh KM nhưng chưa khớp đơn. Cần đối soát.");
  }

  const added: PromotionRedemption[] = [];

  for (const applied of params.quote.appliedPromotions) {
    const promotion = rows.find(row => row.id === applied.campaignId);
    if (!promotion || promotion.version !== applied.campaignVersion) {
      throw new Error("Khuyến mãi đã thay đổi. Vui lòng áp dụng lại.");
    }

    const phone = params.customerPhone?.replace(/[ .()-]/g, "");
    assertQuota(promotion, params.branchId, vietnamClock(new Date(params.createdAt)).date, phone);
    if (applied.discountAmount > promotion.budget - promotion.budgetUsed) throw new Error("Không đủ ngân sách.");

    promotion.usageCount = integer(promotion.usageCount + 1, "Lượt dùng");
    promotion.budgetUsed = integer(
      promotion.budgetUsed + applied.discountAmount, "Ngân sách đã dùng",
    );
    promotion.branchUsage[params.branchId] = integer(
      (promotion.branchUsage[params.branchId] ?? 0) + 1,
      "Lượt tại CN",
    );

    added.push({
      id: JSON.stringify([params.checkoutId, promotion.id]),
      checkoutId: params.checkoutId,
      orderId: params.orderId,
      campaignId: promotion.id,
      code: promotion.code,
      campaignVersion: promotion.version,
      branchId: params.branchId,
      createdAt: params.createdAt,
      memberPhone: promotion.oncePerMember ? phone : undefined,
      discountAmount: applied.discountAmount,
      eligibleSubtotal: applied.eligibleSubtotal,
      orderTotal: params.quote.total,
    });
  }

  return [
    [STORAGE_PROMOTIONS, rows],
    [PROMOTION_REDEMPTIONS_KEY, [...redemptions, ...added]],
  ];
}
