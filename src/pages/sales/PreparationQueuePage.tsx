import { RETURNS_CHANGED } from "../shared/sales-returns-store";
import { can, homePath, isBranchScoped, scopedBranch, currentStaff, STAFF_SESSION_CHANGED } from "../../utils/auth";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import { salesBranches } from "../../data/sales/branches";
import { formatDateTime } from "../../utils/format";
import { loadPreparationQueue, changePreparation, canManagePreparation, type KdsOrder, type PreparationAction } from "../shared/sales-preparation";
import PreparationQueueWorkspace, {
    PreparationQueueSummary,
} from "./PreparationQueueWorkspace";
import type { PreparationChannel, PreparationStatus } from "../shared/sales-orders-store";

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

export default function PreparationQueuePage() {
    const toast = useToast();
    const [pageSize, setPageSize] = useState(10);
    const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
    const [orders, setOrders] = useState<KdsOrder[]>([]);
    const [loadError, setLoadError] = useState("");
    // ID tại lần render dùng để phát hiện đổi người đăng nhập trước lúc ghi.
    const actorStaffId = currentStaff()?.staffId ?? "";

    useEffect(() => {
        function refresh() {
            try {
                setOrders(loadPreparationQueue());
                setLoadError("");
            } catch (error) {
                setOrders([]);
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : "Không đọc được hàng đợi pha chế.",
                );
            }
        }

        refresh();

        const timer = window.setInterval(refresh, 30000);
        window.addEventListener("storage", refresh);
        window.addEventListener("focus", refresh);
        window.addEventListener(RETURNS_CHANGED, refresh);
        window.addEventListener(STAFF_SESSION_CHANGED, refresh);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener("storage", refresh);
            window.removeEventListener("focus", refresh);
            window.removeEventListener(RETURNS_CHANGED, refresh);
            window.removeEventListener(STAFF_SESSION_CHANGED, refresh);
        };
    }, []);

    const [branchFilter, setBranchFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const activeBranchId = scopedBranch() ?? branchFilter;
    const branchOrders = orders.filter(order => !activeBranchId || order.branchId === activeBranchId);
    const query = search.trim().toLocaleLowerCase("vi-VN");
    const visibleOrders = branchOrders.filter(order =>
        (!statusFilter || (statusFilter === "overdue" ? order.waitingMinutes > 10 : order.status === statusFilter)) &&
        (!query || order.id.toLocaleLowerCase("vi-VN").includes(query) || order.groups.some(group => group.item.name.toLocaleLowerCase("vi-VN").includes(query)))
    );
    const counters = [
        { value: "", label: "Tất cả", count: branchOrders.length },
        ...(["waiting", "preparing", "ready"] as const).map(status => ({ value: status, label: statusDisplay[status].label, count: branchOrders.filter(order => order.status === status).length })),
        { value: "overdue", label: "Quá 10 phút", count: branchOrders.filter(order => order.waitingMinutes > 10).length },
    ];
    function handleRefresh() {
        try {
            setOrders(loadPreparationQueue());
            setLoadError("");
            toast.info("Đã đọc lại hàng đợi từ dữ liệu đơn hàng.", {
                title: "Cập nhật KDS",
            });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Không đọc được hàng đợi pha chế.";
            setLoadError(message);
            toast.error(message, { title: "KDS" });
        }
    }
    function handlePreparationAction(order: KdsOrder,
        action: PreparationAction,
    ) {
        try {
            changePreparation({
                orderId: order.id,
                branchId: order.branchId,
                expectedStatus: order.status,
                actorStaffId,
                action,
            });
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Không cập nhật được đơn pha chế.",
                { title: "KDS" },
            );

            // Đồng bộ trạng thái mới nhất nếu thao tác thất bại do snapshot cũ.
            try {
                setOrders(loadPreparationQueue());
                setLoadError("");
            } catch (refreshError) {
                setLoadError(
                    refreshError instanceof Error
                        ? refreshError.message
                        : "Không đọc lại được hàng đợi.",
                );
            }
            return;
        }

        toast.success(
            action === "handover"
                ? `Đã bàn giao đơn ${order.id}.`
                : `Đã cập nhật đơn ${order.id}: ${
                    statusDisplay[
                        action === "start" ? "preparing" : "ready"
                    ].label
                }.`,
            { title: "Pha chế" },
        );

        try {
            setOrders(loadPreparationQueue());
            setLoadError("");
        } catch (error) {
            setLoadError(
                error instanceof Error
                    ? error.message
                    : "Đã lưu nhưng chưa đọc lại được hàng đợi.",
            );
        }
    }

    function handleAdvanceStatus(orderId: string) {
        const order = orders.find(item => item.id === orderId);

        if (!order || order.status === "ready") return;

        handlePreparationAction(
            order,
            order.status === "waiting" ? "start" : "ready",
        );
    }

    const columns: readonly DataTableColumn<KdsOrder>[] = [
        {
            id: "id",
            header: "Đơn hàng",
            render: order => (
                <div className="min-w-[150px] space-y-1 text-xs">
                    <Link to={`/invoices/invoice-details?orderId=${encodeURIComponent(order.id)}`} className="font-mono font-bold text-[var(--primary)] hover:underline">{order.id}</Link>
                    <div>{order.branchId} · <Badge variant={channelDisplay[order.channel].variant}>{channelDisplay[order.channel].label}</Badge></div>
                    <time dateTime={order.receivedAt}>{formatDateTime(order.receivedAt)}</time>
                    <div className={order.waitingMinutes > 10 ? "font-bold text-amber-700" : "text-[var(--muted)]"}>{order.waitingMinutes} phút chờ</div>
                </div>
            ),
        },
        {
            id: "itemSummary",
            header: "Nhóm ly / tùy chọn",
            render: order => <PreparationQueueSummary order={order} />,
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
            id: "actions",header: "Thao tác quầy",
            render: (order) => {
                const editable =
                    !loadError &&
                    canManagePreparation(order.branchId, actorStaffId);

                return (
                    <div className="flex flex-wrap gap-1.5">
                        {editable && order.status === "waiting" && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAdvanceStatus(order.id)}
                            >
                                Pha chế
                            </button>
                        )}

                        {editable && order.status === "preparing" && (
                            <button
                                type="button"
                                className="btn btn-success btn-sm !bg-emerald-600 !text-white"
                                onClick={() => handleAdvanceStatus(order.id)}
                            >
                                Món đã sẵn sàng
                            </button>
                        )}

                        {editable && order.status === "ready" && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                    handlePreparationAction(order, "handover")
                                }
                            >
                                Bàn giao
                            </button>
                        )}

                        {!editable && (
                            <span className="text-xs text-[var(--muted)]">
                                Chỉ xem
                            </span>
                        )}

                        {editable &&
                            can("order.reportShortage") &&
                            order.status !== "ready" && (
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm !text-rose-600"
                                    onClick={() =>
                                        toast.warning(
                                            `Đơn ${order.id} tại ${order.branchId}: ` +
                                            "hãy liên hệ thu ngân/quản lý để xử lý thiếu nguyên liệu. " +
                                            "Ứng dụng chưa có kênh gửi cảnh báo được lưu.",
                                            { title: "Thiếu nguyên liệu" },
                                        )
                                    }
                                >
                                    Báo thiếu
                                </button>
                            )}
                    </div>
                );
            },
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
                            Quầy bar
                        </span>
                    </div>
                    <p className="page-subtitle">
                        Màn hình điều phối thứ tự pha chế cho Barista quầy bar, theo dõi trạng thái và công thức pha chế.
                    </p>
                </div>
                <div className="page-header-actions" style={{ alignSelf: "center" }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRefresh}
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

