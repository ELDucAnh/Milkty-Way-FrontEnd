import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";

interface PurchaseOrder {
  poCode: string;
  date: string;
  supplier: string;
  warehouse: string;
  category: string;
  total: number;
  paymentStatus: string;
  paymentTone: "success" | "warning";
  safetyStatus: string;
}

const mockPurchases: PurchaseOrder[] = [
  {
    poCode: "PO-202610-0042",
    date: "27/10/2026",
    supplier: "Công ty TNHH Trà Lộc Phát Bảo Lộc",
    warehouse: "Kho Tổng Bình Tân",
    category: "Trà Đen & Oolong",
    total: 84500000,
    paymentStatus: "Đã TT 100%",
    paymentTone: "success",
    safetyStatus: "ISO 22000",
  },
  {
    poCode: "PO-202610-0041",
    date: "25/10/2026",
    supplier: "Công ty Cổ Phần Gia Thịnh Phát (GTP)",
    warehouse: "Kho Tổng Bình Tân",
    category: "Topping & Bột béo",
    total: 112000000,
    paymentStatus: "Gối đầu 30 ngày",
    paymentTone: "warning",
    safetyStatus: "HACCP Đạt",
  },
  {
    poCode: "PO-202610-0040",
    date: "24/10/2026",
    supplier: "Vinamilk Chi Nhánh F&B",
    warehouse: "Kho CN01 & CN05",
    category: "Sữa tươi thanh trùng",
    total: 48600000,
    paymentStatus: "Đã TT 100%",
    paymentTone: "success",
    safetyStatus: "Date mới 100%",
  },
];

export default function PurchaseReportPage() {
  const toast = useToast();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/reports">Báo cáo</Link>
            <span className="sep">/</span>
            <span className="current">Báo cáo nhập hàng</span>
          </nav>
          <h1 className="page-title">Báo Cáo Thu Mua &amp; Nhập Hàng F&amp;B</h1>
          <p className="page-subtitle">
            Tổng hợp chi phí thu mua nguyên vật liệu và quản lý công nợ nhà cung cấp.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang kết xuất báo cáo nhập hàng PO (PDF)...", {
                title: "Xuất Báo Cáo",
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất Báo Cáo PDF
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Thống kê nhập hàng">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Chi Phí Mua Hàng"
            value="684.500.000 đ"
            subLabel="Tháng 10/2026 (42 đơn PO)"
            tone="info"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            }
          />
          <StatCard
            label="Đã Thanh Toán"
            value="566.250.000 đ"
            valueClassName="text-[var(--primary)]"
            subLabel="Đạt 82.7% giá trị đơn hàng"
            tone="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <StatCard
            label="Công Nợ Gối Đầu Còn Lại"
            value="118.250.000 đ"
            valueClassName="text-[var(--warning)]"
            subLabel="Hạn thanh toán 15-30 ngày"
            tone="warning"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Tỷ Lệ Đạt Chuẩn Nhập Kho"
            value="99.4%"
            valueClassName="text-emerald-600"
            subLabel="Đầy đủ tem nhãn và HSD FEFO"
            tone="success"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Purchases List Table */}
      <section aria-label="Lịch sử đơn nhập hàng gần đây">
        <div className="card p-0 overflow-hidden">
          <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Lịch Sử Nhập Hàng Gần Đây (Theo Lô &amp; Hạn Dùng)
            </h3>
            <span className="text-xs text-[var(--muted)]">Theo dõi hóa đơn điện tử &amp; phiếu PO</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Đơn PO</th>
                  <th>Ngày Nhập</th>
                  <th>Nhà Cung Cấp</th>
                  <th>Kho Tiếp Nhận</th>
                  <th>Nhóm Nguyên Liệu</th>
                  <th className="text-right">Tổng Tiền (VNĐ)</th>
                  <th className="text-center">Thanh Toán</th>
                  <th className="text-center">ATVSTP</th>
                  <th className="text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {mockPurchases.map((po) => (
                  <tr key={po.poCode}>
                    <td className="font-bold text-[var(--primary)]">{po.poCode}</td>
                    <td>{po.date}</td>
                    <td className="font-semibold text-[var(--text)]">{po.supplier}</td>
                    <td>{po.warehouse}</td>
                    <td>{po.category}</td>
                    <td className="text-right font-bold text-[var(--text)]">
                      {po.total.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="text-center">
                      <Badge variant={po.paymentTone}>{po.paymentStatus}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge variant="success">{po.safetyStatus}</Badge>
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          toast.info(`Xem hóa đơn điện tử đơn ${po.poCode}`, {
                            title: "Hóa Đơn PO",
                          })
                        }
                      >
                        Chi Tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

