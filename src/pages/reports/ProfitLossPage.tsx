import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";
import { scopedBranch } from "../../utils/auth";

interface BranchBreakEven {
  branch: string;
  revenue: number;
  cogs: number;
  opex: number;
  netProfit: number;
  breakEven: number;
  breakEvenPercent: number;
  achievementRate: number;
  statusText: string;
  statusBadge: "success" | "warning" | "danger";
}

const mockBranchData: BranchBreakEven[] = [
  {
    branch: "CN01 — Quận 1 (Nguyễn Huệ)",
    revenue: 342500000,
    cogs: 113025000,
    opex: 62500000,
    netProfit: 166975000,
    breakEven: 95000000,
    breakEvenPercent: 360.5,
    achievementRate: 360.5,
    statusText: "Vượt ngưỡng an toàn",
    statusBadge: "success",
  },
  {
    branch: "CN05 — Quận 10 (Sư Vạn Hạnh)",
    revenue: 238400000,
    cogs: 78672000,
    opex: 48200000,
    netProfit: 111528000,
    breakEven: 75000000,
    breakEvenPercent: 317.8,
    achievementRate: 317.8,
    statusText: "Vượt ngưỡng an toàn",
    statusBadge: "success",
  },
  {
    branch: "CN06 — Bình Thạnh (D2)",
    revenue: 215800000,
    cogs: 71214000,
    opex: 43600000,
    netProfit: 100986000,
    breakEven: 68000000,
    breakEvenPercent: 317.3,
    achievementRate: 317.3,
    statusText: "Vượt ngưỡng an toàn",
    statusBadge: "success",
  },
  {
    branch: "CN02 — Quận 3 (Võ Văn Tần)",
    revenue: 198600000,
    cogs: 65538000,
    opex: 41500000,
    netProfit: 91562000,
    breakEven: 65000000,
    breakEvenPercent: 305.5,
    achievementRate: 305.5,
    statusText: "Vượt ngưỡng an toàn",
    statusBadge: "success",
  },
  {
    branch: "CN12 — Kênh Nước Đen (Tân Phú)",
    revenue: 76200000,
    cogs: 26670000,
    opex: 51330000,
    netProfit: -1800000,
    breakEven: 78000000,
    breakEvenPercent: 97.7,
    achievementRate: 97.7,
    statusText: "Cảnh báo hòa vốn (Cận mức)",
    statusBadge: "warning",
  },
  {
    branch: "CN11 — Lãnh Binh Thăng (Quận 11)",
    revenue: 68400000,
    cogs: 23940000,
    opex: 61060000,
    netProfit: -16600000,
    breakEven: 85000000,
    breakEvenPercent: 80.5,
    achievementRate: 80.5,
    statusText: "3 tuần dưới hòa vốn",
    statusBadge: "danger",
  },
];

