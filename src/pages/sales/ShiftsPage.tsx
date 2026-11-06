import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import {
    formatCurrency,
    formatDateTime,
    SalesPageHeader,
} from "./sales-support";

type ShiftStatus = "open" | "closing-requested" | "closed";

interface CashShift {
    id: string;
    branchId: string;
    counterId: string;
    counterName: string;
    staffName: string;
    openedAt: string;
    closedAt: string | null;
    openingCash: number;
    expectedCash: number | null;
    countedCash: number | null;
    recipientId: string | null;
    handoverNote: string;
    pendingOrders: readonly string[];
    status: ShiftStatus;
}

interface OpenShiftForm {
    branchId: string;
    counterId: string;
    openingCash: string;
}

interface CloseShiftForm {
    countedCash: string;
    recipientId: string;
    note: string;
}

interface CloseShiftRequest {
    shiftId: string;
    countedCash: number;
    recipientId: string;
    note: string;
}

const initialShifts: readonly CashShift[] = [
    {
        id: "CA-001",
        branchId: "CN01",
        counterId: "POS01",
        counterName: "Quầy 01",
        staffName: "Nguyễn An",
        openedAt: "2026-10-28T07:00:00+07:00",
        closedAt: null,
        openingCash: 500000,
        expectedCash: null,
        countedCash: null,
        recipientId: null,
        handoverNote: "",
        pendingOrders: ["DH-00125 · Đang pha chế"],
        status: "open",
    },
];

