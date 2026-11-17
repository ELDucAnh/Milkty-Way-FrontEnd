<<<<<<< Updated upstream
import { useState, useMemo } from "react";
=======
import {
    can,
    canAtBranch,
    currentStaff,
    homePath,
    isCashier,
    scopedBranch,
} from "../../utils/auth";
import { useEffect, useState } from "react";
>>>>>>> Stashed changes
import { Link } from "react-router-dom";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";
import { formatCurrency } from "../../utils/format";
import {
    loadOrders,
    loadReturns,
} from "../shared/sales-orders-store";
import type { ReturnRequest } from "../shared/sales-orders-store";
import { loadCashShifts } from "../shared/cash-shifts-store";
import type { CashShift } from "../shared/cash-shifts-store";
import {
    RETURNS_CHANGED,
    isComplaintResolution,
    reviewReturnRequest,
} from "../shared/sales-returns-store";
import type { ReturnScope } from "../shared/sales-returns-store";
import SalesReturnForm, {
    ReturnCostBox,
    ReturnOrderSearch,
} from "./SalesReturnForm";

type RequestStatus = ReturnRequest["status"];
const statusLabels: Record<RequestStatus, string> = {
    Pending: "Chờ duyệt",
    Approved: "Đã duyệt",
    Rejected: "Từ chối"
};

const statusClasses: Record<RequestStatus, string> = {
    Pending: "badge-warning",
    Approved: "badge-success",
    Rejected: "badge-danger"
};

function displayTime(value: string) {
    try {
        return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    } catch {
        return value;
    }
}

