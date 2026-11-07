import { Link } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";
import { formatCurrency, SalesPageHeader } from "./sales-support";

type MemberTier = "member" | "silver" | "gold" | "vip";

interface PointTransaction {
    id: string;
    invoiceId: string;
    createdAt: string;
    action: string;
    amount: number;
    points: number;
    balance: number;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    tier: MemberTier;
    spending12Months: number;
    points: number;
    lastPurchase: string;
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
    vip: "Hạng VIP",
};

const tierVariants: Record<MemberTier, BadgeVariant> = {
    member: "gray",
    silver: "info",
    gold: "warning",
    vip: "purple",
};

const initialCustomers: readonly Customer[] = [
    {
        id: "HV-0001",
        name: "Nguyễn An",
        phone: "0903 123 456",
        email: "an.nguyen@gmail.com",
        tier: "vip",
        spending12Months: 12500000,
        points: 1250,
        lastPurchase: "28/10/2026",
        history: [
            { id: "GD01", invoiceId: "HD-CN01-003814", createdAt: "28/10/2026 09:15", action: "Tích điểm mua hàng", amount: 450000, points: 45, balance: 1250 },
            { id: "GD02", invoiceId: "HD-CN01-003780", createdAt: "27/10/2026 15:20", action: "Điều chỉnh khiếu nại hoàn tiền", amount: 45000, points: -45, balance: 1205 },
            { id: "GD03", invoiceId: "HD-CN05-001200", createdAt: "20/10/2026 18:30", action: "Tích điểm mua hàng", amount: 280000, points: 28, balance: 1250 }
        ]
    },
    {
        id: "HV-0002",
        name: "Trần Văn An",
        phone: "0908 123 456",
        email: "vanan.tran@gmail.com",
        tier: "gold",
        spending12Months: 6800000,
        points: 850,
        lastPurchase: "28/10/2026",
        history: [
            { id: "GD04", invoiceId: "HD-CN05-001247", createdAt: "28/10/2026 14:32", action: "Tích điểm mua hàng", amount: 89000, points: 9, balance: 850 },
            { id: "GD05", invoiceId: "HD-CN05-001150", createdAt: "25/10/2026 11:20", action: "Đổi voucher giảm 20.000đ", amount: 0, points: -100, balance: 841 }
        ]
    },
    {
        id: "HV-0003",
        name: "Trần Bình",
        phone: "0912 345 678",
        email: "binh.tran@yahoo.com",
        tier: "silver",
        spending12Months: 3200000,
        points: 420,
        lastPurchase: "28/10/2026",
        history: [
            { id: "GD06", invoiceId: "HD-CN01-003810", createdAt: "28/10/2026 09:12", action: "Tích điểm mua hàng", amount: 35000, points: 4, balance: 420 }
        ]
    },
    {
        id: "HV-0004",
        name: "Lê Minh Tuấn",
        phone: "0988 777 666",
        email: "tuan.le@outlook.com",
        tier: "member",
        spending12Months: 850000,
        points: 150,
        lastPurchase: "28/10/2026",
        history: [
            { id: "GD07", invoiceId: "HD-CN02-000892", createdAt: "28/10/2026 09:05", action: "Tích điểm mua hàng", amount: 78000, points: 8, balance: 150 }
        ]
    },
    {
        id: "HV-0005",
        name: "Nguyễn Thị Mai",
        phone: "0909 555 444",
        email: "mai.nguyen@gmail.com",
        tier: "gold",
        spending12Months: 5400000,
        points: 680,
        lastPurchase: "26/10/2026",
        history: [
            { id: "GD08", invoiceId: "HD-CN03-002140", createdAt: "26/10/2026 16:40", action: "Tích điểm mua hàng", amount: 156000, points: 16, balance: 680 }
        ]
    },
    {
        id: "HV-0006",
        name: "Hoàng Hải Đăng",
        phone: "0933 222 111",
        email: "haidang.h@fpt.com.vn",
        tier: "vip",
        spending12Months: 15200000,
        points: 1820,
        lastPurchase: "27/10/2026",
        history: [
            { id: "GD09", invoiceId: "HD-CN01-003750", createdAt: "27/10/2026 19:10", action: "Tích điểm mua hàng", amount: 320000, points: 32, balance: 1820 }
        ]
    }
];

