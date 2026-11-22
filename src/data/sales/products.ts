export interface PosProduct {
 id: number; name: string; sku: string; price: number; stock: number; category: string;
 isHotSale?: boolean; hotRank?: number; soldToday?: number; lockedBranches?: string[];
 recipeItems?: { name: string; baseAmount: number; unit: string; tier: "F0" | "F1"; scaleWithSugar?: boolean; scaleWithIce?: boolean }[];
 prepSteps?: string[];
 recipeSource?: "mock";
}
export const products: PosProduct[] = [
  {
    id: 1,
    isHotSale: true, hotRank: 1, soldToday: 168,
    name: 'Trà sữa trân châu',
    sku: 'TS01',
    price: 39000,
    stock: 45,
    category: 'milk-tea'
  },
  {
    id: 2,
    isHotSale: true, hotRank: 2, soldToday: 142,
    name: 'Trà sữa ô long',
    sku: 'TS02',
    price: 39000,
    stock: 35,
    category: 'milk-tea'
  },
  {
    id: 3,
    name: 'Trà sữa matcha',
    sku: 'TS03',
    price: 45000,
    stock: 30,
    category: 'milk-tea'
  },
  {
    id: 4,
    name: 'Trà sữa khoai môn',
    sku: 'TS04',
    price: 42000,
    stock: 28,
    category: 'milk-tea'
  },
  {
    id: 5,
    name: 'Trà sữa chocolate',
    sku: 'TS05',
    price: 42000,
    stock: 32,
    category: 'milk-tea'
  },
  {
    id: 6,
    name: 'Trà sữa đường đen',
    sku: 'TS06',
    price: 45000,
    stock: 25,
    category: 'milk-tea'
  },
  {
    id: 7,
    isHotSale: true, hotRank: 3, soldToday: 135,
    name: 'Trà đào',
    sku: 'TT01',
    price: 35000,
    stock: 40,
    category: 'fruit-tea'
  },
  {
    id: 8,
    isHotSale: true, hotRank: 4, soldToday: 112,
    name: 'Trà vải',
    sku: 'TT02',
    price: 35000,
    stock: 36,
    category: 'fruit-tea'
  },
  {
    id: 9,
    name: 'Trà chanh dây',
    sku: 'TT03',
    price: 35000,
    stock: 30,
    category: 'fruit-tea'
  },
  {
    id: 10,
    isHotSale: true, hotRank: 5, soldToday: 98,
    name: 'Trà xoài',
    sku: 'TT04',
    price: 39000,
    stock: 24,
    category: 'fruit-tea'
  },
  {
    id: 11,
    name: 'Trà dâu hibiscus',
    sku: 'MM01',
    price: 42000,
    stock: 18,
    category: 'seasonal'
  },
  {
    id: 12,
    name: 'Trà sen nhãn',
    sku: 'MM02',
    price: 45000,
    stock: 20,
    category: 'seasonal'
  }
];

// Explicit demo recipes for the existing POS catalogue; not inventory BOM mappings.
const flavour: Record<string, string> = { TS03: "Bột matcha", TS04: "Bột khoai môn", TS05: "Bột chocolate", TS06: "Sốt đường đen", TT01: "Syrup đào", TT02: "Syrup vải", TT03: "Syrup chanh dây", TT04: "Syrup xoài", MM01: "Syrup dâu", MM02: "Nhãn ngâm" };
for (const product of products) {
 product.lockedBranches = [];
 product.recipeSource = "mock";
 product.recipeItems = [
  { name: product.sku === "TS02" ? "Cốt trà ô long" : product.sku === "MM01" ? "Cốt hibiscus" : product.sku === "MM02" ? "Cốt trà sen" : "Cốt hồng trà", baseAmount: 150, unit: "ml", tier: "F1" },
  ...(product.category === "milk-tea" ? [{ name: "Bột sữa", baseAmount: 35, unit: "g", tier: "F0" as const }] : []),
  ...(flavour[product.sku] ? [{ name: flavour[product.sku], baseAmount: 25, unit: product.sku.startsWith("TS") && product.sku !== "TS06" ? "g" : "ml", tier: "F0" as const }] : []),
  { name: "Nước đường", baseAmount: 25, unit: "ml", tier: "F1", scaleWithSugar: true },
  { name: "Đá viên", baseAmount: 180, unit: "g", tier: "F0", scaleWithIce: true },
 ];
 product.prepSteps = ["Đong cốt trà theo định mức.", ...(product.category === "milk-tea" ? ["Hòa tan bột sữa và nguyên liệu tạo vị trong cốt trà."] : ["Thêm nguyên liệu trái cây hoặc syrup theo món."]), "Thêm đường và đá theo tùy chọn, lắc đều 10 giây.", "Cho topping đã chọn vào ly, rót đồ uống, dập nắp và dán tem."];
}
export function isPosProductAvailable(product: PosProduct, branchId: string): boolean {
 return !!branchId && product.stock > 0 && !product.lockedBranches?.includes(branchId);
}
