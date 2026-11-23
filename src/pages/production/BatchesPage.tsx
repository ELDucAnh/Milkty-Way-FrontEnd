import { useMemo, useState, type FormEvent } from "react";
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
  SegmentedControl,
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
  homePath,
  isCashier,
  isWarehouse,
  scopedBranch,
  sessionUser,
} from "../../utils/auth";
import {
  availableLotQuantity,
  getIngredient,
  getStore,
  usableLotQuantity,
  type AllocationTicket,
  type BatchDistributionRecord,
  type BatchStatus,
  type DistributionHistoryItem,
  type IngredientLot,
  type ProductionBatch,
  type Shift,
} from "../shared/business-demo";
import {
  formatDate,
  formatNumber,
  getTodayISO,
  makeId,
  sumBy,
} from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";

type BatchSortKey = "date-desc" | "date-asc" | "code-asc" | "qty-desc";
type TraceDirection = "forward" | "reverse";

const BATCH_SORT_OPTIONS: SortOption<BatchSortKey>[] = [
  { key: "date-desc", label: "Mới nhất", fieldLabel: "Thời gian tạo mẻ" },
  { key: "date-asc", label: "Cũ nhất", fieldLabel: "Thời gian tạo mẻ" },
  { key: "code-asc", label: "Mã mẻ A → Z", fieldLabel: "Mã mẻ" },
  { key: "qty-desc", label: "Sản lượng cao → thấp", fieldLabel: "Sản lượng" },
];

const STATUS_LABEL: Record<BatchStatus, string> = {
  planned: "Kế hoạch",
  processing: "Đang chế biến",
  completed: "Đã hoàn thành",
  held: "Tạm giữ QC",
};

const STATUS_TONE: Record<BatchStatus, PillTone> = {
  planned: "info",
  processing: "warning",
  completed: "success",
  held: "danger",
};

const BRANCH_COLORS: Record<string, string> = {
  CN01: "#2563eb",
  CN05: "#059669",
  CN08: "#7c3aed",
  CN02: "#0284c7",
  CN03: "#d97706",
};

function colorForBranch(storeId: string, index: number): string {
  if (BRANCH_COLORS[storeId]) return BRANCH_COLORS[storeId];
  const palette = ["#0ea5e9", "#10b981", "#8b5cf6", "#6366f1", "#14b8a6"];
  return palette[index % palette.length];
}

