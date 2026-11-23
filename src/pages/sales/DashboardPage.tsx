import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TemplateChart, { type ChartSeriesItem } from "../../components/sales/TemplateChart";
import { useToast } from "../../components/common/useToast";
import {
  BRANCH_TRAFFIC_PROFILES,
  CHAIN_CUPS_SERIES,
  CHAIN_CUSTOMER_SERIES,
  CHAIN_REVENUE_SERIES,
  CHART_LABELS,
  TIME_UNIT_META,
  type TimeUnit,
} from "../../data/sales/charts";
import {
  ConfirmInline,
  EmptyState,
  InfoTip,
  KpiStrip,
  MiniProgress,
  ScopeBadge,
  SegmentedControl,
  SideDrawer,
  StatusPill,
  UndoBanner,
  usePageUiState,
} from "../../components/shared/ui-kit";
import { homePath, scopedBranch, sessionUser } from "../../utils/auth";
import {
  getBranchMinimum,
  getIngredient,
  relativeDateISO,
} from "../shared/business-demo";
import { formatCurrency, getTodayISO, makeId } from "../shared/formatters";
import { buildStockSummary, type StockItemRow } from "../shared/stock-summary";
import { useDemoState } from "../shared/useDemoState";

type ChartTab = "revenue" | "customers" | "cups";

const MUTE_REASONS = [
  "Ngưng kinh doanh món dùng nguyên liệu này",
  "Đã chuyển sang mã nguyên liệu thay thế",
  "Nguyên liệu thời vụ đã kết thúc",
];

