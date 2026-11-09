import { availableLotQuantity } from "./business-demo";
import type { DemoState, IngredientGroup, IngredientLot } from "./business-demo";
import { formatDate, getTodayISO } from "./formatters";

type Tone = "success" | "info" | "warning" | "danger";

export interface StockItemRow {
    id: string;
    sku: string;
    name: string;
    warehouse: string;
    category: string;
    categoryTone: "success" | "info" | "warning";
    unit: string;
    stockActual: number;
    stockMin: number;
    costPrice: number;
    totalValue: number;
    status: string;
    statusTone: "success" | "warning" | "danger";
}

export interface ExpiringLotRow {
    id: string;
    batchId: string;
    name: string;
    warehouse: string;
    quantity: string;
    expDate: string;
    remainingText: string;
    remainingTone: "danger" | "warning";
    actionNote: string;
    actionButtonText: string;
}

export interface StockSummary {
    stockItems: StockItemRow[];
    expiringLots: ExpiringLotRow[];
    totalValue: number;
    lowStockCount: number;
}

const GROUP_INFO: Record<IngredientGroup, { label: string; tone: StockItemRow["categoryTone"] }> = {
    tea: { label: "Trà", tone: "success" },
    dairy: { label: "Sữa & bột kem", tone: "info" },
    syrup: { label: "Đường & syrup", tone: "info" },
    topping: { label: "Topping", tone: "warning" },
    packaging: { label: "Bao bì", tone: "success" },
    prepared: { label: "Bán thành phẩm", tone: "warning" },
};

/** Nhãn vị trí lưu trữ: Kho Tổng, Khu chế biến hoặc mã chi nhánh (quầy). */
export function lotWarehouseLabel(lot: IngredientLot): string {
    return lot.location === "central" ? "Kho Tổng" : lot.location === "kitchen" ? "Khu chế biến" : lot.locationId;
}

function daysBetween(fromISO: string, toISO: string): number {
    return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86400000);
}

/**
 * Tổng hợp tồn kho và lô cận hạn từ DemoState (nguồn dữ liệu duy nhất của các trang kho),
 * để báo cáo / dashboard thay đổi theo kiểm kê, nhập kho, cấp phát và bán hàng.
 * warehouseFilter: "" = tất cả, hoặc đúng nhãn từ lotWarehouseLabel().
 */
export function buildStockSummary(state: DemoState, warehouseFilter = "", today = getTodayISO()): StockSummary {
    const lots = state.lots.filter((lot) => !warehouseFilter || lotWarehouseLabel(lot) === warehouseFilter);
    const groups = new Map<string, IngredientLot[]>();
    for (const lot of lots) {
        const key = `${lot.ingredientId}|${lotWarehouseLabel(lot)}`;
        groups.set(key, [...(groups.get(key) ?? []), lot]);
    }

    const stockItems: StockItemRow[] = [];
    for (const [key, group] of groups) {
        const ingredient = state.ingredients.find((item) => item.id === group[0].ingredientId);
        if (!ingredient) continue;
        const available = group.reduce((sum, lot) => sum + availableLotQuantity(lot, today), 0);
        const physical = group.reduce((sum, lot) => sum + lot.quantity, 0);
        const totalValue = Math.round(group.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0));
        const info = GROUP_INFO[ingredient.group];
        const status = available === 0 ? "Hết tồn" : available < ingredient.minimum ? "Sắp hết" : "Dồi dào";
        stockItems.push({
            id: key,
            sku: ingredient.code,
            name: ingredient.name,
            warehouse: lotWarehouseLabel(group[0]),
            category: info.label,
            categoryTone: info.tone,
            unit: ingredient.baseUnit,
            stockActual: Number(available.toFixed(3)),
            stockMin: ingredient.minimum,
            costPrice: physical > 0 ? Math.round(totalValue / physical) : 0,
            totalValue,
            status,
            statusTone: available === 0 ? "danger" : available < ingredient.minimum ? "warning" : "success",
        });
    }
    stockItems.sort((a, b) => a.warehouse.localeCompare(b.warehouse) || a.sku.localeCompare(b.sku));

    const limit = new Date(Date.parse(today) + 7 * 86400000).toISOString().slice(0, 10);
    const expiringLots: ExpiringLotRow[] = lots
        .filter((lot) => lot.quantity > 0 && lot.expiryDate !== null && lot.expiryDate <= limit)
        .sort((a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""))
        .map((lot) => {
            const ingredient = state.ingredients.find((item) => item.id === lot.ingredientId);
            const days = daysBetween(today, lot.expiryDate as string);
            const expired = days < 0;
            return {
                id: lot.id,
                batchId: lot.lotCode,
                name: ingredient?.name ?? lot.ingredientId,
                warehouse: lotWarehouseLabel(lot),
                quantity: `${lot.quantity.toLocaleString("vi-VN")} ${ingredient?.baseUnit ?? ""}`.trim(),
                expDate: formatDate(lot.expiryDate as string),
                remainingText: expired ? "Đã quá hạn" : days === 0 ? "Hết hạn hôm nay" : `Còn ${days} ngày`,
                remainingTone: days <= 2 ? "danger" : "warning",
                actionNote: expired
                    ? "Cách ly, lập phiếu hủy và ghi nhận hao hụt"
                    : "Ưu tiên xuất dùng trước theo FEFO",
                actionButtonText: expired ? "Cách Ly" : days <= 2 ? "Xuất Ngay" : "Kiểm Tra",
            };
        });

    return {
        stockItems,
        expiringLots,
        totalValue: stockItems.reduce((sum, item) => sum + item.totalValue, 0),
        lowStockCount: stockItems.filter((item) => item.statusTone !== "success").length,
    };
}

