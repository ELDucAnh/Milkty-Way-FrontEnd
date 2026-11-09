import { can, homePath, isBranchScoped, scopedBranch } from "../../utils/auth";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import { salesBranches } from "../../data/sales/branches";
import { formatDateTime } from "../../utils/format";
import { loadOrders, saveOrders } from "../shared/sales-orders-store";
import type { PreparationChannel, PreparationOrder, PreparationStatus } from "../shared/sales-orders-store";

interface StatusDisplay {
    label: string;
    variant: BadgeVariant;
}

const statusDisplay: Record<PreparationStatus, StatusDisplay> = {
    waiting: {
        label: "Chờ pha chế",
        variant: "warning",
    },
    preparing: {
        label: "Đang pha chế",
        variant: "info",
    },
    ready: {
        label: "Sẵn sàng",
        variant: "success",
    },
};

const channelDisplay: Record<PreparationChannel, StatusDisplay> = {
    counter: {
        label: "Tại quầy",
        variant: "gray",
    },
    takeaway: {
        label: "Mang đi",
        variant: "info",
    },
    online: {
        label: "Trực tuyến",
        variant: "purple",
    },
};

function getOrdersFromStore(): PreparationOrder[] {
    const orders = loadOrders().filter(o => !isBranchScoped() || (o.branchId === scopedBranch() && o.delivery !== "delivered" && o.payment !== "refunded" && o.onlineDecision !== "rejected" && (o.channel !== "online" || o.preparation)));
    return orders.filter(o => o.items && o.items.length > 0).map(o => {
        const itemSummary = o.items.map(it => `${it.quantity} × ${it.name} (Size ${it.size})`).join(" + ");
        const optionSummary = o.items.map(it => `Đường ${it.sugar} · ${it.ice}${it.toppings.length ? ` · Topping: ${it.toppings.join(", ")}` : ""}`).join(" | ");
        const note = o.items.map(it => it.note).filter(Boolean).join("; ") || "Không có";
        const status = o.preparation || "waiting";
        const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000)) || 3;
        const waitingMinutes = status === "ready" ? 0 : elapsedMinutes;
        return {
            id: o.id,
            branchId: o.branchId || "CN01",
            channel: o.channel || "counter",
            receivedAt: o.createdAt,
            waitingMinutes,
            itemSummary,
            optionSummary,
            note,
            status,
        };
    });
}

