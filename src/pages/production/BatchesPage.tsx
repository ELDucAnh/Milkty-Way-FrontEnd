import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatDate, getTodayISO, makeId } from "../shared/formatters";
import { getIngredient, usableLotQuantity } from "../shared/business-demo";
import type { ProductionBatch, ProductionInput, RecipeVersion, Shift } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const STATUS_LABEL = { planned: "Đã lên kế hoạch", processing: "Đang chế biến", completed: "Hoàn thành", held: "Tạm giữ" } as const;
const STATUS_VARIANT = { planned: "warning", processing: "info", completed: "success", held: "danger" } as const;

function allocatePlannedInputs(data: ReturnType<typeof useDemoState>[0], recipe: RecipeVersion, outputQuantity: number): ProductionInput[] | null {
    const remaining = new Map(data.lots.filter((lot) => lot.location === "central" && lot.quality === "pass").map((lot) => [lot.id, usableLotQuantity(lot)]));
    const inputs: ProductionInput[] = [];
    for (const line of recipe.ingredients) {
        let needed = line.quantity * outputQuantity / recipe.yieldQuantity;
        const candidates = data.lots.filter((lot) => lot.location === "central" && lot.ingredientId === line.ingredientId && usableLotQuantity(lot) > 0).sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));
        for (const lot of candidates) {
            const available = remaining.get(lot.id) ?? 0;
            const quantity = Math.min(available, needed);
            if (quantity > 0) {
                inputs.push({ id: makeId("batch-input"), ingredientId: line.ingredientId, lotId: lot.id, plannedQuantity: quantity, actualQuantity: null, unit: line.unit });
                remaining.set(lot.id, available - quantity);
                needed -= quantity;
            }
            if (needed <= 0.000001) break;
        }
        if (needed > 0.000001) return null;
    }
    return inputs;
}

