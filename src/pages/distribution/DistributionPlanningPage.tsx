import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatDate, getTodayISO, makeId } from "../shared/formatters";
import {
  getIngredient,
  getStore,
  availableLotQuantity,
} from "../shared/business-demo";
import type {
  DistributionPlan,
  PlanLine,
  PlanStatus,
  Shift,
} from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

interface DraftPlanLine {
  id: string;
  ingredientId: string;
  quantity: string;
}
const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
};
const statusVariant = {
  draft: "info",
  pending: "warning",
  approved: "success",
} as const;

export default function DistributionPlanningPage() {
  const [data, setData] = useDemoState();
  const [date, setDate] = useState("all");
  const [status, setStatus] = useState("all");
  const [applied, setApplied] = useState({ date: "all", status: "all" });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DistributionPlan | null>(null);
  const [error, setError] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [form, setForm] = useState({
    date: getTodayISO(),
    storeId: data.stores[0]?.id ?? "",
    shift: "Ca sáng" as Shift,
    expectedCups: "",
    note: "",
  });
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [lines, setLines] = useState<DraftPlanLine[]>([
    { id: makeId("plan-line"), ingredientId: "ing-tea-base", quantity: "" },
  ]);
  const rows = useMemo(
    () =>
      data.plans.filter(
        (plan) =>
          (applied.date === "all" || plan.date === applied.date) &&
          (applied.status === "all" || plan.status === applied.status),
      ),
    [data.plans, applied],
  );
  const preparedLots = data.lots.filter(
    (lot) =>
      lot.location === "kitchen" &&
      availableLotQuantity(lot) > 0 &&
      data.batches.some(
        (batch) =>
          batch.id === lot.batchId &&
          batch.status === "completed" &&
          batch.quality === "pass",
      ),
  );
  const readyBatches = data.batches.filter(
    (batch) =>
      batch.status === "completed" &&
      batch.quality === "pass" &&
      batch.expiryDate >= getTodayISO(),
  );
  const todayPlans = data.plans.filter(
    (plan) => plan.date === getTodayISO(),
  ).length;
  const needsSupply = data.plans.filter(
    (plan) => plan.status !== "approved",
  ).length;

  function addLine() {
    setLines((current) => [
      ...current,
      {
        id: makeId("plan-line"),
        ingredientId: data.ingredients[0]?.id ?? "",
        quantity: "",
      },
    ]);
  }
  function savePlan(event: FormEvent) {
    event.preventDefault();
    const expectedCups = Number(form.expectedCups);
    if (
      !form.date ||
      !form.storeId ||
      !Number.isFinite(expectedCups) ||
      !Number.isInteger(expectedCups) ||
      expectedCups <= 0 ||
      lines.length === 0 ||
      lines.some(
        (line) =>
          !line.ingredientId ||
          !Number.isFinite(Number(line.quantity)) ||
          Number(line.quantity) <= 0,
      )
    ) {
      setError(
        "Cần có ngày, cửa hàng, nhu cầu dự kiến và ít nhất một nguyên liệu với lượng đề xuất hợp lệ.",
      );
      return;
    }
    const plan: DistributionPlan = {
      id: makeId("plan"),
      code: `KH-${form.date.replace(/-/g, "")}-${String(data.plans.length + 1).padStart(2, "0")}`,
      storeId: form.storeId,
      date: form.date,
      shift: form.shift,
      expectedCups,
      lines: lines.map((line) => {
        const ingredient = getIngredient(data, line.ingredientId)!;
        return {
          id: line.id,
          ingredientId: line.ingredientId,
          quantity: Number(line.quantity),
          approvedQuantity: null,
          unit: ingredient.baseUnit,
        } satisfies PlanLine;
      }),
      batchIds,
      status: "draft",
      note: form.note.trim(),
    };
    setData((current) => ({ ...current, plans: [plan, ...current.plans] }));
    setCreateOpen(false);
    setError("");
  }
  function sendForApproval(plan: DistributionPlan) {
    setData((current) => ({
      ...current,
      plans: current.plans.map((item) =>
        item.id === plan.id ? { ...item, status: "pending" } : item,
      ),
    }));
  }
  function approve(plan: DistributionPlan) {
    setApprovalError("");

    if (plan.status !== "pending") return;

    // Tổng lượng nguyên liệu của kế hoạch đang duyệt.
    const requested = new Map<string, number>();

    for (const line of plan.lines) {
      requested.set(
        line.ingredientId,
        (requested.get(line.ingredientId) ?? 0) + line.quantity,
      );
    }

    // Lượng đã được giữ trong các phiếu cấp phát nháp/chờ xuất.
    const committed = new Map<string, number>();

    const activeTickets = data.allocations.filter(
      (ticket) =>
        ticket.status === "draft" || ticket.status === "pending-dispatch",
    );

    for (const ticket of activeTickets) {
      for (const line of ticket.lines) {
        committed.set(
          line.ingredientId,
          (committed.get(line.ingredientId) ?? 0) + line.proposedQuantity,
        );
      }
    }

    // Kế hoạch đã duyệt nhưng chưa có phiếu cấp phát.
    const plansWithoutTicket = data.plans.filter(
      (item) =>
        item.id !== plan.id &&
        item.status === "approved" &&
        !data.allocations.some((ticket) => ticket.planId === item.id),
    );

    for (const otherPlan of plansWithoutTicket) {
      for (const line of otherPlan.lines) {
        committed.set(
          line.ingredientId,
          (committed.get(line.ingredientId) ?? 0) +
          (line.approvedQuantity ?? line.quantity),
        );
      }
    }

    // Kiểm tra tổng nhu cầu với tồn khả dụng ở khu chế biến.
    for (const [ingredientId, quantity] of requested) {
      const available = preparedLots
        .filter((lot) => lot.ingredientId === ingredientId)
        .reduce((sum, lot) => sum + availableLotQuantity(lot), 0);

      const alreadyCommitted = committed.get(ingredientId) ?? 0;

      if (quantity + alreadyCommitted > available) {
        const ingredient = getIngredient(data, ingredientId);

        setApprovalError(
          `${ingredient?.name ?? ingredientId} không đủ tồn khả dụng. ` +
          `Nhu cầu duyệt: ${quantity}; đã được cam kết: ${alreadyCommitted}; ` +
          `khả dụng hiện tại: ${available}.`,
        );
        return;
      }
    }

    // Kiểm tra lại các mẻ đã liên kết.
    const invalidBatch = plan.batchIds.some(
      (id) => !readyBatches.some((batch) => batch.id === id),
    );

    if (invalidBatch) {
      setApprovalError(
        "Có mẻ liên kết không còn đạt chất lượng hoặc đã hết hạn.",
      );
      return;
    }

    setData((current) => ({
      ...current,
      plans: current.plans.map((item) =>
        item.id === plan.id
          ? {
            ...item,
            status: "approved",
            lines: item.lines.map((line) => ({
              ...line,
              approvedQuantity: line.quantity,
            })),
          }
          : item,
      ),
    }));
  }
  function clearFilters() {
    setDate("all");
    setStatus("all");
    setApplied({ date: "all", status: "all" });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/production/batches">Sản xuất tập trung</Link>
            <span className="sep">/</span>
            <span className="current">Kế hoạch cấp phát</span>
          </nav>
          <h1 className="page-title">Kế hoạch cấp phát theo ca</h1>
          <p className="page-subtitle">
            Lập kế hoạch thủ công theo cửa hàng, ngày, ca, nhu cầu và nhiều
            nguyên liệu; không tự dự báo.
          </p>
        </div>
        <span className="text-xs text-[var(--muted)]">
          12 cửa hàng · 1 khu chế biến
        </span>
      </div>
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Kế hoạch hôm nay"
            value={String(todayPlans)}
            subLabel="Theo các ca vận hành"
            tone="info"
            icon={<KpiIcon kind="clipboard" />}
          />
          <StatCard
            label="Chờ xử lý"
            value={String(needsSupply)}
            subLabel="Nháp / chờ duyệt"
            tone="warning"
            icon={<KpiIcon kind="warning" />}
          />
          <StatCard
            label="Mẻ đạt, còn hạn"
            value={String(readyBatches.length)}
            subLabel="Có thể xem xét cấp"
            tone="info"
            icon={<KpiIcon kind="factory" />}
          />
          <StatCard
            label="Đã duyệt"
            value={String(
              data.plans.filter((plan) => plan.status === "approved").length,
            )}
            subLabel="Lượng cấp được xác nhận"
            tone="success"
            icon={<KpiIcon kind="document-check" />}
          />
        </div>
      </section>
      <section className="card mb-6 border-l-4 border-[var(--info)]">
        <h2 className="text-sm font-bold mb-1">Căn cứ lập kế hoạch</h2>
        <p className="text-sm text-[var(--muted)]">
          Tham khảo nhu cầu theo món/size/topping, tồn quầy còn hạn, đơn lớn đã
          xác nhận và mẻ đạt. Lượng đang giao chỉ dùng cho lập kế hoạch; chưa là
          tồn quầy.
        </p>
      </section>
      <section className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="form-label" htmlFor="plan-date-filter">
              Ngày
            </label>
            <select
              id="plan-date-filter"
              className="form-input form-select"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            >
              <option value="all">Tất cả ngày</option>
              {[...new Set(data.plans.map((plan) => plan.date))]
                .sort()
                .map((day) => (
                  <option key={day} value={day}>
                    {formatDate(day)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="plan-status-filter">
              Trạng thái
            </label>
            <select
              id="plan-status-filter"
              className="form-input form-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Tất cả</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setApplied({ date, status })}
            >
              Áp dụng
            </button>
          </div>
        </div>
      </section>
      <section className="card p-0 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-bold">Kế hoạch cấp phát</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Một kế hoạch có thể chứa nhiều nguyên liệu và lượng duyệt riêng.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm({
                date: getTodayISO(),
                storeId: data.stores[0]?.id ?? "",
                shift: "Ca sáng",
                expectedCups: "",
                note: "",
              });
              setBatchIds([]);
              setLines([
                {
                  id: makeId("plan-line"),
                  ingredientId: data.ingredients[0]?.id ?? "",
                  quantity: "",
                },
              ]);
              setError("");
              setCreateOpen(true);
            }}
          >
            + Tạo kế hoạch
          </button>
        </div>
        {approvalError && (
          <p role="alert" className="text-sm text-[var(--danger)] mb-4">
            {approvalError}
          </p>
        )}
        <DataTable>
          <table className="w-full min-w-[1200px] text-sm text-left">
            <thead className="bg-[var(--background)] text-[var(--muted)]">
              <tr>
                {[
                  "Mã",
                  "Cửa hàng / ngày",
                  "Ca",
                  "Nhu cầu",
                  "Nguyên liệu / đề xuất",
                  "Lượng duyệt",
                  "Mẻ đạt",
                  "Trạng thái",
                  "Thao tác",
                ].map((label) => (
                  <th key={label} className="px-3 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((plan) => (
                <tr key={plan.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-3 font-semibold">{plan.code}</td>
                  <td className="px-3 py-3">
                    {getStore(data, plan.storeId)?.code} ·{" "}
                    {getStore(data, plan.storeId)?.name}
                    <div>{formatDate(plan.date)}</div>
                  </td>
                  <td className="px-3 py-3">{plan.shift}</td>
                  <td className="px-3 py-3">{plan.expectedCups} ly</td>
                  <td className="px-3 py-3">
                    {plan.lines.map((line) => (
                      <div key={line.id}>
                        {getIngredient(data, line.ingredientId)?.name}:{" "}
                        {line.quantity} {line.unit}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    {plan.lines.map((line) => (
                      <div key={line.id}>
                        {line.approvedQuantity == null
                          ? "—"
                          : `${line.approvedQuantity} ${line.unit}`}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    {plan.batchIds
                      .map(
                        (id) =>
                          data.batches.find((batch) => batch.id === id)?.code ??
                          id,
                      )
                      .join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant[plan.status]}>
                      {STATUS_LABEL[plan.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelected(plan)}
                      >
                        Chi tiết
                      </button>
                      {plan.status === "draft" && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => sendForApproval(plan)}
                        >
                          Gửi duyệt
                        </button>
                      )}
                      {plan.status === "pending" && (
                        <button
                          className="btn btn-primary"
                          onClick={() => approve(plan)}
                        >
                          Duyệt lượng đề xuất
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </section>

      <Modal
        isOpen={createOpen}
        title="Tạo kế hoạch cấp phát"
        size="xl"
        onClose={() => setCreateOpen(false)}
      >
        <form className="space-y-3" onSubmit={savePlan}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="plan-date">
                Ngày *
              </label>
              <input
                id="plan-date"
                type="date"
                className="form-input"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="plan-shift">
                Ca *
              </label>
              <select
                id="plan-shift"
                className="form-input form-select"
                value={form.shift}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shift: event.target.value as Shift,
                  }))
                }
              >
                <option>Ca sáng</option>
                <option>Ca chiều</option>
                <option>Ca tối</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="plan-store">
                Cửa hàng *
              </label>
              <select
                id="plan-store"
                className="form-input form-select"
                value={form.storeId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    storeId: event.target.value,
                  }))
                }
              >
                {data.stores
                  .filter((store) => store.status === "active")
                  .map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} · {store.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="plan-cups">
                Nhu cầu dự kiến (ly) *
              </label>
              <input
                id="plan-cups"
                type="number"
                min="1"
                step="1"
                className="form-input"
                value={form.expectedCups}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expectedCups: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>
          <section className="card p-0 overflow-hidden">
            <div className="p-3 flex justify-between">
              <div>
                <h3 className="font-semibold">Nguyên liệu cần cấp</h3>
                <p className="text-xs text-[var(--muted)]">
                  Nhập thủ công; chỉ mẻ đạt và còn hạn được liên kết.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addLine}
              >
                + Thêm nguyên liệu
              </button>
            </div>
            <DataTable>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[
                      "Nguyên liệu",
                      "Khả dụng khu chế biến",
                      "Lượng đề xuất",
                      "",
                    ].map((label) => (
                      <th key={label} className="px-2 py-2 text-left">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const ingredient = getIngredient(data, line.ingredientId);
                    const available = preparedLots
                      .filter((lot) => lot.ingredientId === line.ingredientId)
                      .reduce((sum, lot) => sum + availableLotQuantity(lot), 0);
                    return (
                      <tr
                        key={line.id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-2 py-2">
                          <select
                            aria-label="Nguyên liệu kế hoạch"
                            className="form-input form-select min-w-[170px]"
                            value={line.ingredientId}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item) =>
                                  item.id === line.id
                                    ? {
                                      ...item,
                                      ingredientId: event.target.value,
                                    }
                                    : item,
                                ),
                              )
                            }
                          >
                            {data.ingredients.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          {available.toLocaleString("vi-VN")}{" "}
                          {ingredient?.baseUnit}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            aria-label="Lượng đề xuất cấp"
                            type="number"
                            min="0.001"
                            step="0.001"
                            className="form-input w-32"
                            value={line.quantity}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item) =>
                                  item.id === line.id
                                    ? { ...item, quantity: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            required
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={lines.length <= 1}
                            onClick={() =>
                              setLines((current) =>
                                current.filter((item) => item.id !== line.id),
                              )
                            }
                          >
                            Bớt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTable>
          </section>
          <div>
            <label className="form-label" htmlFor="plan-batches">
              Mẻ đạt liên quan
            </label>
            <select
              id="plan-batches"
              multiple
              className="form-input min-h-24"
              value={batchIds}
              onChange={(event) =>
                setBatchIds(
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
            >
              {readyBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code} ·{" "}
                  {
                    getIngredient(
                      data,
                      data.recipes.find(
                        (recipe) => recipe.id === batch.recipeId,
                      )?.outputIngredientId ?? "",
                    )?.name
                  }{" "}
                  · HSD {formatDate(batch.expiryDate)}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)]">
              Có thể chọn nhiều mẻ; giữ Ctrl/Cmd khi chọn nhiều mục.
            </p>
          </div>
          <div>
            <label className="form-label" htmlFor="plan-note">
              Ghi chú
            </label>
            <textarea
              id="plan-note"
              rows={2}
              className="form-input form-textarea"
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu bản nháp
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={!!selected}
        title="Chi tiết kế hoạch cấp phát"
        size="lg"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-3">
            <p className="font-semibold">
              {selected.code} · {getStore(data, selected.storeId)?.name} ·{" "}
              {selected.shift}
            </p>
            <p>
              Nhu cầu dự kiến: {selected.expectedCups} ly ·{" "}
              {formatDate(selected.date)}
            </p>
            <div>
              {selected.lines.map((line) => (
                <p key={line.id}>
                  {getIngredient(data, line.ingredientId)?.name}: đề xuất{" "}
                  {line.quantity} {line.unit}; duyệt{" "}
                  {line.approvedQuantity ?? "chưa duyệt"} {line.unit}
                </p>
              ))}
            </div>
            <p>
              Mẻ:{" "}
              {selected.batchIds
                .map(
                  (id) =>
                    data.batches.find((batch) => batch.id === id)?.code ?? id,
                )
                .join(", ") || "Chưa liên kết"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {selected.note || "Không có ghi chú."} Kế hoạch chưa thay đổi tồn
              kho.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
