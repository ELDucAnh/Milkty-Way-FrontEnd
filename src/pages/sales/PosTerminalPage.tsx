import Modal from "../../components/common/Modal";
import { assertPosCheckoutEditable } from "../shared/sales-orders-store";
import {
  canAtBranch,
  checkLogin,
  currentStaff,
  STAFF_SESSION_CHANGED,
  STAFF_SESSION_KEY,
} from "../../utils/auth";
import {
  counterLabel,
  normalizeCounterId,
  sameCounter,
} from "../../utils/counters";
import { useToast } from "../../components/common/useToast";
import "./pos-template.css";
import { products, isPosProductAvailable } from "../../data/sales/products";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { loadCashShifts, STORAGE_SHIFTS } from "../shared/cash-shifts-store";
import type { CashShift } from "../shared/cash-shifts-store";
import { CASH_SHIFTS_CHANGED } from "../shared/cash-shift-workflow";
import { Navigate, Link } from "react-router-dom";
import PosCart from "../../components/sales/PosCart";
import type { PosCartItem } from "../../components/sales/PosCart";
import { formatCurrency } from "./sales-support";

import { POS_TOPPINGS as toppings, calculatePosUnitPrice } from "../shared/sales-pricing";
export default function PosTerminalPage() {
  const staff = currentStaff();

  if (!staff?.loginRole) {
    return <Navigate to="/login" replace />;
  }

  if (
    !staff.branchId ||
    !staff.counterId ||
    !canAtBranch("pos.use", staff.branchId)
  ) {
    return (
      <section className="card">
        <h1 className="card-title">Không thể mở POS</h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          Tài khoản cần có quyền bán hàng và được phân công chi nhánh, quầy.
        </p>
        <Link to="/sales/shifts" className="btn btn-secondary mt-4">
          Xem ca làm việc
        </Link>
      </section>
    );
  }

  return (
    <AssignedPosTerminal
      key={`${staff.staffId}:${staff.branchId}:${normalizeCounterId(staff.counterId)}`}
      staffId={staff.staffId}
      branchId={staff.branchId}
      counterId={normalizeCounterId(staff.counterId)}
    />
  );
}

interface AssignedPosTerminalProps {
  staffId: string;
  branchId: string;
  counterId: string;
}

