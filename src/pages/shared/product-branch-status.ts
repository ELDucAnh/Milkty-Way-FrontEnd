import type { Product, ProductStatus } from "./business-demo";

/**
 * storeId là ID trong data.stores, không phải tên cửa hàng.
 *
 * null: hiển thị trạng thái toàn chuỗi.
 * Có storeId: hiển thị trạng thái bán tại cửa hàng đó.
 */
export function productStatusAtStore(
  product: Product,
  storeId: string | null,
): ProductStatus {
  // Trạng thái ngừng bán/chờ công thức có ưu tiên toàn chuỗi.
  if (
    product.status === "inactive" ||
    product.status === "pending-recipe"
  ) {
    return product.status;
  }

  if (storeId === null) return product.status;

  return product.lockedStoreIds.includes(storeId)
    ? "branch-locked"
    : "active";
}
