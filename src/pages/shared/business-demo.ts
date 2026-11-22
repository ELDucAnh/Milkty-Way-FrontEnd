import { getTodayISO } from "./formatters";

export function relativeDateISO(offsetDays: number, baseISO = getTodayISO()): string {
    const baseMs = Date.parse(`${baseISO}T00:00:00Z`);
    if (Number.isNaN(baseMs)) return baseISO;
    return new Date(baseMs + offsetDays * 86400000).toISOString().slice(0, 10);
}

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
export type IngredientTier = "F0" | "F1";
export type IngredientFlowType = "F0_TO_F1_TO_DISH" | "F0_DIRECT_TO_DISH";

export interface ParentF0Item {
    ingredientId: string;
    quantityPerBatch: number;
    batchYield: number;
    unit: string;
}

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
    tier?: IngredientTier;
    flowType?: IngredientFlowType;
    parentF0Items?: ParentF0Item[];
    avgDailyUsage?: number;
    leadTimeDays?: number;
    safetyStock?: number;
    branchMinimums?: Record<string, number>;
    thresholdRuleText?: string;
}

export const INITIAL_INGREDIENTS: Ingredient[] = [
    {
        id: "ing-tea-leaf", code: "NL-001", name: "Trà đen Assam", group: "tea", dimension: "mass", baseUnit: "g", minimum: 3000,
        storage: "Khô, thoáng", shelfLifeDays: 365, tier: "F0", flowType: "F0_TO_F1_TO_DISH",
        avgDailyUsage: 800, leadTimeDays: 3, safetyStock: 600,
        branchMinimums: { "Kho Tổng": 3000, "Khu chế biến": 1600, CN01: 800, CN05: 700 },
        thresholdRuleText: "Ngưỡng Kho Tổng tính theo chu kỳ giao NCC 3 ngày + tồn an toàn; quầy CN dùng mức nhỏ hơn.",
    },
    {
        id: "ing-tea-base", code: "TP-001", name: "Cốt hồng trà đặc", group: "prepared", dimension: "volume", baseUnit: "ml", minimum: 5000,
        storage: "Bảo quản lạnh", shelfLifeDays: 2, tier: "F1", flowType: "F0_TO_F1_TO_DISH",
        parentF0Items: [
            { ingredientId: "ing-tea-leaf", quantityPerBatch: 800, batchYield: 10000, unit: "g" },
            { ingredientId: "ing-syrup", quantityPerBatch: 500, batchYield: 10000, unit: "ml" },
        ],
        avgDailyUsage: 12000, leadTimeDays: 1, safetyStock: 3000,
        branchMinimums: { "Kho Tổng": 15000, "Khu chế biến": 10000, CN01: 5000, CN05: 4500, CN02: 3500, CN08: 3500 },
        thresholdRuleText: "Bán thành phẩm F1 nấu tại bếp trung tâm dùng trong 48h; ngưỡng từng quầy theo lượng ly bán hàng ngày.",
    },
    {
        id: "ing-milk", code: "NL-002", name: "Bột kem béo sữa", group: "dairy", dimension: "mass", baseUnit: "g", minimum: 5000,
        storage: "Khô, thoáng", shelfLifeDays: 270, tier: "F0", flowType: "F0_TO_F1_TO_DISH",
        avgDailyUsage: 1800, leadTimeDays: 2, safetyStock: 1400,
        branchMinimums: { "Kho Tổng": 20000, CN01: 3000, CN05: 2500, CN02: 2000, CN08: 2000 },
        thresholdRuleText: "Ngưỡng Kho Tổng đáp ứng toàn chuỗi; ngưỡng quầy CN dựa trên mức tiêu thụ 1 ngày + dự phòng.",
    },
    {
        id: "ing-syrup", code: "NL-003", name: "Nước đường mía nấu", group: "syrup", dimension: "volume", baseUnit: "ml", minimum: 3000,
        storage: "Bảo quản lạnh sau mở nắp", shelfLifeDays: 7, tier: "F0", flowType: "F0_DIRECT_TO_DISH",
        avgDailyUsage: 2200, leadTimeDays: 1, safetyStock: 800,
        branchMinimums: { "Kho Tổng": 8000, CN01: 2500, CN05: 2000, CN02: 1800 },
        thresholdRuleText: "Ngưỡng an toàn dựa trên tỷ lệ đường bình quân mỗi ly và chu kỳ cấp từ Kho Tổng.",
    },
    {
        id: "ing-pearl", code: "TP-002", name: "Trân châu đen đã nấu", group: "prepared", dimension: "mass", baseUnit: "g", minimum: 2000,
        storage: "Mát, dùng trong ngày", shelfLifeDays: 1, tier: "F1", flowType: "F0_TO_F1_TO_DISH",
        parentF0Items: [{ ingredientId: "ing-pearl-raw", quantityPerBatch: 2000, batchYield: 5000, unit: "g" }],
        avgDailyUsage: 3000, leadTimeDays: 1, safetyStock: 500,
        branchMinimums: { "Kho Tổng": 3500, "Khu chế biến": 4000, CN01: 1800, CN05: 1500, CN08: 1200 },
        thresholdRuleText: "Topping nấu theo ngày từ trân châu khô F0; quầy CN giữ ngưỡng vừa đủ tránh tồn hủy cuối ca.",
    },
    {
        id: "ing-pearl-raw", code: "NL-004", name: "Trân châu đen khô", group: "topping", dimension: "mass", baseUnit: "g", minimum: 4000,
        storage: "Khô, thoáng", shelfLifeDays: 240, tier: "F0", flowType: "F0_TO_F1_TO_DISH",
        avgDailyUsage: 2400, leadTimeDays: 3, safetyStock: 1200,
        branchMinimums: { "Kho Tổng": 12000, CN01: 2000, CN05: 2000 },
        thresholdRuleText: "Nguyên liệu F0 tại Kho Tổng phục vụ nấu mẻ trân châu F1.",
    },
    {
        id: "ing-peach", code: "NL-005", name: "Syrup đào", group: "syrup", dimension: "volume", baseUnit: "ml", minimum: 2000,
        storage: "Mát, tránh ánh nắng", shelfLifeDays: 365, tier: "F0", flowType: "F0_DIRECT_TO_DISH",
        avgDailyUsage: 900, leadTimeDays: 2, safetyStock: 500,
        branchMinimums: { "Kho Tổng": 5000, CN01: 1500, CN05: 1500 },
        thresholdRuleText: "Xuất thẳng từ Kho Tổng về quầy pha chế các món trà trái cây.",
    },
    {
        id: "ing-cup", code: "NL-006", name: "Ly nhựa 500 ml", group: "packaging", dimension: "count", baseUnit: "cái", minimum: 500,
        storage: "Khô, sạch", shelfLifeDays: null, tier: "F0", flowType: "F0_DIRECT_TO_DISH",
        avgDailyUsage: 450, leadTimeDays: 2, safetyStock: 200,
        branchMinimums: { "Kho Tổng": 5000, CN01: 500, CN05: 400, CN08: 350 },
        thresholdRuleText: "Bao bì tiêu hao 1:1 theo sản lượng ly phục vụ tại mỗi chi nhánh.",
    },
    {
        id: "ing-seal", code: "NL-007", name: "Màng ép miệng ly", group: "packaging", dimension: "count", baseUnit: "miếng", minimum: 500,
        storage: "Khô, sạch", shelfLifeDays: null, tier: "F0", flowType: "F0_DIRECT_TO_DISH",
        avgDailyUsage: 450, leadTimeDays: 2, safetyStock: 200,
        branchMinimums: { "Kho Tổng": 5000, CN01: 500, CN05: 400 },
        thresholdRuleText: "Đi kèm đồng bộ với số lượng ly nhựa tiêu thụ.",
    },
    {
        id: "ing-green-tea", code: "NL-008", name: "Trà xanh nhài nguyên lá", group: "tea", dimension: "mass", baseUnit: "g", minimum: 2500,
        storage: "Khô, kín khí", shelfLifeDays: 300, tier: "F0", flowType: "F0_TO_F1_TO_DISH",
        avgDailyUsage: 650, leadTimeDays: 2, safetyStock: 700,
        branchMinimums: { "Kho Tổng": 4000, CN01: 1000, CN05: 900 },
        thresholdRuleText: "Trà xanh nhài F0 dùng để ủ cốt lục trà nhài F1 và pha trực tiếp một số món trà hoa quả.",
    },
    {
        id: "ing-green-tea-base", code: "TP-003", name: "Cốt lục trà nhài ủ lạnh", group: "prepared", dimension: "volume", baseUnit: "ml", minimum: 4000,
        storage: "Bảo quản lạnh 4°C", shelfLifeDays: 2, tier: "F1", flowType: "F0_TO_F1_TO_DISH",
        parentF0Items: [
            { ingredientId: "ing-green-tea", quantityPerBatch: 600, batchYield: 10000, unit: "g" },
            { ingredientId: "ing-syrup", quantityPerBatch: 400, batchYield: 10000, unit: "ml" },
        ],
        avgDailyUsage: 5500, leadTimeDays: 1, safetyStock: 1500,
        branchMinimums: { "Kho Tổng": 8000, "Khu chế biến": 6000, CN01: 3000, CN05: 2500 },
        thresholdRuleText: "Cốt bán thành phẩm F1 ủ từ Trà xanh nhài nguyên lá F0.",
    },
    {
        id: "ing-cheese-cream", code: "TP-004", name: "Kem Macchiato đánh sẵn", group: "prepared", dimension: "mass", baseUnit: "g", minimum: 1500,
        storage: "Ngăn mát 2–4°C", shelfLifeDays: 2, tier: "F1", flowType: "F0_TO_F1_TO_DISH",
        parentF0Items: [{ ingredientId: "ing-milk", quantityPerBatch: 1200, batchYield: 4000, unit: "g" }],
        avgDailyUsage: 1400, leadTimeDays: 1, safetyStock: 400,
        branchMinimums: { "Kho Tổng": 3000, CN01: 1200, CN05: 1000 },
        thresholdRuleText: "Lớp kem mặn F1 đánh từ bột kem béo sữa F0.",
    },
    {
        id: "ing-jelly", code: "NL-009", name: "Thạch đào & trân châu trắng ăn liền", group: "topping", dimension: "mass", baseUnit: "g", minimum: 3000,
        storage: "Mát sau mở nắp", shelfLifeDays: 90, tier: "F0", flowType: "F0_DIRECT_TO_DISH",
        avgDailyUsage: 1500, leadTimeDays: 2, safetyStock: 800,
        branchMinimums: { "Kho Tổng": 9000, CN01: 2200, CN05: 1800, CN08: 1500 },
        thresholdRuleText: "Luồng F0 -> Món trực tiếp: xuất thẳng về quầy chi nhánh, không qua sơ chế F1.",
    },
];

