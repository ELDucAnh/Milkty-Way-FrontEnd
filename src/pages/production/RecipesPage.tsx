import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import {
  EmptyState,
  FilterBar,
  HighlightText,
  InfoTip,
  KpiStrip,
  SegmentedControl,
  SideDrawer,
  SortableTh,
  SortMenu,
  StatusPill,
  UndoBanner,
  normalizeVi,
  usePageUiState,
  type PillTone,
  type SearchSuggestion,
  type SortOption,
} from "../../components/shared/ui-kit";
import { homePath } from "../../utils/auth";
import { getIngredient, usableLotQuantity } from "../shared/business-demo";
import type {
  ProductionBatch,
  RecipeApproval,
  RecipeIngredient,
  RecipeKind,
  RecipePriority,
  RecipeVersion,
} from "../shared/business-demo";
import {
  formatCurrency,
  formatDate,
  getTodayISO,
  makeId,
} from "../shared/formatters";
import { matchIngredientInRecipe } from "../shared/recipe-helpers";
import { useDemoState } from "../shared/useDemoState";

type RecipeSortKey =
  | "priority-asc"
  | "priority-desc"
  | "name-asc"
  | "name-desc"
  | "newest"
  | "oldest";

const SORT_OPTIONS: readonly SortOption<RecipeSortKey>[] = [
  { key: "priority-asc", label: "Ưu tiên Cao → Thấp", fieldLabel: "recipe.priority" },
  { key: "priority-desc", label: "Ưu tiên Thấp → Cao", fieldLabel: "recipe.priority" },
  { key: "name-asc", label: "Tên món A → Z", fieldLabel: "product.name" },
  { key: "name-desc", label: "Tên món Z → A", fieldLabel: "product.name" },
  { key: "newest", label: "Mới nhất trước", fieldLabel: "recipe.effectiveDate" },
  { key: "oldest", label: "Cũ nhất trước", fieldLabel: "recipe.effectiveDate" },
];

const STATUS_LABEL: Record<RecipeApproval, string> = {
  approved: "Đã duyệt",
  draft: "Bản nháp",
  pending: "Chờ duyệt",
};

const STATUS_TONE: Record<RecipeApproval, PillTone> = {
  approved: "success",
  pending: "warning",
  draft: "info",
};

const PRIORITY_META: Record<
  RecipePriority,
  { label: string; dot: string; badge: string }
