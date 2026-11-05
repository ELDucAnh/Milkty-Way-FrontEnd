import { Link } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";
import {
    formatCurrency,
    SalesPageHeader,
} from "./sales-support";

type MemberTier = "member" | "silver" | "gold" | "vip";

interface PointTransaction {
    id: string;
    invoiceId: string;
    createdAt: string;
    points: number;
    description: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    tier: MemberTier;
    spending12Months: number;
    points: number;
    history: readonly PointTransaction[];
}

interface CustomerForm {
    consent: boolean;
    id: string;
    email: string;
    address: string;
    registeredAt: string;
    name: string;
    phone: string;
}

const tierLabels: Record<MemberTier, string> = {
    member: "Thành viên",
    silver: "Hạng bạc",
    gold: "Hạng vàng",
    vip: "VIP",
};

const tierVariants: Record<MemberTier, BadgeVariant> = {
    member: "info",
    silver: "gray",
    gold: "warning",
    vip: "purple",
};

// Hội viên mẫu từ customers/customers.html.
const initialCustomers: readonly Customer[] = [{ id: "HV-0001", name: "Nguyễn An", phone: "0900 000 001", tier: "vip", spending12Months: 12500000, points: 1250, history: [{ id: "GD01", invoiceId: "HD-00125", createdAt: "2026-10-28T09:15:00+07:00", points: 450, description: "Tích điểm mua hàng · 450.000 ₫ · Số dư 1.250" }, { id: "GD02", invoiceId: "HD-00120", createdAt: "2026-10-27T15:20:00+07:00", points: -45, description: "Điều chỉnh do hoàn tiền · 45.000 ₫ · Số dư 800" }] }];

