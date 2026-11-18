import { useState }from "react";
import type { SalesOrderItem } from "../shared/sales-orders-store";
import {
  buildPreparationRecipe,
  getPreparationCup,
  type KdsOrder,
  type PreparationGroup,
} from "../shared/sales-preparation";

export interface PreparationSelection {
  orderId: string;
  groupKey: string;
  quantity: number;
  cupLabel?: string;
}

function formatAmount(value: number): string {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

function PreparationOptions({ item }: { item: SalesOrderItem }) {
  return (
    <div className="text-xs text-[var(--muted)]">
      Size {item.size} · Đường {item.sugar} · {item.ice}
      {item.toppings.length > 0 && (
        <div>Topping: {item.toppings.join(", ")}</div>
      )}
      {item.note && (
        <div className="mt-1 whitespace-pre-wrap text-[var(--text)]">
          <strong className="text-[var(--danger)]">Ghi chú:</strong> {item.note}
        </div>
      )}
    </div>
  );
}

function PreparationCupList({
  orderId,
  group,
  onSelect,
}: {
  orderId: string;
  group: PreparationGroup;
  onSelect: (selection: PreparationSelection) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(group.quantity / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const count = Math.max(0, Math.min(pageSize, group.quantity - start));

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-2">
      <p className="text-xs text-[var(--muted)]">
          Xem tùy chọn và công thức cho từng ly.
      </p>

      <div className="kds-cup-grid">{Array.from({ length: count }, (_, offset) => {
        const index = start + offset;
        const cup = getPreparationCup(group, index);
        if (!cup) return null;
        const cupLabel = `Ly ${index + 1}/${group.quantity} · Dòng ${cup.sourceIndex + 1} · Ly ${cup.cupNumber} của dòng`;
        return <button key={`${cup.sourceIndex}-${cup.cupNumber}`} type="button" className="btn btn-secondary kds-cup-card" onClick={() => onSelect({orderId, groupKey:group.key, quantity:1, cupLabel})}>
          <strong>Ly {index + 1}/{group.quantity}</strong>
          <small>Dòng {cup.sourceIndex + 1} · Ly {cup.cupNumber} của dòng</small>
          <small>{cup.item.size} · {cup.item.sugar} đường · {cup.item.ice}</small>
          <small>Công thức 1 ly</small>
        </button>;
      })}</div>

      {pageCount > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Trước
          </button>
          <span>
            Trang {currentPage + 1}/{pageCount}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

export function PreparationGroupedItems({
    order,
    onSelect,
    compact = false,
}: {
    order: KdsOrder;
    onSelect: (selection: PreparationSelection) => void;
    compact?: boolean;
}) {
    const totalQuantity = order.groups.reduce(
        (total, group) => total + group.quantity,
        0,
    );

    let previousQuantity = 0;

    return (
        <div className="min-w-0 space-y-3">
            {order.orderNote && (
                <div className="whitespace-pre-wrap text-xs text-[var(--text)]">
                    <strong className="text-[var(--danger)]">Ghi chú toàn đơn:</strong> {order.orderNote}
                </div>
            )}

            {order.groups.length === 0 && (
                <p className="text-xs text-[var(--muted)]">
                    Không có nhóm ly để hiển thị.
                </p>
            )}

            {order.groups.map(group => {
                const firstCup = previousQuantity + 1;
                previousQuantity += group.quantity;
                const lastCup = previousQuantity;

                return (
                    <div
                        key={group.key}
                        className={
                            compact
                                ? "min-w-0 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
                                : "min-w-0 rounded-lg border border-[var(--border)] p-3"
                        }
                    >
                        <div className="flex items-start gap-2.5">
                            {compact && (
                                <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs font-semibold">
                                    {group.quantity}
                                </span>
                            )}

                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="break-words text-sm font-semibold">
                                    {!compact && `${group.quantity} × `}
                                    {group.item.name}

                                    {!compact && (
                                        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                                            [Ly {firstCup}
                                            {group.quantity > 1 &&
                                                `–${lastCup}`}
                                            /{totalQuantity}]
                                        </span>
                                    )}
                                </div>

                                {!compact && (
                                    <div className="text-xs text-[var(--muted)]">
                                        SKU: {group.sku ?? "Chưa có mapping"}
                                        {" · "}
                                        {group.sources.length} dòng gốc
                                    </div>
                                )}

                                <PreparationOptions item={group.item} />

                                {group.mappingError && (
                                    <p className="text-xs text-amber-700">
                                        {group.mappingError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                className="btn btn-secondary btn-sm shrink-0"
                                aria-label={`Công thức ${group.item.name}`}
                                title={`Công thức ${group.item.name}`}
                                onClick={() =>
                                    onSelect({
                                        orderId: order.id,
                                        groupKey: group.key,
                                        quantity: group.quantity,
                                    })
                                }
                            >
                                {compact ? (
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M12 5v16" />
                                        <path d="M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2V4Z" />
                                    </svg>
                                ) : (
                                    "Công thức"
                                )}
                            </button>
                        </div>

                        {!compact && (
                            <details className="mt-3 border-t border-[var(--border)] pt-2">
                                <summary className="cursor-pointer text-xs font-medium text-[var(--primary-dark)]">
                                    Tách xem từng ly ({group.quantity})
                                </summary>

                                <PreparationCupList
                                    orderId={order.id}
                                    group={group}
                                    onSelect={onSelect}
                                />
                            </details>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function PreparationRecipePanel({
    order,
    group,
    selection,
    onQuantityChange,
    onClose,
    embedded = false,
}: {
    order: KdsOrder | null;
    group: PreparationGroup | null;
    selection: PreparationSelection | null;
    onQuantityChange: (quantity: number) => void;
    onClose: () => void;
    embedded?: boolean;
}) {

  if (!order || !group || !selection) {
    return (
      <aside
        className="card min-w-0 self-start xl:sticky xl:top-4"
        aria-label="Công thức pha chế"
      >
        <h2 className="card-title">Công thức pha chế</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Chọn Công thức tại một nhóm món hoặc từng ly trong hàng đợi.
        </p>
      </aside>
    );
  }

  const recipe = buildPreparationRecipe(group.item, selection.quantity);

  return (
    <aside
      className={embedded ? "min-w-0 space-y-4" : "card min-w-0 self-start space-y-4 xl:sticky xl:top-4"}
      aria-labelledby="kds-recipe-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="kds-recipe-title" className="card-title">
            Công thức pha chế
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {order.id} · {order.branchId} · {group.sku ?? "Thiếu SKU"}
          </p>
        </div>
        {!embedded && <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
        >
          Đóng
        </button>}
      </div>

      <div>
        <h3 className="font-semibold">{group.item.name}</h3>
        <PreparationOptions item={group.item} />
        {selection.cupLabel && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {selection.cupLabel}
          </p>
        )}
        {order.orderNote && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text)]">
            <strong className="text-[var(--danger)]">Ghi chú toàn đơn:</strong> {order.orderNote}
          </p>
        )}
      </div>

      <details className="kds-recipe-rules text-xs text-[var(--muted)]"><summary className="cursor-pointer">Quy tắc định lượng demo</summary>
        <strong>Công thức mô phỏng.</strong> Dùng cho bản demo, chưa phải
        định mức được duyệt để pha chế thực tế.
        <div className="mt-1">
          Chuẩn M, đường 100%, đá bình thường. Size L ×1,25; đường theo %;
          không đá ×0, ít đá ×0,5, vừa/bình thường ×1.
        </div>
        <div className="mt-1">
          Topping là định mức mock cho một phần/ly, không tăng theo size.
          Hãy đọc thêm ghi chú riêng của khách trước khi pha.
        </div>
      </details>

      {!embedded && <div>
        <label className="form-label" htmlFor="kds-recipe-quantity">
          Số ly cần đong — tối đa {group.quantity}
        </label>
        <input
          id="kds-recipe-quantity"
          className="form-input"
          type="number"
          min={1}
          max={group.quantity}
          step={1}
          value={selection.quantity}
          onChange={event => {
            const quantity = Number(event.target.value);
            if (
              Number.isSafeInteger(quantity) &&
              quantity >= 1 &&
              quantity <= group.quantity
            ) {
              onQuantityChange(quantity);
            }
          }}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Thay đổi số ly để xem lượng nguyên liệu tương ứng.
        </p>
      </div>}

      {recipe.errors.length > 0 && (
        <div role="status" className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Chưa đủ dữ liệu công thức</strong>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {recipe.errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {recipe.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="data-table kds-recipe-table">
            <caption className="pb-2 text-left font-semibold">
              Định mức nguyên liệu F0/F1
            </caption>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-2">Nguyên liệu</th>
                <th className="py-2 pr-2">Loại</th>
                <th className="py-2 pr-2 text-right">Chuẩn M/ly</th>
                <th className="py-2 text-right">
                  Cần đong {selection.quantity} ly
                </th>
              </tr>
            </thead>
            <tbody>
              {recipe.rows.map((row, index) => (
                <tr
                  key={`${row.source}-${index}`}
                  className="border-b border-[var(--border)]"
                >
                  <td className="py-2 pr-2">
                    {row.name}
                    {row.source === "topping" && (
                      <span className="block text-[var(--muted)]">
                        Topping mock
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2">{row.tier}</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right">
                    {formatAmount(row.baseAmount)} {row.unit}
                  </td>
                  <td className="whitespace-nowrap py-2 text-right font-semibold text-emerald-700">
                    {formatAmount(row.previewAmount)} {row.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recipe.steps.length > 0 && (
        <section aria-labelledby="kds-preparation-steps">
          <h3 id="kds-preparation-steps" className="font-semibold">
            Các bước pha
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
            {recipe.steps.map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
