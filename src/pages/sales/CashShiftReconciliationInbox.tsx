import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { currentStaff, STAFF_SESSION_CHANGED } from "../../utils/auth";
import { loadCashShifts, STORAGE_SHIFTS, type CashShift } from "../shared/cash-shifts-store";
import { CASH_SHIFTS_CHANGED } from "../shared/cash-shift-workflow";
import { formatCurrency, formatDateTime } from "./sales-support";

/** A3 handover documents are read directly; B6 retains its own inventory approval workflow. */
function readSignedShifts(): { records: CashShift[]; error: string } {
    try {
        const actor = currentStaff();
        if (actor?.loginRole !== "owner" && actor?.loginRole !== "manager") {
            return { records: [], error: "" };
        }
        const records = loadCashShifts().filter(shift =>
            shift.status === "closed" && shift.audit?.handover?.second &&
            (actor.loginRole === "owner" || shift.branchId === actor.branchId)
        );
        return { records, error: "" };
    } catch (error) {
        return { records: [], error: error instanceof Error ? error.message : "Không đọc được biên bản ca." };
    }
}

export default function CashShiftReconciliationInbox() {
    const [{ records, error }, setSnapshot] = useState(readSignedShifts);
    useEffect(() => {
        const refresh = () => setSnapshot(readSignedShifts());
        const storage = (event: StorageEvent) => { if (event.key === null || event.key === STORAGE_SHIFTS) refresh(); };
        refresh();
        window.addEventListener("storage", storage);
        window.addEventListener("focus", refresh);
        window.addEventListener(STAFF_SESSION_CHANGED, refresh);
        window.addEventListener(CASH_SHIFTS_CHANGED, refresh);
        return () => {
            window.removeEventListener("storage", storage);
            window.removeEventListener("focus", refresh);
            window.removeEventListener(STAFF_SESSION_CHANGED, refresh);
            window.removeEventListener(CASH_SHIFTS_CHANGED, refresh);
        };
    }, []);
    const actor = currentStaff();
    if (actor?.loginRole !== "owner" && actor?.loginRole !== "manager") return null;
    return <section className="card mb-6">
        <h2 className="card-title">Biên bản chốt ca xác thực 2 bên</h2>
        <p className="text-sm text-[var(--muted)] mt-2">Biên bản được chuyển từ ca bán hàng để hậu kiểm. Chốt ca không đồng nghĩa đã duyệt điều chỉnh tồn kho.</p>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {!error && records.length === 0 && <p className="text-sm mt-3">Chưa có biên bản chốt ca.</p>}
        {records.filter(shift => actor.loginRole === "owner" || shift.branchId === actor.branchId).map(shift => <div key={shift.id} className="flex flex-wrap justify-between gap-3 border-t border-[var(--border)] py-3 mt-3 text-sm">
            <div><strong>{shift.id} · {shift.branchId} · {shift.counterName}</strong><p>{shift.audit!.handover!.first.name} → {shift.audit!.handover!.second!.name} · {formatDateTime(shift.closedAt!)}</p><p>Lệch tiền: {formatCurrency(shift.audit!.handover!.cashDifference)} · {shift.audit!.handover!.inventory.length} dòng kiểm kê</p></div>
            <Link className="btn btn-secondary btn-sm" to={`/sales/shifts?shiftId=${encodeURIComponent(shift.id)}`}>Xem biên bản</Link>
        </div>)}
    </section>;
}