export default function SalesReturnsPage() {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [requests, setRequests] = useState<ReturnRequest[]>([]);
    const [orders, setOrders] = useState<ReturnType<typeof loadOrders>>([]);
    const [shifts, setShifts] = useState<CashShift[]>([]);
    const [loadError, setLoadError] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [cashShiftId, setCashShiftId] = useState("");
    const [confirmAdditionalPayment, setConfirmAdditionalPayment] = useState(false);
    const [reviewBusy, setReviewBusy] = useState(false);
    const [initialOrderId, setInitialOrderId] = useState("");
    const [initialScope, setInitialScope] = useState<ReturnScope>("single-item");
    const [formVersion, setFormVersion] = useState(0);

<<<<<<< Updated upstream
    // Form tạo khiếu nại mới
    const availableOrders = useMemo(() => loadOrders(), [open]);
    const [formOrderId, setFormOrderId] = useState("");
    const [formReason, setFormReason] = useState("Sai mức đường / đá");
    const [formResolution, setFormResolution] = useState("Hoàn tiền");
    const [formAmount, setFormAmount] = useState("45000");
    const [formNote, setFormNote] = useState("");

    const selected = reviewState.requests.find(request => request.id === selectedId);
    const visibleRequests = reviewState.requests.filter(request =>
        (!status || request.status === status) &&
        `${request.id} ${request.orderId} ${request.customer}`.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN")));

    function reviewRequest(decision: "Approved" | "Rejected") {
        if (!selected) return;
        if (decision === "Rejected" && !reviewNote.trim()) {
            toast.warning("Vui lòng nhập lý do từ chối giải quyết khiếu nại.");
            return;
        }

        const isRefund = decision === "Approved" && selected.resolution === "Hoàn tiền" && selected.amount > 0;
        const entry: ReviewEntry = {
            requestId: selected.id,
            reviewer: "Nguyễn Hoàng Long (Quản Trị Viên)",
            memberId: selected.memberId,
            refundedAmount: isRefund ? selected.amount : 0,
            pointsChange: isRefund && selected.memberId ? selected.points : 0,
            reviewedAt: new Date().toISOString(),
            decision,
            note: reviewNote.trim() || (decision === "Approved" ? "Đã duyệt xử lý theo đúng quy trình." : "Từ chối."),
        };

        const updatedRequests = reviewState.requests.map(request =>
            request.id === entry.requestId ? { ...request, status: decision as RequestStatus } : request
        );
        const updatedHistory = [entry, ...reviewState.history];

        setReviewState({
            requests: updatedRequests,
            history: updatedHistory,
        });

        saveReturns(updatedRequests);
=======
    const actorStaffId = currentStaff()?.staffId ?? "";
    const canCreate = currentStaff()?.loginRole === "cashier";
    const canReview = currentStaff()?.loginRole === "manager" && can("payment.refundReview");

    function refresh() {
>>>>>>> Stashed changes
        try {
            const nextRequests = loadReturns();
            const nextOrders = loadOrders();
            const nextShifts = loadCashShifts();
            setRequests(nextRequests);
            setOrders(nextOrders);
            setShifts(nextShifts);
            setLoadError("");
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : "Không đọc được dữ liệu.");
        }
    }

    useEffect(() => {
        refresh();
        window.addEventListener("storage", refresh);
        window.addEventListener("focus", refresh);
        window.addEventListener(RETURNS_CHANGED, refresh);

        return () => {
            window.removeEventListener("storage", refresh);
            window.removeEventListener("focus", refresh);
            window.removeEventListener(RETURNS_CHANGED, refresh);
        };
    }, []);

    const branch = scopedBranch();
    const branchRequests = requests.filter(request => {
        const order = orders.find(value => value.id === request.orderId);
        return !!order && (!branch || order.branchId === branch);
    });

    const visibleRequests = branchRequests.filter(request =>
        (!status || request.status === status) &&
        `${request.id} ${request.orderId} ${request.customer}`
            .toLocaleLowerCase("vi-VN")
            .includes(query.trim().toLocaleLowerCase("vi-VN")),
    );

    const selected = branchRequests.find(request => request.id === selectedId);
    const selectedOrder = orders.find(order => order.id === selected?.orderId);
    const availableCashShifts = shifts.filter(shift =>
        shift.status === "open" &&
        shift.branchId === selectedOrder?.branchId,
    );

    // Giữ tên reviewState để không phải sửa toàn bộ JSX thống kê hiện có.
    const reviewState = {
        requests: branchRequests,
        history: branchRequests
            .filter(request => request.status === "Approved")
            .map(request => ({
                refundedAmount: request.preview?.autoRefundAmount ?? (request.resolution === "Hoàn tiền" ? request.amount : 0),
            })),
    };

    function openCreate(orderId = "", scope: ReturnScope = "single-item") {
        refresh();
        setInitialOrderId(orderId);
        setInitialScope(scope);
        setFormVersion(value => value + 1);
        setOpen(true);
    }

    async function reviewRequest(decision: "Approved" | "Rejected") {
        if (!selected || !selectedOrder || reviewBusy || loadError) return;

        setReviewBusy(true);
        try {
            const result = await reviewReturnRequest({
                actorStaffId,
                requestId: selected.id,
                decision,
                note: reviewNote,
                cashShiftId,
                confirmAdditionalPayment,
            });

            refresh();
            setSelectedId(null);
            setReviewNote("");
            toast.success(
                `Đã ${decision === "Approved" ? "duyệt" : "từ chối"} ${result.id}.`,
            );
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Không xử lý được phiếu.");
            refresh();
        } finally {
            setReviewBusy(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="breadcrumb">
                        <Link to="/dashboard">Tổng quan</Link>
                        <span className="sep">/</span>
                        <Link to="/sales">Đơn hàng</Link>
                        <span className="sep">/</span>
                        <span className="current">Khiếu nại và hoàn tiền</span>
                    </div>
                    <h1 className="page-title">Khiếu nại và hoàn tiền</h1>
                    <p className="page-subtitle">Theo dõi đổi món, hủy trước pha, bù mã ưu đãi và hoàn tiền toàn chuỗi.</p>
                </div>
<<<<<<< Updated upstream
                <div className="flex gap-2.5 flex-wrap">
                    <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Tạo yêu cầu xử lý
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
=======
                {canCreate && (
                    <div className="flex gap-2.5 flex-wrap">
                        <button className="btn btn-primary" type="button" onClick={() => openCreate()}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Tạo yêu cầu xử lý
                        </button>
                    </div>
                )}
            </div>

            {loadError && (
                <div role="alert" className="card mb-4 text-red-600">
                    {loadError} Các thao tác ghi đang bị khóa.
                </div>
            )}

            {canCreate && <section className="card mb-6">
                <ReturnOrderSearch
                    onSelect={(order, scope) => openCreate(order.id, scope)}
                />
            </section>}
            {!isCashier() && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
>>>>>>> Stashed changes
                <div className="card p-4">
                    <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Tổng yêu cầu</div>
                    <div className="text-[26px] font-extrabold text-[var(--text)] mt-1">{reviewState.requests.length}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">Tỷ lệ khiếu nại ~0.8%</div>
                </div>
                <div className="card p-4">
                    <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Số tiền đã hoàn</div>
                    <div className="text-[26px] font-extrabold text-red-500 mt-1">
                        {formatCurrency(reviewState.history.reduce((sum, entry) => sum + entry.refundedAmount, 0))}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">Đã hoàn lại cho khách hàng</div>
                </div>
                <div className="card p-4">
                    <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Số lượng đổi món / bù</div>
                    <div className="text-[26px] font-extrabold text-[var(--primary)] mt-1">
                        {reviewState.requests.filter(r => r.resolution === "Đổi món" || r.resolution === "Bù voucher").length} <span className="text-[13px] font-medium text-[var(--muted)]">Trường hợp</span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">Đã xử lý tại quầy bar</div>
                </div>
                <div className="card p-4">
                    <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Chờ phê duyệt</div>
                    <div className="text-[26px] font-extrabold text-amber-500 mt-1">
                        {reviewState.requests.filter(request => request.status === "Pending").length}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">Cần quản lý xác nhận</div>
                </div>
            </div>

            <div className="card mb-6">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <input
                        type="search"
                        className="form-input w-full sm:w-80 h-11"
                        placeholder="Tìm kiếm mã yêu cầu, mã đơn, khách hàng..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <select
                        className="form-input form-select w-full sm:w-48 h-11"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="Pending">Chờ duyệt</option>
                        <option value="Approved">Đã duyệt</option>
                        <option value="Rejected">Từ chối</option>
                    </select>
                </div>
            </div>

            <section className="card p-0 overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã Yêu Cầu</th>
                                <th>Mã Đơn</th>
                                <th>Khách Hàng</th>
                                <th>Thời Gian</th>
                                <th>Hướng Xử Lý</th>
                                <th>Lý Do</th>
                                <th className="text-right">Số Tiền Hoàn</th>
                                <th>Trạng Thái</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-[var(--muted)]">
                                        Không có yêu cầu khiếu nại nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                visibleRequests.map(r => (
                                    <tr key={r.id}>
                                        <td className="font-mono font-bold text-[var(--primary)]">{r.id}</td>
                                        <td className="font-mono">{r.orderId}</td>
                                        <td className="font-medium">{r.customer}</td>
                                        <td className="text-xs text-[var(--muted)]">{displayTime(r.createdAt)}</td>
                                        <td>
                                            <span className="font-semibold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                                {r.resolution}
                                            </span>
                                        </td>
                                        <td className="text-xs">{r.reason}</td>
                                        <td className="text-right font-bold text-red-600">
                                            {r.amount > 0 ? formatCurrency(r.amount) : "—"}
                                        </td>
                                        <td>
                                            <span className={`badge ${statusClasses[r.status]}`}>
                                                {statusLabels[r.status]}
                                            </span>
                                        </td>
                                        <td>
<<<<<<< Updated upstream
                                            <button
=======
                                            {canReview && canAtBranch(
                                                "payment.refundReview",
                                                orders.find(order => order.id === r.orderId)?.branchId ?? "",
                                            ) ? <button
>>>>>>> Stashed changes
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    setSelectedId(r.id);
                                                    setCashShiftId("");
                                                    setConfirmAdditionalPayment(false);
                                                    setReviewNote("");
                                                }}
                                            >
                                                Xem xét
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Modal Xem xét & Duyệt */}
            <Modal
                open={!!selected}
                onClose={() => setSelectedId(null)}
                title={`Chi Tiết Yêu Cầu ${selected?.id || ""}`}
                size="lg"
            >
                {selected && (
                    <div className="space-y-4">
                        <div className="bg-[var(--background)] p-4 rounded-xl space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Đơn hàng gốc:</span>
                                <span className="font-mono font-bold text-[var(--primary)]">{selected.orderId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Khách hàng:</span>
                                <span className="font-bold">{selected.customer}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Lý do khiếu nại:</span>
                                <span className="font-medium text-amber-700">{selected.reason}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Hướng giải quyết đề xuất:</span>
                                <span className="font-bold">{selected.resolution}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Số tiền đề nghị hoàn:</span>
                                <span className="font-bold text-red-600 text-base">{formatCurrency(selected.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Trạng thái hiện tại:</span>
                                <span className={`badge ${statusClasses[selected.status]}`}>{statusLabels[selected.status]}</span>
                            </div>
                        </div>

                        {selected.details && (
                            <div className="rounded-lg border border-[var(--border)] p-3 text-sm space-y-2">
                                <p>
                                    <strong>Phạm vi:</strong>{" "}
                                    {selected.details.scope === "full-order"
                                        ? "Toàn bộ số ly còn được xử lý"
                                        : "Một hoặc vài món"}
                                </p>

                                <p>
                                    <strong>Ghi nhận:</strong>{" "}
                                    {selected.details.recordMode === "amend-original"
                                        ? "Điều chỉnh đơn và hóa đơn gốc"
                                        : "Tạo đơn thay thế liên kết đơn gốc"}
                                </p>

                                <ul className="space-y-1">
                                    {selected.details.selectedLines.map(line => {
                                        const item = selectedOrder?.items.find(
                                            value => value.id === line.itemId,
                                        );

                                        return (
                                            <li key={line.itemId}>
                                                {item?.name ?? line.itemId}
                                                {" · "}{line.quantity} ly
                                                {selected.details?.resolutionType === "exchange" && (
                                                    <>
                                                        {" → "}
                                                        {line.replacementSku
                                                            ? `${line.replacementSku}, M, không topping`
                                                            : "Làm lại đúng món và tùy chọn cũ"}
                                                    </>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {selected.preview && (
                            <ReturnCostBox preview={selected.preview} />
                        )}

                        {!selected.details && !isComplaintResolution(selected.resolution) && selected.status === "Pending" && (
                            <div role="alert" className="text-sm text-amber-700">
                                Phiếu cũ thiếu dòng món và số lượng.
                                Không được duyệt theo số tiền đã nhập tay.
                                Hãy từ chối và lập phiếu mới theo dòng.
                            </div>
                        )}

                        {selected.status === "Pending" &&
                            selected.preview &&
                            selectedOrder?.paymentMethod === "cash" &&
                            (
                                selected.preview.autoRefundAmount > 0 ||
                                selected.preview.additionalPaymentAmount > 0
                            ) && (
                                <label className="block">
                                    <span className="form-label">
                                        Ca tiền mặt thực chi / thu thêm tại chi nhánh
                                    </span>
                                    <select
                                        className="form-input form-select"
                                        value={cashShiftId}
                                        onChange={event => setCashShiftId(event.target.value)}
                                    >
                                        <option value="">— Chọn ca đang mở —</option>
                                        {availableCashShifts.map(shift => (
                                            <option key={shift.id} value={shift.id}>
                                                {shift.id} · {shift.counterName} · {shift.staffName}
                                            </option>
                                        ))}
                                    </select>

                                    {availableCashShifts.length === 0 && (
                                        <span className="text-sm text-amber-700">
                                            Chưa có ca đang mở để ghi phát sinh tiền mặt.
                                        </span>
                                    )}
                                </label>
                            )}

                        {selected.status === "Pending" &&
                            (selected.preview?.additionalPaymentAmount ?? 0) > 0 && (
                                <label className="flex items-start gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={confirmAdditionalPayment}
                                        onChange={event =>
                                            setConfirmAdditionalPayment(event.target.checked)
                                        }
                                    />
                                    Đã thu đủ khoản khách bù thêm theo phương thức thanh toán
                                    của đơn gốc.
                                </label>
                            )}

                        {selected.reviewedAt && (
                            <div className="text-sm text-[var(--muted)] space-y-1">
                                <p>
                                    Người xử lý: {selected.reviewer}
                                    {" · "}{displayTime(selected.reviewedAt)}
                                </p>
                                <p>{selected.reviewNote}</p>

                                {selected.newCreatedOrderId && (
                                    <Link
                                        className="text-[var(--primary)] underline"
                                        to={`/invoices/invoice-details?orderId=${encodeURIComponent(
                                            selected.newCreatedOrderId,
                                        )}`}
                                    >
                                        Xem đơn thay thế {selected.newCreatedOrderId}
                                    </Link>
                                )}
                            </div>
                        )}
                        {selected.status === "Pending" ? (
                            <div>
                                <label className="form-label" htmlFor="review-note">Ghi chú phê duyệt / Lý do từ chối</label>
                                <textarea
                                    id="review-note"
                                    className="form-input form-textarea"
                                    placeholder="Nhập ghi chú giải trình trước khi duyệt hoặc từ chối..."
                                    rows={3}
                                    value={reviewNote}
                                    onChange={e => setReviewNote(e.target.value)}
                                />
                                <div className="flex justify-end gap-2.5 mt-4">
                                    <button
                                        type="button"
                                        className="btn btn-secondary !text-red-600"
                                        disabled={reviewBusy || !!loadError}
                                        onClick={() => reviewRequest("Rejected")}
                                    >
                                        Từ Chối Yêu Cầu
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={reviewBusy || !!loadError || (!isComplaintResolution(selected.resolution) && (!selected.details || !selected.preview))}
                                        onClick={() => reviewRequest("Approved")}
                                    >
                                        {reviewBusy ? "Đang xử lý..." : "Phê duyệt & Ghi nhận"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm text-center font-medium">
                                Yêu cầu này đã được xử lý ({statusLabels[selected.status]}).
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                open={open && canCreate}
                onClose={() => setOpen(false)}
                title="Tạo phiếu đổi trả / hoàn tiền"
                size="xl"
            >
                <SalesReturnForm
                    key={formVersion}
                    initialOrderId={initialOrderId}
                    initialScope={initialScope}
                    onCreated={() => {
                        refresh();
                        setOpen(false);
                    }}
                />
            </Modal>

        </>
    );
}
