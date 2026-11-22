import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import {
  ConfirmInline,
  EmptyState,
  InfoTip,
  KpiStrip,
  ScopeBadge,
  SegmentedControl,
  SideDrawer,
  StatusPill,
  usePageUiState,
  type PillTone,
} from "../../components/shared/ui-kit";
import { homePath, isCashier, scopedBranch, sessionUser } from "../../utils/auth";
import {
  getIngredient,
  getStore,
  relativeDateISO,
  usableLotQuantity,
  type DistributionHistoryItem,
  type DistributionPlan,
  type MasterFixedPlan,
  type Shift,
  type TemporaryPlanOverride,
} from "../shared/business-demo";
import {
  formatDate,
  formatNumber,
  getTodayISO,
  makeId,
  sumBy,
} from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";

type PlanningTab = "matrix" | "hierarchy" | "history" | "shifts";
type HorizonDays = 7 | 14 | 30;

const ACTION_LABEL: Record<DistributionHistoryItem["actionType"], string> = {
  periodic: "Định kỳ cố định",
  temp_shortage: "Bổ sung tạm thời",
  promote_to_fixed: "Chuyển thành cố định",
};

const ACTION_TONE: Record<DistributionHistoryItem["actionType"], PillTone> = {
  periodic: "neutral",
  temp_shortage: "info",
  promote_to_fixed: "success",
};

const PLAN_STATUS_LABEL: Record<DistributionPlan["status"], string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
};

const PLAN_STATUS_TONE: Record<DistributionPlan["status"], PillTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
};

