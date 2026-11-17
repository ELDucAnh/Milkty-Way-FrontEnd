<<<<<<< Updated upstream
import { useState } from "react";
=======
import { findPosMember } from "../../data/sales/members";
import { checkLogin } from "../../utils/auth";
import { useEffect, useRef, useState, type ReactNode } from "react";
>>>>>>> Stashed changes
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/useToast";
import { formatCurrency } from "../../utils/format";
import {
  assertPosCheckoutEditable,
  createPosOrderExclusive,
} from "../../pages/shared/sales-orders-store";
import {
  parsePromotionCodes,
  quotePromotionCheckout,
  PROMOTIONS_CHANGED,
  STORAGE_PROMOTIONS,
  type PromotionQuote,
} from "../../pages/shared/promotions-store";

import { parsePercentage as validPercentage, type PosLine } from "../../pages/shared/sales-pricing";
import { savePosDraft, listPosDrafts, restorePosDraft, type PosDraft } from "../../pages/shared/pos-drafts-store";
export type PosCartItem = PosLine;

export interface PosCartProps {
    items: readonly PosCartItem[];
    onRemove: (id: string) => void;
    onClear: () => void;
    branchId: string;
    staffId: string;
    counterId: string;
    shiftId: string;
    customizer: ReactNode;
    onQuantity: (id: string, quantity: number) => void;
    onRestore: (items: PosCartItem[]) => void;
}

