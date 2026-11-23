import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
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
  SideDrawer,
  SortableTh,
  SortMenu,
  StatusPill,
  normalizeVi,
  usePageUiState,
  type PillTone,
  type SearchSuggestion,
  type SortOption,
} from "../../components/shared/ui-kit";
import {
  can,
  canAtBranch,
  homePath,
  isCashier,
  isManager,
  isWarehouse,
  scopedBranch,
} from "../../utils/auth";
import { getIngredient, relativeDateISO } from "../shared/business-demo";
import type { Product, ProductStatus } from "../shared/business-demo";
import { productStatusAtStore } from "../shared/product-branch-status";
import { formatCurrency, formatDate } from "../shared/formatters";
import {
  getBranchProducibleSummary,
  matchIngredientInProduct,
} from "../shared/recipe-helpers";
import { useDemoState } from "../shared/useDemoState";

type ProductSortKey =
  | "name-asc"
  | "name-desc"
  | "code-asc"
  | "code-desc"
  | "newest"
  | "oldest";

const SORT_OPTIONS: readonly SortOption<ProductSortKey>[] = [
  { key: "name-asc", label: "Tên món A → Z", fieldLabel: "product.name" },
  { key: "name-desc", label: "Tên món Z → A", fieldLabel: "product.name" },
  { key: "code-asc", label: "Mã SP A → Z", fieldLabel: "product.code" },
  { key: "code-desc", label: "Mã SP Z → A", fieldLabel: "product.code" },
  { key: "newest", label: "Mới nhất trước", fieldLabel: "product.createdAt" },
  { key: "oldest", label: "Cũ nhất trước", fieldLabel: "product.createdAt" },
];

const STATUS_LABEL: Record<ProductStatus, string> = {
  active: "Đang bán",
  "branch-locked": "Tạm khóa CN",
  inactive: "Ngừng bán",
  "pending-recipe": "Chờ duyệt CT",
};

