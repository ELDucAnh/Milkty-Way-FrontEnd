import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";

interface TopCustomer {
  name: string;
  phone: string;
  tier: string;
  tierTone: "purple" | "warning" | "info" | "gray";
  totalSpent: number;
  ordersCount: number;
  points: number;
  favoriteBranch: string;
}

const mockTopCustomers: TopCustomer[] = [
  {
    name: "Chị Hoàng Lan Phương",
    phone: "0908 111 222",
    tier: "VIP Diamond",
    tierTone: "purple",
    totalSpent: 18450000,
    ordersCount: 96,
    points: 1845,
    favoriteBranch: "CN01 — Quận 1",
  },
  {
    name: "Anh Trần Bảo Long",
    phone: "0912 333 444",
    tier: "VIP Diamond",
    tierTone: "purple",
    totalSpent: 12800000,
    ordersCount: 68,
    points: 1280,
    favoriteBranch: "CN05 — Quận 10",
  },
  {
    name: "Chị Lê Thảo Nguyên",
    phone: "0938 555 666",
    tier: "Gold Member",
    tierTone: "warning",
    totalSpent: 8200000,
    ordersCount: 42,
    points: 820,
    favoriteBranch: "CN06 — Bình Thạnh",
  },
  {
    name: "Anh Vũ Tuấn Khang",
    phone: "0977 777 888",
    tier: "Silver Member",
    tierTone: "info",
    totalSpent: 4600000,
    ordersCount: 19,
    points: 460,
    favoriteBranch: "CN02 — Quận 3",
  },
];

export default function CustomerReportPage() {
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
            <span className="current">Báo cáo khách hàng</span>
          </nav>
          <h1 className="page-title">Báo Cáo Thành Viên &amp; Khách Hàng VIP</h1>
          <p className="page-subtitle">
            Thống kê phân hạng hội viên, tỷ lệ khách quay lại và hiệu quả chương trình ưu đãi.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang xuất danh sách hội viên VIP (Excel)...", {
                title: "Xuất Dữ Liệu",
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Xuất Excel Loyalty
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Thống kê hội viên">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Số Thành Viên"
            value="28.450"
            subLabel="+1.820 mới trong tháng"
            tone="info"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Khách Hàng VIP &amp; Gold"
            value="3.120 (11%)"
            valueClassName="text-[var(--warning)]"
            subLabel="Chiếm 42% doanh thu toàn chuỗi"
            tone="warning"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
          />
          <StatCard
            label="Tần Suất Ghé Quán"
            value="3.4 lần/tháng"
            valueClassName="text-[var(--primary)]"
            subLabel="Khách VIP đạt 6.8 lần/tháng"
            tone="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
              </svg>
            }
          />
          <StatCard
            label="Điểm Tích Lũy Đã Đổi"
            value="1.450.000 pts"
            subLabel="Đổi 14.500 ly trà sữa miễn phí"
            tone="purple"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 12 20 22 4 22 4 12" />
                <rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Phân Bổ Hạng Thẻ */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
                Cơ Cấu 4 Hạng Thành Viên
              </h3>
              <Badge variant="info">MilktyWay Loyalty</Badge>
            </div>
            <div className="h-[200px] flex items-center justify-center">
              <div className="relative w-36 h-36 rounded-full border-8 border-amber-500 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-black text-[var(--text)]">28.4k</div>
                  <div className="text-[10px] text-[var(--muted)]">Hội viên chuỗi</div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[var(--border)] pt-3 mt-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Hạng Thành Viên: 0 - 199 điểm (Tích lũy 1 điểm / 10.000đ)</span>
              <span className="font-bold">65% (18.490)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Hạng Bạc (Silver): 200 - 499 điểm (Chiết khấu 5%)</span>
              <span className="font-bold">24% (6.840)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-500 font-semibold">Hạng Vàng (Gold): 500 - 999 điểm (Chiết khấu 10% + Free Topping)</span>
              <span className="font-bold">8% (2.280)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-600 font-semibold">Hạng VIP (Diamond): Từ 1.000 điểm trở lên (Chiết khấu 15% + x2 điểm thứ 4)</span>
              <span className="font-bold">3% (840)</span>
            </div>
          </div>
        </div>

        {/* Tần suất quay lại theo tuần */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Tỷ Lệ Khách Hàng Quay Lại (Retention Rate) Theo Tuần
            </h3>
            <Badge variant="success">Mục tiêu &gt; 65%</Badge>
          </div>
          <div className="h-[250px] flex flex-col justify-end pt-4">
            <div className="flex items-end justify-between h-[200px] gap-6 px-4 border-b border-[var(--border)]">
              {[
                { week: "Tuần 1", rate: 64 },
                { week: "Tuần 2", rate: 67 },
                { week: "Tuần 3", rate: 71 },
                { week: "Tuần 4", rate: 74 },
              ].map((item) => (
                <div key={item.week} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-16 rounded-t-lg bg-[#22B573] hover:opacity-90 transition-all flex items-start justify-center pt-2 text-xs font-bold text-white"
                    style={{ height: `${item.rate}%` }}
                  >
                    <span>{item.rate}%</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">{item.week}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Loyalty Customers Table */}
      <section aria-label="Khách hàng thân thiết">
        <div className="card p-0 overflow-hidden">
          <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Top Hội Viên Thân Thiết Có Doanh Số Cao Nhất (12 Tháng Qua)
            </h3>
            <span className="text-xs text-[var(--muted)]">
              Áp dụng chính sách giữ hạng 12 tháng
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Họ Tên Khách Hàng</th>
                  <th>Số Điện Thoại Tra Cứu</th>
                  <th>Hạng Thẻ</th>
                  <th className="text-right">Tổng Chi Tiêu 12T</th>
                  <th className="text-center">Số Lần Mua</th>
                  <th className="text-right">Điểm Khả Dụng</th>
                  <th>Chi Nhánh Hay Ghé</th>
                  <th className="text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {mockTopCustomers.map((c) => (
                  <tr key={c.phone}>
                    <td className="font-bold text-[var(--text)]">{c.name}</td>
                    <td className="font-mono text-xs">{c.phone}</td>
                    <td>
                      <Badge variant={c.tierTone}>{c.tier}</Badge>
                    </td>
                    <td className="text-right font-bold text-[var(--primary)]">
                      {c.totalSpent.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="text-center font-semibold">{c.ordersCount} đơn</td>
                    <td className="text-right font-semibold text-amber-600">
                      {c.points.toLocaleString("vi-VN")} pts
                    </td>
                    <td>{c.favoriteBranch}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          toast.info(`Xem lịch sử tích điểm của ${c.name}`, {
                            title: "Chi Tiết Điểm",
                          })
                        }
                      >
                        Xem Lịch Sử
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