function AssignedPosTerminal({
  staffId,
  branchId,
  counterId,
}: AssignedPosTerminalProps) {
  const toast = useToast();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [, setShiftRevision] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const bump = () => setShiftRevision(v => v + 1);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_SHIFTS || event.key === STAFF_SESSION_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CASH_SHIFTS_CHANGED, bump);
    window.addEventListener(STAFF_SESSION_CHANGED, bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CASH_SHIFTS_CHANGED, bump);
      window.removeEventListener(STAFF_SESSION_CHANGED, bump);
    };
  }, []);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.metaKey || event.altKey || document.querySelector('[role="dialog"]')) return;
      const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'));
      if (!event.ctrlKey && !typing && event.key === '?') { event.preventDefault(); setHelpOpen(true); return; }
      const alias = event.ctrlKey && event.key.toLowerCase() === 'k';
      if (alias || (event.key === '/' && !event.ctrlKey && !(event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'))))) {
        event.preventDefault(); searchRef.current?.focus(); searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  const [product, setProduct] = useState(products[0]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PosCartItem[]>([]);
  const [size, setSize] = useState<"M" | "L">("M");
  const [sugar, setSugar] = useState("50%");
  const [ice, setIce] = useState("Vừa đá");
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const unitPrice = calculatePosUnitPrice({ productId: product.sku, size, toppings: toppings.filter(t => selected.includes(t.id)).map(t => t.name) });
  function requireOpenAssignedShift(): CashShift {
    const actor = currentStaff();

    if (
      !actor?.loginRole ||
      actor.staffId !== staffId ||
      actor.branchId !== branchId ||
      !sameCounter(actor.counterId, counterId) ||
      !canAtBranch("pos.use", branchId)
    ) {
      throw new Error(
        "Phiên hoặc phân công quầy đã thay đổi. Vui lòng tải lại POS.",
      );
    }

    const activeShifts = loadCashShifts().filter(shift =>
      shift.branchId === branchId &&
      sameCounter(shift.counterId, counterId) &&
      shift.status !== "closed"
    );

    if (
      activeShifts.length !== 1 ||
      activeShifts[0].status !== "open"
    ) {
      throw new Error(
        "Quầy không có một ca đang mở hợp lệ. Vui lòng kiểm tra ca làm việc.",
      );
    }

    return activeShifts[0];
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const openShift = requireOpenAssignedShift();
      assertPosCheckoutEditable({ staffId, branchId, counterId, shiftId: openShift.id });

      if (!canAtBranch("order.create", branchId)) {
        throw new Error("Bạn không có quyền tạo đơn tại chi nhánh này.");
      }

      if (!isPosProductAvailable(product, branchId)) throw new Error("Món không được bán tại chi nhánh này.");
      const count = Number(quantity);

      if (!Number.isSafeInteger(count) || count < 1 || count > 999) {
        throw new Error("Số lượng phải là số nguyên từ 1 đến 999.");
      }

      setItems(current => [
        ...current,
        {
          id: crypto.randomUUID(),
          productId: product.sku,
          name: product.name,
          size,
          sugar,
          ice,
          toppings: toppings
            .filter(topping => selected.includes(topping.id))
            .map(topping => topping.name),
          note: note.trim(),
          quantity: count,
          unitPrice,
        },
      ]);
      setCustomizerOpen(false);
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? error.message
          : "Không thể thêm món.",
      );
    }
  }
  function reportShortage() {
    try {
      requireOpenAssignedShift();

      if (!canAtBranch("order.reportShortage", branchId)) {
        throw new Error(
          "Bạn không có quyền báo thiếu nguyên liệu tại chi nhánh này.",
        );
      }

      const key = `milktyway.shortages.${branchId}`;
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw === null ? {} : JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("Dữ liệu báo thiếu nguyên liệu không hợp lệ.");
      }

      localStorage.setItem(
        key,
        JSON.stringify({
          ...parsed,
          [product.sku]: new Date().toISOString(),
        }),
      );

      toast.success("Đã ghi nhận báo thiếu nguyên liệu cho quản lý.");
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? error.message
          : "Không lưu được báo thiếu nguyên liệu.",
      );
    }
  }
  let activeShift: CashShift | null = null;
  let shiftError: string | null = null;

  try {
    activeShift = requireOpenAssignedShift();
  } catch (error) {
    shiftError =
      error instanceof Error
        ? error.message
        : "Không xác nhận được trạng thái ca.";
  }

  if (!activeShift) {
    return (
      <section className="card">
        <h1 className="card-title">POS chưa sẵn sàng</h1>
        <p className="text-sm text-[var(--muted)] mt-2" role="alert">
          {shiftError}
        </p>
        <Link to="/sales/shifts" className="btn btn-primary mt-4">
          Kiểm tra hoặc mở ca
        </Link>
      </section>
    );
  }
  return <div className="pos-page">
    <div className="page-header pos-page-header">
      <div>
        <nav className="breadcrumb" aria-label="Đường dẫn trang">
          <Link to={checkLogin() === "cashier" ? "/sales/pos" : "/dashboard"}>Trang chủ</Link>
          <span className="sep">/</span>
          <Link to="/sales">Bán hàng</Link>
          <span className="sep">/</span>
          <span className="current">Điểm bán hàng (POS)</span>
        </nav>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="page-title mb-0">Bán hàng tại quầy (POS)</h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {counterLabel(counterId)} đang hoạt động
          </span>
        </div>
      </div>
      <div className="flex gap-2.5 items-center">
        <button type="button" className="btn btn-secondary" onClick={() => window.dispatchEvent(new Event("milktyway:toggle-pos-focus"))}>Hiện khung / Tập trung · ~</button>
        <button type="button" className="btn btn-secondary" onClick={() => setHelpOpen(true)}>Phím tắt [?]</button>
        <Link to="/sales" className="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Danh sách đơn
        </Link>
        <Link to="/sales/shifts" className="btn btn-secondary">{checkLogin() === "cashier" ? "Chốt ca" : "Quản lý ca"}</Link>
        <button className="btn btn-secondary" onClick={() => toast.info("Chưa kết nối thiết bị ngăn kéo tiền.")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="12" x2="18" y2="12" /><circle cx="12" cy="16" r="1" /></svg>
          Mở ngăn kéo tiền
        </button>

      </div>
    </div>

    <div className="card pos-session" role="status">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="badge badge-gray">Chưa xác định kết nối</span>
          <span className="text-sm text-[var(--muted)]">
            {branchId} · {counterLabel(counterId)} · {activeShift.id}
          </span>
        </div>
      </div>
    </div>

    <div className="pos-workspace">
      <div className="pos-catalog">
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3"><div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input ref={searchRef} id="pos-search" aria-label="Tìm món" className="w-full h-11 pl-11 pr-10 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text)] text-sm font-medium placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all" placeholder="Quét mã hoặc nhập tên / mã món..." value={search} onChange={e => setSearch(e.target.value)} />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)]">/</kbd>
          </div>
          <div className="pos-category-tabs" aria-label="Nhóm món">{[["", "Tất cả"], ["hot", "Hot Sale"], ["milk-tea", "Trà sữa"], ["fruit-tea", "Trà trái cây"], ["seasonal", "Theo mùa"]].map(([value, label]) => <button key={value} type="button" aria-pressed={category === value} className={`btn ${category === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setCategory(value)}>{label}<small className="pos-filter-count">{products.filter(p => isPosProductAvailable(p, branchId) && (!value || (value === "hot" ? p.isHotSale : p.category === value))).length}</small></button>)}</div>
        </div></section>
        <div className="pos-product-grid grid grid-cols-2 sm:grid-cols-3 gap-3">{products.filter(p => isPosProductAvailable(p, branchId) && (!category || (category === "hot" ? p.isHotSale : p.category === category)) && `${p.name} ${p.sku}`.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN"))).sort((a, b) => category === "hot" ? (a.hotRank ?? 99) - (b.hotRank ?? 99) : a.id - b.id).map(p => <button key={p.id} type="button" aria-pressed={product.id === p.id} className={`pos-product-card min-w-0 text-left ${product.id === p.id ? "in-cart" : ""}`} onClick={() => { setProduct(p); setSelected([]); setSize("M"); setQuantity("1"); setNote(""); setCustomizerOpen(true); }}><span className="flex items-center justify-center h-[100px] rounded-[10px] mb-2.5 bg-[var(--background)]"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M7 7h10l-1 14H8L7 7ZM6 7h12M14 7l2-6" /><circle cx="11" cy="17" r="1" /><circle cx="14" cy="14" r="1" /></svg></span>{p.isHotSale && <span className="pos-hot-badge" title={`${p.soldToday} ly hôm nay (demo)`}>🔥 HOT SALE</span>}<span className="block truncate text-xs font-semibold mb-1">{p.name}</span><span className="block text-[11px] text-[var(--muted)] mb-1.5">{p.sku}</span><span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><span className="text-[13px] font-bold text-[var(--primary)]">{formatCurrency(p.price)}</span><span className="text-[10px] whitespace-nowrap">Còn: {p.stock}</span></span></button>)}</div>
      </div>
      <PosCart items={items} onRemove={id => setItems(current => current.filter(item => item.id !== id))} onClear={() => setItems([])} branchId={branchId} staffId={staffId} counterId={counterId} shiftId={activeShift.id} onRestore={setItems} onQuantity={(id, quantity) => setItems(current => current.map(item => item.id === id ? { ...item, quantity } : item))} customizer={null} />
      <Modal open={customizerOpen} onClose={() => setCustomizerOpen(false)} title={`Tùy chọn · ${product.name}`} size="lg">

        <form onSubmit={add} className="pos-item-form flex flex-col gap-4"><div className="pos-option-grid">
          <fieldset><legend className="form-label">Cỡ ly</legend><div className="pos-option-buttons">{(["M", "L"] as const).map(value => <button key={value} type="button" aria-pressed={size === value} className={`btn ${size === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setSize(value)}><span>Size {value}<small className="block font-normal">{value === "M" ? "Tiêu chuẩn" : "+6.000 ₫"}</small></span></button>)}</div></fieldset>
          <fieldset><legend className="form-label">Lượng đường</legend><div className="pos-option-buttons">{["0%", "30%", "50%", "70%", "100%"].map(value => <button key={value} type="button" aria-pressed={sugar === value} className={`btn ${sugar === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setSugar(value)}>{value}</button>)}</div></fieldset>
          <fieldset className="pos-option-full"><legend className="form-label">Lượng đá</legend><div className="pos-option-buttons">{["Không đá", "Ít đá", "Vừa đá", "Bình thường"].map(value => <button key={value} type="button" aria-pressed={ice === value} className={`btn ${ice === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setIce(value)}>{value}</button>)}</div></fieldset>
        </div><fieldset><legend className="form-label">Món thêm / Topping (mỗi ly)</legend><div className="grid grid-cols-2 gap-2">{toppings.map(t => <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer"><input className="accent-[var(--primary)]" type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(current => e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id))} /><span>{t.name} · +{formatCurrency(t.price)}</span></label>)}</div></fieldset>
          <label className="form-label">Ghi chú pha chế<textarea className="form-input" placeholder="Ví dụ: Ít đá, mang đi ngay..." value={note} onChange={e => setNote(e.target.value)} /></label>
          <div className="flex items-center justify-between gap-3 text-sm"><span>Đơn giá tùy chọn: <strong className="text-[var(--primary)]">{formatCurrency(unitPrice)}</strong></span>{canAtBranch("order.reportShortage", branchId) && <button type="button" className="btn btn-ghost btn-sm" onClick={reportShortage}>Báo hết nguyên liệu</button>}</div>
          <div className="pos-item-actions"><div className="pos-quantity-stepper"><button type="button" aria-label="Giảm số lượng" disabled={Number(quantity) <= 1} onClick={() => setQuantity(String(Math.max(1, Number(quantity) - 1)))}>−</button><input aria-label="Số lượng" type="number" min="1" max="999" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} /><button type="button" aria-label="Tăng số lượng" disabled={Number(quantity) >= 999} onClick={() => setQuantity(String(Math.min(999, Number(quantity) + 1)))}>+</button></div><button className="btn btn-primary" type="submit"><span>+ Thêm vào đơn</span><strong>{formatCurrency(unitPrice * (Number(quantity) || 0))}</strong></button></div>
        </form>
      </Modal>
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Phím tắt bán hàng">
        <div className="space-y-4">{[["Tìm món", "/ hoặc Ctrl+K"], ["Hiện khung / Tập trung", "~ hoặc Ctrl+B"], ["Đưa đủ tiền mặt", "Alt+D"], ["Giữ đơn", "Alt+H"], ["Hoàn tất bán hàng", "Ctrl+Enter"]].map(([label, key]) => <div key={key} className="flex justify-between gap-4"><span>{label}</span><kbd>{key}</kbd></div>)}</div>
      </Modal>
    </div>
  </div>;
}

