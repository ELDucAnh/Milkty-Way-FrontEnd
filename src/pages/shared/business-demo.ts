import { getTodayISO } from "./formatters";

export const SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"] as const;
export type Shift = (typeof SHIFTS)[number];
export type StoreStatus = "active" | "suspended";
export interface StoreBranch {
    id: string;
    code: string;
    name: string;
    area: string;
    address: string;
    manager: string;
    openingHours: string;
    posCount: number;
    receiptSchedule: Record<Shift, string>;
    status: StoreStatus;
}

export const INITIAL_STORES: StoreBranch[] = [
    ["CN01", "Bến Nghé", "Quận 1", "12 Nguyễn Huệ", 3],
    ["CN02", "Bàn Cờ", "Quận 3", "45 Nguyễn Đình Chiểu", 2],
    ["CN03", "Chợ Lớn", "Quận 5", "18 Trần Hưng Đạo", 2],
    ["CN04", "Tân Hưng", "Quận 7", "88 Nguyễn Thị Thập", 2],
    ["CN05", "Hàng Xanh", "Bình Thạnh", "20 Xô Viết Nghệ Tĩnh", 3],
    ["CN06", "Làng Đại Học", "Thủ Đức", "Đường Võ Trường Toản", 2],
    ["CN07", "Bảy Hiền", "Tân Bình", "100 Cách Mạng Tháng 8", 2],
    ["CN08", "Cityland", "Gò Vấp", "Khu Cityland", 2],
    ["CN09", "Phan Xích Long", "Phú Nhuận", "50 Phan Xích Long", 2],
    ["CN10", "Bắc Hải", "Quận 10", "12 Bắc Hải", 2],
    ["CN11", "Lãnh Binh Thăng", "Quận 11", "30 Lãnh Binh Thăng", 2],
    ["CN12", "Kênh Nước Đen", "Tân Phú", "Khu Kênh Nước Đen", 1],
].map(([code, name, area, address, posCount]) => ({
    id: String(code), code: String(code), name: String(name), area: String(area),
    address: String(address), manager: `Quản lý ${name}`, openingHours: "08:00–22:00",
    posCount: Number(posCount), status: "active" as const,
    receiptSchedule: { "Ca sáng": "05:30–06:30", "Ca chiều": "12:30–13:30", "Ca tối": "16:30–17:30" },
}));

export type IngredientDimension = "mass" | "volume" | "count";
export type IngredientGroup = "tea" | "dairy" | "syrup" | "topping" | "packaging" | "prepared";
export interface Ingredient {
    id: string;
    code: string;
    name: string;
    group: IngredientGroup;
    dimension: IngredientDimension;
    baseUnit: string;
    minimum: number;
    storage: string;
    shelfLifeDays: number | null;
}

export const INITIAL_INGREDIENTS: Ingredient[] = [
    { id: "ing-tea-leaf", code: "NL-001", name: "Trà đen Assam", group: "tea", dimension: "mass", baseUnit: "g", minimum: 3000, storage: "Khô, thoáng", shelfLifeDays: 365 },
    { id: "ing-tea-base", code: "TP-001", name: "Cốt hồng trà đặc", group: "prepared", dimension: "volume", baseUnit: "ml", minimum: 5000, storage: "Bảo quản lạnh", shelfLifeDays: 2 },
    { id: "ing-milk", code: "NL-002", name: "Bột kem béo sữa", group: "dairy", dimension: "mass", baseUnit: "g", minimum: 5000, storage: "Khô, thoáng", shelfLifeDays: 270 },
    { id: "ing-syrup", code: "NL-003", name: "Nước đường mía nấu", group: "syrup", dimension: "volume", baseUnit: "ml", minimum: 3000, storage: "Bảo quản lạnh sau mở nắp", shelfLifeDays: 7 },
    { id: "ing-pearl", code: "TP-002", name: "Trân châu đen đã nấu", group: "prepared", dimension: "mass", baseUnit: "g", minimum: 2000, storage: "Mát, dùng trong ngày", shelfLifeDays: 1 },
    { id: "ing-pearl-raw", code: "NL-004", name: "Trân châu đen khô", group: "topping", dimension: "mass", baseUnit: "g", minimum: 4000, storage: "Khô, thoáng", shelfLifeDays: 240 },
    { id: "ing-peach", code: "NL-005", name: "Syrup đào", group: "syrup", dimension: "volume", baseUnit: "ml", minimum: 2000, storage: "Mát, tránh ánh nắng", shelfLifeDays: 365 },
    { id: "ing-cup", code: "NL-006", name: "Ly nhựa 500 ml", group: "packaging", dimension: "count", baseUnit: "cái", minimum: 500, storage: "Khô, sạch", shelfLifeDays: null },
    { id: "ing-seal", code: "NL-007", name: "Màng ép miệng ly", group: "packaging", dimension: "count", baseUnit: "miếng", minimum: 500, storage: "Khô, sạch", shelfLifeDays: null },
];

