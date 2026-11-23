import { counterLabel, sameCounter } from "../../utils/counters";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  canAtBranch, canVerifyShiftAs,
  currentStaff,
  displayName,
  staffDirectory,
} from "../../utils/auth";
import type { CashShift } from "../shared/cash-shifts-store";
import {
  assessShiftInventory,
} from "../shared/cash-shift-rules";
import type {
  ShiftInventoryInput,
} from "../shared/cash-shift-rules";
import {
  confirmLegacyShiftOpener,
  getShiftCashSummary,
  loadShiftInventoryManifest,
  openApprovedCashShift,
  requestCashShiftClose,
  verifyCashShiftClose,
  withdrawCashShiftClose,
} from "../shared/cash-shift-workflow";
import type {
  ManagerCredentials,
  ShiftInventoryManifestLine,
} from "../shared/cash-shift-workflow";
import {
  formatCurrency,
  formatDateTime,
} from "./sales-support";

interface ActionProps {
  onSaved: (message: string) => void;
}

interface EditableInventory extends ShiftInventoryManifestLine {
  theoreticalText: string;
  countedText: string;
  recountedText: string;
  reason: string;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Không thực hiện được thao tác.";
}

function quantity(text: string, label: string): number {
  if (!text.trim()) throw new Error(`Cần nhập ${label}.`);

  const value = Number(text);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} phải là số hữu hạn không âm.`);
  }

  return value;
}

function money(text: string, label: string): number {
  const value = quantity(text, label);

  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} phải là số nguyên.`);
  }

  return value;
}

function inventoryInput(line: EditableInventory): ShiftInventoryInput {
  return {
    lotId: line.lotId,
    ingredientId: line.ingredientId,
    ingredientName: line.ingredientName,
    lotCode: line.lotCode,
    unit: line.unit,
    theoretical: quantity(line.theoreticalText, "lượng lý thuyết"),
    counted: quantity(line.countedText, "lượng thực đếm"),
    recounted: line.recountedText.trim()
      ? quantity(line.recountedText, "lượng đếm lại")
      : null,
    reason: line.reason,
  };
}

function CredentialsFields({
  value,
  onChange,
}: {
  value: ManagerCredentials;
  onChange: (value: ManagerCredentials) => void;
}) {
  return (
    <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      <legend className="font-semibold text-sm">
        Xác thực tài khoản tại chi nhánh
      </legend>

      <label className="form-label">
        Email người xác thực
        <input
          type="email"
          className="form-input"
          autoComplete="off"
          value={value.email}
          onChange={event => onChange({
            ...value,
            email: event.target.value,
          })}
        />
      </label>

      <label className="form-label">
        Mật khẩu người xác thực
        <input
          type="password"
          className="form-input"
          autoComplete="new-password"
          value={value.password}
          onChange={event => onChange({
            ...value,
            password: event.target.value,
          })}
        />
      </label>
    </fieldset>
  );
}

