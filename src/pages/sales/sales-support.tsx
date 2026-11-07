import { isCashier, cashierCanVisit } from "../../utils/auth";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BadgeVariant } from "../../components/common/Badge";

export {
    formatCurrency,
    formatDate,
    formatDateTime,
    parseVietnameseDate,
} from "../../utils/format";

export { salesBranches as branches } from "../../data/sales/branches";

export type SalesChannel = "counter" | "takeaway" | "online";
export type SalesShift = "morning" | "afternoon" | "evening";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type PreparationStatus = "waiting" | "preparing" | "ready";
export type DeliveryStatus = "pickup" | "waiting" | "delivering" | "delivered";

export interface StatusDisplay {
    label: string;
    variant: BadgeVariant;
}

export interface SalesOrder {
    id: string;
    branchId: string;
    shift: SalesShift;
    customer: string;
    phone: string;
    channel: SalesChannel;
    createdAt: string;
    total: number;
    payment: PaymentStatus;
    preparation: PreparationStatus | null;
    delivery: DeliveryStatus | null;
    largeOrder: boolean;
}

export const channelLabels: Record<SalesChannel, string> = {
    counter: "Tại quầy",
    takeaway: "Mang đi",
    online: "Trực tuyến",
};

export const channelVariants: Record<SalesChannel, BadgeVariant> = {
    counter: "gray",
    takeaway: "info",
    online: "purple",
};

export const shiftLabels: Record<SalesShift, string> = {
    morning: "Ca sáng",
    afternoon: "Ca chiều",
    evening: "Ca tối",
};

export const paymentStatuses: Record<PaymentStatus, StatusDisplay> = {
    unpaid: { label: "Chưa thanh toán", variant: "warning" },
    paid: { label: "Đã thanh toán", variant: "success" },
    refunded: { label: "Đã hoàn tiền", variant: "info" },
};

export const preparationStatuses: Record<PreparationStatus, StatusDisplay> = {
    waiting: { label: "Chờ pha chế", variant: "warning" },
    preparing: { label: "Đang pha chế", variant: "info" },
    ready: { label: "Sẵn sàng", variant: "success" },
};

export const deliveryStatuses: Record<DeliveryStatus, StatusDisplay> = {
    pickup: { label: "Nhận tại cửa hàng", variant: "info" },
    waiting: { label: "Chờ giao", variant: "warning" },
    delivering: { label: "Đang giao", variant: "info" },
    delivered: { label: "Đã giao", variant: "success" },
};

export const recentOrders: readonly SalesOrder[] = [
    {
        id: "DH-00125",
        branchId: "CN01",
        shift: "morning",
        customer: "Nguyễn An",
        phone: "0900 000 001",
        channel: "online",
        createdAt: "2026-10-28T09:15:00+07:00",
        total: 450000,
        payment: "paid",
        preparation: "preparing",
        delivery: "waiting",
        largeOrder: true,
    },
    {
        id: "DH-00124",
        branchId: "CN01",
        shift: "morning",
        customer: "Trần Bình",
        phone: "0900 000 002",
        channel: "takeaway",
        createdAt: "2026-10-28T09:12:00+07:00",
        total: 35000,
        payment: "paid",
        preparation: null,
        delivery: null,
        largeOrder: false,
    },
    {
        id: "DH-00123",
        branchId: "CN02",
        shift: "morning",
        customer: "Lê Minh",
        phone: "0900 000 003",
        channel: "counter",
        createdAt: "2026-10-28T09:05:00+07:00",
        total: 78000,
        payment: "paid",
        preparation: null,
        delivery: null,
        largeOrder: false,
    },
];

/** Bảng sales.html gốc chỉ có một dòng chi tiết. */
export const initialSalesOrders: readonly SalesOrder[] =
    recentOrders.filter((order) => order.id === "DH-00125");

export interface SalesPageHeaderProps {
    title: string;
    breadcrumb: string;
    description: string;
    actions?: ReactNode;
    parent?: {
        label: string;
        to: string;
    };
}

export function SalesPageHeader({
    title,
    breadcrumb,
    description,
    actions,
    parent = { label: "Bán hàng", to: "/sales" },
}: SalesPageHeaderProps) {
    return (
        <div className="page-header">
            <div>
                <nav className="breadcrumb" aria-label="Đường dẫn trang">
                    <Link to={isCashier() ? "/sales/pos" : "/dashboard"}>Trang chủ</Link>
                    <span className="sep" aria-hidden="true">/</span>

                    {parent && parent.label && (
                        <>
                            {isCashier() && !cashierCanVisit(parent.to) ? <span>{parent.label}</span> : <Link to={parent.to}>{parent.label}</Link>}
                            <span className="sep" aria-hidden="true">/</span>
                        </>
                    )}

                    <span className="current" aria-current="page">
                        {breadcrumb}
                    </span>
                </nav>

                <h1 className="page-title">{title}</h1>
                <p className="page-subtitle">{description}</p>
            </div>

            {actions && (
                <div className="page-header-actions">{actions}</div>
            )}
        </div>
    );
}

export function SalesStatIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M4 19V5M4 19h16M8 15l4-5 4 3 4-7" />
        </svg>
    );
}