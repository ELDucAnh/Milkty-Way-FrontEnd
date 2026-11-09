import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { can, homePath } from "../../utils/auth";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import {
  formatCurrency,
  formatDate,
  getTodayISO,
  makeId,
} from "../shared/formatters";
import {
  getIngredient,
  getStore,
  theoreticalBalance,
} from "../shared/business-demo";
import type {
  DemoState,
  ReconciliationLine,
  ReconciliationStatus,
  Shift,
  ShiftReconciliation,
} from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const REASONS = [
  "Hết hạn",
  "Nấu/chế biến hỏng",
  "Pha sai",
  "Đổ vỡ",
  "Sai lệch kiểm đếm",
  "Hủy sau pha",
  "Khác",
];
const STATUS_LABEL: Record<ReconciliationStatus, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
};
interface EditableLine extends ReconciliationLine {
  countedText: string;
  actualUseText: string;
  wasteText: string;
}

interface ReasonMultiSelectProps {
  selected: string;
  onChange: (value: string) => void;
  options: string[];
  openUpward?: boolean;
  ingredientName?: string;
}

function ReasonMultiSelect({
  selected,
  onChange,
  options,
  openUpward = false,
  ingredientName,
}: ReasonMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedList = selected
    ? selected
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function toggleReason(item: string) {
    let nextList: string[];
    if (selectedList.includes(item)) {
      nextList = selectedList.filter((s) => s !== item);
    } else {
      nextList = [...selectedList, item];
    }
    onChange(nextList.join(", "));
  }

  function clearAll() {
    onChange("");
  }

  return (
    <div
      className="relative inline-block w-full min-w-[190px] max-w-[230px]"
      ref={containerRef}
    >
      {/* Trigger Button - Gọn gàng, cố định chiều rộng, chống tràn bảng */}
      <button
        type="button"
        aria-label={`Chọn nguyên nhân hao hụt ${ingredientName ?? ""}`}
        className={`form-input flex items-center justify-between gap-1.5 w-full text-left cursor-pointer min-h-[38px] py-1 px-2.5 bg-[var(--surface)] transition-all ${isOpen
            ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
            : "hover:border-[var(--primary)]"
          }`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-1 flex-1 overflow-hidden">
          {selectedList.length === 0 ? (
            <span className="text-xs text-[var(--muted)]">Chọn lý do...</span>
          ) : selectedList.length === 1 ? (
            <span
              className="badge badge-warning text-[11px] truncate max-w-[145px]"
              title={selectedList[0]}
            >
              {selectedList[0]}
            </span>
          ) : (
            <div
              className="flex items-center gap-1 overflow-hidden"
              title={selectedList.join(", ")}
            >
              <span className="badge badge-warning text-[11px] truncate max-w-[95px]">
                {selectedList[0]}
              </span>
              <span className="badge badge-gray text-[11px] shrink-0 font-medium">
                +{selectedList.length - 1}
              </span>
            </div>
          )}
        </div>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 text-[var(--muted)] transition-transform duration-150 ${isOpen ? "rotate-180 text-[var(--primary)]" : ""
            }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Popover Dropdown Checkboxes */}
      {isOpen && (
        <div
          className={`absolute right-0 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 p-2.5 animate-fadeIn ${openUpward ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[var(--border)] text-xs">
            <span className="font-semibold text-[var(--heading-color)]">
              Nguyên nhân hao hụt
            </span>
            {selectedList.length > 0 && (
              <button
                type="button"
                className="text-[11px] text-[var(--danger)] hover:underline font-medium"
                onClick={clearAll}
              >
                Xóa chọn
              </button>
            )}
          </div>

          {/* List Checkboxes */}
          <div className="space-y-0.5 max-h-52 overflow-y-auto py-0.5">
            {options.map((option) => {
              const isChecked = selectedList.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${isChecked
                      ? "bg-[rgba(34,181,115,0.08)] text-[var(--text)] font-semibold"
                      : "hover:bg-[var(--background)] text-[var(--text)]"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleReason(option)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[#22B573] focus:ring-[#22B573] focus:ring-offset-0 cursor-pointer accent-[#22B573]"
                  />
                  <span className="flex-1 truncate">{option}</span>
                </label>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-2 mt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span>
              Đã chọn:{" "}
              <b className="text-[var(--primary)]">{selectedList.length}</b> lý
              do
            </span>
            <button
              type="button"
              className="btn btn-sm btn-primary !py-0.5 !px-2.5 !text-xs !h-6"
              onClick={() => setIsOpen(false)}
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildSessionLines(
  data: DemoState,
  storeId: string,
  date: string,
  shift: Shift,
): EditableLine[] {
  return data.lots
    .filter((lot) => lot.location === "counter" && lot.locationId === storeId)
    .map((lot) => {
      const snapshot = data.countSnapshots.find(
        (item) =>
          item.lotId === lot.id &&
          (!item.date || item.date === date) &&
          (item.shift == null || item.shift === shift),
      );
      const received =
        snapshot?.received ??
        data.allocations
          .filter(
            (ticket) =>
              ticket.storeId === storeId &&
              ticket.date === date &&
              ticket.shift === shift &&
              (ticket.status === "received" || ticket.status === "discrepancy"),
          )
          .flatMap((ticket) => ticket.lines)
          .filter(
            (line) =>
              line.ingredientId === lot.ingredientId &&
              line.batchId === lot.batchId,
          )
          .reduce((sum, line) => sum + (line.receivedQuantity ?? 0), 0);
      const opening = snapshot?.opening ?? Math.max(0, lot.quantity - received);
      const actualUse = snapshot?.actualUse ?? 0;
      const waste = snapshot?.waste ?? 0;
      return {
        id: makeId("reconcile-line"),
        ingredientId: lot.ingredientId,
        lotId: lot.id,
        opening,
        received,
        actualUse,
        waste,
        counted: lot.quantity,
        countedText: String(lot.quantity),
        actualUseText: String(actualUse),
        wasteText: String(waste),
        unitCost: lot.unitCost,
        reason: "Sai lệch kiểm đếm",
      };
    });
}

export default function ShiftReconciliationPage() {
  const [data, setData] = useDemoState();
  const [storeId, setStoreId] = useState("CN01");
  const [date, setDate] = useState(getTodayISO());
  const [shift, setShift] = useState<Shift>("Ca sáng");
  const [opener, setOpener] = useState("Thu ngân ca sáng");
  const [counter, setCounter] = useState("Nhân viên kiểm đếm");
  const [approver, setApprover] = useState("Quản lý cửa hàng");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<EditableLine[]>(() =>
    buildSessionLines(data, "CN01", getTodayISO(), "Ca sáng"),
  );
  const [selectedRecord, setSelectedRecord] =
    useState<ShiftReconciliation | null>(null);
  const [error, setError] = useState("");

  const theoretical = (line: EditableLine) =>
    theoreticalBalance(
      line.opening,
      line.received,
      Number(line.actualUseText || 0),
      Number(line.wasteText || 0),
    );
  const variance = (line: EditableLine) =>
    Number((theoretical(line) - Number(line.countedText || 0)).toFixed(3));
  const totalWaste = lines.reduce(
    (sum, line) => sum + (Number(line.wasteText) || 0),
    0,
  );
  const totalVarianceValue = lines.reduce(
    (sum, line) => sum + Math.abs(variance(line)) * line.unitCost,
    0,
  );
  const changedLines = lines.filter(
    (line) => Math.abs(variance(line)) > 0.0001 || Number(line.wasteText) > 0,
  );
  const pendingRecords = data.reconciliations.filter(
    (record) => record.status === "pending",
  );
  const latestReceived = lines.reduce((sum, line) => sum + line.received, 0);
  const historyValue = (record: ShiftReconciliation) =>
    record.lines.reduce(
      (sum, line) =>
        sum +
        Math.abs(
          theoreticalBalance(
            line.opening,
            line.received,
            line.actualUse,
            line.waste,
          ) - line.counted,
        ) *
        line.unitCost,
      0,
    );

  function updateLine(id: string, patch: Partial<EditableLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }
  function changeStore(nextStoreId: string) {
    setStoreId(nextStoreId);
    setLines(buildSessionLines(data, nextStoreId, date, shift));
  }
  function changeDate(nextDate: string) {
    setDate(nextDate);
    setLines(buildSessionLines(data, storeId, nextDate, shift));
  }
  function changeShift(nextShift: Shift) {
    setShift(nextShift);
    setLines(buildSessionLines(data, storeId, date, nextShift));
  }

  function saveRecord(status: "draft" | "pending") {
    if (
      !date ||
      !storeId ||
      !opener.trim() ||
      !counter.trim() ||
      lines.length === 0
    ) {
      setError(
        "Cần cửa hàng, ca, người mở ca và ít nhất một dòng nguyên liệu.",
      );
      return;
    }
    if (
      lines.some((line) =>
        [line.actualUseText, line.wasteText, line.countedText].some(
          (value) => !Number.isFinite(Number(value)) || Number(value) < 0,
        ),
      )
    ) {
      setError("Tiêu hao thực tế, hủy và số đếm phải không âm.");
      return;
    }
    if (
      status === "pending" &&
      changedLines.some((line) => !line.reason.trim())
    ) {
      setError("Dòng có chênh lệch/hủy phải có nguyên nhân.");
      return;
    }
    const existingRecord = data.reconciliations.find(
      (record) =>
        record.date === date &&
        record.storeId === storeId &&
        record.shift === shift,
    );

    if (
      existingRecord &&
      (existingRecord.status === "pending" ||
        existingRecord.status === "approved")
    ) {
      setError(
        `Ca này đã có biên bản ${existingRecord.status === "approved"
          ? "đã duyệt"
          : "đang chờ duyệt"
        }. Vui lòng kiểm tra lịch sử trước khi tạo thêm.`,
      );
      return;
    }
    const record: ShiftReconciliation = {
      id: existingRecord?.id ?? makeId("reconcile"),
      date,
      storeId,
      shift,
      opener: opener.trim(),
      counter: counter.trim(),
      approver: approver.trim(),
      status,
      note: note.trim(),
      lines: lines.map((line) => ({
        id: line.id,
        ingredientId: line.ingredientId,
        lotId: line.lotId,
        opening: line.opening,
        received: line.received,
        actualUse: Number(line.actualUseText),
        waste: Number(line.wasteText),
        counted: Number(line.countedText),
        unitCost: line.unitCost,
        reason: line.reason,
      })),
    };
    setData((current) => ({
      ...current,
      reconciliations: existingRecord
        ? current.reconciliations.map((item) =>
          item.id === existingRecord.id ? record : item,
        )
        : [record, ...current.reconciliations],
    }));
    setError("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    saveRecord("pending");
  }
  function approve(record: ShiftReconciliation) {
    setData((current) => {
      const currentRecord = current.reconciliations.find(
        (item) => item.id === record.id,
      );

      // Không duyệt lại hoặc áp dụng điều chỉnh tồn hai lần.
      if (!currentRecord || currentRecord.status !== "pending") {
        return current;
      }

      const nextSnapshots = [...current.countSnapshots];

      for (const line of record.lines) {
        const index = nextSnapshots.findIndex(
          (snapshot) =>
            snapshot.position === "counter" &&
            snapshot.locationId === record.storeId &&
            snapshot.lotId === line.lotId &&
            snapshot.date === record.date &&
            snapshot.shift === record.shift,
        );

        const snapshot = {
          id: index >= 0 ? nextSnapshots[index].id : makeId("snapshot"),
          position: "counter" as const,
          locationId: record.storeId,
          ingredientId: line.ingredientId,
          lotId: line.lotId,
          opening: line.opening,
          received: line.received,
          actualUse: line.actualUse,
          waste: line.waste,
          unitCost: line.unitCost,
          date: record.date,
          shift: record.shift,
        };

        if (index >= 0) {
          nextSnapshots[index] = snapshot;
        } else {
          nextSnapshots.push(snapshot);
        }
      }

      return {
        ...current,

        reconciliations: current.reconciliations.map((item) =>
          item.id === record.id
            ? {
              ...item,
              status: "approved",
              approver: approver.trim() || "Quản lý cửa hàng",
            }
            : item,
        ),

        lots: current.lots.map((lot) => {
          const line = record.lines.find((item) => item.lotId === lot.id);

          return line ? { ...lot, quantity: line.counted } : lot;
        }),

        countSnapshots: nextSnapshots,
      };
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/stores/ingredients">Vận hành tại quầy</Link>
            <span className="sep">/</span>
            <span className="current">Đối soát cuối ca</span>
          </nav>
          <h1 className="page-title">Đối soát nguyên liệu cuối ca</h1>
          <p className="page-subtitle">
            Đối chiếu tồn đầu, thực nhận, tiêu hao theo đơn đã pha, lượng hủy và
            số đếm thực tế.
          </p>
        </div>
        <span className="text-xs text-[var(--muted)]">
          Cửa hàng · ca vận hành
        </span>
      </div>
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Ca chờ duyệt"
            value={String(pendingRecords.length)}
            subLabel="Chênh lệch cần xác nhận"
            tone="warning"
            icon={<KpiIcon kind="clock" />}
          />
          <StatCard
            label="Thực nhận trong ca"
            value={latestReceived.toLocaleString("vi-VN")}
            subLabel="Theo phiếu đã nhận"
            tone="info"
            icon={<KpiIcon kind="box" />}
          />
          <StatCard
            label="Hủy chưa tính tiêu hao"
            value={totalWaste.toLocaleString("vi-VN")}
            subLabel="Ghi riêng, không trừ trùng"
            tone="warning"
            icon={<KpiIcon kind="warning" />}
          />
          <StatCard
            label="Chênh lệch cần duyệt"
            value={formatCurrency(totalVarianceValue)}
            subLabel="Theo giá vốn từng lô"
            tone={totalVarianceValue > 0 ? "danger" : "success"}
            icon={<KpiIcon kind="balance" />}
          />
        </div>
      </section>
      <section className="card mb-6 border-l-4 border-[var(--warning)]">
        <h2 className="text-sm font-bold mb-1">Công thức đối soát</h2>
        <p className="text-sm text-[var(--muted)]">
          Tồn lý thuyết = tồn đầu + thực nhận − tiêu hao thực tế − hủy chưa tính
          vào tiêu hao. Chênh lệch = tồn lý thuyết − tồn thực đếm; số âm là
          thừa. Không dùng định mức công thức thay cho actualUse.
        </p>
      </section>

      <form className="space-y-6" onSubmit={submit}>
        <section className="card">
          <h2 className="font-bold mb-4">Thông tin ca</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="form-label" htmlFor="reconcile-date">
                Ngày *
              </label>
              <input
                id="reconcile-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(event) => changeDate(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="reconcile-store">
                Cửa hàng *
              </label>
              <select
                id="reconcile-store"
                className="form-input form-select"
                value={storeId}
                onChange={(event) => changeStore(event.target.value)}
              >
                {data.stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code} · {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="reconcile-shift">
                Ca *
              </label>
              <select
                id="reconcile-shift"
                className="form-input form-select"
                value={shift}
                onChange={(event) => changeShift(event.target.value as Shift)}
              >
                <option>Ca sáng</option>
                <option>Ca chiều</option>
                <option>Ca tối</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="reconcile-opener">
                Người mở ca *
              </label>
              <input
                id="reconcile-opener"
                className="form-input"
                value={opener}
                onChange={(event) => setOpener(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="reconcile-counter">
                Người đối soát *
              </label>
              <input
                id="reconcile-counter"
                className="form-input"
                value={counter}
                onChange={(event) => setCounter(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="reconcile-approver">
                Người duyệt
              </label>
              <input
                id="reconcile-approver"
                className="form-input"
                value={approver}
                onChange={(event) => setApprover(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="card p-0 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-[var(--border)]">
            <h2 className="font-bold">Bảng đối soát theo lô</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Tiêu hao thực tế nhập theo giao dịch đã pha; không tự lấy định mức
              làm số thực dùng.
            </p>
          </div>
          <DataTable>
            <table className="w-full min-w-[1450px] text-sm text-left">
              <thead className="bg-[var(--background)] text-[var(--muted)]">
                <tr>
                  {[
                    "Nguyên liệu / lô",
                    "Đơn vị",
                    "Tồn đầu",
                    "Thực nhận",
                    "Tiêu hao thực tế",
                    "Hủy",
                    "Lý thuyết",
                    "Thực đếm",
                    "Chênh lệch",
                    "Giá trị",
                    "Nguyên nhân hao hụt",
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
                {lines.map((line, index) => {
                  const ingredient = getIngredient(data, line.ingredientId);
                  const difference = variance(line);
                  return (
                    <tr
                      key={line.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-3 py-3">
                        {ingredient?.name}
                        <div className="text-xs text-[var(--muted)]">
                          {
                            data.lots.find((lot) => lot.id === line.lotId)
                              ?.lotCode
                          }
                        </div>
                      </td>
                      <td className="px-3 py-3">{ingredient?.baseUnit}</td>
                      <td className="px-3 py-3">{line.opening}</td>
                      <td className="px-3 py-3">{line.received}</td>
                      <td className="px-2 py-2">
                        <input
                          aria-label={`Tiêu hao thực tế ${ingredient?.name}`}
                          type="number"
                          min="0"
                          step="0.001"
                          className="form-input w-28"
                          value={line.actualUseText}
                          onChange={(event) =>
                            updateLine(line.id, {
                              actualUseText: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          aria-label={`Lượng hủy ${ingredient?.name}`}
                          type="number"
                          min="0"
                          step="0.001"
                          className="form-input w-24"
                          value={line.wasteText}
                          onChange={(event) =>
                            updateLine(line.id, {
                              wasteText: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-3">{theoretical(line)}</td>
                      <td className="px-2 py-2">
                        <input
                          aria-label={`Tồn thực đếm ${ingredient?.name}`}
                          type="number"
                          min="0"
                          step="0.001"
                          className="form-input w-28"
                          value={line.countedText}
                          onChange={(event) =>
                            updateLine(line.id, {
                              countedText: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td
                        className={`px-3 py-3 font-semibold ${difference > 0 ? "text-[var(--danger)]" : difference < 0 ? "text-[var(--info)]" : "text-[var(--success)]"}`}
                      >
                        {difference > 0
                          ? `Thiếu ${difference}`
                          : difference < 0
                            ? `Thừa ${Math.abs(difference)}`
                            : "Khớp"}
                      </td>
                      <td className="px-3 py-3">
                        {formatCurrency(Math.abs(difference) * line.unitCost)}
                      </td>
                      <td className="px-2 py-2">
                        <ReasonMultiSelect
                          ingredientName={ingredient?.name}
                          selected={line.reason}
                          options={REASONS}
                          openUpward={index >= Math.max(1, lines.length - 2)}
                          onChange={(newReason) =>
                            updateLine(line.id, { reason: newReason })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
          <div className="p-4 border-t border-[var(--border)] flex flex-wrap justify-between gap-2 text-sm">
            <span>{changedLines.length} dòng có chênh lệch/hủy</span>
            <b>Giá trị chênh lệch: {formatCurrency(totalVarianceValue)}</b>
          </div>
        </section>

        <section className="card">
          <label className="form-label" htmlFor="reconcile-note">
            Biên bản / ghi chú chung
          </label>
          <textarea
            id="reconcile-note"
            rows={3}
            className="form-input form-textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Mô tả nguyên nhân, chứng từ hoặc thông tin liên quan..."
          />
          {error && (
            <p role="alert" className="text-sm text-[var(--danger)] mt-2">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => saveRecord("draft")}
            >
              Lưu bản nháp
            </button>
            <button type="submit" className="btn btn-primary">
              Gửi đối soát
            </button>
          </div>
        </section>
      </form>

      <section className="card p-0 overflow-hidden mt-6">
        <div className="p-4 md:p-5 border-b border-[var(--border)]">
          <h2 className="font-bold">Lịch sử đối soát</h2>
        </div>
        <DataTable>
          <table className="w-full min-w-[1000px] text-sm text-left">
            <thead className="bg-[var(--background)] text-[var(--muted)]">
              <tr>
                {[
                  "Ngày",
                  "Cửa hàng",
                  "Ca",
                  "Số dòng",
                  "Giá trị chênh lệch",
                  "Người đếm",
                  "Người duyệt",
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
              {data.reconciliations.map((record) => (
                <tr key={record.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-3">{formatDate(record.date)}</td>
                  <td className="px-3 py-3">
                    {getStore(data, record.storeId)?.code} ·{" "}
                    {getStore(data, record.storeId)?.name}
                  </td>
                  <td className="px-3 py-3">{record.shift}</td>
                  <td className="px-3 py-3">{record.lines.length}</td>
                  <td className="px-3 py-3">
                    {formatCurrency(historyValue(record))}
                  </td>
                  <td className="px-3 py-3">{record.counter}</td>
                  <td className="px-3 py-3">
                    {record.approver || "Chưa duyệt"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        record.status === "approved"
                          ? "success"
                          : record.status === "pending"
                            ? "warning"
                            : "info"
                      }
                    >
                      {STATUS_LABEL[record.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedRecord(record)}
                      >
                        Chi tiết
                      </button>
                      {record.status === "draft" && (
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            setData((current) => ({
                              ...current,
                              reconciliations: current.reconciliations.map(
                                (item) =>
                                  item.id === record.id &&
                                    item.status === "draft"
                                    ? { ...item, status: "pending" }
                                    : item,
                              ),
                            }))
                          }
                        >
                          Gửi đối soát
                        </button>
                      )}
                      {record.status === "pending" && can("stock.approveAdjustment") && (
                        <button
                          className="btn btn-primary"
                          onClick={() => approve(record)}
                        >
                          Duyệt điều chỉnh
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
        isOpen={!!selectedRecord}
        title="Chi tiết đối soát"
        size="lg"
        onClose={() => setSelectedRecord(null)}
      >
        {selectedRecord && (
          <div className="space-y-2">
            <p>
              {getStore(data, selectedRecord.storeId)?.name} ·{" "}
              {selectedRecord.shift} · {formatDate(selectedRecord.date)}
            </p>
            {selectedRecord.lines.map((line) => (
              <p key={line.id} className="text-sm">
                {getIngredient(data, line.ingredientId)?.name}: đầu{" "}
                {line.opening} + nhận {line.received} − dùng thực{" "}
                {line.actualUse} − hủy {line.waste} = lý thuyết{" "}
                {theoreticalBalance(
                  line.opening,
                  line.received,
                  line.actualUse,
                  line.waste,
                )}
                ; đếm {line.counted}.
                {line.reason && (
                  <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                    [Lý do: {line.reason}]
                  </span>
                )}
              </p>
            ))}
            <p className="text-sm text-[var(--muted)]">
              {selectedRecord.note || "Không có ghi chú."}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
