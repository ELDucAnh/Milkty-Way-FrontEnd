import { RETURNS_CHANGED } from "../shared/sales-returns-store";
import { can, homePath, isBranchScoped, isCashier, scopedBranch } from "../../utils/auth";
import { getSalesBranches } from "../../data/sales/branches";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import { useToast } from "../../components/common/useToast";
import { formatCurrency } from "../shared/formatters";
import { loadInvoices, saveInvoices } from "../shared/sales-orders-store";
import type { InvoiceRecord, SalesOrderItem } from "../shared/sales-orders-store";

export default function InvoicesPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [invoiceLoadError, setInvoiceLoadError] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  useEffect(() => {
    function refreshInvoices() {
      try {
        setInvoices(loadInvoices());
        setInvoiceLoadError("");
      } catch (error) {
        setInvoiceLoadError(
          error instanceof Error ? error.message : "Không đọc được hóa đơn.",
        );
      }
    }

    refreshInvoices();
    window.addEventListener("focus", refreshInvoices);
    window.addEventListener("storage", refreshInvoices);
    window.addEventListener(RETURNS_CHANGED, refreshInvoices);

    return () => {
      window.removeEventListener("focus", refreshInvoices);
      window.removeEventListener("storage", refreshInvoices);
      window.removeEventListener(RETURNS_CHANGED, refreshInvoices);
    };
  }, []);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(scopedBranch() ?? "");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const branchOptions = useMemo(() => {
    try {
      return getSalesBranches();
    } catch {
      return [];
    }
  }, []);

  // Modal Lập hóa đơn mới (Popup độc lập, không chuyển trang POS)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createBranch, setCreateBranch] = useState("CN01 - Bến Nghé");
  const [createType, setCreateType] = useState<"Bán Lẻ" | "Đơn Sỉ B2B" | "Giao Hàng">("Bán Lẻ");
  const [createCustomer, setCreateCustomer] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createTier, setCreateTier] = useState<"Member" | "Silver" | "Gold" | "VIP">("Member");
  const [createPaymentMethod, setCreatePaymentMethod] = useState("Tiền mặt");
  const [createPaymentStatus, setCreatePaymentStatus] = useState<"Đã Thanh Toán" | "Thanh Toán 50%" | "Chờ Thanh Toán">("Đã Thanh Toán");
  const [createItems, setCreateItems] = useState<{ id: string; name: string; quantity: number; unitPrice: number }[]>([
    { id: "line-1", name: "Trà sữa trân châu hoàng kim (Size L)", quantity: 2, unitPrice: 44000 },
    { id: "line-2", name: "Trà đào cam sả tươi (Size L)", quantity: 1, unitPrice: 45000 },
  ]);

  const subtotal = createItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const vat = Math.round(subtotal * 0.08);
  const total = subtotal + vat;

  function handleAddItem() {
    setCreateItems(prev => [
      ...prev,
      { id: `line-${Date.now()}`, name: "Trà Oolong nướng kem phô mai (Size M)", quantity: 1, unitPrice: 42000 }
    ]);
  }

  function handleRemoveItem(id: string) {
    if (createItems.length <= 1) return;
    setCreateItems(prev => prev.filter(it => it.id !== id));
  }

  function handleItemChange(id: string, field: "name" | "quantity" | "unitPrice", val: string | number) {
    setCreateItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      return { ...it, [field]: val };
    }));
  }

  function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!createCustomer.trim()) {
      toast.warning("Vui lòng nhập họ tên khách hàng hoặc đơn vị mua hàng.");
      return;
    }
    const prefix = createType === "Đơn Sỉ B2B" ? "SI" : "HD";
    const branchCode = createBranch.slice(0, 4);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceId = `${prefix}-${branchCode}-00${rand}`;
    const paidAmount = createPaymentStatus === "Đã Thanh Toán" ? total : createPaymentStatus === "Thanh Toán 50%" ? Math.round(total / 2) : 0;
    const typeVar: BadgeVariant = createType === "Đơn Sỉ B2B" ? "warning" : createType === "Giao Hàng" ? "purple" : "info";
    const statusVar: BadgeVariant = createPaymentStatus === "Đã Thanh Toán" ? "success" : "warning";

    const salesItems: SalesOrderItem[] = createItems.map((it, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      name: it.name,
      size: "L",
      sugar: "70%",
      ice: "Vừa đá",
      toppings: ["Trân châu hoàng kim"],
      note: "",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }));

    const newRecord: InvoiceRecord = {
      id: invoiceId,
      orderId: `DH-00${rand}`,
      customerName: createCustomer.trim(),
      customerPhone: createPhone.trim() || "0900.000.000",
      tier: createTier,
      initials: createCustomer.trim().split(" ").slice(-2).map(w => w[0]).join("").toUpperCase() || "KH",
      avatarBg: "var(--primary)",
      branch: createBranch,
      branchAddress:
        branchOptions.find((b) => b.code === branchCode)?.address ??
        "12 Pasteur, P. Bến Nghé, Quận 1, TP.HCM",
      type: createType,
      typeVariant: typeVar,
      date: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      subtotal,
      discount: 0,
      tax: vat,
      total,
      paid: paidAmount,
      change: 0,
      paymentMethod: createPaymentMethod,
      status: createPaymentStatus,
      statusVariant: statusVar,
      items: salesItems,
    };

    try {
      saveInvoices([newRecord, ...loadInvoices()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được hóa đơn mới.");
      return;
    }

    setInvoices(prev => [newRecord, ...prev]);
    setShowCreateModal(false);
    setCreateCustomer("");
    setCreatePhone("");
    setPage(1);
    toast.success(`Đã lập thành công hóa đơn ${invoiceId} (${formatCurrency(total)})!`, {
      title: "Lập Hóa Đơn Mới",
    });
  }

  const scopedInvoices = useMemo(() => {
    const branchScope = scopedBranch();
    return invoices.filter((item) => !branchScope || item.branch.startsWith(branchScope));
  }, [invoices]);

  const invoiceStats = useMemo(() => {
    const totalVal = scopedInvoices.reduce((s, i) => s + i.total, 0);
    const paidInvoices = scopedInvoices.filter((i) => i.status === "Đã Thanh Toán");
    const paidVal = paidInvoices.reduce((s, i) => s + i.paid, 0);
    const pendingB2B = scopedInvoices.filter((i) => i.status !== "Đã Thanh Toán" && i.status !== "Đã Hoàn Tiền");
    const pendingVal = pendingB2B.reduce((s, i) => s + Math.max(0, i.total - i.paid), 0);
    const refundedVal = scopedInvoices.reduce((s, i) => s + (i.refundedAmount ?? 0), 0);
    const paidRatio = scopedInvoices.length ? Math.round((paidInvoices.length / scopedInvoices.length) * 100) : 0;
    return { totalVal, paidVal, pendingCount: pendingB2B.length, pendingVal, refundedVal, paidRatio };
  }, [scopedInvoices]);

  const filteredInvoices = useMemo(() => {
    return scopedInvoices.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.includes(q);

      const matchBranch = !selectedBranch || item.branch.includes(selectedBranch);
      const matchType = !selectedType || item.type === selectedType;
      const matchStatus = !selectedStatus || item.status === selectedStatus;

      return matchSearch && matchBranch && matchType && matchStatus;
    });
  }, [scopedInvoices, search, selectedBranch, selectedType, selectedStatus]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedInvoices = useMemo(
    () => filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredInvoices, currentPage],
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span className="current">Hóa đơn</span>
          </nav>
          <h1 className="page-title">Hóa Đơn &amp; Chứng Từ</h1>
          <p className="page-subtitle">
            Tra cứu hóa đơn bán lẻ, bán sỉ và chứng từ thanh toán toàn chuỗi.
          </p>
        </div>
        <div className="page-header-actions">
          {!isCashier() && <><button
            type="button"
            className="btn btn-secondary"
            onClick={() => toast.info("Đang xuất danh sách hóa đơn ra Excel...", { title: "Xuất File" })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Xuất Excel
          </button>
            {can("order.create") && <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Lập Hóa Đơn Mới
            </button>}</>}
        </div>
      </div>

      {/* Thẻ thống kê */}
      {!isCashier() && <section aria-label="Thống kê hóa đơn">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Hóa Đơn"
            value={formatCurrency(invoiceStats.totalVal)}
            subLabel={`${scopedInvoices.length} hóa đơn trong phạm vi`}
            tone="info"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
          <StatCard
            label="Đã Thanh Toán"
            value={formatCurrency(invoiceStats.paidVal)}
            subLabel={`${invoiceStats.paidRatio}% số hóa đơn đã thu`}
            tone="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <StatCard
            label="Chờ Thu / Đặt Cọc"
            value={formatCurrency(invoiceStats.pendingVal)}
            subLabel={`${invoiceStats.pendingCount} hóa đơn chờ thu`}
            tone="warning"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Đã Hoàn Tiền"
            value={formatCurrency(invoiceStats.refundedVal)}
            subLabel="Tổng tiền đã hoàn trả"
            tone="danger"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
        </div>
      </section>}

      {/* Bộ lọc */}
      {invoiceLoadError && (
        <div role="alert" className="card text-red-600">
          {invoiceLoadError}
        </div>
      )}
      <div className="filter-bar mb-5">
        <div className="search-box flex-1 min-w-[200px]">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input h-[38px] text-[13px]"
            placeholder="Tìm mã hóa đơn, tên khách, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input form-select h-[38px] text-[13px] min-w-[140px]"
          aria-label="Lọc theo chi nhánh"
          disabled={isBranchScoped()} value={scopedBranch() ?? selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="">Toàn Chuỗi</option>
          {branchOptions.map((b) => (
            <option key={b.code} value={b.code}>
              {b.code} - {b.name}
            </option>
          ))}
        </select>
        <select
          className="form-input form-select h-[38px] text-[13px] min-w-[140px]"
          aria-label="Lọc theo loại hóa đơn"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">Tất Cả Loại</option>
          <option value="Bán Lẻ">Bán Lẻ Tại Quầy</option>
          <option value="Giao Hàng">Giao Hàng Online</option>
          <option value="Đơn Sỉ B2B">Đơn Bán Sỉ (B2B)</option>
          <option value="Hoàn Tiền">Biên Lai Hoàn Tiền</option>
        </select>
        <select
          className="form-input form-select h-[38px] text-[13px] min-w-[140px]"
          aria-label="Lọc theo trạng thái"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">Tất Cả Trạng Thái</option>
          <option value="Đã Thanh Toán">Đã Thanh Toán</option>
          <option value="Thanh Toán 50%">Thanh Toán 50%</option>
          <option value="Chờ Thanh Toán">Chờ Thanh Toán</option>
          <option value="Hoàn Một Phần / Đã Điều Chỉnh">Hoàn Một Phần / Đã Điều Chỉnh</option>
          <option value="Đã Hoàn Tiền">Đã Hoàn Tiền</option>
        </select>
      </div>

      {/* Bảng hóa đơn */}
      <section aria-label="Bảng danh sách hóa đơn">
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Hóa Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Chi Nhánh</th>
                  <th>Loại</th>
                  <th>Ngày Xuất</th>
                  <th>Tổng Tiền</th>
                  <th>Đã Thu</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-[var(--muted)]">
                      Không tìm thấy hóa đơn phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-mono font-bold text-[var(--primary)] no-underline hover:underline"
                        >
                          {inv.id}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="avatar avatar-sm text-white font-bold flex items-center justify-center rounded-full w-8 h-8 text-xs shrink-0"
                            style={{ background: inv.avatarBg }}
                          >
                            {inv.initials}
                          </div>
                          <div>
                            <span className="text-[13px] font-semibold text-[var(--text)]">
                              {inv.customerName}
                            </span>
                            <div className="text-[11px] text-[var(--muted)]">
                              {inv.customerPhone} · Hạng {inv.tier}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-[13px] text-[var(--text)]">{inv.branch}</td>
                      <td>
                        <Badge variant={inv.typeVariant}>{inv.type}</Badge>
                      </td>
                      <td className="text-xs text-[var(--muted)]">{inv.date}</td>
                      <td className="text-[13px] font-bold text-[var(--text)]">
                        {inv.total.toLocaleString("vi-VN")} đ
                        {inv.netTotal !== undefined && (
                          <div className="text-xs font-normal text-[var(--muted)]">
                            Sau điều chỉnh: {formatCurrency(inv.netTotal)}
                          </div>
                        )}

                        {inv.parentOrderId && (
                          <div className="text-xs font-normal text-[var(--muted)]">
                            Chuyển tiếp từ {inv.parentOrderId}
                          </div>
                        )}

                      </td>
                      <td className="text-[13px] font-semibold text-[var(--primary)]">
                        {inv.paid.toLocaleString("vi-VN")} đ
                      </td>
                      <td>
                        <Badge variant={inv.statusVariant}>{inv.status}</Badge>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <Link to={`/invoices/${inv.id}`} className="btn btn-secondary btn-sm">
                            Xem
                          </Link>
                          {!isCashier() && <button
                            type="button"
                            className="btn btn-secondary btn-icon-sm"
                            aria-label="In biên lai"
                            title="In Biên Lai"
                            onClick={() => {
                              navigate(`/invoices/${inv.id}`);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Phân trang */}
          <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-[var(--muted)]">
              {filteredInvoices.length === 0
                ? "Hiển thị 0 hóa đơn"
                : `Hiển thị ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredInvoices.length)} trong tổng ${filteredInvoices.length} hóa đơn`}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Trước
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className={`btn btn-sm ${pNum === currentPage ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau ›
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Lập Hóa Đơn & Chứng Từ Mới */}
      <Modal
        open={showCreateModal}
        title="Lập Hóa Đơn Bán Lẻ &amp; Đơn Sỉ Mới"
        size="xl"
        onClose={() => setShowCreateModal(false)}
        footer={
          <div className="flex justify-between items-center w-full flex-wrap gap-3">
            <div className="text-sm font-semibold">
              Tổng thanh toán (gồm VAT 8%):{" "}
              <span className="text-lg text-[var(--primary)] font-bold">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                form="create-invoice-form"
                className="btn btn-primary"
              >
                Lưu &amp; Xuất Hóa Đơn
              </button>
            </div>
          </div>
        }
      >
        <form
          id="create-invoice-form"
          className="space-y-4"
          onSubmit={handleCreateInvoice}
        >
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">
                Chi Nhánh Phát Hành <span className="text-red-500">*</span>
              </label>
              <select
                className="form-input form-select"
                value={createBranch}
                onChange={(e) => setCreateBranch(e.target.value)}
              >
                <option value="CN01 - Bến Nghé">CN01 - Bến Nghé (Quận 1)</option>
                <option value="CN02 - Võ Văn Tần">CN02 - Võ Văn Tần (Quận 3)</option>
                <option value="CN05 - Hàng Xanh">CN05 - Hàng Xanh (Bình Thạnh)</option>
                <option value="CN06 - D2 Bình Thạnh">CN06 - D2 (Bình Thạnh)</option>
                <option value="CN08 - Cityland">CN08 - Cityland (Gò Vấp)</option>
                <option value="CN09 - Phan Xích Long">CN09 - Phan Xích Long (Phú Nhuận)</option>
              </select>
            </div>
            <div>
              <label className="form-label">
                Phân Loại Hóa Đơn <span className="text-red-500">*</span>
              </label>
              <select
                className="form-input form-select"
                value={createType}
                onChange={(e) =>
                  setCreateType(
                    e.target.value as "Bán Lẻ" | "Đơn Sỉ B2B" | "Giao Hàng"
                  )
                }
              >
                <option value="Bán Lẻ">Bán Lẻ (Tại Quầy / Mang Về)</option>
                <option value="Đơn Sỉ B2B">Đơn Sỉ B2B (Doanh Nghiệp / Công Ty)</option>
                <option value="Giao Hàng">Giao Hàng / Catering Sự Kiện</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="form-label">
                Tên Khách Hàng / Đơn Vị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ví dụ: Cty TNHH Sao Mai hoặc Anh Hùng"
                value={createCustomer}
                onChange={(e) => setCreateCustomer(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Số Điện Thoại</label>
              <input
                type="text"
                className="form-input"
                placeholder="09xxxxxxxx"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Hạng Hội Viên</label>
              <select
                className="form-input form-select"
                value={createTier}
                onChange={(e) =>
                  setCreateTier(
                    e.target.value as "Member" | "Silver" | "Gold" | "VIP"
                  )
                }
              >
                <option value="VIP">VIP (Chiết khấu 10%)</option>
                <option value="Gold">Gold (Chiết khấu 8%)</option>
                <option value="Silver">Silver (Chiết khấu 5%)</option>
                <option value="Member">Member (Khách thường)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">Hình Thức Thanh Toán</label>
              <select
                className="form-input form-select"
                value={createPaymentMethod}
                onChange={(e) => setCreatePaymentMethod(e.target.value)}
              >
                <option value="Tiền mặt">Tiền mặt tại quầy</option>
                <option value="Chuyển khoản QR">Chuyển khoản ngân hàng (QR)</option>
                <option value="Thẻ ngân hàng">Thẻ tín dụng / ATM (POS)</option>
                <option value="Công nợ gối đầu 15 ngày">Công nợ gối đầu 15 ngày (B2B)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Trạng Thái Thanh Toán</label>
              <select
                className="form-input form-select"
                value={createPaymentStatus}
                onChange={(e) =>
                  setCreatePaymentStatus(
                    e.target.value as
                    | "Đã Thanh Toán"
                    | "Thanh Toán 50%"
                    | "Chờ Thanh Toán"
                  )
                }
              >
                <option value="Đã Thanh Toán">Đã Thanh Toán (100%)</option>
                <option value="Thanh Toán 50%">Đặt cọc 50% (Chờ giao hàng)</option>
                <option value="Chờ Thanh Toán">Chờ Thanh Toán (Ghi nợ)</option>
              </select>
            </div>
          </div>

          {/* Danh mục mặt hàng */}
          <div className="card p-0 overflow-hidden border border-[var(--border)]">
            <div className="p-3 bg-[var(--background)] border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Danh Sách Món &amp; Hàng Hóa Xuất Hóa Đơn
                </h4>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
              >
                + Thêm Mặt Hàng
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--surface)]">
                    <th className="py-2.5 px-3 text-left">Tên Món / Sản Phẩm</th>
                    <th className="py-2.5 px-3 text-center w-24">Số Lượng</th>
                    <th className="py-2.5 px-3 text-right w-32">Đơn Giá</th>
                    <th className="py-2.5 px-3 text-right w-36">Thành Tiền</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {createItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--background)]"
                    >
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          className="form-input text-xs py-1"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(item.id, "name", e.target.value)
                          }
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          className="form-input text-xs py-1 text-center"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "quantity",
                              Math.max(1, Number(e.target.value))
                            )
                          }
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          className="form-input text-xs py-1 text-right"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "unitPrice",
                              Math.max(0, Number(e.target.value))
                            )
                          }
                          required
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          className="text-[var(--danger)] hover:opacity-75 disabled:opacity-30 inline-flex items-center justify-center p-1 rounded"
                          disabled={createItems.length <= 1}
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label="Xóa dòng"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-[var(--background)] flex justify-end gap-6 text-xs font-medium">
              <div>
                Tạm tính: <b>{formatCurrency(subtotal)}</b>
              </div>
              <div>
                Thuế GTGT (VAT 8%): <b>{formatCurrency(vat)}</b>
              </div>
              <div>
                Tổng cộng:{" "}
                <b className="text-sm text-[var(--primary)]">
                  {formatCurrency(total)}
                </b>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

