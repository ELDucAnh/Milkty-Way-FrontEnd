import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatCurrency, getTodayISO, makeId } from "../shared/formatters";
import { getIngredient, getStore, theoreticalBalance } from "../shared/business-demo";
import type { CountPosition, InventoryCount } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const POSITION_LABEL: Record<CountPosition, string> = { central: "Kho tổng", kitchen: "Khu chế biến tập trung", counter: "Quầy vận hành cửa hàng" };
const REASONS = ["Hết hạn", "Nấu/chế biến hỏng", "Pha sai", "Đổ vỡ", "Sai lệch kiểm đếm", "Nghi ngờ thất thoát", "Khác"];

export default function StockAdjustmentPage() {
    const [data, setData] = useDemoState();
    const [position, setPosition] = useState<CountPosition>("counter");
    const [storeId, setStoreId] = useState("CN01");
    const [date, setDate] = useState(getTodayISO());
    const [shift, setShift] = useState("Ca tối");
    const [lotId, setLotId] = useState("lot-counter-cn01-tea");
    const [counted, setCounted] = useState("");
    const [counter, setCounter] = useState("Nhân viên kiểm đếm");
    const [reason, setReason] = useState(REASONS[0]);
    const [note, setNote] = useState("");
    const [search, setSearch] = useState("");

    const locationId = position === "central" ? "central" : position === "kitchen" ? "kitchen" : storeId;
    const eligibleLots = data.lots.filter((lot) => lot.location === position && lot.locationId === locationId);
    const selectedLot = eligibleLots.find((lot) => lot.id === lotId) ?? eligibleLots[0];
    const counts = useMemo(() => data.counts.filter((record) => !search || `${record.code} ${getIngredient(data, record.ingredientId)?.name ?? ""} ${record.lotId}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"))), [data.counts, data.ingredients, search]);
    const pending = data.counts.filter((record) => record.status === "pending");
    const pendingValue = pending.reduce((sum, record) => sum + record.varianceValue, 0);

    function changePosition(next: CountPosition) {
        setPosition(next);
        const nextLocation = next === "central" ? "central" : next === "kitchen" ? "kitchen" : storeId;
        setLotId(data.lots.find((lot) => lot.location === next && lot.locationId === nextLocation)?.id ?? "");
    }
    function submit(event: FormEvent) {
        event.preventDefault();
        const actual = Number(counted);
        if (!selectedLot || !Number.isFinite(actual) || actual < 0 || !date || !counter.trim()) return;
        const snapshot = data.countSnapshots.find((item) => item.lotId === selectedLot.id);
        const opening = snapshot?.opening ?? selectedLot.quantity;
        const received = snapshot?.received ?? 0;
        const actualUse = snapshot?.actualUse ?? 0;
        const waste = snapshot?.waste ?? 0;
        const theoretical = theoreticalBalance(opening, received, actualUse, waste);
        const variance = Number((theoretical - actual).toFixed(3));
        const ingredient = getIngredient(data, selectedLot.ingredientId);
        const record: InventoryCount = {
            id: makeId("count"), code: `KK-${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}-${String(data.counts.length + 1).padStart(2, "0")}`,
            date, position, locationId, shift: position === "counter" ? shift as InventoryCount["shift"] : null,
            ingredientId: selectedLot.ingredientId, lotId: selectedLot.id,
            opening, received, actualUse, waste, theoretical, counted: actual, variance,
            varianceValue: Math.round(Math.abs(variance) * selectedLot.unitCost), reason,
            note: note.trim(), counter: counter.trim(), approver: "", status: "pending",
        };
        setData((current) => ({ ...current, counts: [record, ...current.counts] }));
        setCounted(""); setNote("");
    }
    function approve(record: InventoryCount) {
        setData((current) => ({
            ...current,
            counts: current.counts.map((item) => item.id === record.id ? { ...item, status: "approved", approver: "Quản lý kho" } : item),
            lots: current.lots.map((lot) => lot.id === record.lotId ? { ...lot, quantity: record.counted } : lot),
        }));
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/inventory/ingredients">Nguyên liệu</Link><span className="sep">/</span><span className="current">Kiểm kê</span></nav><h1 className="page-title">Kiểm kê &amp; điều chỉnh</h1><p className="page-subtitle">Kiểm đếm tại kho tổng, khu chế biến hoặc quầy vận hành; điều chỉnh tồn chỉ sau khi duyệt.</p></div><span className="text-xs text-[var(--muted)]">Dữ liệu demo</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Phiếu chờ duyệt" value={String(pending.length)} subLabel="Không tự sửa tồn" tone="warning" icon={<KpiIcon kind="clock" />} /><StatCard label="Giá trị chênh lệch chờ duyệt" value={formatCurrency(pendingValue)} subLabel="Theo giá vốn của lô" tone="warning" icon={<KpiIcon kind="balance" />} /><StatCard label="Vị trí kiểm kê" value="3" subLabel="Kho tổng · khu chế biến · quầy" tone="info" icon={<KpiIcon kind="clipboard" />} /><StatCard label="Lô hết hạn/cách ly" value={String(data.lots.filter((lot) => lot.quality !== "pass").length)} subLabel="Không thuộc tồn khả dụng" tone="danger" icon={<KpiIcon kind="warning" />} /></div></section>
            <section className="card mb-6 border-l-4 border-[var(--info)]"><h2 className="text-sm font-bold mb-1">Kiểm kê mù</h2><p className="text-sm text-[var(--muted)]">Trong lúc đếm chỉ hiển thị nguyên liệu, lô và đơn vị. Tồn sổ, thực nhận, tiêu hao thực tế và hủy được đối chiếu sau khi gửi phiếu.</p></section>

            <form className="card mb-6" onSubmit={submit}><h2 className="font-bold mb-4">Ghi nhận số đếm thực tế</h2><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div><label className="form-label" htmlFor="count-position">Vị trí kiểm kê *</label><select id="count-position" className="form-input form-select" value={position} onChange={(event) => changePosition(event.target.value as CountPosition)}><option value="central">Kho tổng</option><option value="kitchen">Khu chế biến tập trung</option><option value="counter">Quầy vận hành cửa hàng</option></select></div>
                {position === "counter" && <div><label className="form-label" htmlFor="count-store">Cửa hàng *</label><select id="count-store" className="form-input form-select" value={storeId} onChange={(event) => { setStoreId(event.target.value); setLotId(data.lots.find((lot) => lot.location === "counter" && lot.locationId === event.target.value)?.id ?? ""); }}>{data.stores.map((store) => <option key={store.id} value={store.id}>{store.code} · {store.name}</option>)}</select></div>}
                <div><label className="form-label" htmlFor="count-date">Ngày chốt *</label><input id="count-date" type="date" className="form-input" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
                {position === "counter" && <div><label className="form-label" htmlFor="count-shift">Ca</label><select id="count-shift" className="form-input form-select" value={shift} onChange={(event) => setShift(event.target.value)}><option>Ca sáng</option><option>Ca chiều</option><option>Ca tối</option></select></div>}
                <div><label className="form-label" htmlFor="count-lot">Nguyên liệu / lô *</label><select id="count-lot" className="form-input form-select" value={selectedLot?.id ?? ""} onChange={(event) => setLotId(event.target.value)} required>{eligibleLots.map((lot) => <option key={lot.id} value={lot.id}>{getIngredient(data, lot.ingredientId)?.code} · {getIngredient(data, lot.ingredientId)?.name} · {lot.lotCode}</option>)}</select></div>
                <div><label className="form-label" htmlFor="count-actual">Tồn thực đếm ({selectedLot ? getIngredient(data, selectedLot.ingredientId)?.baseUnit : "đơn vị"}) *</label><input id="count-actual" type="number" min="0" step="0.001" className="form-input" value={counted} onChange={(event) => setCounted(event.target.value)} required /></div>
                <div><label className="form-label" htmlFor="count-counter">Người kiểm đếm *</label><input id="count-counter" className="form-input" value={counter} onChange={(event) => setCounter(event.target.value)} required /></div>
                <div><label className="form-label" htmlFor="count-reason">Nguyên nhân (nếu đã xác định)</label><select id="count-reason" className="form-input form-select" value={reason} onChange={(event) => setReason(event.target.value)}>{REASONS.map((item) => <option key={item}>{item}</option>)}</select></div>
                <div className="md:col-span-2"><label className="form-label" htmlFor="count-note">Ghi chú / chứng từ</label><textarea id="count-note" rows={2} className="form-input form-textarea" value={note} onChange={(event) => setNote(event.target.value)} /></div>
            </div><div className="flex justify-end mt-4"><button type="submit" className="btn btn-primary" disabled={!selectedLot}>Gửi số đếm &amp; tính chênh lệch</button></div></form>

            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Phiếu kiểm kê</h2><p className="text-sm text-[var(--muted)] mt-1">Tồn lý thuyết = đầu + nhận − tiêu hao thực tế − hủy chưa tính vào tiêu hao; chênh lệch = lý thuyết − thực đếm.</p></div><input aria-label="Tìm phiếu kiểm kê" className="form-input max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã phiếu hoặc nguyên liệu..." /></div><DataTable><table className="w-full min-w-[1500px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã phiếu", "Ngày / vị trí", "Ca", "Nguyên liệu / lô", "Đầu", "Nhận", "Tiêu hao thực", "Hủy", "Lý thuyết", "Thực đếm", "Chênh lệch", "Giá trị", "Nguyên nhân", "Người đếm / duyệt", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-3 py-3 font-semibold whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{counts.map((record) => { const ingredient = getIngredient(data, record.ingredientId); const location = record.position === "counter" ? getStore(data, record.locationId)?.code : POSITION_LABEL[record.position]; return <tr key={record.id} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{record.code}</td><td className="px-3 py-3">{record.date}<div className="text-xs text-[var(--muted)]">{location}</div></td><td className="px-3 py-3">{record.shift ?? "—"}</td><td className="px-3 py-3">{ingredient?.name}<div className="text-xs text-[var(--muted)]">{record.lotId}</div></td><td className="px-3 py-3">{record.opening}</td><td className="px-3 py-3">{record.received}</td><td className="px-3 py-3">{record.actualUse}</td><td className="px-3 py-3">{record.waste}</td><td className="px-3 py-3">{record.theoretical}</td><td className="px-3 py-3">{record.counted}</td><td className={`px-3 py-3 font-semibold ${record.variance > 0 ? "text-[var(--danger)]" : record.variance < 0 ? "text-[var(--info)]" : "text-[var(--success)]"}`}>{record.variance > 0 ? `Thiếu ${record.variance}` : record.variance < 0 ? `Thừa ${Math.abs(record.variance)}` : "Khớp"}</td><td className="px-3 py-3">{formatCurrency(record.varianceValue)}</td><td className="px-3 py-3">{record.reason}</td><td className="px-3 py-3">{record.counter}<div className="text-xs text-[var(--muted)]">{record.approver || "Chưa duyệt"}</div></td><td className="px-3 py-3"><Badge variant={record.status === "approved" ? "success" : "warning"}>{record.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}</Badge></td><td className="px-3 py-3">{record.status === "pending" && <button className="btn btn-secondary" onClick={() => approve(record)}>Duyệt điều chỉnh</button>}</td></tr>; })}</tbody></table></DataTable></section>
        </div>
    );
}