export default function PreparationQueuePage() {
    const toast = useToast();
    const [pageSize, setPageSize] = useState(10);
    const [orders, setOrders] = useState<PreparationOrder[]>(() => getOrdersFromStore());

    const [draftFilters, setDraftFilters] = useState<{ branchId: string; status: string }>({
        branchId: scopedBranch() ?? "CN01",
        status: "",
    });

    const [appliedFilters, setAppliedFilters] = useState<{ branchId: string; status: string }>({
        branchId: scopedBranch() ?? "CN01",
        status: "",
    });

    const visibleOrders = orders.filter((order) => {
        const matchesBranch =
            !appliedFilters.branchId ||
            order.branchId === appliedFilters.branchId;

        const matchesStatus =
            !appliedFilters.status ||
            order.status === appliedFilters.status;

        return matchesBranch && matchesStatus;
    });

    function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAppliedFilters({ ...draftFilters });
    }

    function handleResetFilters() {
        const emptyFilters = {
            branchId: scopedBranch() ?? "",
            status: "",
        };

        setDraftFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
    }

    function handleAdvanceStatus(orderId: string) {
        const order = orders.find((item) => item.id === orderId);

        if (!order || order.status === "ready") {
            return;
        }

        const nextStatus: PreparationStatus =
            order.status === "waiting" ? "preparing" : "ready";

        setOrders((current) =>
            current.map((item) =>
                item.id === orderId
                    ? { ...item, status: nextStatus, waitingMinutes: nextStatus === "ready" ? 0 : item.waitingMinutes }
                    : item,
            ),
        );

        // Đồng bộ sang SalesOrder list
        try {
            const all = loadOrders();
            const updated = all.map(o => o.id === orderId ? { ...o, preparation: nextStatus } : o);
            saveOrders(updated);
        } catch (e) {
            console.warn(e);
        }

        toast.success(
            `Đã cập nhật đơn ${orderId}: ${statusDisplay[nextStatus].label}.`,
            { title: "Pha chế" },
        );
    }

    const columns: readonly DataTableColumn<PreparationOrder>[] = [
        {
            id: "id",
            header: "Mã đơn",
            className: "whitespace-nowrap font-mono font-bold text-[var(--primary)]",
            render: (order) => (
                <Link
                    to={`/invoices/invoice-details?orderId=${encodeURIComponent(order.id)}`}
                    className="hover:underline"
                    title="Xem chi tiết phiếu KOT"
                >
                    {order.id}
                </Link>
            ),
        },
        {
            id: "channel",
            header: "Kênh",
            render: (order) => {
                const display = channelDisplay[order.channel] || channelDisplay.counter;
                return (
                    <Badge variant={display.variant}>
                        {display.label}
                    </Badge>
                );
            },
        },
        {
            id: "receivedAt",
            header: "Nhận lúc",
            className: "whitespace-nowrap",
            render: (order) => (
                <time dateTime={order.receivedAt}>
                    {formatDateTime(order.receivedAt)}
                </time>
            ),
        },
        {
            id: "waitingMinutes",
            header: "Thời gian chờ",
            className: "whitespace-nowrap font-medium",
            render: (order) => (
                <span className={order.waitingMinutes > 10 ? "text-amber-600 font-bold" : ""}>
                    {order.waitingMinutes} phút
                </span>
            ),
        },
        {
            id: "itemSummary",
            header: "Tóm tắt món",
            render: (order) => (
                <div className="font-semibold text-sm">{order.itemSummary}</div>
            ),
        },
        {
            id: "optionSummary",
            header: "Tùy chọn",
            render: (order) => (
                <span className="text-xs text-[var(--muted)]">
                    {order.optionSummary || "Tiêu chuẩn"}
                </span>
            ),
        },
        {
            id: "note",
            header: "Ghi chú",
            render: (order) => (
                <span className={order.note !== "Không có" ? "text-amber-700 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded" : "text-xs text-[var(--muted)]"}>
                    {order.note}
                </span>
            ),
        },
        {
            id: "status",
            header: "Trạng thái",
            render: (order) => {
                const display = statusDisplay[order.status];
                return (
                    <Badge variant={display.variant}>
                        {display.label}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: "Thao tác quầy",
            render: (order) => (
                <div className="flex flex-wrap gap-1.5">
                    {order.status === "waiting" && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAdvanceStatus(order.id)}
                        >
                            Pha chế
                        </button>
                    )}
                    {order.status === "preparing" && (
                        <button
                            type="button"
                            className="btn btn-success btn-sm !bg-emerald-600 !text-white"
                            onClick={() => handleAdvanceStatus(order.id)}
                        >
                            Món đã sẵn sàng
                        </button>
                    )}
                    {isBranchScoped() && order.status === "ready" && <button className="btn btn-primary btn-sm" onClick={() => {
                        saveOrders(loadOrders().map(o => o.id === order.id && o.branchId === scopedBranch() ? {...o, delivery:"delivered"} : o));
                        setOrders(getOrdersFromStore());
                    }}>Bàn giao</button>}
                    {!isBranchScoped() && order.status === "ready" && (
                        <span className="text-xs text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
                            Đã hoàn tất
                        </span>
                    )}
                    {can("order.reportShortage") && order.status !== "ready" && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm !text-rose-600"
                            onClick={() =>
                                toast.warning(
                                    `Đã phát cảnh báo thiếu nguyên liệu cho đơn ${order.id} tới Quầy thu ngân & Quản lý ${order.branchId}!`,
                                    { title: "Báo Thiếu Nguyên Liệu" }
                                )
                            }
                        >
                            Báo thiếu
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="page-header">
                <div>
                    <nav className="breadcrumb" aria-label="Đường dẫn trang">
                        <Link to={homePath()}>Trang chủ</Link>
                        <span className="sep">/</span>
                        <Link to="/sales">Bán hàng</Link>
                        <span className="sep">/</span>
                        <span className="current">Hàng đợi pha chế (KDS)</span>
                    </nav>
                    <div className="flex items-center gap-3 mt-1">
                        <h1 className="page-title mb-0">Hàng Đợi Pha Chế (KDS - Kitchen Display System)</h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Quầy bar thời gian thực
                        </span>
                    </div>
                    <p className="page-subtitle">
                        Màn hình điều phối thứ tự pha chế cho Barista quầy bar, cập nhật trạng thái đơn hàng tức thời.
                    </p>
                </div>
                <div className="page-header-actions" style={{ alignSelf: "center" }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setOrders(getOrdersFromStore());
                            toast.info("Đã làm mới danh sách đơn từ quầy POS.", { title: "Cập Nhật" });
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Làm mới hàng đợi
                    </button>
                    {can("pos.use") && <Link to="/sales/pos" className="btn btn-primary">
                        Về quầy POS
                    </Link>}
                </div>
            </div>

            <section className="card" aria-labelledby="kds-filter-title">
                <h2 id="kds-filter-title" className="card-title mb-4">Bộ lọc hàng đợi</h2>
                <form
                    onSubmit={handleApplyFilters}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
                >
                    <div>
                        <label className="form-label" htmlFor="kds-branch">
                            Chi nhánh
                        </label>
                        <select
                            id="kds-branch" disabled={isBranchScoped()}
                            className="form-input form-select"
                            value={draftFilters.branchId}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    branchId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {salesBranches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.id} — {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="kds-status">
                            Trạng thái pha chế
                        </label>
                        <select
                            id="kds-status"
                            className="form-input form-select"
                            value={draftFilters.status}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    status: event.target.value,
                                }))
                            }
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="waiting">Chờ pha chế</option>
                            <option value="preparing">Đang pha chế</option>
                            <option value="ready">Sẵn sàng</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="kds-pagesize">
                            Số dòng hiển thị
                        </label>
                        <select
                            id="kds-pagesize"
                            className="form-input form-select"
                            value={pageSize}
                            onChange={(event) => setPageSize(Number(event.target.value))}
                        >
                            <option value="5">5 đơn/trang</option>
                            <option value="10">10 đơn/trang</option>
                            <option value="20">20 đơn/trang</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary flex-1">
                            Áp dụng
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleResetFilters}
                        >
                            Xóa lọc
                        </button>
                    </div>
                </form>
            </section>

            <section className="card p-0 overflow-hidden" aria-label="Bảng hàng đợi pha chế">
                <DataTable
                    columns={columns}
                    data={visibleOrders}
                    rowKey={(order) => order.id}
                    caption="Hàng đợi pha chế chi nhánh MilktyWay"
                    pagination
                    pageSize={pageSize}
                />
            </section>
        </div>
    );
}