export default function CustomersPage() {
    const toast = useToast();
    const [customers, setCustomers] = useState<Customer[]>(() => [...initialCustomers]);
    const [search, setSearch] = useState("");
    const [tier, setTier] = useState("");
    const [historyOpen, setHistoryOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer>(initialCustomers[0]);
    const [applied, setApplied] = useState({search: "", tier: ""});
    const [form, setForm] = useState<CustomerForm>({ id: `HV-${String(customers.length + 1).padStart(4, "0")}`, consent: false, name: "", phone: "", email: "", address: "", registeredAt: new Date().toISOString() });

    const query = applied.search.trim().toLocaleLowerCase("vi-VN");
    const visibleCustomers = customers.filter(
        (customer) =>
            (!applied.tier || customer.tier === applied.tier) &&
            (
                `${customer.id} ${customer.name}`.toLocaleLowerCase("vi-VN").includes(query) ||
                customer.phone.replace(/\s/g, "").includes(query.replace(/\s/g, ""))
            ),
    );

    function addCustomer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form.consent) {
            toast.warning("Cần đồng ý xử lý dữ liệu cá nhân để đăng ký thành viên.");
            return;
        }
        const name = form.name.trim();
        const phone = form.phone.replace(/\s/g, "");

        if (!name || !/^(0\d{9}|\+84\d{9})$/.test(phone)) {
            toast.warning("Vui lòng nhập tên và số điện thoại Việt Nam hợp lệ.");
            return;
        }

        const normalizedPhone = phone.startsWith("+84")
            ? `0${phone.slice(3)}`
            : phone;

        if (customers.some((customer) => customer.phone.replace(/\s/g, "") === normalizedPhone)) {
            toast.warning("Số điện thoại này đã có trong danh sách.");
            return;
        }

        const customer: Customer = {
            ...form,
            name,
            phone: normalizedPhone,
            tier: "member",
            spending12Months: 0,
            points: 0,
            history: [],
        };

        setCustomers((current) => [customer, ...current]);
        setForm({ id: `HV-${String(customers.length + 1).padStart(4, "0")}`, consent: false, name: "", phone: "", email: "", address: "", registeredAt: new Date().toISOString() });
        setAddOpen(false);
        toast.success("Đã thêm khách hàng.");
    }

    const columns: readonly DataTableColumn<Customer>[] = [
        { id: "id", header: "Mã hội viên", render: (customer) => customer.id },
        {
            id: "name",
            header: "Họ tên",
            render: (customer) => (
                <div className="name-ellipsis" title={customer.name}>
                    {customer.name}
                </div>
            ),
        },
        { id: "phone", header: "Số điện thoại", render: (customer) => customer.phone },
        {
            id: "tier",
            header: "Hạng thẻ",
            render: (customer) => (
                <Badge variant={tierVariants[customer.tier]}>
                    {tierLabels[customer.tier]}
                </Badge>
            ),
        },
        {
            id: "spending",
            header: "Chi tiêu 12 tháng",
            render: (customer) => formatCurrency(customer.spending12Months),
        },
        {
            id: "points",
            header: "Điểm khả dụng",
            render: (customer) => `${customer.points.toLocaleString("vi-VN")} điểm`,
        },
        {
            id: "lastPurchase", header: "Lần mua gần nhất", render: (customer) => customer.id === "HV-0001" ? "28/10/2026" : "—",
        },
        {
            id: "history",
            header: "Thao tác",
            render: (customer) => (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSelectedCustomer(customer); setHistoryOpen(true); }}
                >
                    Lịch sử
                </button>
            ),
        },
    ];


    return (
        <>
            <SalesPageHeader
                title="Khách hàng và hội viên"
                breadcrumb="Khách hàng"
                parent={{ label: "", to: "" }}
                description="Tra cứu hội viên, hạng thẻ, chi tiêu và lịch sử điểm toàn chuỗi."
                actions={<>
                    <button className="btn btn-secondary" onClick={() => toast.info("Chưa tích hợp xuất dữ liệu khách hàng.")}> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Xuất dữ liệu</button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { setForm({id: `HV-${String(customers.length + 1).padStart(4, "0")}`, consent: false, name: "", phone: "", email: "", address: "", registeredAt: new Date().toISOString()}); setAddOpen(true); }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Thêm khách hàng
                    </button></>
                }
            />

            <section className="page-section" aria-label="Thống kê khách hàng">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Tổng khách hàng</div>
              <div className="stat-value">1,842</div>
              <div className="trend-up stat-sub-label">↑ +48 tháng này</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Đang hoạt động</div>
              <div className="stat-value text-[var(--primary)]">1,680</div>
              <div className="stat-sub-label">91.2% tỷ lệ hoạt động</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Khoản phải thu</div>
              <div className="stat-value text-[var(--warning)]">6.487 VND</div>
              <div className="stat-sub-label">18 hóa đơn chờ thanh toán</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon icon-bg-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-label">Giá trị vòng đời trung bình</div>
              <div className="stat-value">439 VND</div>
              <div className="trend-up stat-sub-label">↑ +5.4% so với cùng kỳ năm trước</div>
            </div>
          </div>
        </div>
      </section>
<section className="card mb-6"><h2 className="card-title mb-4">Bộ lọc hội viên</h2>
                

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="min-w-0 md:col-span-2">
                        <label className="form-label" htmlFor="customer-search">
                            Tìm hội viên
                        </label>
                        <input
                            id="customer-search"
                            type="search"
                            className="form-input w-full h-11"
                            placeholder="Mã, tên hoặc số điện thoại"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="customer-tier">
                            Hạng thẻ
                        </label>
                        <select
                            id="customer-tier"
                            className="form-input form-select w-full h-11"
                            value={tier}
                            onChange={(event) => setTier(event.target.value)}
                        >
                            <option value="">Tất cả hạng thẻ</option>
                            {Object.entries(tierLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
<div className="flex flex-wrap items-center gap-2 mt-4"><button className="btn btn-primary h-11" onClick={() => setApplied({search, tier})}>Áp dụng</button><button className="btn btn-secondary h-11" onClick={() => {setSearch("");setTier("");setApplied({search:"",tier:""});}}>Xóa bộ lọc</button></div>
                </div>
            </section>

            <section className="card p-0 overflow-hidden">
                <DataTable<Customer> pagination pageSize={10}
                    key={JSON.stringify([applied.search, applied.tier])}
                    columns={columns}
                    data={visibleCustomers}
                    rowKey={(customer) => customer.id}
                    caption="Danh sách khách hàng và hội viên"
                />
</section>

            <Modal
                open={addOpen}
                title="Thêm khách hàng"
                onClose={() => setAddOpen(false)}
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setAddOpen(false)}
                        >
                            Hủy
                        </button>
                        <button type="submit" form="customer-form" className="btn btn-primary">
                            Lưu khách hàng
                        </button>
                    </>
                }
            >
                <form id="customer-form" className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={addCustomer}>
                    <label className="form-label">Mã khách hàng<input className="form-input" value={form.id} readOnly /></label>
                    <label className="form-label">Ngày đăng ký<input className="form-input" value={new Date(form.registeredAt).toLocaleDateString("vi-VN")} readOnly /></label>
                    <label className="form-label">Họ tên<input className="form-input" required value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></label>
                    <label className="form-label">Email<input className="form-input" type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></label>
                    <label className="form-label">Số điện thoại<input className="form-input" type="tel" required value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></label>
                    <label className="form-label">Địa chỉ<input className="form-input" value={form.address} onChange={e => setForm({...form,address:e.target.value})} /></label>
                    <label className="flex items-start gap-2 sm:col-span-2 text-sm">
                        <input type="checkbox" className="mt-1 accent-[var(--info)]" required checked={form.consent} onChange={event => setForm({...form, consent: event.target.checked})} />
                        Tôi đồng ý xử lý dữ liệu cá nhân để quản lý tài khoản thành viên, giao dịch và điểm thưởng.
                    </label>
                </form>
            </Modal>

<Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`Lịch sử giao dịch · ${selectedCustomer.id}`} size="xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
            <tr>
              <th>Thời gian</th><th>Hóa đơn tham chiếu</th><th>Giao dịch</th>
              <th>Số tiền</th><th>Thay đổi điểm</th><th>Số dư sau giao dịch</th>
            </tr>
            </thead>
            <tbody>{selectedCustomer.id === "HV-0001" ? <>
            <tr>
              <td>
                <time dateTime="2026-10-28T09:15:00+07:00"
                      className="whitespace-nowrap tabular-nums">
                  28/10/2026 09:15
                </time>
              </td>
              <td>
                <Link to="/invoices/HD-00125"
                   className="text-[var(--primary)] underline">
                  HD-00125
                </Link>
              </td>
              <td>Tích điểm mua hàng</td>
              <td className="whitespace-nowrap">450.000 VND</td>
              <td>+450</td>
              <td>1.250</td>
            </tr>
            <tr>
              <td>
                <time dateTime="2026-10-27T15:20:00+07:00"
                      className="whitespace-nowrap tabular-nums">
                  27/10/2026 15:20
                </time>
              </td>
              <td>
                <Link to="/invoices/HD-00120"
                   className="text-[var(--primary)] underline">
                  HD-00120
                </Link>
              </td>
              <td>Điều chỉnh do hoàn tiền</td>
              <td className="whitespace-nowrap">45.000 VND</td>
              <td>-45</td>
              <td>800</td>
            </tr>
            </> : <tr><td colSpan={6}>Chưa có giao dịch điểm.</td></tr>}</tbody>
          </table>
        </div>
      </Modal>
        </>
    );
}