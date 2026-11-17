<<<<<<< Updated upstream
import { useState } from "react";
import type { FormEvent } from "react";
=======
import { RETURNS_CHANGED } from "../shared/sales-returns-store";
import { can, homePath, isBranchScoped, scopedBranch, currentStaff, STAFF_SESSION_CHANGED } from "../../utils/auth";
import { useEffect, useState } from "react";
>>>>>>> Stashed changes
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import { salesBranches } from "../../data/sales/branches";
import { formatDateTime } from "../../utils/format";
import { loadPreparationQueue, changePreparation, canManagePreparation, type KdsOrder, type PreparationAction } from "../shared/sales-preparation";
import PreparationRecipePanel, { PreparationGroupedItems, type PreparationSelection } from "./PreparationRecipePanel";
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

<<<<<<< Updated upstream
function getOrdersFromStore(): PreparationOrder[] {
    const orders = loadOrders();
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
        branchId: "CN01",
        status: "",
    });

    const [appliedFilters, setAppliedFilters] = useState<{ branchId: string; status: string }>({
        branchId: "CN01",
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
            branchId: "",
            status: "",
=======
export default function PreparationQueuePage() {
    const toast = useToast();
    const [pageSize, setPageSize] = useState(10);
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");
    const [orders, setOrders] = useState<KdsOrder[]>([]);
    const [loadError, setLoadError] = useState("");
    const [selection, setSelection] = useState<PreparationSelection | null>(null);
    const [panelClosed, setPanelClosed] = useState(false);
    function selectRecipe(next: PreparationSelection) {
        setPanelClosed(false);
        setSelection(next);
    }

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
>>>>>>> Stashed changes
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
    const fallbackOrder = panelClosed ? undefined : visibleOrders.find(order => order.status === "preparing" && order.groups.length);
    const chosenOrder = visibleOrders.find(order => order.id === selection?.orderId);
    const chosenGroup = chosenOrder?.groups.find(group => group.key === selection?.groupKey);
    const selectedOrder = chosenGroup ? chosenOrder! : fallbackOrder ?? null;
    const selectedGroup = chosenGroup ?? selectedOrder?.groups[0] ?? null;
    const activeSelection: PreparationSelection | null = selectedOrder && selectedGroup ? {
        orderId: selectedOrder.id,
        groupKey: selectedGroup.key,
        quantity: chosenGroup && selection ? Math.min(Math.max(1, selection.quantity), selectedGroup.quantity) : selectedGroup.quantity,
        cupLabel: chosenGroup ? selection?.cupLabel : undefined,
    } : null;
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
            render: order => <PreparationGroupedItems order={order} onSelect={selectRecipe} />,
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
<<<<<<< Updated upstream
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
                    {order.status === "ready" && (
                        <span className="text-xs text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
                            Đã hoàn tất
                        </span>
                    )}
                    {order.status !== "ready" && (
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
=======
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
>>>>>>> Stashed changes
        },
    ];

    return (
        <div className="space-y-6">
            <div className="page-header">
                <div>
                    <nav className="breadcrumb" aria-label="Đường dẫn trang">
                        <Link to="/dashboard">Trang chủ</Link>
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
                <div className="page-header-actions">
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
                    <Link to="/sales/pos" className="btn btn-primary">
                        Về quầy POS
                    </Link>
                </div>
            </div>

            <section className="card flex flex-wrap items-center gap-3" aria-label="Bộ lọc hàng đợi">
                <div className="flex gap-1" aria-label="Cách xem hàng đợi">
                    <button type="button" className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-secondary"}`} aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")}>Bảng gọn</button>
                    <button type="button" className={`btn btn-sm ${viewMode === "cards" ? "btn-primary" : "btn-secondary"}`} aria-pressed={viewMode === "cards"} onClick={() => setViewMode("cards")}>Thẻ KDS gọn</button>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Trạng thái pha chế">
                    {counters.map(counter => <button key={counter.value} type="button" aria-pressed={statusFilter === counter.value} className={`btn btn-sm ${statusFilter === counter.value ? "btn-primary" : "btn-secondary"}`} onClick={() => setStatusFilter(counter.value)}>{counter.label} ({counter.count})</button>)}
                </div>
                <input aria-label="Tìm mã đơn hoặc tên món" placeholder="Tìm mã đơn / tên món" className="form-input min-w-[180px] flex-1" value={search} onChange={event => setSearch(event.target.value)} />
                <select aria-label="Chi nhánh" disabled={isBranchScoped()} className="form-input form-select !w-auto max-w-full" value={activeBranchId} onChange={event => setBranchFilter(event.target.value)}>
                    <option value="">Tất cả chi nhánh</option>
                    {salesBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.id} — {branch.name}</option>)}
                </select>
                <select aria-label="Số dòng hiển thị" className="form-input form-select !w-auto" value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
                    <option value={5}>5 đơn/trang</option><option value={10}>10 đơn/trang</option><option value={20}>20 đơn/trang</option>
                </select>
            </section>
            {loadError && (<div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
<<<<<<< Updated upstream
                    <div>
                        <label className="form-label" htmlFor="kds-branch">
                            Chi nhánh
                        </label>
                        <select
                            id="kds-branch"
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
=======
                    Không cập nhật được hàng đợi: {loadError}
                    {" "}Dữ liệu đang hiển thị có thể đã cũ. Các nút ghi tạm thời bị khóa.
                </div>
            )}
>>>>>>> Stashed changes

            <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-12">
                <section
                    className="card min-w-0 overflow-hidden p-0 lg:col-span-8"
                    aria-label="Bảng hàng đợi pha chế"
                >
                    {viewMode === "cards" ? <div className="grid gap-3 p-3 xl:grid-cols-2">
                        {visibleOrders.length === 0 && <p className="p-3 text-sm text-[var(--muted)]">Không có đơn phù hợp.</p>}
                        {visibleOrders.map(order => <article key={order.id} className="min-w-0 rounded-lg border border-[var(--border)] p-3 space-y-3">
                            <div className="flex flex-wrap justify-between gap-2">{columns[0].render?.(order)}{columns[2].render?.(order)}</div>
                            <PreparationGroupedItems order={order} onSelect={selectRecipe} />
                            {columns[3].render?.(order)}
                        </article>)}
                    </div> : <div className="overflow-x-auto">
                        <DataTable
                            columns={columns}
                            data={visibleOrders}
                            rowKey={order => order.id}
                            caption="Hàng đợi pha chế chi nhánh MilktyWay"
                            pagination
                            pageSize={pageSize}
                        />
                    </div>}
                </section>

                <div className="min-w-0 lg:col-span-4 lg:sticky lg:top-4"><PreparationRecipePanel
                    order={selectedOrder}
                    group={selectedGroup}
                    selection={activeSelection}
                    onQuantityChange={quantity =>
                        setSelection(() =>
                            activeSelection
                                ? { ...activeSelection, quantity, cupLabel: undefined }
                                : null,
                        )
                    }
                    onClose={() => { setSelection(null); setPanelClosed(true); }}
                /></div>
            </div>

        </div>
    );
}
