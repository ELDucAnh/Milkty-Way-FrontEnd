import { useId, useMemo, useState } from "react";
import { products, isPosProductAvailable } from "../../data/sales/products";
import { currentStaff, scopedBranch } from "../../utils/auth";
import { formatCurrency } from "../../utils/format";
import { useToast } from "../../components/common/useToast";
import {
  loadInvoices,
  loadOrders,
} from "../shared/sales-orders-store";
import type { SalesOrder } from "../shared/sales-orders-store";
import {
  createReturnRequest,
  isComplaintResolution,
  type ComplaintResolution,
  getReturnCostPreview,
  remainingReturnQuantity,
} from "../shared/sales-returns-store";
import type {
  ReturnCostPreview,
  ReturnScope,
  ReturnSelection,
} from "../shared/sales-returns-store";

export function ReturnOrderSearch({
  onSelect,
}: {
  onSelect: (order: SalesOrder, scope: ReturnScope) => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");

  const result = (() => {
    const text = query.trim().toLocaleLowerCase("vi-VN");
    if (!text) return { orders: [] as SalesOrder[], error: "" };

    try {
      const branch = scopedBranch();
      const staff = currentStaff();
      if (!staff?.loginRole || staff.loginRole === "warehouse") {
        return { orders: [] as SalesOrder[], error: "Không có quyền tra cứu." };
      }

      const invoices = loadInvoices();
      const phoneText = text.replace(/\D/g, "");

      const orders = loadOrders().filter(order => {
        if (branch && order.branchId !== branch) return false;

        const normalMatch =
          `${order.id} ${order.customer}`.toLocaleLowerCase("vi-VN").includes(text);
        const phoneMatch =
          phoneText.length >= 3 &&
          order.phone.replace(/\D/g, "").includes(phoneText);
        const invoiceMatch = invoices.some(invoice =>
          invoice.orderId === order.id &&
          invoice.id.toLocaleLowerCase("vi-VN").includes(text),
        );

        return normalMatch || phoneMatch || invoiceMatch;
      }).slice(0, 8);

      return { orders, error: "" };
    } catch (error) {
      return {
        orders: [] as SalesOrder[],
        error: error instanceof Error ? error.message : "Không đọc được đơn hàng.",
      };
    }
  })();

  const mayCreate = currentStaff()?.loginRole === "cashier";

  return (
    <div className="space-y-3">
      <label className="form-label" htmlFor={searchId}>
        Tìm đơn hàng để tạo yêu cầu mới
      </label>

      <input
        id={searchId}
        type="search"
        className="form-input w-full"
        placeholder="Nhập mã đơn DH-..., mã hóa đơn hoặc SĐT khách hàng..."
        value={query}
        onChange={event => setQuery(event.target.value)}
      />

      {result.error && <p role="alert" className="text-sm text-red-600">{result.error}</p>}

      {query.trim() && !result.error && result.orders.length === 0 && (
        <p className="text-sm text-[var(--muted)]">Không tìm thấy đơn trong phạm vi được phép.</p>
      )}

      {result.orders.map(order => {
        const eligible =
          !order.replacedByOrderId &&
          (order.payment === "paid" || order.payment === "partially-refunded");

        return (
          <div key={order.id} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
            <div className="font-semibold">
              {order.id} · {order.branchId} · {order.customer} · {order.phone}
            </div>

            <div className="text-xs text-[var(--muted)]">
              {new Date(order.createdAt).toLocaleString("vi-VN")}
              {" · "}Tổng gốc: {formatCurrency(order.total)}
              {" · "}Thực thu: {formatCurrency(order.netTotal ?? order.total)}
            </div>

            <ul className="text-sm space-y-1">
              {order.items.map(item => (
                <li key={item.id}>
                  {item.name} · {item.size} · Đường {item.sugar} · {item.ice}
                  {" · "}{item.quantity} ly
                  {!!item.returnedQty && ` · Đã xử lý ${item.returnedQty}`}
                </li>
              ))}
            </ul>

            {order.replacedByOrderId && (
              <p className="text-sm text-amber-700">Đã chuyển sang {order.replacedByOrderId}.</p>
            )}

            {mayCreate && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!eligible}
                  onClick={() => onSelect(order, "single-item")}
                >
                  Chọn đơn hàng này
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReturnCostBox({ preview }: { preview: ReturnCostPreview }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <span>Giá niêm yết món đã chọn</span>
        <strong>{formatCurrency(preview.returnedOriginalValue)}</strong>
      </div>

      <div className="flex justify-between gap-3">
        <span>Khuyến mãi phân bổ từ đơn gốc</span>
        <strong>−{formatCurrency(preview.allocatedDiscountAmount)}</strong>
      </div>

      <div className="flex justify-between gap-3">
        <span>VAT đã thanh toán phân bổ</span>
        <strong>{formatCurrency(preview.allocatedTaxAmount)}</strong>
      </div>

      <div className="flex justify-between gap-3">
        <span>Giá trị món thay thế, gồm VAT</span>
        <strong>{formatCurrency(preview.replacementValue)}</strong>
      </div>

      <label className="form-label">
        SỐ TIỀN HOÀN TRẢ KHÁCH — Tự động, không nhập tay
      </label>
      <input
        className="form-input font-bold text-red-600"
        aria-label="Số tiền hoàn tự động"
        readOnly
        value={formatCurrency(preview.autoRefundAmount)}
      />

      <p className="text-xs text-[var(--muted)]">
        Đã tính tự động theo giá đã thanh toán và phân bổ hóa đơn gốc.
      </p>

      {preview.additionalPaymentAmount > 0 && (
        <p className="font-semibold text-amber-700">
          Khách bù thêm: {formatCurrency(preview.additionalPaymentAmount)}
        </p>
      )}

      {currentStaff()?.loginRole !== "cashier" && <div className="flex justify-between gap-3">
        <span>Chi phí nguyên liệu làm lại nội bộ</span>
        <strong>
          {preview.internalRemakeCost === null
            ? "Chưa có định mức chi phí"
            : formatCurrency(preview.internalRemakeCost)}
        </strong>
      </div>}

      <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2">
        <span>Thực thu trước / sau điều chỉnh</span>
        <strong>
          {formatCurrency(preview.previousOrderTotal)}
          {" → "}
          {formatCurrency(preview.newOrderNetTotal)}
        </strong>
      </div>
    </div>
  );
}

export default function SalesReturnForm({
  initialOrderId,
  initialScope,
  onCreated,
}: {
  initialOrderId?: string;
  initialScope: ReturnScope;
  onCreated: () => void;
}) {
  const toast = useToast();
  const actorStaffId = currentStaff()?.staffId ?? "";
  const [orderId, setOrderId] = useState(initialOrderId ?? "");
  const [scope, setScope] = useState<ReturnScope>(initialScope);
  const [resolutionType, setResolutionType] =
    useState<ReturnSelection["resolutionType"] | ComplaintResolution | null>(null);
  const [recordMode, setRecordMode] =
    useState<ReturnSelection["recordMode"]>("amend-original");
  const [lines, setLines] = useState<ReturnSelection["selectedLines"]>([]);
  const [reason, setReason] = useState("Sai mức đường / đá");
  const [busy, setBusy] = useState(false);

  const source = (() => {
    try {
      const branch = scopedBranch();
      const order = loadOrders().find(value =>
        value.id === orderId && (!branch || value.branchId === branch),
      );
      return { order, error: "" };
    } catch (error) {
      return {
        order: undefined,
        error: error instanceof Error ? error.message : "Không đọc được đơn.",
      };
    }
  })();

  const order = source.order;

  const selectionResult = useMemo(() => {
    try {
      if (!resolutionType || isComplaintResolution(resolutionType)) return { selection: null, preview: null, error: "" };
      const selectedLines = scope === "full-order" && order
        ? order.items.flatMap(item => {
            const count = remainingReturnQuantity(item);
            if (!count) return [];
            return [{
              itemId: item.id,
              quantity: count,
              replacementSku: lines.find(line => line.itemId === item.id)?.replacementSku,
            }];
          })
        : lines;

      const selection: ReturnSelection = {
        scope,
        resolutionType,
        recordMode,
        selectedLines,
      };

      return {
        selection,
        preview: order ? getReturnCostPreview(order, selection) : null,
        error: "",
      };
    } catch (error) {
      return {
        selection: null,
        preview: null,
        error: error instanceof Error ? error.message : "Không tính được tiền.",
      };
    }
  }, [scope, resolutionType, recordMode, lines, order]);

  function updateLine(
    itemId: string,
    patch: { quantity?: number; replacementSku?: string },
  ) {
    setLines(current => {
      const previous = current.find(line => line.itemId === itemId);
      return [
        ...current.filter(line => line.itemId !== itemId),
        { itemId, quantity: previous?.quantity ?? 1, ...previous, ...patch },
      ];
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !order || !resolutionType) return;

    setBusy(true);
    try {
      const common = { actorStaffId, orderId, reason };
      let request;
      if (isComplaintResolution(resolutionType)) {
        request = await createReturnRequest({ ...common, complaint: resolutionType });
      } else {
        if (!selectionResult.selection || !selectionResult.preview) return;
        request = await createReturnRequest({
          ...common, selection: selectionResult.selection, expectedPreview: selectionResult.preview,
        });
      }
      toast.success(`Đã tạo ${request.id}. Đang chờ quản lý duyệt.`);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được phiếu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!order && <ReturnOrderSearch onSelect={(value, nextScope) => {
        setOrderId(value.id);
        setScope(nextScope);
        setResolutionType(null);
        setLines([]);
      }} />}

      {source.error && <p role="alert" className="text-red-600">{source.error}</p>}

      {order && (
        <>
          <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>Đơn đã chọn: {order.id}</strong>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                onClick={() => {
                  setOrderId("");
                  setResolutionType(null);
                  setLines([]);
                  setScope(initialScope);
                  setRecordMode("amend-original");
                }}>Chọn đơn khác</button>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {order.branchId} · {order.customer} · {order.phone}
            </p>
            <p className="text-sm">
              Tổng gốc: {formatCurrency(order.total)} · Thực thu: {formatCurrency(order.netTotal ?? order.total)}
            </p>
            <ul className="text-sm space-y-1">
              {order.items.map(item => <li key={item.id}>
                {item.quantity} × {item.name} · {item.size} · Đường {item.sugar} · {item.ice}
              </li>)}
            </ul>
          </div>

          <fieldset className="space-y-2" disabled={busy}>
            <legend className="form-label">Chọn hướng xử lý</legend>
            <div className="flex flex-wrap gap-3">
              {([{ value: "exchange", label: "Đổi trả / đổi món" }, { value: "refund", label: "Hoàn tiền" }] as const).map(option => (
                <button key={option.value} type="button"
                  className={`btn ${resolutionType === option.value ? "btn-primary" : "btn-secondary"}`}
                  aria-pressed={resolutionType === option.value}
                  onClick={() => { setResolutionType(option.value); setLines([]); }}>
                  {option.label}
                </button>
              ))}
            </div>
            <details>
              <summary className="text-sm text-[var(--muted)] cursor-pointer">Hướng xử lý khác</summary>
              <div className="flex flex-wrap gap-2 mt-2">
                {(["Bù voucher", "Hủy trước pha"] as const).map(value => (
                  <button key={value} type="button"
                    className={`btn btn-sm ${resolutionType === value ? "btn-primary" : "btn-secondary"}`}
                    aria-pressed={resolutionType === value}
                    onClick={() => { setResolutionType(value); setLines([]); }}>{value}</button>
                ))}
              </div>
            </details>
          </fieldset>

          {resolutionType && !isComplaintResolution(resolutionType) && <>
          <fieldset className="space-y-2">
            <legend className="form-label">Phạm vi xử lý</legend>
            <label className="flex gap-2">
              <input
                type="radio"
                name="return-scope"
                checked={scope === "single-item"}
                onChange={() => setScope("single-item")}
              />
              Đổi / Hoàn một hoặc vài món
            </label>
            <label className="flex gap-2">
              <input
                type="radio"
                name="return-scope"
                checked={scope === "full-order"}
                onChange={() => setScope("full-order")}
              />
              Đổi / Hoàn toàn bộ số ly còn được xử lý
            </label>
          </fieldset>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chọn</th>
                  <th>Món / tùy chọn</th>
                  <th>Đơn giá gốc</th>
                  <th>Số ly lỗi</th>
                  {resolutionType === "exchange" && <th>Món thay thế</th>}
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => {
                  const remaining = item.quantity - (item.returnedQty ?? 0);
                  const line = lines.find(value => value.itemId === item.id);
                  const checked = remaining > 0 && (scope === "full-order" || !!line);

                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${item.name}`}
                          checked={checked}
                          disabled={scope === "full-order" || remaining <= 0}
                          onChange={event => {
                            if (event.target.checked) updateLine(item.id, { quantity: 1 });
                            else setLines(current => current.filter(value => value.itemId !== item.id));
                          }}
                        />
                      </td>

                      <td>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {item.size} · Đường {item.sugar} · {item.ice}
                          {item.toppings.length > 0 && ` · ${item.toppings.join(", ")}`}
                        </div>
                        <div className="text-xs">
                          Đã xử lý {item.returnedQty ?? 0}/{item.quantity} · Còn {remaining}
                        </div>
                        {item.note && <div className="text-xs">{item.note}</div>}
                      </td>

                      <td>{formatCurrency(item.unitPrice)}</td>

                      <td>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, remaining)}
                          step={1}
                          aria-label={`Số ly lỗi ${item.name}`}
                          className="form-input min-w-[80px]"
                          disabled={!checked || scope === "full-order"}
                          value={scope === "full-order" ? remaining : line?.quantity ?? 1}
                          onChange={event =>
                            updateLine(item.id, { quantity: Number(event.target.value) })
                          }
                        />
                      </td>

                      {resolutionType === "exchange" && (
                        <td>
                          <select
                            className="form-input form-select min-w-[180px]"
                            aria-label={`Món thay thế cho ${item.name}`}
                            disabled={!checked}
                            value={line?.replacementSku ?? ""}
                            onChange={event =>
                              updateLine(item.id, { replacementSku: event.target.value || undefined })
                            }
                          >
                            <option value="">Làm lại đúng món và tùy chọn cũ</option>
                            {products.filter(product =>
                              isPosProductAvailable(product, order.branchId),
                            ).map(product => (
                              <option key={product.sku} value={product.sku}>
                                {product.name} · M, không topping · {formatCurrency(product.price)}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {resolutionType === "exchange" && (
            <p className="text-xs text-[var(--muted)]">
              Làm lại đúng món giữ giá đã thanh toán. SKU khác dùng size M, không topping,
              giữ mức đường/đá; giá mới chưa gồm VAT hiển thị ở danh mục.
            </p>
          )}

          {selectionResult.error && (
            <p role="alert" className="text-sm text-amber-700">{selectionResult.error}</p>
          )}

          {selectionResult.preview && <ReturnCostBox preview={selectionResult.preview} />}

          <fieldset className="space-y-2">
            <legend className="form-label">Ghi nhận sau khi được duyệt</legend>
            <label className="flex gap-2">
              <input
                type="radio"
                name="return-record-mode"
                checked={recordMode === "amend-original"}
                onChange={() => setRecordMode("amend-original")}
              />
              <span>Ghi trực tiếp vào đơn và hóa đơn gốc — <strong>Ưu tiên</strong></span>
            </label>
            <label className="flex gap-2">
              <input
                type="radio"
                name="return-record-mode"
                checked={recordMode === "new-order"}
                onChange={() => setRecordMode("new-order")}
              />
              Ghi thành đơn mới liên kết với đơn gốc
            </label>
          </fieldset>
          </>}
        </>
      )}

      {order && resolutionType && <>
      <label className="block">
        <span className="form-label">Lý do / ghi chú chi tiết</span>
        <textarea
          className="form-input form-textarea"
          rows={3}
          required
          value={reason}
          onChange={event => setReason(event.target.value)}
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !order || (!isComplaintResolution(resolutionType) && !selectionResult.preview)}
        >
          {busy ? "Đang gửi..." : "Gửi yêu cầu duyệt"}
        </button>
      </div>
      </>}
    </form>
  );
}