const STATUS_TONE: Record<ProductStatus, PillTone> = {
  active: "success",
  "branch-locked": "warning",
  inactive: "danger",
  "pending-recipe": "info",
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useDemoState();
  const branchScope = scopedBranch();

  const [ui, setUi] = usePageUiState<{
    branch: string;
    search: string;
    category: string;
    status: string;
    ingredientId: string;
    showLocked: boolean;
    sortBy: ProductSortKey;
    density: "normal" | "compact";
    showCogs: boolean;
    showCreatedAt: boolean;
  }>("mw_ui_products_v1", {
    branch: branchScope ?? "ALL",
    search: "",
    category: "all",
    status: "all",
    ingredientId: "ALL",
    showLocked: false,
    sortBy: "name-asc",
    density: "normal",
    showCogs: false,
    showCreatedAt: false,
  });

  const activeBranch = branchScope ?? ui.branch;
  const [selected, setSelected] = useState<Product | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const canManageProducts = !isCashier() && !isWarehouse() && can("product.manage");
  const canLockAtBranch =
    isManager() &&
    (branchScope
      ? canAtBranch("product.lockAtBranch", branchScope)
      : can("product.lockAtBranch"));
  const canAdminLock = !branchScope && can("product.manage");
  const canReportShortage =
    (isCashier() || isWarehouse()) && can("order.reportShortage");

  const recentThreshold = relativeDateISO(-30);

  // Suggestions for smart search bar (Products vs Ingredients)
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = normalizeVi(ui.search.trim());
    if (!q) return [];
    const ingHits = data.ingredients
      .filter((ing) => normalizeVi(`${ing.code} ${ing.name}`).includes(q))
      .slice(0, 5)
      .map((ing) => ({
        id: `ing-${ing.id}`,
        group: "Lọc theo nguyên liệu cấu thành",
        label: `${ing.code} · ${ing.name}`,
        subLabel: ing.tier ?? "F0",
        onSelect: () => {
          setUi((prev) => ({ ...prev, ingredientId: ing.id, search: "" }));
        },
      }));
    const prodHits = data.products
      .filter((p) => normalizeVi(`${p.code} ${p.name}`).includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: `prod-${p.id}`,
        group: "Sản phẩm trong menu",
        label: `${p.code} · ${p.name}`,
        subLabel: formatCurrency(p.variants[0]?.price ?? 0),
        onSelect: () => {
          setUi((prev) => ({ ...prev, search: p.name }));
        },
      }));
    return [...ingHits, ...prodHits];
  }, [data.ingredients, data.products, ui.search, setUi]);

  // Evaluate ingredient match & sort
  const rowsWithMeta = useMemo(() => {
    const query = ui.search.trim();
    const normQ = normalizeVi(query);
    const hasExplicitIng = ui.ingredientId !== "ALL";

    const list = data.products
      .map((product) => {
        const isLockedAtActive =
          activeBranch !== "ALL" && product.lockedStoreIds.includes(activeBranch);
        const ingMatch = matchIngredientInProduct(data, product, {
          ingredientId: hasExplicitIng ? ui.ingredientId : undefined,
          keyword: !hasExplicitIng && normQ ? query : undefined,
        });
        const producible =
          activeBranch !== "ALL"
            ? getBranchProducibleSummary(data, product, activeBranch)
            : null;
        return { product, isLockedAtActive, ingMatch, producible };
      })
      .filter(({ product, isLockedAtActive, ingMatch }) => {
        if (isCashier() && product.status !== "active" && product.status !== "branch-locked") {
          return false;
        }
        // Chi nhánh nào nhìn thấy sản phẩm mở bán tại chi nhánh đó (ẩn món khóa trừ khi bật "Hiện cả món tạm khóa")
        if (activeBranch !== "ALL" && !ui.showLocked && isLockedAtActive) {
          return false;
        }
        if (hasExplicitIng && !ingMatch.matched) {
          return false;
        }
        if (normQ) {
          const textHit = normalizeVi(`${product.code} ${product.name}`).includes(normQ);
          if (!textHit && !ingMatch.matched) return false;
        }
        if (ui.category !== "all" && product.category !== ui.category) return false;
        if (ui.status !== "all") {
          if (ui.status === "recent30") {
            if ((product.createdAt ?? "") < recentThreshold) return false;
          } else {
            const scopedStatus = productStatusAtStore(
              product,
              activeBranch === "ALL" ? null : activeBranch,
            );
            if (scopedStatus !== ui.status) return false;
          }
        }
        return true;
      });

    list.sort((a, b) => {
      switch (ui.sortBy) {
        case "name-asc":
          return a.product.name.localeCompare(b.product.name, "vi");
        case "name-desc":
          return b.product.name.localeCompare(a.product.name, "vi");
        case "code-asc":
          return a.product.code.localeCompare(b.product.code, "vi");
        case "code-desc":
          return b.product.code.localeCompare(a.product.code, "vi");
        case "newest":
          return (b.product.createdAt ?? "").localeCompare(a.product.createdAt ?? "");
        case "oldest":
          return (a.product.createdAt ?? "").localeCompare(b.product.createdAt ?? "");
      }
    });

    return list;
  }, [data, activeBranch, ui, recentThreshold]);

  // Branch-scoped KPI counts
  const kpiCounts = useMemo(() => {
    const visibleAtScope = data.products.filter(
      (p) => !isCashier() || p.status === "active" || p.status === "branch-locked",
    );
    const scopeId = activeBranch === "ALL" ? null : activeBranch;
    const active = visibleAtScope.filter(
      (p) => productStatusAtStore(p, scopeId) === "active",
    ).length;
    const locked = visibleAtScope.filter(
      (p) => productStatusAtStore(p, scopeId) === "branch-locked",
    ).length;
    const pending = visibleAtScope.filter(
      (p) => productStatusAtStore(p, scopeId) === "pending-recipe",
    ).length;
    const recent30 = visibleAtScope.filter(
      (p) => (p.createdAt ?? "") >= recentThreshold,
    ).length;
    return { active, locked, pending, recent30 };
  }, [data.products, activeBranch, recentThreshold]);

  // Result banner info when searching/filtering by ingredient
  const selectedIng = ui.ingredientId !== "ALL" ? getIngredient(data, ui.ingredientId) : null;
  const ingredientMatchesList = useMemo(() => {
    if (!selectedIng && !ui.search.trim()) return [];
    return rowsWithMeta.filter((r) => r.ingMatch.matched);
  }, [rowsWithMeta, selectedIng, ui.search]);

  function toggleBranchLockFor(product: Product, storeId: string) {
    if (!canLockAtBranch && !canAdminLock) return;
    const isLocked = product.lockedStoreIds.includes(storeId);
    const nextLocked = isLocked
      ? product.lockedStoreIds.filter((id) => id !== storeId)
      : [...product.lockedStoreIds, storeId];
    const nextStatus: ProductStatus =
      product.status === "inactive" || product.status === "pending-recipe"
        ? product.status
        : nextLocked.length > 0
          ? "branch-locked"
          : "active";

    const updated: Product = { ...product, lockedStoreIds: nextLocked, status: nextStatus };
    setData((current) => ({
      ...current,
      products: current.products.map((item) => (item.id === product.id ? updated : item)),
    }));
    if (selected?.id === product.id) setSelected(updated);
    toast.success(
      isLocked
        ? `Đã mở bán lại "${product.name}" tại ${storeId}`
        : `Đã tạm khóa "${product.name}" tại ${storeId}`,
    );
  }

  function applyBulkBranchLock(lock: boolean) {
    if ((!canLockAtBranch && !canAdminLock) || activeBranch === "ALL" || checkedIds.length === 0) return;
    setData((current) => ({
      ...current,
      products: current.products.map((p) => {
        if (!checkedIds.includes(p.id)) return p;
        if (p.status === "inactive" || p.status === "pending-recipe") return p;
        const nextLocked = lock
          ? p.lockedStoreIds.includes(activeBranch)
            ? p.lockedStoreIds
            : [...p.lockedStoreIds, activeBranch]
          : p.lockedStoreIds.filter((id) => id !== activeBranch);
        const nextStatus: ProductStatus =
          nextLocked.length > 0 ? "branch-locked" : "active";
        return { ...p, lockedStoreIds: nextLocked, status: nextStatus };
      }),
    }));
    toast.success(
      `${lock ? "Đã khóa" : "Đã mở bán"} ${checkedIds.length} món tại ${activeBranch}.`,
    );
    setCheckedIds([]);
  }

  function approveProductRecipes(product: Product) {
    if (!canManageProducts) return;
    const nextCogs: Record<string, number | null> = { ...product.cogsBySize };
    for (const variant of product.variants) {
      if (nextCogs[variant.size] == null) {
        nextCogs[variant.size] = variant.size === "L" ? 15600 : 11300;
      }
    }
    const updatedProduct: Product = {
      ...product,
      status: product.lockedStoreIds.length ? "branch-locked" : "active",
      cogsBySize: nextCogs,
      note: "Đã phê duyệt công thức chuẩn, mở bán toàn chuỗi.",
    };
    setData((current) => ({
      ...current,
      recipes: current.recipes.map((recipe) =>
        recipe.productId === product.id
          ? {
            ...recipe,
            status: "approved" as const,
            approver: recipe.approver.trim() || "Quản lý sản phẩm",
          }
          : recipe,
      ),
      products: current.products.map((item) =>
        item.id === product.id ? updatedProduct : item,
      ),
    }));
    setSelected(updatedProduct);
    toast.success(`Đã duyệt công thức & mở bán "${product.name}".`);
  }

  const chips = [
    ...(ui.ingredientId !== "ALL" && selectedIng
      ? [
        {
          id: "ing",
          label: `Nguyên liệu: ${selectedIng.name}`,
          onRemove: () => setUi((p) => ({ ...p, ingredientId: "ALL" })),
        },
      ]
      : []),
    ...(ui.category !== "all"
      ? [
        {
          id: "cat",
          label: `Nhóm: ${data.categories.find((c) => c.key === ui.category)?.name ?? ui.category}`,
          onRemove: () => setUi((p) => ({ ...p, category: "all" })),
        },
      ]
      : []),
    ...(ui.status !== "all"
      ? [
        {
          id: "st",
          label:
            ui.status === "recent30"
              ? "Mới trong 30 ngày"
              : `Trạng thái: ${STATUS_LABEL[ui.status as ProductStatus] ?? ui.status}`,
          onRemove: () => setUi((p) => ({ ...p, status: "all" })),
        },
      ]
      : []),
    ...(ui.showLocked && activeBranch !== "ALL"
      ? [
        {
          id: "locked",
          label: "Đang hiện món tạm khóa",
          onRemove: () => setUi((p) => ({ ...p, showLocked: false })),
        },
      ]
      : []),
    ...(ui.sortBy !== "name-asc"
      ? [
        {
          id: "sort",
          label: `Sắp xếp: ${SORT_OPTIONS.find((s) => s.key === ui.sortBy)?.label ?? ui.sortBy}`,
          onRemove: () => setUi((p) => ({ ...p, sortBy: "name-asc" })),
        },
      ]
      : []),
  ];

  const rowPadding = ui.density === "compact" ? "py-1.5" : "py-2.5";
  const allVisibleIds = rowsWithMeta.map((r) => r.product.id);
  const allChecked =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => checkedIds.includes(id));

  return (
    <div onClick={() => setOpenMenuId(null)}>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Kho hàng</span>
            <span className="sep">/</span>
            <span className="current">Sản phẩm</span>
          </nav>
          <h1 className="page-title">Danh mục sản phẩm theo chi nhánh</h1>
          <p className="page-subtitle">
            Kiểm soát danh mục mở bán, định mức nguyên liệu F0/F1 và số ly có thể pha tại quầy từng chi nhánh.
          </p>
        </div>

        <div className="page-header-actions">
          {canManageProducts && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/inventory/products/new")}
            >
              + Khai báo món
            </button>
          )}
        </div>
      </div>

      {/* Scope Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <ScopeBadge
          branchScope={branchScope}
          value={activeBranch}
          onChange={(next) => {
            setUi((p) => ({ ...p, branch: next }));
            setCheckedIds([]);
          }}
          stores={data.stores}
          allLabel="Toàn chuỗi (12 CN)"
        />
        <InfoTip
          title="Quy tắc thực đơn theo chi nhánh"
          summary="Mặc định mỗi chi nhánh chỉ thấy các món đang mở bán tại quầy của mình. Món đang tạm khóa được ẩn đi để tránh nhầm lẫn, bật 'Hiện món tạm khóa' để kiểm tra."
        />
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "active",
            label: activeBranch === "ALL" ? "Món mở bán chuỗi" : `Đang bán (${activeBranch})`,
            value: String(kpiCounts.active),
            subLabel: `${rowsWithMeta.length} món đang hiển thị`,
            icon: "cup",
            tone: "success",
            valueTone: "success",
            active: ui.status === "active",
            onClick: () =>
              setUi((p) => ({ ...p, status: p.status === "active" ? "all" : "active" })),
          },
          {
            key: "locked",
            label: activeBranch === "ALL" ? "Có CN tạm khóa" : `Tạm khóa (${activeBranch})`,
            value: String(kpiCounts.locked),
            subLabel: ui.showLocked ? "Đang hiện món khóa" : "Nhấn để hiện món khóa",
            icon: "warning",
            tone: "warning",
            valueTone: kpiCounts.locked > 0 ? "warning" : "default",
            active: ui.showLocked,
            onClick: () =>
              setUi((p) => ({
                ...p,
                showLocked: !p.showLocked,
                status: "all",
              })),
          },
          {
            key: "pending",
            label: "Chờ duyệt công thức",
            value: String(kpiCounts.pending),
            subLabel: "Cần duyệt để mở bán",
            icon: "clock",
            tone: "info",
            valueTone: kpiCounts.pending > 0 ? "warning" : "default",
            active: ui.status === "pending-recipe",
            onClick: () =>
              setUi((p) => ({
                ...p,
                status: p.status === "pending-recipe" ? "all" : "pending-recipe",
              })),
          },
          {
            key: "recent",
            label: "Mới 30 ngày qua",
            value: String(kpiCounts.recent30),
            subLabel: `${data.ingredients.length} nguyên liệu F0/F1`,
            icon: "box",
            tone: "primary",
            active: ui.status === "recent30",
            onClick: () =>
              setUi((p) => ({
                ...p,
                status: p.status === "recent30" ? "all" : "recent30",
              })),
          },
        ]}
      />

      {/* Sticky FilterBar */}
      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm tên món, mã SP hoặc nguyên liệu (vd: trà xanh)..."
        suggestions={suggestions}
        density={ui.density}
        onToggleDensity={() =>
          setUi((p) => ({
            ...p,
            density: p.density === "compact" ? "normal" : "compact",
          }))
        }
        chips={chips}
        onClearAll={() =>
          setUi((p) => ({
            ...p,
            search: "",
            category: "all",
            status: "all",
            ingredientId: "ALL",
            showLocked: false,
            sortBy: "name-asc",
          }))
        }
        filters={
          <>
            <select
              aria-label="Lọc nhóm món"
              value={ui.category}
              onChange={(e) => setUi((p) => ({ ...p, category: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
            >
              <option value="all">Tất cả nhóm</option>
              {data.categories
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.key}>
                    {c.name}
                  </option>
                ))}
            </select>

            <select
              aria-label="Kiểm tra món chứa nguyên liệu"
              value={ui.ingredientId}
              onChange={(e) => setUi((p) => ({ ...p, ingredientId: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)] max-w-[185px]"
            >
              <option value="ALL">Lọc theo nguyên liệu: Tất cả</option>
              {data.ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.code} · {ing.name} ({ing.tier ?? "F0"})
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc trạng thái"
              value={ui.status}
              onChange={(e) => setUi((p) => ({ ...p, status: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
            >
              <option value="all">Mọi trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>

            {activeBranch !== "ALL" && (
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 h-8 text-xs text-[var(--text)] cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={ui.showLocked}
                  onChange={(e) =>
                    setUi((p) => ({ ...p, showLocked: e.target.checked }))
                  }
                  className="accent-emerald-600"
                />
                <span>Hiện món tạm khóa</span>
              </label>
            )}
          </>
        }
        sortMenu={
          <SortMenu
            options={SORT_OPTIONS}
            value={ui.sortBy}
            onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
          />
        }
        columns={[
          ...(!isCashier()
            ? [
              {
                key: "cogs",
                label: "COGS ước tính",
                visible: ui.showCogs,
                onToggle: () => setUi((p) => ({ ...p, showCogs: !p.showCogs })),
              },
            ]
            : []),
          {
            key: "createdAt",
            label: "Ngày tạo (product.createdAt)",
            visible: ui.showCreatedAt,
            onToggle: () =>
              setUi((p) => ({ ...p, showCreatedAt: !p.showCreatedAt })),
          },
        ]}
      />

      {/* Ingredient reverse-lookup summary banner */}
      {(selectedIng || (ui.search.trim() && ingredientMatchesList.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/30 px-3.5 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-semibold text-emerald-800 dark:text-emerald-200">
              Tìm thấy {ingredientMatchesList.length} món có chứa{" "}
              {selectedIng ? `"${selectedIng.name}"` : `từ khóa "${ui.search.trim()}"`}:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {ingredientMatchesList.slice(0, 6).map(({ product, ingMatch }) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelected(product)}
                  className="rounded-full border border-emerald-200 dark:border-emerald-700 bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)] hover:border-emerald-500"
                >
                  {product.name}{" "}
                  <span className="text-[var(--muted)]">
                    ({ingMatch.matchType === "via-f1" ? "qua Cốt F1" : "trực tiếp"})
                  </span>
                </button>
              ))}
            </div>
          </div>
          {can("product.manage") && (
            <Link
              to="/production/recipes"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
            >
              Xem công thức →
            </Link>
          )}
        </div>
      )}

      {/* Main Table */}
      <section className="card p-0 overflow-hidden border border-[var(--border)]">
        {rowsWithMeta.length === 0 ? (
          <EmptyState
            title={
              activeBranch !== "ALL"
                ? `Không có món phù hợp tại ${activeBranch} (hoặc món đang tạm khóa).`
                : "Không tìm thấy sản phẩm phù hợp với bộ lọc."
            }
            actionLabel="Xóa bộ lọc"
            onAction={() =>
              setUi((p) => ({
                ...p,
                search: "",
                category: "all",
                status: "all",
                ingredientId: "ALL",
                showLocked: true,
              }))
            }
          />
        ) : (
          <DataTable>
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--background)] text-[var(--muted)] text-xs border-b border-[var(--border)]">
                <tr>
                  {activeBranch !== "ALL" && (canLockAtBranch || canAdminLock) && (
                    <th className="w-9 px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả sản phẩm đang hiển thị"
                        checked={allChecked}
                        onChange={(e) =>
                          setCheckedIds(e.target.checked ? allVisibleIds : [])
                        }
                        className="accent-emerald-600"
                      />
                    </th>
                  )}
                  <SortableTh
                    label="Sản phẩm"
                    fieldHint="product.name / product.code"
                    ascKey="name-asc"
                    descKey="name-desc"
                    currentSort={ui.sortBy}
                    onSort={(k) => setUi((p) => ({ ...p, sortBy: k as ProductSortKey }))}
                  />
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Nhóm</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">
                    Giá bán
                  </th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    {activeBranch === "ALL" ? "Độ phủ chi nhánh" : `Pha được tại ${activeBranch}`}
                  </th>
                  {!isCashier() && ui.showCogs && (
                    <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">
                      COGS
                    </th>
                  )}
                  {ui.showCreatedAt && (
                    <SortableTh
                      label="Ngày tạo"
                      fieldHint="product.createdAt"
                      ascKey="oldest"
                      descKey="newest"
                      currentSort={ui.sortBy}
                      onSort={(k) =>
                        setUi((p) => ({ ...p, sortBy: k as ProductSortKey }))
                      }
                    />
                  )}
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th className="w-12 px-3 py-2.5 text-right font-semibold">⋯</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithMeta.map(({ product, isLockedAtActive, ingMatch, producible }) => {
                  const scopedStatus = productStatusAtStore(
                    product,
                    activeBranch === "ALL" ? null : activeBranch,
                  );
                  const needsAttention =
                    scopedStatus === "branch-locked" ||
                    producible?.status === "out" ||
                    producible?.status === "low" ||
                    scopedStatus === "pending-recipe";
                  const openBranchCount = data.stores.length - product.lockedStoreIds.length;
                  const displayStatus: { label: string; tone: PillTone } =
                    activeBranch !== "ALL" && scopedStatus === "branch-locked"
                      ? { label: `Khóa tại ${activeBranch}`, tone: "warning" }
                      : {
                        label: STATUS_LABEL[scopedStatus],
                        tone: STATUS_TONE[scopedStatus],
                      };

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelected(product)}
                      className={`border-t border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--background)] ${needsAttention
                        ? "border-l-[3px] border-l-amber-500"
                        : ""
                        }`}
                    >
                      {activeBranch !== "ALL" && (canLockAtBranch || canAdminLock) && (
                        <td
                          className={`px-3 ${rowPadding}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${product.name}`}
                            checked={checkedIds.includes(product.id)}
                            onChange={(e) =>
                              setCheckedIds((prev) =>
                                e.target.checked
                                  ? [...prev, product.id]
                                  : prev.filter((x) => x !== product.id),
                              )
                            }
                            className="accent-emerald-600"
                          />
                        </td>
                      )}
                      <td className={`px-3 ${rowPadding}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--heading-color)]">
                            <HighlightText text={product.name} query={ui.search} />
                          </span>
                          {ingMatch.matched && (
                            <StatusPill
                              tone={ingMatch.matchType === "via-f1" ? "info" : "success"}
                              label={
                                ingMatch.matchType === "via-f1"
                                  ? "Chứa NL qua Cốt F1"
                                  : "Chứa NL trực tiếp"
                              }
                              title={ingMatch.matchedLabels.join(", ")}
                            />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--muted)]">
                          <HighlightText text={product.code} query={ui.search} /> · Size{" "}
                          {product.variants.map((v) => v.size).join("/")}
                        </div>
                      </td>
                      <td className={`px-3 ${rowPadding} whitespace-nowrap text-[var(--muted)]`}>
                        {data.categories.find((c) => c.key === product.category)?.name ??
                          product.category}
                      </td>
                      <td
                        className={`px-3 ${rowPadding} text-right font-medium tabular-nums whitespace-nowrap`}
                      >
                        {product.variants.length === 1
                          ? formatCurrency(product.variants[0].price)
                          : `${formatCurrency(product.variants[0].price)} – ${formatCurrency(product.variants[product.variants.length - 1].price)}`}
                      </td>
                      <td className={`px-3 ${rowPadding}`}>
                        {activeBranch === "ALL" ? (
                          <MiniProgress
                            value={openBranchCount}
                            max={data.stores.length}
                            tone={openBranchCount < data.stores.length ? "warning" : "success"}
                            label={`${openBranchCount}/${data.stores.length} CN`}
                          />
                        ) : producible?.cups == null ? (
                          <span className="text-xs text-[var(--muted)]">Chưa có công thức</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <MiniProgress
                              value={Math.min(producible.cups, 60)}
                              max={60}
                              tone={
                                producible.status === "out"
                                  ? "danger"
                                  : producible.status === "low"
                                    ? "warning"
                                    : "success"
                              }
                              label={`~${producible.cups} ly`}
                            />
                            {producible.limitingIngredientName && (
                              <InfoTip
                                title="Nguyên liệu giới hạn"
                                summary={`Tại ${activeBranch}, sản lượng hiện bị giới hạn bởi "${producible.limitingIngredientName}" (tồn quầy còn đủ khoảng ${producible.cups} ly).`}
                              />
                            )}
                          </div>
                        )}
                      </td>
                      {!isCashier() && ui.showCogs && (
                        <td
                          className={`px-3 ${rowPadding} text-right tabular-nums text-[var(--muted)] whitespace-nowrap`}
                        >
                          {product.cogsBySize.M != null
                            ? formatCurrency(product.cogsBySize.M)
                            : product.cogsBySize["Phần"] != null
                              ? formatCurrency(product.cogsBySize["Phần"])
                              : "—"}
                        </td>
                      )}
                      {ui.showCreatedAt && (
                        <td
                          className={`px-3 ${rowPadding} tabular-nums text-xs text-[var(--muted)] whitespace-nowrap`}
                        >
                          {product.createdAt ? formatDate(product.createdAt) : "—"}
                        </td>
                      )}
                      <td className={`px-3 ${rowPadding} whitespace-nowrap`}>
                        <StatusPill label={displayStatus.label} tone={displayStatus.tone} />
                      </td>
                      <td
                        className={`px-3 ${rowPadding} text-right relative`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`Thao tác ${product.name}`}
                          onClick={() =>
                            setOpenMenuId((cur) =>
                              cur === product.id ? null : product.id,
                            )
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent hover:border-[var(--border)] hover:bg-[var(--background)] text-[var(--muted)] font-bold"
                        >
                          ⋯
                        </button>
                        {openMenuId === product.id && (
                          <div className="absolute right-3 top-full mt-1 z-40 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl text-left text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setSelected(product);
                              }}
                              className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--background)]"
                            >
                              Xem chi tiết
                            </button>
                            {canManageProducts && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/inventory/products/${product.id}`);
                                }}
                                className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--background)]"
                              >
                                Chỉnh sửa món
                              </button>
                            )}
                            {(canLockAtBranch || canAdminLock) &&
                              activeBranch !== "ALL" &&
                              (product.status === "active" || product.status === "branch-locked") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    toggleBranchLockFor(product, activeBranch);
                                  }}
                                  className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--background)] text-amber-700 dark:text-amber-300"
                                >
                                  {isLockedAtActive
                                    ? `Mở bán tại ${activeBranch}`
                                    : `Khóa bán tại ${activeBranch}`}
                                </button>
                              )}
                            {can("product.manage") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate("/production/recipes");
                                }}
                                className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--background)]"
                              >
                                Xem công thức BOM
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </section>

      {/* Bulk action floating bar */}
      {checkedIds.length > 0 && activeBranch !== "ALL" && (canLockAtBranch || canAdminLock) && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-slate-900 text-white px-4 py-2 text-xs shadow-2xl">
          <span className="font-semibold">Đã chọn {checkedIds.length} món ({activeBranch})</span>
          <ConfirmInline
            triggerLabel="Khóa tại CN"
            confirmText="Khóa tất cả?"
            onConfirm={() => applyBulkBranchLock(true)}
            triggerClassName="rounded-lg bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 hover:bg-amber-500/30"
          />
          <button
            type="button"
            onClick={() => applyBulkBranchLock(false)}
            className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/30"
          >
            Mở bán tại CN
          </button>
          <button
            type="button"
            onClick={() => setCheckedIds([])}
            className="text-slate-400 hover:text-white"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Detail Slide-over Drawer */}
      <SideDrawer
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={
          selected
            ? `${selected.code} · Tạo ngày ${selected.createdAt ? formatDate(selected.createdAt) : "—"}`
            : undefined
        }
        badge={
          selected ? (() => {
            const st = productStatusAtStore(
              selected,
              activeBranch === "ALL" ? null : activeBranch,
            );
            return (
              <StatusPill
                label={
                  activeBranch !== "ALL" && st === "branch-locked"
                    ? `Khóa tại ${activeBranch}`
                    : STATUS_LABEL[st]
                }
                tone={STATUS_TONE[st]}
              />
            );
          })() : undefined
        }
        footer={
          selected && (
            <>
              {canReportShortage && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    toast.warning(
                      `Đã gửi cảnh báo món "${selected.name}" hết nguyên liệu cho Quản lý!`,
                    );
                    setSelected(null);
                  }}
                >
                  Báo hết NL cho quản lý
                </button>
              )}
              {(canLockAtBranch || canAdminLock) &&
                activeBranch !== "ALL" &&
                (selected.status === "active" || selected.status === "branch-locked") && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleBranchLockFor(selected, activeBranch)}
                  >
                    {selected.lockedStoreIds.includes(activeBranch)
                      ? `Mở bán tại ${activeBranch}`
                      : `Khóa bán tại ${activeBranch}`}
                  </button>
                )}
              {canManageProducts &&
                (selected.status === "pending-recipe" ||
                  data.recipes.some(
                    (r) => r.productId === selected.id && r.status !== "approved",
                  )) && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => approveProductRecipes(selected)}
                  >
                    Duyệt công thức &amp; Mở bán
                  </button>
                )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelected(null)}
              >
                Đóng
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div>
                <div className="text-[11px] text-[var(--muted)]">Nhóm món</div>
                <div className="font-semibold">
                  {data.categories.find((c) => c.key === selected.category)?.name ??
                    selected.category}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--muted)]">Giá bán chuẩn</div>
                <div className="font-semibold tabular-nums">
                  {selected.variants
                    .map((v) => `${v.size}: ${formatCurrency(v.price)}`)
                    .join(" · ")}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-[var(--muted)]">Chi nhánh đang khóa</div>
                <div className="font-medium">
                  {selected.lockedStoreIds.length > 0
                    ? selected.lockedStoreIds.join(", ")
                    : "Đang mở bán tại toàn bộ 12 chi nhánh"}
                </div>
              </div>
            </div>

            {activeBranch !== "ALL" && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-xs font-semibold mb-1">
                  Khả năng pha chế tại {activeBranch}
                </div>
                {(() => {
                  const s = getBranchProducibleSummary(data, selected, activeBranch);
                  if (s.cups == null) {
                    return (
                      <p className="text-xs text-[var(--muted)]">
                        Món chưa có công thức định mức nguyên liệu.
                      </p>
                    );
                  }
                  return (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        Ước tính pha tối đa <b className="tabular-nums">{s.cups} ly</b>
                      </span>
                      {s.limitingIngredientName && (
                        <span className="text-[var(--muted)]">
                          Giới hạn bởi: <b>{s.limitingIngredientName}</b>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase mb-2">
                Công thức theo size
              </h3>
              {data.recipes.filter((r) => r.productId === selected.id).length > 0 ? (
                <div className="space-y-2">
                  {data.recipes
                    .filter((r) => r.productId === selected.id)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-[var(--border)] p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">
                            {r.code} · Size {r.size} (v{r.version})
                          </span>
                          <StatusPill
                            label={
                              r.status === "approved"
                                ? "Đã duyệt"
                                : r.status === "pending"
                                  ? "Chờ duyệt"
                                  : "Nháp"
                            }
                            tone={
                              r.status === "approved"
                                ? "success"
                                : r.status === "pending"
                                  ? "warning"
                                  : "neutral"
                            }
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {r.ingredients.map((line) => (
                            <span
                              key={line.id}
                              className="rounded-md bg-[var(--background)] border border-[var(--border)] px-1.5 py-0.5 text-[11px]"
                            >
                              {getIngredient(data, line.ingredientId)?.name}:{" "}
                              <b className="tabular-nums">
                                {line.quantity} {line.unit}
                              </b>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">Chưa có phiên bản công thức.</p>
              )}
            </div>

            {selected.note && (
              <p className="text-xs text-[var(--muted)] border-t border-[var(--border)] pt-2">
                {selected.note}
              </p>
            )}
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
