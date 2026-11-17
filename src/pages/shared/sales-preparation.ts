import { products, type PosProduct } from "../../data/sales/products";
import { canVisit, currentStaff } from "../../utils/auth";
import { POS_TOPPINGS } from "./sales-pricing";
import {
  CHECKOUT_PENDING_KEY,
  RETURN_PENDING_KEY,
  loadOrders,
  saveOrders,
  type PreparationOrder,
  type PreparationStatus,
  type SalesOrder,
  type SalesOrderItem,
} from "./sales-orders-store";

export interface PreparationGroup {
  key: string;
  sku: string | null;
  item: SalesOrderItem;
  quantity: number;
  sources: {
    item: SalesOrderItem;
    index: number;
  }[];
  mappingError: string | null;
}

export interface KdsOrder extends PreparationOrder {
  groups: PreparationGroup[];
  orderNote: string;
}

export interface RecipePreviewRow {
  name: string;
  tier: "F0" | "F1";
  unit: string;
  baseAmount: number;
  previewAmount: number;
  source: "recipe" | "topping";
}

export interface RecipePreview {
  product: PosProduct | null;
  rows: RecipePreviewRow[];
  steps: string[];
  errors: string[];
  complete: boolean;
}

export const MOCK_RECIPE_RULES = {
  size: { M: 1, L: 1.25 },
  sugar: {
    "0%": 0,
    "30%": 0.3,
    "50%": 0.5,
    "70%": 0.7,
    "100%": 1,
  },
  ice: {
    "Không đá": 0,
    "Ít đá": 0.5,
    "Vừa đá": 1,
    "Bình thường": 1,
  },
} as const;

type ToppingId = (typeof POS_TOPPINGS)[number]["id"];

/**
 * Định mức demo cho MỘT phần topping/ly.
 * Ánh xạ chính xác qua ID POS, không phải mapping nguyên liệu kho.
 * Phần topping không tự tăng theo size/đường/đá.
 */
const MOCK_TOPPING_RECIPES: Record<
  ToppingId,
  { baseAmount: number; unit: string; tier: "F0" | "F1" }
> = {
  pearl: { baseAmount: 30, unit: "g", tier: "F1" },
  pudding: { baseAmount: 40, unit: "g", tier: "F1" },
  cheese: { baseAmount: 30, unit: "g", tier: "F1" },
  aloe: { baseAmount: 30, unit: "g", tier: "F1" },
};

export function resolvePreparationProduct(item: SalesOrderItem): {
  product: PosProduct | null;
  error: string | null;
} {
  if (item.sku && item.productId && item.sku !== item.productId) {
    return {
      product: null,
      error: "SKU và productId lịch sử không khớp. Cần đối chiếu mapping.",
    };
  }

  const sku = item.sku || item.productId;

  if (!sku) {
    return {
      product: null,
      error: "Dòng lịch sử thiếu SKU; chưa có mapping công thức.",
    };
  }

  const matches = products.filter(product => product.sku === sku);

  if (matches.length !== 1) {
    return {
      product: null,
      error: `SKU ${sku} chưa có mapping duy nhất trong danh mục POS.`,
    };
  }

  const product = matches[0];

  if (
    item.posProductId !== undefined &&
    item.posProductId !== product.id
  ) {
    return {
      product: null,
      error: `SKU ${sku} không khớp posProductId lịch sử.`,
    };
  }

  return { product, error: null };
}

/**
 * Không nhận nhiều đơn vào cùng một lần gọi:
 * các nhóm chỉ thuộc một đơn.
 *
 * Không trim note hoặc đổi tùy chọn đã lưu.
 * Dòng thiếu mapping được giữ riêng để tránh gom nhầm món.
 */