<section
    className="card overflow-hidden !p-0"
    aria-label="Bộ lọc hàng đợi"
>
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5">
        <div
            className="flex flex-wrap gap-2"
            aria-label="Trạng thái pha chế"
        >
            {counters.map(counter => (
                <button
                    key={counter.value}
                    type="button"
                    aria-pressed={statusFilter === counter.value}
                    className={`btn btn-sm ${
                        statusFilter === counter.value
                            ? "btn-primary"
                            : "btn-secondary"
                    }`}
                    onClick={() => setStatusFilter(counter.value)}
                >
                    {counter.label}

                    <span
                        className={`inline-flex min-w-5 items-center justify-center rounded px-1.5 py-0.5 text-[11px] ${
                            statusFilter === counter.value
                                ? "bg-white/20"
                                : "bg-[var(--border)]"
                        }`}
                    >
                        {counter.count}
                    </span>
                </button>
            ))}
        </div>

        <div
            className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1"
            aria-label="Cách xem hàng đợi"
        >
            <button
                type="button"
                className={`btn btn-sm ${
                    viewMode === "table"
                        ? "btn-primary"
                        : "btn-secondary"
                }`}
                aria-pressed={viewMode === "table"}
                onClick={() => setViewMode("table")}
            >
                Bảng gọn
            </button>

            <button
                type="button"
                className={`btn btn-sm ${
                    viewMode === "cards"
                        ? "btn-primary"
                        : "btn-secondary"
                }`}
                aria-pressed={viewMode === "cards"}
                onClick={() => setViewMode("cards")}
            >
                Thẻ KDS gọn
            </button>
        </div>
    </div>

    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 md:px-5">
        <div className="search-box min-w-0 flex-[1_1_240px]">
            <svg
                className="search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
            </svg>

            <input
                aria-label="Tìm mã đơn hoặc tên món"
                placeholder="Tìm mã đơn / tên món"
                className="form-input"
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
            />
        </div>

        <select
            aria-label="Chi nhánh"
            disabled={isBranchScoped()}
            className="form-input form-select !w-auto max-w-full flex-[1_1_220px] md:flex-none"
            value={activeBranchId}
            onChange={event => setBranchFilter(event.target.value)}
        >
            <option value="">Tất cả chi nhánh</option>

            {salesBranches.map(branch => (
                <option key={branch.id} value={branch.id}>
                    {branch.id} — {branch.name}
                </option>
            ))}
        </select>

        <select
            aria-label="Số dòng hiển thị"
            className="form-input form-select !w-auto"
            value={pageSize}
            onChange={event =>
                setPageSize(Number(event.target.value))
            }
        >
            <option value={5}>5 đơn/trang</option>
            <option value={10}>10 đơn/trang</option>
            <option value={20}>20 đơn/trang</option>
        </select>
    </div>
</section>
            {loadError && (<div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                    Không cập nhật được hàng đợi: {loadError}
                    {" "}Dữ liệu đang hiển thị có thể đã cũ. Các nút ghi tạm thời bị khóa.
                </div>
            )}

<PreparationQueueWorkspace
    orders={visibleOrders}
    columns={columns}
    viewMode={viewMode}
    pageSize={pageSize}
    filterKey={JSON.stringify([
        activeBranchId,
        statusFilter,
        search,
    ])}
/>

        </div>
    );
}