export interface UnitConversion {
    id: string;
    unit: string;
    baseUnit: string;
    dimension: IngredientDimension;
    factor: number;
    example: string;
    active: boolean;
}
export const INITIAL_UNIT_CONVERSIONS: UnitConversion[] = [
    { id: "u-kg", unit: "kg", baseUnit: "g", dimension: "mass", factor: 1000, example: "1 kg = 1.000 g", active: true },
    { id: "u-l", unit: "lít", baseUnit: "ml", dimension: "volume", factor: 1000, example: "1 lít = 1.000 ml", active: true },
    { id: "u-box", unit: "thùng", baseUnit: "cái", dimension: "count", factor: 24, example: "1 thùng = 24 cái", active: true },
    { id: "u-pack", unit: "bịch", baseUnit: "g", dimension: "mass", factor: 1000, example: "1 bịch = 1.000 g", active: true },
    { id: "u-portion", unit: "phần", baseUnit: "g", dimension: "mass", factor: 0, example: "Chưa xác minh định lượng/phần", active: false },
];

export type ProductStatus = "active" | "branch-locked" | "inactive" | "pending-recipe";
export type ProductCategory = string;
export interface DemoCategory {
    id: string;
    code: string;
    key: string;
    name: string;
    description: string;
    active: boolean;
}
export const INITIAL_CATEGORIES: DemoCategory[] = [
    { id: "cat-milk-tea", code: "CAT-01", key: "milk-tea", name: "Trà sữa", description: "Trà nền sữa, có thể thêm topping", active: true },
    { id: "cat-fruit-tea", code: "CAT-02", key: "fruit-tea", name: "Trà trái cây", description: "Trà kết hợp trái cây và syrup", active: true },
    { id: "cat-macchiato", code: "CAT-03", key: "macchiato", name: "Macchiato", description: "Đồ uống có lớp kem mặn", active: true },
    { id: "cat-topping", code: "CAT-04", key: "topping", name: "Topping", description: "Tùy chọn thêm và nguyên liệu kèm", active: true },
    { id: "cat-seasonal", code: "CAT-05", key: "seasonal", name: "Món theo mùa", description: "Món giới hạn theo thời gian", active: true },
];
export interface ProductVariant { size: "M" | "L" | "Phần"; price: number; }
export interface ProductTopping {
    ingredientId: string;
    price: number;
    default: boolean;
    optional: boolean;
    quantity: number;
    unit: string;
}
export interface Product {
    id: string;
    code: string;
    name: string;
    category: ProductCategory;
    variants: ProductVariant[];
    cogsBySize: Record<string, number | null>;
    toppings: ProductTopping[];
    lockedStoreIds: string[];
    status: ProductStatus;
    note: string;
    imageName?: string;
}

export type RecipeKind = "drink" | "prep";
export type RecipeApproval = "draft" | "pending" | "approved";
export type RecipeUseType = "required" | "default-topping" | "optional-topping";
export interface RecipeIngredient {
    id: string;
    ingredientId: string;
    quantity: number;
    unit: string;
    useType: RecipeUseType;
    note: string;
    optionRule: string;
}
export interface RecipeVersion {
    id: string;
    code: string;
    kind: RecipeKind;
    productId: string | null;
    outputIngredientId: string | null;
    size: "M" | "L" | "Phần" | "Mẻ";
    yieldQuantity: number;
    yieldUnit: string;
    version: string;
    effectiveDate: string;
    approver: string;
    changeReason: string;
    status: RecipeApproval;
    ingredients: RecipeIngredient[];
}

const recipeLines = (items: Array<[string, number, string, RecipeUseType, string, string]>): RecipeIngredient[] =>
    items.map(([ingredientId, quantity, unit, useType, note, optionRule], index) => ({
        id: `${ingredientId}-${index}`, ingredientId, quantity, unit, useType, note, optionRule,
    }));