function parseCash(value: string): number | null {
    if (!value.trim()) return null;
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export default function ShiftsPage() {
    const toast = useToast();
    const [pageSize, setPageSize] = useState(10);
    const [handoverId, setHandoverId] = useState<string | null>(null);

    const [shifts, setShifts] = useState<CashShift[]>(() => [...initialShifts]);
    const [selectedId, setSelectedId] = useState("CA-001");
    const [openingForm, setOpeningForm] = useState<OpenShiftForm>({
        branchId: "CN01",
        counterId: "POS01",
        openingCash: "",
    });
    const [closingForm, setClosingForm] = useState<CloseShiftForm>({
        countedCash: "",
        recipientId: "",
        note: "",
    });
    const [pendingRequest, setPendingRequest] = useState<CloseShiftRequest | null>(null);

    const selectedShift = shifts.find((shift) => shift.id === selectedId);
    const countedCash = parseCash(closingForm.countedCash);
    const difference =
        selectedShift?.expectedCash !== null &&
        selectedShift?.expectedCash !== undefined &&
        countedCash !== null
            ? countedCash - selectedShift.expectedCash
            : null;

    function openShift(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const openingCash = parseCash(openingForm.openingCash);
        if (openingCash === null) {
            toast.warning("Tiền đầu ca phải là số nguyên không âm.");
            return;
        }

        const occupied = shifts.some(
            (shift) =>
                shift.branchId === openingForm.branchId &&
                shift.counterId === openingForm.counterId &&
                shift.status !== "closed",
        );

        if (occupied) {
            toast.warning("Quầy này đang có ca mở hoặc đang chờ xử lý đóng ca.");
            return;
        }

        const shift: CashShift = {
            id: `CA-MP-${crypto.randomUUID()}`,
            branchId: openingForm.branchId,
            counterId: openingForm.counterId,
            counterName: "Quầy 01",
            staffName: "Nguyễn An",
            openedAt: new Date().toISOString(),
            closedAt: null,
            openingCash,
            expectedCash: null,
            countedCash: null,
            recipientId: null,
            handoverNote: "",
            pendingOrders: [],
            status: "open",
        };

        setShifts((current) => [shift, ...current]);
        setSelectedId(shift.id);
        setOpeningForm((current) => ({ ...current, openingCash: "" }));
        setClosingForm({ countedCash: "", recipientId: "", note: "" });
        toast.success("Đã mở ca.");
    }

    function requestClose(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!selectedShift || selectedShift.status !== "open") {
            toast.warning("Vui lòng chọn ca đang mở.");
            return;
        }

        if (countedCash === null || closingForm.recipientId !== "NV02") {
            toast.warning("Nhập tiền thực đếm và chọn người nhận bàn giao.");
            return;
        }

        if (
            (selectedShift.pendingOrders.length > 0 || (difference !== null && difference !== 0)) &&
            !closingForm.note.trim()
        ) {
            toast.warning("Cần ghi nội dung bàn giao hoặc lý do chênh lệch.");
            return;
        }

        setPendingRequest({
            shiftId: selectedShift.id,
            countedCash,
            recipientId: closingForm.recipientId,
            note: closingForm.note.trim(),
        });
    }

    function confirmCloseRequest() {
        if (!pendingRequest) return;

        const target = shifts.find((shift) => shift.id === pendingRequest.shiftId);
        if (!target || target.status !== "open") {
            setPendingRequest(null);
            toast.warning("Ca không còn ở trạng thái đang mở.");
            return;
        }

        setShifts((current) => current.map((shift) =>
            shift.id === pendingRequest.shiftId && shift.status === "open"
                ? {
                    ...shift,
                    status: "closing-requested",
                    countedCash: pendingRequest.countedCash,
                    recipientId: pendingRequest.recipientId,
                    handoverNote: pendingRequest.note,
                }
                : shift,
        ));

        setPendingRequest(null);
        toast.success(
            "Đã ghi nhận yêu cầu đóng ca.",
        );
    }

    function selectShift(id: string) {
        const shift = shifts.find(item => item.id === id);
        if (!shift) return;
        setSelectedId(id);
        setPendingRequest(null);
        setHandoverId(null);
        setClosingForm({
            countedCash: shift.countedCash === null ? "" : String(shift.countedCash),
            recipientId: shift.recipientId ?? "",
            note: shift.handoverNote,
        });
    }

    function confirmHandover() {
        const shift = shifts.find(item => item.id === handoverId);
        if (!shift || shift.status !== "closing-requested") {
            setHandoverId(null);
            return;
        }
        setShifts(current => current.map(item => item.id === shift.id && item.status === "closing-requested"
            ? {...item, status: "closed", closedAt: new Date().toISOString()} : item));
        setHandoverId(null);
        toast.success("Đã đóng ca và ghi nhận bàn giao trong phiên làm việc.");
    }

    function withdrawCloseRequest() {
        if (!selectedShift || selectedShift.status !== "closing-requested") return;
        setShifts(current => current.map(item => item.id === selectedShift.id && item.status === "closing-requested"
            ? {...item, status: "open"} : item));
        toast.info("Đã rút yêu cầu. Bạn có thể sửa thông tin bàn giao.");
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
                    aria-pressed={selectedId === shift.id}
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
                    <Link to="/sales/pos" className="btn btn-secondary">
                        Về POS
                    </Link>
                }
            />

            <section className="card mb-6">
                <h2 className="card-title mb-4">Thông tin mở ca</h2>
                <form onSubmit={openShift}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label" htmlFor="shift-branch">
                                Chi nhánh
                            </label>
                            <select
                                id="shift-branch"
                                className="form-input form-select"
                                value={openingForm.branchId}
                                onChange={(event) => setOpeningForm((current) => ({
                                    ...current, branchId: event.target.value,
                                }))}
                            >
                                <option value="CN01">Chi nhánh 01</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label" htmlFor="shift-counter">
                                Quầy
                            </label>
                            <select
                                id="shift-counter"
                                className="form-input form-select"
                                value={openingForm.counterId}
                                onChange={(event) => setOpeningForm((current) => ({
                                    ...current, counterId: event.target.value,
                                }))}
                            >
                                <option value="POS01">Quầy 01</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label" htmlFor="shift-staff">
                                Nhân viên
                            </label>
                            <input
                                id="shift-staff"
                                className="form-input"
                                value="Nguyễn An"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="shift-opening-cash">
                                Tiền đầu ca (đ)
                            </label>
                            <input
                                id="shift-opening-cash"
                                className="form-input"
                                type="number"
                                min="0"
                                step="1000"
                                placeholder="500000"
                                required
                                value={openingForm.openingCash}
                                onChange={(event) => setOpeningForm((current) => ({
                                    ...current, openingCash: event.target.value,
                                }))}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                        <button type="submit" className="btn btn-primary btn-sm shrink-0">
                            Mở ca
                        </button>
                    </div>
                    
                </form>
            </section>

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

            <section className="card">
                <label className="form-label" htmlFor="selected-shift">Chọn ca để xem và bàn giao</label>
                <select id="selected-shift" className="form-input form-select mb-4" value={selectedId} onChange={e => selectShift(e.target.value)}>
                    {shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.id} · {shift.counterName} · {shift.status === "open" ? "Đang mở" : shift.status === "closing-requested" ? "Chờ xử lý đóng ca" : "Đã đóng"}</option>)}
                </select>
                <h2 className="card-title mb-4">
                    Đóng ca {selectedShift?.id ?? ""} và bàn giao
                </h2>

                <form onSubmit={requestClose}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label" htmlFor="shift-expected-cash">
                                Tiền mặt dự kiến
                            </label>
                            <input
                                id="shift-expected-cash"
                                className="form-input"
                                value={selectedShift?.expectedCash == null
                                    ? "Chờ dữ liệu giao dịch"
                                    : formatCurrency(selectedShift.expectedCash)}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="shift-counted-cash">
                                Tiền thực đếm (đ)
                            </label>
                            <input
                                id="shift-counted-cash"
                                className="form-input"
                                type="number"
                                min="0"
                                step="1000"
                                required
                                disabled={selectedShift?.status !== "open"}
                                value={closingForm.countedCash}
                                onChange={(event) => setClosingForm((current) => ({
                                    ...current, countedCash: event.target.value,
                                }))}
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="shift-difference">
                                Chênh lệch tiền
                            </label>
                            <input
                                id="shift-difference"
                                className="form-input"
                                value={difference === null
                                    ? "Chưa đối chiếu"
                                    : formatCurrency(difference)}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="shift-recipient">
                                Người nhận bàn giao
                            </label>
                            <select
                                id="shift-recipient"
                                className="form-input form-select"
                                required
                                disabled={selectedShift?.status !== "open"}
                                value={closingForm.recipientId}
                                onChange={(event) => setClosingForm((current) => ({
                                    ...current, recipientId: event.target.value,
                                }))}
                            >
                                <option value="">Chọn nhân viên</option>
                                <option value="NV02">Trần Bình</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="form-label" htmlFor="shift-handover">
                            Đơn chưa xong, nguyên liệu và lý do chênh lệch
                        </label>
                        <textarea
                            id="shift-handover"
                            className="form-input form-textarea"
                            rows={3}
                            placeholder="Ghi mã đơn cần bàn giao và tình trạng nguyên liệu"
                            disabled={selectedShift?.status !== "open"}
                            value={closingForm.note}
                            onChange={(event) => setClosingForm((current) => ({
                                ...current, note: event.target.value,
                            }))}
                        />
                    </div>

                    <p className="text-sm text-[var(--muted)] mt-4">
                        Đơn chưa xong: {selectedShift?.pendingOrders.join("; ") || "Không có trong dữ liệu mẫu"}.
                        
                    </p>
                    

                    <button
                        type="submit"
                        className="btn btn-primary mt-4"
                        disabled={selectedShift?.status !== "open"}
                    >
                        Gửi yêu cầu đóng ca
                    </button>
                </form>
                {selectedShift?.status === "closing-requested" && <div className="flex flex-wrap gap-2 mt-4">
                    <button type="button" className="btn btn-primary" onClick={() => setHandoverId(selectedShift.id)}>Xác nhận bàn giao và đóng ca</button>
                    <button type="button" className="btn btn-secondary" onClick={withdrawCloseRequest}>Rút yêu cầu để chỉnh sửa</button>
                </div>}
                {selectedShift?.status === "closed" && <p className="mt-4" role="status">Đã đóng lúc {formatDateTime(selectedShift.closedAt!)} · Người nhận: Trần Bình.</p>}
            </section>

            <ConfirmDialog
                open={handoverId !== null}
                title="Xác nhận bàn giao và đóng ca?"
                message={<>Ca {handoverId} · Người nhận: Trần Bình. Xác nhận đã bàn giao tiền và các đơn chưa xong. Thao tác này ghi nhận đóng ca trong phiên hiện tại, chưa xác nhận đối soát tiền với máy chủ.</>}
                confirmText="Xác nhận đóng ca"
                variant="warning"
                onCancel={() => setHandoverId(null)}
                onConfirm={confirmHandover}
            />
            <ConfirmDialog
                open={pendingRequest !== null}
                title="Gửi yêu cầu đóng ca?"
                message={
                    <>
                        Ca {pendingRequest?.shiftId} · Tiền thực đếm: {formatCurrency(pendingRequest?.countedCash ?? 0)} · Người nhận: Trần Bình.
                        {pendingRequest?.note && <p>Nội dung bàn giao: {pendingRequest.note}</p>}
                        
                    </>
                }
                confirmText="Gửi yêu cầu"
                variant="warning"
                onCancel={() => setPendingRequest(null)}
                onConfirm={confirmCloseRequest}
            />
        </>
    );
}