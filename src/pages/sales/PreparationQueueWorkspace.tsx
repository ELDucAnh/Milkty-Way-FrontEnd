import "./preparation-queue.css";
import { useEffect, useId, useState } from "react";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import type { KdsOrder } from "../shared/sales-preparation";
import PreparationRecipePanel, {
    PreparationGroupedItems,
    type PreparationSelection,
} from "./PreparationRecipePanel";

interface PreparationQueueWorkspaceProps {
    orders: readonly KdsOrder[];
    columns: readonly DataTableColumn<KdsOrder>[];
    viewMode: "table" | "cards";
    pageSize: number;
    filterKey: string;
}

export function PreparationQueueSummary({ order }: { order: KdsOrder }) {
    const quantity = order.groups.reduce(
        (total, group) => total + group.quantity,
        0,
    );

    return (
        <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold">
                {quantity} ly · {order.groups.length} nhóm món
            </p>

            <p
                className="max-w-[320px] truncate text-xs text-[var(--muted)]"
                title={order.groups
                    .map(group => `${group.quantity} × ${group.item.name}`)
                    .join(", ")}
            >
                {order.groups
                    .map(group => `${group.quantity} × ${group.item.name}`)
                    .join(", ")}
            </p>

            {order.orderNote && (
                <p className="text-xs font-medium text-amber-700">
                    Có ghi chú toàn đơn
                </p>
            )}
        </div>
    );
}