export function groupPreparationItems(
  items: readonly SalesOrderItem[],
): PreparationGroup[] {
  const groups = new Map<string, PreparationGroup>();

  items.forEach((item, index) => {
    if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        !Array.isArray(item.toppings) || item.toppings.some(topping => typeof topping !== "string") ||
        typeof item.name !== "string") {
      throw new Error(`Dòng món ${index + 1} không hợp lệ. Cần đối chiếu dữ liệu đơn.`);
    }
    const mapping = resolvePreparationProduct(item);

    const key = JSON.stringify([
      mapping.product
        ? ["sku", mapping.product.sku]
        : ["unmapped-line", index, item.id],
      item.size,
      item.sugar,
      item.ice,
      [...item.toppings].sort(),
      item.note,
    ]);

    const existing = groups.get(key);

    if (existing) {
      if (!Number.isSafeInteger(existing.quantity + item.quantity)) {
        throw new Error("Tổng số ly vượt giới hạn dữ liệu an toàn.");
      }
      existing.quantity += item.quantity;
      existing.sources.push({ item, index });
      return;
    }

    groups.set(key, {
      key,
      sku: mapping.product?.sku ?? null,
      item,
      quantity: item.quantity,
      sources: [{ item, index }],
      mappingError: mapping.error,
    });
  });

  return [...groups.values()];
}

export function getPreparationCup(
  group: PreparationGroup,
  zeroBasedIndex: number,
): { item: SalesOrderItem; cupNumber: number; sourceIndex: number } | null {
  if (
    !Number.isSafeInteger(zeroBasedIndex) ||
    zeroBasedIndex < 0 ||
    zeroBasedIndex >= group.quantity
  ) {
    return null;
  }

  let remaining = zeroBasedIndex;

  for (const source of group.sources) {
    if (remaining < source.item.quantity) {
      return {
        item: source.item,
        cupNumber: remaining + 1,
        sourceIndex: source.index,
      };
    }

    remaining -= source.item.quantity;
  }

  return null;
}

export function buildPreparationRecipe(
  item: SalesOrderItem,
  quantity: number,
): RecipePreview {
  const mapping = resolvePreparationProduct(item);

  const result: RecipePreview = {
    product: mapping.product,
    rows: [],
    steps: [],
    errors: [],
    complete: false,
  };

  if (mapping.error || !mapping.product) {
    result.errors.push(mapping.error ?? "Chưa có mapping công thức.");
    return result;
  }

  const product = mapping.product;

  if (
    product.recipeSource !== "mock" ||
    !product.recipeItems?.length ||
    !product.prepSteps?.length
  ) {
    result.errors.push(
      "Món đã có SKU nhưng chưa có recipe mock và bước pha đầy đủ.",
    );
    return result;
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    result.errors.push("Số ly preview phải là số nguyên dương.");
    return result;
  }

  const sizeFactor = Object.prototype.hasOwnProperty.call(
    MOCK_RECIPE_RULES.size,
    item.size,
  )
    ? MOCK_RECIPE_RULES.size[item.size]
    : undefined;

  const sugarFactor = Object.prototype.hasOwnProperty.call(
    MOCK_RECIPE_RULES.sugar,
    item.sugar,
  )
    ? MOCK_RECIPE_RULES.sugar[
        item.sugar as keyof typeof MOCK_RECIPE_RULES.sugar
      ]
    : undefined;

  const iceFactor = Object.prototype.hasOwnProperty.call(
    MOCK_RECIPE_RULES.ice,
    item.ice,
  )
    ? MOCK_RECIPE_RULES.ice[
        item.ice as keyof typeof MOCK_RECIPE_RULES.ice
      ]
    : undefined;

  if (sizeFactor === undefined) {
    result.errors.push(`Chưa có hệ số mock cho size "${item.size}".`);
  }

  if (sugarFactor === undefined) {
    result.errors.push(`Chưa có hệ số mock cho đường "${item.sugar}".`);
  }

  if (iceFactor === undefined) {
    result.errors.push(`Chưa có hệ số mock cho đá "${item.ice}".`);
  }

  result.steps = [...product.prepSteps];

  // Không âm thầm thay tùy chọn lạ bằng tùy chọn tiêu chuẩn.
  if (
    sizeFactor === undefined ||
    sugarFactor === undefined ||
    iceFactor === undefined
  ) {
    return result;
  }

  const roundAmount = (amount: number) =>
    Math.round((amount + Number.EPSILON) * 100) / 100;

  for (const ingredient of product.recipeItems) {
    const factor =
      sizeFactor *
      (ingredient.scaleWithSugar ? sugarFactor : 1) *
      (ingredient.scaleWithIce ? iceFactor : 1);

    const previewAmount = roundAmount(
      ingredient.baseAmount * factor * quantity,
    );

    if (
      !Number.isFinite(ingredient.baseAmount) ||
      ingredient.baseAmount < 0 ||
      !Number.isFinite(previewAmount) ||
      previewAmount < 0
    ) {
      result.errors.push(`Định mức "${ingredient.name}" không hợp lệ.`);
      continue;
    }

    result.rows.push({
      name: ingredient.name,
      tier: ingredient.tier,
      unit: ingredient.unit,
      baseAmount: ingredient.baseAmount,
      previewAmount,
      source: "recipe",
    });
  }

  const seenToppings = new Set<string>();

  for (const name of item.toppings) {
    if (seenToppings.has(name)) {
      result.errors.push(`Topping "${name}" bị lặp trong dữ liệu lịch sử.`);
      continue;
    }

    seenToppings.add(name);

    // So sánh chính xác, không includes/fuzzy matching.
    const topping = POS_TOPPINGS.find(candidate => candidate.name === name);

    if (!topping) {
      result.errors.push(`Chưa có mapping định mức topping "${name}".`);
      continue;
    }

    const recipe = MOCK_TOPPING_RECIPES[topping.id];

    result.rows.push({
      name: topping.name,
      tier: recipe.tier,
      unit: recipe.unit,
      baseAmount: recipe.baseAmount,
      previewAmount: roundAmount(recipe.baseAmount * quantity),
      source: "topping",
    });
  }

  result.complete = result.errors.length === 0;
  return result;
}