export default function PosCart({ items, onRemove, onClear, branchId, staffId, counterId, shiftId, onRestore, customizer, onQuantity }: PosCartProps) {
    const toast = useToast();
    const [channel, setChannel] = useState<"counter" | "takeaway">("counter");
    const [orderNote, setOrderNote] = useState("");
    const [clearOpen, setClearOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [phone, setPhone] = useState("");
    const [memberInfo, setMemberInfo] = useState<string | null>(null);
    const [memberName, setMemberName] = useState<string>("");
    const [voucher, setVoucher] = useState("");
    const [promotionCodes, setPromotionCodes] = useState<string[]>([]);
    const [, refreshPromotions] = useState(0);

    useEffect(() => {
        const refresh = () => refreshPromotions(value => value + 1);
        const storage = (event: StorageEvent) => {
            if (event.key === STORAGE_PROMOTIONS || event.key === null) refresh();
        };
        const timer = window.setInterval(refresh, 30000);
        window.addEventListener(PROMOTIONS_CHANGED, refresh);
        window.addEventListener("storage", storage);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener(PROMOTIONS_CHANGED, refresh);
            window.removeEventListener("storage", storage);
        };
    }, []);
    const [discountInput, setDiscountInput] = useState("");
    const [flatDiscount, setFlatDiscount] = useState(0);
    const [taxInput, setTaxInput] = useState("10");
    const [paidInput, setPaidInput] = useState("");

    const discountRate = validPercentage(discountInput);
    const taxRate = validPercentage(taxInput);
    let pricingError = "";
    let amounts: PromotionQuote = {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        memberDiscount: 0,
        memberSuppressed: false,
        appliedPromotions: [],
        ignoredCodes: [],
        lineAmounts: [],
    };

    try {
        amounts = quotePromotionCheckout({
            items,
            branchId,
            channel,
            discountRate: discountRate ?? 0,
            flatDiscount,
            taxRate: taxRate ?? 0,
            promotionCodes, customerPhone: phone,
        });
    } catch (error) {
        pricingError = error instanceof Error
            ? error.message
            : "Giá không hợp lệ.";
    }
    const { subtotal, discount, tax, total } = amounts;
    const context = { staffId, branchId, counterId, shiftId };
    const submitting = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const checkout = useRef({ id: crypto.randomUUID() as string, fingerprint: "" });
    const [drafts, setDrafts] = useState<PosDraft[]>([]);
    const [draftId, setDraftId] = useState("");
    function holdSale() {
        if (submitting.current) return;
      try {
        const id = checkout.current.id;
        savePosDraft({ ...context, version: 1, id, checkoutId: id, createdAt: new Date().toISOString(), items: [...items], phone, memberName, memberInfo, voucher, discountInput, taxInput, paidInput, paymentMethod, flatDiscount, channel, orderNote, promotionCodes: [...promotionCodes] });
        onClear(); setPhone(""); setMemberName(""); setMemberInfo(null); setVoucher(""); setPromotionCodes([]); setDiscountInput(""); setFlatDiscount(0); setPaidInput(""); setOrderNote(""); setChannel("counter");
        checkout.current = { id: crypto.randomUUID(), fingerprint: "" };
        setDrafts(listPosDrafts(context));
        toast.success("Đã giữ đơn.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Không giữ được đơn."); }
    }
    function restoreSale() {
      try {
        if (items.length) throw new Error("Hãy giữ hoặc xóa giỏ hiện tại trước khi khôi phục.");
        const draft = restorePosDraft(draftId, context);
        onRestore(draft.items); setPhone(draft.phone); setMemberName(draft.memberName); setMemberInfo(draft.memberInfo);
        setChannel(draft.channel ?? "counter"); setOrderNote(draft.orderNote ?? ""); setVoucher(draft.voucher);
        setPromotionCodes(draft.promotionCodes ?? []);

        if (draft.voucher && !draft.promotionCodes?.length) {
            toast.info(
                "Đơn giữ cũ có nội dung voucher nhưng chưa xác nhận bằng store. " +
                "Hãy áp dụng lại mã trước khi thanh toán.",
            );
        }
 setDiscountInput(draft.discountInput); setFlatDiscount(draft.flatDiscount ?? 0); setTaxInput(draft.taxInput); setPaidInput(draft.paidInput); setPaymentMethod(draft.paymentMethod);
        checkout.current = { id: draft.checkoutId, fingerprint: "" };
        toast.success("Đã khôi phục đơn giữ.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Không khôi phục được đơn."); }
    }
    const paid = paidInput.trim() ? Number(paidInput) : 0;
    const paidValid = Number.isSafeInteger(paid) && paid >= 0;
    const change = paidValid ? Math.max(0, paid - total) : 0;

    function handleLookupMember() {
        const cleanPhone = phone.trim();
        if (!cleanPhone) {
            toast.warning("Vui lòng nhập số điện thoại để tra cứu.");
            return;
        }

<<<<<<< Updated upstream
        const found = SAMPLE_MEMBERS[cleanPhone];
        if (found) {
=======
        const found = findPosMember(cleanPhone);
        setFlatDiscount(found?.tier.includes("Bạc") ? 5000 : !found || found.tier.includes("Thành Viên") ? 2000 : 0);
        setDiscountInput(String(found?.discount ?? 0));
        if (found && checkLogin() === "cashier") {
            setMemberName(found.name);
            setMemberInfo(found.name);
            setDiscountInput(String(found.discount));
            toast.success("Đã áp dụng ưu đãi hiện có của khách hàng.");
        } else if (found) {
>>>>>>> Stashed changes
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
        try {
            const codes = parsePromotionCodes(voucher);

            if (!codes.length) {
                setPromotionCodes([]);
                toast.info("Đã bỏ mã khuyến mãi.");
                return;
            }

            const quote = quotePromotionCheckout({
                items,
                branchId,
                channel,
                discountRate: discountRate ?? 0,
                flatDiscount,
                taxRate: taxRate ?? 0,
                promotionCodes: codes, customerPhone: phone,
            });

            setPromotionCodes(codes);

            const applied = quote.appliedPromotions.map(row => row.code).join(", ");
            toast.success(`Đã áp dụng: ${applied}.`);

            if (quote.memberSuppressed && (discountRate || flatDiscount)) {
                toast.info("Mã ưu đãi không cộng dồn giảm hạng thành viên.");
            }
            if (quote.ignoredCodes.length) {
                toast.info(
                    `Không áp dụng ${quote.ignoredCodes.join(", ")} ` +
                    "do quy tắc độc quyền/ưu tiên.",
                );
            }
        } catch (error) {
            setPromotionCodes([]);
            toast.error(
                error instanceof Error ? error.message : "Không áp dụng được mã.",
            );
        }
    }

    async function completeSale() {
        if (submitting.current) return;
        if (pricingError) { toast.error(pricingError); return; }
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

        // Xác định hạng thành viên nếu tìm thấy
        const cleanPhone = phone.trim();
        const found = cleanPhone ? findPosMember(cleanPhone) : null;
        const tier = found ? (found.tier.includes("VIP") ? "VIP" : found.tier.includes("Vàng") ? "Gold" : found.tier.includes("Bạc") ? "Silver" : "Member") : (cleanPhone ? "Member" : undefined);

        // Tạo đơn hàng thực tế vào hệ thống chung
        submitting.current = true; setIsSubmitting(true);
        try {
        const payload = { ...context, items, customerPhone: cleanPhone, customerName: memberName, tier, paymentMethod, paidAmount: paymentMethod === "cash" ? paid : total, discountRate, taxRate, flatDiscount, channel, orderNote, promotionCodes, expectedTotal: total };
        const fingerprint = JSON.stringify(payload);
        if (checkout.current.fingerprint && checkout.current.fingerprint !== fingerprint) checkout.current.id = crypto.randomUUID();
        checkout.current.fingerprint = fingerprint;
        const { order, invoice } = await createPosOrderExclusive({
            ...context, checkoutId: checkout.current.id,
            branchId,
            items: [...items],
            customerPhone: cleanPhone || undefined,
            customerName: memberName || undefined,
            tier,
            paymentMethod: paymentMethod as "cash" | "transfer" | "card",
            paidAmount: paymentMethod === "cash" ? paid : total,
            discountRate: discountRate ?? 0,
            taxRate: taxRate ?? 10,
            flatDiscount, channel, orderNote,
            promotionCodes: [...promotionCodes],
            expectedTotal: total,

        });

        toast.success(
            `Đã tạo đơn ${order.id} & Hóa đơn ${invoice.id}! Đã chuyển phiếu KOT sang màn hình pha chế KDS.`,
            { title: "Bán Hàng Hoàn Tất" }
        );

        onClear();
        setPaidInput(""); setOrderNote(""); setChannel("counter");
        setVoucher(""); setPromotionCodes([]);
        setDiscountInput(""); setFlatDiscount(0);
        setPhone("");
        setMemberInfo(null);
        setMemberName("");
        checkout.current = { id: crypto.randomUUID(), fingerprint: "" };
        setDrafts([]); setDraftId("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Không lưu được giao dịch. Giỏ được giữ lại.");
        } finally { submitting.current = false; setIsSubmitting(false); }
    }

    const shortcutActions = useRef({ holdSale, completeSale, total, paymentMethod, clearOpen });
    shortcutActions.current = { holdSale, completeSale, total, paymentMethod, clearOpen };
    useEffect(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.repeat || event.isComposing || document.querySelector('[role="dialog"]')) return;
        const action = shortcutActions.current;
        if (action.clearOpen) return;
        if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "h") { event.preventDefault(); action.holdSale(); }
        else if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "d") { event.preventDefault(); if (action.paymentMethod === "cash") setPaidInput(String(action.total)); }
        else if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === "Enter") { event.preventDefault(); action.completeSale(); }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, []);
    function changeQuantity(id: string, quantity: number) {
      try { assertPosCheckoutEditable(context, checkout.current.id); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return; onQuantity(id,quantity); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Không sửa được giỏ."); }
    }
    return (
        <div className="pos-cart-shell">
            <div className="pos-cart-header"><strong>Đơn hiện tại · {items.reduce((n,item) => n + item.quantity, 0)} ly</strong><select aria-label="Loại đơn" className="form-input" value={channel} onChange={e => setChannel(e.target.value as "counter" | "takeaway")}><option value="counter">Tại quầy</option><option value="takeaway">Mang đi</option></select></div>
            <div className="pos-cart-scroll">{customizer}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
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
                        disabled={!items.length || isSubmitting || !!pricingError}
                        onClick={() => setClearOpen(true)}
                    >
                        Xóa giỏ hàng
                    </button>
                </div>

                <div className="px-5 pb-4 divide-y divide-[var(--border)] ">
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
                                    <button type="button" aria-label={`Giảm ${item.name}`} className="btn btn-secondary btn-sm" onClick={() => changeQuantity(item.id,item.quantity-1)}>−</button><span className="text-xs font-bold">{item.quantity}</span><button type="button" aria-label={`Tăng ${item.name}`} className="btn btn-secondary btn-sm" onClick={() => changeQuantity(item.id,item.quantity+1)}>+</button>
                                    <button
                                        type="button"
                                        className="text-[var(--muted)] hover:text-[var(--danger)] p-1"
                                        onClick={() => { try { assertPosCheckoutEditable(context, checkout.current.id); onRemove(item.id); } catch (error) { toast.error(error instanceof Error ? error.message : "Không sửa được giỏ."); } }}
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
                            onChange={(event) => { setPhone(event.target.value); setMemberName(""); setMemberInfo(null); setFlatDiscount(0); setDiscountInput(""); }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey) {
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
                            Nhập SĐT để tích điểm và áp dụng ưu đãi hạng thẻ (Thành viên: -2.000đ, Bạc: -5.000đ, Vàng: -5%, VIP: -10%).
                        </p>
                    )}
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
                            placeholder="Nhập mã; dùng dấu phẩy để nhập nhiều mã"
                            value={voucher}
                            onChange={event => { setVoucher(event.target.value); setPromotionCodes([]); }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey) {
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
{amounts.appliedPromotions.length > 0 && (
    <div className="space-y-1 mb-3 text-xs text-emerald-700">
        {amounts.appliedPromotions.map(promotion => (
            <p key={promotion.campaignId}>
                {promotion.code}: −{formatCurrency(promotion.discountAmount)}
            </p>
        ))}
        {amounts.memberSuppressed && (
            <p>Không cộng dồn giảm hạng thành viên.</p>
        )}
        {amounts.ignoredCodes.length > 0 && (
            <p>Không áp dụng: {amounts.ignoredCodes.join(", ")}.</p>
        )}
    </div>
)}

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

            <label className="form-label p-3">Ghi chú đơn<textarea className="form-input" value={orderNote} onChange={e => setOrderNote(e.target.value)} /></label>
            <div className="card flex flex-wrap gap-2">

                <button type="button" className="btn btn-secondary" onClick={() => { try { setDrafts(listPosDrafts(context)); } catch (error) { toast.error(error instanceof Error ? error.message : "Không đọc được đơn giữ."); } }}>Danh sách đơn giữ</button>
                {drafts.length > 0 && <><select aria-label="Đơn giữ" className="form-input" value={draftId} onChange={e => setDraftId(e.target.value)}><option value="">Chọn đơn giữ</option>{drafts.map(d => <option key={d.id} value={d.id}>{d.createdAt} · {d.items.length} món</option>)}</select><button type="button" className="btn btn-secondary" onClick={restoreSale} disabled={!draftId || items.length > 0}>Khôi phục</button></>}
                {pricingError && <p role="alert">{pricingError}</p>}
            </div>
            </div><div className="pos-cart-footer"><div className="flex justify-between text-sm mb-2"><span>Tạm tính {formatCurrency(subtotal)} · Giảm {formatCurrency(discount)}</span><strong>{formatCurrency(total)}</strong></div>
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
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPaidInput(String(total))}>Đưa đủ · Alt+D</button>
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
                    disabled={!items.length || isSubmitting || !!pricingError}
                    className="group relative w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white text-[15px] font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(34,181,115,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="flex items-center gap-2">
                        Hoàn tất · Ctrl+Enter
                        <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-[14px] font-extrabold backdrop-blur-sm">
                            {formatCurrency(total)}
                        </span>
                    </span>
                </button>
            </div>

<div className="flex gap-2"><button type="button" className="btn btn-secondary" onClick={holdSale} disabled={!items.length || isSubmitting}>Giữ đơn · Alt+H</button><button type="button" className="btn btn-secondary" onClick={() => setClearOpen(true)}>Xóa giỏ</button></div></div>
            <ConfirmDialog
                open={clearOpen}
                title="Xóa toàn bộ giỏ hàng?"
                message="Các món và tùy chọn trong giỏ hàng hiện tại sẽ bị xóa."
                confirmText="Xóa giỏ hàng"
                onCancel={() => setClearOpen(false)}
                onConfirm={() => {
                    try {
                      assertPosCheckoutEditable(context, checkout.current.id);
                      onClear(); setPhone(""); setMemberName(""); setMemberInfo(null); setVoucher(""); setPromotionCodes([]); setDiscountInput(""); setFlatDiscount(0); setPaidInput(""); setOrderNote(""); setChannel("counter");
                      checkout.current = { id: crypto.randomUUID(), fingerprint: "" };
                      setClearOpen(false);
                    } catch (error) { toast.error(error instanceof Error ? error.message : "Không xóa được giỏ."); }
                }}
            />
        </div>
    );
}
