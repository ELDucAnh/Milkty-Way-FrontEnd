import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import TemplateChart from "../../components/sales/TemplateChart";
import {
  EmptyState,
  FilterBar,
  InfoTip,
  KpiStrip,
  ScopeBadge,
  SegmentedControl,
  SideDrawer,
  SortableTh,
  SortMenu,
  StatusPill,
  normalizeVi,
  usePageUiState,
  type PillTone,
  type SortOption,
} from "../../components/shared/ui-kit";
import { homePath, scopedBranch } from "../../utils/auth";
import { formatCurrency, formatNumber, getTodayISO } from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";

type PlTab = "branches" | "promotions" | "trend";
type PlSortKey = "profit-desc" | "profit-asc" | "revenue-desc" | "name-asc";

const SORT_OPTIONS: SortOption<PlSortKey>[] = [
  { key: "profit-desc", label: "Lợi nhuận sau thuế cao → thấp", fieldLabel: "Lợi nhuận sau thuế" },
  { key: "profit-asc", label: "Cần tối ưu trước (LN thấp → cao)", fieldLabel: "Lợi nhuận sau thuế" },
  { key: "revenue-desc", label: "Doanh thu cao → thấp", fieldLabel: "Doanh thu" },
  { key: "name-asc", label: "Mã chi nhánh A → Z", fieldLabel: "Chi nhánh" },
];

interface BranchPlRow {
  storeId: string;
  storeName: string;
  orders: number;
  revenue: number;
  cogs: number;
  opexRent: number;
  opexStaff: number;
  opexUtils: number;
  promoCost: number;
  totalCost: number;
  preTaxBalance: number;
  taxAmount: number;
  afterTaxProfit: number;
  netMarginPct: number;
}

const RAW_BRANCH_PL: Array<
  Omit<BranchPlRow, "totalCost" | "preTaxBalance" | "taxAmount" | "afterTaxProfit" | "netMarginPct">
> = [
    { storeId: "CN01", storeName: "Bến Nghé · Q.1", orders: 6420, revenue: 312000000, cogs: 112000000, opexRent: 48000000, opexStaff: 52000000, opexUtils: 14000000, promoCost: 11000000 },
    { storeId: "CN02", storeName: "Bàn Cờ · Q.3", orders: 4380, revenue: 214000000, cogs: 79000000, opexRent: 34000000, opexStaff: 38000000, opexUtils: 10500000, promoCost: 8500000 },
    { storeId: "CN03", storeName: "Chợ Lớn · Q.5", orders: 4120, revenue: 198000000, cogs: 73000000, opexRent: 30000000, opexStaff: 35000000, opexUtils: 9500000, promoCost: 7500000 },
    { storeId: "CN04", storeName: "Tân Hưng · Q.7", orders: 4890, revenue: 236000000, cogs: 86000000, opexRent: 36000000, opexStaff: 40000000, opexUtils: 11000000, promoCost: 9000000 },
    { storeId: "CN05", storeName: "Hàng Xanh · Bình Thạnh", orders: 5940, revenue: 288000000, cogs: 103000000, opexRent: 38000000, opexStaff: 45000000, opexUtils: 12500000, promoCost: 10500000 },
    { storeId: "CN06", storeName: "Làng Đại Học · Thủ Đức", orders: 5210, revenue: 241000000, cogs: 88000000, opexRent: 26000000, opexStaff: 39000000, opexUtils: 10000000, promoCost: 11500000 },
    { storeId: "CN07", storeName: "Bảy Hiền · Tân Bình", orders: 3640, revenue: 176000000, cogs: 66000000, opexRent: 28000000, opexStaff: 33000000, opexUtils: 8500000, promoCost: 6500000 },
    { storeId: "CN08", storeName: "Cityland · Gò Vấp", orders: 4510, revenue: 221000000, cogs: 80000000, opexRent: 31000000, opexStaff: 37000000, opexUtils: 10000000, promoCost: 8000000 },
    { storeId: "CN09", storeName: "Phan Xích Long · PN", orders: 3980, revenue: 194000000, cogs: 71000000, opexRent: 33000000, opexStaff: 34000000, opexUtils: 9200000, promoCost: 7000000 },
    { storeId: "CN10", storeName: "Bắc Hải · Q.10", orders: 3420, revenue: 165000000, cogs: 62000000, opexRent: 27000000, opexStaff: 31000000, opexUtils: 8200000, promoCost: 6200000 },
    { storeId: "CN11", storeName: "Lãnh Binh Thăng · Q.11", orders: 1960, revenue: 94000000, cogs: 36500000, opexRent: 26000000, opexStaff: 27500000, opexUtils: 8000000, promoCost: 12600000 },
    { storeId: "CN12", storeName: "Kênh Nước Đen · Tân Phú", orders: 2150, revenue: 105000000, cogs: 39800000, opexRent: 22000000, opexStaff: 26500000, opexUtils: 7500000, promoCost: 11000000 },
  ];