export default function DashboardPage() {
  const toast = useToast();
  const branchScope = scopedBranch();
  const [demoState, setDemoState] = useDemoState();

  const [ui, setUi] = usePageUiState<{
    branch: string;
    timeUnit: TimeUnit;
    chartTab: ChartTab;
    rangePreset: "today" | "week" | "month";
    visibleTrafficBranches: string[];
  }>("mw_ui_dashboard_v1", {
    branch: branchScope ?? "ALL",
    timeUnit: "month",
    chartTab: "revenue",
    rangePreset: "month",
    visibleTrafficBranches: ["CN01", "CN05", "CN02"],
  });

  const activeBranch = branchScope ?? ui.branch;
  const warehouseKey = activeBranch === "ALL" ? "Kho Tổng" : activeBranch;

  // Drawers & Popovers
  const [kpiDrawerKey, setKpiDrawerKey] = useState<string | null>(null);
  const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false);
  const [compareThresholdIngId, setCompareThresholdIngId] = useState<string | null>(null);
  const [mutedListDrawerOpen, setMutedListDrawerOpen] = useState(false);
  const [allAlertsDrawerOpen, setAllAlertsDrawerOpen] = useState(false);
  const [muteTarget, setMuteTarget] = useState<StockItemRow | null>(null);
  const [muteScope, setMuteScope] = useState<"branch" | "ALL">("branch");
  const [muteReason, setMuteReason] = useState(MUTE_REASONS[0]);
  const [undoMuteRuleId, setUndoMuteRuleId] = useState<{ id: string; name: string } | null>(null);

  const stockSummary = useMemo(
    () => buildStockSummary(demoState, warehouseKey),
    [demoState, warehouseKey],
  );

  const lowStockItems = useMemo(
    () =>
      stockSummary.stockItems
        .filter((item) => item.statusTone !== "success")
        .sort((a, b) => a.stockActual - b.stockActual),
    [stockSummary.stockItems],
  );

  const mutedRules = useMemo(() => {
    const allMuted = demoState.ignoredThresholds ?? [];
    if (activeBranch === "ALL") return allMuted;
    return allMuted.filter((r) => r.scope === "ALL" || r.scope === activeBranch);
  }, [demoState.ignoredThresholds, activeBranch]);

  // Scale factor per selected branch (real profile weights so metrics change cleanly per branch)
  const branchWeight = useMemo(() => {
    if (activeBranch === "ALL") return 1;
    const found = BRANCH_TRAFFIC_PROFILES.find((p) => p.branchId === activeBranch);
    return found?.weight ?? 0.08;
  }, [activeBranch]);

  const timeMeta = TIME_UNIT_META[ui.timeUnit];
  const labels = CHART_LABELS[ui.timeUnit];

  const scaledRevenue = useMemo(
    () =>
      CHAIN_REVENUE_SERIES[ui.timeUnit].map((v) =>
        Number((v * branchWeight).toFixed(1)),
      ),
    [ui.timeUnit, branchWeight],
  );

  const scaledCups = useMemo(
    () => CHAIN_CUPS_SERIES[ui.timeUnit].map((v) => Math.round(v * branchWeight)),
    [ui.timeUnit, branchWeight],
  );

  const customerSeries = useMemo<ChartSeriesItem[]>(() => {
    const base = CHAIN_CUSTOMER_SERIES[ui.timeUnit];
    if (activeBranch !== "ALL") {
      const profile = BRANCH_TRAFFIC_PROFILES.find((p) => p.branchId === activeBranch);
      return [
        {
          label: profile?.branchName ?? activeBranch,
          data: base.map((v) => Math.round(v * branchWeight)),
          color: profile?.color ?? "#10B981",
        },
      ];
    }
    const activeProfiles = BRANCH_TRAFFIC_PROFILES.filter((p) =>
      ui.visibleTrafficBranches.includes(p.branchId),
    );
    const chosen = activeProfiles.length > 0 ? activeProfiles : BRANCH_TRAFFIC_PROFILES.slice(0, 3);
    return chosen.map((p) => ({
      label: p.branchId,
      data: base.map((v) => Math.round(v * p.weight)),
      color: p.color,
    }));
  }, [ui.timeUnit, activeBranch, branchWeight, ui.visibleTrafficBranches]);

  const totalRevenueLatest = useMemo(() => {
    const total = scaledRevenue.reduce((sum, n) => sum + n, 0);
    return Math.round(total * 1_000_000);
  }, [scaledRevenue]);

  const totalCupsLatest = useMemo(
    () => scaledCups.reduce((sum, n) => sum + n, 0),
    [scaledCups],
  );

  const totalCustomersLatest = useMemo(() => {
    const total = CHAIN_CUSTOMER_SERIES[ui.timeUnit].reduce(
      (sum, v) => sum + Math.round(v * branchWeight),
      0,
    );
    return total;
  }, [ui.timeUnit, branchWeight]);

  const estimatedAov = useMemo(
    () => (totalCustomersLatest > 0 ? Math.round(totalRevenueLatest / totalCustomersLatest) : 68000),
    [totalRevenueLatest, totalCustomersLatest],
  );

  function confirmMuteIngredient() {
    if (!muteTarget) return;
    const id = makeId("mute");
    const scope = muteScope === "ALL" ? "ALL" : muteTarget.warehouse;
    const rule = {
      id,
      ingredientId: muteTarget.ingredientId,
      scope,
      reason: muteReason,
      ignoredBy: sessionUser().name,
      ignoredAt: getTodayISO(),
    };
    setDemoState((prev) => ({
      ...prev,
      ignoredThresholds: [rule, ...(prev.ignoredThresholds ?? [])],
    }));
    setUndoMuteRuleId({ id, name: muteTarget.name });
    toast.success(`Đã bỏ qua cảnh báo "${muteTarget.name}" (${scope === "ALL" ? "Toàn chuỗi" : scope}).`);
    setMuteTarget(null);
  }

  function restoreMutedRule(ruleId: string) {
    setDemoState((prev) => ({
      ...prev,
      ignoredThresholds: (prev.ignoredThresholds ?? []).filter((r) => r.id !== ruleId),
    }));
    toast.info("Đã khôi phục theo dõi ngưỡng nguyên liệu.");
  }

  const branchComparisonRows = useMemo(() => {
    const baseRev = CHAIN_REVENUE_SERIES[ui.timeUnit].reduce((s, n) => s + n, 0) * 1_000_000;
    const baseCust = CHAIN_CUSTOMER_SERIES[ui.timeUnit].reduce((s, n) => s + n, 0);
    return BRANCH_TRAFFIC_PROFILES.filter(
      (p) => activeBranch === "ALL" || p.branchId === activeBranch,
    ).map((p) => {
      const cust = Math.round(baseCust * p.weight);
      const rev = Math.round(baseRev * p.weight);
      const avgUnit = Math.round(cust / Math.max(1, labels.length));
      return { ...p, cust, rev, avgUnit };
    });
  }, [ui.timeUnit, activeBranch, labels.length]);

  const compareIngredient = compareThresholdIngId
    ? getIngredient(demoState, compareThresholdIngId)
    : null;

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span className="current">Bảng điều khiển</span>
          </nav>
          <h1 className="page-title">Tổng quan vận hành</h1>
          <p className="page-subtitle">
            Theo dõi doanh thu, lượng khách, sản lượng ly theo chi nhánh và cảnh báo tồn kho ngưỡng an toàn.
          </p>
        </div>

        <div className="page-header-actions flex-wrap">
          <SegmentedControl<TimeUnit>
            ariaLabel="Đơn vị thời gian toàn Dashboard"
            value={ui.timeUnit}
            onChange={(next) => setUi((p) => ({ ...p, timeUnit: next }))}
            options={[
              { value: "hour", label: "Giờ" },
              { value: "day", label: "Ngày" },
              { value: "week", label: "Tuần" },
              { value: "month", label: "Tháng" },
              { value: "quarter", label: "Quý" },
            ]}
          />
          <select
            aria-label="Khoảng dữ liệu"
            value={ui.rangePreset}
            onChange={(e) =>
              setUi((p) => ({
                ...p,
                rangePreset: e.target.value as "today" | "week" | "month",
              }))
            }
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--text)]"
          >
            <option value="today">Hôm nay ({relativeDateISO(0)})</option>
            <option value="week">7 ngày gần nhất</option>
            <option value="month">Tháng hiện tại</option>
          </select>
          <button
            type="button"
            onClick={() => setRulesDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 h-8 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)]"
          >
            <span>⋯</span>
            <span>Thuyết minh chỉ số</span>
          </button>
        </div>
      </div>

      {/* Scope Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <ScopeBadge
          branchScope={branchScope}
          value={activeBranch}
          onChange={(next) => setUi((p) => ({ ...p, branch: next }))}
          stores={demoState.stores}
          allLabel="Toàn chuỗi (12 CN)"
        />
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "cups",
            label: "Số ly đã bán",
            value: `${totalCupsLatest.toLocaleString("vi-VN")} ly`,
            subLabel: "so với kỳ trước",
            icon: "cup",
            tone: "primary",
            delta: "+8.2%",
            deltaTone: "up",
            onClick: () => setKpiDrawerKey("cups"),
            info: {
              summary: `Tổng sản lượng đồ uống phục vụ (${timeMeta.label.toLowerCase()}) theo chi nhánh đang chọn.`,
              details: [
                { label: "Phạm vi", value: activeBranch === "ALL" ? "12 chi nhánh" : activeBranch },
                { label: "Đơn vị thời gian", value: timeMeta.label },
              ],
            },
          },
          {
            key: "revenue",
            label: "Doanh thu thuần",
            value: formatCurrency(totalRevenueLatest),
            subLabel: "sau khuyến mãi",
            icon: "currency",
            tone: "success",
            delta: "+12.5%",
            deltaTone: "up",
            valueTone: "success",
            onClick: () => setKpiDrawerKey("revenue"),
            info: {
              summary: "Doanh thu sau khấu trừ khuyến mãi và hoàn tiền đơn hàng.",
              details: [
                { label: "Tại quầy (62%)", value: formatCurrency(Math.round(totalRevenueLatest * 0.62)) },
                { label: "Online / Mang đi (38%)", value: formatCurrency(Math.round(totalRevenueLatest * 0.38)) },
              ],
            },
          },
          {
            key: "customers",
            label: "Lượng khách",
            value: totalCustomersLatest.toLocaleString("vi-VN"),
            subLabel: "tại quầy & online",
            icon: "branch",
            tone: "info",
            delta: "+9.4%",
            deltaTone: "up",
            onClick: () => setKpiDrawerKey("customers"),
            info: {
              summary: "Tổng lượt khách giao dịch tại quầy & online theo chi nhánh và đơn vị thời gian.",
              details: [
                { label: "Hội viên quay lại", value: `${Math.round(totalCustomersLatest * 0.61).toLocaleString("vi-VN")} lượt` },
                { label: "Khách mới / vãng lai", value: `${Math.round(totalCustomersLatest * 0.39).toLocaleString("vi-VN")} lượt` },
              ],
            },
          },
          {
            key: "aov",
            label: "Đơn TB (AOV)",
            value: formatCurrency(estimatedAov),
            subLabel: "trên mỗi giao dịch",
            icon: "receipt",
            tone: "purple",
            delta: "+3.1%",
            deltaTone: "up",
            onClick: () => setKpiDrawerKey("aov"),
            info: {
              summary: "Average Order Value — Giá trị chi tiêu bình quân trên mỗi lượt khách.",
            },
          },
          {
            key: "returns",
            label: "Hủy / Hoàn đơn",
            value: activeBranch === "ALL" ? "11 đơn" : "2 đơn",
            subLabel: "tỷ lệ phát sinh",
            icon: "transfer",
            tone: "warning",
            delta: "0.8%",
            deltaTone: "neutral",
            onClick: () => setKpiDrawerKey("returns"),
            info: {
              summary: "Tổng đơn bị hủy hoặc phát sinh phiếu đổi/hoàn tiền trong kỳ.",
            },
          },
          {
            key: "lowstock",
            label: "NL dưới ngưỡng",
            value: `${lowStockItems.length} mặt hàng`,
            subLabel: `tại ${warehouseKey}`,
            icon: "warning",
            tone: lowStockItems.length > 0 ? "danger" : "success",
            valueTone: lowStockItems.length > 0 ? "warning" : "success",
            onClick: () => setAllAlertsDrawerOpen(true),
            info: {
              summary: `Đang theo dõi tại ${warehouseKey}. Đã lọc bỏ ${mutedRules.length} nguyên liệu ngưng sử dụng.`,
              details: [
                { label: "Hết tồn (0 lô)", value: `${lowStockItems.filter((i) => i.stockActual === 0).length} mục` },
                { label: "Đã bỏ qua cảnh báo", value: `${mutedRules.length} mục` },
              ],
            },
          },
        ]}
      />

      {/* Main Split Grid: 8/12 Unified Chart + 4/12 Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        {/* Left 8/12: Unified Chart */}
        <section className="xl:col-span-8 card p-4 border border-[var(--border)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--heading-color)] flex items-center gap-1.5">
                <span>
                  {ui.chartTab === "revenue"
                    ? "Doanh thu theo thời gian"
                    : ui.chartTab === "customers"
                      ? "Lượng khách theo chi nhánh & thời gian"
                      : "Sản lượng ly phục vụ"}
                </span>
                <span className="text-xs font-normal text-[var(--muted)]">
                  · Theo {timeMeta.label}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                Trục dọc:{" "}
                {ui.chartTab === "revenue"
                  ? timeMeta.revenueAxisY
                  : ui.chartTab === "customers"
                    ? timeMeta.customerAxisY
                    : timeMeta.cupAxisY}{" "}
                · Trục ngang: {timeMeta.axisX}
              </p>
            </div>

            <SegmentedControl<ChartTab>
              ariaLabel="Chuyển loại biểu đồ"
              value={ui.chartTab}
              onChange={(next) => setUi((p) => ({ ...p, chartTab: next }))}
              options={[
                { value: "revenue", label: "Doanh thu" },
                { value: "customers", label: "Lượng khách" },
                { value: "cups", label: "Số ly" },
              ]}
            />
          </div>

          {ui.chartTab === "customers" && activeBranch === "ALL" && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[11px] text-[var(--muted)] mr-1">
                So sánh chi nhánh:
              </span>
              {BRANCH_TRAFFIC_PROFILES.map((p) => {
                const on = ui.visibleTrafficBranches.includes(p.branchId);
                return (
                  <button
                    key={p.branchId}
                    type="button"
                    onClick={() =>
                      setUi((prev) => ({
                        ...prev,
                        visibleTrafficBranches: on
                          ? prev.visibleTrafficBranches.filter((b) => b !== p.branchId)
                          : [...prev.visibleTrafficBranches, p.branchId],
                      }))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${on
                      ? "border-[var(--border)] bg-[var(--background)] text-[var(--heading-color)] font-semibold"
                      : "border-transparent text-[var(--muted)] opacity-60 hover:opacity-100"
                      }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.branchId}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="h-[270px] w-full">
            {ui.chartTab === "revenue" && (
              <TemplateChart
                values={scaledRevenue}
                labels={labels}
                seriesLabel={`Doanh thu (${activeBranch === "ALL" ? "Toàn chuỗi" : activeBranch})`}
                unitSuffix="Triệu đ"
                xAxisTitle={timeMeta.axisX}
                yAxisTitle={timeMeta.revenueAxisY}
              />
            )}
            {ui.chartTab === "customers" && (
              <TemplateChart
                series={customerSeries}
                labels={labels}
                bars={false}
                seriesLabel="Lượng khách"
                unitSuffix="khách"
                xAxisTitle={timeMeta.axisX}
                yAxisTitle={timeMeta.customerAxisY}
              />
            )}
            {ui.chartTab === "cups" && (
              <TemplateChart
                bars
                values={scaledCups}
                labels={labels}
                seriesLabel="Sản lượng"
                unitSuffix="ly"
                xAxisTitle={timeMeta.axisX}
                yAxisTitle={timeMeta.cupAxisY}
              />
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
            <span>
              Giờ cao điểm chuỗi: <b className="text-[var(--text)]">11:00–13:00</b> &amp;{" "}
              <b className="text-[var(--text)]">18:00–20:00</b> · CN01 dẫn đầu lưu lượng
            </span>
            <button
              type="button"
              onClick={() => setRulesDrawerOpen(true)}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              So sánh chi tiết chi nhánh →
            </button>
          </div>
        </section>

        {/* Right 4/12: Below Threshold + Expiring Lots */}
        <div className="xl:col-span-4 space-y-3">
          {/* Below Threshold */}
          <section className="card p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-sm font-semibold text-[var(--heading-color)] truncate">
                  Nguyên liệu dưới ngưỡng
                </h2>
                <StatusPill
                  label={String(lowStockItems.length)}
                  tone={lowStockItems.length > 0 ? "warning" : "success"}
                />
              </div>
              <span className="text-[11px] text-[var(--muted)]">{warehouseKey}</span>
            </div>

            {lowStockItems.length === 0 ? (
              <EmptyState title={`Toàn bộ nguyên liệu tại ${warehouseKey} đều đang trên ngưỡng an toàn.`} />
            ) : (
              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-0.5">
                {lowStockItems.slice(0, 6).map((item) => {
                  const ing = getIngredient(demoState, item.ingredientId);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border border-[var(--border)] px-2.5 py-2 border-l-[3px] ${item.stockActual === 0
                        ? "border-l-rose-500"
                        : "border-l-amber-500"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          title={`${item.sku} — ${item.name} (${item.warehouse})`}
                          className="text-xs font-semibold text-[var(--heading-color)] truncate"
                        >
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.stockActual === 0 && (
                            <StatusPill label="Hết hàng" tone="danger" />
                          )}
                          <InfoTip
                            title={`Cách tính ngưỡng — ${item.name}`}
                            summary={
                              ing?.thresholdRuleText ??
                              "Ngưỡng cảnh báo đặt hàng lại (ROP) do hệ thống tính từ mức tiêu thụ trung bình ngày tại điểm kho và thời gian chờ cấp hàng."
                            }
                            details={[
                              {
                                label: "Điểm kho áp dụng",
                                value: item.warehouse,
                              },
                              {
                                label: "Tiêu thụ TB/ngày",
                                value: `${(ing?.avgDailyUsage ?? 500).toLocaleString("vi-VN")} ${item.unit}/ngày`,
                              },
                              {
                                label: "Thời gian chờ nhập",
                                value: `${ing?.leadTimeDays ?? 1} ngày`,
                              },
                              {
                                label: "Tồn an toàn dự phòng",
                                value: `${(ing?.safetyStock ?? 300).toLocaleString("vi-VN")} ${item.unit}`,
                              },
                              {
                                label: `Ngưỡng áp dụng (${item.warehouse})`,
                                value: `${item.stockMin.toLocaleString("vi-VN")} ${item.unit}`,
                              },
                            ]}
                            footerAction={{
                              label: "So sánh ngưỡng giữa các điểm kho",
                              onClick: () => setCompareThresholdIngId(item.ingredientId),
                            }}
                          />
                          <button
                            type="button"
                            title="Khóa / Bỏ qua cảnh báo nguyên liệu không còn xài nữa"
                            onClick={() => {
                              setMuteTarget(item);
                              setMuteScope("branch");
                              setMuteReason(MUTE_REASONS[0]);
                            }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--border)] text-[11px] text-[var(--muted)] hover:border-amber-400 hover:text-amber-600"
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5">
                        <MiniProgress
                          value={item.stockActual}
                          max={item.stockMin}
                          tone={item.stockActual === 0 ? "danger" : "warning"}
                          label={`${item.stockActual.toLocaleString("vi-VN")} / ${item.stockMin.toLocaleString("vi-VN")} ${item.unit}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setMutedListDrawerOpen(true)}
                className="text-[var(--muted)] hover:text-[var(--heading-color)] font-medium"
              >
                Đã bỏ qua ({mutedRules.length})
              </button>
              <button
                type="button"
                onClick={() => setAllAlertsDrawerOpen(true)}
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Xem tất cả ({lowStockItems.length}) →
              </button>
            </div>
          </section>

          {/* Compact Expiring FEFO */}
          <section className="card p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-[var(--heading-color)]">
                Lô cận hạn FEFO
              </h2>
              <StatusPill
                label={`${stockSummary.expiringLots.length} lô`}
                tone={stockSummary.expiringLots.length > 0 ? "danger" : "success"}
              />
            </div>
            {stockSummary.expiringLots.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-2">
                Không có lô cận hạn trong 7 ngày tới.
              </p>
            ) : (
              <div className="space-y-1.5">
                {stockSummary.expiringLots.slice(0, 4).map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate" title={lot.name}>
                        {lot.name}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {lot.batchId} · {lot.quantity}
                      </div>
                    </div>
                    <StatusPill
                      label={lot.remainingText}
                      tone={lot.remainingTone === "danger" ? "danger" : "warning"}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Bottom Row: Customer Traffic by Branch + Top Selling Drinks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <section className="card p-0 overflow-hidden border border-[var(--border)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--heading-color)]">
                Lượng khách theo chi nhánh ({timeMeta.label})
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                Phân tích khách hàng và khung giờ cao điểm từng điểm bán
              </p>
            </div>
            <Link
              to="/reports/profit-loss"
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Xem Lãi/Lỗ →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--background)] text-[var(--muted)] text-xs border-b border-[var(--border)]">
                <tr>
                  <th className="px-3.5 py-2 font-semibold">Chi nhánh</th>
                  <th className="px-3 py-2 font-semibold text-right">Tổng khách</th>
                  <th className="px-3 py-2 font-semibold text-right">TB / {timeMeta.label}</th>
                  <th className="px-3 py-2 font-semibold">Cơ cấu / Cao điểm</th>
                  <th className="px-3 py-2 font-semibold text-right">Tăng trưởng</th>
                </tr>
              </thead>
              <tbody>
                {branchComparisonRows.map((row) => (
                  <tr
                    key={row.branchId}
                    className="border-t border-[var(--border)] hover:bg-[var(--background)]"
                  >
                    <td className="px-3.5 py-2 font-semibold text-[var(--heading-color)]">
                      {row.branchName}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {row.cust.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">
                      {row.avgUnit.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--muted)]">
                      {row.memberRate} · <b className="text-[var(--text)]">{row.peakWindow}</b>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {row.growthPct}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-0 overflow-hidden border border-[var(--border)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--heading-color)]">
                Top 5 món bán chạy ({activeBranch === "ALL" ? "Toàn chuỗi" : activeBranch})
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                Theo đơn vị {timeMeta.label.toLowerCase()}
              </p>
            </div>
            <Link
              to="/inventory/products"
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Xem thực đơn →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--background)] text-[var(--muted)] text-xs border-b border-[var(--border)]">
                <tr>
                  <th className="px-3.5 py-2 font-semibold">Món đồ uống</th>
                  <th className="px-3 py-2 font-semibold text-right">Sản lượng</th>
                  <th className="px-3 py-2 font-semibold text-right">Doanh thu ước tính</th>
                  <th className="px-3 py-2 font-semibold text-right">Xu hướng</th>
                </tr>
              </thead>
              <tbody>
                {demoState.products
                  .filter((p) => p.category !== "topping")
                  .slice(0, 5)
                  .map((p, idx) => {
                    const cups = Math.max(
                      12,
                      Math.round((totalCupsLatest * (0.3 - idx * 0.04))),
                    );
                    const estRev = cups * (p.variants[0]?.price ?? 38000);
                    return (
                      <tr
                        key={p.id}
                        className="border-t border-[var(--border)] hover:bg-[var(--background)]"
                      >
                        <td className="px-3.5 py-2 font-medium text-[var(--heading-color)]">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {cups.toLocaleString("vi-VN")} ly
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">
                          {formatCurrency(estRev)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          +{14 - idx * 2}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Inline Mute Ingredient Popover Drawer */}
      <SideDrawer
        isOpen={muteTarget !== null}
        onClose={() => setMuteTarget(null)}
        title="Bỏ qua cảnh báo nguyên liệu"
        subtitle={
          muteTarget
            ? `${muteTarget.sku} · ${muteTarget.name} (${muteTarget.warehouse})`
            : undefined
        }
        widthClass="max-w-[440px]"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMuteTarget(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={confirmMuteIngredient}
            >
              Xác nhận bỏ qua
            </button>
          </>
        }
      >
        {muteTarget && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--muted)]">
              Các nguyên liệu không còn sử dụng hoặc đã ngừng nhập sẽ được lọc bỏ khỏi
              danh sách cảnh báo dưới ngưỡng để tránh nhiễu thông tin.
            </p>
            <div>
              <div className="font-semibold mb-1.5">Phạm vi áp dụng</div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="muteScope"
                    checked={muteScope === "branch"}
                    onChange={() => setMuteScope("branch")}
                    className="accent-emerald-600"
                  />
                  <span>
                    Chỉ ẩn tại <b>{muteTarget.warehouse}</b>
                  </span>
                </label>
                {!branchScope && (
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="muteScope"
                      checked={muteScope === "ALL"}
                      onChange={() => setMuteScope("ALL")}
                      className="accent-emerald-600"
                    />
                    <span>
                      Ẩn trên <b>Toàn chuỗi (Tất cả chi nhánh &amp; Kho Tổng)</b>
                    </span>
                  </label>
                )}
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="mute-reason-select">
                Lý do ngưng theo dõi
              </label>
              <select
                id="mute-reason-select"
                className="form-input form-select text-xs"
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
              >
                {MUTE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Compare Thresholds Across Locations Drawer */}
      <SideDrawer
        isOpen={compareIngredient !== null}
        onClose={() => setCompareThresholdIngId(null)}
        title={`Ngưỡng theo điểm kho — ${compareIngredient?.name ?? ""}`}
        subtitle="Ngưỡng tối thiểu được hệ thống tính riêng cho quy mô tiêu thụ của từng quầy và Kho Tổng"
        widthClass="max-w-[480px]"
      >
        {compareIngredient && (
          <div className="space-y-3 text-xs">
            <p className="text-[var(--muted)]">
              {compareIngredient.thresholdRuleText ??
                "Mỗi điểm kho có ngưỡng riêng dựa trên lượng ly bán ngày và thời gian cấp bù."}
            </p>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--background)] text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Điểm kho</th>
                    <th className="px-3 py-2 font-semibold text-right">Ngưỡng áp dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {["Kho Tổng", "Khu chế biến", ...demoState.stores.slice(0, 5).map((s) => s.id)].map(
                    (loc) => (
                      <tr key={loc} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-medium">{loc}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {getBranchMinimum(compareIngredient, loc).toLocaleString("vi-VN")}{" "}
                          {compareIngredient.baseUnit}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Muted Ingredients Drawer (Restore anytime) */}
      <SideDrawer
        isOpen={mutedListDrawerOpen}
        onClose={() => setMutedListDrawerOpen(false)}
        title={`Nguyên liệu đã bỏ qua (${mutedRules.length})`}
        subtitle="Các nguyên liệu đã khóa cảnh báo thừa — có thể khôi phục bất kỳ lúc nào"
        widthClass="max-w-[480px]"
      >
        {mutedRules.length === 0 ? (
          <EmptyState title="Chưa có nguyên liệu nào bị khóa cảnh báo." />
        ) : (
          <div className="space-y-2">
            {mutedRules.map((rule) => {
              const ing = getIngredient(demoState, rule.ingredientId);
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--heading-color)]">
                      {ing?.name ?? rule.ingredientId}
                    </div>
                    <div className="text-[var(--muted)] mt-0.5">
                      Phạm vi: <b>{rule.scope === "ALL" ? "Toàn chuỗi" : rule.scope}</b> ·{" "}
                      {rule.reason}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {rule.ignoredBy} · {rule.ignoredAt}
                    </div>
                  </div>
                  {(!branchScope || rule.scope === branchScope) && (
                    <ConfirmInline
                      triggerLabel="Khôi phục"
                      confirmText="Bật lại?"
                      tone="primary"
                      onConfirm={() => restoreMutedRule(rule.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SideDrawer>

      {/* All Low-Stock Drawer */}
      <SideDrawer
        isOpen={allAlertsDrawerOpen}
        onClose={() => setAllAlertsDrawerOpen(false)}
        title={`Tất cả cảnh báo dưới ngưỡng (${lowStockItems.length})`}
        subtitle={`Điểm kho: ${warehouseKey}`}
        widthClass="max-w-[520px]"
      >
        {lowStockItems.length === 0 ? (
          <EmptyState title="Không còn cảnh báo tồn kho thấp." />
        ) : (
          <div className="space-y-2 text-xs">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[var(--heading-color)]">
                    {item.sku} · {item.name}
                  </div>
                  <div className="mt-1">
                    <MiniProgress
                      value={item.stockActual}
                      max={item.stockMin}
                      tone={item.stockActual === 0 ? "danger" : "warning"}
                      label={`${item.stockActual.toLocaleString("vi-VN")} / ${item.stockMin.toLocaleString("vi-VN")} ${item.unit}`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAllAlertsDrawerOpen(false);
                    setMuteTarget(item);
                  }}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  Bỏ qua
                </button>
              </div>
            ))}
          </div>
        )}
      </SideDrawer>

      {/* Rules & Per-Branch Inspector Drawer */}
      <SideDrawer
        isOpen={rulesDrawerOpen || kpiDrawerKey !== null}
        onClose={() => {
          setRulesDrawerOpen(false);
          setKpiDrawerKey(null);
        }}
        title="Thuyết minh chỉ số & So sánh chi nhánh"
        subtitle={`Đơn vị đang xem: ${timeMeta.label} · Phạm vi: ${activeBranch === "ALL" ? "Toàn chuỗi" : activeBranch}`}
        widthClass="max-w-[540px]"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
            <h3 className="font-semibold text-[var(--heading-color)]">
              Quy tắc tổng hợp chỉ số (Tính bởi hệ thống)
            </h3>
            <ul className="space-y-1.5 text-[var(--muted)] list-disc pl-4">
              <li>
                <b>Doanh thu thuần</b>: Tổng tiền bán thực thu sau khi trừ chiết khấu khuyến mãi và hoàn tiền đơn.
              </li>
              <li>
                <b>Lượng khách theo chi nhánh</b>: Tổng hợp giao dịch theo từng chi nhánh và khung thời gian ({timeMeta.label}).
              </li>
              <li>
                <b>Ngưỡng cảnh báo đặt hàng lại (ROP)</b>: Căn cứ tiêu thụ bình quân ngày của từng điểm kho, thời gian giao hàng và lượng tồn dự phòng an toàn.
              </li>
              <li>
                <b>Tồn khả dụng</b>: Lượng tồn còn hạn sử dụng trừ đi lượng đang giữ cho mẻ/đơn chưa xuất.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--heading-color)] mb-2">
              Bảng chỉ số theo chi nhánh
            </h3>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--background)] text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Chi nhánh</th>
                    <th className="px-3 py-2 font-semibold text-right">Doanh thu</th>
                    <th className="px-3 py-2 font-semibold text-right">Lượng khách</th>
                    <th className="px-3 py-2 font-semibold text-right">Tăng trưởng</th>
                  </tr>
                </thead>
                <tbody>
                  {branchComparisonRows.map((row) => (
                    <tr key={row.branchId} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 font-medium">{row.branchId}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatCurrency(row.rev)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.cust.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                        {row.growthPct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SideDrawer>

      <UndoBanner
        message={
          undoMuteRuleId
            ? `Đã bỏ qua cảnh báo "${undoMuteRuleId.name}".`
            : null
        }
        onUndo={() => {
          if (undoMuteRuleId) {
            restoreMutedRule(undoMuteRuleId.id);
            setUndoMuteRuleId(null);
          }
        }}
        onDismiss={() => setUndoMuteRuleId(null)}
      />
    </div>
  );
}
