import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";
import { canVisit, homePath, scopedBranch } from "../../utils/auth";
import { useDemoState } from "../shared/useDemoState";
import { buildStockSummary } from "../shared/stock-summary";

export default function InventoryReportPage() {
  const toast = useToast();
  const [data] = useDemoState();
  const branchScope = scopedBranch();
  const [selectedWarehouse, setSelectedWarehouse] = useState(branchScope ?? "");

  // Nguồn dữ liệu duy nhất: DemoState (cùng kho với trang kiểm kê, nhập kho, cấp phát, POS).
  const summary = useMemo(() => buildStockSummary(data, selectedWarehouse), [data, selectedWarehouse]);
  const filteredExpiringLots = summary.expiringLots;
  const filteredStockItems = summary.stockItems;
  const totalValuation = summary.totalValue;
  const estimatedRevenue = Math.round(totalValuation * 2.65);
  const lowStockCount = summary.lowStockCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            {canVisit("/reports/sales-report") ? <Link to="/reports">Báo cáo</Link> : <span>Báo cáo</span>}
            <span className="sep">/</span>
            <span className="current">Báo cáo tồn kho</span>
          </nav>
          <h1 className="page-title">Báo Cáo Tồn Kho &amp; Cảnh Báo Cận Date (FEFO)</h1>
          <p className="page-subtitle">
            Giám sát giá trị tồn kho, tồn an toàn và cảnh báo hạn sử dụng theo nguyên tắc FEFO.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <select
            className="form-input form-select text-xs w-auto"
            disabled={!!branchScope}
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">Tất cả kho &amp; chi nhánh</option>
            <option value="Kho Tổng">Kho Tổng Trung Tâm</option>
            <option value="Khu chế biến">Khu chế biến tập trung</option>
            {data.stores.map((store) => (
              <option key={store.id} value={store.id}>
                Quầy {store.code} — {store.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đang xuất biên bản kiểm kê FEFO (PDF)...", {
                title: "Xuất Báo Cáo",
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất Báo Cáo Kiểm Kê
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Thống kê tồn kho">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Định Giá Tồn Kho Toàn Chuỗi"
            value={`${totalValuation.toLocaleString("vi-VN")} đ`}
            subLabel="Theo giá vốn nhập (COGS)"
            tone="info"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            }
          />
          <StatCard
            label="Giá Trị Bán Ra Dự Kiến"
            value={`${estimatedRevenue.toLocaleString("vi-VN")} đ`}
            valueClassName="text-[var(--primary)]"
            subLabel={`Trên ${filteredStockItems.length} danh mục nguyên liệu`}
            tone="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            }
          />
          <StatCard
            label="Nguyên Liệu Dưới Tồn An Toàn"
            value={`${lowStockCount} Mặt hàng`}
            valueClassName="text-[var(--warning)]"
            subLabel="Cần đặt NCC hoặc chuyển kho"
            tone="warning"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
          <StatCard
            label="Lô Cận Date 7 Ngày (FEFO)"
            value={`${filteredExpiringLots.length} Lô hàng`}
            valueClassName="text-[var(--danger)]"
            subLabel="Gồm cả lô đã quá hạn cần cách ly"
            tone="danger"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Warning Table: FEFO Lô Sắp Hết Hạn */}
      <section aria-label="Lô hàng cận date FEFO">
        <div className="card p-0 overflow-hidden border-2 border-amber-300 mb-6">
          <div className="py-3 px-5 bg-amber-500/10 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              <h3 className="text-[15px] font-bold text-amber-900 mb-0">
                Cảnh Báo Lô Nguyên Liệu Sắp Hết Hạn Sử Dụng (Nguyên tắc xuất FEFO)
              </h3>
            </div>
            <Badge variant="warning">Ưu tiên xuất dùng trước trong 48h - 7 ngày</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Lô (Batch ID)</th>
                  <th>Tên Nguyên Liệu</th>
                  <th>Kho Lưu Trữ</th>
                  <th>Số Lượng Tồn</th>
                  <th>Hạn Sử Dụng (EXP)</th>
                  <th>Số Ngày Còn Lại</th>
                  <th>Hành Động Khuyến Nghị</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpiringLots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-xs text-[var(--muted)]">
                      Không có lô nguyên liệu cận date tại kho đã chọn.
                    </td>
                  </tr>
                ) : (
                  filteredExpiringLots.map((lot) => (
                    <tr
                      key={lot.id}
                      className={lot.remainingTone === "danger" ? "bg-red-50/50" : ""}
                    >
                      <td className="font-bold text-red-600">{lot.batchId}</td>
                      <td className="font-semibold text-[var(--text)]">{lot.name}</td>
                      <td>
                        <Badge variant="info">{lot.warehouse}</Badge>
                      </td>
                      <td className="font-bold">{lot.quantity}</td>
                      <td className="font-bold text-red-600">{lot.expDate}</td>
                      <td>
                        <Badge variant={lot.remainingTone}>{lot.remainingText}</Badge>
                      </td>
                      <td className="text-xs font-semibold text-red-700">{lot.actionNote}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${lot.remainingTone === "danger" ? "btn-primary" : "btn-secondary"
                            }`}
                          onClick={() =>
                            toast.info(`Thực hiện: ${lot.actionButtonText} cho lô ${lot.batchId}`, {
                              title: "FEFO",
                            })
                          }
                        >
                          {lot.actionButtonText}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Inventory Valuation Table */}
      <section aria-label="Bảng tồn kho chi tiết">
        <div className="card p-0 overflow-hidden">
          <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Bảng Đối Soát Tồn Kho &amp; Định Mức Tồn An Toàn
            </h3>
            <span className="text-xs text-[var(--muted)]">
              Cập nhật tự động sau mỗi đơn POS &amp; Nhập kho
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên Nguyên Liệu</th>
                  <th>Kho Lưu Trữ</th>
                  <th>Nhóm Mặt Hàng</th>
                  <th>Đơn Vị</th>
                  <th className="text-right">Tồn Thực Tế</th>
                  <th className="text-right">Tồn Tối Thiểu</th>
                  <th className="text-right">Đơn Giá Vốn</th>
                  <th className="text-right">Giá Trị Tồn (VNĐ)</th>
                  <th className="text-center">Trạng Thái Kho</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-xs text-[var(--muted)]">
                      Không có dữ liệu nguyên liệu tồn kho tại kho đã chọn.
                    </td>
                  </tr>
                ) : (
                  filteredStockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold">{item.sku}</td>
                      <td className="font-semibold text-[var(--text)]">{item.name}</td>
                      <td>
                        <Badge variant="info">{item.warehouse}</Badge>
                      </td>
                      <td>
                        <Badge variant={item.categoryTone}>{item.category}</Badge>
                      </td>
                      <td>{item.unit}</td>
                      <td className="text-right font-bold">{item.stockActual}</td>
                      <td className="text-right text-[var(--muted)]">{item.stockMin}</td>
                      <td className="text-right">{item.costPrice.toLocaleString("vi-VN")} ₫</td>
                      <td className="text-right font-bold text-[var(--text)]">
                        {item.totalValue.toLocaleString("vi-VN")} ₫
                      </td>
                      <td className="text-center">
                        <Badge variant={item.statusTone}>{item.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

