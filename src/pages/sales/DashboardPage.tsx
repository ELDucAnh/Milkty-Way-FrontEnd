import TemplateChart from "../../components/sales/TemplateChart";
import { salesData, customerData } from "../../data/sales/charts";
import { useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import StatCard from "../../components/common/StatCard";
import { useToast } from "../../components/common/useToast";
import {
    branches,
    channelLabels,
    channelVariants,
    formatCurrency,
    formatDateTime,
    parseVietnameseDate,
    paymentStatuses,
    recentOrders,
    SalesStatIcon,
    shiftLabels,
} from "./sales-support";
import type { SalesOrder } from "./sales-support";

interface DashboardFilters {
    branchId: string;
    shift: string;
    from: string;
    to: string;
}

interface LowStockIngredient {
    id: string;
    name: string;
    available: number;
    minimum: number;
    unit: string;
}

interface DashboardMetric {
    label: string;
    value: string | number;
}

const emptyFilters: DashboardFilters = {
    branchId: "",
    shift: "",
    from: "",
    to: "",
};

const ingredients: readonly LowStockIngredient[] = [
    { id: "NL-TCK", name: "Trân châu khô", available: 15, minimum: 30, unit: "kg" },
    { id: "NL-TOL", name: "Trà ô long", available: 8, minimum: 20, unit: "kg" },
    { id: "NL-ST", name: "Sữa tươi", available: 0, minimum: 50, unit: "lít" },
];

const revenueMetrics: readonly DashboardMetric[] = [
    { label: "Tổng đơn hàng · 786 giao dịch", value: formatCurrency(17584) },
    { label: "Doanh thu · Thu nhập ròng", value: formatCurrency(17584) },
    { label: "Chi phí · Chi phí vận hành", value: formatCurrency(12487) },
    { label: "Lợi nhuận · Biên lợi nhuận ròng", value: formatCurrency(5097) },
];

const purchaseMetrics: readonly DashboardMetric[] = [
    { label: "Số đơn mua", value: 45 },
    { label: "Chi phí mua hàng", value: formatCurrency(786) },
    { label: "Đơn đã hủy", value: "04" },
    { label: "Đổi trả", value: "07" },
];

export default function DashboardPage() {
    const toast = useToast();
    const [draft, setDraft] = useState<DashboardFilters>(emptyFilters);
    const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);
    const [salesPeriod, setSalesPeriod] = useState("monthly");
    const [customerPeriod, setCustomerPeriod] = useState("monthly");

    const from = filters.from ? parseVietnameseDate(filters.from) : null;
    const to = filters.to ? parseVietnameseDate(filters.to) : null;

    const visibleOrders = recentOrders.filter((order) => {
        // Dữ liệu mẫu có timestamp UTC+7, cùng múi giờ nghiệp vụ.
        const businessDate = order.createdAt.slice(0, 10);

        return (
            (!filters.branchId || order.branchId === filters.branchId) &&
            (!filters.shift || order.shift === filters.shift) &&
            (!from || businessDate >= from) &&
            (!to || businessDate <= to)
        );
    });

    function applyFilters() {
        const fromDate = draft.from ? parseVietnameseDate(draft.from) : null;
        const toDate = draft.to ? parseVietnameseDate(draft.to) : null;

        if (
            (draft.from && !fromDate) ||
            (draft.to && !toDate) ||
            (fromDate && toDate && fromDate > toDate)
        ) {
            toast.warning("Khoảng ngày không hợp lệ. Vui lòng nhập dd/MM/yyyy.");
            return;
        }

        setFilters({ ...draft });
        toast.info("Đã áp dụng bộ lọc.");
    }

    function setPeriodStart(period: "month" | "year") {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).formatToParts(new Date());

        const day = parts.find((part) => part.type === "day")?.value ?? "01";
        const month = parts.find((part) => part.type === "month")?.value ?? "01";
        const year = parts.find((part) => part.type === "year")?.value ?? "2026";

        setDraft((current) => ({
            ...current,
            from: `01/${period === "year" ? "01" : month}/${year}`,
            to: `${day}/${month}/${year}`,
        }));
    }

    const orderColumns: readonly DataTableColumn<SalesOrder>[] = [
        {
            id: "id",
            header: "Mã đơn",
            render: (order) => (
                <>
                    <div className="font-semibold whitespace-nowrap">{order.id}</div>
                    {order.largeOrder && <Badge variant="warning">Đơn lớn</Badge>}
                </>
            ),
        },
        {
            id: "branch",
            header: "Chi nhánh / Ca",
            className: "whitespace-nowrap",
            render: (order) => `${order.branchId} · ${shiftLabels[order.shift]}`,
        },
        {
            id: "customer",
            header: "Khách hàng",
            render: (order) => (
                <>
                    <div className="font-medium name-ellipsis" title={order.customer}>
                        {order.customer}
                    </div>
                    <div className="text-xs text-[var(--muted)] whitespace-nowrap">
                        {order.phone}
                    </div>
                </>
            ),
        },
        {
            id: "channel",
            header: "Kênh bán",
            render: (order) => (
                <Badge variant={channelVariants[order.channel]}>
                    {channelLabels[order.channel]}
                </Badge>
            ),
        },
        {
            id: "time",
            header: "Thời gian",
            className: "whitespace-nowrap",
            render: (order) => (
                <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
            ),
        },
        {
            id: "total",
            header: "Tổng tiền",
            className: "font-semibold whitespace-nowrap",
            render: (order) => formatCurrency(order.total),
        },
        {
            id: "payment",
            header: "Thanh toán",
            render: (order) => (
                <Badge variant={paymentStatuses[order.payment].variant}>
                    {paymentStatuses[order.payment].label}
                </Badge>
            ),
        },
        {
            id: "actions",
            header: "Thao tác",
            render: (order) => (
                <Link className="btn btn-secondary btn-sm" to={`/invoices/invoice-details?orderId=${encodeURIComponent(order.id)}`}>Xem</Link>
            ),
        },
    ];

    const stockColumns: readonly DataTableColumn<LowStockIngredient>[] = [
        {
            id: "name",
            header: "Nguyên liệu",
            render: (item) => (
                <span className="name-ellipsis" title={item.name}>{item.name}</span>
            ),
        },
        { id: "id", header: "Mã nguyên liệu", render: (item) => item.id },
        {
            id: "available",
            header: "Tồn khả dụng",
            render: (item) => <span className={item.available === 0 ? "text-[var(--danger)] font-semibold" : "text-[var(--warning)] font-semibold"}>{item.available} {item.unit}</span>,
        },
        {
            id: "minimum",
            header: "Ngưỡng tối thiểu",
            render: (item) => `${item.minimum} ${item.unit}`,
        },
        {
            id: "status",
            header: "Trạng thái",
            render: (item) => (
                <Badge variant={item.available === 0 ? "danger" : "warning"}>
                    {item.available === 0 ? "Hết tồn khả dụng" : "Dưới ngưỡng"}
                </Badge>
            ),
        },
        {
            id: "actions",
            header: "Thao tác",
            render: (item) => (
                <Link className="btn btn-outline btn-sm" to="/purchases/new">Đặt mua</Link>
            ),
        },
    ];

    return (
        <div className="max-w-[1400px]">
            <div className="welcome-banner animate-slideInUp">
                <div className="welcome-banner-content">
                    <div className="welcome-banner-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                    <div>
                        <h1 className="welcome-title">Chào mừng trở lại, Anh!</h1>
                        <p className="welcome-subtitle">
                            Theo dõi doanh thu, số ly bán và cảnh báo tại các chi nhánh.
                        </p>
                    </div>
                </div>
                <div className="welcome-actions">
                    <button
                        type="button"
                        className="btn-welcome-outline"
                        onClick={() => setPeriodStart("month")}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Từ đầu tháng
                    </button>
                    <button
                        type="button"
                        className="btn-welcome-outline"
                        onClick={() => setPeriodStart("year")}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Từ đầu năm
                    </button>
                    <button
                        type="button"
                        className="btn-welcome-export"
                        onClick={() => toast.info("Chưa tích hợp xuất dữ liệu tổng quan.")}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Xuất dữ liệu
                    </button>
                </div>
            </div>

            <section className="card mb-6" aria-labelledby="dashboard-filter-title">
                <h2 id="dashboard-filter-title" className="card-title mb-4">Bộ lọc tổng quan</h2>
                <form onSubmit={(event) => {
                    event.preventDefault();
                    applyFilters();
                }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                        <div className="min-w-0">
                            <label className="form-label" htmlFor="dashboard-branch">Chi nhánh</label>
                            <select
                                id="dashboard-branch"
                                className="form-input form-select w-full h-11"
                                value={draft.branchId}
                                onChange={(event) => setDraft((current) => ({
                                    ...current, branchId: event.target.value,
                                }))}
                            >
                                <option value="">Toàn chuỗi — 12 chi nhánh</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.id} — {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-0">
                            <label className="form-label" htmlFor="dashboard-shift">Ca làm việc</label>
                            <select
                                id="dashboard-shift"
                                className="form-input form-select w-full h-11"
                                value={draft.shift}
                                onChange={(event) => setDraft((current) => ({
                                    ...current, shift: event.target.value,
                                }))}
                            >
                                <option value="">Tất cả ca</option>
                                {Object.entries(shiftLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-0">
                            <label className="form-label" htmlFor="dashboard-from">Từ ngày</label>
                            <input
                                id="dashboard-from"
                                className="form-input w-full h-11"
                                placeholder="dd/MM/yyyy"
                                maxLength={10}
                                value={draft.from}
                                onChange={(event) => setDraft((current) => ({
                                    ...current, from: event.target.value,
                                }))}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="form-label" htmlFor="dashboard-to">Đến ngày</label>
                            <input
                                id="dashboard-to"
                                className="form-input w-full h-11"
                                placeholder="dd/MM/yyyy"
                                maxLength={10}
                                value={draft.to}
                                onChange={(event) => setDraft((current) => ({
                                    ...current, to: event.target.value,
                                }))}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <button type="submit" className="btn btn-primary h-11">Áp dụng</button>
                        <button
                            type="button"
                            className="btn btn-secondary h-11"
                            onClick={() => {
                                setDraft(emptyFilters);
                                setFilters(emptyFilters);
                            }}
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </form>
                
            </section>

      <div className="page-section grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        
        <div className="dash-stat-card animate-slideInUp stagger-1">
          <div className="dash-stat-top">
            <div className="dash-stat-icon icon-bg-success">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="trend-up">↑ 8.2%</div>
          </div>
          
          <div className="dash-stat-value">786</div>
          <div className="dash-stat-label">Số ly đã bán</div>
          <div className="dash-stat-bar"><div className="dash-stat-bar-fill" style={{ width: "78%", background: "var(--primary)" }}></div></div>
        </div>

        
        <div className="dash-stat-card animate-slideInUp stagger-2">
          <div className="dash-stat-top">
            <div className="dash-stat-icon icon-bg-info">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div className="trend-up">↑ 12.5%</div>
          </div>
          
          <div className="dash-stat-value">35.370.000 VND</div>
          <div className="dash-stat-label">Doanh thu</div>
          <div className="dash-stat-bar"><div className="dash-stat-bar-fill" style={{ width: "85%", background: "var(--info)" }}></div></div>
        </div>

        
        <div className="dash-stat-card animate-slideInUp stagger-3">
          <div className="dash-stat-top">
            <div className="dash-stat-icon icon-bg-danger">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            </div>
            <div className="trend-down">↓ 3.1%</div>
          </div>
          
          <div className="dash-stat-value">12</div>
          <div className="dash-stat-label">Lô nguyên liệu cận hạn</div>
          <div className="dash-stat-bar"><div className="dash-stat-bar-fill" style={{ width: "62%", background: "var(--danger)" }}></div></div>
        </div>

        
        
        <div className="dash-stat-card animate-slideInUp stagger-4">
          <div className="dash-stat-top">
            <div className="dash-stat-icon icon-bg-warning">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div className="trend-up">↑ 18.4%</div>
          </div>
          
          <div className="dash-stat-value">2</div>
          <div className="dash-stat-label">Chi nhánh cần xem xét hòa vốn</div>
          <div className="dash-stat-bar"><div className="dash-stat-bar-fill" style={{ width: "45%", background: "var(--warning)" }}></div></div>
        </div>
      </div>



      
      <div className="page-section grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        
        <div className="card lg:col-span-2 animate-slideInUp stagger-3">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-card-icon icon-bg-primary w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div>
                <h2 className="card-title">Doanh thu theo thời gian</h2>
                <p className="card-subtitle">Tổng quan doanh thu theo tháng</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setSalesPeriod("daily")} className={`btn btn-sm ${salesPeriod === "daily" ? "btn-primary" : "btn-secondary"}`} aria-label="Xem đơn hàng theo ngày">Ngày</button>
              <button onClick={() => setSalesPeriod("weekly")} className={`btn btn-sm ${salesPeriod === "weekly" ? "btn-primary" : "btn-secondary"}`} aria-label="Xem đơn hàng theo tuần">Tuần</button>
              <button onClick={() => setSalesPeriod("monthly")} className={`btn btn-sm ${salesPeriod === "monthly" ? "btn-primary" : "btn-secondary"}`} aria-label="Xem đơn hàng theo tháng">Tháng</button>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-5">
            <div className="dash-chart-total">67.347 VND</div>
            <span className="trend-up" style={{"fontSize": "12px"}}>↑ 8.2% so với kỳ trước</span>
          </div>
          <div className="chart-container h-[240px]">
            <TemplateChart values={salesData[salesPeriod as keyof typeof salesData.labels]} labels={salesData.labels[salesPeriod as keyof typeof salesData.labels]} />
          </div>
        </div>

        
        <div className="card animate-slideInUp stagger-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-card-icon icon-bg-success w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h2 className="card-title">Doanh thu theo kênh</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="dash-revenue-item">
              <div className="flex items-center gap-3">
                <div className="dash-revenue-dot" style={{"background": "var(--primary)"}}></div>
                <div>
                  <div className="dash-revenue-label">Tổng đơn hàng</div>
                  <div className="dash-revenue-desc">786 giao dịch</div>
                </div>
              </div>
              <div className="dash-revenue-amount">17.584 VND</div>
            </div>
            <div className="dash-revenue-item">
              <div className="flex items-center gap-3">
                <div className="dash-revenue-dot" style={{"background": "var(--info)"}}></div>
                <div>
                  <div className="dash-revenue-label">Doanh thu</div>
                  <div className="dash-revenue-desc">Thu nhập ròng</div>
                </div>
              </div>
              <div className="dash-revenue-amount">17.584 VND</div>
            </div>
            <div className="dash-revenue-item">
              <div className="flex items-center gap-3">
                <div className="dash-revenue-dot" style={{"background": "var(--danger)"}}></div>
                <div>
                  <div className="dash-revenue-label">Chi phí</div>
                  <div className="dash-revenue-desc">Chi phí vận hành</div>
                </div>
              </div>
              <div className="dash-revenue-amount">12.487 VND</div>
            </div>
            <div className="dash-revenue-item">
              <div className="flex items-center gap-3">
                <div className="dash-revenue-dot" style={{"background": "var(--warning)"}}></div>
                <div>
                  <div className="dash-revenue-label">Lợi nhuận</div>
                  <div className="dash-revenue-desc">Biên lợi nhuận ròng</div>
                </div>
              </div>
              <div className="dash-revenue-amount dash-stat-profit">5.097 VND</div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="page-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

        
        <div className="card animate-slideInUp stagger-2">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-card-icon icon-bg-primary w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <h2 className="card-title">Nguyên liệu cận hạn</h2>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="dash-metric-card flex-1">
              <div className="dash-metric-icon icon-bg-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div className="dash-metric-value">214</div>
              <div className="dash-metric-label">Số lượng hiện có</div>
            </div>
            <div className="dash-metric-card flex-1">
              <div className="dash-metric-icon icon-bg-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="dash-metric-value">64</div>
              <div className="dash-metric-label">Sắp nhận</div>
            </div>
          </div>
        </div>

        
        <div className="card animate-slideInUp stagger-3">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-icon icon-bg-info w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h2 className="card-title">Khách và số ly</h2>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="dash-metric-card flex-1">
              <div className="dash-metric-icon icon-bg-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div className="dash-metric-value">1.8K</div>
              <div className="dash-metric-label">Tổng khách hàng</div>
            </div>
            <div className="dash-metric-card flex-1">
              <div className="dash-metric-icon icon-bg-purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div className="dash-metric-value">27</div>
              <div className="dash-metric-label">Tổng nhà cung cấp</div>
            </div>
          </div>
        </div>

        
        <div className="card animate-slideInUp stagger-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-icon icon-bg-danger w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h2 className="card-title">Cảnh báo chi nhánh</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="dash-stock-item">
              <div className="flex items-center justify-between mb-2">
                <div className="dash-stock-info">
                  <div className="dash-stock-dot" style={{"background": "var(--danger)"}}></div>
                  <span className="text-[13px] font-medium">Mặt hàng tồn thấp</span>
                </div>
                <span className="text-[18px] font-bold text-[var(--danger)]">02</span>
              </div>
              <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "20%", "background": "var(--danger)"}}></div></div>
            </div>
            <div className="dash-stock-item">
              <div className="flex items-center justify-between mb-2">
                <div className="dash-stock-info">
                  <div className="dash-stock-dot" style={{"background": "var(--info)"}}></div>
                  <span className="text-[13px] font-medium">Nhóm mặt hàng</span>
                </div>
                <span className="text-[18px] font-bold">14</span>
              </div>
              <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "55%", "background": "var(--info)"}}></div></div>
            </div>
            <div className="dash-stock-item">
              <div className="flex items-center justify-between mb-2">
                <div className="dash-stock-info">
                  <div className="dash-stock-dot" style={{"background": "var(--primary)"}}></div>
                  <span className="text-[13px] font-medium">Số mặt hàng</span>
                </div>
                <span className="text-[18px] font-bold">104</span>
              </div>
              <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "85%", "background": "var(--primary)"}}></div></div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="page-section grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        
        <div className="card lg:col-span-2 animate-slideInUp stagger-3">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-icon icon-bg-info w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h2 className="card-title">Lượng khách theo thời gian</h2>
                <p className="card-subtitle">Khách mới và khách quay lại</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setCustomerPeriod("weekly")} className={`btn btn-sm ${customerPeriod === "weekly" ? "btn-primary" : "btn-secondary"}`} aria-label="Xem khách hàng theo tuần">Tuần</button>
              <button onClick={() => setCustomerPeriod("monthly")} className={`btn btn-sm ${customerPeriod === "monthly" ? "btn-primary" : "btn-secondary"}`} aria-label="Xem khách hàng theo tháng">Tháng</button>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-5">
            <div className="dash-chart-total">1,377</div>
            <span className="dash-chart-subtitle">khách trong tháng cao điểm</span>
          </div>
          <div className="chart-container h-[240px]">
            <TemplateChart bars values={customerData[customerPeriod as keyof typeof customerData.labels]} labels={customerData.labels[customerPeriod as keyof typeof customerData.labels]} />
          </div>
        </div>

        
        <div className="card animate-slideInUp stagger-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="stat-icon icon-bg-warning w-8 h-8 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              </div>
              <h2 className="card-title">Món bán chạy</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="dash-purchase-item">
              <div className="flex items-center gap-3">
                <div className="dash-purchase-icon icon-bg-purple">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">Số đơn mua</span>
                    <span className="text-[15px] font-bold">45</span>
                  </div>
                  <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "65%", "background": "#8B5CF6"}}></div></div>
                </div>
              </div>
            </div>
            <div className="dash-purchase-item">
              <div className="flex items-center gap-3">
                <div className="dash-purchase-icon icon-bg-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">Chi phí mua hàng</span>
                    <span className="text-[15px] font-bold">786 VND</span>
                  </div>
                  <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "40%", "background": "var(--warning)"}}></div></div>
                </div>
              </div>
            </div>
            <div className="dash-purchase-item">
              <div className="flex items-center gap-3">
                <div className="dash-purchase-icon icon-bg-danger">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">Đơn đã hủy</span>
                    <span className="text-[15px] font-bold text-[var(--danger)]">04</span>
                  </div>
                  <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "12%", "background": "var(--danger)"}}></div></div>
                </div>
              </div>
            </div>
            <div className="dash-purchase-item">
              <div className="flex items-center gap-3">
                <div className="dash-purchase-icon icon-bg-success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">Đổi trả</span>
                    <span className="text-[15px] font-bold">07</span>
                  </div>
                  <div className="dash-progress-track"><div className="dash-progress-fill" style={{"width": "18%", "background": "var(--primary)"}}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

<section className="page-section card"><div className="card-header"><div className="flex items-center gap-2"><div className="stat-card-icon icon-bg-primary w-8 h-8 rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><h2 className="card-title">Đơn hàng gần đây</h2><p className="card-subtitle">Giao dịch gần đây</p></div></div><Link to="/sales" className="btn btn-secondary btn-sm">Xem tất cả đơn hàng</Link></div><DataTable columns={orderColumns} data={visibleOrders} rowKey={o => o.id} caption="Danh sách đơn hàng gần đây" pagination={false} /></section><section className="page-section card"><div className="card-header"><div className="flex items-center gap-2"><div className="stat-card-icon icon-bg-danger w-8 h-8 rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div><div><h2 className="card-title">Nguyên liệu dưới ngưỡng</h2><p className="card-subtitle">Mặt hàng cần nhập thêm</p></div><Badge variant="danger">3 nguyên liệu</Badge></div><Link to="/inventory/ingredients" className="btn btn-secondary btn-sm">Xem nguyên liệu</Link></div><DataTable columns={stockColumns} data={ingredients} rowKey={o => o.id} caption="Nguyên liệu dưới ngưỡng tại kho tổng" pagination={false} /></section></div>);
}
