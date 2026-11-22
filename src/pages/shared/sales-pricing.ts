import { products } from "../../data/sales/products";

export type PosSize = "M" | "L";

export const POS_SIZE_SURCHARGE: Readonly<Record<PosSize, number>> = {
  M: 0,
  L: 6000,
};

export const POS_TOPPINGS = [
  { id: "pearl", name: "Trân châu hoàng kim", price: 5000 },
  { id: "pudding", name: "Pudding trứng", price: 7000 },
  { id: "cheese", name: "Kem phô mai", price: 10000 },
  { id: "aloe", name: "Thạch nha đam", price: 5000 },
] as const;

export const POS_SUGAR_OPTIONS = [
  "0%",
  "30%",
  "50%",
  "70%",
  "100%",
] as const;

export const POS_ICE_OPTIONS = [
  "Không đá",
  "Ít đá",
  "Vừa đá",
  "Bình thường",
] as const;

export interface PosPriceSelection {
  /** SKU POS, ví dụ TS01. Không phải Product.id kho. */
  productId: string;
  size: PosSize;
  /** Tên topping, tương thích giỏ hàng hiện tại. */
  toppings: readonly string[];
}

export interface PosLine extends PosPriceSelection {
  /** ID dòng món, không phải ID sản phẩm. */
  id: string;
  name: string;
  sugar: string;
  ice: string;
  note: string;
  quantity: number;
  /** Giá một ly, đã gồm size và topping, chưa giảm giá/VAT. */
  unitPrice: number;
}

export interface PosAmountLine {
  quantity: number;
  unitPrice: number;
}

export interface PosTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

function requireMoney(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} phải là số nguyên không âm trong giới hạn an toàn.`);
  }

  return value;
}

export function validatePosQuantity(quantity: number): number {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 999
  ) {
    throw new Error("Số lượng phải là số nguyên từ 1 đến 999.");
  }

  return quantity;
}

export function validatePercentage(
  value: number,
  label = "Tỷ lệ",
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(`${label} phải nằm trong khoảng 0–100%.`);
  }

  return value;
}

/** Ô trống được hiểu là 0, tương thích giao diện hiện tại. */
export function parsePercentage(value: string): number | null {
  const number = value.trim() === "" ? 0 : Number(value);

  return Number.isFinite(number) && number >= 0 && number <= 100
    ? number
    : null;
}

export function findPosProduct(sku: string) {
  return products.find(product => product.sku === sku) ?? null;
}

/**
 * Chuẩn hóa thứ tự theo danh mục.
 * Không chấp nhận topping lạ hoặc lặp.
 */
export function normalizePosToppings(
  names: readonly string[],
): string[] {
  if (
    !Array.isArray(names) ||
    names.some(name => typeof name !== "string")
  ) {
    throw new Error("Danh sách topping không hợp lệ.");
  }

  if (new Set(names).size !== names.length) {
    throw new Error("Một loại topping không được chọn lặp.");
  }

  for (const name of names) {
    if (!POS_TOPPINGS.some(topping => topping.name === name)) {
      throw new Error(`Topping không tồn tại: ${name}.`);
    }
  }

  return POS_TOPPINGS
    .filter(topping => names.includes(topping.name))
    .map(topping => topping.name);
}

/** Tính giá hiện hành từ SKU và tùy chọn, không tin giá caller gửi. */
export function calculatePosUnitPrice(
  selection: PosPriceSelection,
): number {
  const product = findPosProduct(selection.productId);

  if (!product) {
    throw new Error("SKU POS không tồn tại trong danh mục.");
  }

  if (selection.size !== "M" && selection.size !== "L") {
    throw new Error("Cỡ ly không hợp lệ.");
  }

  const toppingNames = normalizePosToppings(selection.toppings);
  let price = requireMoney(product.price, "Giá danh mục");

  price = requireMoney(
    price + POS_SIZE_SURCHARGE[selection.size],
    "Giá sau phụ thu cỡ ly",
  );

  for (const topping of POS_TOPPINGS) {
    if (toppingNames.includes(topping.name)) {
      price = requireMoney(price + topping.price, "Giá sau topping");
    }
  }

  return price;
}

/**
 * Xác thực dòng món mới hoặc khôi phục từ bản nháp.
 * Giá thay đổi: từ chối, không âm thầm đổi giá thanh toán.
 */
export function validatePosLine(line: PosLine): PosLine {
  if (!line || typeof line !== "object") {
    throw new Error("Dòng món không hợp lệ.");
  }

  if (typeof line.id !== "string" || !line.id.trim()) {
    throw new Error("Dòng món thiếu ID.");
  }

  const product = findPosProduct(line.productId);

  if (!product) {
    throw new Error("SKU POS không tồn tại trong danh mục.");
  }

  if (!POS_SUGAR_OPTIONS.some(value => value === line.sugar)) {
    throw new Error(`Mức đường của món ${product.name} không hợp lệ.`);
  }

  if (!POS_ICE_OPTIONS.some(value => value === line.ice)) {
    throw new Error(`Mức đá của món ${product.name} không hợp lệ.`);
  }

  if (typeof line.note !== "string") {
    throw new Error("Ghi chú pha chế không hợp lệ.");
  }

  const quantity = validatePosQuantity(line.quantity);
  const toppingNames = normalizePosToppings(line.toppings);
  const unitPrice = calculatePosUnitPrice({
    productId: product.sku,
    size: line.size,
    toppings: toppingNames,
  });

  requireMoney(line.unitPrice, "Đơn giá");

  if (line.unitPrice !== unitPrice) {
    throw new Error(
      `Giá món ${product.name} đã thay đổi hoặc không hợp lệ. ` +
      "Vui lòng xóa dòng món và thêm lại trước khi thanh toán.",
    );
  }

  requireMoney(quantity * unitPrice, "Thành tiền dòng món");

  return {
    id: line.id,
    productId: product.sku,
    name: product.name,
    size: line.size,
    sugar: line.sugar,
    ice: line.ice,
    toppings: toppingNames,
    note: line.note.trim(),
    quantity,
    unitPrice,
  };
}

/** Dùng trước khi tạo đơn; trả về bản sao độc lập với giỏ hàng. */
export function validatePosItems(items: readonly PosLine[]): PosLine[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Giỏ hàng đang trống.");
  }

  const ids = new Set<string>();

  return items.map(item => {
    const validated = validatePosLine(item);

    if (ids.has(validated.id)) {
      throw new Error("Giỏ hàng có ID dòng món bị trùng.");
    }

    ids.add(validated.id);
    return validated;
  });
}

function percentageAmount(
  amount: number,
  rate: number,
  label: string,
): number {
  const weighted = amount * rate;

  // Kiểm tra cả phép nhân trung gian trước khi chia/làm tròn.
  if (!Number.isFinite(weighted) || weighted > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${label} vượt giới hạn tính toán an toàn.`);
  }

  return requireMoney(Math.round(weighted / 100), label);
}