export function OpenCashShiftForm({ onSaved, disabledCounters = [] }: ActionProps & { disabledCounters?: string[] }) {
  const [actorStaffId] = useState(() => currentStaff()?.staffId ?? "");
  const [branchId] = useState(() => currentStaff()?.branchId ?? "");
  const [counterId, setCounterId] = useState(() => currentStaff()?.counterId ?? "Q1");
  const [openingCash, setOpeningCash] = useState("");
  const [error, setError] = useState("");

  if (!branchId || !canAtBranch("shift.openBranch", branchId)) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (disabledCounters.includes(counterId)) throw new Error("Quầy đang tạm ngưng hoạt động.");
      openApprovedCashShift({
        actorStaffId,
        branchId,
        openingCash: money(openingCash, "tiền đầu ca"),
        counterId,
      });

      setOpeningCash("");
      setError("");
      onSaved("Đã mở ca tại quầy được phân công.");
    } catch (error) {
      setError(message(error));
    }
  }

  return (
    <section className="card mb-6">
      <h2 className="card-title mb-4">Thông tin mở ca</h2>

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-label">
            Chi nhánh
            <input className="form-input" readOnly value={branchId} />
          </label>

          <label className="form-label">
            Quầy
            <select className="form-input form-select" value={counterId} disabled={currentStaff()?.loginRole === "cashier"} onChange={event => setCounterId(event.target.value)}>{["Q1", "Q2", "Q3"].map(id => <option key={id} value={id}>{counterLabel(id)}</option>)}</select>
          </label>

          <label className="form-label">
            Người mở
            <input
              className="form-input"
              readOnly
              value={currentStaff()
                ? displayName(currentStaff()!)
                : "Phiên không hợp lệ"}
            />
          </label>

          <label className="form-label">
            Tiền đầu ca (đ)
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              required
              value={openingCash}
              onChange={event => setOpeningCash(event.target.value)}
            />
          </label>
        </div>

        <p className="text-sm text-[var(--muted)] mt-3">Xác nhận quỹ tiền đầu ca. Mỗi quầy chỉ có một ca đang mở hoặc chờ chốt.</p>

        {error && <p role="alert" className="text-red-600 mt-3">{error}</p>}

        <button type="submit" className="btn btn-primary mt-4">
          Mở ca
        </button>
      </form>
    </section>
  );
}

