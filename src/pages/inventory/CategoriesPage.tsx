import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { makeId } from "../shared/formatters";
import type { DemoCategory } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

export default function CategoriesPage() {
    const [data, setData] = useDemoState();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [applied, setApplied] = useState({ search: "", status: "all" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DemoCategory | null>(null);
    const [form, setForm] = useState({ code: "", name: "", description: "", active: true });

    const rows = useMemo(() => data.categories.filter((category) =>
        (!applied.search || `${category.code} ${category.name}`.toLocaleLowerCase("vi-VN").includes(applied.search.trim().toLocaleLowerCase("vi-VN")))
        && (applied.status === "all" || (applied.status === "active" ? category.active : !category.active))), [data.categories, applied]);
    const productsIn = (category: DemoCategory) => data.products.filter((product) => product.category === category.key).length;
    const activeCount = data.categories.filter((category) => category.active).length;
    const toppingCount = data.categories.filter((category) => category.key === "topping" && category.active).length;
    const openNew = () => { setEditing(null); setForm({ code: `CAT-${String(data.categories.length + 1).padStart(2, "0")}`, name: "", description: "", active: true }); setModalOpen(true); };
    const openEdit = (category: DemoCategory) => { setEditing(category); setForm({ code: category.code, name: category.name, description: category.description, active: category.active }); setModalOpen(true); };

    function submit(event: FormEvent) {
        event.preventDefault();
        const name = form.name.trim();
        if (!name || !form.code.trim()) return;
        const duplicate = data.categories.some((category) => category.id !== editing?.id && (category.code.toLowerCase() === form.code.trim().toLowerCase() || category.name.toLocaleLowerCase("vi-VN") === name.toLocaleLowerCase("vi-VN")));
        if (duplicate) return;
        const updated: DemoCategory = editing
            ? { ...editing, code: form.code.trim().toUpperCase(), name, description: form.description.trim(), active: form.active }
            : { id: makeId("category"), code: form.code.trim().toUpperCase(), key: `custom-${makeId("key")}`, name, description: form.description.trim(), active: form.active };
        setData((current) => ({ ...current, categories: editing ? current.categories.map((category) => category.id === editing.id ? updated : category) : [...current.categories, updated] }));
        setModalOpen(false);
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/inventory/products">Menu &amp; nguyên liệu</Link><span className="sep">/</span><span className="current">Nhóm món</span></nav><h1 className="page-title">Nhóm món đồ uống</h1><p className="page-subtitle">Nhóm dùng để phân loại menu; số món được tính trực tiếp từ danh mục sản phẩm.</p></div><span className="text-xs text-[var(--muted)]">Dữ liệu demo</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Nhóm món" value={String(data.categories.length)} subLabel="Danh mục toàn chuỗi" tone="info" icon={<KpiIcon kind="grid" />} /><StatCard label="Đang sử dụng" value={String(activeCount)} subLabel="Có thể phân loại sản phẩm" tone="success" icon={<KpiIcon kind="document-check" />} /><StatCard label="Nhóm topping" value={String(toppingCount)} subLabel="Topping được quản lý riêng" tone="primary" icon={<KpiIcon kind="box" />} /><StatCard label="Món đang phân loại" value={String(data.products.length)} subLabel="Đếm từ danh mục món" tone="warning" icon={<KpiIcon kind="clock" />} /></div></section>

            <section className="card mb-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"><div><label className="form-label" htmlFor="category-search">Tìm kiếm</label><input id="category-search" className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã hoặc tên nhóm..." /></div><div><label className="form-label" htmlFor="category-status">Trạng thái</label><select id="category-status" className="form-input form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="active">Đang dùng</option><option value="inactive">Ngừng dùng</option></select></div><div className="flex gap-2"><button type="button" className="btn btn-secondary" onClick={() => { setSearch(""); setStatus("all"); setApplied({ search: "", status: "all" }); }}>Xóa lọc</button><button type="button" className="btn btn-primary" onClick={() => setApplied({ search, status })}>Áp dụng</button></div></div></section>

            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Danh mục nhóm món</h2><p className="text-sm text-[var(--muted)] mt-1">Số món lấy từ menu hiện hành, không lưu số đếm tĩnh.</p></div><button className="btn btn-primary" onClick={openNew}>+ Thêm nhóm món</button></div><DataTable><table className="w-full text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã nhóm", "Tên nhóm", "Số món", "Mô tả", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">Không có nhóm phù hợp.</td></tr> : rows.map((category) => <tr key={category.id} className="border-t border-[var(--border)]"><td className="px-4 py-3 font-semibold">{category.code}</td><td className="px-4 py-3">{category.name}</td><td className="px-4 py-3">{productsIn(category)}</td><td className="px-4 py-3">{category.description || "—"}</td><td className="px-4 py-3"><Badge variant={category.active ? "success" : "danger"}>{category.active ? "Đang dùng" : "Ngừng dùng"}</Badge></td><td className="px-4 py-3"><button className="btn btn-secondary" onClick={() => openEdit(category)}>Chỉnh sửa</button></td></tr>)}</tbody></table></DataTable></section>

            <Modal isOpen={modalOpen} title={editing ? "Cập nhật nhóm món" : "Thêm nhóm món"} onClose={() => setModalOpen(false)}><form onSubmit={submit} className="space-y-4"><div><label className="form-label" htmlFor="cat-code">Mã nhóm *</label><input id="cat-code" className="form-input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required /></div><div><label className="form-label" htmlFor="cat-name">Tên nhóm *</label><input id="cat-name" className="form-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></div><div><label className="form-label" htmlFor="cat-desc">Mô tả</label><textarea id="cat-desc" className="form-input form-textarea" rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Đang sử dụng</label><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button><button type="submit" className="btn btn-primary">Lưu nhóm</button></div></form></Modal>
        </div>
    );
}