/**
 * Tính từ snapshot đơn giá.
 * Cho phép [] để hiển thị giỏ trống.
 *
 * Khi checkout phải gọi validatePosItems() trước.
 * Không dùng validatePosItems() để tính lại hóa đơn lịch sử.
 */
export function calculatePosTotals(
  items: readonly PosAmountLine[],
  discountRate: number,
  taxRate: number,
  flatDiscount = 0,
): PosTotals {
  if (!Array.isArray(items)) {
    throw new Error("Danh sách món không hợp lệ.");
  }

  validatePercentage(discountRate, "Giảm giá");
  validatePercentage(taxRate, "Thuế VAT");

  let subtotal = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new Error("Dòng món không hợp lệ.");
    }

    validatePosQuantity(item.quantity);
    requireMoney(item.unitPrice, "Đơn giá");

    const lineTotal = requireMoney(
      item.quantity * item.unitPrice,
      "Thành tiền dòng món",
    );

    subtotal = requireMoney(subtotal + lineTotal, "Tạm tính");
  }

  requireMoney(flatDiscount, "Giảm tiền cố định");
  const percentageDiscount = percentageAmount(subtotal, discountRate, "Giảm giá");
  const discount = percentageDiscount + Math.min(flatDiscount, subtotal - percentageDiscount);
  const taxableAmount = requireMoney(
    subtotal - discount,
    "Số tiền tính thuế",
  );
  const tax = percentageAmount(taxableAmount, taxRate, "Thuế VAT");
  const total = requireMoney(taxableAmount + tax, "Tổng thanh toán");

  return { subtotal, discount, tax, total };
}

export function calculatePosChange(
  paidAmount: number,
  total: number,
): number {
  requireMoney(paidAmount, "Tiền khách đưa");
  requireMoney(total, "Tổng thanh toán");

  if (paidAmount < total) {
    throw new Error("Tiền khách đưa chưa đủ.");
  }

  return requireMoney(paidAmount - total, "Tiền thừa");
}