export function isPreparationQueueOrder(order: SalesOrder): boolean {
  if (
    !order.branchId ||
    !Array.isArray(order.items) ||
    order.items.length === 0 ||
    order.delivery === "delivered" ||
    order.payment === "refunded" ||
    !!order.replacedByOrderId ||
    order.onlineDecision === "rejected"
  ) {
    return false;
  }

  // Đơn online chưa được đưa vào pha chế không tự xuất hiện trong KDS.
  if (order.channel === "online" && !order.preparation) {
    return false;
  }

  return (
    order.preparation === null ||
    order.preparation === "waiting" ||
    order.preparation === "preparing" ||
    order.preparation === "ready"
  );
}

export function loadPreparationQueue(now = Date.now()): KdsOrder[] {
  const staff = currentStaff();

  if (!staff?.loginRole || !canVisit("/sales/preparation", staff.loginRole)) {
    return [];
  }

  return loadOrders()
    .filter(order => {
      const matchesScope =
        staff.branchId === null || order.branchId === staff.branchId;

      return matchesScope && isPreparationQueueOrder(order);
    })
    .map(order => {
      const items = order.items.flatMap(item => {
        const quantity = item.quantity - (item.returnedQty ?? 0);
        if (quantity <= 0 || item.preparedBeforeExchange === "delivered" ||
            (item.preparedBeforeExchange === "ready" && order.preparation !== "ready")) return [];
        return [{ ...item, quantity }];
      });
      const status = order.preparation ?? "waiting";
      const createdAt = new Date(order.createdAt).getTime();
      const elapsed = Number.isFinite(createdAt)
        ? Math.max(0, Math.floor((now - createdAt) / 60000))
        : 0;

      return {
        id: order.id,
        branchId: order.branchId,
        channel: order.channel,
        receivedAt: order.createdAt,
        waitingMinutes: status === "ready" ? 0 : elapsed,
        itemSummary: items
          .map(item => `${item.quantity} × ${item.name} (Size ${item.size})`)
          .join(" + "),
        optionSummary: null,
        note: items
          .map(item => item.note)
          .filter(Boolean)
          .join("; ") || "Không có",
        status,
        groups: groupPreparationItems(items),
        orderNote: order.orderNote ?? "",
      };
    });
}