export default function CustomersPage() {
    const toast = useToast();
    const [customers, setCustomers] = useState<Customer[]>(() => [...initialCustomers]);
    const [search, setSearch] = useState("");
    const [tier, setTier] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer>(initialCustomers[0]);
    const [applied, setApplied] = useState({ search: "", tier: "" });
    const [form, setForm] = useState<CustomerForm>({
        id: `HV-${String(customers.length + 1).padStart(4, "0")}`,
        consent: false,
        name: "",
        phone: "",
        email: "",
        address: "",
        registeredAt: new Date().toISOString()
    });

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

        const newCustomer: Customer = {
            id: `HV-${String(customers.length + 1).padStart(4, "0")}`,
            name,
            phone: normalizedPhone,
            email: form.email || `${name.toLowerCase().replace(/\s/g, "")}@gmail.com`,
            tier: "member",
            spending12Months: 0,
            points: 10, // Thưởng 10 điểm chào mừng
            lastPurchase: "Mới đăng ký",
            history: [
                {
                    id: `GD${Date.now()}`,
                    invoiceId: "DK-MOI",
                    createdAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                    action: "Thưởng kích hoạt thành viên mới",
                    amount: 0,
                    points: 10,
                    balance: 10,
                }
            ],
        };

        setCustomers((current) => [newCustomer, ...current]);
        setSelectedCustomer(newCustomer);
        setForm({
            id: `HV-${String(customers.length + 2).padStart(4, "0")}`,
            consent: false,
            name: "",
            phone: "",
            email: "",
            address: "",
            registeredAt: new Date().toISOString()
        });
        setAddOpen(false);
        toast.success(`Đã đăng ký thành viên ${name} thành công! Thưởng 10 điểm chào mừng.`, {
            title: "Đăng Ký Thành Công"
        });
    }

    const columns: readonly DataTableColumn<Customer>[] = [
        {
            id: "id",
            header: "Mã hội viên",
            className: "font-mono font-bold text-[var(--primary)] whitespace-nowrap",
            render: (customer) => customer.id
        },
        {
            id: "name",
            header: "Họ tên",
            render: (customer) => (
                <div>
                    <div className="font-semibold text-sm">{customer.name}</div>
                    <div className="text-xs text-[var(--muted)]">{customer.email}</div>
                </div>
            ),
        },
        {
            id: "phone",
            header: "Số điện thoại",
            className: "font-mono text-sm",
            render: (customer) => customer.phone
        },
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
            className: "font-bold text-sm",
            render: (customer) => formatCurrency(customer.spending12Months),
        },
        {
            id: "points",
            header: "Điểm khả dụng",
            className: "font-bold text-[var(--primary)]",
            render: (customer) => `${customer.points.toLocaleString("vi-VN")} điểm`,
        },
        {
            id: "lastPurchase",
            header: "Lần mua gần nhất",
            className: "text-xs text-[var(--muted)] whitespace-nowrap",
            render: (customer) => customer.lastPurchase,
        },
        {
            id: "history",
            header: "Thao tác",
            render: (customer) => (
                <button
                    type="button"
                    className={`btn btn-sm ${selectedCustomer.id === customer.id ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => {
                        setSelectedCustomer(customer);
                        document.getElementById("customer-history-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                >
                    {selectedCustomer.id === customer.id ? "Đang chọn" : "Xem lịch sử"}
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <SalesPageHeader
                title="Khách hàng và hội viên"
                breadcrumb="Khách hàng"
                parent={{ label: "", to: "" }}
                description="Quản lý khách hàng thân thiết, chính sách tích điểm và lịch sử tiêu dùng toàn chuỗi 12 cửa hàng."
                actions={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => toast.success("Đã xuất danh sách hội viên ra file Excel thành công!", { title: "Xuất File" })}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Xuất dữ liệu
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setForm({
                                    id: `HV-${String(customers.length + 1).padStart(4, "0")}`,
                                    consent: false,
                                    name: "",
                                    phone: "",
                                    email: "",
                                    address: "",
                                    registeredAt: new Date().toISOString()
                                });
                                setAddOpen(true);
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Thêm khách hàng
                        </button>
                    </>
                }
            />

            <section className="page-section" aria-label="Thống kê khách hàng">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-info">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                <path d="M16 3.13a4 4 0 010 7.75" />
                            </svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Tổng hội viên toàn chuỗi</div>
                            <div className="stat-value">1.842</div>
                            <div className="trend-up stat-sub-label">↑ +48 thành viên mới tháng này</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <polyline points="17 11 19 13 23 9" />
                            </svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Hội viên đang hoạt động</div>
                            <div className="stat-value text-[var(--primary)]">1.680</div>
                            <div className="stat-sub-label">91.2% tỷ lệ quay lại mua hàng</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-warning">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                            </svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Doanh thu từ hội viên</div>
                            <div className="stat-value text-amber-600">{formatCurrency(145870000)}</div>
                            <div className="stat-sub-label">Chiếm 68% tổng doanh số bán</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-success">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Chi tiêu trung bình (AOV)</div>
                            <div className="stat-value">{formatCurrency(185000)}</div>
                            <div className="trend-up stat-sub-label">↑ +5.4% so với quý trước</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card mb-6" aria-labelledby="customer-filter-title">
                <h2 id="customer-filter-title" className="card-title mb-4">Bộ lọc hội viên</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="min-w-0 md:col-span-2">
                        <label className="form-label" htmlFor="customer-search">
                            Tìm kiếm hội viên
                        </label>
                        <input
                            id="customer-search"
                            type="search"
                            className="form-input w-full h-11"
                            placeholder="Nhập mã hội viên, họ tên hoặc số điện thoại..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="customer-tier">
                            Hạng thẻ hội viên
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
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-primary h-11 flex-1"
                            onClick={() => setApplied({ search, tier })}
                        >
                            Áp dụng
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary h-11"
                            onClick={() => {
                                setSearch("");
                                setTier("");
                                setApplied({ search: "", tier: "" });
                            }}
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>
            </section>

            <section className="card p-0 overflow-hidden mb-6" aria-label="Bảng danh sách khách hàng">
                <DataTable<Customer>
                    pagination
                    pageSize={10}
                    key={JSON.stringify([applied.search, applied.tier, customers.length])}
                    columns={columns}
                    data={visibleCustomers}
                    rowKey={(customer) => customer.id}
                    caption="Danh sách khách hàng và hội viên chuỗi MilktyWay"
                />
            </section>

            {/* Bảng Lịch sử giao dịch điểm tích lũy của khách hàng được chọn */}
            <section id="customer-history-section" className="card scroll-mt-24" aria-labelledby="history-title">
                <div className="card-header pb-3 mb-4 border-b border-[var(--border)] flex justify-between items-center flex-wrap gap-3">
                    <div>
                        <h2 id="history-title" className="card-title text-base">
                            Sổ Cái Lịch Sử Tích &amp; Đổi Điểm Thưởng: <span className="text-[var(--primary)]">{selectedCustomer.name}</span> ({selectedCustomer.id})
                        </h2>
                        <p className="card-subtitle text-xs">
                            SĐT: <strong>{selectedCustomer.phone}</strong> · Hạng: <strong>{tierLabels[selectedCustomer.tier]}</strong> · Số dư khả dụng: <strong className="text-[var(--primary)]">{selectedCustomer.points.toLocaleString("vi-VN")} điểm</strong>
                        </p>
                    </div>
                    <Badge variant={tierVariants[selectedCustomer.tier]}>
                        {tierLabels[selectedCustomer.tier]}
                    </Badge>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table w-full">
                        <thead>
                            <tr>
                                <th>Thời Gian</th>
                                <th>Hóa Đơn Tham Chiếu</th>
                                <th>Nội Dung Giao Dịch</th>
                                <th className="text-right">Giá Trị Đơn</th>
                                <th className="text-center">Biến Động Điểm</th>
                                <th className="text-right">Số Dư Sau GD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedCustomer.history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-[var(--muted)]">
                                        Chưa có giao dịch tích điểm nào cho hội viên này.
                                    </td>
                                </tr>
                            ) : (
                                selectedCustomer.history.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="text-xs text-[var(--muted)] whitespace-nowrap">{tx.createdAt}</td>
                                        <td>
                                            <Link
                                                to={`/invoices/invoice-details?orderId=${encodeURIComponent(tx.invoiceId)}`}
                                                className="font-mono font-bold text-[var(--primary)] hover:underline"
                                            >
                                                {tx.invoiceId}
                                            </Link>
                                        </td>
                                        <td className="text-sm font-medium">{tx.action}</td>
                                        <td className="text-right font-semibold text-xs">
                                            {tx.amount > 0 ? formatCurrency(tx.amount) : "—"}
                                        </td>
                                        <td className="text-center font-bold">
                                            <span className={tx.points >= 0 ? "text-emerald-600" : "text-red-500"}>
                                                {tx.points > 0 ? `+${tx.points}` : tx.points}
                                            </span>
                                        </td>
                                        <td className="text-right font-bold text-[var(--primary)]">
                                            {tx.balance.toLocaleString("vi-VN")} điểm
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <Modal
                open={addOpen}
                title="Đăng Ký Khách Hàng Hội Viên Mới"
                size="lg"
                onClose={() => setAddOpen(false)}
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setAddOpen(false)}
                        >
                            Hủy Bỏ
                        </button>
                        <button type="submit" form="customer-form" className="btn btn-primary">
                            Lưu &amp; Thưởng Điểm
                        </button>
                    </>
                }
            >
                <form id="customer-form" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" onSubmit={addCustomer}>
                    <div>
                        <label className="form-label">Mã khách hàng</label>
                        <input className="form-input bg-[var(--background)] font-mono font-bold" value={form.id} readOnly />
                    </div>
                    <div>
                        <label className="form-label">Ngày đăng ký</label>
                        <input className="form-input bg-[var(--background)]" value={new Date(form.registeredAt).toLocaleDateString("vi-VN")} readOnly />
                    </div>
                    <div>
                        <label className="form-label">Họ tên (*)</label>
                        <input
                            className="form-input"
                            required
                            placeholder="Ví dụ: Nguyễn Văn Nam"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Số điện thoại (*)</label>
                        <input
                            className="form-input"
                            type="tel"
                            required
                            placeholder="Ví dụ: 0903 888 999"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="email@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Địa chỉ</label>
                        <input
                            className="form-input"
                            placeholder="Quận/Huyện, TP.HCM"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                        />
                    </div>
                    <label className="flex items-start gap-2 sm:col-span-2 text-xs text-[var(--muted)] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] cursor-pointer">
                        <input
                            type="checkbox"
                            className="mt-0.5 accent-[var(--primary)]"
                            required
                            checked={form.consent}
                            onChange={event => setForm({ ...form, consent: event.target.checked })}
                        />
                        <span>
                            Tôi đồng ý tuân thủ quy định thành viên MilktyWay và cho phép hệ thống lưu trữ thông tin để tích điểm, gửi mã voucher sinh nhật.
                        </span>
                    </label>
                </form>
            </Modal>
        </div>
    );
}
