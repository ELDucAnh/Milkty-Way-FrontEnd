import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/format";
import type { OrderReturnAmendment } from "../shared/sales-returns-store";

interface Props {
  amendments?: OrderReturnAmendment[];
  refundedAmount?: number;
  netTotal?: number;
  parentOrderId?: string;
  replacedByOrderId?: string;
}

function orderLink(id: string) {
  return `/invoices/invoice-details?orderId=${encodeURIComponent(id)}`;
}

export default function OrderReturnHistory({
  amendments = [],
  refundedAmount = 0,
  netTotal,
  parentOrderId,
  replacedByOrderId,
}: Props) {
  if (
    !amendments.length &&
    !parentOrderId &&
    !replacedByOrderId &&
    !refundedAmount
  ) return null;

  return (
    <section className="border-t border-[var(--border)] pt-4 mb-6 space-y-3">
      <h2 className="font-bold">Lịch sử điều chỉnh / Đổi trả</h2>

      {parentOrderId && (
        <p className="text-sm">
          Đơn thay thế từ{" "}
          <Link className="text-[var(--primary)] underline" to={orderLink(parentOrderId)}>
            {parentOrderId}
          </Link>.
          {" "}Giá trị chuyển tiếp, không phải khoản thu mới.
        </p>
      )}

      {replacedByOrderId && (
        <p className="text-sm">
          Giá trị còn lại đã chuyển sang{" "}
          <Link className="text-[var(--primary)] underline" to={orderLink(replacedByOrderId)}>
            {replacedByOrderId}
          </Link>.
        </p>
      )}

      <div className="text-sm">
        Đã hoàn thực tế: <strong>{formatCurrency(refundedAmount)}</strong>
        {netTotal !== undefined && (
          <>
            {" · "}Giá trị thực thu còn ghi nhận trên đơn này:{" "}
            <strong>{formatCurrency(netTotal)}</strong>
          </>
        )}
      </div>

      {amendments.map(entry => (
        <article
          key={entry.id}
          className="rounded-lg border border-[var(--border)] p-3 text-sm space-y-2"
        >
          <div className="font-semibold">
            {entry.returnCode}
            {" · "}{entry.resolutionType === "refund" ? "Hoàn tiền" : "Đổi món"}
            {" · "}{entry.recordMode === "amend-original" ? "Sửa đơn gốc" : "Tạo đơn thay thế"}
          </div>

          <p className="text-xs text-[var(--muted)]">
            {entry.actor} · {new Date(entry.createdAt).toLocaleString("vi-VN")}
          </p>

          <ul className="space-y-1">
            {entry.affectedLines.map((line, index) => (
              <li key={`${line.itemId}-${index}`}>
                {line.itemName} × {line.quantity}
                {line.replacementName && (
                  <> → {line.replacementName}</>
                )}
              </li>
            ))}
          </ul>

          <p>
            Hoàn khách: <strong>{formatCurrency(entry.autoRefundCustomerAmount)}</strong>
            {" · "}Thu thêm: <strong>{formatCurrency(entry.additionalPaymentAmount)}</strong>
          </p>

          <p>
            Chi phí làm lại:{" "}
            {entry.internalRemakeCost === null
              ? "Chưa có định mức chi phí"
              : formatCurrency(entry.internalRemakeCost)}
          </p>

          <p>
            Thực thu trước / sau: {formatCurrency(entry.previousOrderTotal)}
            {" → "}{formatCurrency(entry.newOrderNetTotal)}
          </p>

          {entry.newCreatedOrderId && (
            <Link
              className="text-[var(--primary)] underline"
              to={orderLink(entry.newCreatedOrderId)}
            >
              Xem {entry.newCreatedOrderId}
            </Link>
          )}

          {entry.note && <p>{entry.note}</p>}
        </article>
      ))}
    </section>
  );
}
