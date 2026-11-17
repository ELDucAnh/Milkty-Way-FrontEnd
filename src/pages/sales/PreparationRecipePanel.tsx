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
        <div className="mt-1 whitespace-pre-wrap font-medium text-amber-700">
          Ghi chú ly: {item.note}
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

      {Array.from({ length: count }, (_, offset) => {
        const index = start + offset;
        const cup = getPreparationCup(group, index);

        if (!cup) return null;

        const cupLabel =
          `Ly ${index + 1}/${group.quantity}` +
          ` · dòng ${cup.sourceIndex + 1} (${cup.item.id})` +
          ` · ly ${cup.cupNumber} của dòng`;

        return (
          <div
            key={`${cup.sourceIndex}-${cup.cupNumber}`}
            className="rounded border border-[var(--border)] p-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium">{cupLabel}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  onSelect({
                    orderId,
                    groupKey: group.key,
                    quantity: 1,
                    cupLabel,
                  })
                }
              >
                Công thức 1 ly
              </button>
            </div>
            <PreparationOptions item={cup.item} />
          </div>
        );
      })}

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
}: {
  order: KdsOrder;
  onSelect: (selection: PreparationSelection) => void;
}) {
  return (
    <div className="min-w-[240px] space-y-3">
      {order.orderNote && (
        <div className="whitespace-pre-wrap rounded bg-amber-50 p-2 text-xs font-semibold text-amber-800">
          Ghi chú toàn đơn: {order.orderNote}
        </div>
      )}

      {order.groups.map((group, groupIndex) => (
        <div
          key={group.key}
          className="rounded-lg border border-[var(--border)] p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">
                {group.quantity} × {group.item.name}
                <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                  [Ly {order.groups.slice(0, groupIndex).reduce((sum, item) => sum + item.quantity, 0) + 1}
                  {group.quantity > 1 && `–${order.groups.slice(0, groupIndex + 1).reduce((sum, item) => sum + item.quantity, 0)}`}
                  /{order.groups.reduce((sum, item) => sum + item.quantity, 0)}]
                </span>
              </div>
              <div className="text-xs text-[var(--muted)]">
                SKU: {group.sku ?? "Chưa có mapping"}
                {" · "}
                {group.sources.length} dòng gốc
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                onSelect({
                  orderId: order.id,
                  groupKey: group.key,
                  quantity: group.quantity,
                })
              }
            >
              Công thức
            </button>
          </div>

          <PreparationOptions item={group.item} />

          {group.mappingError && (
            <p className="mt-1 text-xs text-amber-700">
              {group.mappingError}
            </p>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-[var(--primary)]">
              Tách xem từng ly ({group.quantity})
            </summary>
            <PreparationCupList
              orderId={order.id}
              group={group}
              onSelect={onSelect}
            />
          </details>
        </div>
      ))}
    </div>
  );
}

export default function PreparationRecipePanel({
  order,
  group,
  selection,
  onQuantityChange,
  onClose,
}: {
  order: KdsOrder | null;
  group: PreparationGroup | null;
  selection: PreparationSelection | null;
  onQuantityChange: (quantity: number) => void;
  onClose: () => void;
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
      className="card min-w-0 self-start space-y-4 xl:sticky xl:top-4"
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
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
        >
          Đóng
        </button>
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
          <p className="mt-2 whitespace-pre-wrap text-sm text-amber-700">
            Ghi chú toàn đơn: {order.orderNote}
          </p>
        )}
      </div>

      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
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
      </div>

      <div>
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
      </div>

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
          <table className="w-full text-left text-xs">
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
