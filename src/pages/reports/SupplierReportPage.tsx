import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";

interface SupplierScorecard {
  name: string;
  category: string;
  batchesCount: number;
  onTimeRate: number;
  safetyStatus: string;
  leadTime: number;
  score: number;
  tierBadge: "success" | "info" | "warning";
  tierText: string;
}

const mockScorecards: SupplierScorecard[] = [
  {
    name: "Công ty TNHH Trà Lộc Phát Bảo Lộc",
    category: "Trà Đen & Oolong nướng",
    batchesCount: 18,
    onTimeRate: 100,
    safetyStatus: "Tuyệt đối (100%)",
    leadTime: 2.0,
    score: 98.5,
    tierBadge: "success",
    tierText: "Hạng A+ (Chiến lược)",
  },
  {
    name: "Công ty Cổ Phần Gia Thịnh Phát (GTP)",
    category: "Topping trân châu & Bột sữa",
    batchesCount: 24,
    onTimeRate: 98.2,
    safetyStatus: "Đạt chuẩn ATVSTP",
    leadTime: 1.5,
    score: 96.0,
    tierBadge: "success",
    tierText: "Hạng A+ (Chiến lược)",
  },
  {
    name: "Vinamilk F&B",
    category: "Sữa tươi & Sữa đặc",
    batchesCount: 30,
    onTimeRate: 99.0,
    safetyStatus: "ISO 22000 Đạt",
    leadTime: 1.0,
    score: 97.0,
    tierBadge: "success",
    tierText: "Hạng A+ (Chiến lược)",
  },
  {
    name: "Công ty TNHH Bao Bì Xanh Sài Gòn",
    category: "Ly nắp & Màng dập",
    batchesCount: 15,
    onTimeRate: 94.0,
    safetyStatus: "Quatest 3 Đạt",
    leadTime: 3.0,
    score: 90.5,
    tierBadge: "info",
    tierText: "Hạng A (Đạt chuẩn)",
  },
];

export default function SupplierReportPage() {
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
            <span className="current">Báo cáo nhà cung cấp</span>
          </nav>
          <h1 className="page-title">Bảng Đánh Giá Hiệu Suất Nhà Cung Cấp (Scorecard)</h1>
          <p className="page-subtitle">
            Đánh giá chất lượng cung ứng, tỷ lệ giao hàng đúng hẹn và tuân thủ tiêu chuẩn.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang xuất bảng chấm điểm nhà cung cấp (PDF)...", {
                title: "Xuất Báo Cáo",
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất PDF Scorecard
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Thống kê nhà cung cấp">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tỷ Lệ Giao Đúng Hạn"
            value="98.6%"
            valueClassName="text-[var(--primary)]"
            subLabel="86/87 lô hàng giao chuẩn hẹn (87 lô hàng)"
            tone="primary"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            }
          />
          <StatCard
            label="Đạt Chuẩn ATVSTP &amp; HSD"
            value="99.4%"
            valueClassName="text-[var(--primary)]"
            subLabel="100% lô có kiểm nghiệm"
            tone="success"
            trend="up"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <StatCard
            label="Thời Gian Giao Trung Bình"
            value="1.8 Ngày"
            subLabel="Đơn khẩn cấp xử lý < 24h"
            tone="info"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Đối Tác Đang Cung Ứng"
            value="18 Đơn vị"
            subLabel="Được xếp hạng A+ và A"
            tone="purple"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Scorecard Table */}
      <section aria-label="Bảng chấm điểm chi tiết đối tác">
        <div className="card p-0 overflow-hidden">
          <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Bảng Tổng Hợp Chấm Điểm Nhà Cung Cấp F&amp;B
            </h3>
            <span className="text-xs text-[var(--muted)]">
              Tiêu chí: Đúng hẹn · Chất lượng · Hạn dùng FEFO · Hỗ trợ khẩn cấp
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nhà Cung Cấp</th>
                  <th>Nhóm Nguyên Liệu</th>
                  <th className="text-center">Số Lô Nhập</th>
                  <th className="text-center">Đúng Hẹn (%)</th>
                  <th className="text-center">Chuẩn ATVSTP</th>
                  <th className="text-center">Lead Time (Ngày)</th>
                  <th className="text-center">Điểm Đánh Giá</th>
                  <th className="text-center">Xếp Hạng</th>
                </tr>
              </thead>
              <tbody>
                {mockScorecards.map((sc) => (
                  <tr key={sc.name}>
                    <td className="font-bold text-[var(--text)]">{sc.name}</td>
                    <td>{sc.category}</td>
                    <td className="text-center font-bold">{sc.batchesCount}</td>
                    <td className="text-center font-bold text-emerald-600">
                      {sc.onTimeRate}%
                    </td>
                    <td className="text-center">
                      <Badge variant="success">{sc.safetyStatus}</Badge>
                    </td>
                    <td className="text-center">{sc.leadTime}</td>
                    <td className="text-center font-extrabold text-[var(--primary)]">
                      {sc.score} / 100
                    </td>
                    <td className="text-center">
                      <Badge variant={sc.tierBadge}>{sc.tierText}</Badge>
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

