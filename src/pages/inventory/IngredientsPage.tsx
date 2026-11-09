import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { can, homePath } from "../../utils/auth";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { getTodayISO, makeId } from "../shared/formatters";
import { availableLotQuantity } from "../shared/business-demo";
import type { Ingredient, IngredientDimension, IngredientGroup, IngredientLot } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const GROUP_LABEL: Record<IngredientGroup, string> = { tea: "Trà", dairy: "Sữa & bột kem", syrup: "Đường & syrup", topping: "Topping", packaging: "Bao bì", prepared: "Bán thành phẩm" };
type Status = "active" | "low" | "expiring" | "quarantine" | "empty";
const STATUS_LABEL: Record<Status, string> = { active: "Đủ tồn", low: "Dưới tồn an toàn", expiring: "Lô cận hạn", quarantine: "Có lô cách ly", empty: "Hết tồn khả dụng" };
const STATUS_VARIANT = { active: "success", low: "warning", expiring: "warning", quarantine: "danger", empty: "danger" } as const;
const GROUPS: IngredientGroup[] = ["tea", "dairy", "syrup", "topping", "packaging", "prepared"];

export default function IngredientsPage() {
    const [data, setData] = useDemoState();
    const [search, setSearch] = useState("");
    const [group, setGroup] = useState("all");
    const [status, setStatus] = useState("all");
    const [applied, setApplied] = useState({ search: "", group: "all", status: "all" });
    const [selected, setSelected] = useState<Ingredient | null>(null);
    const [minDraft, setMinDraft] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ code: "", name: "", group: "tea" as IngredientGroup, dimension: "mass" as IngredientDimension, baseUnit: "g", minimum: "", storage: "Khô, thoáng", shelfLifeDays: "365" });

    function lotsOf(ingredientId: string): IngredientLot[] {
        return data.lots.filter((lot) => lot.ingredientId === ingredientId && (lot.location === "central" || lot.location === "kitchen"));
    }
    function availableOf(ingredientId: string): number {
        const lots = lotsOf(ingredientId);
        return lots.reduce((sum, lot) => sum + availableLotQuantity(lot), 0);
    }
    function statusOf(ingredient: Ingredient): Status {
        const lots = lotsOf(ingredient.id);
        const available = lots.reduce((sum, lot) => sum + availableLotQuantity(lot), 0);
        if (lots.some((lot) => lot.quality === "quarantine")) return "quarantine";
        if (lots.some((lot) => lot.expiryDate && lot.expiryDate >= getTodayISO() && lot.expiryDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))) return "expiring";
        if (available === 0) return "empty";
        if (available < ingredient.minimum) return "low";
        return "active";
    }
    const filtered = useMemo(() => data.ingredients.filter((ingredient) => {
        const query = applied.search.trim().toLocaleLowerCase("vi-VN");
        const currentStatus = statusOf(ingredient);
        return (!query || `${ingredient.code} ${ingredient.name}`.toLocaleLowerCase("vi-VN").includes(query))
            && (applied.group === "all" || ingredient.group === applied.group)
            && (applied.status === "all" || currentStatus === applied.status);
    }), [data.ingredients, data.lots, applied]);
    const availableCount = data.ingredients.filter((item) => statusOf(item) === "active").length;
    const lowCount = data.ingredients.filter((item) => statusOf(item) === "low" || statusOf(item) === "empty").length;
    const expiringCount = data.ingredients.filter((item) => statusOf(item) === "expiring").length;
    const quarantineCount = data.ingredients.filter((item) => statusOf(item) === "quarantine").length;

    function clearFilters() {
        setSearch(""); setGroup("all"); setStatus("all"); setApplied({ search: "", group: "all", status: "all" });
    }
    function addIngredient(event: FormEvent) {
        event.preventDefault();
        const minimum = Number(form.minimum);
        if (!form.code.trim() || !form.name.trim() || !Number.isFinite(minimum) || minimum < 0) return;
        if (data.ingredients.some((item) => item.code.toLowerCase() === form.code.trim().toLowerCase() || item.name.toLocaleLowerCase("vi-VN") === form.name.trim().toLocaleLowerCase("vi-VN"))) return;
        const ingredient: Ingredient = { id: makeId("ingredient"), code: form.code.trim().toUpperCase(), name: form.name.trim(), group: form.group, dimension: form.dimension, baseUnit: form.baseUnit, minimum, storage: form.storage.trim(), shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : null };
        setData((current) => ({ ...current, ingredients: [...current.ingredients, ingredient] }));
        setModalOpen(false);
        setForm({ code: "", name: "", group: "tea", dimension: "mass", baseUnit: "g", minimum: "", storage: "Khô, thoáng", shelfLifeDays: "365" });
    }

    function updateMinimum(ingredient: Ingredient) {
        const nextMin = Number(minDraft);
        if (!Number.isFinite(nextMin) || nextMin < 0) return;
        const updated: Ingredient = { ...ingredient, minimum: nextMin };
        setData((current) => ({
            ...current,
            ingredients: current.ingredients.map((item) => (item.id === ingredient.id ? updated : item)),
        }));
        setSelected(updated);
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to={homePath()}>Trang chủ</Link><span className="sep">/</span><Link to="/inventory/products">Menu &amp; nguyên liệu</Link><span className="sep">/</span><span className="current">Nguyên liệu</span></nav><h1 className="page-title">Quản lý nguyên liệu</h1><p className="page-subtitle">Danh mục nguyên liệu tách biệt với các lô nhập và lô chế biến.</p></div><span className="text-xs text-[var(--muted)]">Kho tổng &amp; khu chế biến</span></div>

            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Danh mục nguyên liệu" value={String(data.ingredients.length)} subLabel="Nguyên liệu và vật tư" tone="primary" icon={<KpiIcon kind="box" />} />
                <StatCard label="Dưới tồn an toàn" value={String(lowCount)} subLabel="Tính theo tồn khả dụng" tone="warning" icon={<KpiIcon kind="warning" />} />
                <StatCard label="Lô cận hạn 7 ngày" value={String(expiringCount)} subLabel="Ưu tiên xuất FEFO" tone="warning" icon={<KpiIcon kind="clock" />} />
                <StatCard label="Có lô cách ly" value={String(quarantineCount)} subLabel={`${availableCount} nguyên liệu đủ tồn`} tone="danger" icon={<KpiIcon kind="warning" />} />
            </div></section>

            <section className="card mb-6 border-l-4 border-[var(--warning)]"><h2 className="text-sm font-bold mb-1">Tồn khả dụng theo lô</h2><p className="text-sm text-[var(--muted)]">Tồn khả dụng là tổng số lượng các lô còn hạn, đạt chất lượng và chưa bị khóa tại vị trí đang xem. Lô cách ly/hết hạn không được tính vào khả dụng.</p></section>

            <section className="card mb-6"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                <div><label className="form-label" htmlFor="ingredient-search">Tìm kiếm</label><input id="ingredient-search" className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã hoặc tên nguyên liệu..." /></div>
                <div><label className="form-label" htmlFor="ingredient-group">Nhóm</label><select id="ingredient-group" className="form-input form-select" value={group} onChange={(event) => setGroup(event.target.value)}><option value="all">Tất cả nhóm</option>{GROUPS.map((value) => <option key={value} value={value}>{GROUP_LABEL[value]}</option>)}</select></div>
                <div><label className="form-label" htmlFor="ingredient-status">Trạng thái lô/tồn</label><select id="ingredient-status" className="form-input form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="flex gap-2"><button type="button" className="btn btn-secondary" onClick={clearFilters}>Xóa lọc</button><button type="button" className="btn btn-primary" onClick={() => setApplied({ search, group, status })}>Áp dụng</button></div>
            </div></section>

            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Danh mục nguyên liệu</h2><p className="text-sm text-[var(--muted)] mt-1">Một nguyên liệu có thể có nhiều lô với hạn dùng và chất lượng khác nhau.</p></div>{can("ingredient.manage") && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Thêm nguyên liệu</button>}</div>
                <DataTable><table className="w-full text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã", "Tên nguyên liệu", "Nhóm", "Đơn vị chuẩn", "Lô đang quản lý", "Khả dụng kho tổng", "Tồn an toàn", "Trạng thái"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>
                    {filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">Không tìm thấy nguyên liệu phù hợp.</td></tr> : filtered.map((ingredient) => <tr key={ingredient.id} className="border-t border-[var(--border)] hover:bg-[var(--background)]"><td className="px-4 py-3 font-semibold">{ingredient.code}</td><td className="px-4 py-3"><button className="text-left font-medium text-[var(--primary)]" onClick={() => { setSelected(ingredient); setMinDraft(String(ingredient.minimum)); }}>{ingredient.name}</button></td><td className="px-4 py-3">{GROUP_LABEL[ingredient.group]}</td><td className="px-4 py-3">{ingredient.baseUnit} · {ingredient.dimension === "mass" ? "khối lượng" : ingredient.dimension === "volume" ? "thể tích" : "đếm"}</td><td className="px-4 py-3">{lotsOf(ingredient.id).length}</td><td className="px-4 py-3">{availableOf(ingredient.id).toLocaleString("vi-VN")} {ingredient.baseUnit}</td><td className="px-4 py-3">{ingredient.minimum.toLocaleString("vi-VN")} {ingredient.baseUnit}</td><td className="px-4 py-3"><Badge variant={STATUS_VARIANT[statusOf(ingredient)]}>{STATUS_LABEL[statusOf(ingredient)]}</Badge></td></tr>)}
                </tbody></table></DataTable>
            </section>

            <Modal isOpen={!!selected} title="Các lô & ngưỡng tồn an toàn của nguyên liệu" size="lg" onClose={() => setSelected(null)}>
                {selected && <div className="space-y-3"><p className="font-semibold">{selected.code} · {selected.name}</p><p className="text-sm text-[var(--muted)]">Đơn vị chuẩn: {selected.baseUnit}. Bảo quản: {selected.storage}.</p>{can("ingredient.manage") && <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"><div className="flex-1 min-w-[180px]"><label className="form-label" htmlFor="ingredient-edit-min">Thiết lập ngưỡng tồn an toàn ({selected.baseUnit})</label><input id="ingredient-edit-min" type="number" min="0" step="0.001" className="form-input" value={minDraft} onChange={(event) => setMinDraft(event.target.value)} /></div><button type="button" className="btn btn-primary" onClick={() => updateMinimum(selected)}>Cập nhật ngưỡng an toàn</button></div>}<DataTable><table className="w-full text-sm"><thead><tr>{["Lô/mẻ", "Ngày SX", "Hạn dùng", "SL", "Vị trí", "Chất lượng"].map((label) => <th key={label} className="px-2 py-2 text-left">{label}</th>)}</tr></thead><tbody>{lotsOf(selected.id).map((lot) => <tr key={lot.id} className="border-t border-[var(--border)]"><td className="px-2 py-2">{lot.lotCode}</td><td className="px-2 py-2">{lot.manufactureDate ?? "—"}</td><td className="px-2 py-2">{lot.expiryDate ?? "Không áp dụng"}</td><td className="px-2 py-2">{lot.quantity.toLocaleString("vi-VN")} {selected.baseUnit}</td><td className="px-2 py-2">{lot.location === "central" ? "Kho tổng" : lot.location === "kitchen" ? "Khu chế biến" : `Quầy ${lot.locationId}`}</td><td className="px-2 py-2">{lot.quality === "pass" ? "Đạt" : lot.quality === "quarantine" ? "Cách ly" : "Hết hạn"}</td></tr>)}</tbody></table></DataTable></div>}
            </Modal>

            <Modal isOpen={modalOpen} title="Thêm nguyên liệu" size="lg" onClose={() => setModalOpen(false)}>
                <form className="space-y-3" onSubmit={addIngredient}><div><label className="form-label" htmlFor="ingredient-code">Mã nguyên liệu *</label><input id="ingredient-code" className="form-input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required /></div><div><label className="form-label" htmlFor="ingredient-name">Tên nguyên liệu *</label><input id="ingredient-name" className="form-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></div><div className="grid grid-cols-2 gap-3"><div><label className="form-label" htmlFor="ingredient-new-group">Nhóm</label><select id="ingredient-new-group" className="form-input form-select" value={form.group} onChange={(event) => setForm((current) => ({ ...current, group: event.target.value as IngredientGroup }))}>{GROUPS.map((value) => <option key={value} value={value}>{GROUP_LABEL[value]}</option>)}</select></div><div><label className="form-label" htmlFor="ingredient-new-dimension">Loại đại lượng</label><select id="ingredient-new-dimension" className="form-input form-select" value={form.dimension} onChange={(event) => { const dimension = event.target.value as IngredientDimension; setForm((current) => ({ ...current, dimension, baseUnit: dimension === "mass" ? "g" : dimension === "volume" ? "ml" : "cái" })); }}><option value="mass">Khối lượng</option><option value="volume">Thể tích</option><option value="count">Đếm</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="form-label" htmlFor="ingredient-base">Đơn vị chuẩn</label><input id="ingredient-base" className="form-input" value={form.baseUnit} onChange={(event) => setForm((current) => ({ ...current, baseUnit: event.target.value }))} required /></div><div><label className="form-label" htmlFor="ingredient-min">Tồn an toàn</label><input id="ingredient-min" type="number" min="0" step="0.001" className="form-input" value={form.minimum} onChange={(event) => setForm((current) => ({ ...current, minimum: event.target.value }))} required /></div></div><div><label className="form-label" htmlFor="ingredient-storage">Bảo quản</label><input id="ingredient-storage" className="form-input" value={form.storage} onChange={(event) => setForm((current) => ({ ...current, storage: event.target.value }))} /></div><div><label className="form-label" htmlFor="ingredient-shelf-life">Hạn dùng tham chiếu (ngày; bỏ trống nếu không áp dụng)</label><input id="ingredient-shelf-life" type="number" min="1" className="form-input" value={form.shelfLifeDays} onChange={(event) => setForm((current) => ({ ...current, shelfLifeDays: event.target.value }))} /></div><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button><button type="submit" className="btn btn-primary">Lưu nguyên liệu</button></div></form>
            </Modal>
        </div>
    );
}
