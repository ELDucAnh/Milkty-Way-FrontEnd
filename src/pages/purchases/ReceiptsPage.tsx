import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatDate, getTodayISO, makeId } from "../shared/formatters";
import { getIngredient } from "../shared/business-demo";
import type { PurchaseOrder, ReceiptLine, ReceiptRecord } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

interface ReceiptDraftLine extends ReceiptLine { remainingQuantity: number; }

export default function ReceiptsPage() {
    const [data, setData] = useDemoState();
    const [search, setSearch] = useState("");
    const [qualityFilter, setQualityFilter] = useState("all");
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [lines, setLines] = useState<ReceiptDraftLine[]>([]);
    const [document, setDocument] = useState("");
    const [receiver, setReceiver] = useState("Nhân viên kho tổng");
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const ordersToReceive = data.purchaseOrders.filter((order) => order.lines.some((line) => line.receivedQuantity < line.orderedQuantity));
    const historyRows = useMemo(() => data.receipts.flatMap((receipt) => receipt.lines.map((line) => ({ receipt, line }))).filter(({ receipt, line }) => {
        const ingredient = getIngredient(data, line.ingredientId);
        const query = search.trim().toLocaleLowerCase("vi-VN");
        return (!query || `${receipt.code} ${receipt.document} ${ingredient?.name ?? ""} ${line.lotCode}`.toLocaleLowerCase("vi-VN").includes(query)) && (qualityFilter === "all" || line.quality === qualityFilter);
    }), [data.receipts, data.ingredients, search, qualityFilter]);
    const pendingReceipts = ordersToReceive.length;
    const quarantineLots = data.lots.filter((lot) => lot.quality === "quarantine").length;
    const partialOrders = data.purchaseOrders.filter((order) => order.lines.some((line) => line.receivedQuantity > 0 && line.receivedQuantity < line.orderedQuantity)).length;

    function openOrder(order: PurchaseOrder) {
        setSelectedOrder(order);
        setDocument(""); setNote(""); setError("");
        setLines(order.lines.filter((line) => line.receivedQuantity < line.orderedQuantity).map((line) => {
            const ingredient = getIngredient(data, line.ingredientId);
            const mfg = getTodayISO();
            const expiry = ingredient?.shelfLifeDays ? new Date(Date.now() + ingredient.shelfLifeDays * 86400000).toISOString().slice(0, 10) : "";
            return { id: line.id, ingredientId: line.ingredientId, orderedQuantity: line.orderedQuantity, receivedQuantity: line.orderedQuantity - line.receivedQuantity, remainingQuantity: line.orderedQuantity - line.receivedQuantity, unit: line.unit, lotCode: "", manufactureDate: ingredient?.shelfLifeDays ? mfg : "", expiryDate: expiry, unitPrice: line.unitPrice, quality: "pass" as const, note: "" };
        }));
    }
    function updateLine(id: string, patch: Partial<ReceiptDraftLine>) { setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line)); }
    function confirmReceipt(event: FormEvent) {
        event.preventDefault();
        if (!selectedOrder) return;
        const today = getTodayISO();
        for (const line of lines) {
            const ingredient = getIngredient(data, line.ingredientId);
            if (!Number.isFinite(line.receivedQuantity) || line.receivedQuantity < 0 || line.receivedQuantity > line.remainingQuantity) {
                setError("Số lượng thực nhận phải từ 0 đến số lượng còn lại của đơn."); return;
            }
            if (line.receivedQuantity > 0 && !line.lotCode.trim()) { setError("Mỗi dòng có nhận hàng cần mã lô."); return; }
            if (line.receivedQuantity > 0 && ingredient?.shelfLifeDays !== null) {
                if (!line.manufactureDate || !line.expiryDate || line.manufactureDate > today || line.expiryDate <= line.manufactureDate || line.expiryDate <= today) {
                    setError("Ngày sản xuất phải không sau ngày nhận; hạn dùng phải sau ngày sản xuất và ngày nhập."); return;
                }
            }
            if (line.receivedQuantity === 0 && !line.note.trim() && !note.trim()) { setError("Dòng từ chối/nhận 0 cần ghi lý do."); return; }
            if (line.quality === "fail" && !line.note.trim() && !note.trim()) { setError("Lô không đạt cần ghi lý do cách ly/từ chối."); return; }
        }
        if (!lines.some((line) => line.receivedQuantity > 0) && !note.trim()) { setError("Cần ghi biên bản khi không nhận dòng hàng nào."); return; }
        const receipt: ReceiptRecord = { id: makeId("receipt"), code: `PN-${today.replace(/-/g, "")}-${String(data.receipts.length + 1).padStart(2, "0")}`, purchaseOrderId: selectedOrder.id, document: document.trim(), receivedAt: today, receiver: receiver.trim(), lines: lines.map(({ remainingQuantity: _remaining, ...line }) => line), note: note.trim() };
        const orderLines = selectedOrder.lines.map((orderLine) => {
            const receivedNow = lines.find((line) => line.id === orderLine.id)?.receivedQuantity ?? 0;
            return { ...orderLine, receivedQuantity: orderLine.receivedQuantity + receivedNow };
        });
        const allReceived = orderLines.every((line) => line.receivedQuantity >= line.orderedQuantity);
        const anyReceived = orderLines.some((line) => line.receivedQuantity > 0);
        const newLots = receipt.lines.filter((line) => line.receivedQuantity > 0).map((line) => ({
            id: makeId("lot"), ingredientId: line.ingredientId, lotCode: line.lotCode.trim(), manufactureDate: line.manufactureDate || null,
            expiryDate: line.expiryDate || null, quantity: line.receivedQuantity, unitCost: line.unitPrice,
            quality: line.quality === "pass" ? "pass" as const : "quarantine" as const, location: "central" as const, locationId: "central", batchId: null,
        }));
        setData((current) => ({
            ...current,
            receipts: [receipt, ...current.receipts],
            lots: [...newLots, ...current.lots],
            purchaseOrders: current.purchaseOrders.map((order) => order.id === selectedOrder.id ? { ...order, lines: orderLines, status: allReceived ? "received" : anyReceived ? "partial" : order.status } : order),
        }));
        setSelectedOrder(null); setError("");
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/purchases">Mua hàng</Link><span className="sep">/</span><span className="current">Phiếu nhận hàng</span></nav><h1 className="page-title">Phiếu nhận hàng / nhập kho</h1><p className="page-subtitle">Kiểm nhận đơn giao tại kho tổng theo lượng thực nhận, lô, hạn dùng và chất lượng.</p></div><span className="text-xs text-[var(--muted)]">Không cộng tồn trước khi xác nhận</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Đơn còn hàng chờ nhận" value={String(pendingReceipts)} subLabel="Nhận tập trung tại kho tổng" tone="info" icon={<KpiIcon kind="receipt" />} /><StatCard label="Đơn nhận một phần" value={String(partialOrders)} subLabel="Còn lượng chưa giao" tone="warning" icon={<KpiIcon kind="clock" />} /><StatCard label="Lô cách ly" value={String(quarantineLots)} subLabel="Không cộng tồn khả dụng" tone="danger" icon={<KpiIcon kind="warning" />} /><StatCard label="Lô đã xác nhận" value={String(data.lots.filter((lot) => lot.location === "central" && lot.quality === "pass").length)} subLabel="Tại kho tổng" tone="success" icon={<KpiIcon kind="box" />} /></div></section>
            <section className="card mb-6 border-l-4 border-[var(--warning)]"><h2 className="text-sm font-bold mb-1">Kiểm nhận trước khi nhập khả dụng</h2><p className="text-sm text-[var(--muted)]">Hàng đạt mới được thêm vào lô khả dụng tại kho tổng. Hàng không đạt được ghi nhận nhưng cách ly; thiếu/0 nhận cần lý do.</p></section>

            <section className="card p-0 overflow-hidden mb-6"><div className="p-4 md:p-5 border-b border-[var(--border)]"><h2 className="font-bold">Đơn mua còn hàng cần nhận</h2><p className="text-sm text-[var(--muted)] mt-1">Số lượng còn lại được tính từ đơn mua trừ các lần nhận đã ghi.</p></div><DataTable><table className="w-full min-w-[850px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã PO", "Nhà cung cấp", "Ngày đặt", "Dự kiến giao", "Dòng còn nhận", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{ordersToReceive.map((order) => <tr key={order.id} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{order.code}</td><td className="px-3 py-3">{order.supplier}</td><td className="px-3 py-3">{formatDate(order.orderDate)}</td><td className="px-3 py-3">{formatDate(order.expectedDelivery)}</td><td className="px-3 py-3">{order.lines.filter((line) => line.receivedQuantity < line.orderedQuantity).length}</td><td className="px-3 py-3"><Badge variant={order.status === "partial" ? "info" : "warning"}>{order.status === "partial" ? "Nhận một phần" : order.status === "draft" ? "Bản nháp" : "Đã đặt"}</Badge></td><td className="px-3 py-3"><button className="btn btn-primary" disabled={order.status === "draft"} onClick={() => openOrder(order)}>Kiểm nhận hàng</button></td></tr>)}</tbody></table></DataTable></section>

            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)]"><h2 className="font-bold">Lịch sử kiểm nhận</h2></div><DataTable><table className="w-full min-w-[1050px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã phiếu", "Mã PO", "Chứng từ", "Ngày nhận", "Người nhận", "Nguyên liệu", "Lô", "Thực nhận", "Chất lượng", "Vị trí"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{data.receipts.flatMap((receipt) => receipt.lines.map((line) => <tr key={`${receipt.id}-${line.id}`} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{receipt.code}</td><td className="px-3 py-3">{data.purchaseOrders.find((order) => order.id === receipt.purchaseOrderId)?.code ?? "—"}</td><td className="px-3 py-3">{receipt.document || "—"}</td><td className="px-3 py-3">{formatDate(receipt.receivedAt)}</td><td className="px-3 py-3">{receipt.receiver}</td><td className="px-3 py-3">{getIngredient(data, line.ingredientId)?.name}</td><td className="px-3 py-3">{line.lotCode || "—"}</td><td className="px-3 py-3">{line.receivedQuantity} {line.unit}</td><td className="px-3 py-3"><Badge variant={line.quality === "pass" ? "success" : "danger"}>{line.quality === "pass" ? "Đạt" : "Cách ly / từ chối"}</Badge></td><td className="px-3 py-3">{line.quality === "pass" ? "Kho tổng · khả dụng" : "Kho tổng · cách ly"}</td></tr>))}</tbody></table></DataTable></section>

            <Modal isOpen={!!selectedOrder} title={`Kiểm nhận · ${selectedOrder?.code ?? ""}`} onClose={() => setSelectedOrder(null)}>{selectedOrder && <form className="space-y-4" onSubmit={confirmReceipt}><p className="text-sm text-[var(--muted)]">Nhà cung cấp: {selectedOrder.supplier} · Kho nhận: Kho tổng</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="form-label" htmlFor="receipt-document">Chứng từ / hóa đơn</label><input id="receipt-document" className="form-input" value={document} onChange={(event) => setDocument(event.target.value)} /></div><div><label className="form-label" htmlFor="receipt-receiver">Người nhận *</label><input id="receipt-receiver" className="form-input" value={receiver} onChange={(event) => setReceiver(event.target.value)} required /></div></div>
                <DataTable><table className="w-full min-w-[1000px] text-sm text-left"><thead><tr>{["Nguyên liệu", "Còn đặt", "Thực nhận", "Mã lô", "Ngày SX", "Hạn dùng", "Đơn giá", "Chất lượng", "Ghi chú"].map((label) => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{lines.map((line) => { const ingredient = getIngredient(data, line.ingredientId); return <tr key={line.id} className="border-t border-[var(--border)]"><td className="px-2 py-2">{ingredient?.name}<div className="text-xs text-[var(--muted)]">{line.unit}</div></td><td className="px-2 py-2">{line.remainingQuantity}</td><td className="px-2 py-2"><input aria-label={`Thực nhận ${ingredient?.name}`} type="number" min="0" max={line.remainingQuantity} step="0.001" className="form-input w-28" value={line.receivedQuantity} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, receivedQuantity: Number(event.target.value) } : item))} /></td><td className="px-2 py-2"><input aria-label={`Mã lô ${ingredient?.name}`} className="form-input w-32" value={line.lotCode} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, lotCode: event.target.value } : item))} /></td><td className="px-2 py-2"><input aria-label={`Ngày SX ${ingredient?.name}`} type="date" className="form-input min-w-[135px]" value={line.manufactureDate} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, manufactureDate: event.target.value } : item))} /></td><td className="px-2 py-2">{ingredient?.shelfLifeDays === null ? <span className="text-xs text-[var(--muted)]">Không áp dụng</span> : <input aria-label={`Hạn dùng ${ingredient?.name}`} type="date" className="form-input min-w-[135px]" value={line.expiryDate} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, expiryDate: event.target.value } : item))} />}</td><td className="px-2 py-2">{line.unitPrice.toLocaleString("vi-VN")}</td><td className="px-2 py-2"><select aria-label={`Chất lượng ${ingredient?.name}`} className="form-input form-select" value={line.quality} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, quality: event.target.value as "pass" | "fail" } : item))}><option value="pass">Đạt</option><option value="fail">Không đạt</option></select></td><td className="px-2 py-2"><input aria-label={`Ghi chú ${ingredient?.name}`} className="form-input min-w-[120px]" value={line.note} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, note: event.target.value } : item))} /></td></tr>; })}</tbody></table></DataTable>
                <div><label className="form-label" htmlFor="receipt-note">Biên bản / ghi chú chung</label><textarea id="receipt-note" rows={2} className="form-input form-textarea" value={note} onChange={(event) => setNote(event.target.value)} /></div>{error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Hủy</button><button type="submit" className="btn btn-primary">Xác nhận kiểm nhận</button></div>
            </form>}</Modal>
        </div>
    );
}
