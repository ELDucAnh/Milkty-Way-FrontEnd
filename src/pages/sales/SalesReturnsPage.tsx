import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";
import { formatCurrency } from "../../utils/format";
import { loadInvoices, loadOrders, loadReturns, saveInvoices, saveOrders, saveReturns } from "../shared/sales-orders-store";
import type { ReturnRequest } from "../shared/sales-orders-store";

const STORAGE_RETURN_HISTORY = "miltyway_sales_return_history_v1";

type RequestStatus = "Pending" | "Approved" | "Rejected";

interface ReviewEntry {
    requestId: string;
    reviewer: string;
    memberId: string | null;
    refundedAmount: number;
    pointsChange: number;
    reviewedAt: string;
    decision: "Approved" | "Rejected";
    note: string;
}

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
    const [reviewState, setReviewState] = useState<{ requests: ReturnRequest[]; history: ReviewEntry[] }>(() => {
        const defaultHistory: ReviewEntry[] = [
            {
                requestId: "HT-0000",
                reviewer: "Nguyễn Hoàng Long",
                memberId: "HV-0001",
                refundedAmount: 52000,
                pointsChange: -52,
                reviewedAt: "2026-10-27T16:20:00+07:00",
                decision: "Approved",
                note: "Đã hoàn tiền vào tài khoản hội viên do giao nhầm vị trà sữa.",
            }
        ];
        let loadedHistory = defaultHistory;
        try {
            const raw = localStorage.getItem(STORAGE_RETURN_HISTORY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    loadedHistory = parsed;
                }
            }
        } catch {
            loadedHistory = defaultHistory;
        }
        return {
            requests: loadReturns(),
            history: loadedHistory,
        };
    });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState("");

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
        try {
            localStorage.setItem(STORAGE_RETURN_HISTORY, JSON.stringify(updatedHistory));
            if (decision === "Approved" && selected.resolution === "Hoàn tiền") {
                saveOrders(
                    loadOrders().map(o =>
                        o.id === selected.orderId ? { ...o, payment: "refunded" } : o
                    )
                );
                saveInvoices(
                    loadInvoices().map(inv =>
                        inv.orderId === selected.orderId
                            ? { ...inv, status: "Đã Hoàn Tiền", statusVariant: "danger" }
                            : inv
                    )
                );
            }
        } catch (err) {
            console.warn(err);
        }
        toast.success(`Đã ${decision === "Approved" ? "phê duyệt" : "từ chối"} yêu cầu ${selected.id}!`);
        setSelectedId(null);
        setReviewNote("");
    }

    function handleCreateReturn() {
        if (!formOrderId) {
            toast.warning("Vui lòng chọn đơn gốc cần xử lý khiếu nại.");
            return;
        }

        const order = availableOrders.find(o => o.id === formOrderId);
        const amount = Number(formAmount) || 0;
        const nextId = `HT-${String(reviewState.requests.length + 1).padStart(4, "0")}`;
        const combinedReason = formNote.trim() ? `${formReason} — ${formNote.trim()}` : formReason;

        const newReq: ReturnRequest = {
            id: nextId,
            orderId: formOrderId,
            customer: order?.customer || "Khách Hàng",
            createdAt: new Date().toISOString(),
            resolution: formResolution,
            reason: combinedReason,
            amount,
            points: -Math.round(amount / 10000),
            memberId: order?.phone ? "HV-0001" : null,
            status: "Pending",
        };

        const updated = [newReq, ...reviewState.requests];
        setReviewState(current => ({ ...current, requests: updated }));
        saveReturns(updated);
        toast.success(`Đã tạo yêu cầu xử lý khiếu nại ${nextId} thành công! Đang chờ Quản lý duyệt.`);
        setOpen(false);
        setFormOrderId("");
        setFormNote("");
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
                <div className="flex gap-2.5 flex-wrap">
                    <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Tạo yêu cầu xử lý
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    setSelectedId(r.id);
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
                                        onClick={() => reviewRequest("Rejected")}
                                    >
                                        Từ Chối Yêu Cầu
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => reviewRequest("Approved")}
                                    >
                                        Phê Duyệt &amp; Hoàn Tiền
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

            {/* Modal Tạo Yêu Cầu Mới */}
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Tạo Yêu Cầu Khiếu Nại &amp; Hoàn Tiền"
                size="lg"
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                            Hủy Bỏ
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleCreateReturn}>
                            Gửi Yêu Cầu Duyệt
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-3.5">
                    <div>
                        <label className="form-label" htmlFor="return-order">Đơn gốc cần xử lý (*)</label>
                        <select
                            id="return-order"
                            className="form-input form-select"
                            value={formOrderId}
                            onChange={e => {
                                setFormOrderId(e.target.value);
                                const found = availableOrders.find(o => o.id === e.target.value);
                                if (found) {
                                    setFormAmount(String(found.total));
                                }
                            }}
                        >
                            <option value="">-- Chọn đơn hàng gốc --</option>
                            {availableOrders.map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.id} · {o.customer} ({o.phone}) · {formatCurrency(o.total)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="return-reason">Lý do khiếu nại</label>
                        <select
                            id="return-reason"
                            className="form-input form-select"
                            value={formReason}
                            onChange={e => setFormReason(e.target.value)}
                        >
                            <option value="Sai mức đường / đá">Sai mức đường / mức đá so với đơn đặt</option>
                            <option value="Hỏng vị / chất lượng không đạt">Hỏng vị / trà bị chua hoặc đắng gắt</option>
                            <option value="Nhầm món hoặc cỡ ly">Nhầm món hoặc nhầm cỡ ly (M/L)</option>
                            <option value="Thiếu món thêm">Thiếu món thêm (Topping)</option>
                            <option value="Khách yêu cầu hủy trước pha">Khách đổi ý yêu cầu hủy trước khi pha chế</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="return-resolution">Hướng xử lý đề xuất</label>
                        <select
                            id="return-resolution"
                            className="form-input form-select"
                            value={formResolution}
                            onChange={e => setFormResolution(e.target.value)}
                        >
                            <option value="Hoàn tiền">Hoàn tiền lại cho khách hàng</option>
                            <option value="Đổi món">Đổi món mới cho khách</option>
                            <option value="Bù voucher">Tặng voucher ưu đãi cho đơn kế tiếp</option>
                            <option value="Hủy trước pha">Hủy đơn trước khi pha</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="return-amount">Số tiền đề nghị hoàn (₫)</label>
                        <input
                            id="return-amount"
                            type="number"
                            min="0"
                            step="1000"
                            className="form-input"
                            value={formAmount}
                            onChange={e => setFormAmount(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor="return-note">Ghi chú chi tiết</label>
                        <textarea
                            id="return-note"
                            className="form-input form-textarea"
                            placeholder="Mô tả cụ thể phản hồi của khách hàng tại quầy..."
                            rows={3}
                            value={formNote}
                            onChange={e => setFormNote(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
}