export default function DistributionPlanningPage() {
  const toast = useToast();
  const [data, setData] = useDemoState();
  const branchScope = scopedBranch();
  const currentUser = sessionUser();
  const canEditPlans = !isCashier();

  const today = getTodayISO();

  const [ui, setUi] = usePageUiState<{
    branch: string;
    tab: PlanningTab;
    ingredientId: string;
    horizon: HorizonDays;
    dayOffset: number;
    historyActionFilter: "all" | DistributionHistoryItem["actionType"];
  }>("mw_ui_planning_v1", {
    branch: branchScope ?? "ALL",
    tab: "matrix",
    ingredientId: "ing-tea-base",
    horizon: 7,
    dayOffset: 0,
    historyActionFilter: "all",
  });

  const activeBranch = branchScope ?? ui.branch;

  // Popover selected cell
  const [selectedCell, setSelectedCell] = useState<{
    storeId: string;
    dateISO: string;
    ingredientId: string;
  } | null>(null);

  // Drawers
  const [tempDrawerOpen, setTempDrawerOpen] = useState(false);
  const [fixedDrawerOpen, setFixedDrawerOpen] = useState(false);
  const [shiftPlanDrawerOpen, setShiftPlanDrawerOpen] = useState(false);

  // Temp override form
  const [tempForm, setTempForm] = useState({
    storeId: branchScope ?? "CN01",
    ingredientId: ui.ingredientId || "ing-tea-base",
    extraCups: "40",
    extraQuantity: "7200",
    preset: "3d" as "1d" | "3d" | "7d" | "custom",
    startDate: relativeDateISO(1, today),
    endDate: relativeDateISO(3, today),
    reason: "",
    logImmediateHistory: true,
  });

  // Fixed plan edit/create form
  const [fixedForm, setFixedForm] = useState({
    storeId: branchScope ?? "CN01",
    ingredientId: "ing-tea-base",
    fixedCupsPerDay: "220",
    fixedQuantity: "39600",
    ratioPerCupLabel: "180 ml Cốt F1 / 1 ly",
  });

  // Per-shift plan form (preserving existing plan flow cleanly)
  const [shiftForm, setShiftForm] = useState({
    storeId: branchScope ?? "CN01",
    date: today,
    shift: "Ca sáng" as Shift,
    expectedCups: "180",
    ingredientId: "ing-tea-base",
    quantity: "32400",
    note: "",
  });

  const plannedIngredients = useMemo(() => {
    const ids = new Set(data.masterFixedPlans.map((m) => m.ingredientId));
    const list = data.ingredients.filter((ing) => ids.has(ing.id));
    return list.length > 0 ? list : data.ingredients.slice(0, 3);
  }, [data.ingredients, data.masterFixedPlans]);

  const activeIngredientId = plannedIngredients.some(
    (i) => i.id === ui.ingredientId,
  )
    ? ui.ingredientId
    : (plannedIngredients[0]?.id ?? "ing-tea-base");

  const activeIngredient = getIngredient(data, activeIngredientId);

  const visibleDays = useMemo(() => {
    return Array.from({ length: ui.horizon }, (_, idx) => {
      const iso = relativeDateISO(ui.dayOffset + idx, today);
      const dt = new Date(`${iso}T00:00:00Z`);
      const weekday = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][dt.getUTCDay()];
      return {
        iso,
        shortLabel: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
        weekday,
        isToday: iso === today,
      };
    });
  }, [ui.horizon, ui.dayOffset, today]);

  // Helper: Resolve fixed plan + active temp overrides for a store, ingredient, date
  function getCellData(storeId: string, ingredientId: string, dateISO: string) {
    const fixed = data.masterFixedPlans.find(
      (m) => m.storeId === storeId && m.ingredientId === ingredientId,
    );
    const activeOverrides = data.temporaryOverrides.filter(
      (ov) =>
        ov.storeId === storeId &&
        ov.ingredientId === ingredientId &&
        ov.status === "active" &&
        ov.startDate <= dateISO &&
        dateISO <= ov.endDate,
    );
    const fixedQty = fixed?.fixedQuantity ?? 0;
    const extraQty = sumBy(activeOverrides, (ov) => ov.extraQuantity);
    return {
      fixed,
      fixedQty,
      extraQty,
      totalQty: fixedQty + extraQty,
      activeOverrides,
    };
  }

  // Matrix rows (stores with fixed plans or matching branch filter)
  const matrixStores = useMemo(() => {
    const storeIds = new Set(
      data.masterFixedPlans
        .filter((m) => m.ingredientId === activeIngredientId)
        .map((m) => m.storeId),
    );
    const filtered = data.stores.filter((s) => {
      if (activeBranch !== "ALL") return s.id === activeBranch;
      return storeIds.size > 0 ? storeIds.has(s.id) : true;
    });
    return filtered;
  }, [data.stores, data.masterFixedPlans, activeIngredientId, activeBranch]);

  // Daily central totals for bottom summary row
  const centralDailyTotals = useMemo(() => {
    return visibleDays.map((day) => {
      let fixedSum = 0;
      let tempSum = 0;
      for (const store of matrixStores) {
        const cell = getCellData(store.id, activeIngredientId, day.iso);
        fixedSum += cell.fixedQty;
        tempSum += cell.extraQty;
      }
      return {
        dateISO: day.iso,
        fixedSum,
        tempSum,
        totalSum: fixedSum + tempSum,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDays, matrixStores, activeIngredientId, data.masterFixedPlans, data.temporaryOverrides]);

  // KPI stats for today
  const todayStats = useMemo(() => {
    let fixedToday = 0;
    let extraToday = 0;
    let activeOverrideCount = 0;
    for (const store of matrixStores) {
      const cell = getCellData(store.id, activeIngredientId, today);
      fixedToday += cell.fixedQty;
      extraToday += cell.extraQty;
      activeOverrideCount += cell.activeOverrides.length;
    }
    return {
      fixedToday,
      extraToday,
      totalToday: fixedToday + extraToday,
      activeOverrideCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixStores, activeIngredientId, today, data.masterFixedPlans, data.temporaryOverrides]);

  // Open Temp Override Drawer with smart defaults
  function openTempOverrideDrawer(prefill?: {
    storeId?: string;
    ingredientId?: string;
    startDate?: string;
  }) {
    const targetStore =
      branchScope ?? prefill?.storeId ?? (activeBranch !== "ALL" ? activeBranch : "CN01");
    const targetIng = prefill?.ingredientId ?? activeIngredientId;
    const fixed = data.masterFixedPlans.find(
      (m) => m.storeId === targetStore && m.ingredientId === targetIng,
    );
    const perCup =
      fixed && fixed.fixedCupsPerDay > 0
        ? Math.round(fixed.fixedQuantity / fixed.fixedCupsPerDay)
        : 180;
    const defaultCups = 40;
    const start = prefill?.startDate ?? relativeDateISO(1, today);
    const end = relativeDateISO(2, start);

    setTempForm({
      storeId: targetStore,
      ingredientId: targetIng,
      extraCups: String(defaultCups),
      extraQuantity: String(defaultCups * perCup),
      preset: "3d",
      startDate: start,
      endDate: end,
      reason: "",
      logImmediateHistory: true,
    });
    setTempDrawerOpen(true);
  }

  function applyTempPreset(preset: "1d" | "3d" | "7d" | "custom") {
    const start = relativeDateISO(1, today);
    const days = preset === "1d" ? 1 : preset === "3d" ? 3 : 7;
    const end =
      preset === "custom" ? tempForm.endDate : relativeDateISO(days - 1, start);
    setTempForm((cur) => ({
      ...cur,
      preset,
      startDate: preset === "custom" ? cur.startDate : start,
      endDate: end,
    }));
  }

  function handleSaveTempOverride(e: FormEvent) {
    e.preventDefault();
    const extraQty = Math.round(Number(tempForm.extraQuantity) || 0);
    const extraCups = Math.round(Number(tempForm.extraCups) || 0);
    if (extraQty <= 0) {
      toast.error("Lượng tăng thêm tạm thời phải lớn hơn 0.");
      return;
    }
    if (tempForm.endDate < tempForm.startDate) {
      toast.error("Ngày kết thúc không thể nhỏ hơn ngày bắt đầu.");
      return;
    }
    const startMs = Date.parse(`${tempForm.startDate}T00:00:00Z`);
    const endMs = Date.parse(`${tempForm.endDate}T00:00:00Z`);
    const durationDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
    const ing = getIngredient(data, tempForm.ingredientId);
    const fixed = data.masterFixedPlans.find(
      (m) =>
        m.storeId === tempForm.storeId &&
        m.ingredientId === tempForm.ingredientId,
    );

    const newOv: TemporaryPlanOverride = {
      id: makeId("tmp-ov"),
      storeId: tempForm.storeId,
      ingredientId: tempForm.ingredientId,
      extraCups,
      extraQuantity: extraQty,
      unit: ing?.baseUnit ?? "ml",
      startDate: tempForm.startDate,
      endDate: tempForm.endDate,
      durationDays,
      reason:
        tempForm.reason.trim() ||
        `Báo thiếu đột xuất tại ${tempForm.storeId} (${durationDays} ngày)`,
      createdBy: currentUser.name,
      createdAt: today,
      status: "active",
    };

    const historyEntry: DistributionHistoryItem | null = tempForm.logImmediateHistory
      ? {
        id: makeId("dh"),
        date: today,
        storeId: tempForm.storeId,
        ingredientId: tempForm.ingredientId,
        fixedQuantity: fixed?.fixedQuantity ?? 0,
        tempExtraQuantity: extraQty,
        totalDispatched: (fixed?.fixedQuantity ?? 0) + extraQty,
        unit: ing?.baseUnit ?? "ml",
        actionType: "temp_shortage",
        ticketCode: `BST-${today.slice(5, 7)}${today.slice(8, 10)}-${String(
          data.distributionHistory.length + 10,
        )}`,
        actor: currentUser.name,
        note: `${newOv.reason} (Hiệu lực ${formatDate(tempForm.startDate)} – ${formatDate(tempForm.endDate)}, giữ nguyên kế hoạch cố định)`,
      }
      : null;

    setData((current) => ({
      ...current,
      temporaryOverrides: [newOv, ...current.temporaryOverrides],
      distributionHistory: historyEntry
        ? [historyEntry, ...current.distributionHistory]
        : current.distributionHistory,
    }));

    setTempDrawerOpen(false);
    toast.success(
      `Đã thêm +${formatNumber(extraQty)} ${ing?.baseUnit ?? ""} tạm thời (${durationDays} ngày) cho ${tempForm.storeId}. Kế hoạch cố định vẫn được giữ nguyên!`,
    );
  }

  function handlePromoteToFixed(ov: TemporaryPlanOverride) {
    const ing = getIngredient(data, ov.ingredientId);
    setData((current) => {
      const existingIdx = current.masterFixedPlans.findIndex(
        (m) => m.storeId === ov.storeId && m.ingredientId === ov.ingredientId,
      );
      let nextMaster = [...current.masterFixedPlans];
      let newFixedQty = ov.extraQuantity;

      if (existingIdx >= 0) {
        const cur = nextMaster[existingIdx];
        newFixedQty = cur.fixedQuantity + ov.extraQuantity;
        nextMaster[existingIdx] = {
          ...cur,
          fixedQuantity: newFixedQty,
          fixedCupsPerDay: cur.fixedCupsPerDay + ov.extraCups,
          updatedBy: currentUser.name,
          updatedAt: today,
        };
      } else {
        nextMaster.push({
          id: makeId("mfp"),
          storeId: ov.storeId,
          ingredientId: ov.ingredientId,
          fixedCupsPerDay: ov.extraCups,
          fixedQuantity: ov.extraQuantity,
          unit: ov.unit,
          ratioPerCupLabel: `Theo định mức chuẩn ${ing?.name ?? ov.ingredientId}`,
          updatedBy: currentUser.name,
          updatedAt: today,
        });
      }

      const nextOverrides = current.temporaryOverrides.map((item) =>
        item.id === ov.id
          ? {
            ...item,
            status: "promoted" as const,
            promotedAt: today,
            promotedBy: currentUser.name,
          }
          : item,
      );

      const historyLog: DistributionHistoryItem = {
        id: makeId("dh"),
        date: today,
        storeId: ov.storeId,
        ingredientId: ov.ingredientId,
        fixedQuantity: newFixedQty,
        tempExtraQuantity: ov.extraQuantity,
        totalDispatched: newFixedQty,
        unit: ov.unit,
        actionType: "promote_to_fixed",
        ticketCode: `CD-${today.slice(5, 7)}${today.slice(8, 10)}-${String(
          current.distributionHistory.length + 11,
        )}`,
        actor: currentUser.name,
        note: `Biến lượng tăng tạm thời (+${formatNumber(ov.extraQuantity)} ${ov.unit}) thành Định mức cố định mới (${formatNumber(newFixedQty)} ${ov.unit}/ngày)`,
      };

      return {
        ...current,
        masterFixedPlans: nextMaster,
        temporaryOverrides: nextOverrides,
        distributionHistory: [historyLog, ...current.distributionHistory],
      };
    });

    setSelectedCell(null);
    toast.success(
      `Đã chuyển +${formatNumber(ov.extraQuantity)} ${ov.unit} thành Kế hoạch cố định mới cho ${ov.storeId}!`,
    );
  }

  function handleExpireOverride(ov: TemporaryPlanOverride) {
    setData((current) => ({
      ...current,
      temporaryOverrides: current.temporaryOverrides.map((item) =>
        item.id === ov.id ? { ...item, status: "expired" } : item,
      ),
    }));
    setSelectedCell(null);
    toast.info(`Đã kết thúc điều chỉnh tạm thời tại ${ov.storeId}; mức phân phối quay về kế hoạch cố định.`);
  }

  function handleSaveFixedPlan(e: FormEvent) {
    e.preventDefault();
    const fixedQuantity = Math.round(Number(fixedForm.fixedQuantity) || 0);
    const fixedCupsPerDay = Math.round(Number(fixedForm.fixedCupsPerDay) || 0);
    if (fixedQuantity <= 0) {
      toast.error("Định mức cố định phải lớn hơn 0.");
      return;
    }
    const ing = getIngredient(data, fixedForm.ingredientId);
    setData((current) => {
      const idx = current.masterFixedPlans.findIndex(
        (m) =>
          m.storeId === fixedForm.storeId &&
          m.ingredientId === fixedForm.ingredientId,
      );
      const next = [...current.masterFixedPlans];
      const payload: MasterFixedPlan = {
        id: idx >= 0 ? next[idx].id : makeId("mfp"),
        storeId: fixedForm.storeId,
        ingredientId: fixedForm.ingredientId,
        fixedCupsPerDay,
        fixedQuantity,
        unit: ing?.baseUnit ?? "ml",
        ratioPerCupLabel: fixedForm.ratioPerCupLabel.trim() || "Theo công thức chuẩn",
        f1ToF0RatioLabel: idx >= 0 ? next[idx].f1ToF0RatioLabel : undefined,
        updatedBy: currentUser.name,
        updatedAt: today,
      };
      if (idx >= 0) next[idx] = payload;
      else next.unshift(payload);

      return { ...current, masterFixedPlans: next };
    });
    setFixedDrawerOpen(false);
    toast.success(`Đã lưu Kế hoạch cố định cho ${fixedForm.storeId}.`);
  }

  // Per-shift plan workflow preserved cleanly
  function handleCreateShiftPlan(e: FormEvent) {
    e.preventDefault();
    const qty = Math.round(Number(shiftForm.quantity) || 0);
    const cups = Math.round(Number(shiftForm.expectedCups) || 0);
    if (qty <= 0) {
      toast.error("Số lượng kế hoạch theo ca phải lớn hơn 0.");
      return;
    }
    const ing = getIngredient(data, shiftForm.ingredientId);
    const nextCode = `KH-${today.slice(2, 4)}${today.slice(5, 7)}-${String(
      data.plans.length + 1,
    ).padStart(2, "0")}`;
    const newPlan: DistributionPlan = {
      id: makeId("plan"),
      code: nextCode,
      storeId: shiftForm.storeId,
      date: shiftForm.date,
      shift: shiftForm.shift,
      expectedCups: cups,
      lines: [
        {
          id: makeId("pl"),
          ingredientId: shiftForm.ingredientId,
          quantity: qty,
          approvedQuantity: null,
          unit: ing?.baseUnit ?? "ml",
        },
      ],
      batchIds: [],
      status: "draft",
      note: shiftForm.note.trim() || "Kế hoạch phân bổ theo ca.",
    };
    setData((current) => ({ ...current, plans: [newPlan, ...current.plans] }));
    setShiftPlanDrawerOpen(false);
    toast.success(`Đã tạo kế hoạch ca ${nextCode}.`);
  }

  function handleSendPlanForApproval(plan: DistributionPlan) {
    setData((current) => ({
      ...current,
      plans: current.plans.map((p) =>
        p.id === plan.id ? { ...p, status: "pending" } : p,
      ),
    }));
    toast.info(`Đã gửi duyệt kế hoạch ${plan.code}.`);
  }

  function handleApproveShiftPlan(plan: DistributionPlan) {
    const kitchenStockByIng = new Map<string, number>();
    for (const lot of data.lots) {
      if (lot.location === "kitchen" || lot.location === "central") {
        const usable = usableLotQuantity(lot, today);
        if (usable > 0) {
          kitchenStockByIng.set(
            lot.ingredientId,
            (kitchenStockByIng.get(lot.ingredientId) ?? 0) + usable,
          );
        }
      }
    }

    for (const line of plan.lines) {
      const avail = kitchenStockByIng.get(line.ingredientId) ?? 0;
      if (avail < line.quantity) {
        const ing = getIngredient(data, line.ingredientId);
        toast.warning(
          `Tồn Kho Tổng/Bếp cho "${ing?.name ?? line.ingredientId}" còn ${formatNumber(avail)} ${line.unit} (< ${formatNumber(line.quantity)}). Đã duyệt kèm lưu ý cần nấu thêm mẻ.`,
        );
      }
    }

    setData((current) => ({
      ...current,
      plans: current.plans.map((p) =>
        p.id === plan.id
          ? {
            ...p,
            status: "approved",
            lines: p.lines.map((l) => ({
              ...l,
              approvedQuantity: l.quantity,
            })),
          }
          : p,
      ),
    }));
    toast.success(`Đã phê duyệt kế hoạch theo ca ${plan.code}.`);
  }

  // History filtering + CSV export
  const filteredHistory = useMemo(() => {
    return data.distributionHistory.filter((item) => {
      if (activeBranch !== "ALL" && item.storeId !== activeBranch) return false;
      if (
        ui.historyActionFilter !== "all" &&
        item.actionType !== ui.historyActionFilter
      ) {
        return false;
      }
      return true;
    });
  }, [data.distributionHistory, activeBranch, ui.historyActionFilter]);

  function exportHistoryCsv() {
    const header =
      "Ngay,Ma phieu,Chi nhanh,Nguyen lieu,Co dinh,Tam thoi (+),Tong cap,Don vi,Loai su kien,Nguoi thuc hien,Ghi chu";
    const lines = filteredHistory.map((h) => {
      const ing = getIngredient(data, h.ingredientId);
      const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      return [
        h.date,
        h.ticketCode,
        h.storeId,
        esc(ing?.name ?? h.ingredientId),
        h.fixedQuantity,
        h.tempExtraQuantity,
        h.totalDispatched,
        h.unit,
        esc(ACTION_LABEL[h.actionType]),
        esc(h.actor),
        esc(h.note),
      ].join(",");
    });
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lich-su-phan-phoi-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV Lịch sử phân phối & biến động.");
  }

  const selectedCellDetail = useMemo(() => {
    if (!selectedCell) return null;
    const cell = getCellData(
      selectedCell.storeId,
      selectedCell.ingredientId,
      selectedCell.dateISO,
    );
    const store = getStore(data, selectedCell.storeId);
    const ing = getIngredient(data, selectedCell.ingredientId);
    return { ...selectedCell, ...cell, store, ing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, data]);

  // Hierarchy data (2 flows: F0 -> F1 -> Dish and F0 -> Dish)
  const f1Ingredients = useMemo(
    () =>
      data.ingredients.filter(
        (ing) => ing.tier === "F1" || ing.flowType === "F0_TO_F1_TO_DISH",
      ),
    [data.ingredients],
  );
  const f0DirectIngredients = useMemo(
    () =>
      data.ingredients.filter((ing) => ing.flowType === "F0_DIRECT_TO_DISH"),
    [data.ingredients],
  );

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Kho tổng &amp; Điều phối</span>
            <span className="sep">/</span>
            <span className="current">Kế hoạch chuẩn bị</span>
          </nav>
          <h1 className="page-title">Kế hoạch chuẩn bị Kho Tổng &amp; Phân phối</h1>
          <p className="page-subtitle">
            Tách biệt định mức chuẩn cố định, điều chỉnh tạm thời theo khoảng ngày và cây phân cấp F0 → F1 → Món.
          </p>
        </div>

        <div className="page-header-actions flex-wrap">
          {canEditPlans && (
            <>
              {!branchScope && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFixedForm({
                      storeId: activeBranch !== "ALL" ? activeBranch : "CN01",
                      ingredientId: activeIngredientId,
                      fixedCupsPerDay: "200",
                      fixedQuantity: "36000",
                      ratioPerCupLabel: "180 ml / 1 ly",
                    });
                    setFixedDrawerOpen(true);
                  }}
                >
                  Đặt định mức cố định
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openTempOverrideDrawer()}
              >
                + Báo thiếu / Thêm tạm thời
              </button>
            </>
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
          allLabel="Toàn chuỗi (Kho Tổng)"
        />
        <InfoTip
          title="Quy tắc 2 lớp: Cố định & Tạm thời"
          summary="Kế hoạch cố định là định mức ngày gốc tại Kho Tổng. Khi chi nhánh báo thiếu đột xuất, lượng tăng tạm thời chỉ cộng trong khoảng ngày hiệu lực và tự hết hạn — không làm lệch kế hoạch các tuần tiếp theo trừ khi được chọn Biến thành cố định."
        />
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "fixed",
            label: `Cố định/ngày (${activeIngredient?.code ?? ""})`,
            value: `${formatNumber(todayStats.fixedToday)} ${activeIngredient?.baseUnit ?? ""}`,
            subLabel: "Định mức nền toàn phạm vi",
            icon: "grid",
            tone: "primary",
          },
          {
            key: "temp",
            label: "Tăng tạm thời hôm nay",
            value: `+${formatNumber(todayStats.extraToday)} ${activeIngredient?.baseUnit ?? ""}`,
            subLabel: `${todayStats.activeOverrideCount} phiếu đang hiệu lực`,
            icon: "clock",
            tone: todayStats.activeOverrideCount > 0 ? "info" : "primary",
            valueTone: todayStats.extraToday > 0 ? "warning" : "default",
          },
          {
            key: "total",
            label: "Tổng Kho Tổng chuẩn bị",
            value: `${formatNumber(todayStats.totalToday)} ${activeIngredient?.baseUnit ?? ""}`,
            subLabel: "Đã gộp cố định + tạm thời",
            icon: "truck",
            tone: "success",
            valueTone: "success",
          },
          {
            key: "history",
            label: "Lịch sử phân phối",
            value: String(filteredHistory.length),
            subLabel: "Nhấn để xem nhật ký",
            icon: "clipboard",
            tone: "purple",
            active: ui.tab === "history",
            onClick: () => setUi((p) => ({ ...p, tab: "history" })),
          },
        ]}
      />

      {/* Top Navigation SegmentedControl */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SegmentedControl<PlanningTab>
          value={ui.tab}
          onChange={(next) => setUi((p) => ({ ...p, tab: next }))}
          options={[
            { value: "matrix", label: "Ma trận Cố định & Tạm thời" },
            { value: "hierarchy", label: "Phân cấp NL (F0→F1→Món)" },
            {
              value: "history",
              label: "Lịch sử phân phối",
              badge: filteredHistory.length,
            },
            {
              value: "shifts",
              label: "Kế hoạch theo ca",
              badge: data.plans.length,
            },
          ]}
        />
      </div>

      {/* TAB 1: CALENDAR-GRID MATRIX */}
      {ui.tab === "matrix" && (
        <div className="space-y-3">
          {/* Matrix Controls Bar */}
          <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--muted)]">
                Nguyên liệu:
              </span>
              <SegmentedControl<string>
                value={activeIngredientId}
                onChange={(next) =>
                  setUi((p) => ({ ...p, ingredientId: next }))
                }
                options={plannedIngredients.map((ing) => ({
                  value: ing.id,
                  label: `${ing.name} (${ing.tier ?? "F0"})`,
                }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<"7" | "14" | "30">
                value={String(ui.horizon) as "7" | "14" | "30"}
                onChange={(next) =>
                  setUi((p) => ({ ...p, horizon: Number(next) as HorizonDays }))
                }
                options={[
                  { value: "7", label: "7 ngày" },
                  { value: "14", label: "14 ngày" },
                  { value: "30", label: "30 ngày" },
                ]}
              />
              <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden text-xs">
                <button
                  type="button"
                  aria-label="Lùi khoảng ngày"
                  className="px-2 py-1 hover:bg-[var(--surface)] inline-flex items-center"
                  onClick={() =>
                    setUi((p) => ({ ...p, dayOffset: p.dayOffset - p.horizon }))
                  }
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 border-x border-[var(--border)] font-medium hover:bg-[var(--surface)]"
                  onClick={() => setUi((p) => ({ ...p, dayOffset: 0 }))}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  aria-label="Tiến khoảng ngày"
                  className="px-2 py-1 hover:bg-[var(--surface)] inline-flex items-center"
                  onClick={() =>
                    setUi((p) => ({ ...p, dayOffset: p.dayOffset + p.horizon }))
                  }
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Selected Cell Interactive Action Bar / Popover */}
          {selectedCellDetail && (
            <div className="card p-3.5 border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[var(--heading-color)]">
                    {selectedCellDetail.store?.id} · {selectedCellDetail.store?.name}
                  </span>
                  <span className="text-[var(--muted)]">•</span>
                  <span className="font-medium">
                    Ngày {formatDate(selectedCellDetail.dateISO)}
                  </span>
                  <span className="text-[var(--muted)]">•</span>
                  <span>
                    Cố định gốc:{" "}
                    <strong className="tabular-nums">
                      {formatNumber(selectedCellDetail.fixedQty)}{" "}
                      {selectedCellDetail.ing?.baseUnit}
                    </strong>
                    {selectedCellDetail.fixed && (
                      <span className="text-[var(--muted)]">
                        {" "}
                        ({selectedCellDetail.fixed.fixedCupsPerDay} ly ·{" "}
                        {selectedCellDetail.fixed.ratioPerCupLabel})
                      </span>
                    )}
                  </span>
                </div>
                {selectedCellDetail.activeOverrides.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-sky-700 dark:text-sky-300">
                    {selectedCellDetail.activeOverrides.map((ov) => (
                      <span key={ov.id} className="inline-flex flex-wrap items-center gap-2">
                        <span>
                          Tạm thời:{" "}
                          <strong className="tabular-nums">
                            +{formatNumber(ov.extraQuantity)} {ov.unit}
                          </strong>{" "}
                          ({formatDate(ov.startDate)} → {formatDate(ov.endDate)}) · Lý do: “
                          {ov.reason}”
                        </span>
                        {canEditPlans && !branchScope && (
                          <ConfirmInline
                            triggerLabel="Biến thành cố định"
                            confirmText={`Cộng +${formatNumber(ov.extraQuantity)} vào định mức ngày?`}
                            tone="primary"
                            onConfirm={() => handlePromoteToFixed(ov)}
                          />
                        )}
                        {canEditPlans && (
                          <ConfirmInline
                            triggerLabel="Kết thúc sớm"
                            confirmText="Hủy phần tăng tạm thời?"
                            onConfirm={() => handleExpireOverride(ov)}
                          />
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--muted)]">
                    Không có điều chỉnh tạm thời trong ngày này — áp dụng đúng kế hoạch cố định gốc.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canEditPlans && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      openTempOverrideDrawer({
                        storeId: selectedCellDetail.storeId,
                        ingredientId: selectedCellDetail.ingredientId,
                        startDate: selectedCellDetail.dateISO,
                      })
                    }
                  >
                    + Thêm tạm thời ngày này
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedCell(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {/* Matrix Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th className="min-w-[200px] sticky left-0 bg-[var(--surface)] z-10">
                      Chi nhánh &amp; Định mức gốc
                    </th>
                    {visibleDays.map((day) => (
                      <th
                        key={day.iso}
                        className={`text-center min-w-[104px] ${day.isToday
                            ? "bg-sky-50/70 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300"
                            : ""
                          }`}
                      >
                        <div className="font-semibold">
                          {day.weekday} · {day.shortLabel}
                        </div>
                        {day.isToday && (
                          <div className="text-[10px] font-normal">Hôm nay</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixStores.map((store) => {
                    const fixed = data.masterFixedPlans.find(
                      (m) =>
                        m.storeId === store.id &&
                        m.ingredientId === activeIngredientId,
                    );
                    return (
                      <tr key={store.id}>
                        <td className="sticky left-0 bg-[var(--surface)] z-10 border-r border-[var(--border)]">
                          <div className="font-semibold text-[var(--text)]">
                            {store.id} · {store.name}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {fixed
                              ? `Cố định: ${formatNumber(fixed.fixedQuantity)} ${fixed.unit} (${fixed.fixedCupsPerDay} ly)`
                              : "Chưa đặt định mức cố định"}
                          </div>
                        </td>
                        {visibleDays.map((day) => {
                          const cell = getCellData(
                            store.id,
                            activeIngredientId,
                            day.iso,
                          );
                          const isSelected =
                            selectedCell?.storeId === store.id &&
                            selectedCell?.dateISO === day.iso &&
                            selectedCell?.ingredientId === activeIngredientId;
                          const hasTemp = cell.extraQty > 0;
                          return (
                            <td
                              key={day.iso}
                              className={`text-center p-1.5 cursor-pointer transition-colors ${isSelected
                                  ? "ring-2 ring-inset ring-sky-500 bg-sky-50 dark:bg-sky-950/40"
                                  : hasTemp
                                    ? "bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/60"
                                    : "hover:bg-[var(--background)]"
                                }`}
                              onClick={() =>
                                setSelectedCell({
                                  storeId: store.id,
                                  dateISO: day.iso,
                                  ingredientId: activeIngredientId,
                                })
                              }
                            >
                              <div className="font-semibold tabular-nums text-[var(--text)]">
                                {formatNumber(cell.totalQty)}
                              </div>
                              {hasTemp ? (
                                <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                                  +{formatNumber(cell.extraQty)} (tạm)
                                </div>
                              ) : (
                                <div className="text-[10px] text-[var(--muted)]">
                                  cố định
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Central Kitchen Summary Row */}
                  <tr className="bg-[var(--background)] font-semibold border-t-2 border-[var(--border)]">
                    <td className="sticky left-0 bg-[var(--background)] z-10 border-r border-[var(--border)]">
                      <div className="text-[var(--heading-color)]">
                        TỔNG KHO TỔNG CHUẨN BỊ
                      </div>
                      <div className="text-[11px] font-normal text-[var(--muted)]">
                        Đơn vị: {activeIngredient?.baseUnit ?? "ml"} (Cố định + Tạm thời)
                      </div>
                    </td>
                    {centralDailyTotals.map((col) => (
                      <td
                        key={col.dateISO}
                        className="text-center tabular-nums text-[var(--heading-color)]"
                      >
                        <div>{formatNumber(col.totalSum)}</div>
                        {col.tempSum > 0 && (
                          <div className="text-[10px] text-sky-600 dark:text-sky-400">
                            (gồm +{formatNumber(col.tempSum)})
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TWO-STREAM INGREDIENT HIERARCHY (F0 -> F1 -> Món & F0 -> Món) */}
      {ui.tab === "hierarchy" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stream 1: F0 -> F1 -> Món */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--heading-color)]">
                  Luồng 1 · Nguyên liệu thô F0 → Bán thành phẩm F1 → Món
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Ví dụ chuẩn: Trà + Sữa (F0) → Cốt trà sữa (F1) → Hồng trà sữa / Lục trà kem cheese (Món)
                </p>
              </div>
              <StatusPill label={`${f1Ingredients.length} bán TP F1`} tone="info" />
            </div>

            <div className="space-y-3">
              {f1Ingredients.map((f1) => {
                const prepRec = data.recipes.find(
                  (r) => r.kind === "prep" && r.outputIngredientId === f1.id,
                );
                const linkedDrinks = data.recipes.filter(
                  (r) =>
                    r.kind === "drink" &&
                    r.status === "approved" &&
                    r.ingredients.some((l) => l.ingredientId === f1.id),
                );
                return (
                  <div
                    key={f1.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs">
                      {/* F0 */}
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                        <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
                          F0 · Kho Tổng
                        </div>
                        {(f1.parentF0Items ?? []).length === 0 ? (
                          <div className="text-[var(--muted)] mt-0.5">Theo công thức mẻ</div>
                        ) : (
                          (f1.parentF0Items ?? []).map((p) => {
                            const f0Ing = getIngredient(data, p.ingredientId);
                            return (
                              <div key={p.ingredientId} className="mt-0.5 font-medium text-[var(--text)]">
                                {f0Ing?.name ?? p.ingredientId}{" "}
                                <span className="text-[var(--muted)] tabular-nums">
                                  ({formatNumber(p.quantityPerBatch)} {p.unit})
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* F1 */}
                      <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 p-2">
                        <div className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
                          F1 · Bếp trung tâm
                        </div>
                        <div className="font-semibold text-[var(--heading-color)] mt-0.5">
                          {f1.name}
                        </div>
                        {prepRec && (
                          <div className="text-[11px] text-[var(--muted)] tabular-nums">
                            1 mẻ thu {formatNumber(prepRec.yieldQuantity)} {prepRec.yieldUnit}
                          </div>
                        )}
                      </div>

                      {/* Dishes */}
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                        <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                          Món bán tại quầy ({linkedDrinks.length})
                        </div>
                        {linkedDrinks.slice(0, 3).map((rec) => {
                          const prod = data.products.find((p) => p.id === rec.productId);
                          const usage = rec.ingredients.find(
                            (l) => l.ingredientId === f1.id,
                          );
                          return (
                            <div key={rec.id} className="mt-0.5 text-[11px] text-[var(--text)] truncate">
                              • {prod?.name ?? rec.code} ({rec.size}):{" "}
                              <strong className="tabular-nums">
                                {formatNumber(usage?.quantity ?? 0)} {usage?.unit}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Stream 2: F0 -> Món trực tiếp */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--heading-color)]">
                  Luồng 2 · Nguyên liệu F0 → Món trực tiếp (Không qua F1)
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Ví dụ chuẩn: Thạch đào ăn liền / Syrup đào / Ly nhựa (F0) xuất thẳng về quầy chi nhánh
                </p>
              </div>
              <StatusPill label={`${f0DirectIngredients.length} mặt hàng`} tone="success" />
            </div>

            <div className="space-y-3">
              {f0DirectIngredients.map((f0) => {
                const linkedDrinks = data.recipes.filter(
                  (r) =>
                    r.kind === "drink" &&
                    r.ingredients.some((l) => l.ingredientId === f0.id),
                );
                return (
                  <div
                    key={f0.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center text-xs">
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5">
                        <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                          F0 · Xuất thẳng Kho Tổng → Quầy
                        </div>
                        <div className="font-semibold text-[var(--heading-color)] mt-0.5">
                          {f0.code} · {f0.name}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          {f0.thresholdRuleText}
                        </div>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                        <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
                          Món sử dụng trực tiếp ({linkedDrinks.length})
                        </div>
                        {linkedDrinks.length === 0 ? (
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            Dùng chung theo bộ phận đóng gói / quầy pha chế
                          </div>
                        ) : (
                          linkedDrinks.slice(0, 4).map((rec) => {
                            const prod = data.products.find((p) => p.id === rec.productId);
                            const usage = rec.ingredients.find(
                              (l) => l.ingredientId === f0.id,
                            );
                            return (
                              <div key={rec.id} className="mt-0.5 text-[11px] text-[var(--text)] truncate">
                                • {prod?.name ?? rec.code} ({rec.size}):{" "}
                                <strong className="tabular-nums">
                                  {formatNumber(usage?.quantity ?? 0)} {usage?.unit}/ly
                                </strong>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: DISTRIBUTION & OVERRIDE HISTORY */}
      {ui.tab === "history" && (
        <section className="card p-0 overflow-hidden">
          <div className="p-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<"all" | DistributionHistoryItem["actionType"]>
                value={ui.historyActionFilter}
                onChange={(next) =>
                  setUi((p) => ({ ...p, historyActionFilter: next }))
                }
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "periodic", label: "Định kỳ cố định" },
                  { value: "temp_shortage", label: "Bổ sung tạm thời" },
                  { value: "promote_to_fixed", label: "Đã chuyển cố định" },
                ]}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={exportHistoryCsv}
            >
              Xuất CSV lịch sử
            </button>
          </div>

          {filteredHistory.length === 0 ? (
            <EmptyState title="Chưa có lịch sử phân phối phù hợp bộ lọc." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Ngày &amp; Phiếu</th>
                    <th>Chi nhánh</th>
                    <th>Nguyên liệu</th>
                    <th className="text-right">Cố định gốc</th>
                    <th className="text-right">Tạm thời (+)</th>
                    <th className="text-right">Tổng đã cấp</th>
                    <th>Loại biến động</th>
                    <th>Người thực hiện &amp; Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => {
                    const ing = getIngredient(data, item.ingredientId);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="font-mono font-semibold text-[var(--text)]">
                            {item.ticketCode}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {formatDate(item.date)}
                          </div>
                        </td>
                        <td className="font-semibold">{item.storeId}</td>
                        <td>{ing?.name ?? item.ingredientId}</td>
                        <td className="text-right tabular-nums">
                          {formatNumber(item.fixedQuantity)} {item.unit}
                        </td>
                        <td className="text-right tabular-nums text-sky-600 dark:text-sky-400 font-medium">
                          {item.tempExtraQuantity > 0
                            ? `+${formatNumber(item.tempExtraQuantity)} ${item.unit}`
                            : "—"}
                        </td>
                        <td className="text-right tabular-nums font-bold text-[var(--heading-color)]">
                          {formatNumber(item.totalDispatched)} {item.unit}
                        </td>
                        <td>
                          <StatusPill
                            label={ACTION_LABEL[item.actionType]}
                            tone={ACTION_TONE[item.actionType]}
                          />
                        </td>
                        <td className="max-w-[260px]">
                          <div className="font-medium text-[var(--text)]">
                            {item.actor}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] truncate" title={item.note}>
                            {item.note}
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
      )}

      {/* TAB 4: PER-SHIFT DISTRIBUTION PLANS */}
      {ui.tab === "shifts" && (
        <section className="card p-0 overflow-hidden">
          <div className="p-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div className="text-xs text-[var(--muted)]">
              Quản lý đề xuất cấp hàng theo từng ca giao nhận tại chi nhánh
            </div>
            {canEditPlans && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShiftPlanDrawerOpen(true)}
              >
                + Tạo kế hoạch ca
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Mã KH</th>
                  <th>Chi nhánh &amp; Ca</th>
                  <th>Số ly dự kiến</th>
                  <th>Chi tiết nguyên liệu</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.plans
                  .filter(
                    (p) => activeBranch === "ALL" || p.storeId === activeBranch,
                  )
                  .map((plan) => (
                    <tr key={plan.id}>
                      <td className="font-mono font-semibold">{plan.code}</td>
                      <td>
                        <div className="font-semibold">{plan.storeId}</div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {formatDate(plan.date)} · {plan.shift}
                        </div>
                      </td>
                      <td className="tabular-nums font-medium">
                        {formatNumber(plan.expectedCups)} ly
                      </td>
                      <td>
                        {plan.lines.map((l) => {
                          const ing = getIngredient(data, l.ingredientId);
                          return (
                            <div key={l.id}>
                              {ing?.name ?? l.ingredientId}:{" "}
                              <strong className="tabular-nums">
                                {formatNumber(l.quantity)} {l.unit}
                              </strong>
                            </div>
                          );
                        })}
                        <div className="text-[11px] text-[var(--muted)]">
                          {plan.note}
                        </div>
                      </td>
                      <td>
                        <StatusPill
                          label={PLAN_STATUS_LABEL[plan.status]}
                          tone={PLAN_STATUS_TONE[plan.status]}
                        />
                      </td>
                      <td className="text-right">
                        {plan.status === "draft" && canEditPlans && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSendPlanForApproval(plan)}
                          >
                            Gửi duyệt
                          </button>
                        )}
                        {plan.status === "pending" && !branchScope && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApproveShiftPlan(plan)}
                          >
                            Duyệt cấp
                          </button>
                        )}
                        {plan.status === "approved" && (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            Đã chốt cấp phát
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SideDrawer 1: Report Shortage / Add Temporary Override */}
      <SideDrawer
        isOpen={tempDrawerOpen}
        onClose={() => setTempDrawerOpen(false)}
        title="Báo thiếu / Điều chỉnh tăng tạm thời"
        subtitle="Chỉ cộng thêm vào khoảng ngày chọn, tự động quay về kế hoạch cố định khi hết hạn"
        widthClass="max-w-[520px]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTempDrawerOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="temp-override-form"
              className="btn btn-primary"
            >
              Lưu điều chỉnh tạm thời
            </button>
          </div>
        }
      >
        <form
          id="temp-override-form"
          onSubmit={handleSaveTempOverride}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="temp-store">
                Chi nhánh *
              </label>
              <select
                id="temp-store"
                className="form-input form-select"
                value={tempForm.storeId}
                disabled={Boolean(branchScope)}
                onChange={(e) =>
                  setTempForm((cur) => ({ ...cur, storeId: e.target.value }))
                }
              >
                {data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="temp-ing">
                Nguyên liệu cần thêm *
              </label>
              <select
                id="temp-ing"
                className="form-input form-select"
                value={tempForm.ingredientId}
                onChange={(e) =>
                  setTempForm((cur) => ({
                    ...cur,
                    ingredientId: e.target.value,
                  }))
                }
              >
                {plannedIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.baseUnit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="temp-cups">
                Số ly tăng thêm dự kiến
              </label>
              <input
                id="temp-cups"
                type="number"
                min={0}
                className="form-input tabular-nums"
                value={tempForm.extraCups}
                onChange={(e) => {
                  const cups = Number(e.target.value) || 0;
                  const fixed = data.masterFixedPlans.find(
                    (m) =>
                      m.storeId === tempForm.storeId &&
                      m.ingredientId === tempForm.ingredientId,
                  );
                  const perCup =
                    fixed && fixed.fixedCupsPerDay > 0
                      ? Math.round(fixed.fixedQuantity / fixed.fixedCupsPerDay)
                      : 180;
                  setTempForm((cur) => ({
                    ...cur,
                    extraCups: e.target.value,
                    extraQuantity: String(cups * perCup),
                  }));
                }}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="temp-qty">
                Lượng thêm ({" "}
                {getIngredient(data, tempForm.ingredientId)?.baseUnit ?? "ml"} ) *
              </label>
              <input
                id="temp-qty"
                type="number"
                min={1}
                className="form-input tabular-nums"
                value={tempForm.extraQuantity}
                onChange={(e) =>
                  setTempForm((cur) => ({
                    ...cur,
                    extraQuantity: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div>
            <div className="form-label mb-1.5">Thời lượng hiệu lực *</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(
                [
                  ["1d", "Ngày mai (1 ngày)"],
                  ["3d", "3 ngày tới"],
                  ["7d", "7 ngày tới"],
                  ["custom", "Tùy chọn ngày"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyTempPreset(key)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${tempForm.preset === key
                      ? "bg-sky-600 text-white border-sky-600 font-medium"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--text)]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--muted)]" htmlFor="temp-start">
                  Từ ngày
                </label>
                <input
                  id="temp-start"
                  type="date"
                  className="form-input mt-0.5"
                  value={tempForm.startDate}
                  onChange={(e) =>
                    setTempForm((cur) => ({
                      ...cur,
                      preset: "custom",
                      startDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted)]" htmlFor="temp-end">
                  Đến hết ngày
                </label>
                <input
                  id="temp-end"
                  type="date"
                  min={tempForm.startDate}
                  className="form-input mt-0.5"
                  value={tempForm.endDate}
                  onChange={(e) =>
                    setTempForm((cur) => ({
                      ...cur,
                      preset: "custom",
                      endDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="temp-reason">
              Lý do điều chỉnh *
            </label>
            <input
              id="temp-reason"
              className="form-input"
              placeholder="Ví dụ: Cuối tuần nắng nóng lượng khách tăng, hôm nay quầy báo thiếu..."
              value={tempForm.reason}
              onChange={(e) =>
                setTempForm((cur) => ({ ...cur, reason: e.target.value }))
              }
              required
            />
          </div>

          {/* Non-mutating Guarantee Banner */}
          {(() => {
            const fixed = data.masterFixedPlans.find(
              (m) =>
                m.storeId === tempForm.storeId &&
                m.ingredientId === tempForm.ingredientId,
            );
            const ing = getIngredient(data, tempForm.ingredientId);
            const unit = ing?.baseUnit ?? "ml";
            const base = fixed?.fixedQuantity ?? 0;
            const extra = Number(tempForm.extraQuantity) || 0;
            return (
              <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 p-3 text-xs space-y-1">
                <div className="font-semibold text-[var(--heading-color)]">
                  Xem trước ảnh hưởng (Bảo toàn kế hoạch cố định):
                </div>
                <div>
                  • Định mức cố định gốc:{" "}
                  <strong className="tabular-nums">
                    {formatNumber(base)} {unit}/ngày
                  </strong>{" "}
                  (Không thay đổi)
                </div>
                <div>
                  • Trong {formatDate(tempForm.startDate)} →{" "}
                  {formatDate(tempForm.endDate)}:{" "}
                  <strong className="text-sky-600 tabular-nums">
                    {formatNumber(base + extra)} {unit}/ngày (+{formatNumber(extra)})
                  </strong>
                </div>
                <div className="text-[var(--muted)]">
                  • Sau ngày {formatDate(tempForm.endDate)}: Tự động quay về{" "}
                  {formatNumber(base)} {unit}/ngày.
                </div>
              </div>
            );
          })()}
        </form>
      </SideDrawer>

      {/* SideDrawer 2: Edit Master Fixed Plan */}
      <SideDrawer
        isOpen={fixedDrawerOpen}
        onClose={() => setFixedDrawerOpen(false)}
        title="Đặt / Cập nhật Kế hoạch cố định gốc"
        subtitle="Thiết lập định mức phân phối mặc định hằng ngày tại Kho Tổng"
        widthClass="max-w-[480px]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFixedDrawerOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="fixed-plan-form"
              className="btn btn-primary"
            >
              Lưu kế hoạch cố định
            </button>
          </div>
        }
      >
        <form
          id="fixed-plan-form"
          onSubmit={handleSaveFixedPlan}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="fix-store">
                Chi nhánh *
              </label>
              <select
                id="fix-store"
                className="form-input form-select"
                value={fixedForm.storeId}
                onChange={(e) =>
                  setFixedForm((cur) => ({ ...cur, storeId: e.target.value }))
                }
              >
                {data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="fix-ing">
                Nguyên liệu *
              </label>
              <select
                id="fix-ing"
                className="form-input form-select"
                value={fixedForm.ingredientId}
                onChange={(e) =>
                  setFixedForm((cur) => ({
                    ...cur,
                    ingredientId: e.target.value,
                  }))
                }
              >
                {data.ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.baseUnit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="fix-cups">
                Sản lượng ly chuẩn/ngày *
              </label>
              <input
                id="fix-cups"
                type="number"
                min={1}
                className="form-input tabular-nums"
                value={fixedForm.fixedCupsPerDay}
                onChange={(e) =>
                  setFixedForm((cur) => ({
                    ...cur,
                    fixedCupsPerDay: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="fix-qty">
                Định mức cố định/ngày *
              </label>
              <input
                id="fix-qty"
                type="number"
                min={1}
                className="form-input tabular-nums"
                value={fixedForm.fixedQuantity}
                onChange={(e) =>
                  setFixedForm((cur) => ({
                    ...cur,
                    fixedQuantity: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="fix-ratio">
              Quy cách tỷ lệ chuẩn *
            </label>
            <input
              id="fix-ratio"
              className="form-input"
              value={fixedForm.ratioPerCupLabel}
              onChange={(e) =>
                setFixedForm((cur) => ({
                  ...cur,
                  ratioPerCupLabel: e.target.value,
                }))
              }
              required
            />
          </div>
        </form>
      </SideDrawer>

      {/* SideDrawer 3: Create Per-Shift Plan */}
      <SideDrawer
        isOpen={shiftPlanDrawerOpen}
        onClose={() => setShiftPlanDrawerOpen(false)}
        title="Tạo kế hoạch cấp hàng theo ca"
        widthClass="max-w-[460px]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShiftPlanDrawerOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="shift-plan-form"
              className="btn btn-primary"
            >
              Lưu kế hoạch ca
            </button>
          </div>
        }
      >
        <form
          id="shift-plan-form"
          onSubmit={handleCreateShiftPlan}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="sp-store">
                Chi nhánh
              </label>
              <select
                id="sp-store"
                className="form-input form-select"
                disabled={Boolean(branchScope)}
                value={shiftForm.storeId}
                onChange={(e) =>
                  setShiftForm((cur) => ({ ...cur, storeId: e.target.value }))
                }
              >
                {data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="sp-shift">
                Ca giao nhận
              </label>
              <select
                id="sp-shift"
                className="form-input form-select"
                value={shiftForm.shift}
                onChange={(e) =>
                  setShiftForm((cur) => ({
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="sp-date">
                Ngày giao
              </label>
              <input
                id="sp-date"
                type="date"
                className="form-input"
                value={shiftForm.date}
                onChange={(e) =>
                  setShiftForm((cur) => ({ ...cur, date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label" htmlFor="sp-cups">
                Số ly dự kiến
              </label>
              <input
                id="sp-cups"
                type="number"
                min={1}
                className="form-input tabular-nums"
                value={shiftForm.expectedCups}
                onChange={(e) =>
                  setShiftForm((cur) => ({
                    ...cur,
                    expectedCups: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="sp-ing">
                Nguyên liệu
              </label>
              <select
                id="sp-ing"
                className="form-input form-select"
                value={shiftForm.ingredientId}
                onChange={(e) =>
                  setShiftForm((cur) => ({
                    ...cur,
                    ingredientId: e.target.value,
                  }))
                }
              >
                {data.ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.baseUnit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="sp-qty">
                Số lượng yêu cầu
              </label>
              <input
                id="sp-qty"
                type="number"
                min={1}
                className="form-input tabular-nums"
                value={shiftForm.quantity}
                onChange={(e) =>
                  setShiftForm((cur) => ({ ...cur, quantity: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="sp-note">
              Ghi chú
            </label>
            <input
              id="sp-note"
              className="form-input"
              value={shiftForm.note}
              onChange={(e) =>
                setShiftForm((cur) => ({ ...cur, note: e.target.value }))
              }
            />
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
