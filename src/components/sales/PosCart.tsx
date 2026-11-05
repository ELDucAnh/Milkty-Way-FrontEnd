import { useState } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/useToast";
import { formatCurrency } from "../../utils/format";

export interface PosCartItem {
    id: string;
    productId: string;
    name: string;
    size: "M" | "L";
    sugar: string;
    ice: string;
    toppings: readonly string[];
    note: string;
    quantity: number;
    unitPrice: number;
}

export interface PosCartProps {
    items: readonly PosCartItem[];
    onRemove: (id: string) => void;
    onClear: () => void;
}

function validPercentage(value: string): number | null {
    const number = value.trim() === "" ? 0 : Number(value);

    return Number.isFinite(number) && number >= 0 && number <= 100
        ? number
        : null;
}

export default function PosCart({ items, onRemove, onClear }: PosCartProps) {
    const toast = useToast();
    const [clearOpen, setClearOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [phone, setPhone] = useState("");
    const [voucher, setVoucher] = useState("");
    const [discountInput, setDiscountInput] = useState("");
    const [taxInput, setTaxInput] = useState("10");
    const [paidInput, setPaidInput] = useState("");

    const discountRate = validPercentage(discountInput);
    const taxRate = validPercentage(taxInput);
    const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
    );
    const discount = Math.round(subtotal * (discountRate ?? 0) / 100);
    const tax = Math.round((subtotal - discount) * (taxRate ?? 0) / 100);
    const total = subtotal - discount + tax;
    const paid = paidInput.trim() ? Number(paidInput) : 0;
    const paidValid = Number.isSafeInteger(paid) && paid >= 0;
    const change = paidValid ? Math.max(0, paid - total) : 0;

    function completeSale() {
        if (!items.length) {
            toast.warning("Giỏ hàng đang trống.");
            return;
        }

        if (discountRate === null || taxRate === null) {
            toast.warning("Giảm giá và thuế phải nằm trong khoảng 0–100%.");
            return;
        }

        if (paymentMethod === "cash" && (!paidValid || paid < total)) {
            toast.warning("Tiền khách đưa chưa đủ hoặc không hợp lệ.");
            return;
        }

        toast.info(
            "Đã kiểm tra giỏ hàng mô phỏng. Chưa tạo đơn, thu tiền, giữ nguyên liệu hoặc đồng bộ máy chủ.",
        );
    }

    return (
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-20">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)]">
                    <label className="form-label" htmlFor="member-phone">
                        Số điện thoại hội viên
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="member-phone"
                            type="tel"
                            inputMode="tel"
                            className="form-input"
                            placeholder="Nhập số điện thoại"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                        />
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                                toast.info("Chưa kết nối dữ liệu hội viên. Không tự áp dụng hạng thẻ.")
                            }
                        >
                            Tra cứu
                        </button>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-2">
                        Chưa tra cứu hội viên.
                    </p>
                </div>

                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Giỏ hàng hiện tại</span>
                        <span className="text-sm text-[var(--primary)]">
                            {items.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="text-xs text-[var(--danger)]"
                        disabled={!items.length}
                        onClick={() => setClearOpen(true)}
                    >
                        Xóa tất cả
                    </button>
                </div>

                <div className="max-h-[280px] overflow-y-auto px-5 pb-4">
                    {!items.length ? (
                        <p className="py-6 text-center text-sm text-[var(--muted)]">
                            Chưa có món trong giỏ hàng.
                        </p>
                    ) : items.map((item) => (
                        <div key={item.id} className="border-b border-[var(--border)] py-3">
                            <div className="flex justify-between gap-3">
                                <strong className="text-sm">
                                    {item.quantity} × {item.name} · {item.size}
                                </strong>
                                <button
                                    type="button"
                                    className="text-xs text-[var(--danger)]"
                                    aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                                    onClick={() => onRemove(item.id)}
                                >
                                    Xóa
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                                Đường {item.sugar}% · {item.ice}
                                {item.toppings.length > 0 && ` · ${item.toppings.join(", ")}`}
                            </p>
                            {item.note && (
                                <p className="mt-1 text-xs">{item.note}</p>
                            )}
                            <p className="mt-2 text-sm font-semibold">
                                {formatCurrency(item.unitPrice * item.quantity)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
                <div className="mb-4">
                    <label className="form-label" htmlFor="pos-voucher-code">
                        Mã ưu đãi
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="pos-voucher-code"
                            className="form-input"
                            placeholder="Nhập mã ưu đãi"
                            value={voucher}
                            onChange={(event) => setVoucher(event.target.value)}
                        />
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                                toast.info("Chưa kết nối điều kiện áp dụng mã ưu đãi.")
                            }
                        >
                            Áp dụng
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span>Tạm tính</span>
                    <strong>{formatCurrency(subtotal)}</strong>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="form-label" htmlFor="pos-discount-input">
                            Giảm giá (%)
                        </label>
                        <input
                            id="pos-discount-input"
                            className="form-input"
                            type="number"
                            min="0"
                            max="100"
                            value={discountInput}
                            onChange={(event) => setDiscountInput(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="pos-tax-input">
                            Thuế (%)
                        </label>
                        <input
                            id="pos-tax-input"
                            className="form-input"
                            type="number"
                            min="0"
                            max="100"
                            value={taxInput}
                            onChange={(event) => setTaxInput(event.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                        <span>Tiền giảm giá</span>
                        <span className="text-[var(--danger)]">
                            −{formatCurrency(discount)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tiền thuế</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
                    <strong>Tổng thanh toán</strong>
                    <strong className="text-2xl text-[var(--primary)]">
                        {formatCurrency(total)}
                    </strong>
                </div>
                
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
                <label className="form-label" htmlFor="payment-method">Phương thức thanh toán</label><select id="payment-method" className="form-input form-select mb-4" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="card">Thẻ</option></select>
                <div className="flex flex-wrap gap-2 mb-4">
                    {[50000, 100000, 200000, 500000].map((amount) => (
                        <button
                            key={amount}
                            type="button"
                            className="quick-amount-btn px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[12px] font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]"
                            disabled={paymentMethod !== "cash"} onClick={() => setPaidInput(String(amount))}
                        >
                            {formatCurrency(amount)}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5" htmlFor="pos-paid-amount">
                            Tiền khách đưa (đ)
                        </label>
                        <input
                            disabled={paymentMethod !== "cash"} id="pos-paid-amount"
                            type="number"
                            min="0"
                            step="1"
                            className="w-full h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text)] text-sm font-bold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
                            value={paidInput}
                            onChange={(event) => setPaidInput(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5" htmlFor="pos-change">Tiền thừa</label>
                        <output
                            id="pos-change"
                            className="h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center px-3.5 font-bold text-sm text-emerald-700"
                        >
                            {paymentMethod === "cash" ? formatCurrency(change) : "Không áp dụng"}
                        </output>
                    </div>
                </div>

<button id="pos-complete-btn" type="button" onClick={completeSale} className="group relative w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-600 text-white text-[15px] font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(34,181,115,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_15px_-2px_rgba(34,181,115,0.4)] overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="flex items-center gap-2">
                Hoàn tất bán hàng
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-[14px] font-extrabold backdrop-blur-sm"><span id="pos-total-label">{formatCurrency(total)}</span></span>
              </span>
            </button>
            </div>

            <ConfirmDialog
                open={clearOpen}
                title="Xóa toàn bộ giỏ hàng?"
                message="Các món và tùy chọn trong giỏ hàng hiện tại sẽ bị xóa."
                confirmText="Xóa giỏ hàng"
                onCancel={() => setClearOpen(false)}
                onConfirm={() => {
                    onClear();
                    setClearOpen(false);
                }}
            />
        </div>
    );
}