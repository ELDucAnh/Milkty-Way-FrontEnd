import { useState } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/useToast";
import { formatCurrency } from "../../utils/format";
import { createPosOrder } from "../../pages/shared/sales-orders-store";

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
    branchId?: string;
}

function validPercentage(value: string): number | null {
    const number = value.trim() === "" ? 0 : Number(value);

    return Number.isFinite(number) && number >= 0 && number <= 100
        ? number
        : null;
}

const SAMPLE_MEMBERS: Record<string, { name: string; tier: string; points: number; discount: number; nextProgression: string }> = {
    "0903 123 456": { name: "Nguyễn An", tier: "Hạng VIP", points: 1250, discount: 15, nextProgression: "Đã đạt Hạng VIP cao nhất (Giảm 15%)" },
    "0903123456": { name: "Nguyễn An", tier: "Hạng VIP", points: 1250, discount: 15, nextProgression: "Đã đạt Hạng VIP cao nhất (Giảm 15%)" },
    "0908 123 456": { name: "Trần Văn An", tier: "Hạng Vàng", points: 850, discount: 10, nextProgression: "Cần 150 điểm nữa lên VIP" },
    "0908123456": { name: "Trần Văn An", tier: "Hạng Vàng", points: 850, discount: 10, nextProgression: "Cần 150 điểm nữa lên VIP" },
    "0912 345 678": { name: "Trần Bình", tier: "Hạng Bạc", points: 420, discount: 5, nextProgression: "Cần 80 điểm nữa lên Hạng Vàng" },
    "0912345678": { name: "Trần Bình", tier: "Hạng Bạc", points: 420, discount: 5, nextProgression: "Cần 80 điểm nữa lên Hạng Vàng" },
    "0988 777 666": { name: "Lê Minh Tuấn", tier: "Hạng Thành Viên", points: 150, discount: 0, nextProgression: "Cần 50 điểm nữa lên Hạng Bạc" },
    "0988777666": { name: "Lê Minh Tuấn", tier: "Hạng Thành Viên", points: 150, discount: 0, nextProgression: "Cần 50 điểm nữa lên Hạng Bạc" },
};