/**
 * Auth hiện chưa có Action dành riêng cho KDS.
 * Giữ chính sách thao tác quầy: cashier/manager đúng CN và được vào KDS.
 * Owner chỉ xem; warehouse/guest không được thao tác.
 */
export function canManagePreparation(
  branchId: string,
  expectedStaffId?: string,
): boolean {
  const staff = currentStaff();

  return Boolean(
    staff?.loginRole &&
      (!expectedStaffId || staff.staffId === expectedStaffId) &&
      (staff.loginRole === "cashier" || staff.loginRole === "manager") &&
      staff.branchId === branchId &&
      canVisit("/sales/preparation", staff.loginRole),
  );
}

export type PreparationAction = "start" | "ready" | "handover";

export function changePreparation(input: {
  orderId: string;
  branchId: string;
  expectedStatus: PreparationStatus;
  actorStaffId: string;
  action: PreparationAction;
}): void {
  const assertWritable = () => {
    if (
      !input.actorStaffId ||
      !canManagePreparation(input.branchId, input.actorStaffId)
    ) {
      throw new Error(
        "Phiên hoặc quyền thao tác CN đã thay đổi. Vui lòng tải lại KDS.",
      );
    }

    // Không ghi vào tập đơn khi checkout đang ghi dở hoặc chờ đối soát.
    if (localStorage.getItem(CHECKOUT_PENDING_KEY) !== null || localStorage.getItem(RETURN_PENDING_KEY) !== null) {
      throw new Error(
        "Có giao dịch POS đang ghi hoặc chưa đối soát. Chưa thể cập nhật KDS.",
      );
    }
  };

  assertWritable();

  // Đọc lại toàn bộ đơn, không ghi từ snapshot trong React.
  const orders = loadOrders();
  const index = orders.findIndex(order => order.id === input.orderId);
  const order = orders[index];

  if (
    !order ||
    order.branchId !== input.branchId ||
    !isPreparationQueueOrder(order)
  ) {
    throw new Error("Đơn không còn trong hàng đợi hoặc đã đổi phạm vi CN.");
  }

  const currentStatus = order.preparation ?? "waiting";

  if (currentStatus !== input.expectedStatus) {
    throw new Error(
      "Trạng thái đơn đã thay đổi. Hãy làm mới trước khi thao tác tiếp.",
    );
  }

  let updated: SalesOrder;

  switch (input.action) {
    case "start":
      if (currentStatus !== "waiting") {
        throw new Error("Chỉ nhận pha chế đơn đang chờ.");
      }
      updated = { ...order, preparation: "preparing" };
      break;

    case "ready":
      if (currentStatus !== "preparing") {
        throw new Error("Chỉ đánh dấu sẵn sàng cho đơn đang pha chế.");
      }
      updated = { ...order, preparation: "ready" };
      break;

    case "handover":
      if (
        currentStatus !== "ready" ||
        (order.delivery !== null &&
          order.delivery !== "pickup" &&
          order.delivery !== "waiting")
      ) {
        throw new Error(
          "Đơn chưa sẵn sàng hoặc đã chuyển sang luồng giao hàng khác.",
        );
      }
      updated = { ...order, delivery: "delivered" };
      break;

    default:
      throw new Error("Thao tác KDS không hợp lệ.");
  }

  const nextOrders = [...orders];
  nextOrders[index] = updated;

  // Kiểm tra lại ngay trước ghi. Không cập nhật hóa đơn/giá/tồn kho.
  assertWritable();
  saveOrders(nextOrders);
}