export const INITIAL_PRODUCTS: Product[] = [
    { id: "hd-001", code: "HD-001", name: "Hồng trà sữa trân châu", category: "milk-tea", variants: [{ size: "M", price: 35000 }, { size: "L", price: 42000 }], cogsBySize: { M: 18400, L: 22600 }, toppings: [{ ingredientId: "ing-pearl", price: 8000, default: false, optional: true, quantity: 30, unit: "g" }], lockedStoreIds: [], status: "active", note: "Menu lõi; giá chuẩn chỉ thay đổi qua phiên bản được duyệt." },
    { id: "hd-002", code: "HD-002", name: "Trà đào cam sả", category: "fruit-tea", variants: [{ size: "M", price: 39000 }, { size: "L", price: 46000 }], cogsBySize: { M: 20100, L: 24800 }, toppings: [], lockedStoreIds: [], status: "active", note: "Menu lõi toàn chuỗi." },
    { id: "hd-003", code: "HD-003", name: "Matcha kem sữa", category: "macchiato", variants: [{ size: "M", price: 42000 }, { size: "L", price: 49000 }], cogsBySize: { M: 23800, L: 28000 }, toppings: [{ ingredientId: "ing-pearl", price: 8000, default: false, optional: true, quantity: 30, unit: "g" }], lockedStoreIds: ["CN06"], status: "branch-locked", note: "Tạm khóa tại một cửa hàng do thiếu nguyên liệu." },
    { id: "tp-001", code: "TP-001", name: "Trân châu đen", category: "topping", variants: [{ size: "Phần", price: 8000 }], cogsBySize: { Phần: 3200 }, toppings: [], lockedStoreIds: [], status: "active", note: "Bán theo phần; quy tắc thêm/bỏ lưu trong công thức." },
    { id: "hd-004", code: "HD-004", name: "Trà dâu nhiệt đới", category: "fruit-tea", variants: [{ size: "M", price: 39000 }, { size: "L", price: 46000 }], cogsBySize: { M: null, L: null }, toppings: [], lockedStoreIds: [], status: "pending-recipe", note: "Chưa có công thức được duyệt." },
];

