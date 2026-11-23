import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import {
  ConfirmInline,
  EmptyState,
  FilterBar,
  HighlightText,
  InfoTip,
  KpiStrip,
  MiniProgress,
  ScopeBadge,
  SegmentedControl,
  SideDrawer,
  SortableTh,
  SortMenu,
  StatusPill,
  UndoBanner,
  normalizeVi,
  usePageUiState,
  type PillTone,
  type SortOption,
} from "../../components/shared/ui-kit";
import { can, canVisit, homePath, scopedBranch, sessionUser } from "../../utils/auth";
import { getIngredient, getStore } from "../shared/business-demo";
import {
  formatCurrency,
  formatNumber,
  getTodayISO,
  makeId,
} from "../shared/formatters";
import {
  buildStockSummary,
  type ExpiringLotRow,
  type StockItemRow,
} from "../shared/stock-summary";
import { useDemoState } from "../shared/useDemoState";

type InvTab = "all" | "low" | "expiring" | "expired" | "ignored";
type InvSortKey = "ratio-asc" | "ratio-desc" | "name-asc" | "name-desc" | "value-desc" | "value-asc";

const SORT_OPTIONS: SortOption<InvSortKey>[] = [
  { key: "ratio-asc", label: "Mức độ thiếu hụt (Thấp → Cao)", fieldLabel: "Tồn / Ngưỡng" },
  { key: "ratio-desc", label: "Mức độ đủ tồn (Cao → Thấp)", fieldLabel: "Tồn / Ngưỡng" },
  { key: "name-asc", label: "Tên nguyên liệu A → Z", fieldLabel: "Tên nguyên liệu" },
  { key: "name-desc", label: "Tên nguyên liệu Z → A", fieldLabel: "Tên nguyên liệu" },
  { key: "value-desc", label: "Giá trị tồn cao → thấp", fieldLabel: "Giá trị tồn" },
  { key: "value-asc", label: "Giá trị tồn thấp → cao", fieldLabel: "Giá trị tồn" },
];