export default function PosCart({ items, onRemove, onClear, branchId = "CN01" }: PosCartProps) {
    const toast = useToast();
    const [clearOpen, setClearOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [phone, setPhone] = useState("");
    const [memberInfo, setMemberInfo] = useState<string | null>(null);
    const [memberName, setMemberName] = useState<string>("");
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

    function handleLookupMember() {
        const cleanPhone = phone.trim();
        if (!cleanPhone) {
            toast.warning("Vui lòng nhập số điện thoại để tra cứu.");
            return;
        }

        const found = SAMPLE_MEMBERS[cleanPhone];
        if (found) {
            setMemberName(found.name);
            setMemberInfo(`${found.name} · ${found.tier} (${found.points.toLocaleString()} điểm · ${found.nextProgression})`);
            if (found.discount > 0) {
                setDiscountInput(String(found.discount));
                toast.success(`Đã nhận diện hội viên ${found.name}! Tự động áp dụng giảm ${found.discount}% (${found.tier}).`, {
                    title: "Hội Viên Thân Thiết",
                });
            } else {
                toast.info(`Đã tìm thấy hội viên ${found.name} (${found.tier}). ${found.nextProgression}.`, {
                    title: "Hội Viên",
                });
            }
        } else {
            setMemberName("Khách Mới");
            setMemberInfo(`Khách mới: ${cleanPhone}`);
            toast.info(`Số điện thoại ${cleanPhone} chưa có trên hệ thống, sẽ tích điểm như Khách Mới.`, {
                title: "Khách Mới",
            });
        }
    }

    function handleApplyVoucher() {
        const code = voucher.trim().toUpperCase();
        if (!code) {
            toast.warning("Vui lòng nhập mã ưu đãi.");
            return;
        }

        if (code === "CHAOBAN" || code === "MILTYWAY" || code === "GIAM10") {
            setDiscountInput("10");
            toast.success(`Mã ưu đãi [${code}] hợp lệ: Giảm ngay 10% tổng đơn!`, {
                title: "Áp Dụng Thành Công",
            });
        } else if (code === "GIAM20" || code === "VIP20") {
            setDiscountInput("20");
            toast.success(`Mã ưu đãi [${code}] hợp lệ: Giảm ngay 20% tổng đơn!`, {
                title: "Áp Dụng Thành Công",
            });
        } else {
            toast.error(`Mã ưu đãi [${code}] không tồn tại hoặc đã hết lượt dùng.`, {
                title: "Không Hợp Lệ",
            });
        }
    }

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

        // Tạo đơn hàng thực tế vào hệ thống chung
        const { order, invoice } = createPosOrder({
            branchId,
            items: [...items],
            customerPhone: phone.trim() || undefined,
            customerName: memberName || undefined,
            paymentMethod: paymentMethod as "cash" | "transfer" | "card",
            paidAmount: paymentMethod === "cash" ? paid : total,
            discountRate: discountRate ?? 0,
            taxRate: taxRate ?? 10,
        });

        toast.success(
            `Đã tạo đơn ${order.id} & Hóa đơn ${invoice.id}! Đã chuyển phiếu KOT sang màn hình pha chế KDS.`,
            { title: "Bán Hàng Hoàn Tất" }
        );

        onClear();
        setPaidInput("");
        setVoucher("");
        setDiscountInput("");
        setPhone("");
        setMemberInfo(null);
        setMemberName("");
    }

    return (
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-20">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
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
                            placeholder="Ví dụ: 0903 123 456"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleLookupMember();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-secondary shrink-0"
                            onClick={handleLookupMember}
                        >
                            Tra cứu
                        </button>
                    </div>
                    {memberInfo ? (
                        <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {memberInfo}
                        </p>
                    ) : (
                        <p className="text-xs text-[var(--muted)] mt-2">
                            Nhập SĐT để tích điểm và áp dụng ưu đãi hạng thẻ (VIP: -10%, Gold: -8%, Silver: -5%).
                        </p>
                    )}
                </div>

                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Giỏ hàng hiện tại</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {items.reduce((sum, item) => sum + item.quantity, 0)} ly
                        </span>
                    </div>
                    <button
                        type="button"
                        className="text-xs text-[var(--danger)] hover:underline font-medium"
                        disabled={!items.length}
                        onClick={() => setClearOpen(true)}
                    >
                        Xóa giỏ hàng
                    </button>
                </div>

                <div className="px-5 pb-4 divide-y divide-[var(--border)] max-h-[300px] overflow-y-auto">
                    {!items.length && (
                        <div className="py-8 text-center text-sm text-[var(--muted)]">
                            <svg className="w-10 h-10 mx-auto mb-2 text-[var(--muted)]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Chưa có món nào được chọn. Nhấp vào món bên trái để bắt đầu.
                        </div>
                    )}
                    {items.map((item) => (
                        <div key={item.id} className="py-3 text-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold">{item.name}</div>
                                    <div className="text-xs text-[var(--muted)]">
                                        Cỡ {item.size} · Đường {item.sugar} · Đá {item.ice}
                                    </div>
                                    {item.toppings.length > 0 && (
                                        <div className="text-xs text-emerald-700 font-medium mt-0.5">
                                            + {item.toppings.join(", ")}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[var(--text)]">×{item.quantity}</span>
                                    <button
                                        type="button"
                                        className="text-[var(--muted)] hover:text-[var(--danger)] p-1"
                                        onClick={() => onRemove(item.id)}
                                        title="Xóa món này"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                </div>
                            </div>
                            {item.note && (
                                <p className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded italic">
                                    Ghi chú: {item.note}
                                </p>
                            )}
                            <div className="mt-1 text-sm font-bold text-[var(--primary)] text-right">
                                {formatCurrency(item.unitPrice * item.quantity)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                    <label className="form-label" htmlFor="pos-voucher-code">
                        Mã ưu đãi
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="pos-voucher-code"
                            className="form-input uppercase font-mono"
                            placeholder="Nhập CHAOBAN hoặc GIAM20"
                            value={voucher}
                            onChange={(event) => setVoucher(event.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleApplyVoucher();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-secondary shrink-0"
                            onClick={handleApplyVoucher}
                        >
                            Áp dụng
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-[var(--muted)]">Tạm tính</span>
                    <strong className="text-base">{formatCurrency(subtotal)}</strong>
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
                            Thuế VAT (%)
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

                <div className="space-y-1.5 mb-4 text-sm">
                    {discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Chiết khấu ưu đãi</span>
                            <span>−{formatCurrency(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                        <span>Tiền thuế VAT</span>
                        <span>+{formatCurrency(tax)}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                    <strong className="text-base">Tổng thanh toán</strong>
                    <strong className="text-2xl text-[var(--primary)] font-extrabold">
                        {formatCurrency(total)}
                    </strong>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                <label className="form-label" htmlFor="payment-method">Phương thức thanh toán</label>
                <select
                    id="payment-method"
                    className="form-input form-select mb-4"
                    value={paymentMethod}
                    onChange={event => setPaymentMethod(event.target.value)}
                >
                    <option value="cash">Tiền mặt tại quầy</option>
                    <option value="transfer">Chuyển khoản QR (VietQR / MoMo)</option>
                    <option value="card">Thẻ ngân hàng (POS quẹt thẻ)</option>
                </select>

                {paymentMethod === "cash" && (
                    <>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {[50000, 100000, 200000, 500000].map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    className="quick-amount-btn px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[12px] font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                                    onClick={() => setPaidInput(String(amount))}
                                >
                                    {formatCurrency(amount)}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5" htmlFor="pos-paid-amount">
                                    Tiền khách đưa (₫)
                                </label>
                                <input
                                    id="pos-paid-amount"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    className="w-full h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text)] text-sm font-bold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
                                    placeholder={String(total)}
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
                                    {formatCurrency(change)}
                                </output>
                            </div>
                        </div>
                    </>
                )}

                <button
                    id="pos-complete-btn"
                    type="button"
                    onClick={completeSale}
                    disabled={!items.length}
                    className="group relative w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white text-[15px] font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(34,181,115,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="flex items-center gap-2">
                        Hoàn tất thanh toán
                        <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-[14px] font-extrabold backdrop-blur-sm">
                            {formatCurrency(total)}
                        </span>
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
