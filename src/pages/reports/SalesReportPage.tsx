import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";
import { scopedBranch } from "../../utils/auth";

interface BestSeller {
  name: string;
  category: string;
  categoryTone: "success" | "warning" | "info";
  quantity: number;
  revenue: number;
  trend: string;
}

const mockBestSellers: BestSeller[] = [
  {
    name: "Trà Sữa Trân Châu Hoàng Kim (Size L)",
    category: "Trà Sữa",
    categoryTone: "success",
    quantity: 9450,
    revenue: 425250000,
    trend: "+12%",
  },
  {
    name: "Trà Oolong Nướng Kem Phô Mai (Size M)",
    category: "Trà Sữa",
    categoryTone: "success",
    quantity: 7820,
    revenue: 391000000,
    trend: "+18%",
  },
  {
    name: "Trà Đào Cam Sả Tươi (Size L)",
    category: "Trái Cây",
    categoryTone: "warning",
    quantity: 6150,
    revenue: 276750000,
    trend: "+8%",
  },
  {
    name: "Sữa Tươi Trân Châu Đường Đen (Size M)",
    category: "Sữa Tươi",
    categoryTone: "info",
    quantity: 5400,
    revenue: 243000000,
    trend: "+5%",
  },
  {
    name: "Lục Trà Nhài Mãng Cầu Đắk Lắk (Size L)",
    category: "Trái Cây",
    categoryTone: "warning",
    quantity: 4320,
    revenue: 216000000,
    trend: "+25%",
  },
];

const BRANCH_WEIGHTS: Record<string, number> = {
  "": 1,
  CN01: 0.18,
  CN02: 0.11,
  CN05: 0.14,
  CN06: 0.12,
  CN07: 0.09,
};

const TIME_WEIGHTS: Record<string, number> = {
  month: 1,
  week: 0.25,
  day: 0.035,
};