export default function InventoryReportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useDemoState();
  const branchScope = scopedBranch();
  const currentUser = sessionUser();
  const canMute = can("ingredient.manage");
  const today = getTodayISO();

  const [ui, setUi] = usePageUiState<{
    branch: string;
    tab: InvTab;
    search: string;
    sortBy: InvSortKey;
    density: "normal" | "compact";
  }>("mw_ui_inv_report_v1", {
    branch: branchScope ?? "ALL",
    tab: "low",
    search: "",
    sortBy: "ratio-asc",
    density: "normal",
  });

  const activeBranch = branchScope ?? ui.branch;
  const [selectedRuleItem, setSelectedRuleItem] = useState<StockItemRow | null>(
    null,
  );
  const [undoRuleId, setUndoRuleId] = useState<string | null>(null);
  const [undoMsg, setUndoMsg] = useState<string | null>(null);

  const warehouseFilter = activeBranch === "ALL" ? "" : activeBranch;

  const summary = useMemo(
    () =>
      buildStockSummary(data, warehouseFilter, today, {
        includeIgnored: true,
      }),
    [data, warehouseFilter, today],
  );

  const categorized = useMemo(() => {
    const lowItems = summary.stockItems.filter(
      (i) => !i.ignored && i.stockActual < i.stockMin,
    );
    const ignoredItems = summary.stockItems.filter((i) => i.ignored);
    const activeItems = summary.stockItems.filter((i) => !i.ignored);
    const expiringSoon = summary.expiringLots.filter(
      (l) => l.remainingTone === "warning",
    );
    const expiredLots = summary.expiringLots.filter(
      (l) => l.remainingTone === "danger",
    );

    return {
      lowItems,
      ignoredItems,
      activeItems,
      expiringSoon,
      expiredLots,
    };
  }, [summary]);

  const filteredStockRows = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    let base: StockItemRow[] = [];
    if (ui.tab === "low") base = categorized.lowItems;
    else if (ui.tab === "ignored") base = categorized.ignoredItems;
    else base = categorized.activeItems;

    const searched = q
      ? base.filter((item) =>
        normalizeVi(`${item.sku} ${item.name} ${item.warehouse}`).includes(q),
      )
      : [...base];

    searched.sort((a, b) => {
      if (ui.sortBy === "ratio-asc") {
        const rA = a.stockMin > 0 ? a.stockActual / a.stockMin : a.stockActual;
        const rB = b.stockMin > 0 ? b.stockActual / b.stockMin : b.stockActual;
        return rA - rB;
      }
      if (ui.sortBy === "ratio-desc") {
        const rA = a.stockMin > 0 ? a.stockActual / a.stockMin : a.stockActual;
        const rB = b.stockMin > 0 ? b.stockActual / b.stockMin : b.stockActual;
        return rB - rA;
      }
      if (ui.sortBy === "name-asc") return a.name.localeCompare(b.name, "vi");
      if (ui.sortBy === "name-desc") return b.name.localeCompare(a.name, "vi");
      if (ui.sortBy === "value-asc") return a.totalValue - b.totalValue;
      return b.totalValue - a.totalValue;
    });
    return searched;
  }, [categorized, ui.tab, ui.search, ui.sortBy]);

  const filteredLots = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    const base: ExpiringLotRow[] =
      ui.tab === "expired" ? categorized.expiredLots : categorized.expiringSoon;
    return q
      ? base.filter((l) =>
        normalizeVi(`${l.batchId} ${l.name} ${l.warehouse}`).includes(q),
      )
      : base;
  }, [categorized, ui.tab, ui.search]);

  function muteIngredientThreshold(row: StockItemRow) {
    const newId = makeId("ign");
    setData((current) => ({
      ...current,
      ignoredThresholds: [
        ...current.ignoredThresholds,
        {
          id: newId,
          ingredientId: row.ingredientId,
          scope: row.warehouse,
          reason: "Ngừng dùng / lọc cảnh báo thừa từ Báo cáo tồn kho",
          ignoredBy: currentUser.name,
          ignoredAt: today,
        },
      ],
    }));
    setUndoRuleId(newId);
    setUndoMsg(`Đã ẩn cảnh báo ngưỡng cho "${row.name}" tại ${row.warehouse}.`);
  }

  function restoreMuted(row: StockItemRow) {
    setData((current) => ({
      ...current,
      ignoredThresholds: current.ignoredThresholds.filter(
        (r) =>
          !(
            r.ingredientId === row.ingredientId &&
            (branchScope
              ? r.scope === branchScope
              : r.scope === row.warehouse || r.scope === "ALL")
          ),
      ),
    }));
    toast.success(`Đã khôi phục theo dõi ngưỡng cho "${row.name}".`);
  }

  function undoLastMute() {
    if (!undoRuleId) return;
    setData((current) => ({
      ...current,
      ignoredThresholds: current.ignoredThresholds.filter(
        (r) => r.id !== undoRuleId,
      ),
    }));
    setUndoRuleId(null);
    setUndoMsg(null);
    toast.info("Đã hoàn tác việc ẩn cảnh báo.");
  }

  function exportCsv() {
    const header =
      "Ma NL,Ten nguyen lieu,Kho / Chi nhanh,Ton hien tai,Nguong an toan,Don vi,Gia tri ton VND,Trang thai";
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = summary.stockItems.map((i) =>
      [
        i.sku,
        esc(i.name),
        esc(i.warehouse),
        i.stockActual,
        i.stockMin,
        i.unit,
        i.totalValue,
        esc(i.ignored ? "Đã ẩn cảnh báo" : i.status),
      ].join(","),
    );
    const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-ton-kho-${activeBranch}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất báo cáo tồn kho (.CSV).");
  }

  const TONE_MAP: Record<StockItemRow["statusTone"], PillTone> = {
    success: "success",
    warning: "warning",
    danger: "danger",
  };

  const showLotsTable = ui.tab === "expiring" || ui.tab === "expired";

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Báo cáo &amp; Phân tích</span>
            <span className="sep">/</span>
            <span className="current">Báo cáo tồn kho</span>
          </nav>
          <h1 className="page-title">Báo cáo tồn kho &amp; Cảnh báo ngưỡng</h1>
          <p className="page-subtitle">
            Phân tích giá trị tồn kho thực tế, kiểm tra quy tắc ngưỡng an toàn và xử lý lô cận/hết hạn theo FEFO.
          </p>
        </div>

        <div className="page-header-actions flex-wrap">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportCsv}
          >
            Xuất CSV tồn kho
          </button>
          {canVisit("/purchases/new") && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/purchases/new")}
            >
              + Tạo đơn nhập PO
            </button>
          )}
        </div>
      </div>

      {/* Scope Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <ScopeBadge
          branchScope={branchScope}
          value={activeBranch}
          onChange={(next) => setUi((p) => ({ ...p, branch: next }))}
          stores={data.stores}
          allLabel="Toàn chuỗi (Kho Tổng + CN)"
          extraOptions={[
            { id: "Kho Tổng", label: "Kho Tổng" },
            { id: "Khu chế biến", label: "Khu chế biến (Bếp)" },
          ]}
        />
        <InfoTip
          title="Báo cáo tồn kho & Lọc cảnh báo"
          summary="Theo dõi các mã dưới ngưỡng an toàn (bao gồm tồn = 0), lô cận hạn hoặc quá hạn. Có thể ẩn cảnh báo cho các nguyên liệu ngừng dùng tại chi nhánh."
        />
      </div>

      <UndoBanner
        message={undoMsg}
        onUndo={undoLastMute}
        onDismiss={() => setUndoMsg(null)}
      />

      <KpiStrip
        items={[
          {
            key: "val",
            label: "Giá trị tồn hiện hữu",
            value: formatCurrency(summary.totalValue),
            subLabel: `${categorized.activeItems.length} mã đang theo dõi`,
            icon: "currency",
            tone: "primary",
            active: ui.tab === "all",
            onClick: () => setUi((p) => ({ ...p, tab: "all" })),
          },
          {
            key: "low",
            label: "Dưới ngưỡng an toàn",
            value: String(categorized.lowItems.length),
            subLabel: "Bao gồm nguyên liệu hết tồn",
            icon: "warning",
            tone: categorized.lowItems.length > 0 ? "danger" : "success",
            valueTone: categorized.lowItems.length > 0 ? "danger" : "default",
            active: ui.tab === "low",
            onClick: () => setUi((p) => ({ ...p, tab: "low" })),
          },
          {
            key: "expiring",
            label: "Lô cận hạn sử dụng",
            value: String(categorized.expiringSoon.length),
            subLabel: "Ưu tiên điều phối FEFO",
            icon: "clock",
            tone: "warning",
            valueTone:
              categorized.expiringSoon.length > 0 ? "warning" : "default",
            active: ui.tab === "expiring",
            onClick: () => setUi((p) => ({ ...p, tab: "expiring" })),
          },
          {
            key: "expired",
            label: "Lô đã hết hạn",
            value: String(categorized.expiredLots.length),
            subLabel: "Cần cô lập & lập biên bản hủy",
            icon: "box",
            tone: categorized.expiredLots.length > 0 ? "danger" : "info",
            valueTone:
              categorized.expiredLots.length > 0 ? "danger" : "default",
            active: ui.tab === "expired",
            onClick: () => setUi((p) => ({ ...p, tab: "expired" })),
          },
        ]}
      />

      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm mã NL, tên nguyên liệu, số lô hoặc chi nhánh..."
        density={ui.density}
        onToggleDensity={() =>
          setUi((p) => ({
            ...p,
            density: p.density === "compact" ? "normal" : "compact",
          }))
        }
        filters={
          <SegmentedControl<InvTab>
            value={ui.tab}
            onChange={(next) => setUi((p) => ({ ...p, tab: next }))}
            options={[
              {
                value: "low",
                label: "Dưới ngưỡng",
                badge: categorized.lowItems.length,
              },
              {
                value: "expiring",
                label: "Cận hạn",
                badge: categorized.expiringSoon.length,
              },
              {
                value: "expired",
                label: "Hết hạn",
                badge: categorized.expiredLots.length,
              },
              {
                value: "all",
                label: "Tất cả",
                badge: categorized.activeItems.length,
              },
              ...(categorized.ignoredItems.length > 0
                ? [
                  {
                    value: "ignored" as const,
                    label: "Đã ẩn",
                    badge: categorized.ignoredItems.length,
                  },
                ]
                : []),
            ]}
          />
        }
        sortMenu={
          !showLotsTable ? (
            <SortMenu
              options={SORT_OPTIONS}
              value={ui.sortBy}
              onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
            />
          ) : undefined
        }
      />

      {/* Neutral Clean Table (No loud bright red/yellow background slabs) */}
      <section className="card p-0 overflow-hidden">
        {!showLotsTable ? (
          filteredStockRows.length === 0 ? (
            <EmptyState
              title="Không có mặt hàng nào trong mục lọc này."
              actionLabel={ui.tab !== "all" ? "Xem tất cả tồn kho" : undefined}
              onAction={
                ui.tab !== "all"
                  ? () => setUi((p) => ({ ...p, tab: "all" }))
                  : undefined
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
                      label="Nguyên liệu & Điểm kho"
                      fieldHint="ingredient.name"
                      ascKey="name-asc"
                      descKey="name-desc"
                      currentSort={ui.sortBy}
                      onSort={(next) =>
                        setUi((p) => ({ ...p, sortBy: next as InvSortKey }))
                      }
                    />
                    <SortableTh
                      label="Tồn thực tế vs Ngưỡng an toàn"
                      fieldHint="stockActual / stockMin"
                      ascKey="ratio-asc"
                      descKey="ratio-desc"
                      currentSort={ui.sortBy}
                      onSort={(next) =>
                        setUi((p) => ({ ...p, sortBy: next as InvSortKey }))
                      }
                    />
                    <SortableTh
                      label="Giá trị tồn"
                      fieldHint="totalValue"
                      ascKey="value-asc"
                      descKey="value-desc"
                      currentSort={ui.sortBy}
                      onSort={(next) =>
                        setUi((p) => ({ ...p, sortBy: next as InvSortKey }))
                      }
                      align="right"
                    />
                    <th>Trạng thái</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockRows.map((row) => {
                    const isLow = !row.ignored && row.stockActual < row.stockMin;
                    const borderClass = row.ignored
                      ? ""
                      : row.stockActual === 0
                        ? "border-l-4 border-l-rose-500"
                        : isLow
                          ? "border-l-4 border-l-amber-500"
                          : "";
                    return (
                      <tr key={row.id} className={borderClass}>
                        <td>
                          <div className="font-semibold text-[var(--text)]">
                            <HighlightText text={row.name} query={ui.search} />
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            <span className="font-mono">{row.sku}</span> ·{" "}
                            {row.warehouse}
                            {getStore(data, row.warehouse)
                              ? ` (${getStore(data, row.warehouse)?.name})`
                              : ""}
                          </div>
                        </td>

                        <td className="min-w-[210px]">
                          <MiniProgress
                            value={row.stockActual}
                            max={Math.max(row.stockMin * 1.5, row.stockActual, 1)}
                            tone={
                              row.stockActual === 0
                                ? "danger"
                                : isLow
                                  ? "warning"
                                  : "success"
                            }
                            label={`${formatNumber(row.stockActual)} / ngưỡng ${formatNumber(row.stockMin)} ${row.unit}`}
                          />
                        </td>

                        <td className="text-right tabular-nums font-medium">
                          {formatCurrency(row.totalValue)}
                        </td>

                        <td>
                          <StatusPill
                            label={row.ignored ? "Đã ẩn cảnh báo" : row.status}
                            tone={row.ignored ? "neutral" : TONE_MAP[row.statusTone]}
                          />
                        </td>

                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedRuleItem(row)}
                            >
                              Quy tắc ngưỡng
                            </button>
                            {canMute && !row.ignored && isLow && (
                              <ConfirmInline
                                triggerLabel="Bỏ qua"
                                confirmText="Ẩn cảnh báo NL ngừng dùng?"
                                onConfirm={() => muteIngredientThreshold(row)}
                              />
                            )}
                            {canMute && row.ignored && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => restoreMuted(row)}
                              >
                                Khôi phục
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredLots.length === 0 ? (
          <EmptyState title="Không có lô nguyên liệu cận hạn hoặc hết hạn." />
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`data-table ${ui.density === "compact" ? "text-xs" : ""}`}
            >
              <thead>
                <tr>
                  <th>Số lô &amp; Nguyên liệu</th>
                  <th>Điểm lưu trữ</th>
                  <th className="text-right">Số lượng còn lại</th>
                  <th>Ngày hết hạn</th>
                  <th>Tình trạng hạn</th>
                  <th className="text-right">Hướng xử lý</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className={
                      lot.remainingTone === "danger"
                        ? "border-l-4 border-l-rose-500"
                        : "border-l-4 border-l-amber-500"
                    }
                  >
                    <td>
                      <div className="font-semibold text-[var(--text)]">
                        <HighlightText text={lot.name} query={ui.search} />
                      </div>
                      <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                        Lô: {lot.batchId}
                      </div>
                    </td>
                    <td>{lot.warehouse}</td>
                    <td className="text-right tabular-nums font-semibold">
                      {lot.quantity}
                    </td>
                    <td className="tabular-nums">{lot.expDate}</td>
                    <td>
                      <StatusPill
                        label={lot.remainingText}
                        tone={lot.remainingTone}
                      />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          toast.info(lot.actionNote, {
                            title: `Đề xuất xử lý lô ${lot.batchId}`,
                          })
                        }
                      >
                        {lot.actionButtonText}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SideDrawer: Threshold Rule & Multi-Branch Comparison */}
      <SideDrawer
        isOpen={!!selectedRuleItem}
        onClose={() => setSelectedRuleItem(null)}
        title={`Quy tắc ngưỡng an toàn · ${selectedRuleItem?.name ?? ""}`}
        subtitle={
          selectedRuleItem
            ? `${selectedRuleItem.sku} · Điểm kiểm tra: ${selectedRuleItem.warehouse}`
            : ""
        }
        widthClass="max-w-[500px]"
        footer={
          <div className="flex justify-between w-full">
            {(canVisit("/purchases/new") || (activeBranch !== "ALL" && activeBranch !== "Kho Tổng")) && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedRuleItem(null);
                  navigate(
                    (activeBranch === "ALL" || activeBranch === "Kho Tổng") && canVisit("/purchases/new")
                      ? "/purchases/new"
                      : "/production/planning",
                  );
                }}
              >
                {(activeBranch === "ALL" || activeBranch === "Kho Tổng") && canVisit("/purchases/new")
                  ? "+ Lập đơn mua PO"
                  : "+ Đề xuất bổ sung tạm thời"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedRuleItem(null)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedRuleItem && (() => {
          const ing = getIngredient(data, selectedRuleItem.ingredientId);
          return (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-1.5">
                <div className="font-semibold text-[var(--heading-color)]">
                  Cơ sở thiết lập ngưỡng tại điểm kho
                </div>
                <p className="text-[var(--muted)] leading-relaxed">
                  {ing?.thresholdRuleText ||
                    "Ngưỡng được hệ thống thiết lập dựa trên mức tiêu thụ trung bình ngày, thời gian giao hàng của nhà cung cấp và tồn dự phòng tại điểm bán."}
                </p>
                {ing?.avgDailyUsage != null && (
                  <div className="pt-1 flex flex-wrap gap-3 text-[11px]">
                    <span>
                      Tiêu thụ bình quân:{" "}
                      <strong>
                        {formatNumber(ing.avgDailyUsage)} {ing.baseUnit}/ngày
                      </strong>
                    </span>
                    {ing.leadTimeDays != null && (
                      <span>
                        Chu kỳ giao: <strong>{ing.leadTimeDays} ngày</strong>
                      </span>
                    )}
                    {ing.safetyStock != null && (
                      <span>
                        Dự phòng chuẩn:{" "}
                        <strong>
                          {formatNumber(ing.safetyStock)} {ing.baseUnit}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {ing?.branchMinimums && (
                <div>
                  <div className="font-semibold text-[var(--heading-color)] mb-2">
                    Ngưỡng áp dụng riêng theo từng điểm kho
                  </div>
                  <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                    {Object.entries(ing.branchMinimums).map(([loc, minVal]) => (
                      <div
                        key={loc}
                        className={`px-3 py-2 flex items-center justify-between ${loc === selectedRuleItem.warehouse
                          ? "bg-sky-50/50 dark:bg-sky-950/20 font-semibold"
                          : ""
                          }`}
                      >
                        <span>{loc}</span>
                        <span className="tabular-nums">
                          {formatNumber(minVal)} {ing.baseUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </SideDrawer>
    </div>
  );
}