const BRANCH_PL_ROWS: BranchPlRow[] = RAW_BRANCH_PL.map((b) => {
  const totalCost = b.cogs + b.opexRent + b.opexStaff + b.opexUtils + b.promoCost;
  const preTaxBalance = b.revenue - totalCost;
  const taxAmount = preTaxBalance > 0 ? Math.round(preTaxBalance * 0.2) : 0;
  const afterTaxProfit = preTaxBalance - taxAmount;
  const netMarginPct =
    b.revenue > 0 ? Number(((afterTaxProfit / b.revenue) * 100).toFixed(1)) : 0;
  return {
    ...b,
    totalCost,
    preTaxBalance,
    taxAmount,
    afterTaxProfit,
    netMarginPct,
  };
});

interface PromoCampaignResult {
  id: string;
  code: string;
  name: string;
  branchScopeLabel: string;
  branchIds: string[];
  period: string;
  usageCount: number;
  budget: number;
  campaignRevenue: number;
  discountCost: number;
  cogsCost: number;
  taxAmount: number;
  afterTaxProfit: number;
  effectiveness: "Rất hiệu quả" | "Hiệu quả" | "Cần điều chỉnh";
  tone: PillTone;
}

const PROMOTION_RESULTS: PromoCampaignResult[] = [
  {
    id: "pm-1",
    code: "KM-VIP-T11",
    name: "Đặc quyền Thành viên Bạc / Vàng / VIP",
    branchScopeLabel: "Toàn chuỗi (12 CN)",
    branchIds: ["ALL"],
    period: "01/11 – 30/11",
    usageCount: 3420,
    budget: 55000000,
    campaignRevenue: 318000000,
    discountCost: 34200000,
    cogsCost: 121000000,
    taxAmount: 32560000,
    afterTaxProfit: 130240000,
    effectiveness: "Rất hiệu quả",
    tone: "success",
  },
  {
    id: "pm-2",
    code: "KM-COMBO-TRUA",
    name: "Combo Trưa Tỉnh Táo · Giảm 15% Trà Trái Cây",
    branchScopeLabel: "CN01, CN02, CN05, CN08",
    branchIds: ["CN01", "CN02", "CN05", "CN08"],
    period: "05/11 – 25/11",
    usageCount: 1840,
    budget: 28000000,
    campaignRevenue: 152000000,
    discountCost: 22800000,
    cogsCost: 59000000,
    taxAmount: 14040000,
    afterTaxProfit: 56160000,
    effectiveness: "Hiệu quả",
    tone: "info",
  },
  {
    id: "pm-3",
    code: "KM-HX-CHILL",
    name: "Happy Hour Hàng Xanh · Tặng Thạch Đào",
    branchScopeLabel: "CN05 · Hàng Xanh",
    branchIds: ["CN05"],
    period: "10/11 – 24/11",
    usageCount: 920,
    budget: 14000000,
    campaignRevenue: 64500000,
    discountCost: 11500000,
    cogsCost: 26200000,
    taxAmount: 5360000,
    afterTaxProfit: 21440000,
    effectiveness: "Hiệu quả",
    tone: "success",
  },
  {
    id: "pm-4",
    code: "KM-NEWOPEN-1112",
    name: "Trợ giá thu hút khách khu Tây (Mua 1 Tặng 1)",
    branchScopeLabel: "CN11, CN12",
    branchIds: ["CN11", "CN12"],
    period: "01/11 – 20/11",
    usageCount: 1120,
    budget: 25000000,
    campaignRevenue: 54000000,
    discountCost: 23600000,
    cogsCost: 34200000,
    taxAmount: 0,
    afterTaxProfit: -3800000,
    effectiveness: "Cần điều chỉnh",
    tone: "warning",
  },
];

