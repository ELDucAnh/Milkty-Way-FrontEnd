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
  AllocationLine,
  AllocationStatus,
  AllocationTicket,
  Shift,
} from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

interface DraftLine {
  id: string;
  lotId: string;
  quantity: string;
}
const STATUS_LABEL: Record<AllocationStatus, string> = {
  draft: "Bản nháp",
  "pending-dispatch": "Chờ xuất",
  "in-transit": "Đang giao",
  received: "Đã nhận",
  discrepancy: "Có chênh lệch",
};
const STATUS_VARIANT = {
  draft: "gray",
  "pending-dispatch": "warning",
  "in-transit": "info",
  received: "success",
  discrepancy: "danger",
} as const;

export default function StockTransfersPage() {
  const [data, setData] = useDemoState();
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [applied, setApplied] = useState({
    search: "",
    store: "all",
    shift: "all",
    status: "all",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveTicket, setReceiveTicket] = useState<AllocationTicket | null>(
    null,
  );
  const [receiveLines, setReceiveLines] = useState<Record<string, string>>({});
  const [receiveReason, setReceiveReason] = useState("");
  const [createError, setCreateError] = useState("");
  const [receiveError, setReceiveError] = useState("");
  const kitchenLots = data.lots.filter(
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
  const [form, setForm] = useState({
    planId: "",
    storeId: data.stores[0]?.id ?? "",
    date: getTodayISO(),
    shift: "Ca sáng" as Shift,
    sender: "Nhân viên khu chế biến",
    receiver: "",
  });
  const [draftLines, setDraftLines] = useState<DraftLine[]>([
    {
      id: makeId("allocation-line"),
      lotId: kitchenLots[0]?.id ?? "",
      quantity: "",
    },
  ]);
  const rows = useMemo(
    () =>
      data.allocations.filter((ticket) => {
        const query = applied.search.trim().toLocaleLowerCase("vi-VN");
        const store = getStore(data, ticket.storeId);
        return (
          (!query ||
            `${ticket.code} ${store?.name ?? ""} ${ticket.lines.map((line) => getIngredient(data, line.ingredientId)?.name).join(" ")}`
              .toLocaleLowerCase("vi-VN")
              .includes(query)) &&
          (applied.store === "all" || ticket.storeId === applied.store) &&
          (applied.shift === "all" || ticket.shift === applied.shift) &&
          (applied.status === "all" || ticket.status === applied.status)
        );
      }),
    [data.allocations, data.stores, data.ingredients, applied],
  );
  const inTransit = data.allocations.filter(
    (ticket) => ticket.status === "in-transit",
  ).length;
  const pendingDispatch = data.allocations.filter(
    (ticket) => ticket.status === "pending-dispatch",
  ).length;
  const discrepancies = data.allocations.filter(
    (ticket) => ticket.status === "discrepancy",
  ).length;

  function applyFilters() {
    setApplied({
      search,
      store: storeFilter,
      shift: shiftFilter,
      status: statusFilter,
    });
  }
  function clearFilters() {
    setSearch("");
    setStoreFilter("all");
    setShiftFilter("all");
    setStatusFilter("all");
    setApplied({ search: "", store: "all", shift: "all", status: "all" });
  }
  function selectPlan(planId: string) {
    const plan = data.plans.find((item) => item.id === planId);
    setForm((current) => ({
      ...current,
      planId,
      ...(plan
        ? { storeId: plan.storeId, date: plan.date, shift: plan.shift }
        : {}),
    }));
    if (plan?.lines.length)
      setDraftLines(
        plan.lines.map((line) => {
          const matchingLot = kitchenLots.find(
            (lot) => lot.ingredientId === line.ingredientId,
          );
          return {
            id: makeId("allocation-line"),
            lotId: matchingLot?.id ?? "",
            quantity: String(line.approvedQuantity ?? line.quantity),
          };
        }),
      );
  }
  function submitAllocation(event: FormEvent) {
    event.preventDefault();
    if (
      !form.storeId ||
      !form.date ||
      !form.receiver.trim() ||
      draftLines.length === 0
    ) {
      setCreateError(
        "Cần chọn cửa hàng/ca và người nhận, đồng thời thêm ít nhất một nguyên liệu.",
      );
      return;
    }
    const items: AllocationLine[] = [];
    for (const line of draftLines) {
      const lot = kitchenLots.find((item) => item.id === line.lotId);
      const proposed = Number(line.quantity);
      if (!lot || !Number.isFinite(proposed) || proposed <= 0) {
        setCreateError(
          "Mỗi dòng cần chọn mẻ đạt/còn hạn và lượng đề xuất lớn hơn 0.",
        );
        return;
      }
      items.push({
        id: line.id,
        lotId: lot.id,
        ingredientId: lot.ingredientId,
        batchId: lot.batchId ?? "",
        proposedQuantity: proposed,
        sentQuantity: 0,
        receivedQuantity: null,
        unit: getIngredient(data, lot.ingredientId)?.baseUnit ?? "",
      });
    }
    const ticket: AllocationTicket = {
      id: makeId("allocation"),
      code: `CP-${form.date.replace(/-/g, "")}-${String(data.allocations.length + 1).padStart(2, "0")}`,
      planId: form.planId || null,
      sourceId: "kitchen",
      storeId: form.storeId,
      date: form.date,
      shift: form.shift,
      lines: items,
      sender: form.sender.trim(),
      receiver: form.receiver.trim(),
      sentAt: null,
      receivedAt: null,
      status: "draft",
      discrepancyReason: "",
    };
    setData((current) => ({
      ...current,
      allocations: [ticket, ...current.allocations],
    }));
    setCreateOpen(false);
    setCreateError("");
  }
  function dispatch(ticket: AllocationTicket) {
    if (ticket.status !== "pending-dispatch") return;

    const requirements = new Map<string, number>();

    for (const line of ticket.lines) {
      requirements.set(
        line.lotId,
        (requirements.get(line.lotId) ?? 0) + line.proposedQuantity,
      );
    }

    setData((current) => {
      const currentTicket = current.allocations.find(
        (item) => item.id === ticket.id,
      );

      // Chặn xuất trùng phiếu.
      if (!currentTicket || currentTicket.status !== "pending-dispatch") {
        return current;
      }

      const insufficient = [...requirements].some(([lotId, quantity]) => {
        const lot = current.lots.find((item) => item.id === lotId);

        return !lot || availableLotQuantity(lot) < quantity;
      });

      if (insufficient) return current;

      return {
        ...current,

        lots: current.lots.map((lot) => {
          const quantity = requirements.get(lot.id);

          return quantity === undefined
            ? lot
            : { ...lot, quantity: lot.quantity - quantity };
        }),

        allocations: current.allocations.map((item) =>
          item.id === ticket.id
            ? {
                ...item,
                lines: item.lines.map((line) => ({
                  ...line,
                  sentQuantity: line.proposedQuantity,
                })),
                sentAt: new Date().toISOString(),
                status: "in-transit",
              }
            : item,
        ),
      };
    });
  }
  function requestDispatch(ticket: AllocationTicket) {
    setData((current) => ({
      ...current,
      allocations: current.allocations.map((item) =>
        item.id === ticket.id && item.status === "draft"
          ? { ...item, status: "pending-dispatch" }
          : item,
      ),
    }));
  }
  function openReceive(ticket: AllocationTicket) {
    setReceiveTicket(ticket);
    setReceiveLines(
      Object.fromEntries(
        ticket.lines.map((line) => [line.id, String(line.sentQuantity)]),
      ),
    );
    setReceiveReason("");
    setReceiveError("");
  }
  function confirmReceive(event: FormEvent) {
    event.preventDefault();
    if (!receiveTicket) return;
    if (receiveTicket.status !== "in-transit") return;
    const updatedLines = receiveTicket.lines.map((line) => ({
      ...line,
      receivedQuantity: Number(receiveLines[line.id]),
    }));
    if (
      updatedLines.some(
        (line) =>
          !Number.isFinite(line.receivedQuantity) ||
          line.receivedQuantity! < 0 ||
          line.receivedQuantity! > line.sentQuantity,
      )
    ) {
      setReceiveError("Lượng thực nhận phải từ 0 đến lượng thực cấp.");
      return;
    }
    const mismatch = updatedLines.some(
      (line) => line.receivedQuantity !== line.sentQuantity,
    );

    if (mismatch && !receiveReason.trim()) {
      setReceiveError(
        "Phiếu có chênh lệch thực cấp và thực nhận. Vui lòng ghi rõ lý do.",
      );
      return;
    }
    const counterLots = updatedLines
      .filter((line) => line.receivedQuantity! > 0)
      .map((line) => {
        const sourceLot = data.lots.find((lot) => lot.id === line.lotId)!;
        return {
          ...sourceLot,
          id: makeId("counter-lot"),
          quantity: line.receivedQuantity!,
          location: "counter" as const,
          locationId: receiveTicket.storeId,
        };
      });
    setData((current) => ({
      ...current,
      lots: [...counterLots, ...current.lots],
      allocations: current.allocations.map((ticket) =>
        ticket.id === receiveTicket.id
          ? {
              ...ticket,
              lines: updatedLines,
              receivedAt: new Date().toISOString(),
              status: mismatch ? "discrepancy" : "received",
              discrepancyReason: receiveReason.trim(),
            }
          : ticket,
      ),
    }));
    setReceiveTicket(null);
    setReceiveError("");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/distribution/planning">Kế hoạch cấp phát</Link>
            <span className="sep">/</span>
            <span className="current">Phiếu cấp phát</span>
          </nav>
          <h1 className="page-title">Cấp phát nguyên liệu theo ca</h1>
          <p className="page-subtitle">
            Thay cho nghiệp vụ chuyển kho liên chi nhánh: khu chế biến giao đến
            quầy cửa hàng, nhận theo ca.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateError("");
              setCreateOpen(true);
            }}
          >
            Tạo phiếu cấp phát
          </button>
        </div>
      </div>
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Phiếu trong tháng"
            value={String(data.allocations.length)}
            subLabel="Khu chế biến → cửa hàng"
            tone="primary"
            icon={<KpiIcon kind="transfer" size={18} strokeWidth={2} />}
          />
          <StatCard
            label="Chờ xuất"
            value={String(pendingDispatch)}
            subLabel="Chưa trừ tồn khu chế biến"
            tone="warning"
            icon={<KpiIcon kind="clock-compact" size={18} strokeWidth={2} />}
          />
          <StatCard
            label="Đang giao"
            value={String(inTransit)}
            subLabel="Chưa cộng tồn quầy"
            tone="info"
            icon={<KpiIcon kind="truck" size={18} strokeWidth={2} />}
          />
          <StatCard
            label="Có chênh lệch"
            value={String(discrepancies)}
            subLabel="Cần đối chiếu"
            tone="warning"
            icon={<KpiIcon kind="warning" size={18} strokeWidth={2} />}
          />
        </div>
      </section>
      <section className="card mb-6 border-l-4 border-[var(--info)]">
        <h2 className="text-sm font-bold mb-1">Quy trình BM14</h2>
        <p className="text-sm text-[var(--muted)]">
          Nháp → Chờ xuất → Đang giao → Đã nhận / Có chênh lệch. Xuất giao trừ
          tồn khu chế biến; chỉ khi cửa hàng xác nhận, lượng thực nhận mới cộng
          vào tồn vận hành tại quầy.
        </p>
      </section>
      <section className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div>
            <label className="form-label" htmlFor="allocation-search">
              Tìm kiếm
            </label>
            <input
              id="allocation-search"
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã phiếu, cửa hàng, nguyên liệu..."
            />
          </div>
          <div>
            <label className="form-label" htmlFor="allocation-store-filter">
              Cửa hàng
            </label>
            <select
              id="allocation-store-filter"
              className="form-input form-select"
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
            >
              <option value="all">Tất cả</option>
              {data.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.code} · {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="allocation-shift-filter">
              Ca
            </label>
            <select
              id="allocation-shift-filter"
              className="form-input form-select"
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value)}
            >
              <option value="all">Tất cả ca</option>
              <option>Ca sáng</option>
              <option>Ca chiều</option>
              <option>Ca tối</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="allocation-status-filter">
              Trạng thái
            </label>
            <select
              id="allocation-status-filter"
              className="form-input form-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
              onClick={applyFilters}
            >
              Áp dụng
            </button>
          </div>
        </div>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)]">
          <h2 className="font-bold">Phiếu cấp phát theo ngày và ca</h2>
        </div>
        <DataTable>
          <table className="w-full min-w-[1250px] text-sm text-left">
            <thead className="bg-[var(--background)] text-[var(--muted)]">
              <tr>
                {[
                  "Mã phiếu",
                  "Nguồn",
                  "Cửa hàng nhận",
                  "Ngày / ca",
                  "Mẻ / nguyên liệu",
                  "Đề xuất",
                  "Thực cấp",
                  "Thực nhận",
                  "Giao / nhận",
                  "Trạng thái",
                  "Thao tác",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-3 font-semibold whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ticket) => (
                <tr key={ticket.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-3 font-semibold">
                    {ticket.code}
                    <div className="text-xs text-[var(--muted)]">
                      {ticket.planId ? `KH liên kết` : "Cấp phát thủ công"}
                    </div>
                  </td>
                  <td className="px-3 py-3">Khu chế biến</td>
                  <td className="px-3 py-3">
                    {getStore(data, ticket.storeId)?.code} ·{" "}
                    {getStore(data, ticket.storeId)?.name}
                  </td>
                  <td className="px-3 py-3">
                    {formatDate(ticket.date)}
                    <div>{ticket.shift}</div>
                  </td>
                  <td className="px-3 py-3">
                    {ticket.lines.map((line) => (
                      <div key={line.id}>
                        {line.batchId} ·{" "}
                        {getIngredient(data, line.ingredientId)?.name}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    {ticket.lines.map((line) => (
                      <div key={line.id}>
                        {line.proposedQuantity} {line.unit}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    {ticket.lines.map((line) => (
                      <div key={line.id}>
                        {line.sentQuantity
                          ? `${line.sentQuantity} ${line.unit}`
                          : "—"}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    {ticket.lines.map((line) => (
                      <div key={line.id}>
                        {line.receivedQuantity == null
                          ? "—"
                          : `${line.receivedQuantity} ${line.unit}`}

                        {ticket.status === "discrepancy" &&
                          line.receivedQuantity != null &&
                          line.receivedQuantity < line.sentQuantity && (
                            <div className="text-xs text-[var(--danger)]">
                              Chưa xác minh:{" "}
                              {line.sentQuantity - line.receivedQuantity}{" "}
                              {line.unit}
                            </div>
                          )}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    Giao: {ticket.sender}
                    <div>Nhận: {ticket.receiver}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={STATUS_VARIANT[ticket.status]}>
                      {STATUS_LABEL[ticket.status]}
                    </Badge>
                    {ticket.discrepancyReason && (
                      <div className="text-xs text-[var(--danger)]">
                        {ticket.discrepancyReason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {ticket.status === "draft" && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => requestDispatch(ticket)}
                      >
                        Gửi chờ xuất
                      </button>
                    )}
                    {ticket.status === "in-transit" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => openReceive(ticket)}
                      >
                        Xác nhận nhận
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </section>

      <Modal
        isOpen={createOpen}
        title="Tạo phiếu cấp phát theo ca (BM14)"
        size="xl"
        onClose={() => setCreateOpen(false)}
      >
        <form className="space-y-3" onSubmit={submitAllocation}>
          <div>
            <label className="form-label" htmlFor="allocation-plan">
              Kế hoạch liên quan
            </label>
            <select
              id="allocation-plan"
              className="form-input form-select"
              value={form.planId}
              onChange={(event) => selectPlan(event.target.value)}
            >
              <option value="">Tạo thủ công</option>
              {data.plans
                .filter(
                  (plan) =>
                    plan.status === "approved" || plan.status === "pending",
                )
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.code} · {getStore(data, plan.storeId)?.name} ·{" "}
                    {plan.shift}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="allocation-store">
              Cửa hàng nhận *
            </label>
            <select
              id="allocation-store"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="allocation-date">
                Ngày cấp phát *
              </label>
              <input
                id="allocation-date"
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
              <label className="form-label" htmlFor="allocation-shift">
                Ca *
              </label>
              <select
                id="allocation-shift"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="allocation-sender">
                Người giao *
              </label>
              <input
                id="allocation-sender"
                className="form-input"
                value={form.sender}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sender: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="allocation-receiver">
                Người nhận *
              </label>
              <input
                id="allocation-receiver"
                className="form-input"
                value={form.receiver}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    receiver: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>
          <section className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-[var(--border)] flex justify-between">
              <div>
                <h3 className="font-semibold">Nguyên liệu / mẻ đạt</h3>
                <p className="text-xs text-[var(--muted)]">
                  Chỉ chọn tồn còn hạn tại khu chế biến.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setDraftLines((current) => [
                    ...current,
                    {
                      id: makeId("allocation-line"),
                      lotId: kitchenLots[0]?.id ?? "",
                      quantity: "",
                    },
                  ])
                }
              >
                + Thêm dòng
              </button>
            </div>
            <DataTable>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Lô / mẻ", "Khả dụng", "Lượng đề xuất", ""].map(
                      (label) => (
                        <th key={label} className="px-2 py-2 text-left">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {draftLines.map((line) => {
                    const lot = kitchenLots.find(
                      (item) => item.id === line.lotId,
                    );
                    return (
                      <tr
                        key={line.id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-2 py-2">
                          <select
                            aria-label="Lô mẻ"
                            className="form-input form-select min-w-[220px]"
                            value={line.lotId}
                            onChange={(event) =>
                              setDraftLines((current) =>
                                current.map((item) =>
                                  item.id === line.id
                                    ? { ...item, lotId: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          >
                            {kitchenLots.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.lotCode} ·{" "}
                                {getIngredient(data, option.ingredientId)?.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          {lot
                            ? `${availableLotQuantity(lot)} ${getIngredient(data, lot.ingredientId)?.baseUnit}`
                            : "Không có tồn đạt"}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            aria-label="Lượng đề xuất"
                            type="number"
                            min="0.001"
                            step="0.001"
                            max={lot ? availableLotQuantity(lot) : undefined}
                            className="form-input w-32"
                            value={line.quantity}
                            onChange={(event) =>
                              setDraftLines((current) =>
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
                            disabled={draftLines.length <= 1}
                            onClick={() =>
                              setDraftLines((current) =>
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
          {createError && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {createError}
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
              Lưu phiếu nháp
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!receiveTicket}
        title={`Xác nhận nhận · ${receiveTicket?.code ?? ""}`}
        size="lg"
        onClose={() => setReceiveTicket(null)}
      >
        {receiveTicket && (
          <form className="space-y-3" onSubmit={confirmReceive}>
            <p className="text-sm text-[var(--muted)]">
              Chỉ số lượng thực nhận dưới đây mới được cộng vào tồn vận hành tại
              quầy.
            </p>
            {receiveTicket.lines.map((line) => (
              <div key={line.id}>
                <label className="form-label" htmlFor={`received-${line.id}`}>
                  {getIngredient(data, line.ingredientId)?.name} · đã cấp{" "}
                  {line.sentQuantity} {line.unit}
                </label>
                <input
                  id={`received-${line.id}`}
                  type="number"
                  min="0"
                  max={line.sentQuantity}
                  step="0.001"
                  className="form-input"
                  value={receiveLines[line.id] ?? "0"}
                  onChange={(event) =>
                    setReceiveLines((current) => ({
                      ...current,
                      [line.id]: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            ))}
            <div>
              <label className="form-label" htmlFor="allocation-discrepancy">
                Lý do chênh lệch / từ chối
              </label>
              <textarea
                id="allocation-discrepancy"
                rows={2}
                className="form-input form-textarea"
                value={receiveReason}
                onChange={(event) => setReceiveReason(event.target.value)}
              />
            </div>
            {receiveError && (
              <p role="alert" className="text-sm text-[var(--danger)]">
                {receiveError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReceiveTicket(null)}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                Chốt thực nhận
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
