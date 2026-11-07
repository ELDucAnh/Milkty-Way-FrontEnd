import { isCashier, counterBranch } from "../../utils/auth";
import { useState, useMemo } from "react";
import { Navigate, Link, useParams, useSearchParams } from "react-router-dom";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";
import { formatCurrency } from "../../utils/format";
import { loadInvoices, loadOrders } from "../shared/sales-orders-store";
import type { InvoiceRecord, SalesOrder } from "../shared/sales-orders-store";

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const toast = useToast();
  const [printFormat, setPrintFormat] = useState<"k80" | "k57">("k80");

  const invoices = useMemo(() => loadInvoices().filter(i => !isCashier() || i.branch.startsWith(counterBranch)), []);
  const orders = useMemo(() => loadOrders().filter(o => !isCashier() || o.branchId === counterBranch), []);

  const effectiveId = id && id !== "invoice-details" ? id : null;

  // Tìm hóa đơn hoặc đơn hàng tương ứng
  const matchedOrder = useMemo(() => {
    if (orderIdParam) {
      const byOrder = orders.find(o => o.id === orderIdParam);
      if (byOrder) return byOrder;
    }
    if (effectiveId) {
      const byId = orders.find(o => o.id === effectiveId);
      if (byId) return byId;
      const inv = invoices.find(i => i.id === effectiveId || i.orderId === effectiveId);
      if (inv?.orderId) {
        const byInv = orders.find(o => o.id === inv.orderId);
        if (byInv) return byInv;
      }
    }
    if (!effectiveId && !orderIdParam) {
      return orders[0];
    }
    return undefined;
  }, [effectiveId, orderIdParam, orders, invoices]);

  const matchedInvoice = useMemo(() => {
    if (effectiveId) {
      const byId = invoices.find(inv => inv.id === effectiveId || inv.orderId === effectiveId);
      if (byId) return byId;
    }
    if (orderIdParam) {
      const byOrder = invoices.find(inv => inv.orderId === orderIdParam || inv.id === orderIdParam);
      if (byOrder) return byOrder;
    }
    if (matchedOrder) {
      const byMatchedOrder = invoices.find(inv => inv.orderId === matchedOrder.id);
      if (byMatchedOrder) return byMatchedOrder;
      return undefined;
    }
    if (isCashier() && (orderIdParam || effectiveId)) return undefined;
    return invoices[0];
  }, [effectiveId, orderIdParam, invoices, matchedOrder]);

  if (isCashier() && !matchedInvoice && !matchedOrder) return <Navigate to="/invoices" replace />;

  const invoiceId = matchedInvoice
    ? matchedInvoice.id
    : (effectiveId || `HD-${matchedOrder?.branchId || "CN01"}-${(matchedOrder?.id || "000125").replace(/\D/g, "").padStart(6, "0")}`);
  const orderId = matchedInvoice?.orderId || matchedOrder?.id || orderIdParam || "DH-00125";
  const customerName = matchedInvoice?.customerName || matchedOrder?.customer || "Trần Văn An";
  const customerPhone = matchedInvoice?.customerPhone || matchedOrder?.phone || "0908 123 456";
  const branchName = matchedInvoice?.branch || `${matchedOrder?.branchId || "CN01"} - Bến Nghé (Quận 1)`;
  const branchAddress = matchedInvoice?.branchAddress || "12 Nguyễn Huệ, Quận 1, TP.HCM";
  const invoiceStatus = matchedInvoice?.status || (matchedOrder?.payment === "refunded" ? "Đã Hoàn Tiền" : matchedOrder?.payment === "unpaid" ? "Chờ Thanh Toán" : "Đã Thanh Toán");
  const invoiceStatusVariant = matchedInvoice?.statusVariant || (invoiceStatus === "Đã Hoàn Tiền" ? "danger" : invoiceStatus === "Đã Thanh Toán" ? "success" : "warning");
  const memberTier = matchedInvoice?.tier || "Member";
  const invoiceDate = matchedInvoice?.date || (matchedOrder?.createdAt
    ? new Date(matchedOrder.createdAt).toLocaleDateString("vi-VN") + " — " + new Date(matchedOrder.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleDateString("vi-VN") + " — " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));

  const items = matchedInvoice?.items && matchedInvoice.items.length > 0
    ? matchedInvoice.items
    : (matchedOrder?.items && matchedOrder.items.length > 0 ? matchedOrder.items : [
      {
        id: "item-default-1",
        name: "Trà Sữa Ô Long Nướng",
        size: "L" as const,
        sugar: "50%",
        ice: "Ít đá",
        toppings: ["Trân châu hoàng kim", "Kem phô mai"],
        note: "Ít ngọt",
        quantity: 1,
        unitPrice: 55000,
      },
      {
        id: "item-default-2",
        name: "Trà Sữa Trân Châu Hoàng Kim",
        size: "M" as const,
        sugar: "70%",
        ice: "Vừa đá",
        toppings: ["Pudding trứng"],
        note: "",
        quantity: 1,
        unitPrice: 46000,
      }
    ]);

  const computedSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const subtotal = matchedInvoice?.subtotal ?? matchedOrder?.subtotal ?? computedSubtotal;
  const discount = matchedInvoice?.discount ?? matchedOrder?.discount ?? 0;
  const tax = matchedInvoice?.tax ?? matchedOrder?.tax ?? 0;
  const total = matchedInvoice?.total ?? matchedOrder?.total ?? (subtotal - discount + tax);
  const paid = matchedInvoice?.paid ?? total;
  const change = matchedInvoice?.change ?? Math.max(0, paid - total);
  const paymentMethod = matchedInvoice?.paymentMethod || (matchedOrder?.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản QR");

  const handlePrint = (format: "k80" | "k57") => {
    setPrintFormat(format);
    if (format === "k57") {
      document.body.classList.add("print-k57");
      toast.info("Đang chuẩn bị bản in theo khổ K57 (57mm)...", { title: "In Bill K57" });
    } else {
      document.body.classList.remove("print-k57");
      toast.info("Đang chuẩn bị bản in theo khổ K80 (80mm)...", { title: "In Bill K80" });
    }
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("print-k57"), 1000);
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang với nút thao tác */}
      <div className="page-header no-print">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={isCashier() ? "/sales/pos" : "/dashboard"}>Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/invoices">Hóa đơn</Link>
            <span className="sep">/</span>
            <span className="current">Chi tiết {invoiceId}</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="page-title mb-0">Hóa Đơn {invoiceId}</h1>
            <Badge variant={invoiceStatusVariant}>{invoiceStatus.toUpperCase()}</Badge>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Link to="/invoices" className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Danh sách hóa đơn
          </Link>
          {!isCashier() && <><div className="inline-flex rounded-lg shadow-sm border border-[var(--border)] overflow-hidden">
            <button
              type="button"
              className={`btn btn-secondary border-none rounded-none text-xs px-3 ${printFormat === "k80" ? "bg-[var(--surface)]" : ""
                }`}
              onClick={() => handlePrint("k80")}
              title="In khổ tiêu chuẩn K80 (80mm)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              In Bill K80
            </button>
            <button
              type="button"
              className="btn btn-secondary border-none border-l border-[var(--border)] rounded-none text-xs px-2.5 bg-[var(--background)] hover:bg-[var(--border)]"
              onClick={() => handlePrint("k57")}
              title="In khổ nhỏ K57 (57mm)"
            >
              In K57
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => toast.info(`Đang in phiếu pha chế (KOT) cho đơn ${orderId}...`, { title: "In Phiếu KOT" })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            In Phiếu Pha (KOT)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => toast.success(`Đã gửi hóa đơn điện tử đến SĐT ${customerPhone}`, { title: "Gửi Thành Công" })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Gửi Cho Khách
          </button></>}
        </div>
      </div>

      {/* Thông tin POS (Thông tin ca, quầy) — không in */}
      <div className="no-print mb-4">
        <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 text-[13px] flex-wrap">
            <div>
              <span className="text-[var(--muted)]">Chi nhánh: </span>
              <span className="font-semibold text-[var(--text)]">{branchName}</span>
            </div>
            <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
            <div>
              <span className="text-[var(--muted)]">Thu ngân: </span>
              <span className="font-semibold text-[var(--text)]">Nguyễn An (NV-01)</span>
            </div>
            <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
            <div>
              <span className="text-[var(--muted)]">Ca: </span>
              <span className="font-semibold text-[var(--text)]">Ca Sáng (07:00–15:00)</span>
            </div>
            <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
            <div>
              <span className="text-[var(--muted)]">Mã đơn gốc: </span>
              <span className="font-semibold text-[var(--primary)] font-mono">{orderId}</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Trực tuyến — Đã đồng bộ máy chủ
          </span>
        </div>
      </div>

      {/* Hóa đơn có thể in */}
      <div className="card printable-card max-w-4xl mx-auto p-6 md:p-10 relative shadow-md">
        {/* Dấu trạng thái thanh toán */}
        <div className="absolute top-[30px] right-[40px] border-[3px] border-[var(--primary)] text-[var(--primary)] font-black text-xl px-[18px] py-1 rounded-lg rotate-[8deg] tracking-[2px] uppercase opacity-[0.85] no-print">
          {invoiceStatus.toUpperCase()}
        </div>

        {/* Header hóa đơn */}
        <div className="flex justify-between items-start flex-wrap gap-5 mb-8 pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-[48px] h-[48px] rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-md">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="white" fillOpacity="0.2"/>
                <circle cx="12" cy="12" r="3" fill="white"/>
              </svg>
            </div>
            <div className="border-l border-[var(--border)] pl-3">
              <div className="text-[24px] font-extrabold text-[var(--text)] leading-tight tracking-tight">MilktyWay</div>
              <div className="text-[11px] text-[var(--primary)] font-bold tracking-wider uppercase mt-0.5">
                Chuỗi Cửa Hàng Trà Sữa Chuẩn Vị
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-[var(--text)]">{branchName}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">{branchAddress}</div>
            <div className="text-xs text-[var(--muted)]">TP. Hồ Chí Minh · Hotline: 1900 6868</div>
            <div className="text-xs text-[var(--muted)]">MST: 0314-888-999 · MilktyWay.vn</div>
          </div>
        </div>

        {/* Thông tin khách & hóa đơn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
              Thông Tin Khách Hàng:
            </div>
            <div className="text-[16px] font-bold text-[var(--text)]">{customerName}</div>
            <div className="text-[13px] text-[var(--muted)] mt-0.5">SĐT: {customerPhone}</div>
            <div className="text-[13px] text-[var(--muted)]">
              Hạng thành viên:{" "}
              <span className="font-semibold text-emerald-600">
                {memberTier === "VIP"
                  ? "VIP (Chiết khấu 15%)"
                  : memberTier === "Gold"
                  ? "Gold (Chiết khấu 10%)"
                  : memberTier === "Silver"
                  ? "Silver (Chiết khấu 5%)"
                  : "Member (Hội viên thân thiết)"}
              </span>
            </div>
            <div className="text-[13px] text-[var(--muted)] mt-1">
              Điểm tích lũy đơn này: <span className="font-bold text-[var(--primary)]">+{Math.round(total / 10000)} điểm</span>
            </div>
          </div>
          <div className="bg-[var(--background)] p-4 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">Mã Hóa Đơn:</span>
              <span className="font-bold font-mono text-[var(--text)]">{invoiceId}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">Mã Đơn Bán:</span>
              <span className="font-bold font-mono text-[var(--primary)]">{orderId}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">Thời gian:</span>
              <span className="font-semibold text-[var(--text)]">{invoiceDate}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">Hình thức thanh toán:</span>
              <span className="font-semibold text-[var(--text)]">{paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* Bảng các món */}
        <div className="overflow-x-auto mb-6">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="w-[40px]">#</th>
                <th>Tên Món &amp; Tùy Chọn</th>
                <th className="text-right">Đơn Giá</th>
                <th className="text-center w-[60px]">SL</th>
                <th className="text-right">Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="text-xs text-[var(--muted)]">{index + 1}</td>
                  <td>
                    <div className="font-bold text-[var(--text)] text-sm">{item.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">
                      Cỡ {item.size} · Đường {item.sugar} · Đá {item.ice}
                      {item.toppings && item.toppings.length > 0 && ` · +${item.toppings.join(", ")}`}
                    </div>
                    {item.note && (
                      <div className="text-[11px] text-amber-700 italic">
                        Ghi chú: {item.note}
                      </div>
                    )}
                  </td>
                  <td className="text-right text-[13px]">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-center font-bold">{item.quantity}</td>
                  <td className="text-right font-bold text-[var(--text)]">{formatCurrency(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tổng cộng */}
        <div className="flex justify-end mb-8">
          <div className="w-[340px] flex flex-col gap-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">Tạm tính:</span>
              <span className="font-semibold text-[var(--text)]">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[13px] text-emerald-600 font-semibold">
                <span>Ưu đãi chiết khấu:</span>
                <span>−{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">Thuế VAT:</span>
              <span className="font-semibold text-[var(--text)]">{tax > 0 ? formatCurrency(tax) : "0 ₫ (Đã bao gồm)"}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold border-t-2 border-[var(--border)] pt-2.5 mt-1">
              <span className="text-[var(--text)]">Tổng Thanh Toán:</span>
              <span className="text-[var(--primary)] text-xl">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-[var(--primary)] font-semibold bg-emerald-50 py-2 px-3 rounded-lg mt-1">
              <span>Tiền khách đưa:</span>
              <span>{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-semibold px-3">
              <span className="text-[var(--muted)]">Tiền thừa trả lại:</span>
              <span className="text-[var(--text)]">{formatCurrency(change)}</span>
            </div>
          </div>
        </div>

        {/* Footer hóa đơn */}
        <div className="border-t border-[var(--border)] pt-5 flex justify-between items-end flex-wrap gap-5">
          <div className="max-w-[420px]">
            <div className="text-xs font-bold text-[var(--text)] mb-1">Cảm ơn quý khách đã ủng hộ MilktyWay!</div>
            <div className="text-[11px] text-[var(--muted)] leading-relaxed">
              Trà sữa MilktyWay — Đậm đà hương vị, tươi mát tự nhiên. Khiếu nại dịch vụ vui lòng liên hệ hotline 1900 6868 hoặc
              truy cập MilktyWay.vn trong vòng 30 phút kể từ khi nhận nước.
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              Mã tra cứu hóa đơn: <strong>{invoiceId}</strong>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-[var(--muted)] mb-1.5 font-medium">Quét QR tích điểm & nhận voucher</div>
            <div className="w-[68px] h-[68px] bg-[var(--background)] border border-[var(--border)] rounded-lg flex items-center justify-center mx-auto">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M14 14h3v3h-3z" />
                <path d="M17 17h4v4h-4z" />
              </svg>
            </div>
            <div className="text-[10px] text-[var(--muted)] mt-1 font-mono">MilktyWay.vn/loyalty</div>
          </div>
        </div>
      </div>
    </div>
  );
}