export default function SalesReportPage() {
  const toast = useToast();
  const branchScope = scopedBranch();
  const [selectedBranch, setSelectedBranch] = useState(branchScope ?? "");
  const [timeFilter, setTimeFilter] = useState("month");

  const scaleFactor = (BRANCH_WEIGHTS[selectedBranch] ?? 1) * (TIME_WEIGHTS[timeFilter] ?? 1);

  const displayedBestSellers = useMemo(() => {
    return mockBestSellers.map((item) => ({
      ...item,
      quantity: Math.max(1, Math.round(item.quantity * scaleFactor)),
      revenue: Math.round((item.revenue * scaleFactor) / 1000) * 1000,
    }));
  }, [scaleFactor]);

  const totalRevenue = Math.round((1842600000 * scaleFactor) / 1000) * 1000;
  const totalCups = Math.max(1, Math.round(42850 * scaleFactor));
  const avgDailyCups = Math.max(
    1,
    Math.round(totalCups / (timeFilter === "month" ? 30 : timeFilter === "week" ? 7 : 1))
  );
  const totalDiscount = Math.round((54200000 * scaleFactor) / 1000) * 1000;

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
            <span className="current">Báo cáo bán hàng</span>
          </nav>
          <h1 className="page-title">Báo Cáo Phân Tích Doanh Thu Chuỗi</h1>
          <p className="page-subtitle">
            Phân tích doanh thu theo chi nhánh, khung giờ cao điểm, kênh bán và món đồ uống bán chạy.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <select
            className="form-input form-select text-xs w-auto"
            disabled={!!branchScope}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">Toàn chuỗi (12 Chi Nhánh)</option>
            <option value="CN01">CN01 — Quận 1 (Nguyễn Huệ)</option>
            <option value="CN02">CN02 — Quận 3 (Võ Văn Tần)</option>
            <option value="CN05">CN05 — Quận 10 (Sư Vạn Hạnh)</option>
            <option value="CN06">CN06 — Bình Thạnh (D2)</option>
            <option value="CN07">CN07 — Gò Vấp (Phan Văn Trị)</option>
          </select>
          <button
            type="button"
            className={`btn btn-sm ${timeFilter === "day" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTimeFilter("day")}
          >
            Theo Ngày
          </button>
          <button
            type="button"
            className={`btn btn-sm ${timeFilter === "week" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTimeFilter("week")}
          >
            Theo Tuần
          </button>
          <button
            type="button"
            className={`btn btn-sm ${timeFilter === "month" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTimeFilter("month")}
          >
            Tháng 10/2026
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang khởi tạo tệp báo cáo PDF chuyên sâu...", {
                title: "Xuất PDF",
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất PDF
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Thống kê doanh thu">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Doanh Thu Bán Hàng"
            value={`${totalRevenue.toLocaleString("vi-VN")} đ`}
            subLabel="+14.8% so với kỳ trước"
            tone="primary"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <StatCard
            label="Tổng Số Ly Phục Vụ"
            value={`${totalCups.toLocaleString("vi-VN")} ly`}
            valueClassName="text-[var(--primary)]"
            subLabel={`Trung bình ${avgDailyCups.toLocaleString("vi-VN")} ly/ngày`}
            tone="info"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 010 8h-1" />
                <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            }
          />
          <StatCard
            label="Giá Trị Đơn Trung Bình (AOV)"
            value="72.500 đ"
            subLabel="~1.7 ly + topping / đơn"
            tone="purple"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
            }
          />
          <StatCard
            label="Ưu Đãi Hội Viên &amp; Voucher"
            value={`${totalDiscount.toLocaleString("vi-VN")} đ`}
            valueClassName="text-[var(--warning)]"
            subLabel="Tỷ lệ chiết khấu 2.9%"
            tone="warning"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Charts Row 1: Trend & Kênh Bán */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Doanh thu theo tuần */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Biểu Đồ Doanh Thu &amp; Lợi Nhuận Gộp ({timeFilter === "day" ? "Hôm Nay" : timeFilter === "week" ? "Tuần Này" : "Tháng 10/2026"})
            </h3>
            <span className="badge badge-info">{selectedBranch || "12 Chi Nhánh"}</span>
          </div>
          {/* Visual SVG Trend Graph */}
          <div className="h-[250px] flex flex-col justify-end">
            <div className="flex items-end justify-between h-[200px] gap-6 px-4 pt-4 border-b border-[var(--border)]">
              {[
                { label: "Tuần 1 (01-07)", revenue: +(412 * scaleFactor).toFixed(1), profit: +(238 * scaleFactor).toFixed(1) },
                { label: "Tuần 2 (08-14)", revenue: +(458 * scaleFactor).toFixed(1), profit: +(265 * scaleFactor).toFixed(1) },
                { label: "Tuần 3 (15-21)", revenue: +(479 * scaleFactor).toFixed(1), profit: +(278 * scaleFactor).toFixed(1) },
                { label: "Tuần 4 (22-28)", revenue: +(493.6 * scaleFactor).toFixed(1), profit: +(286 * scaleFactor).toFixed(1) },
              ].map((item) => {
                const maxVal = 520 * scaleFactor;
                return (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="flex items-end gap-2 w-full justify-center h-full">
                      {/* Revenue Bar */}
                      <div
                        className="w-10 rounded-t-lg bg-[#22B573] hover:opacity-90 transition-all flex flex-col justify-between py-1 items-center text-[10px] text-white font-bold"
                        style={{ height: `${(item.revenue / maxVal) * 100}%` }}
                        title={`Doanh thu: ${item.revenue} Tr. VNĐ`}
                      >
                        <span>{item.revenue}</span>
                      </div>
                      {/* Profit Bar */}
                      <div
                        className="w-8 rounded-t-lg bg-[#3B82F6] hover:opacity-90 transition-all flex flex-col justify-between py-1 items-center text-[10px] text-white font-bold"
                        style={{ height: `${(item.profit / maxVal) * 100}%` }}
                        title={`Lợi nhuận gộp: ${item.profit} Tr. VNĐ`}
                      >
                        <span>{item.profit}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--muted)] text-center">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                <span className="w-3 h-3 rounded bg-[#22B573]"></span> Doanh Thu (Tr. VNĐ)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                <span className="w-3 h-3 rounded bg-[#3B82F6]"></span> Lợi Nhuận Gộp (Tr. VNĐ)
              </span>
            </div>
          </div>
        </div>

        {/* Tỷ Trọng Kênh Bán */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">Tỷ Trọng Kênh Bán</h3>
              <span className="badge badge-success">Đa Kênh</span>
            </div>
            <div className="h-[180px] flex items-center justify-center">
              <div className="relative w-36 h-36 rounded-full border-8 border-[#22B573] flex items-center justify-center shadow-inner">
                <div className="text-center">
                  <div className="text-2xl font-black text-[var(--text)]">48%</div>
                  <div className="text-[10px] text-[var(--muted)]">Tại quầy POS</div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[var(--border)] pt-3 mt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[#22B573] font-semibold">Tại quầy (Counter POS)</span>
              <span className="font-bold">48%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#3B82F6] font-semibold">Đơn mang đi (Takeaway)</span>
              <span className="font-bold">24%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#F59E0B] font-semibold">Đặt Online / App Delivery</span>
              <span className="font-bold">18%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B5CF6] font-semibold">Đơn sỉ B2B / Sự kiện</span>
              <span className="font-bold">10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Khung giờ cao điểm & Top món */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Khung giờ cao điểm */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="card-title">Phân Bổ Lượng Đơn Theo Khung Giờ (Giờ Vàng)</h3>
            <span className="text-xs text-[var(--muted)]">Đỉnh: 11h-13h &amp; 18h-20h</span>
          </div>
          <div className="h-[230px] flex flex-col justify-end pt-4">
            <div className="flex items-end justify-between h-[180px] gap-2 px-2 border-b border-[var(--border)]">
              {[
                { time: "8h-10h", cups: Math.max(1, Math.round(320 * scaleFactor)), color: "bg-emerald-300" },
                { time: "11h-13h (Trưa)", cups: Math.max(1, Math.round(890 * scaleFactor)), color: "bg-[#22B573]" },
                { time: "14h-16h", cups: Math.max(1, Math.round(480 * scaleFactor)), color: "bg-emerald-300" },
                { time: "17h-19h (Tan tầm)", cups: Math.max(1, Math.round(750 * scaleFactor)), color: "bg-emerald-400" },
                { time: "19h-21h (Tối)", cups: Math.max(1, Math.round(920 * scaleFactor)), color: "bg-emerald-600" },
                { time: "21h-22h30", cups: Math.max(1, Math.round(240 * scaleFactor)), color: "bg-slate-300" },
              ].map((h) => {
                const maxCups = Math.max(1, Math.round(1000 * scaleFactor));
                return (
                  <div key={h.time} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      className={`w-full rounded-t-md ${h.color} hover:opacity-90 transition-all flex items-start justify-center pt-1 text-[10px] font-bold text-white`}
                      style={{ height: `${(h.cups / maxCups) * 100}%` }}
                      title={`${h.time}: ${h.cups} ly`}
                    >
                      <span>{h.cups}</span>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] text-center leading-tight">
                      {h.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Món Bán Chạy */}
        <div className="card p-0 overflow-hidden flex flex-col justify-between">
          <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="card-title text-[15px] mb-0">
              Top 5 Món Bán Chạy Nhất {selectedBranch ? `(${selectedBranch})` : "Toàn Chuỗi"}
            </h3>
            <span className="text-xs font-semibold text-[var(--primary)]">
              {timeFilter === "day" ? "Hôm nay" : timeFilter === "week" ? "Tuần này" : "Tháng 10/2026"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên Món Đồ Uống</th>
                  <th>Nhóm Món</th>
                  <th className="text-center">Số Ly Đã Bán</th>
                  <th className="text-right">Doanh Thu</th>
                  <th className="text-center">Xu Hướng</th>
                </tr>
              </thead>
              <tbody>
                {displayedBestSellers.map((item) => (
                  <tr key={item.name}>
                    <td className="font-bold text-[var(--text)]">{item.name}</td>
                    <td>
                      <Badge variant={item.categoryTone}>{item.category}</Badge>
                    </td>
                    <td className="text-center font-bold text-[var(--primary)]">
                      {item.quantity.toLocaleString("vi-VN")} ly
                    </td>
                    <td className="text-right font-extrabold">
                      {item.revenue.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="text-center text-emerald-600 font-bold">{item.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