export default function BatchesPage() {
  const toast = useToast();
  const [data, setData] = useDemoState();
  const branchScope = scopedBranch();
  const currentUser = sessionUser();
  const canProduce = can("batch.manage");
  const canDistribute = !isCashier() && (!branchScope || isWarehouse());

  const [ui, setUi] = usePageUiState<{
    branch: string;
    search: string;
    status: "all" | BatchStatus;
    sortBy: BatchSortKey;
    density: "normal" | "compact";
  }>("mw_ui_batches_v1", {
    branch: branchScope ?? "ALL",
    search: "",
    status: "all",
    sortBy: "date-desc",
    density: "normal",
  });

  const activeBranch = branchScope ?? ui.branch;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Drawers state
  const [createOpen, setCreateOpen] = useState(false);
  const [completeBatch, setCompleteBatch] = useState<ProductionBatch | null>(null);
  const [distributeBatch, setDistributeBatch] = useState<ProductionBatch | null>(null);
  const [traceBatch, setTraceBatch] = useState<ProductionBatch | null>(null);
  const [traceDirection, setTraceDirection] = useState<TraceDirection>("forward");
  const [traceSelectedStore, setTraceSelectedStore] = useState<string>("ALL");

  // Create form state
  const prepRecipes = useMemo(
    () =>
      data.recipes.filter((r) => r.kind === "prep" && r.status === "approved"),
    [data.recipes],
  );
  const [createForm, setCreateForm] = useState(() => ({
    recipeId: prepRecipes[0]?.id ?? "",
    shift: "Ca sáng" as Shift,
    plannedQuantity: String(prepRecipes[0]?.yieldQuantity ?? 10000),
    operator: currentUser.name,
  }));

  // Complete form state
  const [completeForm, setCompleteForm] = useState({
    actual: "",
    waste: "0",
    expiry: getTodayISO(),
    quality: "pass" as "pass" | "fail",
    approver: currentUser.name,
  });

  // Distribution form state: map storeId -> quantity string
  const [distMap, setDistMap] = useState<Record<string, string>>({});
  const [distImmediateReceive, setDistImmediateReceive] = useState(true);

  const today = getTodayISO();

  // Compute remaining stock at kitchen & distributed totals per batch
  const batchMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalOutput: number;
        distributedTotal: number;
        remainingKitchen: number;
        distributions: BatchDistributionRecord[];
        outputIngredientName: string;
        outputIngredientCode: string;
        recipeCode: string;
        inputLabels: string[];
        searchBlob: string;
      }
    >();

    for (const batch of data.batches) {
      const recipe = data.recipes.find((r) => r.id === batch.recipeId);
      const outputIng = recipe?.outputIngredientId
        ? getIngredient(data, recipe.outputIngredientId)
        : undefined;

      const storedDists = batch.distributions ?? [];
      const allocsForBatch = data.allocations.filter((a) =>
        a.lines.some((l) => l.batchId === batch.id),
      );

      // Merge stored distributions + allocation records not yet reflected
      const distByStore = new Map<string, BatchDistributionRecord>();
      for (const d of storedDists) {
        distByStore.set(d.storeId, { ...d });
      }
      for (const alloc of allocsForBatch) {
        if (distByStore.has(alloc.storeId)) continue;
        const line = alloc.lines.find((l) => l.batchId === batch.id);
        if (!line) continue;
        const counterLots = data.lots.filter(
          (l) =>
            l.location === "counter" &&
            l.locationId === alloc.storeId &&
            l.batchId === batch.id,
        );
        const remainingCounter = sumBy(counterLots, (l) => Math.max(0, l.quantity));
        distByStore.set(alloc.storeId, {
          id: `merged-${alloc.id}`,
          storeId: alloc.storeId,
          allocatedQuantity: line.sentQuantity || line.proposedQuantity,
          receivedQuantity: line.receivedQuantity ?? 0,
          remainingCounterQuantity: remainingCounter,
          unit: line.unit,
          transferCode: alloc.code,
          distributedAt: alloc.sentAt ?? alloc.date,
          status:
            alloc.status === "received"
              ? "Đã nhập quầy"
              : alloc.status === "in-transit"
                ? "Đang vận chuyển"
                : "Đã xuất kho",
        });
      }

      const distributions = Array.from(distByStore.values()).map((d) => {
        const liveCounterLots = data.lots.filter(
          (l) =>
            l.location === "counter" &&
            l.locationId === d.storeId &&
            l.batchId === batch.id,
        );
        const liveQty = sumBy(liveCounterLots, (l) => Math.max(0, l.quantity));
        return {
          ...d,
          remainingCounterQuantity:
            liveCounterLots.length > 0 ? liveQty : d.remainingCounterQuantity,
        };
      });

      const kitchenLots = data.lots.filter(
        (l) => l.location === "kitchen" && l.batchId === batch.id && l.quantity > 0,
      );
      const totalOutput = batch.actualQuantity ?? batch.plannedQuantity;
      const distributedTotal = sumBy(distributions, (d) => d.allocatedQuantity);
      const kitchenLotQty = sumBy(kitchenLots, (l) => l.quantity);
      const remainingKitchen =
        batch.status === "completed" && batch.quality === "pass"
          ? kitchenLots.length > 0
            ? kitchenLotQty
            : Math.max(0, totalOutput - distributedTotal)
          : 0;

      const inputLabels = batch.inputs.map((inp) => {
        const ing = getIngredient(data, inp.ingredientId);
        const lot = data.lots.find((l) => l.id === inp.lotId);
        return `${ing?.name ?? inp.ingredientId} (${lot?.lotCode ?? inp.lotId})`;
      });

      const searchBlob = normalizeVi(
        [
          batch.code,
          batch.shift,
          batch.operator,
          recipe?.code ?? "",
          outputIng?.name ?? "",
          outputIng?.code ?? "",
          ...inputLabels,
          ...distributions.map((d) => `${d.storeId} ${d.transferCode}`),
        ].join(" "),
      );

      map.set(batch.id, {
        totalOutput,
        distributedTotal,
        remainingKitchen,
        distributions,
        outputIngredientName: outputIng?.name ?? "Bán thành phẩm F1",
        outputIngredientCode: outputIng?.code ?? "BTP",
        recipeCode: recipe?.code ?? batch.recipeId,
        inputLabels,
        searchBlob,
      });
    }
    return map;
  }, [data]);

  const kpiCounts = useMemo(() => {
    let processing = 0;
    let readyToDistribute = 0;
    let fullyDistributed = 0;
    let held = 0;
    for (const batch of data.batches) {
      const m = batchMetricsMap.get(batch.id);
      if (batch.status === "processing" || batch.status === "planned") processing += 1;
      if (batch.status === "held") held += 1;
      if (batch.status === "completed" && batch.quality === "pass") {
        if ((m?.remainingKitchen ?? 0) > 0) readyToDistribute += 1;
        else fullyDistributed += 1;
      }
    }
    return {
      total: data.batches.length,
      processing,
      readyToDistribute,
      fullyDistributed,
      held,
    };
  }, [data.batches, batchMetricsMap]);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = normalizeVi(ui.search.trim());
    if (!q) return [];
    const items: SearchSuggestion[] = [];
    for (const batch of data.batches) {
      const m = batchMetricsMap.get(batch.id);
      if (
        normalizeVi(`${batch.code} ${m?.outputIngredientName ?? ""}`).includes(q)
      ) {
        items.push({
          id: batch.id,
          group: "Mẻ chế biến F1",
          label: batch.code,
          subLabel: m?.outputIngredientName,
          onSelect: () => setUi((p) => ({ ...p, search: batch.code })),
        });
      }
    }
    return items.slice(0, 8);
  }, [data.batches, batchMetricsMap, ui.search, setUi]);

  const filteredBatches = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    const rows = data.batches.filter((batch) => {
      const m = batchMetricsMap.get(batch.id);
      if (ui.status !== "all" && batch.status !== ui.status) return false;
      if (activeBranch !== "ALL") {
        // Branch managers can view batches already distributed to their branch OR active kitchen prep
        const sentToBranch = m?.distributions.some((d) => d.storeId === activeBranch);
        if (batch.status === "completed" && (m?.distributedTotal ?? 0) > 0 && !sentToBranch) {
          return false;
        }
      }
      if (q && !(m?.searchBlob ?? "").includes(q)) return false;
      return true;
    });

    rows.sort((a, b) => {
      if (ui.sortBy === "date-desc") return b.startedAt.localeCompare(a.startedAt);
      if (ui.sortBy === "date-asc") return a.startedAt.localeCompare(b.startedAt);
      if (ui.sortBy === "code-asc") return a.code.localeCompare(b.code, "vi");
      return (
        (b.actualQuantity ?? b.plannedQuantity) -
        (a.actualQuantity ?? a.plannedQuantity)
      );
    });
    return rows;
  }, [data.batches, batchMetricsMap, ui.status, ui.search, ui.sortBy, activeBranch]);

  // Helper: Open Create Batch Drawer
  function openCreateDrawer() {
    const first = prepRecipes[0];
    setCreateForm({
      recipeId: first?.id ?? "",
      shift: "Ca sáng",
      plannedQuantity: String(first?.yieldQuantity ?? 10000),
      operator: currentUser.name,
    });
    setCreateOpen(true);
  }

  // Calculated inputs preview for Create Batch
  const createPreview = useMemo(() => {
    const recipe = data.recipes.find((r) => r.id === createForm.recipeId);
    const plannedQty = Math.max(1, Number(createForm.plannedQuantity) || 0);
    if (!recipe || recipe.yieldQuantity <= 0) return { recipe: null, inputs: [], hasShortage: false };
    const ratio = plannedQty / recipe.yieldQuantity;
    let hasShortage = false;
    const inputs = recipe.ingredients.map((line) => {
      const needed = Math.round(line.quantity * ratio);
      const ing = getIngredient(data, line.ingredientId);
      const candidateLots = data.lots
        .filter(
          (l) =>
            l.ingredientId === line.ingredientId &&
            (l.location === "central" || l.location === "kitchen") &&
            availableLotQuantity(l, today) > 0,
        )
        .sort((a, b) =>
          (a.expiryDate ?? "9999-12-31").localeCompare(b.expiryDate ?? "9999-12-31"),
        );
      const bestLot = candidateLots[0];
      const avail = bestLot ? availableLotQuantity(bestLot, today) : 0;
      if (!bestLot || avail < needed) hasShortage = true;
      return {
        ingredientId: line.ingredientId,
        ingredientName: ing?.name ?? line.ingredientId,
        needed,
        unit: line.unit,
        lot: bestLot ?? null,
        available: avail,
      };
    });
    return { recipe, inputs, hasShortage };
  }, [createForm.recipeId, createForm.plannedQuantity, data, today]);

  function handleCreateBatch(e: FormEvent) {
    e.preventDefault();
    if (!createPreview.recipe) return;
    if (createPreview.hasShortage) {
      toast.error("Tồn nguyên liệu F0 khả dụng tại Kho Tổng chưa đủ cho mẻ này.");
      return;
    }
    const plannedQty = Math.max(1, Number(createForm.plannedQuantity) || 0);
    const seq = String(data.batches.length + 1).padStart(2, "0");
    const newCode = `ME-${today.slice(2, 4)}${today.slice(5, 7)}${today.slice(8, 10)}-${seq}`;
    const newBatch: ProductionBatch = {
      id: makeId("batch"),
      code: newCode,
      recipeId: createPreview.recipe.id,
      shift: createForm.shift,
      plannedQuantity: plannedQty,
      inputs: createPreview.inputs.map((inp) => ({
        id: makeId("bi"),
        ingredientId: inp.ingredientId,
        lotId: inp.lot?.id ?? "",
        plannedQuantity: inp.needed,
        actualQuantity: null,
        unit: inp.unit,
      })),
      actualQuantity: null,
      wasteQuantity: null,
      unit: createPreview.recipe.yieldUnit,
      startedAt: `${today}T07:00`,
      expiryDate: today,
      quality: "unchecked",
      operator: createForm.operator.trim() || currentUser.name,
      approver: "",
      status: "processing",
      distributions: [],
    };

    // Reserve F0 inputs cleanly on chosen lots
    setData((current) => ({
      ...current,
      lots: current.lots.map((l) => {
        const used = createPreview.inputs.find((inp) => inp.lot?.id === l.id);
        if (!used) return l;
        return {
          ...l,
          reservedQuantity: (l.reservedQuantity ?? 0) + used.needed,
        };
      }),
      batches: [newBatch, ...current.batches],
    }));

    setCreateOpen(false);
    toast.success(`Đã khởi tạo mẻ chế biến ${newCode} (${formatNumber(plannedQty)} ${createPreview.recipe.yieldUnit}).`);
  }

  function handleStartBatch(batch: ProductionBatch) {
    setData((current) => ({
      ...current,
      batches: current.batches.map((b) =>
        b.id === batch.id ? { ...b, status: "processing" } : b,
      ),
    }));
    toast.info(`Mẻ ${batch.code} đã chuyển sang trạng thái Đang chế biến.`);
  }

  function handleToggleHold(batch: ProductionBatch) {
    if (batch.status === "held" && (batch.quality === "fail" || batch.actualQuantity !== null)) {
      toast.error(`Mẻ ${batch.code} đã có kết quả kiểm định / hoàn thành trước đó — không thể mở khóa chạy lại.`);
      return;
    }
    const nextStatus: BatchStatus = batch.status === "held" ? "processing" : "held";
    setData((current) => ({
      ...current,
      batches: current.batches.map((b) =>
        b.id === batch.id ? { ...b, status: nextStatus } : b,
      ),
    }));
    toast.warning(
      nextStatus === "held"
        ? `Đã tạm giữ kiểm định mẻ ${batch.code}.`
        : `Đã mở lại mẻ ${batch.code} để tiếp tục chế biến.`,
    );
  }

  function openCompleteDrawer(batch: ProductionBatch) {
    const recipe = data.recipes.find((r) => r.id === batch.recipeId);
    const outIng = recipe?.outputIngredientId
      ? getIngredient(data, recipe.outputIngredientId)
      : undefined;
    const shelfDays = outIng?.shelfLifeDays ?? 2;
    const baseMs = Date.parse(`${today}T00:00:00Z`);
    const suggestedExp = new Date(baseMs + shelfDays * 86400000)
      .toISOString()
      .slice(0, 10);

    setCompleteForm({
      actual: String(batch.plannedQuantity),
      waste: "0",
      expiry: suggestedExp,
      quality: "pass",
      approver: currentUser.name,
    });
    setCompleteBatch(batch);
  }

  function handleCompleteSubmit(e: FormEvent) {
    e.preventDefault();
    if (!completeBatch) return;
    const actualNum = Number(completeForm.actual);
    const wasteNum = Number(completeForm.waste);
    if (!Number.isFinite(actualNum) || actualNum <= 0) {
      toast.error("Sản lượng thực tế phải lớn hơn 0.");
      return;
    }

    const recipe = data.recipes.find((r) => r.id === completeBatch.recipeId);
    const outputIngId = recipe?.outputIngredientId;

    setData((current) => {
      const nextLots = current.lots.map((lot) => {
        const inputUsed = completeBatch.inputs.find((inp) => inp.lotId === lot.id);
        if (!inputUsed) return lot;
        const deduct = inputUsed.plannedQuantity;
        return {
          ...lot,
          quantity: Math.max(0, lot.quantity - deduct),
          reservedQuantity: Math.max(0, (lot.reservedQuantity ?? 0) - deduct),
        };
      });

      if (completeForm.quality === "pass" && outputIngId) {
        const inputCostTotal = completeBatch.inputs.reduce((sum, inp) => {
          const srcLot = current.lots.find((l) => l.id === inp.lotId);
          return sum + inp.plannedQuantity * (srcLot?.unitCost ?? 0);
        }, 0);
        const computedUnitCost = actualNum > 0 && inputCostTotal > 0
          ? Math.round(inputCostTotal / actualNum)
          : 65;
        const newKitchenLot: IngredientLot = {
          id: makeId("lot-kit"),
          ingredientId: outputIngId,
          lotCode: completeBatch.code,
          manufactureDate: today,
          expiryDate: completeForm.expiry,
          quantity: actualNum,
          unitCost: computedUnitCost || 65,
          quality: "pass",
          location: "kitchen",
          locationId: "kitchen",
          batchId: completeBatch.id,
        };
        nextLots.unshift(newKitchenLot);
      }

      const nextBatches = current.batches.map((b) =>
        b.id === completeBatch.id
          ? {
            ...b,
            actualQuantity: actualNum,
            wasteQuantity: Math.max(0, wasteNum || 0),
            expiryDate: completeForm.expiry,
            quality: completeForm.quality,
            approver: completeForm.approver.trim() || currentUser.name,
            status: (completeForm.quality === "pass" ? "completed" : "held") as BatchStatus,
            inputs: b.inputs.map((inp) => ({
              ...inp,
              actualQuantity: inp.actualQuantity ?? inp.plannedQuantity,
            })),
          }
          : b,
      );

      return { ...current, lots: nextLots, batches: nextBatches };
    });

    toast.success(
      completeForm.quality === "pass"
        ? `Mẻ ${completeBatch.code} đã hoàn thành QC Đạt — sẵn sàng phân phối về chi nhánh.`
        : `Mẻ ${completeBatch.code} không đạt QC — đã chuyển trạng thái Tạm giữ.`,
    );
    setCompleteBatch(null);
  }

  // Distribute drawer helpers
  function openDistributeDrawer(batch: ProductionBatch) {
    const initial: Record<string, string> = {};
    for (const store of data.stores) {
      initial[store.id] = "";
    }
    setDistMap(initial);
    setDistImmediateReceive(true);
    setDistributeBatch(batch);
  }

  const distContext = useMemo(() => {
    if (!distributeBatch) return null;
    const metrics = batchMetricsMap.get(distributeBatch.id);
    const recipe = data.recipes.find((r) => r.id === distributeBatch.recipeId);
    const outputIngId = recipe?.outputIngredientId ?? "";
    const remainingKitchen = metrics?.remainingKitchen ?? 0;

    const totalEntering = Object.values(distMap).reduce(
      (sum, val) => sum + Math.max(0, Number(val) || 0),
      0,
    );

    const priorityStores = ["CN01", "CN05", "CN08", "CN02", "CN03", "CN06"];
    const orderedStores = [...data.stores].sort((a, b) => {
      const idxA = priorityStores.indexOf(a.id);
      const idxB = priorityStores.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    const storeRows = orderedStores.map((store) => {
      const fixed = data.masterFixedPlans.find(
        (m) => m.storeId === store.id && m.ingredientId === outputIngId,
      );
      const activeTemp = data.temporaryOverrides.filter(
        (o) =>
          o.storeId === store.id &&
          o.ingredientId === outputIngId &&
          o.status === "active" &&
          o.startDate <= today &&
          o.endDate >= today,
      );
      const dailyNeed =
        (fixed?.fixedQuantity ?? 0) +
        sumBy(activeTemp, (o) => o.extraQuantity);
      const currentCounter = sumBy(
        data.lots.filter(
          (l) =>
            l.location === "counter" &&
            l.locationId === store.id &&
            l.ingredientId === outputIngId &&
            usableLotQuantity(l, today) > 0,
        ),
        (l) => l.quantity,
      );
      return {
        store,
        dailyNeed,
        currentCounter,
        existingAllocated:
          metrics?.distributions.find((d) => d.storeId === store.id)
            ?.allocatedQuantity ?? 0,
      };
    });

    return {
      metrics,
      outputIngId,
      remainingKitchen,
      totalEntering,
      storeRows,
    };
  }, [distributeBatch, batchMetricsMap, data, distMap, today]);

  function fillDistByDemand() {
    if (!distContext) return;
    let remaining = distContext.remainingKitchen;
    if (remaining <= 0) return;

    const targetRows = distContext.storeRows.slice(0, 4);
    const totalWeights = sumBy(targetRows, (r) =>
      r.dailyNeed > 0 ? r.dailyNeed : 1000,
    );
    const next: Record<string, string> = {};
    for (const row of distContext.storeRows) next[row.store.id] = "";

    targetRows.forEach((row, idx) => {
      if (remaining <= 0) return;
      const weight = row.dailyNeed > 0 ? row.dailyNeed : 1000;
      const share =
        idx === targetRows.length - 1
          ? remaining
          : Math.min(remaining, Math.round((distContext.remainingKitchen * weight) / totalWeights / 100) * 100);
      next[row.store.id] = share > 0 ? String(share) : "";
      remaining = Math.max(0, remaining - share);
    });
    setDistMap(next);
  }

  function handleConfirmDistribute(e: FormEvent) {
    e.preventDefault();
    if (!distributeBatch || !distContext) return;
    const entries = Object.entries(distMap)
      .map(([storeId, raw]) => ({ storeId, qty: Math.round(Number(raw) || 0) }))
      .filter((item) => item.qty > 0);

    if (entries.length === 0) {
      toast.error("Vui lòng nhập số lượng phân phối cho ít nhất 1 chi nhánh.");
      return;
    }
    const total = sumBy(entries, (eItem) => eItem.qty);
    if (total > distContext.remainingKitchen) {
      toast.error(
        `Tổng phân phối (${formatNumber(total)} ${distributeBatch.unit}) vượt quá lượng còn tại bếp (${formatNumber(distContext.remainingKitchen)} ${distributeBatch.unit}).`,
      );
      return;
    }

    const recipe = data.recipes.find((r) => r.id === distributeBatch.recipeId);
    const outputIngId = recipe?.outputIngredientId ?? "";
    const nowTime = "09:30";

    setData((current) => {
      let nextLots = [...current.lots];
      const newAllocs: AllocationTicket[] = [];
      const newHistory: DistributionHistoryItem[] = [];
      const newDistRecords: BatchDistributionRecord[] = [];

      // Deduct from kitchen lots tied to this batch
      let toDeduct = total;
      nextLots = nextLots.map((lot) => {
        if (
          toDeduct > 0 &&
          lot.location === "kitchen" &&
          lot.batchId === distributeBatch.id &&
          lot.quantity > 0
        ) {
          const take = Math.min(lot.quantity, toDeduct);
          toDeduct -= take;
          return { ...lot, quantity: lot.quantity - take };
        }
        return lot;
      });

      const kitchenSample = current.lots.find(
        (l) => l.location === "kitchen" && l.batchId === distributeBatch.id,
      );

      entries.forEach((entry, idx) => {
        const pxkCode = `PXK-${today.slice(2, 4)}${today.slice(5, 7)}-${String(
          current.allocations.length + idx + 10,
        ).padStart(2, "0")}`;
        const lotId = makeId("lot-cnt");

        if (distImmediateReceive && outputIngId) {
          const existingCounterIdx = nextLots.findIndex(
            (l) =>
              l.location === "counter" &&
              l.locationId === entry.storeId &&
              l.batchId === distributeBatch.id,
          );
          if (existingCounterIdx >= 0) {
            nextLots[existingCounterIdx] = {
              ...nextLots[existingCounterIdx],
              quantity: nextLots[existingCounterIdx].quantity + entry.qty,
            };
          } else {
            nextLots.push({
              id: lotId,
              ingredientId: outputIngId,
              lotCode: distributeBatch.code,
              manufactureDate: distributeBatch.startedAt.slice(0, 10),
              expiryDate: distributeBatch.expiryDate,
              quantity: entry.qty,
              unitCost: kitchenSample?.unitCost ?? 65,
              quality: "pass",
              location: "counter",
              locationId: entry.storeId,
              batchId: distributeBatch.id,
            });
          }
        }

        newAllocs.push({
          id: makeId("alloc"),
          code: pxkCode,
          planId: null,
          sourceId: "kitchen",
          storeId: entry.storeId,
          date: today,
          shift: distributeBatch.shift,
          lines: [
            {
              id: makeId("al"),
              lotId: kitchenSample?.id ?? lotId,
              ingredientId: outputIngId,
              batchId: distributeBatch.id,
              proposedQuantity: entry.qty,
              sentQuantity: entry.qty,
              receivedQuantity: distImmediateReceive ? entry.qty : null,
              unit: distributeBatch.unit,
            },
          ],
          sender: currentUser.name,
          receiver: `Quầy ${entry.storeId}`,
          sentAt: `${today}T${nowTime}`,
          receivedAt: distImmediateReceive ? `${today}T${nowTime}` : null,
          status: distImmediateReceive ? "received" : "in-transit",
          discrepancyReason: "",
        });

        newDistRecords.push({
          id: makeId("bd"),
          storeId: entry.storeId,
          allocatedQuantity: entry.qty,
          receivedQuantity: distImmediateReceive ? entry.qty : 0,
          remainingCounterQuantity: distImmediateReceive ? entry.qty : 0,
          unit: distributeBatch.unit,
          transferCode: pxkCode,
          distributedAt: `${today} ${nowTime}`,
          status: distImmediateReceive ? "Đã nhập quầy" : "Đang vận chuyển",
        });

        newHistory.push({
          id: makeId("dh"),
          date: today,
          storeId: entry.storeId,
          ingredientId: outputIngId,
          fixedQuantity: entry.qty,
          tempExtraQuantity: 0,
          totalDispatched: entry.qty,
          unit: distributeBatch.unit,
          actionType: "periodic",
          ticketCode: pxkCode,
          actor: currentUser.name,
          note: `Phân phối từ mẻ ${distributeBatch.code} về ${entry.storeId}`,
        });
      });

      const nextBatches = current.batches.map((b) => {
        if (b.id !== distributeBatch.id) return b;
        const merged = [...(b.distributions ?? [])];
        for (const rec of newDistRecords) {
          const prevIdx = merged.findIndex((x) => x.storeId === rec.storeId);
          if (prevIdx >= 0) {
            merged[prevIdx] = {
              ...merged[prevIdx],
              allocatedQuantity: merged[prevIdx].allocatedQuantity + rec.allocatedQuantity,
              receivedQuantity: merged[prevIdx].receivedQuantity + rec.receivedQuantity,
              remainingCounterQuantity:
                merged[prevIdx].remainingCounterQuantity + rec.remainingCounterQuantity,
              transferCode: `${merged[prevIdx].transferCode}, ${rec.transferCode}`,
              distributedAt: rec.distributedAt,
              status: rec.status,
            };
          } else {
            merged.push(rec);
          }
        }
        return { ...b, distributions: merged };
      });

      return {
        ...current,
        lots: nextLots,
        batches: nextBatches,
        allocations: [...newAllocs, ...current.allocations],
        distributionHistory: [...newHistory, ...current.distributionHistory],
      };
    });

    toast.success(
      `Đã phân phối ${formatNumber(total)} ${distributeBatch.unit} từ mẻ ${distributeBatch.code} đến ${entries.length} chi nhánh.`,
    );
    setDistributeBatch(null);
  }

  // Traceability timeline context
  const traceContext = useMemo(() => {
    if (!traceBatch) return null;
    const liveBatch = data.batches.find((b) => b.id === traceBatch.id) ?? traceBatch;
    const metrics = batchMetricsMap.get(liveBatch.id);
    const recipe = data.recipes.find((r) => r.id === liveBatch.recipeId);
    const outputIng = recipe?.outputIngredientId
      ? getIngredient(data, recipe.outputIngredientId)
      : undefined;

    const step1Inputs = liveBatch.inputs.map((inp) => {
      const ing = getIngredient(data, inp.ingredientId);
      const lot = data.lots.find((l) => l.id === inp.lotId);
      return {
        ...inp,
        ingredientName: ing?.name ?? inp.ingredientId,
        ingredientCode: ing?.code ?? "",
        lotCode: lot?.lotCode ?? inp.lotId,
        supplierName: lot?.supplierName ?? "NCC Hợp đồng chuẩn",
        poCode: lot?.poCode ?? "PO-Nội bộ",
        manufactureDate: lot?.manufactureDate ?? null,
        expiryDate: lot?.expiryDate ?? null,
        lotQuality: lot?.quality ?? "pass",
      };
    });

    const step3Dists = (metrics?.distributions ?? []).filter(
      (d) => traceSelectedStore === "ALL" || d.storeId === traceSelectedStore,
    );

    const step4Products = outputIng
      ? data.recipes
        .filter(
          (r) =>
            r.kind === "drink" &&
            r.status === "approved" &&
            r.ingredients.some((line) => line.ingredientId === outputIng.id),
        )
        .map((r) => {
          const product = data.products.find((p) => p.id === r.productId);
          const usageLine = r.ingredients.find(
            (line) => line.ingredientId === outputIng.id,
          );
          return {
            recipeId: r.id,
            recipeCode: r.code,
            size: r.size,
            productName: product?.name ?? r.code,
            productCode: product?.code ?? "",
            lockedStoreIds: product?.lockedStoreIds ?? [],
            usageQty: usageLine?.quantity ?? 0,
            usageUnit: usageLine?.unit ?? outputIng.baseUnit,
          };
        })
      : [];

    return {
      batch: liveBatch,
      metrics,
      recipe,
      outputIng,
      step1Inputs,
      step3Dists,
      step4Products,
    };
  }, [traceBatch, traceSelectedStore, data, batchMetricsMap]);

  const chips = [
    ...(ui.status !== "all"
      ? [
        {
          id: "status",
          label: `Trạng thái: ${STATUS_LABEL[ui.status]}`,
          onRemove: () => setUi((p) => ({ ...p, status: "all" })),
        },
      ]
      : []),
    ...(ui.search.trim()
      ? [
        {
          id: "search",
          label: `Tìm: "${ui.search.trim()}"`,
          onRemove: () => setUi((p) => ({ ...p, search: "" })),
        },
      ]
      : []),
  ];

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Sản xuất &amp; Công thức</span>
            <span className="sep">/</span>
            <span className="current">Mẻ chế biến &amp; Phân phối</span>
          </nav>
          <h1 className="page-title">Mẻ chế biến &amp; Truy vết phân phối</h1>
          <p className="page-subtitle">
            Điều hành sản xuất bán thành phẩm F1, chia lô xuất về quầy chi nhánh và truy vết nguồn gốc 2 chiều.
          </p>
        </div>

        <div className="page-header-actions">
          {canProduce && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateDrawer}
            >
              + Tạo mẻ chế biến mới
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
          allLabel="Toàn chuỗi (Bếp trung tâm)"
        />
        <InfoTip
          title="Quản lý mẻ & truy vết 2 chiều"
          summary="Theo dõi đầy đủ vòng đời từ Lô nguyên liệu F0 (NCC/PO) -> Mẻ bán thành phẩm F1 -> Phân phối về từng chi nhánh -> Món bán tại quầy POS."
        />
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "total",
            label: "Tổng số mẻ",
            value: String(kpiCounts.total),
            subLabel: `${kpiCounts.fullyDistributed} mẻ đã chia hết`,
            icon: "factory",
            tone: "primary",
            active: ui.status === "all",
            onClick: () => setUi((p) => ({ ...p, status: "all" })),
          },
          {
            key: "processing",
            label: "Đang chế biến / Kế hoạch",
            value: String(kpiCounts.processing),
            subLabel: "Đang thực hiện tại bếp",
            icon: "clock",
            tone: kpiCounts.processing > 0 ? "warning" : "primary",
            valueTone: kpiCounts.processing > 0 ? "warning" : "default",
            active: ui.status === "processing",
            onClick: () =>
              setUi((p) => ({
                ...p,
                status: p.status === "processing" ? "all" : "processing",
              })),
          },
          {
            key: "ready",
            label: "Còn tại bếp chờ chia",
            value: String(kpiCounts.readyToDistribute),
            subLabel: "Đạt QC sẵn sàng xuất CN",
            icon: "truck",
            tone: "info",
            valueTone: kpiCounts.readyToDistribute > 0 ? "warning" : "default",
            active: ui.status === "completed",
            onClick: () =>
              setUi((p) => ({
                ...p,
                status: p.status === "completed" ? "all" : "completed",
              })),
          },
          {
            key: "held",
            label: "Tạm giữ QC",
            value: String(kpiCounts.held),
            subLabel: "Khóa phân phối chờ xử lý",
            icon: "warning",
            tone: kpiCounts.held > 0 ? "danger" : "success",
            valueTone: kpiCounts.held > 0 ? "danger" : "default",
            active: ui.status === "held",
            onClick: () =>
              setUi((p) => ({
                ...p,
                status: p.status === "held" ? "all" : "held",
              })),
          },
        ]}
      />

      {/* Sticky FilterBar */}
      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm mã mẻ (ME-...), nguyên liệu F0/F1, lô nhập hoặc mã chi nhánh..."
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
            status: "all",
            sortBy: "date-desc",
          }))
        }
        filters={
          <select
            aria-label="Lọc trạng thái mẻ"
            value={ui.status}
            onChange={(e) =>
              setUi((p) => ({
                ...p,
                status: e.target.value as "all" | BatchStatus,
              }))
            }
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="processing">Đang chế biến</option>
            <option value="planned">Kế hoạch</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="held">Tạm giữ QC</option>
          </select>
        }
        sortMenu={
          <SortMenu
            options={BATCH_SORT_OPTIONS}
            value={ui.sortBy}
            onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
          />
        }
      />

      {/* Main Batches Table */}
      <section className="card p-0 overflow-hidden" aria-label="Bảng mẻ chế biến và phân phối">
        {filteredBatches.length === 0 ? (
          <EmptyState
            title="Không có mẻ chế biến nào khớp bộ lọc hiện tại."
            actionLabel="Xóa bộ lọc"
            onAction={() =>
              setUi((p) => ({ ...p, search: "", status: "all" }))
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
                    label="Mã mẻ & Thành phẩm F1"
                    fieldHint="batch.code"
                    ascKey="code-asc"
                    descKey="date-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as BatchSortKey }))
                    }
                  />
                  <th>Đầu vào F0 (Lô &amp; NCC)</th>
                  <SortableTh
                    label="Sản lượng & HSD"
                    fieldHint="batch.plannedQuantity"
                    ascKey="date-asc"
                    descKey="qty-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as BatchSortKey }))
                    }
                  />
                  <th className="min-w-[240px]">Phân phối về Chi nhánh</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => {
                  const m = batchMetricsMap.get(batch.id)!;
                  const segments = m.distributions.map((d, idx) => ({
                    key: d.storeId,
                    label: `${d.storeId}: ${formatNumber(d.allocatedQuantity)} ${d.unit}`,
                    value: d.allocatedQuantity,
                    color: colorForBranch(d.storeId, idx),
                  }));
                  const hasPendingDist =
                    batch.status === "completed" &&
                    batch.quality === "pass" &&
                    m.remainingKitchen > 0 &&
                    canDistribute;

                  return (
                    <tr key={batch.id}>
                      <td>
                        <div className="font-mono font-semibold text-[var(--text)]">
                          <HighlightText text={batch.code} query={ui.search} />
                        </div>
                        <div className="text-xs font-medium text-[var(--heading-color)] mt-0.5">
                          <HighlightText
                            text={m.outputIngredientName}
                            query={ui.search}
                          />
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          {batch.shift} · {formatDate(batch.startedAt.slice(0, 10))}
                        </div>
                      </td>

                      <td>
                        <div className="space-y-1">
                          {batch.inputs.map((inp) => {
                            const ing = getIngredient(data, inp.ingredientId);
                            const lot = data.lots.find((l) => l.id === inp.lotId);
                            return (
                              <div key={inp.id} className="text-xs">
                                <span className="font-medium text-[var(--text)]">
                                  {ing?.name ?? inp.ingredientId}
                                </span>{" "}
                                <span className="text-[var(--muted)] tabular-nums">
                                  ({formatNumber(inp.actualQuantity ?? inp.plannedQuantity)} {inp.unit})
                                </span>
                                <div className="text-[11px] text-[var(--muted)] font-mono">
                                  Lô: {lot?.lotCode ?? inp.lotId}
                                  {lot?.poCode ? ` · ${lot.poCode}` : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="tabular-nums">
                        <div className="font-semibold text-[var(--text)]">
                          {formatNumber(m.totalOutput)} {batch.unit}
                        </div>
                        {batch.wasteQuantity != null && batch.wasteQuantity > 0 && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400">
                            Hao hụt: {formatNumber(batch.wasteQuantity)} {batch.unit}
                          </div>
                        )}
                        <div className="text-[11px] text-[var(--muted)]">
                          HSD: {formatDate(batch.expiryDate)}
                        </div>
                      </td>

                      <td>
                        {batch.status === "completed" && batch.quality === "pass" ? (
                          <div className="space-y-1.5">
                            <MiniProgress
                              max={m.totalOutput}
                              segments={segments}
                              label={`Đã chia ${formatNumber(m.distributedTotal)} / ${formatNumber(m.totalOutput)} ${batch.unit}`}
                            />
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              {m.distributions.map((d, idx) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setTraceDirection("reverse");
                                    setTraceSelectedStore(d.storeId);
                                    setTraceBatch(batch);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] hover:border-sky-400 transition-colors"
                                  title="Click để truy vết chi tiết cho chi nhánh này"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: colorForBranch(d.storeId, idx) }}
                                  />
                                  <span className="font-semibold">{d.storeId}</span>
                                  <span className="tabular-nums text-[var(--muted)]">
                                    {formatNumber(d.allocatedQuantity)}
                                  </span>
                                </button>
                              ))}
                              {m.remainingKitchen > 0 && (
                                <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                  · Còn tại bếp: {formatNumber(m.remainingKitchen)} {batch.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            {batch.status === "held"
                              ? "Tạm khóa phân phối (QC không đạt)"
                              : "Chờ ghi nhận hoàn thành mẻ"}
                          </span>
                        )}
                      </td>

                      <td>
                        <StatusPill
                          label={STATUS_LABEL[batch.status]}
                          tone={STATUS_TONE[batch.status]}
                        />
                        {batch.quality === "pass" && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                            QC: Đạt
                          </div>
                        )}
                        {batch.quality === "fail" && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                            QC: Không đạt
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-1.5 relative">
                          {batch.status === "planned" && canProduce && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartBatch(batch)}
                            >
                              Bắt đầu
                            </button>
                          )}
                          {batch.status === "processing" && canProduce && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openCompleteDrawer(batch)}
                            >
                              Ghi kết quả
                            </button>
                          )}
                          {hasPendingDist && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openDistributeDrawer(batch)}
                            >
                              Phân phối CN
                            </button>
                          )}
                          {!hasPendingDist &&
                            batch.status !== "planned" &&
                            batch.status !== "processing" && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setTraceDirection("forward");
                                  setTraceSelectedStore("ALL");
                                  setTraceBatch(batch);
                                }}
                              >
                                Truy vết
                              </button>
                            )}

                          <button
                            type="button"
                            aria-label={`Thêm thao tác cho ${batch.code}`}
                            className="btn btn-secondary btn-sm px-2"
                            onClick={() =>
                              setOpenMenuId((cur) =>
                                cur === batch.id ? null : batch.id,
                              )
                            }
                          >
                            ⋯
                          </button>

                          {openMenuId === batch.id && (
                            <div
                              className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 text-left"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button
                                type="button"
                                className="w-full px-3 py-1.5 text-xs hover:bg-[var(--background)] text-[var(--text)] text-left"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setTraceDirection("forward");
                                  setTraceSelectedStore("ALL");
                                  setTraceBatch(batch);
                                }}
                              >
                                Truy vết 2 chiều
                              </button>
                              {hasPendingDist && (
                                <button
                                  type="button"
                                  className="w-full px-3 py-1.5 text-xs hover:bg-[var(--background)] text-[var(--text)] text-left"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    openDistributeDrawer(batch);
                                  }}
                                >
                                  Phân phối về Chi nhánh
                                </button>
                              )}
                              {batch.status !== "completed" && canProduce && (
                                <button
                                  type="button"
                                  className="w-full px-3 py-1.5 text-xs hover:bg-[var(--background)] text-[var(--text)] text-left"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleToggleHold(batch);
                                  }}
                                >
                                  {batch.status === "held"
                                    ? "Mở khóa chế biến"
                                    : "Tạm giữ mẻ"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SideDrawer 1: Create Batch */}
      <SideDrawer
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo mẻ chế biến mới (F0 → F1)"
        subtitle="Chọn công thức bán thành phẩm và tự động giữ chỗ lô F0 theo nguyên tắc FEFO"
        widthClass="max-w-[540px]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-batch-form"
              className="btn btn-primary"
              disabled={createPreview.hasShortage}
            >
              Tạo &amp; Bắt đầu chế biến
            </button>
          </div>
        }
      >
        <form id="create-batch-form" onSubmit={handleCreateBatch} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="new-batch-recipe">
              Công thức bán thành phẩm (F1) *
            </label>
            <select
              id="new-batch-recipe"
              className="form-input form-select"
              value={createForm.recipeId}
              onChange={(e) => {
                const nextRecipe = data.recipes.find((r) => r.id === e.target.value);
                setCreateForm((cur) => ({
                  ...cur,
                  recipeId: e.target.value,
                  plannedQuantity: String(nextRecipe?.yieldQuantity ?? 10000),
                }));
              }}
              required
            >
              {prepRecipes.map((r) => {
                const out = r.outputIngredientId
                  ? getIngredient(data, r.outputIngredientId)
                  : null;
                return (
                  <option key={r.id} value={r.id}>
                    {r.code} · {out?.name ?? r.code} (Chuẩn {formatNumber(r.yieldQuantity)} {r.yieldUnit})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="new-batch-qty">
                Sản lượng dự kiến ({createPreview.recipe?.yieldUnit ?? "ml"}) *
              </label>
              <input
                id="new-batch-qty"
                type="number"
                min={100}
                step={100}
                className="form-input tabular-nums"
                value={createForm.plannedQuantity}
                onChange={(e) =>
                  setCreateForm((cur) => ({
                    ...cur,
                    plannedQuantity: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="new-batch-shift">
                Ca chế biến *
              </label>
              <select
                id="new-batch-shift"
                className="form-input form-select"
                value={createForm.shift}
                onChange={(e) =>
                  setCreateForm((cur) => ({
                    ...cur,
                    shift: e.target.value as Shift,
                  }))
                }
              >
                <option value="Ca sáng">Ca sáng</option>
                <option value="Ca chiều">Ca chiều</option>
                <option value="Ca tối">Ca tối</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="new-batch-op">
              Nhân viên phụ trách *
            </label>
            <input
              id="new-batch-op"
              className="form-input"
              value={createForm.operator}
              onChange={(e) =>
                setCreateForm((cur) => ({ ...cur, operator: e.target.value }))
              }
              required
            />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
            <div className="text-xs font-semibold text-[var(--heading-color)]">
              Nguyên liệu F0 xuất theo lô (FEFO)
            </div>
            {createPreview.inputs.map((inp) => (
              <div
                key={inp.ingredientId}
                className="flex items-center justify-between text-xs border-b last:border-b-0 border-[var(--border)] pb-1.5 last:pb-0"
              >
                <div>
                  <div className="font-medium text-[var(--text)]">
                    {inp.ingredientName}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {inp.lot
                      ? `Lô ${inp.lot.lotCode} · Khả dụng ${formatNumber(inp.available)} ${inp.unit}`
                      : "Không còn lô khả dụng"}
                  </div>
                </div>
                <span
                  className={`font-semibold tabular-nums ${inp.available < inp.needed ? "text-rose-600" : "text-emerald-600"
                    }`}
                >
                  Cần {formatNumber(inp.needed)} {inp.unit}
                </span>
              </div>
            ))}
          </div>
        </form>
      </SideDrawer>

      {/* SideDrawer 2: Complete Batch */}
      <SideDrawer
        isOpen={!!completeBatch}
        onClose={() => setCompleteBatch(null)}
        title={`Ghi kết quả mẻ ${completeBatch?.code ?? ""}`}
        subtitle="Ghi nhận sản lượng thực thu, hao hụt và kiểm định QC trước khi phân phối"
        widthClass="max-w-[500px]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCompleteBatch(null)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="complete-batch-form"
              className="btn btn-primary"
            >
              Lưu kết quả mẻ
            </button>
          </div>
        }
      >
        {completeBatch && (
          <form id="complete-batch-form" onSubmit={handleCompleteSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label" htmlFor="batch-actual">
                  Sản lượng thực tế ({completeBatch.unit}) *
                </label>
                <input
                  id="batch-actual"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input tabular-nums"
                  value={completeForm.actual}
                  onChange={(e) =>
                    setCompleteForm((cur) => ({ ...cur, actual: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="batch-waste">
                  Hao hụt ({completeBatch.unit})
                </label>
                <input
                  id="batch-waste"
                  type="number"
                  min="0"
                  step="1"
                  className="form-input tabular-nums"
                  value={completeForm.waste}
                  onChange={(e) =>
                    setCompleteForm((cur) => ({ ...cur, waste: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label" htmlFor="batch-expiry">
                  Hạn dùng sau chế biến *
                </label>
                <input
                  id="batch-expiry"
                  type="date"
                  min={today}
                  className="form-input"
                  value={completeForm.expiry}
                  onChange={(e) =>
                    setCompleteForm((cur) => ({ ...cur, expiry: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="batch-quality">
                  Kết quả QC *
                </label>
                <select
                  id="batch-quality"
                  className="form-input form-select"
                  value={completeForm.quality}
                  onChange={(e) =>
                    setCompleteForm((cur) => ({
                      ...cur,
                      quality: e.target.value as "pass" | "fail",
                    }))
                  }
                >
                  <option value="pass">Đạt (Nhập kho Bếp &amp; cho phép phân phối)</option>
                  <option value="fail">Không đạt (Tạm giữ QC)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="batch-approver">
                Người kiểm duyệt QC *
              </label>
              <input
                id="batch-approver"
                className="form-input"
                value={completeForm.approver}
                onChange={(e) =>
                  setCompleteForm((cur) => ({ ...cur, approver: e.target.value }))
                }
                required
              />
            </div>

            <p className="text-xs text-[var(--muted)]">
              Đầu vào F0 được trừ khỏi Kho Tổng khi ghi kết quả. Chỉ mẻ đạt QC và còn hạn mới tạo tồn kho Bếp trung tâm để phân phối về chi nhánh.
            </p>
          </form>
        )}
      </SideDrawer>

      {/* SideDrawer 3: Distribute Batch to Branches */}
      <SideDrawer
        isOpen={!!distributeBatch}
        onClose={() => setDistributeBatch(null)}
        title={`Phân phối mẻ ${distributeBatch?.code ?? ""} về Chi nhánh`}
        subtitle={
          distContext
            ? `${distContext.metrics?.outputIngredientName} · Còn lại tại bếp: ${formatNumber(distContext.remainingKitchen)} ${distributeBatch?.unit ?? ""}`
            : ""
        }
        widthClass="max-w-[580px]"
        footer={
          distContext && (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div className="text-xs">
                Sẽ xuất:{" "}
                <strong
                  className={`tabular-nums ${distContext.totalEntering > distContext.remainingKitchen
                    ? "text-rose-600"
                    : "text-[var(--heading-color)]"
                    }`}
                >
                  {formatNumber(distContext.totalEntering)} {distributeBatch?.unit}
                </strong>{" "}
                /{" "}
                <span className="tabular-nums text-[var(--muted)]">
                  {formatNumber(distContext.remainingKitchen)} {distributeBatch?.unit} khả dụng
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDistributeBatch(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  form="dist-batch-form"
                  className="btn btn-primary"
                  disabled={
                    distContext.totalEntering <= 0 ||
                    distContext.totalEntering > distContext.remainingKitchen
                  }
                >
                  Xác nhận phân phối
                </button>
              </div>
            </div>
          )
        }
      >
        {distributeBatch && distContext && (
          <form id="dist-batch-form" onSubmit={handleConfirmDistribute} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <label className="inline-flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={distImmediateReceive}
                  onChange={(e) => setDistImmediateReceive(e.target.checked)}
                  className="rounded border-[var(--border)]"
                />
                <span>Xuất kho &amp; cập nhật tồn quầy chi nhánh ngay (ghi nhận đã nhận đủ)</span>
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fillDistByDemand}
              >
                Chia đều theo nhu cầu
              </button>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {distContext.storeRows.map((row) => (
                <div
                  key={row.store.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text)]">
                      {row.store.id} · {row.store.name}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] tabular-nums">
                      Nhu cầu/ngày: {row.dailyNeed > 0 ? `${formatNumber(row.dailyNeed)} ${distributeBatch.unit}` : "Chưa cố định"} · Tồn quầy hiện tại: {formatNumber(row.currentCounter)} {distributeBatch.unit}
                    </div>
                    {row.existingAllocated > 0 && (
                      <div className="text-[11px] text-sky-600 dark:text-sky-400">
                        Đã chia từ mẻ này: {formatNumber(row.existingAllocated)} {distributeBatch.unit}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={distContext.remainingKitchen}
                      placeholder="0"
                      value={distMap[row.store.id] ?? ""}
                      onChange={(e) =>
                        setDistMap((cur) => ({
                          ...cur,
                          [row.store.id]: e.target.value,
                        }))
                      }
                      className="w-24 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-right tabular-nums text-[var(--text)]"
                    />
                    <span className="text-xs text-[var(--muted)] w-7">
                      {distributeBatch.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </form>
        )}
      </SideDrawer>

      {/* SideDrawer 4: Bi-directional 4-step Traceability */}
      <SideDrawer
        isOpen={!!traceContext}
        onClose={() => setTraceBatch(null)}
        title={`Truy vết 2 chiều · ${traceContext?.batch.code ?? ""}`}
        subtitle={`${traceContext?.outputIng?.name ?? "Bán thành phẩm F1"} · ${traceContext?.batch.shift ?? ""}`}
        widthClass="max-w-[600px]"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link
              to="/production/recipes"
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              Mở Công thức &amp; Thay thế nguyên liệu →
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTraceBatch(null)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {traceContext && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl<TraceDirection>
                value={traceDirection}
                onChange={setTraceDirection}
                options={[
                  { value: "forward", label: "Truy xuôi (F0 → Món)" },
                  { value: "reverse", label: "Truy ngược (Món / Quầy → F0)" },
                ]}
              />
              <select
                aria-label="Lọc chi nhánh truy vết"
                value={traceSelectedStore}
                onChange={(e) => setTraceSelectedStore(e.target.value)}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const stepF0 = (
                <div
                  key="step-f0"
                  className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700"
                >
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
                    F0
                  </span>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                    Bước 1 · Nguyên liệu đầu vào (NCC &amp; Đơn PO)
                  </div>
                  <div className="space-y-2">
                    {traceContext.step1Inputs.map((inp) => (
                      <div
                        key={inp.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text)]">
                            {inp.ingredientName} ({inp.ingredientCode})
                          </span>
                          <span className="font-mono font-medium text-[var(--heading-color)] tabular-nums">
                            {formatNumber(inp.actualQuantity ?? inp.plannedQuantity)} {inp.unit}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Lô: <strong className="font-mono text-[var(--text)]">{inp.lotCode}</strong></span>
                          <span>NCC: <strong className="text-[var(--text)]">{inp.supplierName}</strong></span>
                          <span>Chứng từ: <strong className="font-mono">{inp.poCode}</strong></span>
                          {inp.expiryDate && <span>HSD lô: {formatDate(inp.expiryDate)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );

              const stepF1 = (
                <div
                  key="step-f1"
                  className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700"
                >
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center">
                    F1
                  </span>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                    Bước 2 · Mẻ chế biến tại Bếp trung tâm
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[var(--heading-color)]">
                        {traceContext.batch.code}
                      </span>
                      <StatusPill
                        label={STATUS_LABEL[traceContext.batch.status]}
                        tone={STATUS_TONE[traceContext.batch.status]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--muted)] pt-1">
                      <div>Thành phẩm: <strong className="text-[var(--text)]">{traceContext.outputIng?.name}</strong></div>
                      <div>Sản lượng: <strong className="text-[var(--text)] tabular-nums">{formatNumber(traceContext.metrics?.totalOutput ?? 0)} {traceContext.batch.unit}</strong></div>
                      <div>Người nấu: <strong className="text-[var(--text)]">{traceContext.batch.operator}</strong></div>
                      <div>Kiểm duyệt QC: <strong className="text-[var(--text)]">{traceContext.batch.approver || "Chưa duyệt"}</strong></div>
                      <div>HSD sau nấu: <strong className="text-[var(--text)]">{formatDate(traceContext.batch.expiryDate)}</strong></div>
                      <div>Còn tại bếp: <strong className="text-sky-600 tabular-nums">{formatNumber(traceContext.metrics?.remainingKitchen ?? 0)} {traceContext.batch.unit}</strong></div>
                    </div>
                  </div>
                </div>
              );

              const stepDist = (
                <div
                  key="step-dist"
                  className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700"
                >
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    CN
                  </span>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                    Bước 3 · Phân phối về Chi nhánh ({traceContext.step3Dists.length} điểm)
                  </div>
                  {traceContext.step3Dists.length === 0 ? (
                    <div className="text-xs text-[var(--muted)] italic">
                      Chưa ghi nhận phiếu xuất kho cho lựa chọn chi nhánh này.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {traceContext.step3Dists.map((d) => {
                        const store = getStore(data, d.storeId);
                        return (
                          <div
                            key={d.id}
                            className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-semibold text-[var(--text)]">
                                {d.storeId} · {store?.name ?? ""}
                              </div>
                              <div className="text-[11px] text-[var(--muted)] mt-0.5">
                                Phiếu: <span className="font-mono">{d.transferCode}</span> · {d.distributedAt}
                              </div>
                            </div>
                            <div className="text-right tabular-nums">
                              <div className="font-semibold text-[var(--text)]">
                                Đã nhận {formatNumber(d.receivedQuantity)} / {formatNumber(d.allocatedQuantity)} {d.unit}
                              </div>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                Tồn tại quầy: {formatNumber(d.remainingCounterQuantity)} {d.unit}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );

              const stepMenu = (
                <div key="step-menu" className="relative pl-6">
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                    SP
                  </span>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                    Bước 4 · Món thành phẩm sử dụng trên Menu ({traceContext.step4Products.length} công thức)
                  </div>
                  {traceContext.step4Products.length === 0 ? (
                    <div className="text-xs text-[var(--muted)] italic">
                      Chưa liên kết món thành phẩm nào trực tiếp từ bán thành phẩm này.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {traceContext.step4Products.map((prod) => (
                        <div
                          key={prod.recipeId}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"
                        >
                          <div className="font-semibold text-[var(--text)] truncate">
                            {prod.productName} ({prod.size})
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            {prod.productCode} · Định mức {formatNumber(prod.usageQty)} {prod.usageUnit}/ly
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

              return (
                <div className="pt-1">
                  {traceDirection === "forward"
                    ? [stepF0, stepF1, stepDist, stepMenu]
                    : [stepMenu, stepDist, stepF1, stepF0]}
                </div>
              );
            })()}
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