export default function ProfitLossPage() {
  const toast = useToast();
  const [data] = useDemoState();
  const branchScope = scopedBranch();
  const today = getTodayISO();

  const [ui, setUi] = usePageUiState<{
    branch: string;
    tab: PlTab;
    search: string;
    onlyUnprofitable: boolean;
    sortBy: PlSortKey;
    density: "normal" | "compact";
  }>("mw_ui_pl_report_v1", {
    branch: branchScope ?? "ALL",
    tab: "branches",
    search: "",
    onlyUnprofitable: false,
    sortBy: "profit-desc",
    density: "normal",
  });

  const activeBranch = branchScope ?? ui.branch;
  const [selectedBranchDetail, setSelectedBranchDetail] =
    useState<BranchPlRow | null>(null);

  const scopedRows = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    const rows = BRANCH_PL_ROWS.filter((row) => {
      if (activeBranch !== "ALL" && row.storeId !== activeBranch) return false;
      if (ui.onlyUnprofitable && row.afterTaxProfit >= 0) return false;
      if (
        q &&
        !normalizeVi(`${row.storeId} ${row.storeName}`).includes(q)
      ) {
        return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      if (ui.sortBy === "profit-desc") return b.afterTaxProfit - a.afterTaxProfit;
      if (ui.sortBy === "profit-asc") return a.afterTaxProfit - b.afterTaxProfit;
      if (ui.sortBy === "revenue-desc") return b.revenue - a.revenue;
      return a.storeId.localeCompare(b.storeId);
    });
    return rows;
  }, [activeBranch, ui.onlyUnprofitable, ui.search, ui.sortBy]);

  const unprofitableList = useMemo(
    () =>
      BRANCH_PL_ROWS.filter(
        (r) =>
          (activeBranch === "ALL" || r.storeId === activeBranch) &&
          r.afterTaxProfit < 0,
      ),
    [activeBranch],
  );

  const kpiTotals = useMemo(() => {
    const base = BRANCH_PL_ROWS.filter(
      (r) => activeBranch === "ALL" || r.storeId === activeBranch,
    );
    const revenue = base.reduce((acc, r) => acc + r.revenue, 0);
    const totalCost = base.reduce((acc, r) => acc + r.totalCost, 0);
    const taxAmount = base.reduce((acc, r) => acc + r.taxAmount, 0);
    const afterTaxProfit = base.reduce((acc, r) => acc + r.afterTaxProfit, 0);
    return { revenue, totalCost, taxAmount, afterTaxProfit };
  }, [activeBranch]);

  const filteredPromotions = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    return PROMOTION_RESULTS.filter((pm) => {
      if (
        activeBranch !== "ALL" &&
        !pm.branchIds.includes("ALL") &&
        !pm.branchIds.includes(activeBranch)
      ) {
        return false;
      }
      if (
        q &&
        !normalizeVi(`${pm.code} ${pm.name} ${pm.branchScopeLabel}`).includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeBranch, ui.search]);

  const trendSeries = useMemo(() => {
    const scale =
      activeBranch === "ALL"
        ? 1
        : Number(
          (
            kpiTotals.revenue /
            Math.max(
              1,
              BRANCH_PL_ROWS.reduce((acc, r) => acc + r.revenue, 0),
            )
          ).toFixed(2),
        );
    const rev = [2180, 2260, 2310, 2390, 2410, 2445].map((v) =>
      Math.round(v * scale),
    );
    const cost = [1710, 1740, 1785, 1820, 1810, 1848].map((v) =>
      Math.round(v * scale),
    );
    const profit = rev.map((r, i) => {
      const pre = r - cost[i];
      return pre > 0 ? Math.round(pre * 0.8) : pre;
    });
    return {
      labels: ["T6/2026", "T7/2026", "T8/2026", "T9/2026", "T10/2026", "T11/2026"],
      series: [
        { label: "Doanh thu", data: rev, color: "#0ea5e9" },
        { label: "Tổng chi phí", data: cost, color: "#64748b" },
        { label: "Lợi nhuận sau thuế", data: profit, color: "#10b981" },
      ],
    };
  }, [activeBranch, kpiTotals.revenue]);

  function exportCsv() {
    const header =
      "Chi nhanh,So don,Doanh thu,Tong chi phi,Can doi truoc thue,Thue,Loi nhuan sau thue,Bien LN (%)";
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = scopedRows.map((r) =>
      [
        esc(`${r.storeId} · ${r.storeName}`),
        r.orders,
        r.revenue,
        r.totalCost,
        r.preTaxBalance,
        r.taxAmount,
        r.afterTaxProfit,
        r.netMarginPct,
      ].join(","),
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-loi-nhuan-sau-thue-${activeBranch}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất báo cáo Tài chính & P&L (.CSV).");
  }

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Báo cáo &amp; Tài chính</span>
            <span className="sep">/</span>
            <span className="current">Báo cáo Lợi nhuận &amp; Khuyến mãi</span>
          </nav>
          <h1 className="page-title">Kết quả kinh doanh &amp; Lợi nhuận sau thuế</h1>
          <p className="page-subtitle">
            Báo cáo P&amp;L sau thuế chuẩn hóa từng chi nhánh và đánh giá hiệu quả từng chương trình khuyến mãi.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportCsv}
          >
            Xuất CSV P&amp;L
          </button>
        </div>
      </div>

      {/* Scope Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <ScopeBadge
          branchScope={branchScope}
          value={activeBranch}
          onChange={(next) =>
            setUi((p) => ({ ...p, branch: next, onlyUnprofitable: false }))
          }
          stores={data.stores}
          allLabel="Toàn chuỗi (12 CN)"
        />
        <InfoTip
          title="Báo cáo tài chính & hiệu quả khuyến mãi"
          summary="Tổng hợp doanh thu, tổng chi phí (giá vốn nguyên liệu + chi phí vận hành + khuyến mãi), nghĩa vụ thuế và lợi nhuận ròng sau thuế theo chi nhánh hoặc từng chiến dịch ưu đãi."
        />
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "rev",
            label: "Tổng doanh thu thuần",
            value: formatCurrency(kpiTotals.revenue),
            subLabel: activeBranch === "ALL" ? "12 chi nhánh" : activeBranch,
            icon: "currency",
            tone: "primary",
          },
          {
            key: "cost",
            label: "Tổng chi phí",
            value: formatCurrency(kpiTotals.totalCost),
            subLabel: "Giá vốn + Vận hành + KM",
            icon: "receipt",
            tone: "info",
          },
          {
            key: "tax",
            label: "Nghĩa vụ thuế",
            value: formatCurrency(kpiTotals.taxAmount),
            subLabel: "Thuế TNDN tạm tính",
            icon: "balance",
            tone: "purple",
          },
          {
            key: "profit",
            label: "Lợi nhuận sau thuế",
            value: formatCurrency(kpiTotals.afterTaxProfit),
            subLabel: kpiTotals.afterTaxProfit >= 0 ? "Hoạt động có lãi" : "Cần tối ưu chi phí",
            icon: "document-check",
            tone: kpiTotals.afterTaxProfit >= 0 ? "success" : "warning",
            valueTone: kpiTotals.afterTaxProfit >= 0 ? "success" : "warning",
          },
        ]}
      />

      {/* Compact 1-Line Break-even Notice (replaces old loud red alert card) */}
      {unprofitableList.length > 0 && ui.tab === "branches" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs border-l-4 border-l-amber-500">
          <div className="text-[var(--text)]">
            <span className="font-semibold text-[var(--heading-color)]">
              Điểm chưa đạt hòa vốn tháng này:
            </span>{" "}
            {unprofitableList.map((r, i) => (
              <span key={r.storeId}>
                {i > 0 && " · "}
                <strong>{r.storeId}</strong>{" "}
                <span className="text-rose-600 dark:text-rose-400 tabular-nums font-medium">
                  ({formatCurrency(r.afterTaxProfit)})
                </span>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setUi((p) => ({
                ...p,
                onlyUnprofitable: !p.onlyUnprofitable,
              }))
            }
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            {ui.onlyUnprofitable ? "Hiện tất cả chi nhánh" : "Lọc nhóm cần tối ưu"}
          </button>
        </div>
      )}

      {/* Segmented Tabs + FilterBar */}
      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder={
          ui.tab === "promotions"
            ? "Tìm mã hoặc tên chương trình khuyến mãi..."
            : "Tìm mã hoặc tên chi nhánh..."
        }
        density={ui.density}
        onToggleDensity={() =>
          setUi((p) => ({
            ...p,
            density: p.density === "compact" ? "normal" : "compact",
          }))
        }
        filters={
          <SegmentedControl<PlTab>
            value={ui.tab}
            onChange={(next) => setUi((p) => ({ ...p, tab: next }))}
            options={[
              { value: "branches", label: "P&L Chi nhánh", badge: scopedRows.length },
              {
                value: "promotions",
                label: "Kết quả Khuyến mãi",
                badge: filteredPromotions.length,
              },
              { value: "trend", label: "Xu hướng 6 tháng" },
            ]}
          />
        }
        sortMenu={
          ui.tab === "branches" ? (
            <SortMenu
              options={SORT_OPTIONS}
              value={ui.sortBy}
              onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
            />
          ) : undefined
        }
      />

      {/* TAB 1: BRANCH P&L TABLE */}
      {ui.tab === "branches" && (
        <section className="card p-0 overflow-hidden">
          {scopedRows.length === 0 ? (
            <EmptyState
              title="Không có dữ liệu chi nhánh phù hợp bộ lọc."
              actionLabel="Đặt lại bộ lọc"
              onAction={() =>
                setUi((p) => ({
                  ...p,
                  search: "",
                  onlyUnprofitable: false,
                }))
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`data-table ${ui.density === "compact" ? "text-xs" : ""}`}
              >
                <thead>
                  <tr>
                    <SortableTh
                      label="Chi nhánh"
                      fieldHint="storeId"
                      ascKey="name-asc"
                      descKey="name-asc"
                      currentSort={ui.sortBy}
                      onSort={(next) =>
                        setUi((p) => ({ ...p, sortBy: next as PlSortKey }))
                      }
                    />
                    <SortableTh
                      label="Doanh thu"
                      fieldHint="revenue"
                      ascKey="revenue-desc"
                      descKey="revenue-desc"
                      currentSort={ui.sortBy}
                      onSort={(next) =>
                        setUi((p) => ({ ...p, sortBy: next as PlSortKey }))
                      }
                      align="right"
                    />
                    <th className="text-right">Tổng chi phí</th>
                    <th className="text-right">Trước thuế</th>
                    <th className="text-right">Thuế</th>
                    <SortableTh
                      label="Lợi nhuận sau thuế"
                      fieldHint="afterTaxProfit"
                      ascKey="profit-asc"
                      descKey="profit-desc"
                      currentSort={ui.sortBy}
                      onSort={(next) =>
                        setUi((p) => ({ ...p, sortBy: next as PlSortKey }))
                      }
                      align="right"
                    />
                    <th>Trạng thái</th>
                    <th className="text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedRows.map((row) => {
                    const isPositive = row.afterTaxProfit >= 0;
                    return (
                      <tr
                        key={row.storeId}
                        className={
                          !isPositive ? "border-l-4 border-l-amber-500" : ""
                        }
                      >
                        <td>
                          <div className="font-semibold text-[var(--text)]">
                            {row.storeId} · {row.storeName}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {formatNumber(row.orders)} đơn hoàn tất
                          </div>
                        </td>
                        <td className="text-right tabular-nums font-medium text-[var(--text)]">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="text-right tabular-nums text-[var(--muted)]">
                          {formatCurrency(row.totalCost)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatCurrency(row.preTaxBalance)}
                        </td>
                        <td className="text-right tabular-nums text-[var(--muted)]">
                          {formatCurrency(row.taxAmount)}
                        </td>
                        <td className="text-right tabular-nums font-bold">
                          <span
                            className={
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {formatCurrency(row.afterTaxProfit)}
                          </span>
                          <div className="text-[11px] font-normal text-[var(--muted)]">
                            Biên: {row.netMarginPct}%
                          </div>
                        </td>
                        <td>
                          <StatusPill
                            label={isPositive ? "Đạt hòa vốn" : "Chưa hòa vốn"}
                            tone={isPositive ? "success" : "warning"}
                          />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedBranchDetail(row)}
                          >
                            Cơ cấu chi phí
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: PROMOTION CAMPAIGN RESULTS */}
      {ui.tab === "promotions" && (
        <section className="card p-0 overflow-hidden">
          {filteredPromotions.length === 0 ? (
            <EmptyState title="Chưa có chương trình khuyến mãi trong phạm vi chi nhánh này." />
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`data-table ${ui.density === "compact" ? "text-xs" : ""}`}
              >
                <thead>
                  <tr>
                    <th>Chiến dịch Khuyến mãi</th>
                    <th>Phạm vi &amp; Lượt áp dụng</th>
                    <th className="text-right">Doanh thu tạo ra</th>
                    <th className="text-right">Chi phí giảm giá + Giá vốn</th>
                    <th className="text-right">Thuế</th>
                    <th className="text-right">Lợi nhuận sau thuế</th>
                    <th>Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromotions.map((pm) => {
                    const isPositive = pm.afterTaxProfit >= 0;
                    return (
                      <tr
                        key={pm.id}
                        className={
                          !isPositive ? "border-l-4 border-l-amber-500" : ""
                        }
                      >
                        <td>
                          <div className="font-mono text-[11px] text-[var(--muted)]">
                            {pm.code} · {pm.period}
                          </div>
                          <div className="font-semibold text-[var(--text)] mt-0.5">
                            {pm.name}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-xs text-[var(--text)]">
                            {pm.branchScopeLabel}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] tabular-nums">
                            Đã dùng: {formatNumber(pm.usageCount)} lượt
                          </div>
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {formatCurrency(pm.campaignRevenue)}
                        </td>
                        <td className="text-right tabular-nums text-[var(--muted)]">
                          <div>KM: {formatCurrency(pm.discountCost)}</div>
                          <div className="text-[11px]">
                            Vốn: {formatCurrency(pm.cogsCost)}
                          </div>
                        </td>
                        <td className="text-right tabular-nums text-[var(--muted)]">
                          {formatCurrency(pm.taxAmount)}
                        </td>
                        <td className="text-right tabular-nums font-bold">
                          <span
                            className={
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {formatCurrency(pm.afterTaxProfit)}
                          </span>
                        </td>
                        <td>
                          <StatusPill label={pm.effectiveness} tone={pm.tone} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: MULTI-MONTH TREND CHART */}
      {ui.tab === "trend" && (
        <section className="card p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--heading-color)]">
                Xu hướng Doanh thu – Tổng chi phí – Lợi nhuận sau thuế (6 tháng)
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Phạm vi: {activeBranch === "ALL" ? "Toàn chuỗi (12 chi nhánh)" : activeBranch} · Đơn vị: Triệu đồng
              </p>
            </div>
          </div>
          <div className="h-[320px]">
            <TemplateChart
              labels={trendSeries.labels}
              series={trendSeries.series}
              unitSuffix="Tr.đ"
            />
          </div>
        </section>
      )}

      {/* SideDrawer: Branch Cost Breakdown */}
      <SideDrawer
        isOpen={!!selectedBranchDetail}
        onClose={() => setSelectedBranchDetail(null)}
        title={`Cơ cấu tài chính · ${selectedBranchDetail?.storeId ?? ""}`}
        subtitle={selectedBranchDetail?.storeName}
        widthClass="max-w-[460px]"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelectedBranchDetail(null)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedBranchDetail && (
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] divide-y divide-[var(--border)]">
              <div className="px-3 py-2 flex justify-between font-semibold">
                <span>Doanh thu thuần ({formatNumber(selectedBranchDetail.orders)} đơn)</span>
                <span className="tabular-nums">{formatCurrency(selectedBranchDetail.revenue)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-[var(--muted)]">
                <span>Giá vốn nguyên vật liệu (COGS)</span>
                <span className="tabular-nums">-{formatCurrency(selectedBranchDetail.cogs)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-[var(--muted)]">
                <span>Chi phí mặt bằng</span>
                <span className="tabular-nums">-{formatCurrency(selectedBranchDetail.opexRent)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-[var(--muted)]">
                <span>Quỹ lương nhân sự chi nhánh</span>
                <span className="tabular-nums">-{formatCurrency(selectedBranchDetail.opexStaff)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-[var(--muted)]">
                <span>Điện nước, bao bì &amp; vận hành khác</span>
                <span className="tabular-nums">-{formatCurrency(selectedBranchDetail.opexUtils)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-[var(--muted)]">
                <span>Chi phí tài trợ khuyến mãi</span>
                <span className="tabular-nums">-{formatCurrency(selectedBranchDetail.promoCost)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between font-medium">
                <span>Cân đối trước thuế</span>
                <span className="tabular-nums">{formatCurrency(selectedBranchDetail.preTaxBalance)}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-[var(--muted)]">
                <span>Thuế TNDN tạm tính</span>
                <span className="tabular-nums">-{formatCurrency(selectedBranchDetail.taxAmount)}</span>
              </div>
              <div className="px-3 py-2.5 flex justify-between font-bold text-sm">
                <span>Lợi nhuận ròng sau thuế</span>
                <span
                  className={`tabular-nums ${selectedBranchDetail.afterTaxProfit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                    }`}
                >
                  {formatCurrency(selectedBranchDetail.afterTaxProfit)}
                </span>
              </div>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
