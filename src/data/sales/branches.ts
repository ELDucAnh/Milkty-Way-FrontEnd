import { DEMO_STORAGE_KEY, INITIAL_STORES } from "../../pages/shared/business-demo";

export interface SalesBranch {
  id: string;
  code: string;
  storeId: string;
  name: string;
  area: string;
  address: string;
  openingHours: string;
  status: "active" | "suspended";
}

function parseBranches(stores: unknown): SalesBranch[] {
  if (!Array.isArray(stores)) throw new Error("Danh sách cửa hàng không hợp lệ.");
  const codes = new Set<string>();
  return stores.map(store => {
    if (!store || typeof store !== "object" ||
      !["id", "code", "name", "area", "address", "openingHours"].every(
        key => typeof store[key] === "string" && store[key].trim().length > 0,
      ) || !["active", "suspended"].includes(store.status) || codes.has(store.code)) {
      throw new Error("Dữ liệu cửa hàng không hợp lệ. Vui lòng kiểm tra danh mục chi nhánh.");
    }
    codes.add(store.code);
    return {
      id: store.code, code: store.code, storeId: store.id,
      name: store.name, area: store.area, address: store.address,
      openingHours: store.openingHours, status: store.status,
    };
  });
}

export const salesBranches: readonly SalesBranch[] = parseBranches(INITIAL_STORES);

export function getSalesBranches(): SalesBranch[] {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw === null) return parseBranches(INITIAL_STORES);
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    throw new Error("Không đọc được dữ liệu cửa hàng đã lưu.");
  }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    throw new Error("Dữ liệu cửa hàng đã lưu không hợp lệ.");
  }
  // Older demo states may predate the stores field. An empty array is valid.
  if (!("stores" in saved)) return parseBranches(INITIAL_STORES);
  return parseBranches(saved.stores);
}

export function getActiveSalesBranches(): SalesBranch[] {
  return getSalesBranches().filter(branch => branch.status === "active");
}