export default function PreparationQueueWorkspace({
    orders,
    columns,
    viewMode,
    pageSize,
    filterKey,
}: PreparationQueueWorkspaceProps) {
    const groupSelectId = useId();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selection, setSelection] =
        useState<PreparationSelection | null>(null);
    const [activeTab, setActiveTab] = useState<"items" | "recipe">("items");

    // Reset trang khi đổi bộ lọc hoặc số đơn/trang, không reset khi refresh.
    const paginationKey = JSON.stringify([filterKey, pageSize, viewMode]);
    const [pagination, setPagination] = useState({
        key: paginationKey,
        page: 1,
    });

    const size = Number.isFinite(pageSize)
        ? Math.max(1, Math.floor(pageSize))
        : 10;
    const totalPages = Math.max(1, Math.ceil(orders.length / size));
    const requestedPage =
        pagination.key === paginationKey ? pagination.page : 1;
    const currentPage = Math.min(requestedPage, totalPages);
    const start = (currentPage - 1) * size;
    const pageOrders = orders.slice(start, start + size);

    const firstPage = Math.max(
        1,
        Math.min(currentPage - 2, totalPages - 4),
    );
    const pageNumbers = Array.from(
        { length: Math.min(5, totalPages) },
        (_, index) => firstPage + index,
    );

    const selectedOrder =
        orders.find(order => order.id === selectedOrderId) ?? null;

    const selectedGroup =
        selectedOrder?.groups.find(
            group => group.key === selection?.groupKey,
        ) ??
        selectedOrder?.groups[0] ??
        null;

    const selectionMatchesGroup =
        selection?.orderId === selectedOrder?.id &&
        selection?.groupKey === selectedGroup?.key;

    const activeSelection: PreparationSelection | null =
        selectedOrder && selectedGroup
            ? {
                  orderId: selectedOrder.id,
                  groupKey: selectedGroup.key,
                  quantity: selectionMatchesGroup && selection
                      ? Math.min(
                            Math.max(1, selection.quantity),
                            selectedGroup.quantity,
                        )
                      : selectedGroup.quantity,
                  cupLabel: selectionMatchesGroup
                      ? selection?.cupLabel
                      : undefined,
              }
            : null;

    // Đóng chi tiết nếu đơn không còn thuộc danh sách được phép hiển thị.
    useEffect(() => {
        if (selectedOrderId && !selectedOrder) {
            setSelectedOrderId(null);
            setSelection(null);
        }
    }, [selectedOrderId, selectedOrder]);

    function closeDetails() {
        setSelectedOrderId(null);
        setSelection(null);
    }

    function openDetails(order: KdsOrder) {
        const firstGroup = order.groups[0];

        setSelectedOrderId(order.id);
        setActiveTab("items");
        setSelection(
            firstGroup
                ? {
                      orderId: order.id,
                      groupKey: firstGroup.key,
                      quantity: firstGroup.quantity,
                  }
                : null,
        );
    }

    function selectRecipe(next: PreparationSelection) {
        setSelectedOrderId(next.orderId);
        setSelection(next);
        setActiveTab("recipe");
    }

    function changeCardPage(page: number) {
        setPagination({
            key: paginationKey,
            page: Math.min(Math.max(1, page), totalPages),
        });
    }

    function renderColumn(id: string, order: KdsOrder) {
        return columns.find(column => column.id === id)?.render(order) ?? null;
    }

    const tableColumns: readonly DataTableColumn<KdsOrder>[] = columns.map(
        column =>
            column.id === "itemSummary"
                ? {
                      ...column,
                      render: order => (
                          <div className="min-w-[220px] space-y-2">
                              {column.render(order)}

                              <button
                                  type="button"
                                  className="text-xs font-semibold text-[var(--primary-dark)] hover:underline"
                                  onClick={() => openDetails(order)}
                              >
                                  Xem nhóm ly, tùy chọn & công thức
                              </button>
                          </div>
                      ),
                  }
                : column,
    );

    return (
        <>
            <section
                className="card min-w-0 overflow-hidden !p-0"
                aria-label="Hàng đợi pha chế"
            >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-4 md:px-5">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold">
                            Danh sách đơn pha chế
                        </h2>

                        <span className="badge badge-gray">
                            {orders.length} đơn
                        </span>
                    </div>

                    <p className="hidden text-xs text-[var(--muted)] lg:block">
                        Chọn Công thức để xem định lượng và hướng dẫn pha
                    </p>
                </div>

                {viewMode === "table" ? (
                    <DataTable
                        key={filterKey}
                        columns={tableColumns}
                        data={orders}
                        rowKey={order => order.id}
                        caption="Hàng đợi pha chế chi nhánh MilktyWay"
                        pagination
                        pageSize={size}
                    />
                ) : (
                    <>
                        {pageOrders.length === 0 ? (
                            <div className="px-4 py-14 text-center text-sm text-[var(--muted)]">
                                Không có đơn phù hợp.
                            </div>
                        ) : (
                            <div className="grid min-w-0 gap-4 bg-[var(--background)] p-3 md:p-4 xl:grid-cols-2 2xl:grid-cols-3">
                                {pageOrders.map(order => {
                                    const quantity = order.groups.reduce(
                                        (total, group) =>
                                            total + group.quantity,
                                        0,
                                    );

                                    return (
                                        <article
                                            key={order.id}
                                            className="flex h-[390px] min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                                            aria-label={`Đơn pha chế ${order.id}`}
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2 p-4 pb-3">
                                                {renderColumn("id", order)}
                                                {renderColumn("status", order)}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 border-y border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                                                <span>
                                                    <strong className="text-[var(--text)]">
                                                        {quantity} ly
                                                    </strong>
                                                    {" · "}
                                                    {order.groups.length} nhóm món
                                                </span>

                                                <span>Nhóm ly / tùy chọn</span>
                                            </div>

                                            <div
                                                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
                                                tabIndex={0}
                                                aria-label={`Danh sách món đơn ${order.id}, cuộn để xem thêm`}
                                            >
                                                <PreparationGroupedItems
                                                    order={order}
                                                    onSelect={selectRecipe}
                                                    compact
                                                />
                                            </div>

                                            <div className="shrink-0 space-y-2 border-t border-[var(--border)] px-4 py-3">
                                                {renderColumn("actions", order)}

                                                <button
                                                    type="button"
                                                    className="text-xs text-[var(--muted)] hover:text-[var(--primary-dark)] hover:underline"
                                                    onClick={() =>
                                                        openDetails(order)
                                                    }
                                                >
                                                    Xem nhóm ly, dòng gốc và
                                                    tách từng ly
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        <div className="table-footer">
                            <div className="table-footer-info">
                                Hiển thị {orders.length === 0 ? 0 : start + 1}
                                –{Math.min(start + size, orders.length)}
                                {" / "}
                                {orders.length}
                            </div>

                            <nav
                                className="pagination"
                                aria-label="Phân trang thẻ pha chế"
                            >
                                <button
                                    type="button"
                                    className="page-btn"
                                    disabled={currentPage === 1}
                                    aria-label="Trang trước"
                                    onClick={() =>
                                        changeCardPage(currentPage - 1)
                                    }
                                >
                                    ‹
                                </button>

                                {pageNumbers.map(page => (
                                    <button
                                        key={page}
                                        type="button"
                                        className={`page-btn ${
                                            page === currentPage
                                                ? "active"
                                                : ""
                                        }`}
                                        aria-current={
                                            page === currentPage
                                                ? "page"
                                                : undefined
                                        }
                                        aria-label={`Trang ${page}`}
                                        onClick={() => changeCardPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    className="page-btn"
                                    disabled={currentPage === totalPages}
                                    aria-label="Trang sau"
                                    onClick={() =>
                                        changeCardPage(currentPage + 1)
                                    }
                                >
                                    ›
                                </button>
                            </nav>
                        </div>
                    </>
                )}
            </section>

            <Modal
                open={selectedOrder !== null}
                title={`Công thức pha chế — ${selectedOrder?.id ?? ""}`}
                size="lg"
                className="kds-detail-dialog"
                onClose={closeDetails}
                footer={
                    selectedOrder ? (
                        <div className="flex w-full flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-[var(--muted)]">
                                {selectedOrder.id}
                                {" · "}
                                {selectedOrder.branchId}
                                {" · "}
                                {selectedOrder.waitingMinutes} phút chờ
                            </p>

                            {renderColumn("actions", selectedOrder)}
                        </div>
                    ) : undefined
                }
            >
                {selectedOrder && (
                    <div className="min-w-0 space-y-4">
                        <div
                            className="tab-nav"
                            aria-label="Nội dung chi tiết pha chế"
                        >
                            <button
                                type="button"
                                className={`tab-btn ${
                                    activeTab === "items" ? "active" : ""
                                }`}
                                aria-pressed={activeTab === "items"}
                                onClick={() => setActiveTab("items")}
                            >
                                Nhóm ly / tùy chọn
                            </button>

                            <button
                                type="button"
                                className={`tab-btn ${
                                    activeTab === "recipe" ? "active" : ""
                                }`}
                                aria-pressed={activeTab === "recipe"}
                                disabled={!selectedGroup}
                                onClick={() => setActiveTab("recipe")}
                            >
                                Công thức pha chế
                            </button>
                        </div>

                        {activeTab === "items" ? (
                            <PreparationGroupedItems
                                key={selectedOrder.id}
                                order={selectedOrder}
                                onSelect={selectRecipe}
                            />
                        ) : (
                            <div className="min-w-0 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_170px] gap-3 items-start">
                                <div className="min-w-0">
                                    <label
                                        className="form-label"
                                        htmlFor={groupSelectId}
                                    >
                                        Nhóm món trong đơn
                                    </label>

                                    <select
                                        id={groupSelectId}
                                        className="form-input form-select"
                                        value={selectedGroup?.key ?? ""}
                                        onChange={event => {
                                            const group =
                                                selectedOrder.groups.find(
                                                    item =>
                                                        item.key ===
                                                        event.target.value,
                                                );

                                            if (!group) return;

                                            selectRecipe({
                                                orderId: selectedOrder.id,
                                                groupKey: group.key,
                                                quantity: group.quantity,
                                            });
                                        }}
                                    >
                                        {selectedOrder.groups.map(group => (
                                            <option
                                                key={group.key}
                                                value={group.key}
                                            >
                                                {group.quantity} ×{" "}
                                                {group.item.name}
                                                {" · "}
                                                Size {group.item.size}
                                                {" · "}
                                                Đường {group.item.sugar}
                                                {" · "}
                                                {group.item.ice}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {activeSelection && selectedGroup && <label className="form-label" htmlFor={`${groupSelectId}-quantity`}>
                                    Số ly — tối đa {selectedGroup.quantity}
                                    <input id={`${groupSelectId}-quantity`} className="form-input" type="number" min={1} max={selectedGroup.quantity} step={1} value={activeSelection.quantity} onChange={event => {
                                        const quantity = Number(event.target.value);
                                        if (Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= selectedGroup.quantity) {
                                            setSelection({ ...activeSelection, quantity, cupLabel: undefined });
                                        }
                                    }} />
                                </label>}
                                </div>

                                <PreparationRecipePanel
                                    embedded
                                    order={selectedOrder}
                                    group={selectedGroup}
                                    selection={activeSelection}
                                    onQuantityChange={quantity => {
                                        if (!activeSelection) return;

                                        setSelection({
                                            ...activeSelection,
                                            quantity,
                                            cupLabel: undefined,
                                        });
                                    }}
                                    onClose={closeDetails}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
}