export default function BatchesPage() {
    const [data, setData] = useDemoState();
    const [search, setSearch] = useState("");
    const [shiftFilter, setShiftFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [applied, setApplied] = useState({ search: "", shift: "all", status: "all" });
    const [createOpen, setCreateOpen] = useState(false);
    const [completeBatch, setCompleteBatch] = useState<ProductionBatch | null>(null);
    const [createForm, setCreateForm] = useState({ recipeId: data.recipes.find((recipe) => recipe.kind === "prep" && recipe.status === "approved")?.id ?? "", shift: "Ca sáng" as Shift, startedAt: `${getTodayISO()}T06:00`, planned: "10000", operator: "Nhân viên khu chế biến" });
    const [completeForm, setCompleteForm] = useState({ actual: "", waste: "", expiry: "", quality: "pass" as "pass" | "fail", approver: "Quản lý khu chế biến" });
    const [completeInputs, setCompleteInputs] = useState<Record<string, string>>({});
    const [createError, setCreateError] = useState("");
    const [completeError, setCompleteError] = useState("");
    const rows = useMemo(() => data.batches.filter((batch) => {
        const recipe = data.recipes.find((item) => item.id === batch.recipeId);
        const output = getIngredient(data, recipe?.outputIngredientId ?? "");
        return (!applied.search || `${batch.code} ${output?.name ?? ""}`.toLocaleLowerCase("vi-VN").includes(applied.search.trim().toLocaleLowerCase("vi-VN")))
            && (applied.shift === "all" || batch.shift === applied.shift)
            && (applied.status === "all" || batch.status === applied.status);
    }), [data.batches, data.recipes, data.ingredients, applied]);
    const prepRecipes = data.recipes.filter((recipe) => recipe.kind === "prep" && recipe.status === "approved");

    function createBatch(event: FormEvent) {
        event.preventDefault();
        const recipe = prepRecipes.find((item) => item.id === createForm.recipeId);
        const planned = Number(createForm.planned);
        if (!recipe || !Number.isFinite(planned) || planned <= 0 || !createForm.operator.trim()) { setCreateError("Cần công thức mẻ đã duyệt, sản lượng dương và người thực hiện."); return; }
        const inputs = allocatePlannedInputs(data, recipe, planned);
        if (!inputs) { setCreateError("Kho tổng không đủ nguyên liệu đạt/còn hạn để lập kế hoạch mẻ."); return; }
        const batch: ProductionBatch = { id: makeId("batch"), code: `ME-${getTodayISO().replace(/-/g, "").slice(2)}-${String(data.batches.length + 1).padStart(2, "0")}`, recipeId: recipe.id, shift: createForm.shift, plannedQuantity: planned, inputs, actualQuantity: null, wasteQuantity: null, unit: recipe.yieldUnit, startedAt: createForm.startedAt, expiryDate: "", quality: "unchecked", operator: createForm.operator.trim(), approver: "", status: "planned" };
        setData((current) => ({ ...current, batches: [batch, ...current.batches] }));
        setCreateOpen(false);
        setCreateForm((current) => ({ ...current, planned: String(recipe.yieldQuantity), recipeId: recipe.id }));
        setCreateError("");
    }
    function startBatch(batch: ProductionBatch) {
        setData((current) => ({ ...current, batches: current.batches.map((item) => item.id === batch.id ? { ...item, status: "processing" } : item) }));
    }
    function openCompletion(batch: ProductionBatch) {
        const recipe = data.recipes.find((item) => item.id === batch.recipeId);
        const ingredient = getIngredient(data, recipe?.outputIngredientId ?? "");
        const days = ingredient?.shelfLifeDays ?? 1;
        const expiry = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
        setCompleteBatch(batch);
        setCompleteForm({ actual: "", waste: "", expiry, quality: "pass", approver: "Quản lý khu chế biến" });
        setCompleteInputs(Object.fromEntries(batch.inputs.map((input) => [input.id, ""])));
        setCompleteError("");
    }
    function complete(event: FormEvent) {
        event.preventDefault();
        if (!completeBatch) return;
        const actual = Number(completeForm.actual);
        const waste = Number(completeForm.waste);
        const recipe = data.recipes.find((item) => item.id === completeBatch.recipeId);
        const output = getIngredient(data, recipe?.outputIngredientId ?? "");
        if (!recipe || !output || !Number.isFinite(actual) || actual <= 0 || !Number.isFinite(waste) || waste < 0 || !completeForm.expiry || completeForm.expiry < getTodayISO() || !completeForm.approver.trim()) { setCompleteError("Sản lượng thực tế phải lớn hơn 0; kiểm tra hao hụt, hạn dùng và người duyệt."); return; }
        const consumption = completeBatch.inputs.map((input) => ({ input, quantity: Number(completeInputs[input.id]) }));
        if (consumption.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) { setCompleteError("Ghi lượng đầu vào thực tế lớn hơn 0 cho từng lô."); return; }
        const requiredByLot = new Map<string, number>();
        for (const item of consumption) requiredByLot.set(item.input.lotId, (requiredByLot.get(item.input.lotId) ?? 0) + item.quantity);
        if ([...requiredByLot].some(([lotId, quantity]) => { const lot = data.lots.find((item) => item.id === lotId); return !lot || lot.location !== "central" || usableLotQuantity(lot) < quantity; })) { setCompleteError("Lô đầu vào không còn đủ khả dụng; không thể chốt mẻ."); return; }
        let lots = [...data.lots];
        for (const [lotId, quantity] of requiredByLot) lots = lots.map((item) => item.id === lotId ? { ...item, quantity: item.quantity - quantity } : item);
        const completed = completeForm.quality === "pass";
        const updated: ProductionBatch = { ...completeBatch, inputs: completeBatch.inputs.map((input) => ({ ...input, actualQuantity: Number(completeInputs[input.id]) })), actualQuantity: actual, wasteQuantity: waste, expiryDate: completeForm.expiry, quality: completeForm.quality, approver: completeForm.approver.trim(), status: completed ? "completed" : "held" };
        if (completed) lots = [{ id: makeId("lot"), ingredientId: output.id, lotCode: completeBatch.code, manufactureDate: getTodayISO(), expiryDate: completeForm.expiry, quantity: actual, unitCost: consumption.reduce((sum, item) => sum + item.quantity * (data.lots.find((lot) => lot.id === item.input.lotId)?.unitCost ?? 0), 0) / actual, quality: "pass", location: "kitchen", locationId: "kitchen", batchId: completeBatch.id }, ...lots];
        setData((current) => ({ ...current, lots, batches: current.batches.map((item) => item.id === completeBatch.id ? updated : item) }));
        setCompleteBatch(null);
        setCompleteError("");
    }

    const completedCount = data.batches.filter((batch) => batch.status === "completed").length;
    const processingCount = data.batches.filter((batch) => batch.status === "processing").length;
    const heldCount = data.batches.filter((batch) => batch.status === "held").length;

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/production/recipes">Sản xuất tập trung</Link><span className="sep">/</span><span className="current">Mẻ chế biến</span></nav><h1 className="page-title">Quản lý mẻ chế biến</h1><p className="page-subtitle">Theo dõi công thức/phiên bản, lô đầu vào, sản lượng thực tế, hao hụt, hạn dùng và chất lượng mẻ.</p></div><span className="text-xs text-[var(--muted)]">Khu chế biến tập trung</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Mẻ đã ghi nhận" value={String(data.batches.length)} subLabel="Theo dữ liệu demo" tone="info" icon={<KpiIcon kind="factory" />} /><StatCard label="Đang chế biến" value={String(processingCount)} subLabel="Chưa ghi sản lượng cuối" tone="info" icon={<KpiIcon kind="clock" />} /><StatCard label="Mẻ đạt" value={String(completedCount)} subLabel="Đủ điều kiện xem xét cấp phát" tone="success" icon={<KpiIcon kind="document-check" />} /><StatCard label="Cần rà soát" value={String(heldCount)} subLabel="Chờ xử lý chất lượng" tone="warning" icon={<KpiIcon kind="warning" />} /></div></section>
            <section className="card mb-6 border-l-4 border-[var(--info)]"><h2 className="text-sm font-bold mb-1">Hoàn thành mẻ có kiểm soát</h2><p className="text-sm text-[var(--muted)]">Không lấy sản lượng kế hoạch làm sản lượng thực tế. Khi hoàn tất cần nhập đầu ra, hao hụt, chất lượng và hạn dùng; chỉ mẻ đạt mới tạo tồn tại khu chế biến.</p></section>
            <section className="card mb-6"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end"><div><label className="form-label" htmlFor="batch-search">Tìm kiếm</label><input id="batch-search" className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã mẻ hoặc bán thành phẩm..." /></div><div><label className="form-label" htmlFor="batch-shift">Ca</label><select id="batch-shift" className="form-input form-select" value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}><option value="all">Tất cả ca</option>{["Ca sáng", "Ca chiều", "Ca tối"].map((shift) => <option key={shift}>{shift}</option>)}</select></div><div><label className="form-label" htmlFor="batch-status">Trạng thái</label><select id="batch-status" className="form-input form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="flex gap-2"><button type="button" className="btn btn-secondary" onClick={() => { setSearch(""); setShiftFilter("all"); setStatusFilter("all"); setApplied({ search: "", shift: "all", status: "all" }); }}>Xóa lọc</button><button type="button" className="btn btn-primary" onClick={() => setApplied({ search, shift: shiftFilter, status: statusFilter })}>Áp dụng</button></div></div></section>

            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Danh sách mẻ</h2><p className="text-sm text-[var(--muted)] mt-1">Truy xuất từng mẻ về công thức và lô nguyên liệu đầu vào.</p></div><button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ Tạo mẻ</button></div><DataTable><table className="w-full min-w-[1150px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã mẻ", "Bán thành phẩm", "Công thức/phiên bản", "Lô đầu vào (lượng)", "Ca / bắt đầu", "Kế hoạch", "Thực tế", "Hao hụt", "Hạn dùng", "Chất lượng", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-3 py-3 font-semibold whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{rows.map((batch) => { const recipe = data.recipes.find((item) => item.id === batch.recipeId); const output = getIngredient(data, recipe?.outputIngredientId ?? ""); return <tr key={batch.id} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{batch.code}</td><td className="px-3 py-3">{output?.name ?? "Không tìm thấy bán thành phẩm"}</td><td className="px-3 py-3">{recipe?.code ?? "—"} · {recipe?.version ?? "—"}</td><td className="px-3 py-3">{batch.inputs.map((input) => <div key={input.id}>{input.lotId} · {getIngredient(data, input.ingredientId)?.name}: {input.actualQuantity ?? input.plannedQuantity} {input.unit}{input.actualQuantity == null ? " dự kiến" : " thực dùng"}</div>)}</td><td className="px-3 py-3">{batch.shift}<div className="text-xs text-[var(--muted)]">{batch.startedAt}</div></td><td className="px-3 py-3">{batch.plannedQuantity} {batch.unit}</td><td className="px-3 py-3">{batch.actualQuantity == null ? "Chưa ghi nhận" : `${batch.actualQuantity} ${batch.unit}`}</td><td className="px-3 py-3">{batch.wasteQuantity == null ? "—" : `${batch.wasteQuantity} ${batch.unit}`}</td><td className="px-3 py-3">{batch.expiryDate ? formatDate(batch.expiryDate) : "—"}</td><td className="px-3 py-3">{batch.quality === "pass" ? "Đạt" : batch.quality === "fail" ? "Không đạt" : "Chưa kiểm tra"}</td><td className="px-3 py-3"><Badge variant={STATUS_VARIANT[batch.status]}>{STATUS_LABEL[batch.status]}</Badge></td><td className="px-3 py-3"><div className="flex gap-1">{batch.status === "planned" && <button className="btn btn-secondary" onClick={() => startBatch(batch)}>Bắt đầu</button>}{batch.status === "processing" && <button className="btn btn-primary" onClick={() => openCompletion(batch)}>Ghi kết quả</button>}</div></td></tr>; })}</tbody></table></DataTable></section>

            <Modal isOpen={createOpen} title="Tạo mẻ chế biến" onClose={() => setCreateOpen(false)}><form className="space-y-3" onSubmit={createBatch}><div><label className="form-label" htmlFor="batch-recipe">Công thức mẻ đã duyệt *</label><select id="batch-recipe" className="form-input form-select" value={createForm.recipeId} onChange={(event) => setCreateForm((current) => ({ ...current, recipeId: event.target.value }))} required>{prepRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.code} · {getIngredient(data, recipe.outputIngredientId ?? "")?.name} · v{recipe.version}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="form-label" htmlFor="batch-shift-new">Ca</label><select id="batch-shift-new" className="form-input form-select" value={createForm.shift} onChange={(event) => setCreateForm((current) => ({ ...current, shift: event.target.value as Shift }))}>{["Ca sáng", "Ca chiều", "Ca tối"].map((shift) => <option key={shift}>{shift}</option>)}</select></div><div><label className="form-label" htmlFor="batch-start">Bắt đầu</label><input id="batch-start" type="datetime-local" className="form-input" value={createForm.startedAt} onChange={(event) => setCreateForm((current) => ({ ...current, startedAt: event.target.value }))} required /></div></div><div><label className="form-label" htmlFor="batch-plan">Sản lượng kế hoạch *</label><input id="batch-plan" type="number" min="0.001" step="0.001" className="form-input" value={createForm.planned} onChange={(event) => setCreateForm((current) => ({ ...current, planned: event.target.value }))} required /></div><div><label className="form-label" htmlFor="batch-operator">Người thực hiện *</label><input id="batch-operator" className="form-input" value={createForm.operator} onChange={(event) => setCreateForm((current) => ({ ...current, operator: event.target.value }))} required /></div><p className="text-xs text-[var(--muted)]">Mẻ mới ở trạng thái kế hoạch, chưa làm thay đổi tồn nguyên liệu.</p><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Hủy</button><button type="submit" className="btn btn-primary">Tạo mẻ</button></div></form></Modal>

            <Modal isOpen={!!completeBatch} title="Ghi nhận kết quả mẻ" onClose={() => setCompleteBatch(null)}>{completeBatch && <form className="space-y-3" onSubmit={complete}><p className="text-sm font-semibold">{completeBatch.code} · Kế hoạch {completeBatch.plannedQuantity} {completeBatch.unit}</p><section className="card p-0 overflow-hidden"><div className="p-3"><h3 className="font-semibold">Lượng nguyên liệu thực dùng theo lô</h3></div><DataTable><table className="w-full text-sm"><thead><tr>{["Nguyên liệu / lô","Định mức dự kiến","Thực dùng"].map(label=><th key={label} className="px-2 py-2 text-left">{label}</th>)}</tr></thead><tbody>{completeBatch.inputs.map(input=><tr key={input.id} className="border-t border-[var(--border)]"><td className="px-2 py-2">{getIngredient(data,input.ingredientId)?.name}<div className="text-xs text-[var(--muted)]">{data.lots.find(lot=>lot.id===input.lotId)?.lotCode}</div></td><td className="px-2 py-2">{input.plannedQuantity} {input.unit}</td><td className="px-2 py-2"><input aria-label={`Thực dùng ${getIngredient(data,input.ingredientId)?.name}`} type="number" min="0.001" step="0.001" max={usableLotQuantity(data.lots.find(lot=>lot.id===input.lotId) ?? data.lots[0])} className="form-input w-32" value={completeInputs[input.id] ?? ""} onChange={event=>setCompleteInputs(current=>({...current,[input.id]:event.target.value}))} required /></td></tr>)}</tbody></table></DataTable></section><div className="grid grid-cols-2 gap-3"><div><label className="form-label" htmlFor="batch-actual">Sản lượng thực tế *</label><input id="batch-actual" type="number" min="0.001" step="0.001" className="form-input" value={completeForm.actual} onChange={(event) => setCompleteForm((current) => ({ ...current, actual: event.target.value }))} required /></div><div><label className="form-label" htmlFor="batch-waste">Hao hụt *</label><input id="batch-waste" type="number" min="0" step="0.001" className="form-input" value={completeForm.waste} onChange={(event) => setCompleteForm((current) => ({ ...current, waste: event.target.value }))} required /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="form-label" htmlFor="batch-expiry">Hạn dùng sau chế biến *</label><input id="batch-expiry" type="date" min={getTodayISO()} className="form-input" value={completeForm.expiry} onChange={(event) => setCompleteForm((current) => ({ ...current, expiry: event.target.value }))} required /></div><div><label className="form-label" htmlFor="batch-quality">Kết quả chất lượng *</label><select id="batch-quality" className="form-input form-select" value={completeForm.quality} onChange={(event) => setCompleteForm((current) => ({ ...current, quality: event.target.value as "pass" | "fail" }))}><option value="pass">Đạt</option><option value="fail">Không đạt</option></select></div></div><div><label className="form-label" htmlFor="batch-approver">Người duyệt *</label><input id="batch-approver" className="form-input" value={completeForm.approver} onChange={(event) => setCompleteForm((current) => ({ ...current, approver: event.target.value }))} required /></div><p className="text-xs text-[var(--muted)]">Đầu vào được trừ theo công thức mẻ khi ghi kết quả. Chỉ mẻ đạt và còn hạn mới sinh tồn tại khu chế biến.</p><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setCompleteBatch(null)}>Hủy</button><button type="submit" className="btn btn-primary">Lưu kết quả mẻ</button></div></form>}</Modal>
        </div>
    );
}
