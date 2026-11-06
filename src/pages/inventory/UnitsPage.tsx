import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { makeId } from "../shared/formatters";
import type { IngredientDimension } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const DIMENSIONS: Record<IngredientDimension, { label: string; baseUnit: string; alternatives: string[] }> = {
    mass: { label: "Khối lượng", baseUnit: "g", alternatives: ["g", "mg"] },
    volume: { label: "Thể tích", baseUnit: "ml", alternatives: ["ml"] },
    count: { label: "Đếm", baseUnit: "cái", alternatives: ["cái", "miếng", "chai", "ly", "phần"] },
};

export default function UnitsPage() {
    const [data, setData] = useDemoState();
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ unit: "", dimension: "mass" as IngredientDimension, baseUnit: "g", factor: "1", example: "" });
    const rows = useMemo(() => data.units.filter((item) => !search || `${item.unit} ${item.baseUnit}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"))), [data.units, search]);
    const activeCount = data.units.filter((item) => item.active && item.factor > 0).length;
    const invalidCount = data.units.filter((item) => !item.active || item.factor <= 0).length;

    function addUnit(event: FormEvent) {
        event.preventDefault();
        const factor = Number(form.factor);
        if (!form.unit.trim() || !Number.isFinite(factor) || factor <= 0 || !DIMENSIONS[form.dimension].alternatives.includes(form.baseUnit)) return;
        if (data.units.some((item) => item.unit.toLocaleLowerCase("vi-VN") === form.unit.trim().toLocaleLowerCase("vi-VN"))) return;
        setData((current) => ({ ...current, units: [...current.units, { id: makeId("unit"), unit: form.unit.trim(), dimension: form.dimension, baseUnit: DIMENSIONS[form.dimension].baseUnit, factor, example: form.example.trim() || `1 ${form.unit.trim()} = ${factor} ${DIMENSIONS[form.dimension].baseUnit}`, active: true }] }));
        setForm({ unit: "", dimension: "mass", baseUnit: "g", factor: "1", example: "" });
        setModalOpen(false);
    }

    return (
        <div>
            <div className="page-header"><div><nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/inventory/products">Menu &amp; nguyên liệu</Link><span className="sep">/</span><span className="current">Đơn vị</span></nav><h1 className="page-title">Đơn vị tính &amp; quy đổi</h1><p className="page-subtitle">Khai báo quy đổi theo đúng đại lượng; không quy đổi khối lượng sang thể tích hoặc đơn vị đếm.</p></div><span className="text-xs text-[var(--muted)]">Đơn vị cơ sở theo nguyên liệu</span></div>
            <section className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Đơn vị đã khai báo" value={String(data.units.length)} subLabel="Quy đổi chuẩn" tone="info" icon={<KpiIcon kind="ruler" />} /><StatCard label="Quy đổi hợp lệ" value={String(activeCount)} subLabel="Hệ số lớn hơn 0" tone="primary" icon={<KpiIcon kind="balance" />} /><StatCard label="Đang dùng" value={String(data.units.filter((item) => item.active).length)} subLabel="Theo đơn vị chuẩn" tone="success" icon={<KpiIcon kind="document-check" />} /><StatCard label="Cần kiểm tra" value={String(invalidCount)} subLabel="Chưa xác minh hệ số" tone="warning" icon={<KpiIcon kind="warning" />} /></div></section>

            <section className="card mb-6 border-l-4 border-[var(--info)]"><h2 className="text-sm font-bold mb-1">Quy tắc quy đổi</h2><p className="text-sm text-[var(--muted)]">Khối lượng quy đổi về g, thể tích về ml, đơn vị đếm quy đổi về đơn vị đếm chuẩn. Hệ số phải dương và không làm thay đổi tồn cũ khi cập nhật.</p></section>
            <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Bảng đơn vị và hệ số</h2><p className="text-sm text-[var(--muted)] mt-1">Chọn loại đại lượng trước khi khai báo đơn vị.</p></div><button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Thêm đơn vị</button></div><div className="p-4"><label className="form-label" htmlFor="unit-search">Tìm đơn vị</label><input id="unit-search" className="form-input max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc đơn vị cơ sở..." /></div><DataTable><table className="w-full text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Đơn vị", "Đại lượng", "Đơn vị cơ sở", "Hệ số", "Ví dụ", "Trạng thái"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-t border-[var(--border)]"><td className="px-4 py-3 font-semibold">{item.unit}</td><td className="px-4 py-3">{DIMENSIONS[item.dimension].label}</td><td className="px-4 py-3">{item.baseUnit}</td><td className="px-4 py-3">{item.factor > 0 ? item.factor.toLocaleString("vi-VN") : "Chưa xác minh"}</td><td className="px-4 py-3">{item.example}</td><td className="px-4 py-3"><Badge variant={item.active && item.factor > 0 ? "success" : "warning"}>{item.active && item.factor > 0 ? "Đang dùng" : "Cần xác minh"}</Badge></td></tr>)}</tbody></table></DataTable></section>

            <Modal isOpen={modalOpen} title="Thêm đơn vị quy đổi" onClose={() => setModalOpen(false)}><form className="space-y-4" onSubmit={addUnit}><div><label className="form-label" htmlFor="unit-name">Tên đơn vị *</label><input id="unit-name" className="form-input" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} required /></div><div><label className="form-label" htmlFor="unit-dimension">Loại đại lượng *</label><select id="unit-dimension" className="form-input form-select" value={form.dimension} onChange={(event) => { const dimension = event.target.value as IngredientDimension; setForm((current) => ({ ...current, dimension, baseUnit: DIMENSIONS[dimension].baseUnit })); }}><option value="mass">Khối lượng</option><option value="volume">Thể tích</option><option value="count">Đếm</option></select></div><div><label className="form-label" htmlFor="unit-base">Quy đổi về đơn vị cơ sở</label><input id="unit-base" className="form-input" value={DIMENSIONS[form.dimension].baseUnit} readOnly /></div><div><label className="form-label" htmlFor="unit-factor">Hệ số *</label><input id="unit-factor" type="number" step="0.0001" min="0.0001" className="form-input" value={form.factor} onChange={(event) => setForm((current) => ({ ...current, factor: event.target.value }))} required /></div><div><label className="form-label" htmlFor="unit-example">Ví dụ</label><input id="unit-example" className="form-input" value={form.example} onChange={(event) => setForm((current) => ({ ...current, example: event.target.value }))} /></div><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button><button type="submit" className="btn btn-primary">Lưu đơn vị</button></div></form></Modal>
        </div>
    );
}