export interface IgnoredThresholdRule {
    id: string;
    ingredientId: string;
    scope: "ALL" | string;
    reason: string;
    ignoredBy: string;
    ignoredAt: string;
}

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
    createdAt?: string;
}

export type RecipePriority = 1 | 2 | 3;
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
export interface RecipeReplacementHistory {
    id: string;
    date: string;
    actor: string;
    fromIngredientId: string;
    toIngredientId: string;
    disposition: "sell-through" | "discard-remake";
    note: string;
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
    priority?: RecipePriority;
    hierarchyPath?: "F0 -> F1 -> Món" | "F0 -> Món";
    ingredients: RecipeIngredient[];
    replacementHistory?: RecipeReplacementHistory[];
}

const recipeLines = (items: Array<[string, number, string, RecipeUseType, string, string]>): RecipeIngredient[] =>
    items.map(([ingredientId, quantity, unit, useType, note, optionRule], index) => ({
        id: `${ingredientId}-${index}`, ingredientId, quantity, unit, useType, note, optionRule,
    }));

export const INITIAL_PRODUCTS: Product[] = [
    { id: "hd-001", code: "HD-001", name: "Hồng trà sữa trân châu", category: "milk-tea", variants: [{ size: "M", price: 35000 }, { size: "L", price: 42000 }], cogsBySize: { M: 18400, L: 22600 }, toppings: [{ ingredientId: "ing-pearl", price: 8000, default: false, optional: true, quantity: 30, unit: "g" }], lockedStoreIds: [], status: "active", note: "Menu lõi; giá chuẩn chỉ thay đổi qua phiên bản được duyệt.", createdAt: "2026-08-12" },
    { id: "hd-002", code: "HD-002", name: "Trà đào cam sả", category: "fruit-tea", variants: [{ size: "M", price: 39000 }, { size: "L", price: 46000 }], cogsBySize: { M: 20100, L: 24800 }, toppings: [], lockedStoreIds: [], status: "active", note: "Menu lõi toàn chuỗi.", createdAt: "2026-09-02" },
    { id: "hd-003", code: "HD-003", name: "Matcha kem sữa", category: "macchiato", variants: [{ size: "M", price: 42000 }, { size: "L", price: 49000 }], cogsBySize: { M: 23800, L: 28000 }, toppings: [{ ingredientId: "ing-pearl", price: 8000, default: false, optional: true, quantity: 30, unit: "g" }], lockedStoreIds: ["CN05", "CN06"], status: "branch-locked", note: "Tạm khóa tại CN05 và CN06 do bảo trì máy đánh kem.", createdAt: "2026-09-20" },
    { id: "tp-001", code: "TP-001", name: "Trân châu đen", category: "topping", variants: [{ size: "Phần", price: 8000 }], cogsBySize: { Phần: 3200 }, toppings: [], lockedStoreIds: [], status: "active", note: "Bán theo phần; quy tắc thêm/bỏ lưu trong công thức.", createdAt: "2026-07-15" },
    { id: "hd-004", code: "HD-004", name: "Trà dâu nhiệt đới", category: "fruit-tea", variants: [{ size: "M", price: 39000 }, { size: "L", price: 46000 }], cogsBySize: { M: null, L: null }, toppings: [], lockedStoreIds: ["CN08"], status: "pending-recipe", note: "Chưa có công thức được duyệt.", createdAt: "2026-11-10" },
    { id: "hd-005", code: "HD-005", name: "Lục trà xanh nhài kem cheese", category: "macchiato", variants: [{ size: "M", price: 45000 }, { size: "L", price: 52000 }], cogsBySize: { M: 21500, L: 25900 }, toppings: [{ ingredientId: "ing-jelly", price: 7000, default: false, optional: true, quantity: 35, unit: "g" }], lockedStoreIds: [], status: "active", note: "Sử dụng cốt lục trà nhài ủ từ Trà xanh nhài F0.", createdAt: "2026-11-14" },
    { id: "hd-006", code: "HD-006", name: "Trà xanh nhài thạch trân châu siêu cấp", category: "fruit-tea", variants: [{ size: "M", price: 41000 }, { size: "L", price: 48000 }], cogsBySize: { M: 19200, L: 23400 }, toppings: [{ ingredientId: "ing-jelly", price: 7000, default: true, optional: true, quantity: 50, unit: "g" }], lockedStoreIds: ["CN02"], status: "branch-locked", note: "Kết hợp cốt lục trà nhài + thạch ăn liền F0 -> Món trực tiếp.", createdAt: "2026-11-16" },
];

