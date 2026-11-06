import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import { useToast } from "../../contexts/ToastContext";
import { formatCurrency, getTodayISO, makeId } from "../shared/formatters";
import type { PurchaseOrder, PurchaseOrderLine, PurchaseStatus } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

interface DraftLine { id: string; ingredientId: string; quantity: string; unitPrice: string; }
const SUPPLIERS = ["Công ty Nguyên liệu An Tâm", "Thực phẩm Minh Phát", "Bao bì Sài Gòn", "Hương liệu Việt"];
const newLine = (ingredientId = "ing-tea-leaf"): DraftLine => ({ id: makeId("po-line"), ingredientId, quantity: "", unitPrice: "" });

export default function AddPurchasePage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [data, setData] = useDemoState();
    const [supplier, setSupplier] = useState("");
    const [code, setCode] = useState("");
    const [orderDate, setOrderDate] = useState(getTodayISO());
    const [expectedDelivery, setExpectedDelivery] = useState(getTodayISO());
    const [paymentTerm, setPaymentTerm] = useState("Công nợ 15 ngày");
    const [discount, setDiscount] = useState("0");
    const [shipping, setShipping] = useState("0");
    const [tax, setTax] = useState("0");
    const [paid, setPaid] = useState("0");
    const [lines, setLines] = useState<DraftLine[]>([newLine(), newLine("ing-milk")]);
    const [note, setNote] = useState("");
    const subtotal = useMemo(() => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [lines]);
    const total = Math.max(0, subtotal - Number(discount || 0) + Number(shipping || 0) + Number(tax || 0));
    const balance = Math.max(0, total - Number(paid || 0));

    function updateLine(id: string, patch: Partial<DraftLine>) { setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line)); }
    function addLine() { setLines((current) => [...current, newLine(data.ingredients[0]?.id)]); }
    function removeLine(id: string) { setLines((current) => current.length > 1 ? current.filter((line) => line.id !== id) : current); }
    function saveOrder(status: PurchaseStatus) {
        const year = new Date().getFullYear();
        const lastSequence = data.purchaseOrders.reduce((highest, order) => {
            const match = new RegExp(`^PO-${year}-(\\d+)$`, "i").exec(order.code);
            return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0);
        const orderCode = code.trim().toUpperCase() || `PO-${year}-${String(lastSequence + 1).padStart(3, "0")}`;
        if (!supplier || !orderDate || !expectedDelivery || expectedDelivery < orderDate || lines.length === 0) {
            showToast({ type: "error", title: "Thông tin đơn mua chưa hợp lệ", message: "Chọn nhà cung cấp, ngày đặt/giao hợp lệ và ít nhất một dòng hàng." }); return;
        }
        if (data.purchaseOrders.some((order) => order.code.toLowerCase() === orderCode.toLowerCase())) {
            showToast({ type: "error", title: "Mã đơn đã tồn tại", message: "Hãy nhập mã PO khác hoặc để hệ thống tạo mã mới." }); return;
        }
        const invalidLine = lines.some((line) => !data.ingredients.some((ingredient) => ingredient.id === line.ingredientId) || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 || !Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) <= 0);
        if (invalidLine) { showToast({ type: "error", title: "Dòng mua chưa hợp lệ", message: "Mỗi nguyên liệu cần số lượng đặt và đơn giá lớn hơn 0." }); return; }
        const discountValue = Number(discount); const shippingValue = Number(shipping); const taxValue = Number(tax); const paidValue = Number(paid);
        if ([discountValue, shippingValue, taxValue, paidValue].some((value) => !Number.isFinite(value) || value < 0) || discountValue > subtotal) {
            showToast({ type: "error", title: "Chi phí/thanh toán chưa hợp lệ", message: "Chiết khấu, vận chuyển, thuế và đã thanh toán phải không âm; chiết khấu không vượt tạm tính." }); return;
        }
        if (paidValue > total) { showToast({ type: "error", title: "Số tiền thanh toán không hợp lệ", message: "Đã thanh toán không được vượt tổng đơn." }); return; }
        const orderLines: PurchaseOrderLine[] = lines.map((line) => ({ id: line.id, ingredientId: line.ingredientId, orderedQuantity: Number(line.quantity), receivedQuantity: 0, unit: data.ingredients.find((ingredient) => ingredient.id === line.ingredientId)!.baseUnit, unitPrice: Number(line.unitPrice) }));
        const order: PurchaseOrder = { id: makeId("po"), code: orderCode, supplier, orderDate, expectedDelivery, warehouseId: "central", paymentTerm, discount: discountValue, shipping: shippingValue, tax: taxValue, paid: paidValue, note: note.trim(), status, lines: orderLines };
        setData((current) => ({ ...current, purchaseOrders: [order, ...current.purchaseOrders] }));
        showToast({ type: "success", title: status === "draft" ? "Đã lưu đơn mua nháp" : "Đã đặt hàng", message: `${orderCode} · ${formatCurrency(total)}. Mọi hàng mua đều nhận tại kho tổng.` });
        navigate("/purchases");
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/purchases">Mua hàng</Link><span className="sep">/</span><span className="current">Lập đơn mua</span></nav><h1 className="page-title">Lập đơn mua nguyên liệu</h1><p className="page-subtitle">Khai báo nhà cung cấp, lịch giao, số lượng đặt và điều khoản thương mại. Kiểm nhận ở Phiếu nhận hàng.</p></div><span className="text-xs text-[var(--muted)]">Kho nhận cố định: kho tổng</span></div>
            <section className="card mb-6 border-l-4 border-[var(--info)]"><h2 className="text-sm font-bold mb-1">Đơn mua tách khỏi nhập kho</h2><p className="text-sm text-[var(--muted)]">Trang này chỉ ghi số lượng đặt. Không ghi lượng thực nhận, mã lô hoặc hạn dùng; các thông tin đó được khai báo ở bước kiểm nhận sau giao hàng.</p></section>
            <form className="grid grid-cols-1 xl:grid-cols-3 gap-6" onSubmit={(event) => { event.preventDefault(); saveOrder("draft"); }}>
                <div className="xl:col-span-2 space-y-6">
                    <section className="card"><h2 className="font-bold mb-4 pb-3 border-b border-[var(--border)]">Thông tin đơn mua</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="form-label" htmlFor="po-supplier">Nhà cung cấp *</label><select id="po-supplier" className="form-input form-select" value={supplier} onChange={(event) => setSupplier(event.target.value)} required><option value="">Chọn nhà cung cấp</option>{SUPPLIERS.map((item) => <option key={item}>{item}</option>)}</select></div><div><label className="form-label" htmlFor="po-code">Mã đơn mua</label><input id="po-code" className="form-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Tự sinh nếu để trống" /></div><div><label className="form-label" htmlFor="po-date">Ngày đặt *</label><input id="po-date" type="date" className="form-input" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required /></div><div><label className="form-label" htmlFor="po-delivery">Lịch giao dự kiến *</label><input id="po-delivery" type="date" min={orderDate} className="form-input" value={expectedDelivery} onChange={(event) => setExpectedDelivery(event.target.value)} required /></div><div><label className="form-label" htmlFor="po-warehouse">Kho nhận</label><input id="po-warehouse" className="form-input" value="Kho tổng" readOnly /></div><div><label className="form-label" htmlFor="po-term">Điều khoản thanh toán</label><select id="po-term" className="form-input form-select" value={paymentTerm} onChange={(event) => setPaymentTerm(event.target.value)}><option>Thanh toán trước</option><option>Công nợ 15 ngày</option><option>Công nợ 30 ngày</option></select></div></div></section>

                    <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Nguyên liệu đặt mua</h2><p className="text-sm text-[var(--muted)] mt-1">Đơn vị hiển thị là đơn vị chuẩn của nguyên liệu.</p></div><button type="button" className="btn btn-secondary" onClick={addLine}>+ Thêm dòng</button></div><DataTable><table className="w-full min-w-[780px] text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Nguyên liệu", "Đơn vị chuẩn", "Số lượng đặt", "Đơn giá (đ)", "Thành tiền", ""].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{lines.map((line) => { const ingredient = data.ingredients.find((item) => item.id === line.ingredientId); return <tr key={line.id} className="border-t border-[var(--border)]"><td className="px-2 py-2"><select aria-label="Nguyên liệu" className="form-input form-select min-w-[190px]" value={line.ingredientId} onChange={(event) => updateLine(line.id, { ingredientId: event.target.value })}>{data.ingredients.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></td><td className="px-3 py-2">{ingredient?.baseUnit}</td><td className="px-2 py-2"><input aria-label="Số lượng đặt" type="number" min="0.001" step="0.001" className="form-input w-28" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required /></td><td className="px-2 py-2"><input aria-label="Đơn giá" type="number" min="0.01" step="0.01" className="form-input w-32" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} required /></td><td className="px-3 py-2">{formatCurrency(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</td><td className="px-2 py-2"><button type="button" className="btn btn-secondary" disabled={lines.length <= 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>Xóa</button></td></tr>; })}</tbody></table></DataTable><p className="p-4 text-xs text-[var(--muted)]">Số lượng đặt được ghi trên đơn mua; lô, hạn dùng, chất lượng và lượng thực nhận sẽ được khai báo riêng khi hàng đến kho tổng.</p></section>

                    <section className="card"><h2 className="font-bold mb-4">Thanh toán / công nợ (demo)</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="form-label" htmlFor="po-paid">Đã thanh toán (đ)</label><input id="po-paid" type="number" min="0" className="form-input" value={paid} onChange={(event) => setPaid(event.target.value)} /></div><div><label className="form-label" htmlFor="po-note">Ghi chú</label><input id="po-note" className="form-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thương mại" /></div></div><p className="text-xs text-[var(--muted)] mt-2">Ghi chú: {note || "—"} · Công nợ còn lại: {formatCurrency(balance)}</p></section>
                </div>

                <aside className="space-y-6"><section className="card"><h2 className="font-bold mb-4">Tổng hợp chi phí</h2><div className="space-y-3 text-sm"><div><label className="form-label" htmlFor="po-discount">Chiết khấu (đ)</label><input id="po-discount" type="number" min="0" className="form-input" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div><div><label className="form-label" htmlFor="po-shipping">Vận chuyển (đ)</label><input id="po-shipping" type="number" min="0" className="form-input" value={shipping} onChange={(event) => setShipping(event.target.value)} /></div><div><label className="form-label" htmlFor="po-tax">Thuế (đ)</label><input id="po-tax" type="number" min="0" className="form-input" value={tax} onChange={(event) => setTax(event.target.value)} /></div><div className="border-t border-[var(--border)] pt-3 flex justify-between"><span className="font-semibold">Tạm tính</span><b>{formatCurrency(subtotal)}</b></div><div className="flex justify-between"><span className="font-semibold">Tổng đơn</span><strong className="text-lg">{formatCurrency(total)}</strong></div></div></section><section className="card"><h2 className="font-bold mb-3">Hoàn tất</h2><p className="text-sm text-[var(--muted)] mb-4">Lưu nháp hoặc xác nhận đặt. Hai thao tác đều lưu đơn vào danh sách mua hàng.</p><button type="submit" className="btn btn-secondary w-full">Lưu bản nháp</button><button type="button" className="btn btn-primary w-full mt-2" onClick={() => saveOrder("placed")}>Xác nhận đặt hàng</button><button type="button" className="btn btn-secondary w-full mt-2" onClick={() => navigate("/purchases")}>Quay lại danh sách</button></section></aside>
            </form>
        </div>
    );
}