export function CashShiftHandover({
  shift,
  onSaved,
}: ActionProps & { shift: CashShift }) {
  const [actorStaffId] = useState(() => currentStaff()?.staffId ?? "");
  const [confirmCash, setConfirmCash] = useState(false);
  const [confirmInventory, setConfirmInventory] = useState(false);
  const [confirmRecount, setConfirmRecount] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [note, setNote] = useState("");
  const [handoverReason, setHandoverReason] = useState("");
  const [inventoryReference, setInventoryReference] = useState("");
  const [legacyOpenerId, setLegacyOpenerId] = useState("");
  const [legacyCredentials, setLegacyCredentials] = useState<ManagerCredentials>({
    email: "",
    password: "",
  });
  const [credentials, setCredentials] = useState<ManagerCredentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const [inventoryState] = useState(() => {
    try {
      return {
        lines: loadShiftInventoryManifest(shift.branchId).map(line => ({
          ...line,
          theoreticalText: String(line.theoretical),
          countedText: "",
          recountedText: "",
          reason: "",
        })),
        error: "",
      };
    } catch (error) {
      return {
        lines: [] as EditableInventory[],
        error: message(error),
      };
    }
  });

  const [lines, setLines] = useState<EditableInventory[]>(
    inventoryState.lines,
  );

  const actor = currentStaff();
  const mayOperate = actor?.staffId === actorStaffId &&
    canAtBranch("shift.closeRequestBranch", shift.branchId) &&
    (actor.loginRole === "manager" || sameCounter(actor.counterId, shift.counterId));

  const managers = staffDirectory.filter(candidate =>
    canVerifyShiftAs(candidate.staffId, shift.branchId, actorStaffId),
  );

  const branchStaff = staffDirectory.filter(candidate =>
    candidate.branchId === shift.branchId &&
    (
      candidate.loginRole === "cashier" ||
      candidate.loginRole === "manager"
    ),
  );

  let expectedCash: number | null = null;
  let cashError = "";

  try {
    expectedCash = shift.status === "open" ? getShiftCashSummary(shift).expectedCash : shift.expectedCash;
  } catch (error) {
    cashError = message(error);
  }

  const canRequest = mayOperate &&
    shift.status === "open" &&
    Boolean(shift.openedByStaffId) &&
    !inventoryState.error &&
    !cashError &&
    lines.length > 0;

  const handover = shift.audit?.handover;

  function run(action: () => void, success: string) {
    try {
      action();
      setError("");
      onSaved(success);
    } catch (error) {
      setError(message(error));
    } finally {
      setCredentials(current => ({ ...current, password: "" }));
    }
  }

  function updateLine(
    lotId: string,
    patch: Partial<EditableInventory>,
  ) {
    setLines(current => current.map(line =>
      line.lotId === lotId ? { ...line, ...patch } : line,
    ));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    run(() => {
      requestCashShiftClose({
        actorStaffId,
        snapshot: shift,
        countedCash: money(countedCash, "tiền thực đếm"),
        recipientId,
        note,
        handoverReason,
        inventoryReference,
        inventory: lines.filter(line => line.group === "A" || line.countedText.trim()).map(inventoryInput),
        handoverManager: credentials,
      });
    }, "Bên 1 đã ký. Ca đang chờ Bên 2 xác thực.");
  }

  return (
    <section className="card">
      <h2 className="card-title mb-3">
        Đóng ca {shift.id} và bàn giao
      </h2>

      <div className="text-sm space-y-1 mb-4">
        <p>
          Chi nhánh: {shift.branchId} · {shift.counterName}
        </p>
        <p>
          Người mở: {shift.staffName}
          {shift.openedByStaffId && ` · ${shift.openedByStaffId}`}
        </p>
        <p>
          Tiền đầu ca: {formatCurrency(shift.openingCash)}
        </p>
        <p>
          Tiền mặt dự kiến: {expectedCash === null
            ? "Không đọc được"
            : formatCurrency(expectedCash)}
        </p>
        <p>
          Đơn bàn giao: {shift.pendingOrders.join("; ") || "Không có ghi nhận"}
        </p>
      </div>

      {cashError && (
        <p role="alert" className="text-red-600 mb-3">{cashError}</p>
      )}

      {shift.status === "open" && !shift.openedByStaffId && mayOperate && (
        <div className="border border-[var(--border)] rounded-lg p-4 mb-4">
          <h3 className="font-semibold">Bổ sung danh tính người mở ca cũ</h3>
          <p className="text-sm text-[var(--muted)] mt-1">
            Dữ liệu cũ chỉ có tên. Quản lý phải xác nhận người mở thực tế;
            hệ thống không tự ghép người theo tên.
          </p>

          <label className="form-label mt-3">
            Người mở ca thực tế
            <select
              className="form-input form-select"
              value={legacyOpenerId}
              onChange={event => setLegacyOpenerId(event.target.value)}
            >
              <option value="">Chọn nhân sự</option>
              {branchStaff.map(staff => (
                <option key={staff.staffId} value={staff.staffId}>
                  {displayName(staff)} · {staff.staffId}
                </option>
              ))}
            </select>
          </label>

          <CredentialsFields
            value={legacyCredentials}
            onChange={setLegacyCredentials}
          />

          <button
            type="button"
            className="btn btn-secondary mt-3"
            disabled={!legacyOpenerId}
            onClick={() => run(() => {
              confirmLegacyShiftOpener({
                actorStaffId,
                snapshot: shift,
                openerStaffId: legacyOpenerId,
                manager: legacyCredentials,
              });
            }, "Đã ghi nhận quản lý xác nhận danh tính người mở ca cũ.")}
          >
            Quản lý xác nhận người mở
          </button>
        </div>
      )}

      {shift.status === "open" && (
        <form onSubmit={submit}>
          {shift.openedByStaffId && shift.openedByStaffId !== actorStaffId && (
            <p role="status" className="text-amber-700 mb-3">
              Người đóng ca khác người mở ca. Bắt buộc chọn lý do thay người, ghi biên bản/thời điểm bàn giao và được quản lý cùng chi nhánh xác thực.
            </p>
          )}

          <fieldset disabled={!canRequest}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="form-label">
                Tiền thực đếm (đ)
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="form-input"
                  value={countedCash}
                  onChange={event => setCountedCash(event.target.value)}
                />
              </label>

              <label className="form-label">
                Bên 2 xác thực (quản lý / ca trưởng)
                <select
                  required
                  className="form-input form-select"
                  value={recipientId}
                  onChange={event => setRecipientId(event.target.value)}
                >
                  <option value="">Chọn người xác thực</option>
                  {managers.map(manager => (
                    <option key={manager.staffId} value={manager.staffId}>
                      {displayName(manager)} · {manager.staffId}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                Lý do thay người mở ca
                <select
                  required={shift.openedByStaffId !== actorStaffId}
                  className="form-input form-select"
                  value={handoverReason}
                  onChange={event => setHandoverReason(event.target.value)}
                >
                  <option value="">Chọn lý do</option>
                  <option value="Bàn giao giữa ca do việc đột xuất / ốm đau">
                    Bàn giao giữa ca do việc đột xuất / ốm đau
                  </option>
                  <option value="Điều chuyển ca theo phân công quản lý">
                    Điều chuyển ca theo phân công quản lý
                  </option>
                  <option value="Quản lý đóng ca hộ">
                    Quản lý đóng ca hộ
                  </option>
                </select>
              </label>

              <label className="form-label">
                Tham chiếu kiểm kê (không bắt buộc)
                <input
                  className="form-input"
                  value={inventoryReference}
                  onChange={event => setInventoryReference(event.target.value)}
                  placeholder="Mã biên bản nếu có"
                />
              </label>
            </div>

            {shift.openedByStaffId !== actorStaffId && <CredentialsFields value={credentials} onChange={setCredentials} />}
            <h3 className="font-semibold mt-5 mb-2">Kiểm kê nguyên liệu</h3>

            <p className="text-sm text-[var(--muted)] mb-3">
              Lượng lý thuyết lấy từ tồn quầy hiện tại của chi nhánh, không phải tiêu hao tự tính theo ca.
              Bắt buộc đếm đầy đủ nhóm A; nhóm B có thể đếm bổ sung.
              Xanh ≤2%: đạt. Vàng &gt;2–5%: giải trình. Đỏ &gt;5%: giải trình và đếm lại.
              Lệch tiền trên 20.000đ: Bên 2 phải xác nhận trực tiếp đếm lại. Biên bản không tự điều chỉnh tồn kho.
            </p>

            <datalist id="shift-variance-reasons"><option value="Hao hụt tự nhiên" /><option value="Pha hỏng / làm lại món" /><option value="Đổ vỡ tại quầy" /><option value="Sai lệch muỗng đong" /><option value="Chưa rõ - đã kiểm đếm lại" /></datalist>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm text-left">
                <thead>
                  <tr>
                    {[
                      "Nguyên liệu / Lô",
                      "Đơn vị",
                      "Lý thuyết",
                      "Thực đếm",
                      "Đếm lại",
                      "Kết quả",
                      "Giải trình",
                    ].map(label => (
                      <th key={label} className="p-2">{label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {lines.map(line => {
                    let assessment = "Chưa đủ số liệu";

                    try {
                      const result = assessShiftInventory(inventoryInput(line));
                      assessment = result.recountRequired &&
                        result.recounted === null
                        ? "Phải đếm lại"
                        : result.finalBand === "pass"
                          ? "Trong ngưỡng ≤2%"
                          : "Cần giải trình";

                      assessment += ` · Lệch ${result.difference} ${line.unit} (${result.variancePercent === null ? "không tính %" : result.variancePercent.toFixed(2) + "%"})`;

                      if (
                        result.recountRequired &&
                        result.recounted !== null
                      ) {
                        assessment += " · Đã đếm lại";
                      }
                    } catch {
                      // Chỉ hiện trạng thái chưa đủ dữ liệu.
                      // Store sẽ kiểm tra nghiêm ngặt khi ký.
                    }

                    return (
                      <tr key={line.lotId} className="border-t border-[var(--border)]">
                        <td className="p-2">
                          {line.ingredientName}
                          <div className="text-xs text-[var(--muted)]">
                            {line.lotCode} · Nhóm {line.group}
                          </div>
                        </td>
                        <td className="p-2">{line.unit}</td>
                        <td className="p-2">
                          <input
                            readOnly
                            aria-label={`Lý thuyết ${line.lotCode}`}
                            className="form-input"
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={line.theoreticalText}
                            onChange={event => updateLine(line.lotId, {
                              theoreticalText: event.target.value,
                            })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Thực đếm ${line.lotCode}`}
                            className="form-input"
                            type="number"
                            min="0"
                            step="any"
                            required={line.group === "A"}
                            value={line.countedText}
                            onChange={event => updateLine(line.lotId, {
                              countedText: event.target.value,
                            })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Đếm lại ${line.lotCode}`}
                            className="form-input"
                            type="number"
                            min="0"
                            step="any"
                            value={line.recountedText}
                            onChange={event => updateLine(line.lotId, {
                              recountedText: event.target.value,
                            })}
                          />
                        </td>
                        <td className={`p-2 ${assessment.includes("Phải đếm lại") ? "text-red-700" : assessment.includes("Cần giải trình") ? "text-amber-700" : "text-emerald-700"}`}>{assessment}</td>
                        <td className="p-2">
                          <input
                            list="shift-variance-reasons"
                            aria-label={`Giải trình ${line.lotCode}`}
                            className="form-input"
                            value={line.reason}
                            onChange={event => updateLine(line.lotId, {
                              reason: event.target.value,
                            })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="form-label mt-4">
              Nội dung bàn giao / lý do chênh lệch tiền
              <textarea
                className="form-input form-textarea"
                rows={3}
                value={note}
                onChange={event => setNote(event.target.value)}
              />
            </label>

            <button type="submit" className="btn btn-primary mt-4">
              Đóng ca
            </button>
          </fieldset>

          {inventoryState.error && (
            <p role="alert" className="text-red-600 mt-3">
              {inventoryState.error}
            </p>
          )}

          {!inventoryState.error && lines.length === 0 && (
            <p role="alert" className="text-amber-700 mt-3">
              Chưa có danh mục lô tại CN. Cần bổ sung dữ liệu từ phân hệ kho;
              không thể ký hoàn tất kiểm kê rỗng.
            </p>
          )}
        </form>
      )}

      {handover && (
        <div className="mt-5 space-y-2 text-sm">
          <h3 className="font-semibold">Biên bản đã ký</h3>

          <p>
            Người đóng / bên giao: {handover.first.name}
            {" · "}{handover.first.staffId}
            {" · "}{formatDateTime(handover.first.signedAt)}
          </p>

          {handover.handoverReason && <p>Lý do thay người: {handover.handoverReason}</p>}
          {shift.handoverNote && <p>Nội dung bàn giao: {shift.handoverNote}</p>}
          {handover.differentCloserApproval && <p>Quản lý xác nhận thay người: {handover.differentCloserApproval.name} · {formatDateTime(handover.differentCloserApproval.signedAt)}</p>}
          <p>Nguồn đối chiếu: {handover.inventoryReference}</p>

          <p>
            Tiền thực đếm: {formatCurrency(shift.countedCash ?? 0)}
            {" · "}Chênh lệch: {formatCurrency(handover.cashDifference)}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr>
                  {[
                    "Nguyên liệu / Lô",
                    "ĐVT",
                    "Lý thuyết",
                    "Đếm lần đầu",
                    "Đếm lại",
                    "Lệch",
                    "Giải trình",
                  ].map(label => (
                    <th key={label} className="p-2">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {handover.inventory.map(line => (
                  <tr key={line.lotId} className="border-t border-[var(--border)]">
                    <td className="p-2">{line.ingredientName} · {line.lotCode}</td>
                    <td className="p-2">{line.unit}</td>
                    <td className="p-2">{line.theoretical}</td>
                    <td className="p-2">{line.counted}</td>
                    <td className="p-2">
                      {line.recounted === null ? "—" : line.recounted}
                    </td>
                    <td className="p-2">
                      {line.difference}
                      {" · "}
                      {line.variancePercent === null
                        ? "Không tính % khi lý thuyết bằng 0"
                        : `${line.variancePercent.toFixed(2)}%`}
                    </td>
                    <td className="p-2">{line.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {handover.second && (
            <p>
              Bên 2 xác thực: {handover.second.name}
              {" · "}{handover.second.staffId}
              {" · "}{formatDateTime(handover.second.signedAt)}
            </p>
          )}
        </div>
      )}

      {shift.status === "closing-requested" && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <p role="status" className="text-sm text-[var(--muted)]">
            Ca đang chờ Bên 2 xác thực. POS không được tạo đơn
            mới trong thời gian này.
          </p>

          {!handover && (
            <p className="text-sm text-amber-700 mt-2">
              Yêu cầu cũ chưa có đủ chữ ký và kiểm kê. Cần rút yêu cầu
              để lập lại theo quy trình mới.
            </p>
          )}

          {mayOperate && (
            <>
              {handover && (
                <form
                  onSubmit={event => {
                    event.preventDefault();

                    run(() => {
                      verifyCashShiftClose({
                        actorStaffId,
                        snapshot: shift,
                        manager: credentials,
                        confirmCash, confirmInventory, confirmRecount,
                      });
                    }, "Bên 2 đã xác thực. Ca đã đóng.");
                  }}
                >
                  <CredentialsFields
                    value={credentials}
                    onChange={setCredentials}
                  />

                  <div className="space-y-2 mt-4 text-sm">
                    <label className="flex gap-2"><input type="checkbox" checked={confirmCash} onChange={event => setConfirmCash(event.target.checked)} />Tôi (Bên 2) đã trực tiếp đối chiếu tiền mặt trong két với biên bản.</label>
                    <label className="flex gap-2"><input type="checkbox" checked={confirmInventory} onChange={event => setConfirmInventory(event.target.checked)} />Tôi (Bên 2) đã kiểm tra số liệu kiểm kê nguyên liệu.</label>
                    {(Math.abs(handover.cashDifference) > 20000 || handover.inventory.some(line => line.recountRequired || line.finalBand === "recount")) && <label className="flex gap-2 text-red-700"><input type="checkbox" checked={confirmRecount} onChange={event => setConfirmRecount(event.target.checked)} />Tôi đã trực tiếp đồng kiểm đếm lại các mục vượt ngưỡng (nguyên liệu &gt;5% hoặc tiền &gt;20.000đ).</label>}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">
                    Dùng tài khoản của người được chọn làm Bên 2 trong biên bản.
                    Thông tin đăng nhập không được lưu trong dữ liệu ca.
                  </p>

                  <button
                    type="submit"
                    className="btn btn-primary mt-3"
                  >
                    Bên 2 xác thực và chốt ca
                  </button>
                </form>
              )}

              {(
                actor?.loginRole === "manager" ||
                actorStaffId === shift.closeRequestedByStaffId
              ) && (
                  <button
                    type="button"
                    className="btn btn-secondary mt-3"
                    onClick={() => run(() => {
                      withdrawCashShiftClose({
                        actorStaffId,
                        snapshot: shift,
                      });
                    }, "Đã rút yêu cầu. Cần lập và ký lại biên bản.")}
                  >
                    Rút yêu cầu để chỉnh sửa
                  </button>
                )}
            </>
          )}
        </div>
      )}

      {shift.status === "closed" && (
        <p role="status" className="mt-4 text-sm">
          {shift.closedAt
            ? `Đã đóng lúc ${formatDateTime(shift.closedAt)}.`
            : "Ca lịch sử đã đóng; thiếu thời điểm đóng trong dữ liệu cũ."}
          {handover?.second && " ĐÃ CHỐT CA — XÁC THỰC 2 BÊN."}
          {!handover?.second &&
            " Dữ liệu lịch sử chưa có chữ ký điện tử theo quy trình mới."}
        </p>
      )}

      {error && (
        <p role="alert" className="text-red-600 mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
