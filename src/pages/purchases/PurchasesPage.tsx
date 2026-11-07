import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatCurrency, formatDate, getTodayISO } from "../shared/formatters";
import { getIngredient } from "../shared/business-demo";
import type { PurchaseOrder, PurchaseStatus } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const STATUS_LABEL: Record<PurchaseStatus, string> = { draft: "Bản nháp", placed: "Đã đặt", partial: "Nhận một phần", received: "Đã nhận đủ" };
function orderStatus(order: PurchaseOrder): PurchaseStatus {
    const ordered = order.lines.reduce((sum, line) => sum + line.orderedQuantity, 0);
    const received = order.lines.reduce((sum, line) => sum + line.receivedQuantity, 0);
    if (order.status === "draft") return "draft";
    if (received >= ordered && ordered > 0) return "received";
    if (received > 0) return "partial";
    return "placed";
}

export default function PurchasesPage() {
    const navigate = useNavigate();
    const [data, setData] = useDemoState();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [applied, setApplied] = useState({ search: "", status: "all" });
    const rows = useMemo(() => data.purchaseOrders.filter((order) => {
        const query = applied.search.trim().toLocaleLowerCase("vi-VN");
        return (!query || `${order.code} ${order.supplier} ${order.lines.map((line) => getIngredient(data, line.ingredientId)?.name).join(" ")}`.toLocaleLowerCase("vi-VN").includes(query))
            && (applied.status === "all" || orderStatus(order) === applied.status);
    }), [data.purchaseOrders, data.ingredients, applied]);
    const totalOrdered = data.purchaseOrders.filter((order) => orderStatus(order) !== "draft").length;
    const awaiting = data.purchaseOrders.filter((order) => orderStatus(order) === "placed" || orderStatus(order) === "partial").length;
    const receivedCount = data.purchaseOrders.filter((order) => orderStatus(order) === "received").length;
    const today = getTodayISO();
    const sevenDays = new Date(new Date(`${today}T00:00:00`).getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const expiringLots = data.lots.filter((lot) => lot.location === "central" && lot.quality === "pass" && lot.expiryDate && lot.expiryDate >= today && lot.expiryDate <= sevenDays).length;

    function applyFilters() { setApplied({ search, status }); }
    function clearFilters() { setSearch(""); setStatus("all"); setApplied({ search: "", status: "all" }); }
    function markPlaced(order: PurchaseOrder) {
        setData((current) => ({ ...current, purchaseOrders: current.purchaseOrders.map((item) => item.id === order.id ? { ...item, status: "placed" } : item) }));
    }
    function totalFor(order: PurchaseOrder) {
        return Math.max(0, order.lines.reduce((sum, line) => sum + line.orderedQuantity * line.unitPrice, 0) - order.discount + order.shipping + order.tax);
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><span className="current">Mua hàng</span></nav><h1 className="page-title">Đơn mua nguyên liệu</h1><p className="page-subtitle">Đơn mua từ nhà cung cấp đều nhận tại kho tổng; kiểm nhận và nhập lô ở bước riêng.</p></div><span className="text-xs text-[var(--muted)]">Dữ liệu demo</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Đơn đã đặt" value={String(totalOrdered)} subLabel="Nguồn cung toàn chuỗi" tone="info" icon={<KpiIcon kind="cart" />} /><StatCard label="Chờ nhận" value={String(awaiting)} subLabel="Còn lượng chưa kiểm nhận" tone="warning" icon={<KpiIcon kind="clock" />} /><StatCard label="Đã nhận đủ" value={String(receivedCount)} subLabel="Theo số lượng thực nhận" tone="success" icon={<KpiIcon kind="document-check" />} /><StatCard label="Lô kho tổng cận hạn" value={String(expiringLots)} subLabel="Trong 7 ngày tới" tone="warning" icon={<KpiIcon kind="clock" />} /></div></section>
            <section className="card mb-6 border-l-4 border-[var(--warning)]"><h2 className="text-sm font-bold mb-1">Tách đơn mua và phiếu nhận</h2><p className="text-sm text-[var(--muted)]">Đơn mua chỉ ghi số lượng đặt, nhà cung cấp và lịch giao. Số lượng thực nhận, lô, hạn dùng và chất lượng được ghi tại Phiếu nhận hàng.</p></section>
            <section className="card mb-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"><div><label className="form-label" htmlFor="purchase-search">Tìm kiếm</label><input id="purchase-search" className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã PO, nhà cung cấp, nguyên liệu..." /></div><div><label className="form-label" htmlFor="purchase-status">Trạng thái</label><select id="purchase-status" className="form-input form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="flex gap-2"><button type="button" className="btn btn-secondary" onClick={clearFilters}>Xóa lọc</button><button type="button" className="btn btn-primary" onClick={applyFilters}>Áp dụng</button></div></div></section>
            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Đơn mua nguyên liệu</h2><p className="text-sm text-[var(--muted)] mt-1">Kho nhận cố định: kho tổng.</p></div><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={() => navigate("/purchases/receipts")}>Phiếu nhận hàng</button><button className="btn btn-primary" onClick={() => navigate("/purchases/new")}>+ Lập đơn mua</button></div></div><DataTable><table className="w-full min-w-[1000px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã PO", "Nhà cung cấp", "Ngày đặt", "Dự kiến giao", "Kho nhận", "Dòng hàng", "Đặt / nhận", "Tổng tiền", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-3 py-3 font-semibold whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={10} className="px-4 py-8 text-center text-[var(--muted)]">Không có đơn mua phù hợp.</td></tr> : rows.map((order) => { const receivedStatus = orderStatus(order); return <tr key={order.id} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{order.code}</td><td className="px-3 py-3">{order.supplier}</td><td className="px-3 py-3">{formatDate(order.orderDate)}</td><td className="px-3 py-3">{formatDate(order.expectedDelivery)}</td><td className="px-3 py-3">Kho tổng</td><td className="px-3 py-3">{order.lines.length}</td><td className="px-3 py-3">{order.lines.reduce((sum, line) => sum + line.orderedQuantity, 0).toLocaleString("vi-VN")} / {order.lines.reduce((sum, line) => sum + line.receivedQuantity, 0).toLocaleString("vi-VN")}</td><td className="px-3 py-3">{formatCurrency(totalFor(order))}</td><td className="px-3 py-3"><Badge variant={receivedStatus === "received" ? "success" : receivedStatus === "partial" ? "info" : receivedStatus === "draft" ? "gray" : "warning"}>{STATUS_LABEL[receivedStatus]}</Badge></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{receivedStatus === "draft" && <button className="btn btn-secondary" onClick={() => markPlaced(order)}>Xác nhận đặt</button>}{receivedStatus !== "draft" && receivedStatus !== "received" && <button className="btn btn-secondary" onClick={() => navigate("/purchases/receipts")}>Kiểm nhận</button>}</div></td></tr>; })}</tbody></table></DataTable></section>
        </div>
    );
}