export default function ProfitLossPage() {
  const toast = useToast();
  const branchScope = scopedBranch();
  const [selectedPeriod, setSelectedPeriod] = useState<"oct26" | "q3" | "q4">("oct26");

  const periodFactor = selectedPeriod === "q3" ? 2.85 : selectedPeriod === "q4" ? 3.15 : 1;

  const periodBranches = useMemo(() => {
    return mockBranchData
      .filter((b) => !branchScope || b.branch.startsWith(branchScope))
      .map((b) => {
        const revenue = Math.round(b.revenue * periodFactor);
        const cogs = Math.round(b.cogs * periodFactor);
        const opex = Math.round(b.opex * periodFactor);
        const netProfit = revenue - cogs - opex;
        const breakEven = Math.round(b.breakEven * periodFactor);
        return {
          ...b,
          revenue,
          cogs,
          opex,
          netProfit,
          breakEven,
        };
      });
  }, [periodFactor]);

  const summary = useMemo(() => {
    const totalRevenue = periodBranches.reduce((sum, b) => sum + b.revenue, 0);
    const totalCogs = periodBranches.reduce((sum, b) => sum + b.cogs, 0);
    const grossProfit = totalRevenue - totalCogs;
    const totalNetProfit = periodBranches.reduce((sum, b) => sum + b.netProfit, 0);
    const cogsRate = totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : "0.0";
    const grossRate = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const netRate = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    return {
      totalRevenue,
      totalCogs,
      grossProfit,
      totalNetProfit,
      cogsRate,
      grossRate,
      netRate,
    };
  }, [periodBranches]);

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
            <span className="current">Báo cáo lợi nhuận &amp; Lỗ</span>
          </nav>
          <h1 className="page-title">Hiệu Quả Kinh Doanh &amp; Điểm Hòa Vốn Chi Nhánh</h1>
          <p className="page-subtitle">
            Phân tích kết quả kinh doanh, cơ cấu giá vốn (COGS) và điểm hòa vốn chi nhánh.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <button
            type="button"
            className={`btn btn-sm ${selectedPeriod === "q3" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedPeriod("q3")}
          >
            Quý 3/2026
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedPeriod === "q4" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedPeriod("q4")}
          >
            Quý 4/2026
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedPeriod === "oct26" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedPeriod("oct26")}
          >
            Tháng 10/2026 (Hiện tại)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang kết xuất Báo cáo P&L chuỗi MilktyWay (PDF)...", {
                title: "Xuất Báo Cáo",
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất PDF P&amp;L
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <section aria-label="Chỉ số tài chính">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Doanh Thu Thuần"
            value={`${summary.totalRevenue.toLocaleString("vi-VN")} đ`}
            subLabel="+14.8% toàn chuỗi"
            tone="info"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <StatCard
            label="Giá Vốn Nguyên Liệu (COGS)"
            value={`${summary.totalCogs.toLocaleString("vi-VN")} đ`}
            valueClassName="text-[var(--danger)]"
            subLabel={`${summary.cogsRate}% DT (Chuẩn F&B <35%)`}
            tone="danger"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 12l-4-4-4 4" />
                <line x1="12" y1="16" x2="12" y2="8" />
              </svg>
            }
          />
          <StatCard
            label="Lợi Nhuận Gộp (Gross Profit)"
            value={`${summary.grossProfit.toLocaleString("vi-VN")} đ`}
            valueClassName="text-[var(--primary)]"
            subLabel={`Biên lợi nhuận gộp đạt ${summary.grossRate}%`}
            tone="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            }
          />
          <StatCard
            label="Lợi Nhuận Thuần Sau CP"
            value={`${summary.totalNetProfit.toLocaleString("vi-VN")} đ`}
            valueClassName="text-[var(--primary)]"
            subLabel={`Tỷ suất sinh lời ròng ${summary.netRate}%`}
            tone="success"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
        </div>
      </section>

      {/* CẢNH BÁO HÒA VỐN THEO ĐẶC TẢ MỤC 11 */}
      <section aria-label="Cảnh báo điểm hòa vốn">
        <div className="card border-2 border-red-300 bg-red-50/40 p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-[16px] font-bold text-red-900 m-0">
                  Hệ Thống Giám Sát Chi Nhánh Dưới Điểm Hòa Vốn (Break-Even Warning)
                </h3>
                <Badge variant="danger">Cơ Chế Trung Bình Trượt 4 Tuần &amp; 3 Tháng</Badge>
              </div>
              <p className="text-xs text-red-700 mt-1 mb-3">
                Theo quy chuẩn đặc tả vận hành chuỗi trà sữa MilktyWay: Nếu chi nhánh có doanh thu thực tế thấp hơn định phí hoạt động (dưới điểm hòa vốn) liên tiếp 4 tuần hoặc 3 tháng, hệ thống tự động kích hoạt cảnh báo đỏ để Ban Giám Đốc xem xét cải thiện chiến dịch tiếp thị hoặc tái cơ cấu / đóng cửa điểm bán.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-red-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-red-700">CN11 — Lãnh Binh Thăng (Quận 11)</span>
                    <Badge variant="danger">Báo Động Đỏ</Badge>
                  </div>
                  <div className="text-[var(--text)]">
                    Doanh thu T10: <strong>68.400.000 ₫</strong> / Điểm hòa vốn:{" "}
                    <strong>85.000.000 ₫</strong> (Đạt 80.5% · Lỗ -16.600.000 ₫)
                  </div>
                  <div className="text-red-600 font-semibold mt-1">
                    Cảnh báo: 3 tuần liên tiếp dưới điểm hòa vốn — Cần tái cơ cấu menu &amp; chạy Flash Sale
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-amber-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-amber-700">CN12 — Kênh Nước Đen (Tân Phú)</span>
                    <Badge variant="warning">Cảnh Báo Vàng</Badge>
                  </div>
                  <div className="text-[var(--text)]">
                    Doanh thu T10: <strong>76.200.000 ₫</strong> / Điểm hòa vốn:{" "}
                    <strong>78.000.000 ₫</strong> (Đạt 97.7% · Lỗ -1.800.000 ₫)
                  </div>
                  <div className="text-amber-700 font-semibold mt-1">
                    Lưu ý: Cận ngưỡng hòa vốn (Trung bình trượt 4 tuần tiệm cận) — Đang theo dõi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bảng So Sánh Hiệu Quả & Điểm Hòa Vốn 12 Chi Nhánh */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="py-4 px-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Bảng So Sánh Hiệu Quả &amp; Điểm Hòa Vốn 12 Chi Nhánh TP.HCM
            </h3>
            <div className="text-xs text-[var(--muted)] mt-0.5">
              Dữ liệu tài chính {selectedPeriod === "q3" ? "Quý 3/2026" : selectedPeriod === "q4" ? "Quý 4/2026" : "tháng 10/2026"} · Đơn vị: VNĐ
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang tính toán lại số liệu trung bình trượt 4 tuần...", {
                title: "Cập Nhật",
              })
            }
          >
            Cập Nhật Trượt
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chi Nhánh</th>
                <th className="text-right">Doanh Thu Thuần</th>
                <th className="text-right">Giá Vốn COGS</th>
                <th className="text-right">Chi Phí Vận Hành</th>
                <th className="text-right">Lợi Nhuận Thuần</th>
                <th className="text-right">Điểm Hòa Vốn</th>
                <th className="text-center">Tỷ Lệ Đạt</th>
                <th className="text-center">Cảnh Báo Hòa Vốn (4 Tuần / 3 Tháng)</th>
              </tr>
            </thead>
            <tbody>
              {periodBranches.map((b) => (
                <tr
                  key={b.branch}
                  className={
                    b.statusBadge === "danger"
                      ? "bg-red-50/60"
                      : b.statusBadge === "warning"
                        ? "bg-amber-50/40"
                        : ""
                  }
                >
                  <td className="font-bold text-[var(--text)]">{b.branch}</td>
                  <td className="text-right font-extrabold text-[var(--primary)]">
                    {b.revenue.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="text-right text-[var(--muted)]">
                    {b.cogs.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="text-right text-[var(--muted)]">
                    {b.opex.toLocaleString("vi-VN")} ₫
                  </td>
                  <td
                    className={`text-right font-bold ${b.netProfit < 0
                        ? "text-red-600"
                        : b.statusBadge === "warning"
                          ? "text-amber-700"
                          : "text-emerald-600"
                      }`}
                  >
                    {b.netProfit < 0
                      ? `-${Math.abs(b.netProfit).toLocaleString("vi-VN")} ₫`
                      : `${b.netProfit.toLocaleString("vi-VN")} ₫`}
                  </td>
                  <td className="text-right font-medium">
                    {b.breakEven.toLocaleString("vi-VN")} ₫
                  </td>
                  <td
                    className={`text-center font-bold ${b.breakEvenPercent < 100 ? "text-red-600" : "text-emerald-600"
                      }`}
                  >
                    {b.breakEvenPercent}%
                  </td>
                  <td className="text-center">
                    <Badge variant={b.statusBadge}>{b.statusText}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