export const INITIAL_RECIPES: RecipeVersion[] = [
    { id: "rec-hd001-m-v11", code: "RC-HD001-M", kind: "drink", productId: "hd-001", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.1", effectiveDate: "2026-10-01", approver: "Quản lý sản phẩm", changeReason: "Phiên bản hiện hành", status: "approved", priority: 1, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-tea-base", 100, "ml", "required", "Nền trà", ""], ["ing-milk", 30, "g", "required", "", ""], ["ing-syrup", 25, "ml", "required", "", "Điều chỉnh theo mức đường đã duyệt"], ["ing-pearl", 30, "g", "optional-topping", "Topping tùy chọn", "Bỏ topping thì không giữ/trừ; thêm gấp đôi cộng đúng 30 g"]]) },
    { id: "rec-hd001-l-v11", code: "RC-HD001-L", kind: "drink", productId: "hd-001", outputIngredientId: null, size: "L", yieldQuantity: 1, yieldUnit: "ly", version: "1.1", effectiveDate: "2026-10-01", approver: "Quản lý sản phẩm", changeReason: "Phiên bản hiện hành", status: "approved", priority: 1, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-tea-base", 140, "ml", "required", "Nền trà", ""], ["ing-milk", 40, "g", "required", "", ""], ["ing-syrup", 35, "ml", "required", "", "Điều chỉnh theo mức đường đã duyệt"], ["ing-pearl", 40, "g", "optional-topping", "Topping tùy chọn", "Bỏ topping thì không giữ/trừ"]]) },
    { id: "rec-hd002-m-v10", code: "RC-HD002-M", kind: "drink", productId: "hd-002", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-09-15", approver: "Quản lý sản phẩm", changeReason: "Phiên bản đầu", status: "approved", priority: 1, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-tea-base", 100, "ml", "required", "Nền trà", ""], ["ing-peach", 35, "ml", "required", "Syrup trái cây", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""]]) },
    { id: "rec-hd003-m-v10", code: "RC-HD003-M", kind: "drink", productId: "hd-003", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-09-22", approver: "Quản lý sản phẩm", changeReason: "Phiên bản chuẩn Macchiato", status: "approved", priority: 2, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-green-tea", 8, "g", "required", "Ủ trà xanh trực tiếp", ""], ["ing-cheese-cream", 45, "g", "required", "Lớp kem mặn F1", ""], ["ing-syrup", 20, "ml", "required", "Đường mía", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""]]) },
    { id: "rec-hd005-m-v10", code: "RC-HD005-M", kind: "drink", productId: "hd-005", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-11-12", approver: "Quản lý sản phẩm", changeReason: "Công thức mới Lục trà nhài kem cheese", status: "approved", priority: 2, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-green-tea-base", 150, "ml", "required", "Cốt lục trà nhài F1", "Ủ lạnh 4°C"], ["ing-cheese-cream", 50, "g", "required", "Kem Macchiato F1", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""]]) },
    { id: "rec-hd006-m-v10", code: "RC-HD006-M", kind: "drink", productId: "hd-006", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-11-15", approver: "Quản lý sản phẩm", changeReason: "Kết hợp cốt lục trà nhài và thạch F0 trực tiếp", status: "approved", priority: 2, hierarchyPath: "F0 -> Món", ingredients: recipeLines([["ing-green-tea-base", 140, "ml", "required", "Cốt lục trà nhài F1", ""], ["ing-jelly", 50, "g", "default-topping", "Thạch đào F0 ăn liền", "Xuất thẳng từ Kho Tổng"], ["ing-peach", 25, "ml", "required", "Syrup đào F0", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""]]) },
    { id: "rec-hd004-m-v10", code: "RC-HD004-M", kind: "drink", productId: "hd-004", outputIngredientId: null, size: "M", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-11-05", approver: "", changeReason: "Đề xuất công thức món mới Trà dâu nhiệt đới (Size M)", status: "pending", priority: 3, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-tea-base", 110, "ml", "required", "Nền trà", ""], ["ing-peach", 30, "ml", "required", "Syrup trái cây nền", ""], ["ing-syrup", 20, "ml", "required", "Đường mía", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""], ["ing-seal", 1, "miếng", "required", "Màng ép", ""]]) },
    { id: "rec-hd004-l-v10", code: "RC-HD004-L", kind: "drink", productId: "hd-004", outputIngredientId: null, size: "L", yieldQuantity: 1, yieldUnit: "ly", version: "1.0", effectiveDate: "2026-11-05", approver: "", changeReason: "Đề xuất công thức món mới Trà dâu nhiệt đới (Size L)", status: "pending", priority: 3, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-tea-base", 150, "ml", "required", "Nền trà", ""], ["ing-peach", 45, "ml", "required", "Syrup trái cây nền", ""], ["ing-syrup", 30, "ml", "required", "Đường mía", ""], ["ing-cup", 1, "cái", "required", "Bao bì", ""], ["ing-seal", 1, "miếng", "required", "Màng ép", ""]]) },
    { id: "rec-prep-tea-v1", code: "RC-BTP-TEA", kind: "prep", productId: null, outputIngredientId: "ing-tea-base", size: "Mẻ", yieldQuantity: 10000, yieldUnit: "ml", version: "1.0", effectiveDate: "2026-09-01", approver: "Quản lý khu chế biến", changeReason: "Mẻ tiêu chuẩn F1", status: "approved", priority: 1, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-tea-leaf", 800, "g", "required", "Trà khô theo lô", "FEFO"]]) },
    { id: "rec-prep-green-tea-v1", code: "RC-BTP-GREENTEA", kind: "prep", productId: null, outputIngredientId: "ing-green-tea-base", size: "Mẻ", yieldQuantity: 10000, yieldUnit: "ml", version: "1.0", effectiveDate: "2026-11-01", approver: "Quản lý khu chế biến", changeReason: "Mẻ ủ lạnh cốt lục trà nhài F1", status: "approved", priority: 2, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-green-tea", 600, "g", "required", "Trà xanh nhài F0", "FEFO"], ["ing-syrup", 400, "ml", "required", "Nước đường mía", ""]]) },
    { id: "rec-prep-pearl-v1", code: "RC-BTP-PEARL", kind: "prep", productId: null, outputIngredientId: "ing-pearl", size: "Mẻ", yieldQuantity: 5000, yieldUnit: "g", version: "1.0", effectiveDate: "2026-09-01", approver: "Quản lý khu chế biến", changeReason: "Mẻ tiêu chuẩn", status: "approved", priority: 1, hierarchyPath: "F0 -> F1 -> Món", ingredients: recipeLines([["ing-pearl-raw", 2000, "g", "required", "Trân châu khô theo lô", "FEFO"]]) },
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
    supplierName?: string;
    poCode?: string;
}

export const INITIAL_LOTS: IngredientLot[] = [
    { id: "lot-central-tea-1", ingredientId: "ing-tea-leaf", lotCode: "TRA-261001", manufactureDate: relativeDateISO(-20), expiryDate: relativeDateISO(320), quantity: 28400, unitCost: 450, quality: "pass", location: "central", locationId: "central", batchId: null, reservedQuantity: 960, supplierName: "Công ty TNHH Trà Lộc Phát", poCode: "PO-2026-042" },
    { id: "lot-central-milk-1", ingredientId: "ing-milk", lotCode: "SUA-260915", manufactureDate: relativeDateISO(-30), expiryDate: relativeDateISO(210), quantity: 25000, unitCost: 120, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "CP Gia Thịnh Phát (GTP)", poCode: "PO-2026-043" },
    { id: "lot-central-syrup-1", ingredientId: "ing-syrup", lotCode: "DUONG-261020", manufactureDate: relativeDateISO(-5), expiryDate: relativeDateISO(2), quantity: 9000, unitCost: 80, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "Đường Biên Hòa F&B", poCode: "PO-2026-041" },
    { id: "lot-central-pearl-1", ingredientId: "ing-pearl-raw", lotCode: "TC-261020", manufactureDate: relativeDateISO(-25), expiryDate: relativeDateISO(190), quantity: 10000, unitCost: 110, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "CP Gia Thịnh Phát (GTP)", poCode: "PO-2026-039" },
    { id: "lot-central-peach-1", ingredientId: "ing-peach", lotCode: "DAO-261001", manufactureDate: relativeDateISO(-18), expiryDate: relativeDateISO(310), quantity: 6000, unitCost: 95, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "Hương liệu Việt", poCode: "PO-2026-045" },
    { id: "lot-central-green-tea-1", ingredientId: "ing-green-tea", lotCode: "TRXN-261101", manufactureDate: relativeDateISO(-15), expiryDate: relativeDateISO(280), quantity: 14000, unitCost: 480, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "Công ty TNHH Trà Lộc Phát", poCode: "PO-2026-046" },
    { id: "lot-central-jelly-1", ingredientId: "ing-jelly", lotCode: "THACH-261103", manufactureDate: relativeDateISO(-10), expiryDate: relativeDateISO(80), quantity: 12000, unitCost: 130, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "HTX Nông Sản Đà Lạt GAP", poCode: "PO-2026-047" },
    { id: "lot-central-cup-1", ingredientId: "ing-cup", lotCode: "LY-261001", manufactureDate: null, expiryDate: null, quantity: 20000, unitCost: 250, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "Bao Bì Xanh Sài Gòn", poCode: "PO-2026-044" },
    { id: "lot-central-seal-1", ingredientId: "ing-seal", lotCode: "MANG-261001", manufactureDate: null, expiryDate: null, quantity: 20000, unitCost: 80, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "Bao Bì Xanh Sài Gòn", poCode: "PO-2026-044" },
    { id: "lot-central-expiring-1", ingredientId: "ing-peach", lotCode: "DAO-260801", manufactureDate: relativeDateISO(-95), expiryDate: relativeDateISO(-2), quantity: 500, unitCost: 90, quality: "pass", location: "central", locationId: "central", batchId: null, supplierName: "Hương liệu Việt", poCode: "PO-2026-021" },
    { id: "lot-kitchen-tea-1", ingredientId: "ing-tea-base", lotCode: "ME-261105-01", manufactureDate: relativeDateISO(-1), expiryDate: relativeDateISO(12), quantity: 6400, unitCost: 65, quality: "pass", location: "kitchen", locationId: "kitchen", batchId: "batch-seed-1" },
    { id: "lot-kitchen-pearl-1", ingredientId: "ing-pearl", lotCode: "ME-261105-02", manufactureDate: relativeDateISO(0), expiryDate: relativeDateISO(2), quantity: 2100, unitCost: 160, quality: "pass", location: "kitchen", locationId: "kitchen", batchId: "batch-seed-2" },
    { id: "lot-counter-cn01-tea", ingredientId: "ing-tea-base", lotCode: "ME-261105-01", manufactureDate: relativeDateISO(-1), expiryDate: relativeDateISO(12), quantity: 9100, unitCost: 65, quality: "pass", location: "counter", locationId: "CN01", batchId: "batch-seed-1", reservedQuantity: 500, lockedQuantity: 0 },
    { id: "lot-counter-cn01-milk", ingredientId: "ing-milk", lotCode: "SUA-260915", manufactureDate: relativeDateISO(-30), expiryDate: relativeDateISO(210), quantity: 2100, unitCost: 120, quality: "pass", location: "counter", locationId: "CN01", batchId: null, reservedQuantity: 200, lockedQuantity: 0 },
    { id: "lot-counter-cn01-cup", ingredientId: "ing-cup", lotCode: "LY-261001", manufactureDate: null, expiryDate: null, quantity: 500, unitCost: 250, quality: "pass", location: "counter", locationId: "CN01", batchId: null },
    { id: "lot-counter-cn01-syrup", ingredientId: "ing-syrup", lotCode: "DUONG-261020", manufactureDate: relativeDateISO(-5), expiryDate: relativeDateISO(2), quantity: 1800, unitCost: 80, quality: "pass", location: "counter", locationId: "CN01", batchId: null },
    { id: "lot-counter-cn01-green", ingredientId: "ing-green-tea-base", lotCode: "GR-261116-01", manufactureDate: relativeDateISO(-1), expiryDate: relativeDateISO(10), quantity: 4200, unitCost: 70, quality: "pass", location: "counter", locationId: "CN01", batchId: null },
    { id: "lot-counter-cn05-pearl", ingredientId: "ing-pearl", lotCode: "ME-261105-02", manufactureDate: relativeDateISO(0), expiryDate: relativeDateISO(2), quantity: 1200, unitCost: 160, quality: "pass", location: "counter", locationId: "CN05", batchId: "batch-seed-2" },
    { id: "lot-counter-cn05-tea", ingredientId: "ing-tea-base", lotCode: "ME-261105-01", manufactureDate: relativeDateISO(-1), expiryDate: relativeDateISO(12), quantity: 3800, unitCost: 65, quality: "pass", location: "counter", locationId: "CN05", batchId: "batch-seed-1" },
    { id: "lot-counter-cn05-milk", ingredientId: "ing-milk", lotCode: "SUA-260915", manufactureDate: relativeDateISO(-30), expiryDate: relativeDateISO(210), quantity: 1900, unitCost: 120, quality: "pass", location: "counter", locationId: "CN05", batchId: null },
    { id: "lot-counter-cn05-syrup", ingredientId: "ing-syrup", lotCode: "DUONG-261020", manufactureDate: relativeDateISO(-5), expiryDate: relativeDateISO(2), quantity: 1500, unitCost: 80, quality: "pass", location: "counter", locationId: "CN05", batchId: null },
    { id: "lot-counter-cn05-cup", ingredientId: "ing-cup", lotCode: "LY-261001", manufactureDate: null, expiryDate: null, quantity: 250, unitCost: 250, quality: "pass", location: "counter", locationId: "CN05", batchId: null },
    { id: "lot-counter-cn05-jelly", ingredientId: "ing-jelly", lotCode: "THACH-261103", manufactureDate: relativeDateISO(-10), expiryDate: relativeDateISO(80), quantity: 1400, unitCost: 130, quality: "pass", location: "counter", locationId: "CN05", batchId: null },
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
export interface BatchDistributionRecord {
    id: string;
    storeId: string;
    allocatedQuantity: number;
    receivedQuantity: number;
    remainingCounterQuantity: number;
    unit: string;
    transferCode: string;
    distributedAt: string;
    status: "Đã xuất kho" | "Đang vận chuyển" | "Đã nhập quầy";
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
    distributions?: BatchDistributionRecord[];
}
export const INITIAL_BATCHES: ProductionBatch[] = [
    {
        id: "batch-seed-1", code: "ME-261105-01", recipeId: "rec-prep-tea-v1", shift: "Ca sáng", plannedQuantity: 20000,
        inputs: [{ id: "bi-seed-1", ingredientId: "ing-tea-leaf", lotId: "lot-central-tea-1", plannedQuantity: 1600, actualQuantity: 1600, unit: "g" }],
        actualQuantity: 20000, wasteQuantity: 0, unit: "ml", startedAt: `${relativeDateISO(-1)}T05:30`, expiryDate: relativeDateISO(12),
        quality: "pass", operator: "Nhân viên chế biến", approver: "Quản lý khu chế biến", status: "completed",
        distributions: [
            { id: "bd-1", storeId: "CN01", allocatedQuantity: 7600, receivedQuantity: 7600, remainingCounterQuantity: 4200, unit: "ml", transferCode: "PXK-2611-01", distributedAt: `${relativeDateISO(-1)} 06:30`, status: "Đã nhập quầy" },
            { id: "bd-2", storeId: "CN05", allocatedQuantity: 4000, receivedQuantity: 4000, remainingCounterQuantity: 2400, unit: "ml", transferCode: "PXK-2611-02", distributedAt: `${relativeDateISO(-1)} 06:45`, status: "Đã nhập quầy" },
            { id: "bd-3", storeId: "CN08", allocatedQuantity: 2000, receivedQuantity: 2000, remainingCounterQuantity: 1100, unit: "ml", transferCode: "PXK-2611-03", distributedAt: `${relativeDateISO(0)} 07:00`, status: "Đã nhập quầy" },
        ],
    },
    {
        id: "batch-seed-2", code: "ME-261105-02", recipeId: "rec-prep-pearl-v1", shift: "Ca sáng", plannedQuantity: 6000,
        inputs: [{ id: "bi-seed-2", ingredientId: "ing-pearl-raw", lotId: "lot-central-pearl-1", plannedQuantity: 2400, actualQuantity: 2400, unit: "g" }],
        actualQuantity: 6000, wasteQuantity: 0, unit: "g", startedAt: `${relativeDateISO(0)}T06:00`, expiryDate: relativeDateISO(2),
        quality: "pass", operator: "Nhân viên chế biến", approver: "Quản lý khu chế biến", status: "completed",
        distributions: [
            { id: "bd-4", storeId: "CN01", allocatedQuantity: 2100, receivedQuantity: 2100, remainingCounterQuantity: 950, unit: "g", transferCode: "PXK-2611-04", distributedAt: `${relativeDateISO(0)} 06:30`, status: "Đã nhập quầy" },
            { id: "bd-5", storeId: "CN05", allocatedQuantity: 1800, receivedQuantity: 1800, remainingCounterQuantity: 1200, unit: "g", transferCode: "PXK-2611-05", distributedAt: `${relativeDateISO(0)} 06:50`, status: "Đã nhập quầy" },
        ],
    },
    {
        id: "batch-seed-3", code: "ME-261105-03", recipeId: "rec-prep-tea-v1", shift: "Ca chiều", plannedQuantity: 12000,
        inputs: [{ id: "bi-seed-3", ingredientId: "ing-tea-leaf", lotId: "lot-central-tea-1", plannedQuantity: 960, actualQuantity: null, unit: "g" }],
        actualQuantity: null, wasteQuantity: null, unit: "ml", startedAt: `${relativeDateISO(0)}T12:30`, expiryDate: relativeDateISO(12),
        quality: "unchecked", operator: "Nhân viên chế biến", approver: "", status: "processing",
        distributions: [],
    },
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

export interface MasterFixedPlan {
    id: string;
    storeId: string;
    ingredientId: string;
    fixedCupsPerDay: number;
    fixedQuantity: number;
    unit: string;
    ratioPerCupLabel: string;
    f1ToF0RatioLabel?: string;
    updatedBy: string;
    updatedAt: string;
}

export interface TemporaryPlanOverride {
    id: string;
    storeId: string;
    ingredientId: string;
    extraCups: number;
    extraQuantity: number;
    unit: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    reason: string;
    createdBy: string;
    createdAt: string;
    status: "active" | "expired" | "promoted";
    promotedAt?: string;
    promotedBy?: string;
}

export interface DistributionHistoryItem {
    id: string;
    date: string;
    storeId: string;
    ingredientId: string;
    fixedQuantity: number;
    tempExtraQuantity: number;
    totalDispatched: number;
    unit: string;
    actionType: "periodic" | "temp_shortage" | "promote_to_fixed";
    ticketCode: string;
    actor: string;
    note: string;
}

export interface BranchStaffMember {
    id: string;
    code: string;
    name: string;
    role: "Thu ngân" | "Pha chế" | "Ca trưởng" | "Quản lý chi nhánh" | "Nhân viên kho";
    storeId: string;
    phone: string;
    active: boolean;
}

export const INITIAL_BRANCH_STAFF: BranchStaffMember[] = [
    { id: "st-01", code: "NV-CN01-01", name: "Lê Quốc Tuấn Anh", role: "Thu ngân", storeId: "CN01", phone: "0938 111 222", active: true },
    { id: "st-02", code: "NV-CN01-02", name: "Nguyễn Văn An", role: "Ca trưởng", storeId: "CN01", phone: "0903 111 223", active: true },
    { id: "st-03", code: "NV-CN01-03", name: "Trần Thanh Bình", role: "Pha chế", storeId: "CN01", phone: "0908 111 224", active: true },
    { id: "st-04", code: "NV-CN01-04", name: "Võ Minh Hoàng", role: "Quản lý chi nhánh", storeId: "CN01", phone: "0909 111 225", active: true },
    { id: "st-05", code: "NV-CN02-01", name: "Lê Minh Châu", role: "Thu ngân", storeId: "CN02", phone: "0912 222 101", active: true },
    { id: "st-06", code: "NV-CN02-02", name: "Hoàng Nhật Nam", role: "Pha chế", storeId: "CN02", phone: "0912 222 102", active: true },
    { id: "st-07", code: "NV-CN02-03", name: "Trần Quốc Bảo", role: "Quản lý chi nhánh", storeId: "CN02", phone: "0912 222 103", active: true },
    { id: "st-08", code: "NV-CN03-01", name: "Đặng Anh Khoa", role: "Thu ngân", storeId: "CN03", phone: "0918 333 101", active: true },
    { id: "st-09", code: "NV-CN03-02", name: "Lê Thị Mai", role: "Quản lý chi nhánh", storeId: "CN03", phone: "0918 333 102", active: true },
    { id: "st-10", code: "NV-CN05-01", name: "Trần Thu Hà", role: "Quản lý chi nhánh", storeId: "CN05", phone: "0912 888 999", active: true },
    { id: "st-11", code: "NV-CN05-02", name: "Phạm Gia Bảo", role: "Thu ngân", storeId: "CN05", phone: "0938 555 666", active: true },
    { id: "st-12", code: "NV-CN05-03", name: "Ngô Thị Mai", role: "Nhân viên kho", storeId: "CN05", phone: "0977 777 888", active: true },
    { id: "st-13", code: "NV-CN05-04", name: "Đỗ Quang Huy", role: "Ca trưởng", storeId: "CN05", phone: "0905 555 777", active: true },
    { id: "st-14", code: "NV-CN06-01", name: "Nguyễn Thảo Vy", role: "Thu ngân", storeId: "CN06", phone: "0902 666 101", active: true },
    { id: "st-15", code: "NV-CN06-02", name: "Phan Tấn Phát", role: "Quản lý chi nhánh", storeId: "CN06", phone: "0902 666 102", active: true },
    { id: "st-16", code: "NV-CN08-01", name: "Bùi Đức Mạnh", role: "Thu ngân", storeId: "CN08", phone: "0904 888 101", active: true },
    { id: "st-17", code: "NV-CN08-02", name: "Lưu Ngọc Hân", role: "Quản lý chi nhánh", storeId: "CN08", phone: "0904 888 102", active: true },
];

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
    handoverMismatchReason?: string;
    approvedAt?: string;
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
    ignoredThresholds: IgnoredThresholdRule[];
    masterFixedPlans: MasterFixedPlan[];
    temporaryOverrides: TemporaryPlanOverride[];
    distributionHistory: DistributionHistoryItem[];
    branchStaff: BranchStaffMember[];
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
        { id: "po-042", code: "PO-2026-042", supplier: "Công ty Nguyên liệu An Tâm", orderDate: relativeDateISO(-20), expectedDelivery: relativeDateISO(-18), warehouseId: "central", paymentTerm: "Thanh toán trước", discount: 0, shipping: 0, tax: 0, paid: 13500000, status: "received", lines: [{ id: "po-042-l1", ingredientId: "ing-tea-leaf", orderedQuantity: 30000, receivedQuantity: 30000, unit: "g", unitPrice: 450 }] },
        { id: "po-043", code: "PO-2026-043", supplier: "Thực phẩm Minh Phát", orderDate: relativeDateISO(-10), expectedDelivery: relativeDateISO(2), warehouseId: "central", paymentTerm: "Công nợ 15 ngày", discount: 0, shipping: 150000, tax: 0, paid: 0, status: "placed", lines: [{ id: "po-043-l1", ingredientId: "ing-milk", orderedQuantity: 50000, receivedQuantity: 0, unit: "g", unitPrice: 120 }] },
        { id: "po-044", code: "PO-2026-044", supplier: "Bao bì Sài Gòn", orderDate: relativeDateISO(-8), expectedDelivery: relativeDateISO(3), warehouseId: "central", paymentTerm: "Công nợ 30 ngày", discount: 0, shipping: 0, tax: 0, paid: 0, status: "placed", lines: [{ id: "po-044-l1", ingredientId: "ing-cup", orderedQuantity: 5000, receivedQuantity: 0, unit: "cái", unitPrice: 250 }, { id: "po-044-l2", ingredientId: "ing-seal", orderedQuantity: 5000, receivedQuantity: 0, unit: "miếng", unitPrice: 80 }] },
        { id: "po-045", code: "PO-2026-045", supplier: "Hương liệu Việt", orderDate: relativeDateISO(-5), expectedDelivery: relativeDateISO(4), warehouseId: "central", paymentTerm: "Công nợ 15 ngày", discount: 0, shipping: 0, tax: 0, paid: 0, status: "draft", lines: [{ id: "po-045-l1", ingredientId: "ing-peach", orderedQuantity: 12000, receivedQuantity: 0, unit: "ml", unitPrice: 95 }] },
    ],
    receipts: [
        { id: "receipt-seed-01", code: "PN-261104-01", purchaseOrderId: "po-042", document: "HD-AT-042", receivedAt: relativeDateISO(-12), receiver: "Nhân viên kho tổng", note: "Đạt kiểm nhận.", lines: [{ id: "po-042-l1", ingredientId: "ing-tea-leaf", orderedQuantity: 30000, receivedQuantity: 30000, unit: "g", lotCode: "TRA-261001", manufactureDate: relativeDateISO(-20), expiryDate: relativeDateISO(320), unitPrice: 450, quality: "pass", note: "" }] },
    ],
    plans: [
        { id: "plan-01", code: "KH-2611-01", storeId: "CN01", date: relativeDateISO(0), shift: "Ca sáng", expectedCups: 220, lines: [{ id: "plan-01-l1", ingredientId: "ing-tea-base", quantity: 39600, approvedQuantity: 39600, unit: "ml" }, { id: "plan-01-l2", ingredientId: "ing-pearl", quantity: 1800, approvedQuantity: 1800, unit: "g" }], batchIds: ["batch-seed-1", "batch-seed-2"], status: "approved", note: "Định mức cố định chuẩn CN01." },
        { id: "plan-02", code: "KH-2611-02", storeId: "CN05", date: relativeDateISO(0), shift: "Ca chiều", expectedCups: 180, lines: [{ id: "plan-02-l1", ingredientId: "ing-tea-base", quantity: 32400, approvedQuantity: null, unit: "ml" }, { id: "plan-02-l2", ingredientId: "ing-pearl", quantity: 1500, approvedQuantity: null, unit: "g" }], batchIds: ["batch-seed-1", "batch-seed-2"], status: "pending", note: "Chờ quản lý duyệt." },
    ],
    allocations: [
        { id: "alloc-01", code: "CP-2611-01", planId: "plan-01", sourceId: "kitchen", storeId: "CN01", date: relativeDateISO(0), shift: "Ca sáng", lines: [{ id: "alloc-01-l1", lotId: "lot-kitchen-tea-1", ingredientId: "ing-tea-base", batchId: "batch-seed-1", proposedQuantity: 3000, sentQuantity: 3000, receivedQuantity: 3000, unit: "ml" }], sender: "Nhân viên khu chế biến", receiver: "Quầy CN01", sentAt: `${relativeDateISO(0)}T05:45`, receivedAt: `${relativeDateISO(0)}T06:05`, status: "received", discrepancyReason: "" },
        { id: "alloc-02", code: "CP-2611-02", planId: "plan-02", sourceId: "kitchen", storeId: "CN05", date: relativeDateISO(0), shift: "Ca chiều", lines: [{ id: "alloc-02-l1", lotId: "lot-kitchen-pearl-1", ingredientId: "ing-pearl", batchId: "batch-seed-2", proposedQuantity: 1200, sentQuantity: 0, receivedQuantity: null, unit: "g" }], sender: "Nhân viên khu chế biến", receiver: "Quầy CN05", sentAt: null, receivedAt: null, status: "pending-dispatch", discrepancyReason: "" },
    ],
    countSnapshots: [
        { id: "snap-cn01-tea", position: "counter", locationId: "CN01", ingredientId: "ing-tea-base", lotId: "lot-counter-cn01-tea", opening: 15000, received: 3000, actualUse: 8500, waste: 200, unitCost: 65, date: relativeDateISO(0), shift: "Ca sáng" },
        { id: "snap-cn01-milk", position: "counter", locationId: "CN01", ingredientId: "ing-milk", lotId: "lot-counter-cn01-milk", opening: 5000, received: 0, actualUse: 2800, waste: 100, unitCost: 120, date: relativeDateISO(0), shift: "Ca sáng" },
        { id: "snap-central-cups", position: "central", locationId: "central", ingredientId: "ing-cup", lotId: "lot-central-cup-1", opening: 22000, received: 0, actualUse: 2000, waste: 0, unitCost: 250, date: relativeDateISO(0), shift: null },
    ],
    counts: [
        { id: "count-seed-01", code: "KK-261104-01", date: relativeDateISO(-1), position: "counter", locationId: "CN01", shift: "Ca tối", ingredientId: "ing-tea-base", lotId: "lot-counter-cn01-tea", opening: 15000, received: 3000, actualUse: 8500, waste: 200, theoretical: 9300, counted: 9100, variance: 200, varianceValue: 13000, reason: "Sai lệch kiểm đếm", note: "Cần kiểm tra chứng từ cuối ca.", counter: "Lê Quốc Tuấn Anh", approver: "Võ Minh Hoàng", status: "pending" },
        { id: "count-seed-02", code: "KK-261105-05", date: relativeDateISO(0), position: "counter", locationId: "CN05", shift: "Ca chiều", ingredientId: "ing-pearl", lotId: "lot-counter-cn05-pearl", opening: 2000, received: 1200, actualUse: 1850, waste: 50, theoretical: 1300, counted: 1200, variance: 100, varianceValue: 16000, reason: "Hao hụt bán thành phẩm cuối ca", note: "Chờ quản lý chi nhánh CN05 phê duyệt điều chỉnh tồn kho.", counter: "Phạm Gia Bảo", approver: "Trần Thu Hà", status: "pending" },
    ],
    reconciliations: [
        {
            id: "rec-seed-01", date: relativeDateISO(-1), storeId: "CN01", shift: "Ca tối", opener: "Lê Quốc Tuấn Anh", counter: "Nguyễn Văn An", approver: "Võ Minh Hoàng", status: "pending", note: "Có chênh lệch nhẹ bột sữa, đã bàn giao giữa ca.",
            handoverMismatchReason: "Nhân viên mở ca hỗ trợ quầy take-away nên ca trưởng đồng kiểm cuối ca",
            lines: [
                { id: "rec-seed-01-l1", ingredientId: "ing-tea-base", lotId: "lot-counter-cn01-tea", opening: 15000, received: 3000, actualUse: 8500, waste: 200, counted: 9100, unitCost: 65, reason: "Sai lệch kiểm đếm" },
                { id: "rec-seed-01-l2", ingredientId: "ing-milk", lotId: "lot-counter-cn01-milk", opening: 5000, received: 0, actualUse: 2800, waste: 100, counted: 2100, unitCost: 120, reason: "Pha chế lỗi" },
            ],
        },
        {
            id: "rec-seed-02", date: relativeDateISO(0), storeId: "CN05", shift: "Ca sáng", opener: "Phạm Gia Bảo", counter: "Phạm Gia Bảo", approver: "Trần Thu Hà", status: "pending", note: "Kiểm kê cuối ca sáng CN05 — chờ QL chi nhánh duyệt.",
            lines: [
                { id: "rec-seed-02-l1", ingredientId: "ing-pearl", lotId: "lot-counter-cn05-pearl", opening: 2000, received: 1200, actualUse: 1850, waste: 50, counted: 1200, unitCost: 160, reason: "Hao hụt bán thành phẩm cuối ca" },
                { id: "rec-seed-02-l2", ingredientId: "ing-tea-base", lotId: "lot-counter-cn05-tea", opening: 6000, received: 1500, actualUse: 3500, waste: 200, counted: 3800, unitCost: 65, reason: "" },
            ],
        },
        {
            id: "rec-seed-03", date: relativeDateISO(-2), storeId: "CN05", shift: "Ca tối", opener: "Phạm Gia Bảo", counter: "Đỗ Quang Huy", approver: "Trần Thu Hà", status: "approved", approvedAt: relativeDateISO(-1), note: "Đã đối soát khớp sổ và khóa.",
            handoverMismatchReason: "Giao ca cuối tuần theo lịch phân công",
            lines: [
                { id: "rec-seed-03-l1", ingredientId: "ing-milk", lotId: "lot-counter-cn05-milk", opening: 4500, received: 0, actualUse: 2500, waste: 100, counted: 1900, unitCost: 120, reason: "" },
            ],
        },
    ],
    ignoredThresholds: [],
    masterFixedPlans: [
        { id: "mfp-cn01-tea", storeId: "CN01", ingredientId: "ing-tea-base", fixedCupsPerDay: 220, fixedQuantity: 39600, unit: "ml", ratioPerCupLabel: "180 ml Cốt F1 / 1 ly", f1ToF0RatioLabel: "800 g Trà đen F0 + 500 ml Đường F0 -> 10.000 ml Cốt F1", updatedBy: "Nguyễn Hoàng Long", updatedAt: relativeDateISO(-7) },
        { id: "mfp-cn05-tea", storeId: "CN05", ingredientId: "ing-tea-base", fixedCupsPerDay: 180, fixedQuantity: 32400, unit: "ml", ratioPerCupLabel: "180 ml Cốt F1 / 1 ly", f1ToF0RatioLabel: "800 g Trà đen F0 + 500 ml Đường F0 -> 10.000 ml Cốt F1", updatedBy: "Nguyễn Hoàng Long", updatedAt: relativeDateISO(-7) },
        { id: "mfp-cn08-tea", storeId: "CN08", ingredientId: "ing-tea-base", fixedCupsPerDay: 150, fixedQuantity: 27000, unit: "ml", ratioPerCupLabel: "180 ml Cốt F1 / 1 ly", f1ToF0RatioLabel: "800 g Trà đen F0 + 500 ml Đường F0 -> 10.000 ml Cốt F1", updatedBy: "Nguyễn Hoàng Long", updatedAt: relativeDateISO(-7) },
        { id: "mfp-cn01-jelly", storeId: "CN01", ingredientId: "ing-jelly", fixedCupsPerDay: 140, fixedQuantity: 7000, unit: "g", ratioPerCupLabel: "50 g Thạch đào F0 / 1 ly (xuất thẳng)", updatedBy: "Nguyễn Hoàng Long", updatedAt: relativeDateISO(-7) },
        { id: "mfp-cn05-jelly", storeId: "CN05", ingredientId: "ing-jelly", fixedCupsPerDay: 110, fixedQuantity: 5500, unit: "g", ratioPerCupLabel: "50 g Thạch đào F0 / 1 ly (xuất thẳng)", updatedBy: "Nguyễn Hoàng Long", updatedAt: relativeDateISO(-7) },
    ],
    temporaryOverrides: [
        {
            id: "tmp-ov-01",
            storeId: "CN01",
            ingredientId: "ing-tea-base",
            extraCups: 40,
            extraQuantity: 7200,
            unit: "ml",
            startDate: relativeDateISO(0),
            endDate: relativeDateISO(2),
            durationDays: 3,
            reason: "Hôm qua CN01 báo thiếu cốt giờ cao điểm; tăng tạm thời 3 ngày cuối tuần",
            createdBy: "Võ Minh Hoàng",
            createdAt: relativeDateISO(0),
            status: "active",
        },
        {
            id: "tmp-ov-02",
            storeId: "CN05",
            ingredientId: "ing-jelly",
            extraCups: 30,
            extraQuantity: 1500,
            unit: "g",
            startDate: relativeDateISO(-4),
            endDate: relativeDateISO(-1),
            durationDays: 4,
            reason: "Chương trình cuối tuần trước tại Hàng Xanh",
            createdBy: "Trần Thu Hà",
            createdAt: relativeDateISO(-4),
            status: "expired",
        },
    ],
    distributionHistory: [
        { id: "dh-01", date: relativeDateISO(-2), storeId: "CN01", ingredientId: "ing-tea-base", fixedQuantity: 39600, tempExtraQuantity: 0, totalDispatched: 39600, unit: "ml", actionType: "periodic", ticketCode: "PXK-2611-11", actor: "Vũ Minh Khoa", note: "Cấp phát định kỳ theo kế hoạch cố định" },
        { id: "dh-02", date: relativeDateISO(-1), storeId: "CN05", ingredientId: "ing-jelly", fixedQuantity: 5500, tempExtraQuantity: 1500, totalDispatched: 7000, unit: "g", actionType: "temp_shortage", ticketCode: "PXK-2611-14", actor: "Trần Thu Hà", note: "Báo thiếu thạch do khuyến mãi cuối tuần (+1.500g tạm thời)" },
        { id: "dh-03", date: relativeDateISO(0), storeId: "CN01", ingredientId: "ing-tea-base", fixedQuantity: 39600, tempExtraQuantity: 7200, totalDispatched: 46800, unit: "ml", actionType: "temp_shortage", ticketCode: "PXK-2611-18", actor: "Nguyễn Hoàng Long", note: "Tăng tạm thời 3 ngày cho CN01 — không đổi kế hoạch cố định gốc" },
    ],
    branchStaff: INITIAL_BRANCH_STAFF,
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

export function getBranchMinimum(ingredient: Ingredient, warehouseLabel: string): number {
    if (ingredient.branchMinimums && typeof ingredient.branchMinimums[warehouseLabel] === "number") {
        return ingredient.branchMinimums[warehouseLabel];
    }
    return ingredient.minimum;
}

export function isIngredientIgnoredAt(
    state: DemoState,
    ingredientId: string,
    warehouseLabel: string,
): boolean {
    const rules = state.ignoredThresholds ?? [];
    return rules.some(
        (rule) =>
            rule.ingredientId === ingredientId &&
            (rule.scope === "ALL" || rule.scope === warehouseLabel),
    );
}
