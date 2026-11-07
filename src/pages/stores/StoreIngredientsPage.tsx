import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatDate, getTodayISO } from "../shared/formatters";
import { getIngredient, usableLotQuantity } from "../shared/business-demo";
import type { Ingredient, IngredientLot } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

type CounterBalance = { ingredient: Ingredient; lots: IngredientLot[]; physical: number; reserved: number; locked: number; available: number; status: "ok" | "low" | "expiring" | "locked" | "empty" };
const STATUS_LABEL = { ok: "Đủ tồn", low: "Dưới tồn an toàn", expiring: "Cận hạn", locked: "Có lượng khóa", empty: "Hết khả dụng" };
const STATUS_VARIANT = { ok: "success", low: "warning", expiring: "warning", locked: "danger", empty: "danger" } as const;

export default function StoreIngredientsPage() {
    const [data] = useDemoState();
    const [storeId, setStoreId] = useState("CN01");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [applied, setApplied] = useState({ search: "", status: "all" });
    const [selected, setSelected] = useState<Ingredient | null>(null);
    const selectedLots = data.lots.filter((lot) => lot.location === "counter" && lot.locationId === storeId);
    const balances: CounterBalance[] = data.ingredients.map((ingredient) => {
        const lots = selectedLots.filter((lot) => lot.ingredientId === ingredient.id);
        const physical = lots.reduce((sum, lot) => sum + lot.quantity, 0);
        const reserved = lots.reduce((sum, lot) => sum + (lot.reservedQuantity ?? 0), 0);
        const locked = lots.reduce((sum, lot) => sum + (lot.lockedQuantity ?? 0), 0);
        const available = Math.max(0, lots.reduce((sum, lot) => sum + usableLotQuantity(lot), 0) - reserved - locked);
        const status: CounterBalance["status"] = lots.some((lot) => lot.lockedQuantity) ? "locked" : lots.some((lot) => lot.expiryDate && lot.expiryDate >= getTodayISO() && lot.expiryDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)) ? "expiring" : available === 0 ? "empty" : available < ingredient.minimum ? "low" : "ok";
        return { ingredient, lots, physical, reserved, locked, available, status };
    }).filter((balance) => balance.lots.length > 0);
    const rows = useMemo(() => balances.filter((balance) => (!applied.search || `${balance.ingredient.code} ${balance.ingredient.name}`.toLocaleLowerCase("vi-VN").includes(applied.search.trim().toLocaleLowerCase("vi-VN"))) && (applied.status === "all" || balance.status === applied.status)), [balances, applied]);
    const lowCount = balances.filter((balance) => balance.status === "low" || balance.status === "empty").length;
    const reservedTotal = balances.reduce((sum, balance) => sum + balance.reserved, 0);
    const recipe = data.recipes.find((item) => item.kind === "drink" && item.productId === "hd-001" && item.size === "M" && item.status === "approved");
    const producible = recipe?.ingredients.filter((line) => line.useType === "required" || line.useType === "default-topping").map((line) => {
        const stock = balances.find((balance) => balance.ingredient.id === line.ingredientId)?.available ?? 0;
        return line.quantity > 0 ? Math.floor(stock / line.quantity) : Number.POSITIVE_INFINITY;
    }) ?? [];
    const estimatedCups = producible.length ? Math.min(...producible) : 0;

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/inventory/branches">Cửa hàng</Link><span className="sep">/</span><span className="current">Tồn vận hành tại quầy</span></nav><h1 className="page-title">Nguyên liệu vận hành tại quầy</h1><p className="page-subtitle">Theo dõi lượng nhận theo ca, lượng giữ, lô còn hạn và tồn khả dụng để phục vụ bán.</p></div><span className="text-xs text-[var(--muted)]">Không phải kho chi nhánh</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Nguyên liệu tại quầy" value={String(balances.length)} subLabel="Có lô được kiểm nhận" tone="primary" icon={<KpiIcon kind="cup" />} /><StatCard label="Dưới tồn an toàn" value={String(lowCount)} subLabel="Cần xem xét cấp theo ca" tone="warning" icon={<KpiIcon kind="warning" />} /><StatCard label="Đang giữ cho đơn" value={`${reservedTotal.toLocaleString("vi-VN")} đơn vị`} subLabel="Không thuộc tồn khả dụng" tone="info" icon={<KpiIcon kind="box" />} /><StatCard label="Ly M có thể pha (ước tính)" value={String(estimatedCups)} subLabel="Giới hạn theo HD-001; không cộng độc lập giữa món" tone="info" icon={<KpiIcon kind="cup" />} /></div></section>
            <section className="card mb-6 border-l-4 border-[var(--info)]"><h2 className="text-sm font-bold mb-1">Công thức tồn khả dụng</h2><p className="text-sm text-[var(--muted)]">Tồn quầy chỉ tăng khi xác nhận thực nhận phiếu cấp phát. Khả dụng = tổng lô đạt/còn hạn − lượng giữ − lượng khóa; không có chuyển kho giữa cửa hàng.</p></section>
            <section className="card mb-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"><div><label className="form-label" htmlFor="counter-store">Cửa hàng</label><select id="counter-store" className="form-input form-select" value={storeId} onChange={(event) => { setStoreId(event.target.value); setApplied({ search: "", status: "all" }); setSearch(""); setStatus("all"); }}>{data.stores.map((store) => <option key={store.id} value={store.id}>{store.code} · {store.name}</option>)}</select></div><div><label className="form-label" htmlFor="counter-search">Tìm nguyên liệu</label><input id="counter-search" className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã hoặc tên..." /></div><div><label className="form-label" htmlFor="counter-status">Trạng thái</label><select id="counter-status" className="form-input form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả</option><option value="low">Dưới tồn an toàn</option><option value="expiring">Cận hạn</option><option value="locked">Có lượng khóa</option><option value="empty">Hết khả dụng</option><option value="ok">Đủ tồn</option></select><div className="flex gap-2 mt-2"><button type="button" className="btn btn-secondary" onClick={() => { setSearch(""); setStatus("all"); setApplied({ search: "", status: "all" }); }}>Xóa lọc</button><button type="button" className="btn btn-primary" onClick={() => setApplied({ search, status })}>Áp dụng</button></div></div></div></section>
            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)]"><h2 className="font-bold">Số dư vận hành tại quầy</h2><p className="text-sm text-[var(--muted)] mt-1">Nguồn: các dòng thực nhận đã xác nhận; mỗi nguyên liệu có thể có nhiều lô.</p></div><DataTable><table className="w-full min-w-[1050px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã", "Nguyên liệu", "Đơn vị", "Lô", "Thực tế", "Giữ", "Khóa", "Khả dụng", "Tồn an toàn", "Trạng thái"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{rows.map((balance) => <tr key={balance.ingredient.id} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{balance.ingredient.code}</td><td className="px-3 py-3"><button className="text-left text-[var(--primary)]" onClick={() => setSelected(balance.ingredient)}>{balance.ingredient.name}</button></td><td className="px-3 py-3">{balance.ingredient.baseUnit}</td><td className="px-3 py-3">{balance.lots.length}</td><td className="px-3 py-3">{balance.physical.toLocaleString("vi-VN")}</td><td className="px-3 py-3">{balance.reserved.toLocaleString("vi-VN")}</td><td className="px-3 py-3">{balance.locked.toLocaleString("vi-VN")}</td><td className="px-3 py-3 font-semibold">{balance.available.toLocaleString("vi-VN")}</td><td className="px-3 py-3">{balance.ingredient.minimum.toLocaleString("vi-VN")}</td><td className="px-3 py-3"><Badge variant={STATUS_VARIANT[balance.status]}>{STATUS_LABEL[balance.status]}</Badge></td></tr>)}</tbody></table></DataTable></section>
            <Modal isOpen={!!selected} title="Các lô đang ở quầy" size="lg" onClose={() => setSelected(null)}>{selected && <div className="space-y-3"><p className="font-semibold">{selected.code} · {selected.name}</p><p className="text-sm text-[var(--muted)]">Cửa hàng {data.stores.find((store) => store.id === storeId)?.code} · Đơn vị chuẩn {selected.baseUnit}</p><DataTable><table className="w-full text-sm"><thead><tr>{["Lô/mẻ", "Hạn dùng", "Thực tế", "Giữ", "Khóa", "Khả dụng", "Nguồn"].map((label) => <th key={label} className="px-2 py-2 text-left">{label}</th>)}</tr></thead><tbody>{selectedLots.filter((lot) => lot.ingredientId === selected.id).map((lot) => <tr key={lot.id} className="border-t border-[var(--border)]"><td className="px-2 py-2">{lot.lotCode}</td><td className="px-2 py-2">{lot.expiryDate ? formatDate(lot.expiryDate) : "Không áp dụng"}</td><td className="px-2 py-2">{lot.quantity}</td><td className="px-2 py-2">{lot.reservedQuantity ?? 0}</td><td className="px-2 py-2">{lot.lockedQuantity ?? 0}</td><td className="px-2 py-2">{Math.max(0, usableLotQuantity(lot) - (lot.reservedQuantity ?? 0) - (lot.lockedQuantity ?? 0))}</td><td className="px-2 py-2">{lot.batchId ?? "Phiếu cấp phát"}</td></tr>)}</tbody></table></DataTable></div>}</Modal>
        </div>
    );
}
