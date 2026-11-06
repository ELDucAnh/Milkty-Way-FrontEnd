import { useToast } from "../../components/common/useToast";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { SalesPageHeader, initialSalesOrders, branches, channelLabels, channelVariants, shiftLabels, paymentStatuses, preparationStatuses, deliveryStatuses, formatCurrency, formatDateTime } from "./sales-support";
import type { SalesOrder } from "./sales-support";

export default function SalesListPage() {
 const toast = useToast();
 const [appliedQuery, setAppliedQuery] = useState("");
 const [appliedFilters, setAppliedFilters] = useState<Record<string,string>>({});
 const navigate = useNavigate();
 const [query, setQuery] = useState("");
 const [filters, setFilters] = useState<Record<string, string>>({});
 const groups = [
  { key: "branchId", label: "Chi nhánh", options: branches.map(b => [b.id, b.name]) },
  { key: "shift", label: "Ca làm việc", options: Object.entries(shiftLabels) },
  { key: "channel", label: "Kênh bán", options: Object.entries(channelLabels) },
  ...[{ key: "preparation", label: "Pha chế", values: preparationStatuses }, { key: "payment", label: "Thanh toán", values: paymentStatuses }, { key: "delivery", label: "Giao nhận", values: deliveryStatuses }].map(g => ({ key: g.key, label: g.label, options: Object.entries(g.values).map(([key, value]) => [key, value.label]) })),
 ];
 const rows = initialSalesOrders.filter(row => `${row.id} ${row.customer} ${row.phone}`.toLocaleLowerCase("vi-VN").includes(appliedQuery.trim().toLocaleLowerCase("vi-VN")) && groups.every(g => !appliedFilters[g.key] || row[g.key as keyof SalesOrder] === appliedFilters[g.key]));
 const columns: DataTableColumn<SalesOrder>[] = [
  { id: "id", header: "Mã đơn", render: r => <>{r.id}{r.largeOrder && <Badge variant="warning">Đơn lớn</Badge>}</> },
  { id: "branch", header: "Chi nhánh / Ca", render: r => `${r.branchId} · ${shiftLabels[r.shift]}` },
  { id: "customer", header: "Khách hàng", render: r => <>{r.customer}<div>{r.phone}</div></> },
  { id: "channel", header: "Kênh bán", render: r => <Badge variant={channelVariants[r.channel]}>{channelLabels[r.channel]}</Badge> },
  { id: "time", header: "Thời gian", render: r => formatDateTime(r.createdAt) },
  { id: "total", header: "Tổng tiền", render: r => formatCurrency(r.total) },
  { id: "payment", header: "Thanh toán", render: r => <Badge variant={paymentStatuses[r.payment].variant}>{paymentStatuses[r.payment].label}</Badge> },
  { id: "preparation", header: "Pha chế", render: r => r.preparation ? <Badge variant={preparationStatuses[r.preparation].variant}>{preparationStatuses[r.preparation].label}</Badge> : "—" },
  { id: "delivery", header: "Giao nhận", render: r => r.delivery ? <Badge variant={deliveryStatuses[r.delivery].variant}>{deliveryStatuses[r.delivery].label}</Badge> : "—" },
  { id: "action", header: "Thao tác", render: r => <Link className="btn btn-secondary btn-sm" to={`/invoices/invoice-details?orderId=${encodeURIComponent(r.id)}`} aria-label={`Xem KOT của đơn ${r.id}`}>Xem KOT</Link> },
 ];
 return <>
  <SalesPageHeader title="Quản lý đơn hàng đa kênh" breadcrumb="Tất cả đơn bán" parent={{ label: "Bán hàng", to: "/sales" }} description="Tra cứu đơn tại quầy, mang đi và trực tuyến." actions={<><button className="btn btn-secondary" onClick={() => toast.info("Chưa tích hợp xuất dữ liệu đơn hàng.")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Xuất dữ liệu</button><button className="btn btn-primary" onClick={() => navigate("/sales/pos")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Tạo đơn mới</button></>} />
  <section aria-label="Thống kê đơn hàng">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Tổng đơn hàng</div>
              <div className="stat-value">786</div>
              <div className="stat-sub-label trend-up">↑ +8.2% so với tháng trước</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Doanh thu</div>
              <div className="stat-value">67.347 VND</div>
              <div className="stat-sub-label trend-up">↑ +12.5% so với tháng trước</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Lợi nhuận ròng</div>
              <div className="stat-value text-[var(--primary)]">18.420 VND</div>
              <div className="stat-sub-label">27.3% biên lợi nhuận ròng</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Đơn đang pha chế</div>
              <div className="stat-value text-[var(--warning)]">{initialSalesOrders.filter(order => order.preparation === "preparing").length}</div>
              <div className="stat-sub-label">Trong danh sách đơn hiện có</div>
            </div>
          </div>
        </div>
      </section>
  
  <section className="card mb-6" aria-labelledby="sales-filter-title"><h2 id="sales-filter-title" className="card-title mb-4">Bộ lọc đơn hàng</h2><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
   <div className="min-w-0"><label className="form-label" htmlFor="sale-search">Tìm đơn</label><input id="sale-search" type="search" className="form-input w-full h-11" placeholder="Mã đơn hoặc số điện thoại" value={query} onChange={e => setQuery(e.target.value)} /></div>
   {groups.map(g => <div key={g.key} className="min-w-0"><label className="form-label" htmlFor={`sale-${g.key}`}>{g.label}</label><select id={`sale-${g.key}`} className="form-input form-select w-full h-11" value={filters[g.key] ?? ""} onChange={e => setFilters(current => ({ ...current, [g.key]: e.target.value }))}><option value="">Tất cả</option>{g.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}
  <div className="flex flex-wrap items-center gap-2 mt-4"><button className="btn btn-primary h-11" onClick={() => { setAppliedQuery(query); setAppliedFilters({...filters}); }}>Áp dụng bộ lọc</button><button className="btn btn-secondary h-11" onClick={() => { setQuery(""); setFilters({}); setAppliedQuery(""); setAppliedFilters({}); }}>Xóa bộ lọc</button></div></div></section>
  <section className="card p-0 overflow-hidden"><DataTable pagination pageSize={10} key={JSON.stringify([appliedQuery, appliedFilters])} columns={columns} data={rows} rowKey={r => r.id} caption="Danh sách đơn hàng" /></section>

 </>;
}