> = {
  1: {
    label: "P1 · Cao (Chủ lực)",
    dot: "bg-rose-500 text-white",
    badge: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
  },
  2: {
    label: "P2 · Trung bình",
    dot: "bg-sky-500 text-white",
    badge: "text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300",
  },
  3: {
    label: "P3 · Thấp (Theo mùa)",
    dot: "bg-slate-400 text-white",
    badge: "text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  },
};

interface DraftLine {
  id: string;
  ingredientId: string;
  quantity: string;
  useType: RecipeIngredient["useType"];
  note: string;
  optionRule: string;
}

interface RecipeForm {
  kind: RecipeKind;
  productId: string;
  outputIngredientId: string;
  size: RecipeVersion["size"];
  priority: RecipePriority;
  yieldQuantity: string;
  yieldUnit: string;
  version: string;
  effectiveDate: string;
  approver: string;
  changeReason: string;
}

const EMPTY_FORM: RecipeForm = {
  kind: "drink",
  productId: "hd-001",
  outputIngredientId: "ing-tea-base",
  size: "M",
  priority: 2,
  yieldQuantity: "1",
  yieldUnit: "ly",
  version: "1.0",
  effectiveDate: "",
  approver: "",
  changeReason: "",
};

const EMPTY_LINE = (): DraftLine => ({
  id: makeId("recipe-line"),
  ingredientId: "ing-tea-base",
  quantity: "100",
  useType: "required",
  note: "",
  optionRule: "",
});

function bumpVersion(ver: string): string {
  const parts = ver.split(".");
  if (parts.length === 2 && !Number.isNaN(Number(parts[1]))) {
    return `${parts[0]}.${Number(parts[1]) + 1}`;
  }
  return `${ver}.1`;
}

export default function RecipesPage() {
  const toast = useToast();
  const [data, setData] = useDemoState();

  const [ui, setUi] = usePageUiState<{
    search: string;
    approval: string;
    kind: string;
    ingredientId: string;
    sortBy: RecipeSortKey;
  }>("mw_ui_recipes_v1", {
    search: "",
    approval: "all",
    kind: "all",
    ingredientId: "ALL",
    sortBy: "priority-asc",
  });

  const [selectedId, setSelectedId] = useState<string>(
    data.recipes[0]?.id ?? "",
  );
  const [detailTab, setDetailTab] = useState<"ingredients" | "steps" | "history">(
    "ingredients",
  );
  const [expandedF1Ids, setExpandedF1Ids] = useState<Record<string, boolean>>({});
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Create/Edit Drawer
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeVersion | null>(null);
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [lines, setLines] = useState<DraftLine[]>([EMPTY_LINE()]);

  // Bulk Ingredient Replace Drawer (3-step horizontal stepper)
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceStep, setReplaceStep] = useState<1 | 2 | 3>(1);
  const [fromIngId, setFromIngId] = useState("ing-tea-base");
  const [toIngId, setToIngId] = useState("ing-green-tea-base");
  const [customNewQty, setCustomNewQty] = useState("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [disposition, setDisposition] = useState<"sell-through" | "discard-remake">(
    "sell-through",
  );
  const [undoSnapshot, setUndoSnapshot] = useState<{
    recipes: RecipeVersion[];
    batches: ProductionBatch[];
    label: string;
  } | null>(null);

  const getRecipeDisplayName = (recipe: RecipeVersion) => {
    const product = data.products.find((p) => p.id === recipe.productId);
    const output = getIngredient(data, recipe.outputIngredientId ?? "");
    return product?.name ?? output?.name ?? "Công thức chưa gán món";
  };

  // Search suggestions (Món vs Nguyên liệu)
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = normalizeVi(ui.search.trim());
    if (!q) return [];
    const ingHits = data.ingredients
      .filter((ing) => normalizeVi(`${ing.code} ${ing.name}`).includes(q))
      .slice(0, 5)
      .map((ing) => ({
        id: `rec-ing-${ing.id}`,
        group: "Kiểm tra món chứa nguyên liệu",
        label: `${ing.code} · ${ing.name}`,
        subLabel: ing.tier ?? "F0",
        onSelect: () => setUi((p) => ({ ...p, ingredientId: ing.id, search: "" })),
      }));
    const recHits = data.recipes
      .filter((r) => normalizeVi(`${r.code} ${getRecipeDisplayName(r)}`).includes(q))
      .slice(0, 5)
      .map((r) => ({
        id: `rec-item-${r.id}`,
        group: "Công thức",
        label: `${r.code} · ${getRecipeDisplayName(r)}`,
        subLabel: r.size,
        onSelect: () => {
          setSelectedId(r.id);
          setUi((p) => ({ ...p, search: getRecipeDisplayName(r) }));
        },
      }));
    return [...ingHits, ...recHits];
  }, [data.ingredients, data.recipes, data.products, ui.search, setUi]);

  // Filter & Sort recipes
  const rowsWithMatch = useMemo(() => {
    const q = ui.search.trim();
    const normQ = normalizeVi(q);
    const hasExplicitIng = ui.ingredientId !== "ALL";

    const list = data.recipes
      .map((recipe) => {
        const displayName = getRecipeDisplayName(recipe);
        const match = matchIngredientInRecipe(data, recipe, {
          ingredientId: hasExplicitIng ? ui.ingredientId : undefined,
          keyword: !hasExplicitIng && normQ ? q : undefined,
        });
        return { recipe, displayName, match };
      })
      .filter(({ recipe, displayName, match }) => {
        if (ui.approval !== "all" && recipe.status !== ui.approval) return false;
        if (ui.kind !== "all" && recipe.kind !== ui.kind) return false;
        if (hasExplicitIng && !match.matched) return false;
        if (normQ) {
          const textHit = normalizeVi(`${recipe.code} ${displayName}`).includes(normQ);
          if (!textHit && !match.matched) return false;
        }
        return true;
      });

    list.sort((a, b) => {
      switch (ui.sortBy) {
        case "priority-asc":
          return (
            (a.recipe.priority ?? 2) - (b.recipe.priority ?? 2) ||
            a.displayName.localeCompare(b.displayName, "vi")
          );
        case "priority-desc":
          return (
            (b.recipe.priority ?? 2) - (a.recipe.priority ?? 2) ||
            a.displayName.localeCompare(b.displayName, "vi")
          );
        case "name-asc":
          return a.displayName.localeCompare(b.displayName, "vi");
        case "name-desc":
          return b.displayName.localeCompare(a.displayName, "vi");
        case "newest":
          return b.recipe.effectiveDate.localeCompare(a.recipe.effectiveDate);
        case "oldest":
          return a.recipe.effectiveDate.localeCompare(b.recipe.effectiveDate);
      }
    });

    return list;
  }, [data, ui]);

  const activeEntry =
    rowsWithMatch.find((r) => r.recipe.id === selectedId) ?? rowsWithMatch[0] ?? null;
  const activeRecipe = activeEntry?.recipe ?? null;

  // Auto-expand matched F1 ingredient rows in detail panel
  useEffect(() => {
    if (!activeEntry?.match.matched) return;
    const next: Record<string, boolean> = {};
    for (const id of activeEntry.match.matchedIngredientIds) {
      const ing = getIngredient(data, id);
      if (ing?.tier === "F1") next[id] = true;
    }
    if (Object.keys(next).length > 0) {
      setExpandedF1Ids((prev) => ({ ...prev, ...next }));
    }
  }, [activeEntry, data]);

  // Affected recipes in Replace Drawer
  const replaceCandidates = useMemo(() => {
    if (!fromIngId) return [];
    return data.recipes.map((recipe) => {
      const match = matchIngredientInRecipe(data, recipe, { ingredientId: fromIngId });
      const displayName = getRecipeDisplayName(recipe);
      const directLine = recipe.ingredients.find((l) => l.ingredientId === fromIngId);
      const isViaF1 = match.matchType === "via-f1" || match.matchType === "both";
      return { recipe, displayName, match, directLine, isViaF1 };
    }).filter((item) => item.match.matched);
  }, [data, fromIngId]);

  const sharedF1Notice = useMemo(() => {
    const ing = getIngredient(data, fromIngId);
    if (ing?.tier === "F0") {
      const f1UsingF0 = data.ingredients.filter(
        (item) =>
          item.tier === "F1" &&
          item.parentF0Items?.some((p) => p.ingredientId === fromIngId),
      );
      if (f1UsingF0.length > 0) {
        return f1UsingF0.map((f1) => f1.name).join(", ");
      }
    }
    if (ing?.tier === "F1" && replaceCandidates.length > 1) {
      return `${ing.name} đang được dùng chung bởi ${replaceCandidates.length} công thức`;
    }
    return null;
  }, [data, fromIngId, replaceCandidates]);

  function openReplaceDrawer(presetIngredientId?: string) {
    const initFrom =
      presetIngredientId && presetIngredientId !== "ALL"
        ? presetIngredientId
        : ui.ingredientId !== "ALL"
          ? ui.ingredientId
          : "ing-tea-base";
    setFromIngId(initFrom);
    const alt =
      data.ingredients.find((i) => i.id !== initFrom && i.group === getIngredient(data, initFrom)?.group) ??
      data.ingredients.find((i) => i.id !== initFrom);
    setToIngId(alt?.id ?? "ing-green-tea-base");
    setCustomNewQty("");
    const matches = data.recipes.filter(
      (r) => matchIngredientInRecipe(data, r, { ingredientId: initFrom }).matched,
    );
    // Mặc định tích sẵn món đầu tiên để thấy rõ "Thay X không ảnh hưởng Y, Z"
    setSelectedRecipeIds(matches[0] ? [matches[0].id] : []);
    setDisposition("sell-through");
    setReplaceStep(1);
    setReplaceOpen(true);
  }

  function applyQuickReplace() {
    if (!fromIngId || !toIngId || selectedRecipeIds.length === 0) return;
    const fromIng = getIngredient(data, fromIngId);
    const toIng = getIngredient(data, toIngId);
    if (!fromIng || !toIng) return;

    const prevRecipes = data.recipes;
    const prevBatches = data.batches;
    const parsedQty = Number(customNewQty);
    const useCustomQty = customNewQty.trim() !== "" && Number.isFinite(parsedQty) && parsedQty > 0;

    const affectedBatches = data.batches.filter((b) => {
      const rec = data.recipes.find((r) => r.id === b.recipeId);
      const outputId = rec?.outputIngredientId;
      return (
        outputId === fromIngId ||
        b.inputs.some((inp) => inp.ingredientId === fromIngId)
      );
    });

    const remakeBatches: ProductionBatch[] = [];
    if (disposition === "discard-remake") {
      // Khởi tạo lệnh sản xuất bù (Remake Batch) cho bán thành phẩm/công thức bị thu hồi
      remakeBatches.push({
        id: makeId("batch-remake"),
        code: `REMAKE-${getTodayISO().replace(/-/g, "").slice(2)}-${data.batches.length + 1}`,
        recipeId: selectedRecipeIds[0],
        shift: "Ca sáng",
        plannedQuantity: 10000,
        inputs: [],
        actualQuantity: null,
        wasteQuantity: null,
        unit: toIng.baseUnit,
        startedAt: `${getTodayISO()}T09:00`,
        expiryDate: "",
        quality: "unchecked",
        operator: "Nhân viên chế biến (Lệnh làm lại)",
        approver: "",
        status: "planned",
        distributions: [],
      });
    }

    setData((current) => ({
      ...current,
      recipes: current.recipes.map((recipe) => {
        if (!selectedRecipeIds.includes(recipe.id)) return recipe;
        const nextIngredients = recipe.ingredients.map((line) => {
          if (line.ingredientId === fromIngId) {
            return {
              ...line,
              ingredientId: toIngId,
              quantity: useCustomQty ? parsedQty : line.quantity,
              unit: toIng.baseUnit,
              note: `Thay từ ${fromIng.name}`,
            };
          }
          // Nếu đang khớp gián tiếp qua F1 mà người dùng chọn tách/đổi trực tiếp sang NL mới:
          const lineIng = current.ingredients.find((i) => i.id === line.ingredientId);
          if (
            lineIng?.tier === "F1" &&
            lineIng.parentF0Items?.some((f0) => f0.ingredientId === fromIngId)
          ) {
            return {
              ...line,
              ingredientId: toIngId,
              quantity: useCustomQty ? parsedQty : line.quantity,
              unit: toIng.baseUnit,
              note: `Tách nhánh khỏi ${lineIng.name}`,
            };
          }
          return line;
        });

        const historyEntry = {
          id: makeId("rep-hist"),
          date: getTodayISO(),
          actor: "Quản lý sản phẩm",
          fromIngredientId: fromIngId,
          toIngredientId: toIngId,
          disposition,
          note:
            disposition === "discard-remake"
              ? `Thu hồi & hủy ${affectedBatches.length} mẻ cũ; tạo lệnh làm lại`
              : "Bán hết lô cũ còn hạn, áp dụng NL mới cho mẻ tiếp theo",
        };

        return {
          ...recipe,
          version: bumpVersion(recipe.version),
          effectiveDate: getTodayISO(),
          changeReason: `Thay nhanh: ${fromIng.name} -> ${toIng.name}`,
          ingredients: nextIngredients,
          replacementHistory: [historyEntry, ...(recipe.replacementHistory ?? [])],
        };
      }),
      batches:
        disposition === "discard-remake"
          ? [
            ...remakeBatches,
            ...current.batches.map((b) =>
              affectedBatches.some((ab) => ab.id === b.id)
                ? { ...b, status: "held" as const }
                : b,
            ),
          ]
          : current.batches,
    }));

    setUndoSnapshot({
      recipes: prevRecipes,
      batches: prevBatches,
      label: `Đã thay "${fromIng.name}" -> "${toIng.name}" cho ${selectedRecipeIds.length} công thức`,
    });
    setReplaceOpen(false);
    toast.success(
      `Đã cập nhật ${selectedRecipeIds.length} công thức (các món khác giữ nguyên).`,
    );
  }

  function updateRecipePriority(recipe: RecipeVersion, priority: RecipePriority) {
    setData((current) => ({
      ...current,
      recipes: current.recipes.map((r) => (r.id === recipe.id ? { ...r, priority } : r)),
    }));
    toast.info(`Đã đặt độ ưu tiên ${PRIORITY_META[priority].label} cho ${recipe.code}.`);
  }

  const currentCost = (recipe: RecipeVersion) =>
    recipe.ingredients
      .filter((line) => line.useType !== "optional-topping")
      .reduce((sum, line) => {
        const lots = data.lots.filter(
          (lot) =>
            lot.ingredientId === line.ingredientId && usableLotQuantity(lot) > 0,
        );
        const totalQty = lots.reduce((value, lot) => value + usableLotQuantity(lot), 0);
        const totalValue = lots.reduce(
          (value, lot) => value + usableLotQuantity(lot) * lot.unitCost,
          0,
        );
        const unitCost = totalQty > 0 ? totalValue / totalQty : 0;
        return sum + line.quantity * unitCost;
      }, 0);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, effectiveDate: getTodayISO() });
    setLines([EMPTY_LINE()]);
    setFormDrawerOpen(true);
  }

  function openEdit(recipe: RecipeVersion) {
    setEditing(recipe);
    setForm({
      kind: recipe.kind,
      productId: recipe.productId ?? data.products[0]?.id ?? "",
      outputIngredientId: recipe.outputIngredientId ?? data.ingredients[0]?.id ?? "",
      size: recipe.size,
      priority: recipe.priority ?? 2,
      yieldQuantity: String(recipe.yieldQuantity),
      yieldUnit: recipe.yieldUnit,
      version: recipe.version,
      effectiveDate: recipe.effectiveDate,
      approver: recipe.approver,
      changeReason: recipe.changeReason,
    });
    setLines(recipe.ingredients.map((line) => ({ ...line, quantity: String(line.quantity) })));
    setFormDrawerOpen(true);
  }

  function saveDraft(event: FormEvent) {
    event.preventDefault();
    const yieldQuantity = Number(form.yieldQuantity);
    if (
      !form.version.trim() ||
      !form.effectiveDate ||
      !form.changeReason.trim() ||
      !Number.isFinite(yieldQuantity) ||
      yieldQuantity <= 0
    ) {
      toast.warning("Vui lòng nhập đầy đủ phiên bản, ngày hiệu lực, sản lượng và lý do.");
      return;
    }
    if (
      !lines.length ||
      lines.some(
        (l) => !l.ingredientId || !Number.isFinite(Number(l.quantity)) || Number(l.quantity) <= 0,
      )
    ) {
      toast.warning("Mỗi dòng nguyên liệu phải có định lượng dương.");
      return;
    }

    const nextRecipe: RecipeVersion = {
      id: editing?.id ?? makeId("recipe"),
      code:
        editing?.code ??
        (form.kind === "drink"
          ? `RC-${data.products.find((p) => p.id === form.productId)?.code}-${form.size}-${form.version}`
          : `RC-BTP-${form.outputIngredientId}-${form.version}`),
      kind: form.kind,
      productId: form.kind === "drink" ? form.productId : null,
      outputIngredientId: form.kind === "prep" ? form.outputIngredientId : null,
      size: form.kind === "prep" ? "Mẻ" : form.size,
      priority: form.priority,
      hierarchyPath: "F0 -> F1 -> Món",
      yieldQuantity,
      yieldUnit: form.yieldUnit,
      version: form.version.trim(),
      effectiveDate: form.effectiveDate,
      approver: form.approver.trim(),
      changeReason: form.changeReason.trim(),
      status: "draft",
      ingredients: lines.map((line) => ({
        ...line,
        quantity: Number(line.quantity),
        unit: getIngredient(data, line.ingredientId)?.baseUnit ?? "",
      })),
    };

    setData((current) => ({
      ...current,
      recipes: editing
        ? current.recipes.map((item) => (item.id === editing.id ? nextRecipe : item))
        : [nextRecipe, ...current.recipes],
    }));
    setSelectedId(nextRecipe.id);
    setFormDrawerOpen(false);
    toast.success("Đã lưu công thức nháp.");
  }

  function sendForApproval(recipe: RecipeVersion) {
    setData((current) => ({
      ...current,
      recipes: current.recipes.map((item) =>
        item.id === recipe.id ? { ...item, status: "pending" } : item,
      ),
    }));
    toast.info(`Đã gửi duyệt công thức ${recipe.code}.`);
  }

  function approve(recipe: RecipeVersion) {
    if (recipe.status !== "pending" || !recipe.ingredients.length) return;
    const approverName = recipe.approver.trim() || "Quản lý sản phẩm";
    setData((current) => {
      const recipes = current.recipes.map((item) =>
        item.id === recipe.id
          ? { ...item, approver: approverName, status: "approved" as const }
          : item,
      );
      const productId = recipe.productId;
      if (!productId) return { ...current, recipes };
      const product = current.products.find((item) => item.id === productId);
      if (!product) return { ...current, recipes };

      const complete = product.variants.every((variant) =>
        recipes.some(
          (item) =>
            item.productId === productId &&
            item.size === variant.size &&
            item.status === "approved" &&
            item.ingredients.length > 0,
        ),
      );
      return {
        ...current,
        recipes,
        products: complete
          ? current.products.map((item) => {
            if (item.id !== productId) return item;
            const nextCogs: Record<string, number | null> = { ...item.cogsBySize };
            for (const variant of item.variants) {
              if (nextCogs[variant.size] == null) {
                nextCogs[variant.size] = variant.size === "L" ? 15600 : 11300;
              }
            }
            return {
              ...item,
              status: item.lockedStoreIds.length
                ? ("branch-locked" as const)
                : ("active" as const),
              cogsBySize: nextCogs,
              note: "Đã phê duyệt công thức chuẩn, mở bán toàn chuỗi.",
            };
          })
          : current.products,
      };
    });
    toast.success(`Đã phê duyệt công thức ${recipe.code}.`);
  }

  const selectedIng = ui.ingredientId !== "ALL" ? getIngredient(data, ui.ingredientId) : null;
  const directMatchCount = rowsWithMatch.filter(
    (r) => r.match.matchType === "direct" || r.match.matchType === "both",
  ).length;
  const viaF1MatchCount = rowsWithMatch.filter(
    (r) => r.match.matchType === "via-f1",
  ).length;
  const isIngredientFiltering =
    ui.ingredientId !== "ALL" ||
    (ui.search.trim() !== "" && rowsWithMatch.some((r) => r.match.matched));

  const chips = [
    ...(ui.ingredientId !== "ALL" && selectedIng
      ? [
        {
          id: "ing",
          label: `NL: ${selectedIng.name}`,
          onRemove: () => setUi((p) => ({ ...p, ingredientId: "ALL" })),
        },
      ]
      : []),
    ...(ui.kind !== "all"
      ? [
        {
          id: "kind",
          label: ui.kind === "drink" ? "Loại: Pha món" : "Loại: Cốt F1",
          onRemove: () => setUi((p) => ({ ...p, kind: "all" })),
        },
      ]
      : []),
    ...(ui.approval !== "all"
      ? [
        {
          id: "app",
          label: `Duyệt: ${STATUS_LABEL[ui.approval as RecipeApproval]}`,
          onRemove: () => setUi((p) => ({ ...p, approval: "all" })),
        },
      ]
      : []),
    ...(ui.sortBy !== "priority-asc"
      ? [
        {
          id: "sort",
          label: `Sắp xếp: ${SORT_OPTIONS.find((s) => s.key === ui.sortBy)?.label ?? ""}`,
          onRemove: () => setUi((p) => ({ ...p, sortBy: "priority-asc" })),
        },
      ]
      : []),
  ];

  // Detail Panel Body (reused on desktop right pane & mobile Drawer)
  const renderDetailBody = (recipe: RecipeVersion, matchResult: (typeof rowsWithMatch)[number]["match"]) => (
    <div className="space-y-3 text-[13px]">
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-[var(--heading-color)]">
              {getRecipeDisplayName(recipe)}
            </h2>
            <StatusPill
              label={STATUS_LABEL[recipe.status]}
              tone={STATUS_TONE[recipe.status]}
            />
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {recipe.code} · Phiên bản <b>v{recipe.version}</b> · Hiệu lực{" "}
            {formatDate(recipe.effectiveDate)} · Size/Mẻ: <b>{recipe.size}</b>
          </p>
        </div>

        {/* Inline quick Priority editor */}
        <div className="flex items-center gap-1 shrink-0" title="Đổi nhanh độ ưu tiên (Priority)">
          {([1, 2, 3] as RecipePriority[]).map((pri) => (
            <button
              key={pri}
              type="button"
              onClick={() => updateRecipePriority(recipe, pri)}
              className={`h-6 w-6 rounded-full text-[11px] font-bold transition-all border ${(recipe.priority ?? 2) === pri
                  ? `${PRIORITY_META[pri].dot} border-transparent shadow-sm scale-105`
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              title={PRIORITY_META[pri].label}
            >
              {pri}
            </button>
          ))}
        </div>
      </div>

      <SegmentedControl
        ariaLabel="Tab chi tiết công thức"
        value={detailTab}
        onChange={(next) => setDetailTab(next)}
        options={[
          { value: "ingredients", label: "Nguyên liệu", badge: recipe.ingredients.length },
          { value: "steps", label: "Quy trình / Ghi chú" },
          {
            value: "history",
            label: "Lịch sử thay thế",
            badge: recipe.replacementHistory?.length ?? 0,
          },
        ]}
      />

      {detailTab === "ingredients" && (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--background)] text-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Nguyên liệu</th>
                <th className="px-2 py-2 font-semibold">Cấp</th>
                <th className="px-3 py-2 font-semibold text-right">Định lượng</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((line) => {
                const ing = getIngredient(data, line.ingredientId);
                const isHit = matchResult.matchedIngredientIds.includes(line.ingredientId);
                const isF1 = ing?.tier === "F1" && (ing.parentF0Items?.length ?? 0) > 0;
                const isExpanded = Boolean(expandedF1Ids[line.ingredientId]);

                return (
                  <FragmentLineRow
                    key={line.id}
                    ing={ing}
                    line={line}
                    isHit={isHit}
                    isF1={isF1}
                    isExpanded={isExpanded}
                    onToggleExpand={() =>
                      setExpandedF1Ids((prev) => ({
                        ...prev,
                        [line.ingredientId]: !prev[line.ingredientId],
                      }))
                    }
                    allIngredients={data.ingredients}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailTab === "steps" && (
        <div className="space-y-2 text-xs">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="font-semibold mb-1">Luồng phân cấp &amp; Lý do phiên bản</div>
            <p className="text-[var(--muted)]">
              Luồng nguyên liệu: <b>{recipe.hierarchyPath ?? "F0 -> F1 -> Món"}</b>
            </p>
            <p className="text-[var(--muted)] mt-1">
              Lý do cập nhật: {recipe.changeReason || "—"}
            </p>
            <p className="text-[var(--muted)] mt-1">
              Người duyệt: <b>{recipe.approver || "Chưa duyệt"}</b> · COGS ước tính:{" "}
              <b>{formatCurrency(currentCost(recipe))}</b>
            </p>
          </div>
        </div>
      )}

      {detailTab === "history" && (
        <div className="space-y-2 text-xs">
          {!recipe.replacementHistory?.length ? (
            <EmptyState title="Chưa có lịch sử thay thế nguyên liệu trên công thức này." />
          ) : (
            recipe.replacementHistory.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-[var(--border)] p-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {getIngredient(data, h.fromIngredientId)?.name ?? h.fromIngredientId}{" "}
                    → {getIngredient(data, h.toIngredientId)?.name ?? h.toIngredientId}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {formatDate(h.date)}
                  </span>
                </div>
                <p className="text-[var(--muted)]">{h.note}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Action buttons for selected recipe */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => openReplaceDrawer(recipe.ingredients[0]?.ingredientId)}
          className="btn btn-secondary btn-sm"
        >
          Thay nguyên liệu trong món này
        </button>
        <div className="flex items-center gap-2">
          {recipe.status === "draft" && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openEdit(recipe)}
              >
                Sửa nháp
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => sendForApproval(recipe)}
              >
                Gửi duyệt
              </button>
            </>
          )}
          {recipe.status === "pending" && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => approve(recipe)}
            >
              Duyệt công thức
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Sản xuất</span>
            <span className="sep">/</span>
            <span className="current">Công thức</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title">Công thức pha chế &amp; bán thành phẩm</h1>
            <InfoTip
              title="Nguyên tắc phiên bản & Thay thế nguyên liệu"
              summary="Mỗi món giữ bản ghi công thức độc lập. Thay nguyên liệu A trong món X không ảnh hưởng Y, Z — trừ khi A nằm trong Cốt F1 dùng chung (hệ thống sẽ cảnh báo và cho phép tách nhánh F1)."
            />
          </div>
          <p className="page-subtitle">
            Quản lý định mức P1/P2/P3, tra cứu ngược nguyên liệu 2 tầng F0/F1 và thay thế an toàn từng công thức.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openReplaceDrawer()}
          >
            Thay thế nguyên liệu
          </button>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            + Công thức
          </button>
        </div>
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "total",
            label: "Tổng công thức",
            value: String(data.recipes.length),
            subLabel: `${data.recipes.filter((r) => r.kind === "prep").length} cốt F1 · ${data.recipes.filter((r) => r.kind === "drink").length} món`,
            icon: "clipboard",
            tone: "primary",
            active: ui.approval === "all" && ui.kind === "all",
            onClick: () =>
              setUi((p) => ({ ...p, approval: "all", kind: "all" })),
          },
          {
            key: "approved",
            label: "Đã duyệt áp dụng",
            value: String(data.recipes.filter((r) => r.status === "approved").length),
            subLabel: `${data.recipes.filter((r) => (r.priority ?? 2) === 1).length} ưu tiên P1 chủ lực`,
            icon: "document-check",
            tone: "success",
            valueTone: "success",
            active: ui.approval === "approved",
            onClick: () =>
              setUi((p) => ({
                ...p,
                approval: p.approval === "approved" ? "all" : "approved",
              })),
          },
          {
            key: "pending",
            label: "Chờ phê duyệt",
            value: String(data.recipes.filter((r) => r.status === "pending").length),
            subLabel: "Cần duyệt trước khi áp dụng",
            icon: "clock",
            tone: "warning",
            valueTone: "warning",
            active: ui.approval === "pending",
            onClick: () =>
              setUi((p) => ({
                ...p,
                approval: p.approval === "pending" ? "all" : "pending",
              })),
          },
          {
            key: "prep",
            label: "Công thức cốt F1",
            value: String(data.recipes.filter((r) => r.kind === "prep").length),
            subLabel: `COGS đang lọc: ${formatCurrency(
              rowsWithMatch
                .filter((r) => r.recipe.status === "approved")
                .reduce((sum, r) => sum + currentCost(r.recipe), 0),
            )}`,
            icon: "factory",
            tone: "info",
            active: ui.kind === "prep",
            onClick: () =>
              setUi((p) => ({ ...p, kind: p.kind === "prep" ? "all" : "prep" })),
          },
        ]}
      />

      {/* Sticky FilterBar */}
      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm tên món, mã công thức hoặc nguyên liệu (vd: trà xanh)..."
        suggestions={suggestions}
        chips={chips}
        onClearAll={() =>
          setUi({
            search: "",
            approval: "all",
            kind: "all",
            ingredientId: "ALL",
            sortBy: "priority-asc",
          })
        }
        filters={
          <>
            <select
              aria-label="Lọc nguyên liệu trong công thức"
              value={ui.ingredientId}
              onChange={(e) => setUi((p) => ({ ...p, ingredientId: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)] max-w-[205px]"
            >
              <option value="ALL">Lọc theo NL: Tất cả nguyên liệu</option>
              {data.ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.code} · {ing.name} ({ing.tier ?? "F0"})
                </option>
              ))}
            </select>

            <SegmentedControl
              ariaLabel="Loại công thức"
              value={ui.kind}
              onChange={(next) => setUi((p) => ({ ...p, kind: next }))}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "drink", label: "Pha món" },
                { value: "prep", label: "Cốt F1" },
              ]}
            />

            <select
              aria-label="Lọc trạng thái duyệt"
              value={ui.approval}
              onChange={(e) => setUi((p) => ({ ...p, approval: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
            >
              <option value="all">Mọi trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </>
        }
        sortMenu={
          <SortMenu
            options={SORT_OPTIONS}
            value={ui.sortBy}
            onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
          />
        }
      />

      {/* Result Banner when filtering/searching by ingredient */}
      {isIngredientFiltering && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/30 px-3.5 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-emerald-800 dark:text-emerald-200">
              Tìm thấy {rowsWithMatch.length} công thức chứa{" "}
              {selectedIng ? `"${selectedIng.name}"` : `"${ui.search.trim()}"`}:
            </span>
            <span className="text-[var(--muted)]">
              ({directMatchCount} trực tiếp · {viaF1MatchCount} qua Cốt F1)
            </span>
          </div>
          <button
            type="button"
            onClick={() => openReplaceDrawer(selectedIng?.id)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Thay thế nhanh nguyên liệu này →
          </button>
        </div>
      )}

      {/* Master-Detail Split Layout (7/12 Left Table + 5/12 Right Detail Panel) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start">
        <section className="xl:col-span-7 card p-0 overflow-hidden border border-[var(--border)]">
          {rowsWithMatch.length === 0 ? (
            <EmptyState
              title="Không có công thức phù hợp với tiêu chí lọc."
              actionLabel="Xóa bộ lọc"
              onAction={() =>
                setUi({
                  search: "",
                  approval: "all",
                  kind: "all",
                  ingredientId: "ALL",
                  sortBy: "priority-asc",
                })
              }
            />
          ) : (
            <DataTable>
              <table className="w-full text-[13px] text-left">
                <thead className="bg-[var(--background)] text-[var(--muted)] text-xs border-b border-[var(--border)]">
                  <tr>
                    <SortableTh
                      label="Pri"
                      fieldHint="recipe.priority"
                      ascKey="priority-asc"
                      descKey="priority-desc"
                      currentSort={ui.sortBy}
                      onSort={(k) => setUi((p) => ({ ...p, sortBy: k as RecipeSortKey }))}
                    />
                    <SortableTh
                      label="Món / Công thức"
                      fieldHint="product.name"
                      ascKey="name-asc"
                      descKey="name-desc"
                      currentSort={ui.sortBy}
                      onSort={(k) => setUi((p) => ({ ...p, sortBy: k as RecipeSortKey }))}
                    />
                    <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">
                      Phiên bản
                    </th>
                    <SortableTh
                      label="Hiệu lực"
                      fieldHint="recipe.effectiveDate"
                      ascKey="oldest"
                      descKey="newest"
                      currentSort={ui.sortBy}
                      onSort={(k) => setUi((p) => ({ ...p, sortBy: k as RecipeSortKey }))}
                    />
                    <th className="px-2.5 py-2.5 font-semibold text-right whitespace-nowrap">
                      #NL
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsWithMatch.map(({ recipe, displayName, match }) => {
                    const isSelected = activeRecipe?.id === recipe.id;
                    const pri = (recipe.priority ?? 2) as RecipePriority;
                    return (
                      <tr
                        key={recipe.id}
                        onClick={() => {
                          setSelectedId(recipe.id);
                          setMobileDetailOpen(true);
                        }}
                        className={`border-t border-[var(--border)] cursor-pointer transition-colors ${isSelected
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-[3px] border-l-emerald-500"
                            : "hover:bg-[var(--background)]"
                          }`}
                      >
                        <td className="px-3 py-2">
                          <span
                            title={PRIORITY_META[pri].label}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${PRIORITY_META[pri].dot}`}
                          >
                            {pri}
                          </span>
                        </td>
                        <td className="px-2.5 py-2">
                          <div className="font-semibold text-[var(--heading-color)] flex items-center gap-1.5 flex-wrap">
                            <HighlightText text={displayName} query={ui.search} />
                            {match.matched && (
                              <StatusPill
                                label={
                                  match.matchType === "via-f1" ? "Qua F1" : "Khớp NL"
                                }
                                tone={match.matchType === "via-f1" ? "info" : "success"}
                              />
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--muted)]">
                            <HighlightText text={recipe.code} query={ui.search} /> · Size{" "}
                            {recipe.size}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 font-mono text-xs tabular-nums">
                          v{recipe.version}
                        </td>
                        <td className="px-2.5 py-2 text-xs tabular-nums text-[var(--muted)] whitespace-nowrap">
                          {formatDate(recipe.effectiveDate)}
                        </td>
                        <td className="px-2.5 py-2 text-right font-semibold tabular-nums">
                          {recipe.ingredients.length}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <StatusPill
                            label={STATUS_LABEL[recipe.status]}
                            tone={STATUS_TONE[recipe.status]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTable>
          )}
        </section>

        {/* Desktop sticky right detail panel */}
        <aside className="hidden xl:block xl:col-span-5 card p-4 border border-[var(--border)] sticky top-4">
          {activeRecipe && activeEntry ? (
            renderDetailBody(activeRecipe, activeEntry.match)
          ) : (
            <EmptyState title="Chọn một công thức bên trái để xem định lượng chi tiết." />
          )}
        </aside>
      </div>

      {/* Mobile Drawer Detail View (<1280px) */}
      <div className="xl:hidden">
        <SideDrawer
          isOpen={mobileDetailOpen && activeRecipe !== null}
          onClose={() => setMobileDetailOpen(false)}
          title={activeRecipe ? getRecipeDisplayName(activeRecipe) : ""}
          widthClass="max-w-[480px]"
        >
          {activeRecipe && activeEntry && renderDetailBody(activeRecipe, activeEntry.match)}
        </SideDrawer>
      </div>

      {/* Quick Replace Ingredient 3-Step Drawer */}
      <SideDrawer
        isOpen={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title="Thay thế nhanh nguyên liệu & Phân tích tác động"
        subtitle="Kiểm tra ảnh hưởng giữa các món X, Y, Z trước khi áp dụng"
        widthClass="max-w-[540px]"
        footer={
          <>
            {replaceStep > 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReplaceStep((s) => (s === 3 ? 2 : 1))}
              >
                ← Quay lại
              </button>
            )}
            {replaceStep < 3 ? (
              <button
                type="button"
                disabled={selectedRecipeIds.length === 0 || fromIngId === toIngId}
                className="btn btn-primary btn-sm disabled:opacity-50"
                onClick={() => setReplaceStep((s) => (s === 1 ? 2 : 3))}
              >
                Tiếp theo ({selectedRecipeIds.length} món) →
              </button>
            ) : (
              <button
                type="button"
                disabled={selectedRecipeIds.length === 0}
                className="btn btn-primary btn-sm disabled:opacity-50"
                onClick={applyQuickReplace}
              >
                Áp dụng thay thế ({selectedRecipeIds.length} món)
              </button>
            )}
          </>
        }
      >
        {/* Horizontal Stepper */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 text-xs">
          {[
            { num: 1 as const, label: "1. Chọn NL & món" },
            { num: 2 as const, label: "2. Xem ảnh hưởng" },
            { num: 3 as const, label: "3. Xử lý mẻ cũ" },
          ].map((step) => (
            <button
              key={step.num}
              type="button"
              onClick={() => setReplaceStep(step.num)}
              className={`flex-1 rounded-lg px-2 py-1.5 font-semibold transition-colors ${replaceStep === step.num
                  ? "bg-[var(--surface)] text-emerald-700 dark:text-emerald-300 shadow-sm border border-[var(--border)]"
                  : "text-[var(--muted)]"
                }`}
            >
              {step.label}
            </button>
          ))}
        </div>

        {replaceStep === 1 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label" htmlFor="rep-from">
                  Nguyên liệu cần thay (A)
                </label>
                <select
                  id="rep-from"
                  className="form-input form-select text-xs"
                  value={fromIngId}
                  onChange={(e) => {
                    const nextFrom = e.target.value;
                    setFromIngId(nextFrom);
                    const matches = data.recipes.filter(
                      (r) => matchIngredientInRecipe(data, r, { ingredientId: nextFrom }).matched,
                    );
                    setSelectedRecipeIds(matches[0] ? [matches[0].id] : []);
                  }}
                >
                  {data.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.code} · {ing.name} ({ing.tier ?? "F0"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="rep-to">
                  Nguyên liệu thay thế (B)
                </label>
                <select
                  id="rep-to"
                  className="form-input form-select text-xs"
                  value={toIngId}
                  onChange={(e) => setToIngId(e.target.value)}
                >
                  {data.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.code} · {ing.name} ({ing.tier ?? "F0"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="rep-qty">
                Định lượng mới (tùy chọn — bỏ trống để giữ định lượng hiện tại)
              </label>
              <input
                id="rep-qty"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={`Để trống = giữ nguyên (${getIngredient(data, toIngId)?.baseUnit ?? ""})`}
                className="form-input text-xs"
                value={customNewQty}
                onChange={(e) => setCustomNewQty(e.target.value)}
              />
            </div>

            {fromIngId === toIngId && (
              <p className="text-rose-600 font-medium">
                Nguyên liệu thay thế phải khác nguyên liệu gốc.
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold">
                  Các món đang chứa nguyên liệu A ({replaceCandidates.length} món)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-emerald-700 dark:text-emerald-300 hover:underline font-medium"
                    onClick={() =>
                      setSelectedRecipeIds(
                        replaceCandidates[0] ? [replaceCandidates[0].recipe.id] : [],
                      )
                    }
                  >
                    Chỉ 1 món
                  </button>
                  <button
                    type="button"
                    className="text-emerald-700 dark:text-emerald-300 hover:underline font-medium"
                    onClick={() =>
                      setSelectedRecipeIds(replaceCandidates.map((c) => c.recipe.id))
                    }
                  >
                    Chọn tất cả
                  </button>
                </div>
              </div>

              {replaceCandidates.length === 0 ? (
                <EmptyState title="Không có công thức nào đang dùng nguyên liệu này." />
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {replaceCandidates.map(({ recipe, displayName, directLine, isViaF1 }) => {
                    const checked = selectedRecipeIds.includes(recipe.id);
                    return (
                      <label
                        key={recipe.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${checked
                            ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
                            : "border-[var(--border)]"
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedRecipeIds((prev) =>
                                e.target.checked
                                  ? [...prev, recipe.id]
                                  : prev.filter((id) => id !== recipe.id),
                              )
                            }
                            className="accent-emerald-600"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{displayName}</div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {recipe.code} · v{recipe.version} · Size {recipe.size}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[var(--muted)] shrink-0">
                          {directLine
                            ? `${directLine.quantity} ${directLine.unit}`
                            : isViaF1
                              ? "Qua cốt F1"
                              : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {replaceStep === 2 && (
          <div className="space-y-3 text-xs">
            {sharedF1Notice && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/40 p-3 space-y-1">
                <div className="font-semibold text-amber-800 dark:text-amber-200">
                  Lưu ý cốt bán thành phẩm dùng chung ({sharedF1Notice})
                </div>
                <p className="text-amber-700 dark:text-amber-300">
                  Khi đổi ở cấp món (chỉ tích chọn món cần sửa), hệ thống tách định mức trực tiếp
                  trên các món được chọn để các món khác vẫn giữ nguyên công thức gốc.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--background)] text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Món / Công thức</th>
                    <th className="px-3 py-2 font-semibold">Thay đổi</th>
                    <th className="px-3 py-2 font-semibold">Ảnh hưởng</th>
                  </tr>
                </thead>
                <tbody>
                  {replaceCandidates.map(({ recipe, displayName }) => {
                    const willChange = selectedRecipeIds.includes(recipe.id);
                    return (
                      <tr key={recipe.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-medium">{displayName}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">
                          {willChange
                            ? `v${recipe.version} → v${bumpVersion(recipe.version)}`
                            : `v${recipe.version} (giữ nguyên)`}
                        </td>
                        <td className="px-3 py-2">
                          {willChange ? (
                            <StatusPill label="Sẽ cập nhật" tone="success" />
                          ) : (
                            <StatusPill label="Không ảnh hưởng" tone="neutral" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {replaceStep === 3 && (
          <div className="space-y-3 text-xs">
            <div className="font-semibold">
              Xử lý các mẻ / món đã chuẩn bị sẵn theo công thức cũ:
            </div>

            <label
              className={`block rounded-xl border p-3.5 cursor-pointer transition-all ${disposition === "sell-through"
                  ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-[var(--border)]"
                }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="disposition"
                  checked={disposition === "sell-through"}
                  onChange={() => setDisposition("sell-through")}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <div className="font-semibold text-[var(--heading-color)]">
                    Bán hết lô còn hạn (Đề xuất)
                  </div>
                  <p className="text-[var(--muted)] mt-1">
                    Không hủy bỏ. Các ly/mẻ đã pha bằng nguyên liệu cũ còn hạn vẫn tiếp tục bán hết; công thức mới áp dụng cho mẻ kế tiếp.
                  </p>
                </div>
              </div>
            </label>

            <label
              className={`block rounded-xl border p-3.5 cursor-pointer transition-all ${disposition === "discard-remake"
                  ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20"
                  : "border-[var(--border)]"
                }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="disposition"
                  checked={disposition === "discard-remake"}
                  onChange={() => setDisposition("discard-remake")}
                  className="mt-0.5 accent-rose-600"
                />
                <div>
                  <div className="font-semibold text-[var(--heading-color)]">
                    Hủy lô cũ &amp; Tạo lệnh làm lại ngay (Discard &amp; Remake)
                  </div>
                  <p className="text-[var(--muted)] mt-1">
                    Áp dụng khi nguyên liệu A bị lỗi chất lượng: giữ cách ly các mẻ cũ liên quan và tự động tạo lệnh sản xuất làm lại theo công thức mới.
                  </p>
                </div>
              </div>
            </label>
          </div>
        )}
      </SideDrawer>

      {/* Create / Edit Draft Recipe Drawer */}
      <SideDrawer
        isOpen={formDrawerOpen}
        onClose={() => setFormDrawerOpen(false)}
        title={editing ? "Chỉnh sửa công thức nháp" : "Tạo công thức mới"}
        widthClass="max-w-[540px]"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFormDrawerOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="recipe-draft-form"
              className="btn btn-primary btn-sm"
            >
              Lưu bản nháp
            </button>
          </>
        }
      >
        <form id="recipe-draft-form" className="space-y-3 text-xs" onSubmit={saveDraft}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="rec-kind">
                Loại công thức
              </label>
              <select
                id="rec-kind"
                className="form-input form-select text-xs"
                value={form.kind}
                disabled={Boolean(editing)}
                onChange={(e) => {
                  const nextKind = e.target.value as RecipeKind;
                  const prepOut = getIngredient(data, form.outputIngredientId);
                  setForm((p) => ({
                    ...p,
                    kind: nextKind,
                    yieldUnit:
                      nextKind === "prep" ? (prepOut?.baseUnit ?? p.yieldUnit) : "ly",
                  }));
                }}
              >
                <option value="drink">Pha món theo size</option>
                <option value="prep">Nấu cốt bán thành phẩm (F1)</option>
              </select>
            </div>

            {form.kind === "drink" ? (
              <div>
                <label className="form-label" htmlFor="rec-prod">
                  Sản phẩm *
                </label>
                <select
                  id="rec-prod"
                  className="form-input form-select text-xs"
                  value={form.productId}
                  onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}
                >
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="form-label" htmlFor="rec-out">
                  Cốt bán thành phẩm F1 *
                </label>
                <select
                  id="rec-out"
                  className="form-input form-select text-xs"
                  value={form.outputIngredientId}
                  onChange={(e) => {
                    const out = getIngredient(data, e.target.value);
                    setForm((p) => ({
                      ...p,
                      outputIngredientId: e.target.value,
                      yieldUnit: out?.baseUnit ?? p.yieldUnit,
                    }));
                  }}
                >
                  {data.ingredients
                    .filter((i) => i.group === "prepared")
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="form-label" htmlFor="rec-pri">
                Độ ưu tiên (Priority)
              </label>
              <select
                id="rec-pri"
                className="form-input form-select text-xs"
                value={form.priority}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    priority: Number(e.target.value) as RecipePriority,
                  }))
                }
              >
                <option value={1}>P1 · Cao (Chủ lực)</option>
                <option value={2}>P2 · Trung bình</option>
                <option value={3}>P3 · Thấp</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="rec-ver">
                Phiên bản *
              </label>
              <input
                id="rec-ver"
                className="form-input text-xs"
                value={form.version}
                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="rec-date">
                Ngày hiệu lực *
              </label>
              <input
                id="rec-date"
                type="date"
                className="form-input text-xs"
                value={form.effectiveDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, effectiveDate: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="rec-reason">
              Lý do thay đổi *
            </label>
            <input
              id="rec-reason"
              className="form-input text-xs"
              value={form.changeReason}
              onChange={(e) => setForm((p) => ({ ...p, changeReason: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Định mức nguyên liệu</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setLines((cur) => [...cur, EMPTY_LINE()])}
              >
                + Thêm dòng
              </button>
            </div>
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-12 gap-1.5 items-center rounded-lg border border-[var(--border)] p-1.5"
              >
                <select
                  aria-label="Nguyên liệu"
                  className="col-span-6 form-input form-select text-xs h-8"
                  value={line.ingredientId}
                  onChange={(e) =>
                    setLines((cur) =>
                      cur.map((l) =>
                        l.id === line.id ? { ...l, ingredientId: e.target.value } : l,
                      ),
                    )
                  }
                >
                  {data.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.tier ?? "F0"})
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Định lượng"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="col-span-3 form-input text-xs h-8"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((cur) =>
                      cur.map((l) =>
                        l.id === line.id ? { ...l, quantity: e.target.value } : l,
                      ),
                    )
                  }
                />
                <span className="col-span-2 text-center text-[11px] text-[var(--muted)]">
                  {getIngredient(data, line.ingredientId)?.baseUnit ?? ""}
                </span>
                <button
                  type="button"
                  disabled={lines.length <= 1}
                  onClick={() =>
                    setLines((cur) => cur.filter((l) => l.id !== line.id))
                  }
                  className="col-span-1 text-rose-500 font-bold disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </form>
      </SideDrawer>

      <UndoBanner
        message={undoSnapshot?.label ?? null}
        onUndo={() => {
          if (!undoSnapshot) return;
          setData((cur) => ({
            ...cur,
            recipes: undoSnapshot.recipes,
            batches: undoSnapshot.batches,
          }));
          setUndoSnapshot(null);
          toast.info("Đã hoàn tác thay thế nguyên liệu.");
        }}
        onDismiss={() => setUndoSnapshot(null)}
      />
    </div>
  );
}

function FragmentLineRow({
  ing,
  line,
  isHit,
  isF1,
  isExpanded,
  onToggleExpand,
  allIngredients,
}: {
  ing: ReturnType<typeof getIngredient>;
  line: RecipeIngredient;
  isHit: boolean;
  isF1: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  allIngredients: ReturnType<typeof useDemoState>[0]["ingredients"];
}) {
  return (
    <>
      <tr
        className={`border-t border-[var(--border)] ${isHit ? "bg-emerald-50/80 dark:bg-emerald-950/40" : ""
          }`}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isF1 && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="text-[11px] font-mono text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Mở thành phần F0"
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            )}
            <span className="font-medium text-[var(--heading-color)]">
              {ing?.name ?? line.ingredientId}
            </span>
            {isHit && <StatusPill label="Đang lọc" tone="success" />}
          </div>
          {line.note && (
            <div className="text-[11px] text-[var(--muted)]">{line.note}</div>
          )}
        </td>
        <td className="px-2 py-2">
          <StatusPill
            label={ing?.tier ?? "F0"}
            tone={ing?.tier === "F1" ? "info" : "neutral"}
          />
        </td>
        <td className="px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap">
          {line.quantity} {line.unit}
        </td>
      </tr>
      {isF1 &&
        isExpanded &&
        ing?.parentF0Items?.map((f0) => {
          const f0Ing = allIngredients.find((i) => i.id === f0.ingredientId);
          return (
            <tr
              key={`${line.id}-${f0.ingredientId}`}
              className="border-t border-[var(--border)] bg-[var(--background)]/70"
            >
              <td className="pl-7 pr-3 py-1.5 text-[11px] text-[var(--muted)]">
                ↳ Thành phần F0: <b className="text-[var(--text)]">{f0Ing?.name ?? f0.ingredientId}</b>
              </td>
              <td className="px-2 py-1.5">
                <StatusPill label="F0" tone="neutral" />
              </td>
              <td className="px-3 py-1.5 text-right text-[11px] text-[var(--muted)] tabular-nums">
                {f0.quantityPerBatch} {f0.unit} / mẻ {f0.batchYield.toLocaleString("vi-VN")} {ing.baseUnit}
              </td>
            </tr>
          );
        })}
    </>
  );
}
