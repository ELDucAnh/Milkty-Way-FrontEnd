import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import {
  ConfirmInline,
  EmptyState,
  FilterBar,
  HighlightText,
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
import {
  homePath,
  isCashier,
  isWarehouse,
  scopedBranch,
  sessionUser,
} from "../../utils/auth";
import {
  getIngredient,
  getStore,
  theoreticalBalance,
  type BranchStaffMember,
  type ReconciliationLine,
  type ReconciliationStatus,
  type Shift,
  type ShiftReconciliation,
} from "../shared/business-demo";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getTodayISO,
  makeId,
  sumBy,
} from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";

type RecSortKey = "date-desc" | "date-asc" | "variance-desc";

const SORT_OPTIONS: SortOption<RecSortKey>[] = [
  { key: "date-desc", label: "Mới nhất", fieldLabel: "Ngày đối soát" },
  { key: "date-asc", label: "Cũ nhất", fieldLabel: "Ngày đối soát" },
  {
    key: "variance-desc",
    label: "Chênh lệch nhiều → ít",
    fieldLabel: "Giá trị chênh lệch",
  },
];

const STATUS_LABEL: Record<ReconciliationStatus, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã chốt & khóa",
};

const STATUS_TONE: Record<ReconciliationStatus, PillTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
};

const VARIANCE_REASONS = [
  "Hao hụt bán thành phẩm cuối ca",
  "Pha chế lỗi / Đổ vỡ",
  "Sai lệch kiểm đếm",
  "Chưa kịp nhập phiếu ca trước",
];

const HANDOVER_REASONS = [
  "Đổi ca giữa ngày theo lịch phân công",
  "Nhân viên mở ca hỗ trợ quầy phụ",
  "Ca trưởng đồng kiểm cuối ca",
];

