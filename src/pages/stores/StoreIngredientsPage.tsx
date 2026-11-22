import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import {
  EmptyState,
  FilterBar,
  HighlightText,
  InfoTip,
  KpiStrip,
  MiniProgress,
  ScopeBadge,
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
import {
  getBranchMinimum,
  getIngredient,
  getStore,
  relativeDateISO,
  usableLotQuantity,
  type Ingredient,
  type IngredientLot,
} from "../shared/business-demo";
import { formatDate, formatNumber, getTodayISO, sumBy } from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";

type StoreIngSortKey = "name-asc" | "stock-asc" | "expiry-asc";

const SORT_OPTIONS: SortOption<StoreIngSortKey>[] = [
  { key: "name-asc", label: "Tên nguyên liệu A → Z", fieldLabel: "Tên nguyên liệu" },
  { key: "stock-asc", label: "Tồn quầy thấp → cao", fieldLabel: "Tồn quầy" },
  { key: "expiry-asc", label: "Hạn dùng gần nhất", fieldLabel: "Hạn dùng" },
];

export default function StoreIngredientsPage() {
  const toast = useToast();
  const [data] = useDemoState();
  const branchScope = scopedBranch();
  const today = getTodayISO();
  const soonLimit = relativeDateISO(3, today);

  const [ui, setUi] = usePageUiState<{
    branch: string;
    search: string;
    statusFilter: "all" | "low" | "expiring" | "ok";
    sortBy: StoreIngSortKey;
    density: "normal" | "compact";
  }>("mw_ui_store_ingredients_v1", {
    branch: branchScope ?? "CN05",
    search: "",
    statusFilter: "all",
    sortBy: "name-asc",
    density: "normal",
  });

  const activeBranch = branchScope ?? ui.branch;
  const [detailRow, setDetailRow] = useState<{
    ingredient: Ingredient;
    storeId: string;
    available: number;
    minimum: number;
    reserved: number;
    locked: number;
    lots: IngredientLot[];
  } | null>(null);

  const counterRows = useMemo(() => {
    const targetStores =
      activeBranch === "ALL"
        ? data.stores.slice(0, 6)
        : data.stores.filter((s) => s.id === activeBranch);

    const list: Array<{
      id: string;
      storeId: string;
      storeName: string;
      ingredient: Ingredient;
      lots: IngredientLot[];
      available: number;
      reserved: number;
      locked: number;
      minimum: number;
      nearestExpiry: string | null;
      status: "low" | "expiring" | "ok";
      searchBlob: string;
    }> = [];

    for (const store of targetStores) {
      // Gather ingredients relevant to counter (present in branchMinimums, fixed plans, or existing lots)
      const lotsAtStore = data.lots.filter(
        (l) => l.location === "counter" && l.locationId === store.id,
      );
      const relevantIngIds = new Set<string>([
        ...lotsAtStore.map((l) => l.ingredientId),
        ...data.masterFixedPlans
          .filter((m) => m.storeId === store.id)
          .map((m) => m.ingredientId),
        ...data.ingredients
          .filter((ing) => ing.branchMinimums && store.id in ing.branchMinimums)
          .map((ing) => ing.id),
      ]);

      for (const ingId of relevantIngIds) {
        const ing = getIngredient(data, ingId);
        if (!ing) continue;
        const ingLots = lotsAtStore.filter((l) => l.ingredientId === ingId);
        const available = sumBy(ingLots, (l) => usableLotQuantity(l, today));
        const reserved = sumBy(ingLots, (l) => l.reservedQuantity ?? 0);
        const locked = sumBy(ingLots, (l) => l.lockedQuantity ?? 0);
        const minimum = getBranchMinimum(ing, store.id);
        const expDates = ingLots
          .map((l) => l.expiryDate)
          .filter((d): d is string => Boolean(d))
          .sort();
        const nearestExpiry = expDates[0] ?? null;

        let status: "low" | "expiring" | "ok" = "ok";
        if (available < minimum) status = "low";
        else if (nearestExpiry && nearestExpiry <= soonLimit) status = "expiring";

        list.push({
          id: `${store.id}-${ing.id}`,
          storeId: store.id,
          storeName: store.name,
          ingredient: ing,
          lots: ingLots,
          available,
          reserved,
          locked,
          minimum,
          nearestExpiry,
          status,
          searchBlob: normalizeVi(
            `${ing.code} ${ing.name} ${store.id} ${store.name} ${ingLots
              .map((l) => l.lotCode)
              .join(" ")}`,
          ),
        });
      }
    }
    return list;
  }, [data, activeBranch, today, soonLimit]);

  const kpiStats = useMemo(() => {
    const low = counterRows.filter((r) => r.status === "low").length;
    const expiring = counterRows.filter((r) => r.status === "expiring").length;
    const ok = counterRows.filter((r) => r.status === "ok").length;
    return { total: counterRows.length, low, expiring, ok };
  }, [counterRows]);

  const filteredRows = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    const rows = counterRows.filter((row) => {
      if (ui.statusFilter !== "all" && row.status !== ui.statusFilter) return false;
      if (q && !row.searchBlob.includes(q)) return false;
      return true;
    });

    rows.sort((a, b) => {
      if (ui.sortBy === "name-asc") {
        return a.ingredient.name.localeCompare(b.ingredient.name, "vi");
      }
      if (ui.sortBy === "stock-asc") {
        const ratioA = a.minimum > 0 ? a.available / a.minimum : a.available;
        const ratioB = b.minimum > 0 ? b.available / b.minimum : b.available;
        return ratioA - ratioB;
      }
      return (a.nearestExpiry ?? "9999-12-31").localeCompare(
        b.nearestExpiry ?? "9999-12-31",
      );
    });
    return rows;
  }, [counterRows, ui.statusFilter, ui.search, ui.sortBy]);

  const STATUS_META: Record<
    "low" | "expiring" | "ok",
    { label: string; tone: PillTone }
  > = {
    low: { label: "Dưới ngưỡng quầy", tone: "danger" },
    expiring: { label: "Cận hạn ≤ 3 ngày", tone: "warning" },
    ok: { label: "Đủ định mức", tone: "success" },
  };

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Cửa hàng &amp; Quầy bar</span>
            <span className="sep">/</span>
            <span className="current">Nguyên liệu tại quầy</span>
          </nav>
          <h1 className="page-title">Tồn nguyên liệu quầy chi nhánh</h1>
          <p className="page-subtitle">
            Giám sát lượng nguyên liệu khả dụng, lô cận hạn tại quầy pha chế và đề xuất bổ sung kịp thời.
          </p>
        </div>

        <div className="page-header-actions flex-wrap">
          <Link to="/stores/shift-reconciliation" className="btn btn-secondary">
            Đối soát cuối ca →
          </Link>
          <Link to="/production/planning" className="btn btn-primary">
            + Báo thiếu / Đề xuất cấp thêm
          </Link>
        </div>
      </div>

      {/* Scope Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <ScopeBadge
          branchScope={branchScope}
          value={activeBranch}
          onChange={(next) => setUi((p) => ({ ...p, branch: next }))}
          stores={data.stores}
          allLabel="Toàn chuỗi (Tổng hợp)"
        />
        <InfoTip
          title="Quy tắc tồn quầy chi nhánh"
          summary="Chỉ hiển thị tồn khả dụng của đúng chi nhánh đang phụ trách. Ngưỡng an toàn từng chi nhánh phản ánh nhu cầu thực tế trong ngày."
        />
      </div>

      <KpiStrip
        items={[
          {
            key: "all",
            label: "Mã NL tại quầy",
            value: String(kpiStats.total),
            subLabel: "Đang theo dõi định mức",
            icon: "box",
            tone: "primary",
            active: ui.statusFilter === "all",
            onClick: () => setUi((p) => ({ ...p, statusFilter: "all" })),
          },
          {
            key: "low",
            label: "Dưới ngưỡng an toàn",
            value: String(kpiStats.low),
            subLabel: "Cần đề xuất bổ sung",
            icon: "warning",
            tone: kpiStats.low > 0 ? "danger" : "success",
            valueTone: kpiStats.low > 0 ? "danger" : "default",
            active: ui.statusFilter === "low",
            onClick: () =>
              setUi((p) => ({
                ...p,
                statusFilter: p.statusFilter === "low" ? "all" : "low",
              })),
          },
          {
            key: "expiring",
            label: "Lô cận hạn sử dụng",
            value: String(kpiStats.expiring),
            subLabel: "Hạn ≤ 3 ngày theo FEFO",
            icon: "clock",
            tone: "warning",
            valueTone: kpiStats.expiring > 0 ? "warning" : "default",
            active: ui.statusFilter === "expiring",
            onClick: () =>
              setUi((p) => ({
                ...p,
                statusFilter: p.statusFilter === "expiring" ? "all" : "expiring",
              })),
          },
          {
            key: "ok",
            label: "Sẵn sàng phục vụ",
            value: String(kpiStats.ok),
            subLabel: "Đạt mức tiêu chuẩn",
            icon: "document-check",
            tone: "success",
            valueTone: "success",
            active: ui.statusFilter === "ok",
            onClick: () =>
              setUi((p) => ({
                ...p,
                statusFilter: p.statusFilter === "ok" ? "all" : "ok",
              })),
          },
        ]}
      />

      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm tên nguyên liệu, mã NL hoặc số lô tại quầy..."
        density={ui.density}
        onToggleDensity={() =>
          setUi((p) => ({
            ...p,
            density: p.density === "compact" ? "normal" : "compact",
          }))
        }
        onClearAll={() =>
          setUi((p) => ({
            ...p,
            search: "",
            statusFilter: "all",
            sortBy: "name-asc",
          }))
        }
        filters={
          <select
            aria-label="Lọc trạng thái quầy"
            value={ui.statusFilter}
            onChange={(e) =>
              setUi((p) => ({
                ...p,
                statusFilter: e.target.value as "all" | "low" | "expiring" | "ok",
              }))
            }
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="low">Dưới ngưỡng quầy</option>
            <option value="expiring">Cận hạn ≤ 3 ngày</option>
            <option value="ok">Đủ định mức</option>
          </select>
        }
        sortMenu={
          <SortMenu
            options={SORT_OPTIONS}
            value={ui.sortBy}
            onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
          />
        }
      />

      <section className="card p-0 overflow-hidden">
        {filteredRows.length === 0 ? (
          <EmptyState
            title="Không có nguyên liệu quầy phù hợp bộ lọc."
            actionLabel="Xóa bộ lọc"
            onAction={() =>
              setUi((p) => ({ ...p, search: "", statusFilter: "all" }))
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
                    label="Nguyên liệu"
                    fieldHint="ingredient.name"
                    ascKey="name-asc"
                    descKey="name-asc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as StoreIngSortKey }))
                    }
                  />
                  <th>Chi nhánh</th>
                  <SortableTh
                    label="Tồn quầy vs Ngưỡng an toàn"
                    fieldHint="available / minimum"
                    ascKey="stock-asc"
                    descKey="stock-asc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as StoreIngSortKey }))
                    }
                  />
                  <SortableTh
                    label="Hạn gần nhất"
                    fieldHint="nearestExpiry"
                    ascKey="expiry-asc"
                    descKey="expiry-asc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as StoreIngSortKey }))
                    }
                  />
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.status === "low"
                        ? "border-l-4 border-l-rose-500"
                        : row.status === "expiring"
                          ? "border-l-4 border-l-amber-500"
                          : ""
                    }
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text)]">
                          <HighlightText
                            text={row.ingredient.name}
                            query={ui.search}
                          />
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[10px] font-semibold">
                          {row.ingredient.tier ?? "F0"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                        {row.ingredient.code} · {row.lots.length} lô tại quầy
                      </div>
                    </td>

                    <td>
                      <div className="font-semibold text-[var(--text)]">
                        {row.storeId}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {row.storeName}
                      </div>
                    </td>

                    <td className="min-w-[200px]">
                      <MiniProgress
                        value={row.available}
                        max={Math.max(row.minimum * 1.5, row.available, 1)}
                        tone={
                          row.status === "low"
                            ? "danger"
                            : row.status === "expiring"
                              ? "warning"
                              : "success"
                        }
                        label={`${formatNumber(row.available)} / ngưỡng ${formatNumber(row.minimum)} ${row.ingredient.baseUnit}`}
                      />
                    </td>

                    <td className="tabular-nums text-xs">
                      {row.nearestExpiry ? (
                        <span
                          className={
                            row.nearestExpiry <= soonLimit
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : "text-[var(--text)]"
                          }
                        >
                          {formatDate(row.nearestExpiry)}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">Không hạn</span>
                      )}
                    </td>

                    <td>
                      <StatusPill
                        label={STATUS_META[row.status].label}
                        tone={STATUS_META[row.status].tone}
                      />
                    </td>

                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          setDetailRow({
                            ingredient: row.ingredient,
                            storeId: row.storeId,
                            available: row.available,
                            minimum: row.minimum,
                            reserved: row.reserved,
                            locked: row.locked,
                            lots: row.lots,
                          })
                        }
                      >
                        Chi tiết lô ({row.lots.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SideDrawer
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={detailRow?.ingredient.name ?? "Chi tiết tồn quầy"}
        subtitle={
          detailRow
            ? `${detailRow.storeId} · ${getStore(data, detailRow.storeId)?.name ?? ""} · Ngưỡng an toàn: ${formatNumber(detailRow.minimum)} ${detailRow.ingredient.baseUnit}`
            : ""
        }
        widthClass="max-w-[520px]"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link
              to="/production/planning"
              onClick={() =>
                toast.info(
                  "Bạn có thể gửi yêu cầu bổ sung tạm thời nếu quầy đang thiếu hụt.",
                )
              }
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              + Báo thiếu &amp; Đề xuất cấp thêm →
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDetailRow(null)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {detailRow && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5">
                <div className="text-[var(--muted)]">Tồn khả dụng</div>
                <div className="text-sm font-bold tabular-nums mt-0.5 text-[var(--heading-color)]">
                  {formatNumber(detailRow.available)} {detailRow.ingredient.baseUnit}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5">
                <div className="text-[var(--muted)]">Đang giữ chỗ</div>
                <div className="text-sm font-bold tabular-nums mt-0.5">
                  {formatNumber(detailRow.reserved)} {detailRow.ingredient.baseUnit}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5">
                <div className="text-[var(--muted)]">Đang khóa</div>
                <div className="text-sm font-bold tabular-nums mt-0.5">
                  {formatNumber(detailRow.locked)} {detailRow.ingredient.baseUnit}
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--heading-color)] mb-2">
                Danh sách lô hàng tại quầy ({detailRow.lots.length})
              </div>
              {detailRow.lots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[var(--muted)]">
                  Quầy hiện hết tồn kho cho nguyên liệu này.
                </div>
              ) : (
                <div className="space-y-2">
                  {detailRow.lots.map((lot) => (
                    <div
                      key={lot.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono font-semibold text-[var(--text)]">
                          {lot.lotCode}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          HSD:{" "}
                          {lot.expiryDate ? formatDate(lot.expiryDate) : "Không hạn"}
                          {lot.batchId ? " · Từ bếp trung tâm" : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums text-[var(--heading-color)]">
                          {formatNumber(lot.quantity)} {detailRow.ingredient.baseUnit}
                        </div>
                        <StatusPill
                          label={
                            lot.quality === "pass"
                              ? "Đạt QC"
                              : lot.quality === "quarantine"
                                ? "Tạm giữ"
                                : "Hết hạn"
                          }
                          tone={lot.quality === "pass" ? "success" : "danger"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
