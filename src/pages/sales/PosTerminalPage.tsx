import { checkLogin } from "../../utils/auth";
import { useToast } from "../../components/common/useToast";
import "./pos-template.css";
import { products } from "../../data/sales/products";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { initialShifts, STORAGE_SHIFTS } from "./ShiftsPage";
import type { CashShift } from "./ShiftsPage";
import { Navigate, Link } from "react-router-dom";
import PosCart from "../../components/sales/PosCart";
import type { PosCartItem } from "../../components/sales/PosCart";
import { formatCurrency } from "./sales-support";

const toppings = [
    { id: "pearl", name: "Trân châu hoàng kim", price: 5000 },
    { id: "pudding", name: "Pudding trứng", price: 7000 },
    { id: "cheese", name: "Kem phô mai", price: 10000 },
    { id: "aloe", name: "Thạch nha đam", price: 5000 },
];
export default function PosTerminalPage() {
 const toast = useToast();
 const searchRef = useRef<HTMLInputElement>(null);
 useEffect(() => {
  const focusSearch = (event: KeyboardEvent) => {
   if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !(event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select')))) {
    event.preventDefault(); searchRef.current?.focus();
   }
  };
  window.addEventListener('keydown', focusSearch);
  return () => window.removeEventListener('keydown', focusSearch);
 }, []);
 const [product, setProduct] = useState(products[0]);
 const [category, setCategory] = useState("");
 const sizeRef = useRef<HTMLSelectElement>(null);
 const [search, setSearch] = useState("");
 const [items, setItems] = useState<PosCartItem[]>([]);
 const [size, setSize] = useState<"M" | "L">("M");
 const [sugar, setSugar] = useState("50%");
 const [ice, setIce] = useState("Vừa đá");
 const [selected, setSelected] = useState<string[]>([]);
 const [quantity, setQuantity] = useState("1");
 const [note, setNote] = useState("");
 const unitPrice = (product.price + (size === "L" ? 6000 : 0)) + toppings.filter(t => selected.includes(t.id)).reduce((sum, t) => sum + t.price, 0);
 function add(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const count = Number(quantity);
  if (!Number.isSafeInteger(count) || count < 1 || count > 999) return;
  setItems(current => [...current, { id: crypto.randomUUID(), productId: product.sku, name: product.name, size, sugar, ice, toppings: toppings.filter(t => selected.includes(t.id)).map(t => t.name), note: note.trim(), quantity: count, unitPrice }]);
 }
 if (checkLogin() === "cashier") {
  const shifts: CashShift[] = JSON.parse(localStorage.getItem(STORAGE_SHIFTS) || JSON.stringify(initialShifts));
  if (!shifts.some(s => s.branchId === "CN01" && s.counterId === "POS01" && s.status === "open")) return <Navigate to="/sales/shifts" replace />;
 }
 return <>
      <div className="page-header mb-5">
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
              Quầy 01 đang hoạt động
            </span>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <Link to="/sales" className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Danh sách đơn
          </Link>
          <Link to="/sales/shifts" className="btn btn-secondary">{checkLogin() === "cashier" ? "Chốt ca" : "Quản lý ca"}</Link>
          <button className="btn btn-secondary" onClick={() => toast.info("Chưa kết nối thiết bị ngăn kéo tiền.")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="12" x2="18" y2="12"/><circle cx="12" cy="16" r="1"/></svg>
            Mở ngăn kéo tiền
          </button>

        </div>
      </div>

      <div className="card mb-4" role="status">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="badge badge-gray">Chưa xác định kết nối</span>
            <span className="text-sm text-[var(--muted)]">
              CN01 · Quầy 01 · Ca sáng
            </span>
          </div>
        </div>
      </div>

  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
   <div className="lg:col-span-7 flex flex-col gap-4">
   <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3"><div className="flex flex-wrap gap-3 items-end">
    <div className="relative flex-1 min-w-0">
     <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
     <input ref={searchRef} id="pos-search" aria-label="Tìm món" className="w-full h-11 pl-11 pr-10 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text)] text-sm font-medium placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all" placeholder="Quét mã hoặc nhập tên / mã món..." value={search} onChange={e => setSearch(e.target.value)} />
     <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)]">/</kbd>
    </div>
    <select aria-label="Nhóm món" className="form-input form-select h-11 !w-auto min-w-[160px]" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả nhóm món</option><option value="milk-tea">Trà sữa</option><option value="fruit-tea">Trà trái cây</option><option value="seasonal">Món theo mùa</option></select>
    </div></section>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 mb-4">{products.filter(p => (!category || p.category === category) && `${p.name} ${p.sku}`.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN"))).map(p => <button key={p.id} type="button" aria-pressed={product.id === p.id} className={`pos-product-card min-w-0 text-left ${product.id === p.id ? "in-cart" : ""}`} onClick={() => { setProduct(p); setSelected([]); setSize("M"); sizeRef.current?.focus(); }}><span className="flex items-center justify-center h-[100px] rounded-[10px] mb-2.5 bg-[var(--background)]"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M7 7h10l-1 14H8L7 7ZM6 7h12M14 7l2-6"/><circle cx="11" cy="17" r="1"/><circle cx="14" cy="14" r="1"/></svg></span><span className="block truncate text-xs font-semibold mb-1">{p.name}</span><span className="block text-[11px] text-[var(--muted)] mb-1.5">{p.sku}</span><span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><span className="text-[13px] font-bold text-[var(--primary)]">{formatCurrency(p.price)}</span><span className="text-[10px] whitespace-nowrap">Còn: {p.stock}</span></span></button>)}</div>
    <section className="card"><h2 className="card-title mb-4">Tùy chọn món</h2>

    <form onSubmit={add} className="flex flex-col gap-4"><div className="grid grid-cols-2 gap-3">
     <label className="form-label">Cỡ ly<select ref={sizeRef} id="pos-size" className="form-input" value={size} onChange={e => setSize(e.target.value === "L" ? "L" : "M")}><option value="M">Size M (Tiêu chuẩn)</option><option value="L">Size L (+6.000 ₫)</option></select></label>
     <label className="form-label">Số lượng<input className="form-input" type="number" min="1" max="999" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
     <label className="form-label">Đường<select className="form-input" value={sugar} onChange={e => setSugar(e.target.value)}>{["0%", "30%", "50%", "70%", "100%"].map(v => <option key={v}>{v}</option>)}</select></label>
     <label className="form-label">Đá<select className="form-input" value={ice} onChange={e => setIce(e.target.value)}>{["Không đá", "Ít đá", "Vừa đá", "Bình thường"].map(v => <option key={v}>{v}</option>)}</select></label>
     </div><fieldset><legend className="form-label">Món thêm / Topping (mỗi ly)</legend><div className="grid grid-cols-2 gap-2">{toppings.map(t => <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer"><input className="accent-[var(--primary)]" type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(current => e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id))} /><span>{t.name} · +{formatCurrency(t.price)}</span></label>)}</div></fieldset>
     <label className="form-label">Ghi chú pha chế<textarea className="form-input" placeholder="Ví dụ: Ít đá, mang đi ngay..." value={note} onChange={e => setNote(e.target.value)} /></label>
     <div className="flex flex-wrap gap-2 mt-4"><button className="btn btn-primary" type="submit">Thêm vào giỏ · {formatCurrency(unitPrice)}/ly</button>{checkLogin() === "cashier" ? <button type="button" className="btn btn-secondary" onClick={() => { const key = "milktyway.shortages.CN01"; localStorage.setItem(key, JSON.stringify({...JSON.parse(localStorage.getItem(key) || "{}"), [product.sku]: new Date().toISOString()})); toast.success("Đã ghi nhận báo thiếu nguyên liệu cho quản lý."); }}>Báo hết nguyên liệu</button> : <button type="button" className="btn btn-secondary" onClick={() => toast.info(`Đã tạm khóa món ${product.name} tại chi nhánh CN01 do hết nguyên liệu.`)}>Khóa món tại quầy</button>}</div>
    </form>
   </section></div>
   <PosCart items={items} onRemove={id => setItems(current => current.filter(item => item.id !== id))} onClear={() => setItems([])} branchId="CN01" />
  </div>
 </>;
}

