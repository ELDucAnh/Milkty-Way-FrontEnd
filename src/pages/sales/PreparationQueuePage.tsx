import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import { salesBranches } from "../../data/sales/branches";
import {
    initialPreparationOrders,
    isPreparationStatus,
} from "../../data/sales/preparation";
import type {
    PreparationChannel,
    PreparationFilters,
    PreparationOrder,
    PreparationStatus,
} from "../../data/sales/preparation";
import { formatDateTime } from "../../utils/format";

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

const initialFilters: PreparationFilters = {
    branchId: "CN01",
    status: "",
};

export default function PreparationQueuePage() {
    const toast = useToast();
    const [pageSize, setPageSize] = useState(10);

    const [orders, setOrders] = useState<PreparationOrder[]>(() =>
        initialPreparationOrders.map((order) => ({ ...order })),
    );

    const [draftFilters, setDraftFilters] =
        useState<PreparationFilters>(initialFilters);

    const [appliedFilters, setAppliedFilters] =
        useState<PreparationFilters>(initialFilters);

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
        const emptyFilters: PreparationFilters = {
            branchId: "",
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
                item.id === orderId && item.status === order.status
                    ? { ...item, status: nextStatus }
                    : item,
            ),
        );

        toast.success(
            `Đã cập nhật đơn ${orderId}: ${statusDisplay[nextStatus].label}.`,
            { title: "Pha chế" },
        );
    }

    const columns: readonly DataTableColumn<PreparationOrder>[] = [
        {
            id: "id",
            header: "Mã đơn",
            className: "whitespace-nowrap",
            render: (order) => order.id,
        },
        {
            id: "channel",
            header: "Kênh",
            render: (order) => {
                const display = channelDisplay[order.channel];

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
            header: "Chờ",
            className: "whitespace-nowrap",
            render: (order) => `${order.waitingMinutes} phút`,
        },
        {
            id: "items",
            header: "Món và tùy chọn",
            render: (order) => (
                <>
                    <div
                        className={
                            order.optionSummary
                                ? "font-semibold name-ellipsis"
                                : ""
                        }
                        title={order.itemSummary}
                    >
                        {order.itemSummary}
                    </div>

                    {order.optionSummary && (
                        <div className="text-xs text-[var(--muted)]">
                            {order.optionSummary}
                        </div>
                    )}
                </>
            ),
        },
        {
            id: "note",
            header: "Ghi chú",
            render: (order) => order.note,
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
            header: "Thao tác",
            className: "whitespace-nowrap",
            render: (order) => (
                <div className="inline-flex items-center gap-1.5">
                    {order.status !== "ready" && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm shrink-0"
                            onClick={() => handleAdvanceStatus(order.id)}
                        >
                            {order.status === "waiting"
                                ? "Pha chế"
                                : "Món đã sẵn sàng"}
                        </button>
                    )}

                    {order.status === "waiting" && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm shrink-0"
                            onClick={() =>
                                toast.info(
                                    `Chưa gửi báo thiếu cho đơn ${order.id}; chức năng đang chờ tích hợp với module kho.`,
                                    { title: "Báo thiếu" },
                                )
                            }
                        >
                            Báo thiếu
                        </button>
                    )}

                    {order.status === "ready" && (
                        <span className="text-sm text-[var(--muted)]">
                            Chờ bàn giao
                        </span>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="page-header">
                <div>
                    <nav
                        className="breadcrumb"
                        aria-label="Đường dẫn trang"
                    >
                        <Link to="/dashboard">Trang chủ</Link>
                        <span className="sep" aria-hidden="true">
                            /
                        </span>
                        <Link to="/sales">Bán hàng</Link>
                        <span className="sep" aria-hidden="true">
                            /
                        </span>
                        <span
                            className="current"
                            aria-current="page"
                        >
                            Hàng đợi pha chế
                        </span>
                    </nav>

                    <h1 className="page-title">
                        Hàng đợi pha chế
                    </h1>

                    <p className="page-subtitle">
                        Chỉ hiển thị đơn đủ điều kiện chuyển đến quầy pha chế.
                    </p>
                </div>
            </div>

            <section
                className="card mb-6"
                aria-labelledby="prep-filter-title"
            >
                <h2
                    id="prep-filter-title"
                    className="card-title mb-4"
                >
                    Bộ lọc hàng đợi
                </h2>

                <form onSubmit={handleApplyFilters}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div className="min-w-0">
                            <label
                                className="form-label"
                                htmlFor="prep-branch"
                            >
                                Chi nhánh
                            </label>

                            <select
                                id="prep-branch"
                                className="form-input form-select w-full h-11"
                                value={draftFilters.branchId}
                                onChange={(event) =>
                                    setDraftFilters((current) => ({
                                        ...current,
                                        branchId: event.target.value,
                                    }))
                                }
                            >
                                <option value="">
                                    Tất cả 12 chi nhánh
                                </option>

                                {salesBranches.map((branch) => (
                                    <option
                                        key={branch.id}
                                        value={branch.id}
                                    >
                                        {branch.id} — {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-0">
                            <label
                                className="form-label"
                                htmlFor="prep-status"
                            >
                                Trạng thái pha chế
                            </label>

                            <select
                                id="prep-status"
                                className="form-input form-select w-full h-11"
                                value={draftFilters.status}
                                onChange={(event) => {
                                    const value = event.target.value;

                                    if (
                                        value === "" ||
                                        isPreparationStatus(value)
                                    ) {
                                        setDraftFilters((current) => ({
                                            ...current,
                                            status: value,
                                        }));
                                    }
                                }}
                            >
                                <option value="">
                                    Tất cả trạng thái
                                </option>
                                <option value="waiting">
                                    Chờ pha chế
                                </option>
                                <option value="preparing">
                                    Đang pha chế
                                </option>
                                <option value="ready">
                                    Sẵn sàng
                                </option>
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary h-11"
                            >
                                Áp dụng
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary h-11"
                                onClick={handleResetFilters}
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <section className="card">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h2 className="card-title">Hàng đợi · {visibleOrders.length} đơn</h2>
                    <label className="flex items-center gap-2 text-sm">Số dòng mỗi trang
                        <select className="form-input form-select !w-auto" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                            {[1, 5, 10, 20].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                </div>
                <DataTable<PreparationOrder>
                    key={`${appliedFilters.branchId}-${appliedFilters.status}-${pageSize}`}
                    columns={columns}
                    data={visibleOrders}
                    rowKey={(order) => order.id}
                    caption="Hàng đợi pha chế và đơn sẵn sàng"
                    pagination
                    pageSize={pageSize}
                    emptyMessage="Không có đơn phù hợp với bộ lọc."
                />
            </section>
        </>
    );
}