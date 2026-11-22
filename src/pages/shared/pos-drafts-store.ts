import { quotePromotionCheckout } from "./promotions-store";
import { assertPosCheckoutEditable, assertPosContext, type PosCheckoutContext, loadOrders } from "./sales-orders-store";
import { validatePosItems, parsePercentage, type PosLine } from "./sales-pricing";

export interface PosDraft extends PosCheckoutContext {
  version: 1; id: string; checkoutId: string; createdAt: string;
  items: PosLine[];
  promotionCodes?: string[];
  flatDiscount?: number;
  channel?: "counter" | "takeaway";
  orderNote?: string;
  phone: string; memberName: string; memberInfo: string | null;
  voucher: string; discountInput: string; taxInput: string; paidInput: string; paymentMethod: string;
}
export const POS_DRAFTS_KEY = "milktyway.pos.drafts.v1";
function readDrafts(): PosDraft[] {
  const raw = localStorage.getItem(POS_DRAFTS_KEY);
  const value = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(value) || value.some(d => !d || d.version !== 1 || !Array.isArray(d.items) || ["id", "checkoutId", "createdAt", "staffId", "branchId", "counterId", "shiftId", "phone", "memberName", "voucher", "discountInput", "taxInput", "paidInput", "paymentMethod"].some(k => typeof d[k] !== "string") || !(d.memberInfo === null || typeof d.memberInfo === "string")) || new Set(value.map(d => d.id)).size !== value.length) throw new Error("Dữ liệu đơn giữ không hợp lệ. Không ghi đè dữ liệu.");
  return value;
}
function sameScope(draft: PosDraft, context: PosCheckoutContext) {
  return draft.staffId === context.staffId && draft.branchId === context.branchId && draft.counterId === context.counterId;
}
export function listPosDrafts(context: PosCheckoutContext): PosDraft[] {
  assertPosContext(context, false);
  const completed = new Set(loadOrders().map(order => order.checkoutId));
  return readDrafts().filter(d => sameScope(d, context) && !completed.has(d.checkoutId));
}
function validateDraftPromotions(draft: PosDraft, items: PosLine[]): void {
  if (
    draft.promotionCodes !== undefined &&
    (
      !Array.isArray(draft.promotionCodes) ||
      draft.promotionCodes.some(code => typeof code !== "string")
    )
  ) throw new Error("Danh sách mã khuyến mãi của đơn giữ không hợp lệ.");

  quotePromotionCheckout({
    items,
    branchId: draft.branchId,
    channel: draft.channel ?? "counter",
    discountRate: parsePercentage(draft.discountInput) ?? 0,
    flatDiscount: draft.flatDiscount ?? 0,
    taxRate: parsePercentage(draft.taxInput) ?? 0,
    customerPhone: draft.phone,
    promotionCodes: draft.promotionCodes ?? [],
  });
}

export function savePosDraft(draft: PosDraft): void {
  assertPosCheckoutEditable(draft, draft.checkoutId);
  if (!Number.isSafeInteger(draft.flatDiscount ?? 0) || (draft.flatDiscount ?? 0) < 0) throw new Error("Giảm tiền cố định không hợp lệ.");
  const items = validatePosItems(draft.items);
  validateDraftPromotions(draft, items);

  if (parsePercentage(draft.discountInput) === null || parsePercentage(draft.taxInput) === null || !["cash", "transfer", "card"].includes(draft.paymentMethod)) throw new Error("Thông tin thanh toán đơn giữ không hợp lệ.");
  const drafts = readDrafts();
  if (drafts.some(d => d.id === draft.id && !sameScope(d, draft))) throw new Error("Đơn giữ không thuộc phiên này.");
  localStorage.setItem(POS_DRAFTS_KEY, JSON.stringify([{ ...draft, items }, ...drafts.filter(d => d.id !== draft.id)]));
}
export function restorePosDraft(id: string, context: PosCheckoutContext): PosDraft {
  assertPosCheckoutEditable(context);
  const draft = listPosDrafts(context).find(d => d.id === id);
  if (!draft || draft.shiftId !== context.shiftId) throw new Error("Đơn giữ không thuộc nhân viên/quầy/ca hiện tại.");
  assertPosCheckoutEditable(context, draft.checkoutId);
  if (!Number.isSafeInteger(draft.flatDiscount ?? 0) || (draft.flatDiscount ?? 0) < 0) throw new Error("Giảm tiền cố định không hợp lệ.");
  const items = validatePosItems(draft.items);

  /*
   * Đơn giữ không giữ chỗ ngân sách/lượt.
   * Khôi phục kiểm tra món/giá; bỏ trạng thái áp mã cũ để thu ngân
   * xác nhận lại theo giới hạn đang còn hiệu lực.
   */
  return {
    ...draft,
    items,
    promotionCodes: [],
  };
}
