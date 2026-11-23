import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    can, canAtBranch, isCashier, scopedBranch,
    currentStaff,
    STAFF_SESSION_CHANGED,
} from "../../utils/auth";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import {
    formatCurrency,
    formatDateTime,
    SalesPageHeader,
} from "./sales-support";
import {
    loadCashShifts,
    STORAGE_SHIFTS,
} from "../shared/cash-shifts-store";
import type { CashShift } from "../shared/cash-shifts-store";
import {
    CASH_SHIFTS_CHANGED, getShiftCashSummary,
} from "../shared/cash-shift-workflow";
import {
    STORAGE_ORDERS,
} from "../shared/sales-orders-store";
import {
    DEMO_STORAGE_KEY,
} from "../shared/business-demo";
import {
    CashShiftHandover,
    OpenCashShiftForm,
} from "./CashShiftActions";

export {
    loadCashShifts,
    initialShifts,
    STORAGE_SHIFTS,
} from "../shared/cash-shifts-store";
export type { CashShift } from "../shared/cash-shifts-store";

function readSnapshot(): {
    shifts: CashShift[];
    error: string | null;
} {
    try {
        return {
            shifts: loadCashShifts(),
            error: null,
        };
    } catch (error) {
        return {
            shifts: [],
            error: error instanceof Error
                ? error.message
                : "Không đọc được dữ liệu ca.",
        };
    }
}