export const INITIAL_RECIPES: RecipeVersion[] = [
    { id: "rec-hd001-m-v11", code: "RC-HD001-M", kind: "drink", productId: "hd-001", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.1", effectiveDate: "2026-10-01", approver: "Quản lý sản phẩm", changeReason: "Phiên bản hiện hành", status: "approved", ingredients: recipeLines([["ing-tea-base", 100, "ml", "required", "Nền trà", ""], ["ing-milk", 30, "g", "required", "", ""], ["ing-syrup", 25, "ml", "required", "", "Điều chỉnh theo mức đường đã duyệt"], ["ing-pearl", 30, "g", "optional-topping", "Topping tùy chọn", "Bỏ topping thì không giữ/trừ; thêm gấp đôi cộng đúng 30 g"]]) },
    { id: "rec-hd001-l-v11", code: "RC-HD001-L", kind: "drink", productId: "hd-001", outputIngredientId: null, size: "L", yieldQuantity: 1, yieldUnit: "ly", version: "1.1", effectiveDate: "2026-10-01", approver: "Quản lý sản phẩm", changeReason: "Phiên bản hiện hành", status: "approved", ingredients: recipeLines([["ing-tea-base", 140, "ml", "required", "Nền trà", ""], ["ing-milk", 40, "g", "required", "", ""], ["ing-syrup", 35, "ml", "required", "", "Điều chỉnh theo mức đường đã duyệt"], ["ing-pearl", 40, "g", "optional-topping", "Topping tùy chọn", "Bỏ topping thì không giữ/trừ"]]) },
    { id: "rec-hd002-m-v10", code: "RC-HD002-M", kind: "drink", productId: "hd-002", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-09-15", approver: "Quản lý sản phẩm", changeReason: "Phiên bản đầu", status: "approved", ingredients: recipeLines([["ing-tea-base", 100, "ml", "required", "Nền trà", ""], ["ing-peach", 35, "ml", "required", "Syrup trái cây", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""]]) },
    { id: "rec-prep-tea-v1", code: "RC-BTP-TEA", kind: "prep", productId: null, outputIngredientId: "ing-tea-base", size: "Mẻ", yieldQuantity: 10000, yieldUnit: "ml", version: "1.0", effectiveDate: "2026-09-01", approver: "Quản lý khu chế biến", changeReason: "Mẻ tiêu chuẩn", status: "approved", ingredients: recipeLines([["ing-tea-leaf", 800, "g", "required", "Trà khô theo lô", "FEFO" ]]) },
    { id: "rec-prep-pearl-v1", code: "RC-BTP-PEARL", kind: "prep", productId: null, outputIngredientId: "ing-pearl", size: "Mẻ", yieldQuantity: 5000, yieldUnit: "g", version: "1.0", effectiveDate: "2026-09-01", approver: "Quản lý khu chế biến", changeReason: "Mẻ tiêu chuẩn", status: "approved", ingredients: recipeLines([["ing-pearl-raw", 2000, "g", "required", "Trân châu khô theo lô", "FEFO"]]) },
];

export type StockLocation = "central" | "kitchen" | "counter";
export interface IngredientLot {
    id: string;
    ingredientId: string;
    lotCode: string;
    manufactureDate: string | null;
    expiryDate: string | null;
    quantity: number;
    unitCost: number;
    quality: "pass" | "quarantine" | "expired";
    location: StockLocation;
    locationId: string;
    batchId: string | null;
    reservedQuantity?: number;
    lockedQuantity?: number;
}

export const INITIAL_LOTS: IngredientLot[] = [
    { id: "lot-central-tea-1", ingredientId: "ing-tea-leaf", lotCode: "TRA-261001", manufactureDate: "2026-10-01", expiryDate: "2027-10-01", quantity: 28400, unitCost: 450, quality: "pass", location: "central", locationId: "central", batchId: null, reservedQuantity: 960 },
    { id: "lot-central-milk-1", ingredientId: "ing-milk", lotCode: "SUA-260915", manufactureDate: "2026-09-15", expiryDate: "2027-06-15", quantity: 25000, unitCost: 120, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-central-syrup-1", ingredientId: "ing-syrup", lotCode: "DUONG-261020", manufactureDate: "2026-10-20", expiryDate: "2026-11-10", quantity: 9000, unitCost: 80, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-central-pearl-1", ingredientId: "ing-pearl-raw", lotCode: "TC-261020", manufactureDate: "2026-10-20", expiryDate: "2027-06-20", quantity: 10000, unitCost: 110, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-central-peach-1", ingredientId: "ing-peach", lotCode: "DAO-261001", manufactureDate: "2026-10-01", expiryDate: "2027-10-01", quantity: 6000, unitCost: 95, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-central-cup-1", ingredientId: "ing-cup", lotCode: "LY-261001", manufactureDate: null, expiryDate: null, quantity: 20000, unitCost: 250, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-central-seal-1", ingredientId: "ing-seal", lotCode: "MANG-261001", manufactureDate: null, expiryDate: null, quantity: 20000, unitCost: 80, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-central-expiring-1", ingredientId: "ing-peach", lotCode: "DAO-260801", manufactureDate: "2026-08-01", expiryDate: "2026-11-09", quantity: 500, unitCost: 90, quality: "pass", location: "central", locationId: "central", batchId: null },
    { id: "lot-kitchen-tea-1", ingredientId: "ing-tea-base", lotCode: "ME-261105-01", manufactureDate: "2026-11-05", expiryDate: "2026-11-12", quantity: 17000, unitCost: 65, quality: "pass", location: "kitchen", locationId: "kitchen", batchId: "batch-seed-1" },
    { id: "lot-kitchen-pearl-1", ingredientId: "ing-pearl", lotCode: "ME-261105-02", manufactureDate: "2026-11-05", expiryDate: "2026-11-10", quantity: 6000, unitCost: 160, quality: "pass", location: "kitchen", locationId: "kitchen", batchId: "batch-seed-2" },
    { id: "lot-counter-cn01-tea", ingredientId: "ing-tea-base", lotCode: "ME-261105-01", manufactureDate: "2026-11-05", expiryDate: "2026-11-12", quantity: 9100, unitCost: 65, quality: "pass", location: "counter", locationId: "CN01", batchId: "batch-seed-1", reservedQuantity: 500, lockedQuantity: 0 },
    { id: "lot-counter-cn01-milk", ingredientId: "ing-milk", lotCode: "SUA-260915", manufactureDate: "2026-09-15", expiryDate: "2027-06-15", quantity: 2100, unitCost: 120, quality: "pass", location: "counter", locationId: "CN01", batchId: null, reservedQuantity: 200, lockedQuantity: 0 },
    { id: "lot-counter-cn01-cup", ingredientId: "ing-cup", lotCode: "LY-261001", manufactureDate: null, expiryDate: null, quantity: 500, unitCost: 250, quality: "pass", location: "counter", locationId: "CN01", batchId: null },
    { id: "lot-counter-cn05-pearl", ingredientId: "ing-pearl", lotCode: "ME-261105-02", manufactureDate: "2026-11-05", expiryDate: "2026-11-10", quantity: 1200, unitCost: 160, quality: "pass", location: "counter", locationId: "CN05", batchId: "batch-seed-2" },
    { id: "lot-counter-cn05-tea", ingredientId: "ing-tea-base", lotCode: "ME-261105-01", manufactureDate: "2026-11-05", expiryDate: "2026-11-12", quantity: 7500, unitCost: 65, quality: "pass", location: "counter", locationId: "CN05", batchId: "batch-seed-1" },
    { id: "lot-counter-cn05-milk", ingredientId: "ing-milk", lotCode: "SUA-260915", manufactureDate: "2026-09-15", expiryDate: "2027-06-15", quantity: 2400, unitCost: 120, quality: "pass", location: "counter", locationId: "CN05", batchId: null },
];

export type BatchStatus = "planned" | "processing" | "completed" | "held";
export interface ProductionInput {
    id: string;
    ingredientId: string;
    lotId: string;
    plannedQuantity: number;
    actualQuantity: number | null;
    unit: string;
}
export interface ProductionBatch {
    id: string;
    code: string;
    recipeId: string;
    shift: Shift;
    plannedQuantity: number;
    inputs: ProductionInput[];
    actualQuantity: number | null;
    wasteQuantity: number | null;
    unit: string;
    startedAt: string;
    expiryDate: string;
    quality: "unchecked" | "pass" | "fail";
    operator: string;
    approver: string;
    status: BatchStatus;
}
export const INITIAL_BATCHES: ProductionBatch[] = [
    { id: "batch-seed-1", code: "ME-261105-01", recipeId: "rec-prep-tea-v1", shift: "Ca sáng", plannedQuantity: 20000, inputs: [{ id: "bi-seed-1", ingredientId: "ing-tea-leaf", lotId: "lot-central-tea-1", plannedQuantity: 1600, actualQuantity: 1600, unit: "g" }], actualQuantity: 20000, wasteQuantity: 0, unit: "ml", startedAt: "2026-11-05T05:30", expiryDate: "2026-11-12", quality: "pass", operator: "Nhân viên chế biến", approver: "Quản lý khu chế biến", status: "completed" },
    { id: "batch-seed-2", code: "ME-261105-02", recipeId: "rec-prep-pearl-v1", shift: "Ca sáng", plannedQuantity: 6000, inputs: [{ id: "bi-seed-2", ingredientId: "ing-pearl-raw", lotId: "lot-central-pearl-1", plannedQuantity: 2400, actualQuantity: 2400, unit: "g" }], actualQuantity: 6000, wasteQuantity: 0, unit: "g", startedAt: "2026-11-05T06:00", expiryDate: "2026-11-10", quality: "pass", operator: "Nhân viên chế biến", approver: "Quản lý khu chế biến", status: "completed" },
    { id: "batch-seed-3", code: "ME-261105-03", recipeId: "rec-prep-tea-v1", shift: "Ca chiều", plannedQuantity: 12000, inputs: [{ id: "bi-seed-3", ingredientId: "ing-tea-leaf", lotId: "lot-central-tea-1", plannedQuantity: 960, actualQuantity: null, unit: "g" }], actualQuantity: null, wasteQuantity: null, unit: "ml", startedAt: "2026-11-05T12:30", expiryDate: "2026-11-12", quality: "unchecked", operator: "Nhân viên chế biến", approver: "", status: "processing" },
];

export type PurchaseStatus = "draft" | "placed" | "partial" | "received";
export interface PurchaseOrderLine {
    id: string;
    ingredientId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unit: string;
    unitPrice: number;
}
export interface PurchaseOrder {
    id: string;
    code: string;
    supplier: string;
    orderDate: string;
    expectedDelivery: string;
    warehouseId: "central";
    paymentTerm: string;
    discount: number;
    shipping: number;
    tax: number;
    paid: number;
    note?: string;
    status: PurchaseStatus;
    lines: PurchaseOrderLine[];
}
export interface ReceiptLine {
    id: string;
    ingredientId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unit: string;
    lotCode: string;
    manufactureDate: string;
    expiryDate: string;
    unitPrice: number;
    quality: "pass" | "fail";
    note: string;
}
export interface ReceiptRecord {
    id: string;
    code: string;
    purchaseOrderId: string;
    document: string;
    receivedAt: string;
    receiver: string;
    lines: ReceiptLine[];
    note: string;
}

export type PlanStatus = "draft" | "pending" | "approved";
export interface PlanLine { id: string; ingredientId: string; quantity: number; approvedQuantity: number | null; unit: string; }
export interface DistributionPlan {
    id: string;
    code: string;
    storeId: string;
    date: string;
    shift: Shift;
    expectedCups: number;
    lines: PlanLine[];
    batchIds: string[];
    status: PlanStatus;
    note: string;
}

export type AllocationStatus = "draft" | "pending-dispatch" | "in-transit" | "received" | "discrepancy";
export interface AllocationLine {
    id: string;
    lotId: string;
    ingredientId: string;
    batchId: string;
    proposedQuantity: number;
    sentQuantity: number;
    receivedQuantity: number | null;
    unit: string;
}
export interface AllocationTicket {
    id: string;
    code: string;
    planId: string | null;
    sourceId: "kitchen";
    storeId: string;
    date: string;
    shift: Shift;
    lines: AllocationLine[];
    sender: string;
    receiver: string;
    sentAt: string | null;
    receivedAt: string | null;
    status: AllocationStatus;
    discrepancyReason: string;
}

export type CountPosition = "central" | "kitchen" | "counter";
export type CountStatus = "pending" | "approved";
export interface CountSnapshot {
    id: string;
    position: CountPosition;
    locationId: string;
    ingredientId: string;
    lotId: string;
    opening: number;
    received: number;
    actualUse: number;
    waste: number;
    unitCost: number;
    date?: string;
    shift?: Shift | null;
}
export interface InventoryCount {
    id: string;
    code: string;
    date: string;
    position: CountPosition;
    locationId: string;
    shift: Shift | null;
    ingredientId: string;
    lotId: string;
    opening: number;
    received: number;
    actualUse: number;
    waste: number;
    theoretical: number;
    counted: number;
    variance: number;
    varianceValue: number;
    reason: string;
    note: string;
    counter: string;
    approver: string;
    status: CountStatus;
}

export interface ReconciliationLine {
    id: string;
    ingredientId: string;
    lotId: string;
    opening: number;
    received: number;
    actualUse: number;
    waste: number;
    counted: number;
    unitCost: number;
    reason: string;
}
export type ReconciliationStatus = "draft" | "pending" | "approved";
export interface ShiftReconciliation {
    id: string;
    date: string;
    storeId: string;
    shift: Shift;
    opener: string;
    counter: string;
    approver: string;
    status: ReconciliationStatus;
    note: string;
    lines: ReconciliationLine[];
}

export interface DemoState {
    stores: StoreBranch[];
    categories: DemoCategory[];
    ingredients: Ingredient[];
    units: UnitConversion[];
    products: Product[];
    recipes: RecipeVersion[];
    lots: IngredientLot[];
    batches: ProductionBatch[];
    purchaseOrders: PurchaseOrder[];
    receipts: ReceiptRecord[];
    plans: DistributionPlan[];
    allocations: AllocationTicket[];
    countSnapshots: CountSnapshot[];
    counts: InventoryCount[];
    reconciliations: ShiftReconciliation[];
}

export const INITIAL_DEMO_STATE: DemoState = {
    stores: INITIAL_STORES,
    categories: INITIAL_CATEGORIES,
    ingredients: INITIAL_INGREDIENTS,
    units: INITIAL_UNIT_CONVERSIONS,
    products: INITIAL_PRODUCTS,
    recipes: INITIAL_RECIPES,
    lots: INITIAL_LOTS,
    batches: INITIAL_BATCHES,
    purchaseOrders: [
        { id: "po-042", code: "PO-2026-042", supplier: "Công ty Nguyên liệu An Tâm", orderDate: "2026-10-20", expectedDelivery: "2026-10-21", warehouseId: "central", paymentTerm: "Thanh toán trước", discount: 0, shipping: 0, tax: 0, paid: 13500000, status: "received", lines: [{ id: "po-042-l1", ingredientId: "ing-tea-leaf", orderedQuantity: 30000, receivedQuantity: 30000, unit: "g", unitPrice: 450 }] },
        { id: "po-043", code: "PO-2026-043", supplier: "Thực phẩm Minh Phát", orderDate: "2026-10-22", expectedDelivery: "2026-11-05", warehouseId: "central", paymentTerm: "Công nợ 15 ngày", discount: 0, shipping: 150000, tax: 0, paid: 0, status: "placed", lines: [{ id: "po-043-l1", ingredientId: "ing-milk", orderedQuantity: 50000, receivedQuantity: 0, unit: "g", unitPrice: 120 }] },
        { id: "po-044", code: "PO-2026-044", supplier: "Bao bì Sài Gòn", orderDate: "2026-10-25", expectedDelivery: "2026-11-06", warehouseId: "central", paymentTerm: "Công nợ 30 ngày", discount: 0, shipping: 0, tax: 0, paid: 0, status: "placed", lines: [{ id: "po-044-l1", ingredientId: "ing-cup", orderedQuantity: 5000, receivedQuantity: 0, unit: "cái", unitPrice: 250 }, { id: "po-044-l2", ingredientId: "ing-seal", orderedQuantity: 5000, receivedQuantity: 0, unit: "miếng", unitPrice: 80 }] },
        { id: "po-045", code: "PO-2026-045", supplier: "Hương liệu Việt", orderDate: "2026-10-27", expectedDelivery: "2026-11-07", warehouseId: "central", paymentTerm: "Công nợ 15 ngày", discount: 0, shipping: 0, tax: 0, paid: 0, status: "draft", lines: [{ id: "po-045-l1", ingredientId: "ing-peach", orderedQuantity: 12000, receivedQuantity: 0, unit: "ml", unitPrice: 95 }] },
    ],
    receipts: [
        { id: "receipt-seed-01", code: "PN-261104-01", purchaseOrderId: "po-042", document: "HD-AT-042", receivedAt: "2026-11-04", receiver: "Nhân viên kho tổng", note: "Đạt kiểm nhận.", lines: [{ id: "po-042-l1", ingredientId: "ing-tea-leaf", orderedQuantity: 30000, receivedQuantity: 30000, unit: "g", lotCode: "TRA-261001", manufactureDate: "2026-10-01", expiryDate: "2027-10-01", unitPrice: 450, quality: "pass", note: "" }] },
    ],
    plans: [
        { id: "plan-01", code: "KH-261105-01", storeId: "CN01", date: "2026-11-05", shift: "Ca sáng", expectedCups: 120, lines: [{ id: "plan-01-l1", ingredientId: "ing-tea-base", quantity: 5000, approvedQuantity: 5000, unit: "ml" }, { id: "plan-01-l2", ingredientId: "ing-pearl", quantity: 900, approvedQuantity: 900, unit: "g" }], batchIds: ["batch-seed-1", "batch-seed-2"], status: "approved", note: "Lượng mẫu theo nhu cầu ca sáng." },
        { id: "plan-02", code: "KH-261105-02", storeId: "CN05", date: "2026-11-05", shift: "Ca chiều", expectedCups: 160, lines: [{ id: "plan-02-l1", ingredientId: "ing-tea-base", quantity: 7000, approvedQuantity: null, unit: "ml" }, { id: "plan-02-l2", ingredientId: "ing-pearl", quantity: 1200, approvedQuantity: null, unit: "g" }], batchIds: ["batch-seed-1", "batch-seed-2"], status: "pending", note: "Chờ quản lý duyệt." },
    ],
    allocations: [
        { id: "alloc-01", code: "CP-261105-01", planId: "plan-01", sourceId: "kitchen", storeId: "CN01", date: "2026-11-05", shift: "Ca sáng", lines: [{ id: "alloc-01-l1", lotId: "lot-kitchen-tea-1", ingredientId: "ing-tea-base", batchId: "batch-seed-1", proposedQuantity: 3000, sentQuantity: 3000, receivedQuantity: 3000, unit: "ml" }], sender: "Nhân viên khu chế biến", receiver: "Quầy CN01", sentAt: "2026-11-05T05:45", receivedAt: "2026-11-05T06:05", status: "received", discrepancyReason: "" },
        { id: "alloc-02", code: "CP-261105-02", planId: "plan-02", sourceId: "kitchen", storeId: "CN05", date: "2026-11-05", shift: "Ca chiều", lines: [{ id: "alloc-02-l1", lotId: "lot-kitchen-pearl-1", ingredientId: "ing-pearl", batchId: "batch-seed-2", proposedQuantity: 1200, sentQuantity: 0, receivedQuantity: null, unit: "g" }], sender: "Nhân viên khu chế biến", receiver: "Quầy CN05", sentAt: null, receivedAt: null, status: "pending-dispatch", discrepancyReason: "" },
    ],
    countSnapshots: [
        { id: "snap-cn01-tea", position: "counter", locationId: "CN01", ingredientId: "ing-tea-base", lotId: "lot-counter-cn01-tea", opening: 15000, received: 3000, actualUse: 8500, waste: 200, unitCost: 65, date: "2026-11-05", shift: "Ca sáng" },
        { id: "snap-cn01-milk", position: "counter", locationId: "CN01", ingredientId: "ing-milk", lotId: "lot-counter-cn01-milk", opening: 5000, received: 0, actualUse: 2800, waste: 100, unitCost: 120, date: "2026-11-05", shift: "Ca sáng" },
        { id: "snap-central-cups", position: "central", locationId: "central", ingredientId: "ing-cup", lotId: "lot-central-cup-1", opening: 22000, received: 0, actualUse: 2000, waste: 0, unitCost: 250, date: "2026-11-05", shift: null },
    ],
    counts: [
        { id: "count-seed-01", code: "KK-261104-01", date: "2026-11-04", position: "counter", locationId: "CN01", shift: "Ca tối", ingredientId: "ing-tea-base", lotId: "lot-counter-cn01-tea", opening: 15000, received: 3000, actualUse: 8500, waste: 200, theoretical: 9300, counted: 9100, variance: 200, varianceValue: 13000, reason: "Sai lệch kiểm đếm", note: "Cần kiểm tra chứng từ cuối ca.", counter: "Nhân viên kho ca tối", approver: "Quản lý CN01", status: "pending" },
        { id: "count-seed-02", code: "KK-261105-05", date: "2026-11-05", position: "counter", locationId: "CN05", shift: "Ca chiều", ingredientId: "ing-pearl", lotId: "lot-counter-cn05-pearl", opening: 2000, received: 1200, actualUse: 1850, waste: 50, theoretical: 1300, counted: 1200, variance: 100, varianceValue: 16000, reason: "Hao hụt bán thành phẩm cuối ca", note: "Chờ quản lý chi nhánh CN05 phê duyệt điều chỉnh tồn kho.", counter: "Nhân viên kho CN05", approver: "Trần Thu Hà", status: "pending" },
    ],
    reconciliations: [
        { id: "rec-seed-01", date: "2026-11-04", storeId: "CN01", shift: "Ca tối", opener: "Thu ngân ca tối", counter: "Nhân viên kho ca tối", approver: "Quản lý CN01", status: "pending", note: "Có chênh lệch cần xác minh.", lines: [
            { id: "rec-seed-01-l1", ingredientId: "ing-tea-base", lotId: "lot-counter-cn01-tea", opening: 15000, received: 3000, actualUse: 8500, waste: 200, counted: 9100, unitCost: 65, reason: "Sai lệch kiểm đếm" },
            { id: "rec-seed-01-l2", ingredientId: "ing-milk", lotId: "lot-counter-cn01-milk", opening: 5000, received: 0, actualUse: 2800, waste: 100, counted: 2100, unitCost: 120, reason: "Pha chế lỗi" },
        ] },
    ],
};

export const DEMO_STORAGE_KEY = "miltyway.user2.demo.v1";

export function theoreticalBalance(opening: number, received: number, actualUse: number, waste: number): number {
    return opening + received - actualUse - waste;
}

export function getIngredient(state: DemoState, id: string): Ingredient | undefined {
    return state.ingredients.find((ingredient) => ingredient.id === id);
}

export function getStore(state: DemoState, id: string): StoreBranch | undefined {
    return state.stores.find((store) => store.id === id);
}

export function usableLotQuantity(lot: IngredientLot, today = getTodayISO()): number {
    if (lot.quality !== "pass" || lot.quantity <= 0 || (lot.expiryDate !== null && lot.expiryDate < today)) return 0;
    return lot.quantity;
}

export function availableLotQuantity(
    lot: IngredientLot,
    today = getTodayISO()
): number {
    const usable = usableLotQuantity(lot, today);

    return Math.max(
        0,
        usable
            - (lot.reservedQuantity ?? 0)
            - (lot.lockedQuantity ?? 0)
    );
}