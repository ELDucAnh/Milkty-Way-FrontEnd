import Modal from "../common/Modal";
import { findPosMember } from "../../data/sales/members";
import { checkLogin } from "../../utils/auth";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
    const [panel, setPanel] = useState<"member" | "voucher" | "drafts" | null>(null);
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
    const [drafts, setDrafts] = useState<PosDraft[]>(() => {
        try { return listPosDrafts(context); } catch { return []; }
    });
    const [draftId, setDraftId] = useState("");
    const [draftSearch, setDraftSearch] = useState("");
    useEffect(() => {
        try { setDrafts(listPosDrafts({ staffId, branchId, counterId, shiftId })); }
        catch { setDrafts([]); }
    }, [staffId, branchId, counterId, shiftId]);
    const matchingDrafts = drafts.filter(d => `${d.id} ${d.createdAt} ${d.phone} ${d.memberName} ${d.items.map(item => item.name).join(" ")}`.toLocaleLowerCase("vi-VN").includes(draftSearch.trim().toLocaleLowerCase("vi-VN")));
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
        setPanel(null);
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

        const found = findPosMember(cleanPhone);
        setFlatDiscount(found?.tier.includes("Bạc") ? 5000 : found?.tier.includes("Thành Viên") ? 2000 : 0);
        setDiscountInput(String(found?.discount ?? 0));
        if (found && checkLogin() === "cashier") {
            setMemberName(found.name);
            setMemberInfo(found.name);
            setDiscountInput(String(found.discount));
            toast.success("Đã áp dụng ưu đãi hiện có của khách hàng.");
        } else if (found) {
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
        try { setDrafts(listPosDrafts(context)); } catch { setDrafts([]); }
        setDraftId("");
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
        <div className="pos-cart-header">
          <div><strong>Đơn hiện tại <span className="pos-cup-count">{items.reduce((n, item) => n + item.quantity, 0)} ly</span></strong>
            <div className="pos-cart-context">{branchId} · {counterId} · <select aria-label="Loại đơn" value={channel} onChange={e => setChannel(e.target.value as "counter" | "takeaway")}><option value="counter">Bán trực tiếp tại quầy</option><option value="takeaway">Mang đi</option></select></div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm text-[var(--danger)]" disabled={!items.length || isSubmitting} onClick={() => setClearOpen(true)}>Xóa giỏ</button>
        </div>
        <div className="pos-cart-scroll pos-line-items">{customizer}
          {!items.length && <p className="pos-empty-cart">Chưa có món trong giỏ. Chọn món bên trái để bắt đầu.</p>}
          {items.map(item => <div key={item.id} className="pos-line-item">
            <div className="flex justify-between gap-3"><strong>{item.name}</strong><strong className="whitespace-nowrap">{formatCurrency(item.unitPrice * item.quantity)}</strong></div>
            <p className="pos-line-options">Size {item.size} · {item.sugar} đường · {item.ice}</p>
            {!!item.toppings.length && <p className="pos-line-options">+ {item.toppings.join(", ")}</p>}
            {item.note && <p className="pos-line-options">{item.note}</p>}
            <div className="pos-line-bottom"><span>{formatCurrency(item.unitPrice)} / ly</span><div className="pos-line-controls">
              <div className="pos-quantity-stepper"><button type="button" aria-label={`Giảm ${item.name}`} disabled={item.quantity <= 1} onClick={() => changeQuantity(item.id, item.quantity - 1)}>−</button><strong>{item.quantity}</strong><button type="button" aria-label={`Tăng ${item.name}`} onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button></div>
              <button type="button" className="btn btn-ghost btn-sm pos-remove-item" aria-label={`Xóa ${item.name}`} onClick={() => { try { assertPosCheckoutEditable(context, checkout.current.id); onRemove(item.id); } catch(error) { toast.error(error instanceof Error ? error.message : "Không sửa được giỏ."); } }}>×</button>
            </div></div>
          </div>)}
        </div>
        <div className="pos-cart-extras">
          <button type="button" className="btn btn-secondary" onClick={() => setPanel("member")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg><span>Hội viên{memberInfo ? " ✓" : ""}</span></button>
          <button type="button" className="btn btn-secondary" onClick={() => setPanel("voucher")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z"/><path d="M13 5v14" strokeDasharray="2 2"/></svg><span>Mã giảm giá{promotionCodes.length ? ` (${promotionCodes.length})` : ""}</span></button>
          <button type="button" className="btn btn-secondary" onClick={() => { try { setDrafts(listPosDrafts(context)); setPanel("drafts"); } catch(error) { toast.error(error instanceof Error ? error.message : "Không đọc được đơn giữ."); } }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span>Đơn giữ ({drafts.length})</span></button>
        </div>
        <div className="pos-cart-footer">
          {pricingError && <p role="alert" className="text-sm text-[var(--danger)]">{pricingError}</p>}
          <div className="pos-summary-lines"><div><span>Tạm tính</span><span>{formatCurrency(subtotal)}</span></div><div className="text-[var(--primary)]"><span>Ưu đãi / giảm giá</span><span>−{formatCurrency(discount)}</span></div><div><span>VAT ({taxInput || 0}%)</span><span>{formatCurrency(tax)}</span></div></div>
          <div className="pos-total-line"><strong>Tổng thanh toán</strong><strong>{formatCurrency(total)}</strong></div>
          <div className="pos-payment-tabs">{[["cash", "Tiền mặt"], ["transfer", "Chuyển khoản"], ["card", "Thẻ ngân hàng"]].map(([value,label]) => <button key={value} type="button" aria-pressed={paymentMethod === value} className={`btn ${paymentMethod === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setPaymentMethod(value)}>{label}</button>)}</div>
          {paymentMethod === "cash" && <>
            <div className="pos-cash-row"><label className="form-label" htmlFor="pos-paid-amount">Tiền khách đưa<input id="pos-paid-amount" type="number" min="0" step="1000" className="form-input" placeholder="Nhập số tiền" value={paidInput} onChange={e => setPaidInput(e.target.value)} /></label><div><span>Tiền trả lại</span><output id="pos-change">{formatCurrency(change)}</output></div></div>
            <div className="pos-quick-cash"><button type="button" className="btn btn-secondary" onClick={() => setPaidInput(String(total))}>Đưa đủ</button>{[50000,100000,200000,500000].map(amount => <button type="button" key={amount} className="btn btn-secondary" onClick={() => setPaidInput(String(amount))}>{amount.toLocaleString("vi-VN")}</button>)}</div>
          </>}
          <div className="pos-checkout-actions"><button type="button" className="btn btn-secondary" disabled={!items.length || isSubmitting} onClick={holdSale}><strong>Giữ đơn</strong></button><button id="pos-complete-btn" type="button" className="btn btn-primary" onClick={completeSale} disabled={!items.length || isSubmitting || !!pricingError}><strong>{isSubmitting ? "Đang lưu…" : "Thanh toán"}</strong><span aria-hidden="true">→</span></button></div>
        </div>
        <Modal open={panel === "member"} onClose={() => setPanel(null)} title="Hội viên">                <div className="px-5 py-4 border-b border-[var(--border)]">
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

</Modal>
        <Modal open={panel === "voucher"} onClose={() => setPanel(null)} title="Ưu đãi và ghi chú">                <div className="mb-4">
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

<label className="form-label">Ghi chú đơn<textarea className="form-input" value={orderNote} onChange={e => setOrderNote(e.target.value)} /></label></Modal>
        <Modal open={panel === "drafts"} onClose={() => setPanel(null)} title="Đơn đang giữ">
          <div className="space-y-3"><label className="form-label" htmlFor="pos-draft-search">Tìm đơn giữ</label><input id="pos-draft-search" type="search" className="form-input" placeholder="Tìm mã đơn, tên khách, SĐT hoặc tên món…" value={draftSearch} onChange={e => { setDraftSearch(e.target.value); setDraftId(""); }} />
          <div className="pos-draft-results">{matchingDrafts.length ? matchingDrafts.map(d => <label key={d.id} className="pos-draft-option"><input type="radio" name="pos-held-order" checked={draftId === d.id} onChange={() => setDraftId(d.id)} /><span><strong>{d.memberName || "Khách lẻ"} · {d.items.reduce((sum,item) => sum + item.quantity, 0)} ly</strong><small>{new Date(d.createdAt).toLocaleString("vi-VN")} · {d.phone || "Không có SĐT"}</small><small>{d.items.map(item => item.name).join(", ")}</small></span></label>) : <p className="text-sm text-[var(--muted)]">{drafts.length ? "Không tìm thấy đơn phù hợp." : "Chưa có đơn giữ tại quầy."}</p>}</div>
          <button type="button" className="btn btn-primary" onClick={restoreSale} disabled={!draftId || items.length > 0}>Khôi phục</button><p className="text-sm text-[var(--muted)]">Giữ hoặc xóa giỏ hiện tại trước khi khôi phục đơn.</p></div>
        </Modal>
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