export default function ShiftsPage() {
    const toast = useToast();
    const [pageSize, setPageSize] = useState(10);
    const [shiftSnapshot, setShiftSnapshot] = useState(readSnapshot);
    const [searchParams] = useSearchParams();
    const [selectedId, setSelectedId] = useState(() => searchParams.get("shiftId") ?? "");
    const [revision, setRevision] = useState(0);

    const staff = currentStaff();

    const shifts = !staff?.loginRole
        ? []
        : staff.loginRole === "owner"
            ? shiftSnapshot.shifts
            : (
                staff.loginRole === "cashier" ||
                staff.loginRole === "manager"
            ) && staff.branchId
                ? shiftSnapshot.shifts.filter(
                    shift => shift.branchId === staff.branchId,
                )
                : [];

    const selectedShift = selectedId
        ? shifts.find(shift => shift.id === selectedId)
        : shifts[0];

    function refresh() {
        setShiftSnapshot(readSnapshot());
        setRevision(current => current + 1);
    }

    useEffect(() => {
        function refreshFromStorage(event: StorageEvent) {
            if (
                event.key === null ||
                event.key === STORAGE_SHIFTS ||
                event.key === STORAGE_ORDERS ||
                event.key === DEMO_STORAGE_KEY
            ) {
                refresh();
            }
        }

        window.addEventListener("storage", refreshFromStorage);

        window.addEventListener(CASH_SHIFTS_CHANGED, refresh);
        window.addEventListener(STAFF_SESSION_CHANGED, refresh);



        return () => {
            window.removeEventListener("storage", refreshFromStorage);

            window.removeEventListener(CASH_SHIFTS_CHANGED, refresh);
            window.removeEventListener(STAFF_SESSION_CHANGED, refresh);

        };
    }, []);

    function onSaved(message: string) {
        refresh();
        toast.success(message);
    }

    function selectShift(id: string) {
        setSelectedId(id);
        setRevision(current => current + 1);
    }

    const targetCounterBranch = scopedBranch() || selectedShift?.branchId || "CN01";
    const [disabledCountersByBranch, setDisabledCountersByBranch] = useState<Record<string, string[]>>(() => {
        try {
            const raw = localStorage.getItem("milktyway.disabledCounters.v1");
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });
    const disabledCounters = disabledCountersByBranch[targetCounterBranch] ?? [];
    const setDisabledCounters = (updater: (prev: string[]) => string[]) => {
        setDisabledCountersByBranch(prevMap => {
            const nextList = updater(prevMap[targetCounterBranch] ?? []);
            const updated = { ...prevMap, [targetCounterBranch]: nextList };
            try { localStorage.setItem("milktyway.disabledCounters.v1", JSON.stringify(updated)); } catch { /* ignore */ }
            return updated;
        });
    };
    const mayManageCounters = staff?.loginRole === "manager" && !!staff.branchId && canAtBranch("shift.openBranch", staff.branchId);
    let cashFromSales: number | null = null;
    let effectiveExpectedCash: number | null = null;
    if (selectedShift) {
        if (selectedShift.status === "open") {
            try {
                const summary = getShiftCashSummary(selectedShift);
                cashFromSales = summary.cashSales;
                effectiveExpectedCash = summary.expectedCash;
            } catch { /* The detail panel displays the sales data error. */ }
        } else {
            cashFromSales = selectedShift.audit?.handover?.cashSales ?? null;
            effectiveExpectedCash = selectedShift.expectedCash;
        }
    }
    const columns: readonly DataTableColumn<CashShift>[] = [
        {
            id: "id",
            header: "Mã ca",
            render: (shift) => (
                <button
                    type="button"
                    className="text-[var(--primary)] font-semibold"
                    aria-label={`Chọn ca ${shift.id}`}
                    aria-pressed={selectedShift?.id === shift.id}
                    onClick={() => selectShift(shift.id)}
                >
                    {shift.id}
                </button>
            ),
        },
        {
            id: "counter",
            header: "Chi nhánh / Quầy",
            render: (shift) => `${shift.branchId} / ${shift.counterName}`,
        },
        {
            id: "staff",
            header: "Nhân viên",
            render: (shift) => (
                <span className="name-ellipsis" title={shift.staffName}>
                    {shift.staffName}
                </span>
            ),
        },
        {
            id: "opened",
            header: "Mở ca",
            className: "whitespace-nowrap",
            render: (shift) => formatDateTime(shift.openedAt),
        },
        {
            id: "closed",
            header: "Đóng ca",
            render: (shift) => shift.closedAt
                ? formatDateTime(shift.closedAt)
                : "Chưa đóng",
        },
        {
            id: "cash",
            header: "Tiền đầu ca",
            render: (shift) => formatCurrency(shift.openingCash),
        },
        {
            id: "status",
            header: "Trạng thái",
            render: (shift) => (
                <Badge variant={
                    shift.status === "open"
                        ? "success"
                        : shift.status === "closing-requested" ? "warning" : "gray"
                }>
                    {shift.status === "open"
                        ? "Đang mở"
                        : shift.status === "closing-requested"
                            ? "Chờ xử lý đóng ca"
                            : "Đã đóng"}
                </Badge>
            ),
        },
    ];

    return (
        <>
            <SalesPageHeader
                title="Mở, đóng ca và bàn giao"
                breadcrumb="Ca làm việc"
                parent={{ label: "Bán hàng", to: "/sales" }}
                description="Theo dõi quầy, nhân viên, tiền mặt và các nội dung cần bàn giao."
                actions={
                    can("pos.use") && <Link to="/sales/pos" className="btn btn-secondary">
                        Về POS
                    </Link>
                }
            />

            {shiftSnapshot.error && (
                <div className="card mb-6" role="alert">
                    <p className="text-sm text-red-600">
                        {shiftSnapshot.error}
                    </p>
                    <p className="text-sm text-[var(--muted)] mt-2">
                        Không thể mở hoặc đóng ca cho đến khi dữ liệu được kiểm tra.
                        Không xóa dữ liệu ca nếu chưa sao lưu.
                    </p>
                </div>
            )}
            {!isCashier() && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="card p-4">
                            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Tổng tiền đầu ca ({scopedBranch() || "Chuỗi"})</div>
                            <div className="text-[22px] font-extrabold text-[var(--text)] mt-1">
                                {formatCurrency(shifts.reduce((sum, s) => sum + s.openingCash, 0))}
                            </div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">{shifts.filter(s => s.status === "open").length} ca đang mở</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Doanh thu tiền mặt ca chọn</div>
                            <div className="text-[22px] font-extrabold text-[var(--primary)] mt-1">
                                {cashFromSales === null ? "Chưa có số liệu" : formatCurrency(cashFromSales)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">Ca {selectedShift?.id || "—"}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Tiền chốt ca dự kiến</div>
                            <div className="text-[22px] font-extrabold text-[var(--info)] mt-1">
                                {effectiveExpectedCash === null ? "Chưa có số liệu" : formatCurrency(effectiveExpectedCash)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">Đầu ca + thu tiền mặt</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Quầy POS hoạt động</div>
                            <div className="text-[22px] font-extrabold text-[var(--text)] mt-1">
                                {3 - disabledCounters.length} / 3 quầy
                            </div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">Tại {scopedBranch() || selectedShift?.branchId || "CN01"}</div>
                        </div>
                    </div>

                    <section className="card mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                            <div>
                                <h2 className="card-title">Quản lý quầy POS tại chi nhánh ({scopedBranch() || selectedShift?.branchId || "CN01"})</h2>
                                <p className="text-xs text-[var(--muted)]">Bật/tắt trạng thái vận hành các quầy thu ngân thuộc chi nhánh quản lý.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { id: "Q1", name: "Quầy 01 (Chính)", desc: "Quầy thu ngân & nhận đơn tại chỗ" },
                                { id: "Q2", name: "Quầy 02 (Phụ)", desc: "Quầy tăng cường giờ cao điểm" },
                                { id: "Q3", name: "Quầy 03 (Take-away)", desc: "Quầy ưu tiên khách mang đi" },
                            ].map((counter) => {
                                const isDisabled = disabledCounters.includes(counter.id);
                                const activeShift = shifts.find(s => s.branchId === targetCounterBranch && s.counterId === counter.id && s.status !== "closed");
                                return (
                                    <div key={counter.id} className="p-3.5 rounded-lg border border-[var(--border)] flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-bold text-sm flex items-center gap-2">
                                                {counter.name}
                                                <Badge variant={isDisabled ? "gray" : activeShift ? "success" : "info"}>
                                                    {isDisabled ? "Tạm ngưng" : activeShift ? `Đang mở (${activeShift.id})` : "Sẵn sàng"}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-[var(--muted)] mt-0.5">{counter.desc}</div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!mayManageCounters}
                                            className={`btn btn-sm ${isDisabled ? "btn-primary" : "btn-secondary"}`}
                                            onClick={() => {
                                                const branchId = currentStaff()?.branchId;

                                                if (
                                                    !branchId ||
                                                    currentStaff()?.loginRole !== "manager" ||
                                                    !canAtBranch("shift.openBranch", branchId)
                                                ) {
                                                    toast.warning("Bạn không có quyền thay đổi trạng thái quầy.");
                                                    return;
                                                }
                                                if (!isDisabled && activeShift) {
                                                    toast.warning(`Không thể tạm ngưng ${counter.name} khi đang có ca mở (${activeShift.id}).`);
                                                    return;
                                                }
                                                setDisabledCounters(prev =>
                                                    prev.includes(counter.id) ? prev.filter(id => id !== counter.id) : [...prev, counter.id]
                                                );
                                                toast.success(`Đã ${isDisabled ? "kích hoạt lại" : "tạm ngưng"} ${counter.name}.`);
                                            }}
                                        >
                                            {isDisabled ? "Kích hoạt" : "Tạm ngưng"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            {staff?.loginRole === "owner" && <div className="card mb-6">Việc mở ca, kiểm đếm và ký chốt ca chỉ thực hiện tại chi nhánh. Chủ chuỗi xem biên bản và hậu kiểm tại <Link to="/stores/shift-reconciliation" className="text-[var(--primary)]">Đối soát ca</Link>.</div>}
            {!shiftSnapshot.error && <OpenCashShiftForm key={`open:${staff?.staffId}`} onSaved={onSaved} disabledCounters={disabledCounters} />}

            <section className="card mb-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h2 className="card-title">Danh sách ca</h2>
                    <label className="flex items-center gap-2 text-sm">Số dòng mỗi trang
                        <select className="form-input form-select !w-auto" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                            {[1, 5, 10, 20].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                </div>
                <DataTable<CashShift>
                    key={`${pageSize}-${shifts.length}`}
                    pagination
                    pageSize={pageSize}
                    columns={columns}
                    data={shifts}
                    rowKey={(shift) => shift.id}
                    caption="Danh sách ca làm việc"
                />
            </section>

            {!shiftSnapshot.error && (
                <section className="card mb-4">
                    <label
                        className="form-label"
                        htmlFor="selected-shift"
                    >
                        Chọn ca để xem và bàn giao
                    </label>

                    <select
                        id="selected-shift"
                        className="form-input form-select"
                        value={selectedShift?.id ?? ""}
                        disabled={shifts.length === 0}
                        onChange={event => selectShift(event.target.value)}
                    >
                        {shifts.length === 0 && (
                            <option value="">Chưa có ca</option>
                        )}

                        {shifts.map(shift => (
                            <option key={shift.id} value={shift.id}>
                                {shift.id}
                                {" · "}{shift.branchId}
                                {" · "}
                                {shift.status === "open"
                                    ? "Đang mở"
                                    : shift.status === "closing-requested"
                                        ? "Chờ quản lý duyệt"
                                        : "Đã đóng"}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="btn btn-secondary mt-3"
                        onClick={refresh}
                    >
                        Tải lại dữ liệu
                    </button>

                    <p className="text-xs text-[var(--muted)] mt-2">
                        Tải lại sẽ xóa phần kiểm kê chưa gửi.
                    </p>
                </section>
            )}

            {!shiftSnapshot.error && selectedId && !selectedShift && (
                <p role="status">Không tìm thấy biên bản ca trong phạm vi của bạn.</p>
            )}
            {!shiftSnapshot.error && selectedShift && (
                <CashShiftHandover
                    key={`${staff?.staffId ?? "guest"}:${selectedShift.id}:${revision}`}
                    shift={selectedShift}
                    onSaved={onSaved}
                />
            )}

        </>
    );
}