export default function ShiftReconciliationPage() {
  const toast = useToast();
  const [data, setData] = useDemoState();
  const branchScope = scopedBranch();
  const currentUser = sessionUser();
  const today = getTodayISO();

  const isAdminOversight = !branchScope && !isWarehouse() && !isCashier();
  const canOperateBranch = Boolean(branchScope) && !isCashier();

  const [ui, setUi] = usePageUiState<{
    branch: string;
    tab: "all" | ReconciliationStatus;
    search: string;
    sortBy: RecSortKey;
    density: "normal" | "compact";
  }>("mw_ui_shift_rec_v1", {
    branch: branchScope ?? "ALL",
    tab: "all",
    search: "",
    sortBy: "date-desc",
    density: "normal",
  });

  const activeBranch = branchScope ?? ui.branch;

  // View / Edit / Create SideDrawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<ShiftReconciliation | null>(null);
  const [readOnlyView, setReadOnlyView] = useState(false);

  const [form, setForm] = useState<{
    storeId: string;
    date: string;
    shift: Shift;
    opener: string;
    counter: string;
    approver: string;
    note: string;
    handoverMismatchReason: string;
    lines: ReconciliationLine[];
  }>({
    storeId: branchScope ?? "CN05",
    date: today,
    shift: "Ca chiều",
    opener: "",
    counter: "",
    approver: "",
    note: "",
    handoverMismatchReason: "",
    lines: [],
  });

  // Admin staff management drawer state
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [staffBranchFilter, setStaffBranchFilter] = useState<string>("CN05");
  const [newStaffForm, setNewStaffForm] = useState<{
    name: string;
    role: BranchStaffMember["role"];
    phone: string;
    storeId: string;
  }>({
    name: "",
    role: "Thu ngân",
    phone: "",
    storeId: "CN05",
  });

  function buildSessionLines(storeId: string): ReconciliationLine[] {
    const snapshots = data.countSnapshots.filter(
      (s) => s.position === "counter" && s.locationId === storeId,
    );
    if (snapshots.length > 0) {
      return snapshots.map((snap) => ({
        id: makeId("recl"),
        ingredientId: snap.ingredientId,
        lotId: snap.lotId,
        opening: snap.opening,
        received: snap.received,
        actualUse: snap.actualUse,
        waste: snap.waste,
        counted: theoreticalBalance(
          snap.opening,
          snap.received,
          snap.actualUse,
          snap.waste,
        ),
        unitCost: snap.unitCost,
        reason: "",
      }));
    }

    const storeLots = data.lots.filter(
      (l) => l.location === "counter" && l.locationId === storeId && l.quantity > 0,
    );
    return storeLots.map((lot) => ({
      id: makeId("recl"),
      ingredientId: lot.ingredientId,
      lotId: lot.id,
      opening: lot.quantity,
      received: 0,
      actualUse: 0,
      waste: 0,
      counted: lot.quantity,
      unitCost: lot.unitCost,
      reason: "",
    }));
  }

  function getStaffForStore(storeId: string): BranchStaffMember[] {
    return data.branchStaff.filter((s) => s.storeId === storeId && s.active);
  }

  function defaultRolesForStore(storeId: string) {
    const staff = getStaffForStore(storeId);
    const opener =
      staff.find((s) => s.role === "Thu ngân")?.name ?? staff[0]?.name ?? "";
    const counter =
      staff.find((s) => s.role === "Thu ngân" || s.role === "Pha chế")?.name ??
      staff[0]?.name ??
      "";
    const approverPool = staff.filter(
      (s) =>
        s.name !== counter &&
        (s.role === "Quản lý chi nhánh" || s.role === "Ca trưởng"),
    );
    const approver =
      approverPool[0]?.name ??
      staff.find((s) => s.name !== counter)?.name ??
      "";
    return { opener, counter, approver };
  }

  function openCreateDrawer() {
    const targetStore = branchScope ?? (activeBranch !== "ALL" ? activeBranch : "CN05");
    const roles = defaultRolesForStore(targetStore);
    setEditingRec(null);
    setReadOnlyView(false);
    setForm({
      storeId: targetStore,
      date: today,
      shift: "Ca chiều",
      opener: roles.opener,
      counter: roles.counter,
      approver: roles.approver,
      note: "",
      handoverMismatchReason: "",
      lines: buildSessionLines(targetStore),
    });
    setDrawerOpen(true);
  }

  function openExistingDrawer(rec: ShiftReconciliation, forceReadOnly: boolean) {
    setEditingRec(rec);
    setReadOnlyView(
      forceReadOnly || rec.status === "approved" || !canOperateBranch,
    );
    setForm({
      storeId: rec.storeId,
      date: rec.date,
      shift: rec.shift,
      opener: rec.opener,
      counter: rec.counter,
      approver: rec.approver,
      note: rec.note,
      handoverMismatchReason: rec.handoverMismatchReason ?? "",
      lines: rec.lines.map((l) => ({ ...l })),
    });
    setDrawerOpen(true);
  }

  // Enrich rows with variance & mismatch metadata, strictly respecting scopedBranch()
  const scopedReconciliations = useMemo(() => {
    return data.reconciliations.filter((rec) => {
      if (branchScope) return rec.storeId === branchScope;
      if (activeBranch !== "ALL") return rec.storeId === activeBranch;
      return true;
    });
  }, [data.reconciliations, branchScope, activeBranch]);

  const tabCounts = useMemo(() => {
    let draft = 0;
    let pending = 0;
    let approved = 0;
    for (const r of scopedReconciliations) {
      if (r.status === "draft") draft += 1;
      else if (r.status === "pending") pending += 1;
      else approved += 1;
    }
    return {
      all: scopedReconciliations.length,
      draft,
      pending,
      approved,
    };
  }, [scopedReconciliations]);

  const enrichedRows = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    const list = scopedReconciliations
      .filter((rec) => {
        if (ui.tab !== "all" && rec.status !== ui.tab) return false;
        if (q) {
          const blob = normalizeVi(
            `${rec.storeId} ${rec.date} ${rec.shift} ${rec.opener} ${rec.counter} ${rec.approver} ${rec.note}`,
          );
          if (!blob.includes(q)) return false;
        }
        return true;
      })
      .map((rec) => {
        const varianceValue = sumBy(rec.lines, (l) => {
          const theo = theoreticalBalance(l.opening, l.received, l.actualUse, l.waste);
          return Math.abs(theo - l.counted) * l.unitCost;
        });
        const totalDiffQty = sumBy(rec.lines, (l) => {
          const theo = theoreticalBalance(l.opening, l.received, l.actualUse, l.waste);
          return theo - l.counted;
        });
        const hasMismatchPerson =
          Boolean(rec.opener) && Boolean(rec.counter) && rec.opener !== rec.counter;
        return {
          rec,
          varianceValue,
          totalDiffQty,
          hasMismatchPerson,
        };
      });

    list.sort((a, b) => {
      if (ui.sortBy === "date-desc") return b.rec.date.localeCompare(a.rec.date);
      if (ui.sortBy === "date-asc") return a.rec.date.localeCompare(b.rec.date);
      return b.varianceValue - a.varianceValue;
    });
    return list;
  }, [scopedReconciliations, ui.tab, ui.search, ui.sortBy]);

  // Save Draft or Pending
  function saveRecord(targetStatus: "draft" | "pending") {
    if (form.lines.length === 0) {
      toast.error("Chi nhánh này chưa có nguyên liệu quầy để kiểm kê.");
      return;
    }
    const mismatch = form.opener !== form.counter;
    if (mismatch && !form.handoverMismatchReason.trim()) {
      toast.error(
        "Người mở ca khác người kiểm kê cuối ca — vui lòng ghi rõ lý do bàn giao.",
      );
      return;
    }
    if (!form.opener || !form.counter || !form.approver) {
      toast.error("Vui lòng chọn đầy đủ nhân sự Mở ca, Đóng/Kiểm kê và Người duyệt.");
      return;
    }

    const payload: ShiftReconciliation = {
      id: editingRec?.id ?? makeId("rec"),
      date: form.date,
      storeId: form.storeId,
      shift: form.shift,
      opener: form.opener,
      counter: form.counter,
      approver: form.approver,
      status: targetStatus,
      note: form.note.trim(),
      handoverMismatchReason: mismatch
        ? form.handoverMismatchReason.trim()
        : undefined,
      lines: form.lines,
    };

    setData((current) => {
      const exists = current.reconciliations.some((r) => r.id === payload.id);
      const next = exists
        ? current.reconciliations.map((r) => (r.id === payload.id ? payload : r))
        : [payload, ...current.reconciliations];
      return { ...current, reconciliations: next };
    });

    setDrawerOpen(false);
    toast.success(
      targetStatus === "draft"
        ? "Đã lưu nháp biên bản đối soát cuối ca."
        : `Đã gửi duyệt biên bản đối soát ${form.storeId} (${form.shift}).`,
    );
  }

  function handleDeleteRec(rec: ShiftReconciliation) {
    if (rec.status === "approved") {
      toast.error("Biên bản đã chốt duyệt bị khóa vĩnh viễn — không thể xóa.");
      return;
    }
    setData((current) => ({
      ...current,
      reconciliations: current.reconciliations.filter((r) => r.id !== rec.id),
    }));
    toast.info(`Đã xóa biên bản ${rec.shift} ngày ${formatDate(rec.date)}.`);
  }

  function handleApproveRec(rec: ShiftReconciliation) {
    if (rec.status === "approved") return;
    if (rec.counter === rec.approver) {
      toast.error("Người kiểm đếm không thể đồng thời tự duyệt chốt ca.");
      return;
    }

    setData((current) => {
      const nextSnapshots = current.countSnapshots.map((snap) => {
        const line = rec.lines.find(
          (l) => l.lotId === snap.lotId || l.ingredientId === snap.ingredientId,
        );
        if (!line || snap.locationId !== rec.storeId) return snap;
        return {
          ...snap,
          opening: line.counted,
          received: 0,
          actualUse: 0,
          waste: 0,
        };
      });

      const nextLots = current.lots.map((lot) => {
        if (lot.location !== "counter" || lot.locationId !== rec.storeId) return lot;
        const line = rec.lines.find((l) => l.lotId === lot.id);
        if (!line) return lot;
        return { ...lot, quantity: line.counted };
      });

      const nextRecs = current.reconciliations.map((r) =>
        r.id === rec.id
          ? {
            ...r,
            status: "approved" as const,
            approvedAt: today,
          }
          : r,
      );

      return {
        ...current,
        countSnapshots: nextSnapshots,
        lots: nextLots,
        reconciliations: nextRecs,
      };
    });

    setDrawerOpen(false);
    toast.success(
      `Đã duyệt chốt & cập nhật tồn kho quầy ${rec.storeId}. Biên bản đã được khóa cứng!`,
    );
  }

  function exportCsv() {
    const header =
      "Ngay,Ca,Chi nhanh,Nguoi mo ca,Nguoi kiem ke,Nguoi duyet,Ly do giao ca,Chenh lech VND,Trang thai";
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = enrichedRows.map(({ rec, varianceValue }) =>
      [
        rec.date,
        esc(rec.shift),
        rec.storeId,
        esc(rec.opener),
        esc(rec.counter),
        esc(rec.approver),
        esc(rec.handoverMismatchReason ?? ""),
        varianceValue,
        esc(STATUS_LABEL[rec.status]),
      ].join(","),
    );
    const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doi-soat-ca-${activeBranch}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất báo cáo đối soát ca (.CSV).");
  }

  // Admin staff transfer / add
  function handleTransferStaff(staffId: string, nextStoreId: string) {
    setData((current) => ({
      ...current,
      branchStaff: current.branchStaff.map((s) =>
        s.id === staffId ? { ...s, storeId: nextStoreId } : s,
      ),
    }));
    toast.success(`Đã điều chuyển nhân sự sang chi nhánh ${nextStoreId}.`);
  }

  function handleAddStaff(e: FormEvent) {
    e.preventDefault();
    if (!newStaffForm.name.trim()) return;
    const seq = String(data.branchStaff.length + 1).padStart(2, "0");
    const created: BranchStaffMember = {
      id: makeId("st"),
      code: `NV-${newStaffForm.storeId}-${seq}`,
      name: newStaffForm.name.trim(),
      role: newStaffForm.role,
      storeId: newStaffForm.storeId,
      phone: newStaffForm.phone.trim() || "0900 000 000",
      active: true,
    };
    setData((current) => ({
      ...current,
      branchStaff: [created, ...current.branchStaff],
    }));
    setNewStaffForm((cur) => ({ ...cur, name: "", phone: "" }));
    toast.success(`Đã thêm ${created.name} vào chi nhánh ${created.storeId}.`);
  }

  const formStaff = getStaffForStore(form.storeId);
  const approverOptions = formStaff.filter(
    (s) =>
      s.name !== form.counter &&
      (s.role === "Quản lý chi nhánh" || s.role === "Ca trưởng"),
  );
  const fallbackApproverOptions =
    approverOptions.length > 0
      ? approverOptions
      : formStaff.filter((s) => s.name !== form.counter);
  const isFormMismatch =
    Boolean(form.opener) && Boolean(form.counter) && form.opener !== form.counter;

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Cửa hàng &amp; Quầy bar</span>
            <span className="sep">/</span>
            <span className="current">Đối soát kiểm kê cuối ca</span>
          </nav>
          <h1 className="page-title">Đối soát nguyên liệu cuối ca</h1>
          <p className="page-subtitle">
            Kiểm kê thực tế cuối ca theo từng chi nhánh, xác thực người bàn giao và khóa cứng biên bản sau duyệt.
          </p>
        </div>

        <div className="page-header-actions flex-wrap">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportCsv}
          >
            Xuất CSV
          </button>
          {isAdminOversight && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setStaffBranchFilter(activeBranch !== "ALL" ? activeBranch : "CN05");
                setStaffDrawerOpen(true);
              }}
            >
              Phân công nhân sự
            </button>
          )}
          {canOperateBranch && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateDrawer}
            >
              + Lập đối soát cuối ca
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
          allLabel="Toàn chuỗi (Giám sát)"
        />
        <InfoTip
          title="Quy tắc kiểm kê & chốt ca"
          summary={
            isAdminOversight
              ? "Quản trị chuỗi xem toàn bộ lịch sử đối soát và phân công nhân sự các chi nhánh. Quản lý từng chi nhánh chịu trách nhiệm lập và chốt ca của đúng chi nhánh mình. Biên bản Đã chốt được khóa cứng."
              : "Nhân sự Mở ca / Kiểm kê / Người duyệt phải thuộc đúng chi nhánh hiện tại và Người duyệt khác Người đếm. Biên bản đã chốt sẽ khóa cứng để bảo toàn lịch sử."
          }
        />
      </div>

      {/* Stat Cards (app.css .stat-card) */}
      <KpiStrip
        items={[
          {
            key: "all",
            label: "Tổng biên bản",
            value: String(tabCounts.all),
            subLabel: "Trong phạm vi hiển thị",
            icon: "clipboard",
            tone: "primary",
            active: ui.tab === "all",
            onClick: () => setUi((p) => ({ ...p, tab: "all" })),
          },
          {
            key: "pending",
            label: "Chờ quản lý duyệt",
            value: String(tabCounts.pending),
            subLabel: "Cần xác nhận chốt ca",
            icon: "clock",
            tone: "warning",
            valueTone: tabCounts.pending > 0 ? "warning" : "default",
            active: ui.tab === "pending",
            onClick: () =>
              setUi((p) => ({
                ...p,
                tab: p.tab === "pending" ? "all" : "pending",
              })),
          },
          {
            key: "draft",
            label: "Bản nháp",
            value: String(tabCounts.draft),
            subLabel: "Có thể chỉnh sửa hoặc xóa",
            icon: "balance",
            tone: "info",
            active: ui.tab === "draft",
            onClick: () =>
              setUi((p) => ({
                ...p,
                tab: p.tab === "draft" ? "all" : "draft",
              })),
          },
          {
            key: "approved",
            label: "Đã chốt & Khóa cứng",
            value: String(tabCounts.approved),
            subLabel: "Không thể sửa/xóa sau duyệt",
            icon: "document-check",
            tone: "success",
            valueTone: "success",
            active: ui.tab === "approved",
            onClick: () =>
              setUi((p) => ({
                ...p,
                tab: p.tab === "approved" ? "all" : "approved",
              })),
          },
        ]}
      />

      {/* Filter & Status Tabs */}
      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm theo nhân sự mở ca, người đếm, người duyệt hoặc ngày..."
        density={ui.density}
        onToggleDensity={() =>
          setUi((p) => ({
            ...p,
            density: p.density === "compact" ? "normal" : "compact",
          }))
        }
        filters={
          <SegmentedControl<"all" | ReconciliationStatus>
            value={ui.tab}
            onChange={(next) => setUi((p) => ({ ...p, tab: next }))}
            options={[
              { value: "all", label: "Tất cả", badge: tabCounts.all },
              { value: "pending", label: "Chờ duyệt", badge: tabCounts.pending },
              { value: "draft", label: "Nháp", badge: tabCounts.draft },
              { value: "approved", label: "Đã khóa", badge: tabCounts.approved },
            ]}
          />
        }
        sortMenu={
          <SortMenu
            options={SORT_OPTIONS}
            value={ui.sortBy}
            onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
          />
        }
      />

      {/* Main Reconciliations Table */}
      <section className="card p-0 overflow-hidden">
        {enrichedRows.length === 0 ? (
          <EmptyState
            title="Chưa có phiếu đối soát ca nào trong phạm vi hiển thị."
            actionLabel={canOperateBranch ? "+ Lập đối soát đầu tiên" : undefined}
            onAction={canOperateBranch ? openCreateDrawer : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`data-table ${ui.density === "compact" ? "text-xs" : ""}`}
            >
              <thead>
                <tr>
                  <SortableTh
                    label="Ngày & Ca"
                    fieldHint="rec.date"
                    ascKey="date-asc"
                    descKey="date-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as RecSortKey }))
                    }
                  />
                  <th>Chi nhánh</th>
                  <th>Bàn giao nhân sự (Mở → Kiểm kê → Duyệt)</th>
                  <SortableTh
                    label="Chênh lệch"
                    fieldHint="varianceValue"
                    ascKey="date-asc"
                    descKey="variance-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as RecSortKey }))
                    }
                  />
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {enrichedRows.map(
                  ({ rec, varianceValue, totalDiffQty, hasMismatchPerson }) => {
                    const isLocked = rec.status === "approved";
                    const hasWarnBorder = varianceValue > 0 || hasMismatchPerson;
                    return (
                      <tr
                        key={rec.id}
                        className={
                          hasWarnBorder ? "border-l-4 border-l-amber-500" : ""
                        }
                      >
                        <td>
                          <div className="font-semibold text-[var(--text)]">
                            {formatDate(rec.date)}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {rec.shift} · {rec.lines.length} dòng NL
                          </div>
                        </td>

                        <td>
                          <div className="font-semibold text-[var(--text)]">
                            {rec.storeId}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {getStore(data, rec.storeId)?.name ?? ""}
                          </div>
                        </td>

                        <td>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span>
                              Mở:{" "}
                              <strong>
                                <HighlightText text={rec.opener} query={ui.search} />
                              </strong>
                            </span>
                            <span className="text-[var(--muted)]">→</span>
                            <span>
                              Đếm:{" "}
                              <strong>
                                <HighlightText text={rec.counter} query={ui.search} />
                              </strong>
                            </span>
                            {hasMismatchPerson && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold"
                                title={
                                  rec.handoverMismatchReason ||
                                  "Người mở ca khác người kiểm kê"
                                }
                              >
                                Đổi người giao ca
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            Duyệt:{" "}
                            <HighlightText text={rec.approver} query={ui.search} />
                            {rec.handoverMismatchReason && (
                              <span> · Lý do: {rec.handoverMismatchReason}</span>
                            )}
                          </div>
                        </td>

                        <td className="tabular-nums">
                          {varianceValue > 0 ? (
                            <div>
                              <div className="font-semibold text-amber-600 dark:text-amber-400">
                                {formatCurrency(varianceValue)}
                              </div>
                              <div className="text-[11px] text-[var(--muted)]">
                                Lệch tổng {totalDiffQty > 0 ? "-" : "+"}
                                {formatNumber(Math.abs(totalDiffQty))} đv
                              </div>
                            </div>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Khớp sổ (0 đ)
                            </span>
                          )}
                        </td>

                        <td>
                          <StatusPill
                            label={STATUS_LABEL[rec.status]}
                            tone={STATUS_TONE[rec.status]}
                          />
                          {isLocked && rec.approvedAt && (
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">
                              Khóa ngày {formatDate(rec.approvedAt)}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            {isLocked || !canOperateBranch ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                                onClick={() => openExistingDrawer(rec, true)}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>Xem phiếu</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openExistingDrawer(rec, false)}
                                >
                                  Sửa
                                </button>
                                {rec.status === "pending" && (
                                  <ConfirmInline
                                    triggerLabel="Duyệt & Khóa"
                                    confirmText="Chốt tồn & khóa vĩnh viễn?"
                                    tone="primary"
                                    onConfirm={() => handleApproveRec(rec)}
                                  />
                                )}
                                <ConfirmInline
                                  triggerLabel="Xóa"
                                  confirmText="Xóa phiếu chưa chốt?"
                                  tone="danger"
                                  onConfirm={() => handleDeleteRec(rec)}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SideDrawer 1: Create / Edit / View Reconciliation */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          readOnlyView
            ? `Chi tiết biên bản đối soát (${form.storeId})`
            : editingRec
              ? `Chỉnh sửa đối soát ca (${form.storeId})`
              : `Lập đối soát kiểm kê cuối ca`
        }
        subtitle={
          readOnlyView
            ? `Phiếu đã khóa hoặc chế độ giám sát chuỗi · ${formatDate(form.date)} · ${form.shift}`
            : "Nhân sự Mở ca, Đếm ca và Người duyệt được ràng buộc theo đúng nhân viên chi nhánh"
        }
        widthClass="max-w-[740px]"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="text-xs text-[var(--muted)]">
              {readOnlyView
                ? "Biên bản đã chốt không cho phép chỉnh sửa nhằm đảm bảo tính minh bạch."
                : "Mọi thay đổi chỉ cập nhật tồn kho quầy khi bấm Duyệt & Khóa."}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDrawerOpen(false)}
              >
                {readOnlyView ? "Đóng" : "Hủy"}
              </button>
              {!readOnlyView && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => saveRecord("draft")}
                  >
                    Lưu nháp
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => saveRecord("pending")}
                  >
                    Gửi chờ duyệt
                  </button>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label" htmlFor="rec-store">
                Chi nhánh *
              </label>
              <select
                id="rec-store"
                className="form-input form-select"
                disabled={Boolean(branchScope) || readOnlyView || Boolean(editingRec)}
                value={form.storeId}
                onChange={(e) => {
                  const nextStore = e.target.value;
                  const roles = defaultRolesForStore(nextStore);
                  setForm((cur) => ({
                    ...cur,
                    storeId: nextStore,
                    opener: roles.opener,
                    counter: roles.counter,
                    approver: roles.approver,
                    handoverMismatchReason: "",
                    lines: buildSessionLines(nextStore),
                  }));
                }}
              >
                {data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="rec-date">
                Ngày đối soát *
              </label>
              <input
                id="rec-date"
                type="date"
                className="form-input"
                disabled={readOnlyView}
                value={form.date}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label" htmlFor="rec-shift">
                Ca làm việc *
              </label>
              <select
                id="rec-shift"
                className="form-input form-select"
                disabled={readOnlyView}
                value={form.shift}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, shift: e.target.value as Shift }))
                }
              >
                <option value="Ca sáng">Ca sáng</option>
                <option value="Ca chiều">Ca chiều</option>
                <option value="Ca tối">Ca tối</option>
              </select>
            </div>
          </div>

          {/* Branch-Constrained Staff Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label" htmlFor="rec-opener">
                Người mở ca (thuộc {form.storeId}) *
              </label>
              <select
                id="rec-opener"
                className="form-input form-select"
                disabled={readOnlyView}
                value={form.opener}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, opener: e.target.value }))
                }
              >
                {formStaff.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="rec-counter">
                Người đóng / Kiểm kê *
              </label>
              <select
                id="rec-counter"
                className="form-input form-select"
                disabled={readOnlyView}
                value={form.counter}
                onChange={(e) => {
                  const nextCounter = e.target.value;
                  const nextApprovers = formStaff.filter(
                    (s) =>
                      s.name !== nextCounter &&
                      (s.role === "Quản lý chi nhánh" || s.role === "Ca trưởng"),
                  );
                  setForm((cur) => ({
                    ...cur,
                    counter: nextCounter,
                    approver:
                      cur.approver === nextCounter
                        ? (nextApprovers[0]?.name ??
                          formStaff.find((s) => s.name !== nextCounter)?.name ??
                          "")
                        : cur.approver,
                  }));
                }}
              >
                {formStaff.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="rec-approver">
                Người duyệt (khác người đếm) *
              </label>
              <select
                id="rec-approver"
                className="form-input form-select"
                disabled={readOnlyView}
                value={form.approver}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, approver: e.target.value }))
                }
              >
                {fallbackApproverOptions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opener !== Counter Warning & Mandatory Reason */}
          {isFormMismatch && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Lưu ý: Người mở ca ({form.opener}) khác người kiểm kê đóng ca ({form.counter}) — Yêu cầu xác thực lý do bàn giao
              </div>
              {!readOnlyView && (
                <div className="flex flex-wrap gap-1.5">
                  {HANDOVER_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setForm((cur) => ({
                          ...cur,
                          handoverMismatchReason: preset,
                        }))
                      }
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${form.handoverMismatchReason === preset
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                disabled={readOnlyView}
                placeholder="Nhập lý do thay người giao ca / đồng kiểm..."
                value={form.handoverMismatchReason}
                onChange={(e) =>
                  setForm((cur) => ({
                    ...cur,
                    handoverMismatchReason: e.target.value,
                  }))
                }
                className="form-input text-xs"
              />
            </div>
          )}

          {/* Lines Table */}
          <div className="rounded-xl border border-[var(--border)] overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Nguyên liệu tại quầy</th>
                  <th className="text-right">Đầu ca</th>
                  <th className="text-right">Bán + Hủy</th>
                  <th className="text-right">Lý thuyết</th>
                  <th className="text-right">Thực đếm</th>
                  <th className="text-right">Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => {
                  const ing = getIngredient(data, line.ingredientId);
                  const theo = theoreticalBalance(
                    line.opening,
                    line.received,
                    line.actualUse,
                    line.waste,
                  );
                  const diff = theo - line.counted;
                  return (
                    <tr key={line.id}>
                      <td>
                        <div className="font-semibold text-[var(--text)]">
                          {ing?.name ?? line.ingredientId}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          Đơn vị: {ing?.baseUnit ?? ""}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">
                        {formatNumber(line.opening + line.received)}
                      </td>
                      <td className="text-right tabular-nums text-[var(--muted)]">
                        {formatNumber(line.actualUse + line.waste)}
                      </td>
                      <td className="text-right tabular-nums font-medium">
                        {formatNumber(theo)}
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={readOnlyView}
                          value={line.counted}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setForm((cur) => ({
                              ...cur,
                              lines: cur.lines.map((item, i) =>
                                i === idx ? { ...item, counted: val } : item,
                              ),
                            }));
                          }}
                          className="w-24 h-7 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-right tabular-nums text-xs"
                        />
                      </td>
                      <td className="text-right tabular-nums">
                        {diff === 0 ? (
                          <span className="text-emerald-600 font-medium">Khớp</span>
                        ) : (
                          <div>
                            <span className="font-semibold text-amber-600">
                              {diff > 0 ? `-${formatNumber(diff)}` : `+${formatNumber(Math.abs(diff))}`}
                            </span>
                            {!readOnlyView && (
                              <div className="mt-1 flex flex-wrap justify-end gap-1">
                                {VARIANCE_REASONS.slice(0, 2).map((rs) => (
                                  <button
                                    key={rs}
                                    type="button"
                                    onClick={() =>
                                      setForm((cur) => ({
                                        ...cur,
                                        lines: cur.lines.map((item, i) =>
                                          i === idx ? { ...item, reason: rs } : item,
                                        ),
                                      }))
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[10px] border ${line.reason === rs
                                      ? "bg-slate-800 text-white border-slate-800"
                                      : "border-[var(--border)] text-[var(--muted)]"
                                      }`}
                                  >
                                    {rs}
                                  </button>
                                ))}
                              </div>
                            )}
                            {line.reason && (
                              <div className="text-[10px] text-[var(--muted)] mt-0.5">
                                {line.reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="form-label" htmlFor="rec-note">
              Ghi chú kiểm kê
            </label>
            <input
              id="rec-note"
              disabled={readOnlyView}
              className="form-input text-xs"
              placeholder="Ghi chú thêm cho ca tiếp theo hoặc quản lý duyệt..."
              value={form.note}
              onChange={(e) =>
                setForm((cur) => ({ ...cur, note: e.target.value }))
              }
            />
          </div>
        </div>
      </SideDrawer>

      {/* SideDrawer 2: Admin Staff Assignment across Branches */}
      <SideDrawer
        isOpen={staffDrawerOpen}
        onClose={() => setStaffDrawerOpen(false)}
        title="Phân công nhân sự theo chi nhánh"
        subtitle="Quản trị chuỗi phân bổ nhân sự Thu ngân / Pha chế / Ca trưởng để giới hạn danh sách đối soát tại từng cửa hàng"
        widthClass="max-w-[620px]"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStaffDrawerOpen(false)}
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-[var(--muted)]" htmlFor="staff-br-filter">
              Xem nhân sự chi nhánh:
            </label>
            <select
              id="staff-br-filter"
              value={staffBranchFilter}
              onChange={(e) => {
                setStaffBranchFilter(e.target.value);
                if (e.target.value !== "ALL") {
                  setNewStaffForm((c) => ({ ...c, storeId: e.target.value }));
                }
              }}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Add Staff Form */}
          <form
            onSubmit={handleAddStaff}
            className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2"
          >
            <div className="text-xs font-semibold text-[var(--heading-color)]">
              + Thêm nhân sự vào chi nhánh
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Họ và tên *"
                value={newStaffForm.name}
                onChange={(e) =>
                  setNewStaffForm((c) => ({ ...c, name: e.target.value }))
                }
                className="form-input text-xs"
                required
              />
              <select
                value={newStaffForm.role}
                onChange={(e) =>
                  setNewStaffForm((c) => ({
                    ...c,
                    role: e.target.value as BranchStaffMember["role"],
                  }))
                }
                className="form-input form-select text-xs"
              >
                <option value="Thu ngân">Thu ngân</option>
                <option value="Pha chế">Pha chế</option>
                <option value="Ca trưởng">Ca trưởng</option>
                <option value="Nhân viên kho">Nhân viên kho</option>
                <option value="Quản lý chi nhánh">Quản lý chi nhánh</option>
              </select>
              <select
                value={newStaffForm.storeId}
                onChange={(e) =>
                  setNewStaffForm((c) => ({ ...c, storeId: e.target.value }))
                }
                className="form-input form-select text-xs"
              >
                {data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-sm">
                Thêm nhân sự
              </button>
            </div>
          </form>

          {/* Staff List with Transfer */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {data.branchStaff
              .filter(
                (st) =>
                  staffBranchFilter === "ALL" || st.storeId === staffBranchFilter,
              )
              .map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--text)]">
                      {st.name}{" "}
                      <span className="font-mono text-[11px] text-[var(--muted)]">
                        ({st.code})
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {st.role} · {st.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--muted)]">Điều chuyển:</span>
                    <select
                      aria-label={`Chi nhánh của ${st.name}`}
                      value={st.storeId}
                      onChange={(e) => handleTransferStaff(st.id, e.target.value)}
                      className="h-7 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
                    >
                      {data.stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </SideDrawer>
    </div>
  );
}
