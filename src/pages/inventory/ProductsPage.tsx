import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import { formatCurrency } from "../shared/formatters";
import { getIngredient } from "../shared/business-demo";
import type {
  Product,
  ProductCategory,
  ProductStatus,
} from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  "milk-tea": "Trà sữa",
  "fruit-tea": "Trà trái cây",
  macchiato: "Macchiato",
  topping: "Topping",
  seasonal: "Món theo mùa",
};
const STATUS_LABEL: Record<ProductStatus, string> = {
  active: "Đang bán",
  "branch-locked": "Khóa tại cửa hàng",
  inactive: "Ngừng bán",
  "pending-recipe": "Chờ duyệt công thức",
};
const STATUS_VARIANT = {
  active: "success",
  "branch-locked": "warning",
  inactive: "danger",
  "pending-recipe": "warning",
} as const;

export default function ProductsPage() {
  const navigate = useNavigate();
  const [data] = useDemoState();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [applied, setApplied] = useState({
    search: "",
    category: "all",
    status: "all",
  });
  const [selected, setSelected] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(
    () =>
      data.products.filter((product) => {
        const query = applied.search.trim().toLocaleLowerCase("vi-VN");
        return (
          (!query ||
            `${product.code} ${product.name}`
              .toLocaleLowerCase("vi-VN")
              .includes(query)) &&
          (applied.category === "all" ||
            product.category === applied.category) &&
          (applied.status === "all" || product.status === applied.status)
        );
      }),
    [data.products, applied],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = data.products.filter(
    (product) => product.status === "active",
  ).length;
  const approvedCount = data.products.filter(
    (product) =>
      product.status === "active" &&
      data.recipes.some(
        (recipe) =>
          recipe.productId === product.id && recipe.status === "approved",
      ),
  ).length;
  const lockedCount = data.products.filter(
    (product) => product.status === "branch-locked",
  ).length;
  const reviewCount = data.products.filter(
    (product) => product.status === "pending-recipe",
  ).length;

  function applyFilters() {
    setApplied({ search, category, status });
    setPage(1);
  }
  function clearFilters() {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setApplied({ search: "", category: "all", status: "all" });
    setPage(1);
  }
  function sizes(product: Product) {
    return product.variants.map((variant) => variant.size).join(" / ");
  }
  function prices(product: Product) {
    return product.variants
      .map((variant) => `${variant.size} ${formatCurrency(variant.price)}`)
      .join(" · ");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <span>Menu &amp; nguyên liệu</span>
            <span className="sep">/</span>
            <span className="current">Sản phẩm</span>
          </nav>
          <h1 className="page-title">Menu đồ uống &amp; topping</h1>
          <p className="page-subtitle">
            Quản lý món, size, giá chuẩn, công thức và topping theo phiên bản
            được duyệt.
          </p>
        </div>
        <span className="text-xs text-[var(--muted)]">Dữ liệu demo</span>
      </div>

      <section className="page-section mb-6" aria-label="Thống kê menu">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Món đang bán"
            value={String(activeCount)}
            subLabel="Menu lõi toàn chuỗi"
            tone="primary"
            icon={<KpiIcon kind="grid" />}
          />
          <StatCard
            label="Có công thức đã duyệt"
            value={String(approvedCount)}
            subLabel="Theo phiên bản hiệu lực"
            tone="success"
            icon={<KpiIcon kind="document-check" />}
          />
          <StatCard
            label="Chi nhánh tạm khóa"
            value={String(lockedCount)}
            subLabel="Do tình trạng nguyên liệu"
            tone="warning"
            icon={<KpiIcon kind="branch" />}
          />
          <StatCard
            label="Chờ duyệt công thức"
            value={String(reviewCount)}
            subLabel="Chưa được dùng để bán"
            tone="warning"
            icon={<KpiIcon kind="currency" />}
          />
        </div>
      </section>

      <section className="card mb-6 border-l-4 border-[var(--info)]">
        <h2 className="text-sm font-bold mb-1">Quy tắc menu chuỗi</h2>
        <p className="text-sm text-[var(--muted)]">
          Giá chuẩn dùng chung toàn chuỗi và chỉ thay đổi qua phiên bản được
          duyệt. Cửa hàng có thể tạm khóa món/topping khi không đủ nguyên liệu,
          không tự sửa giá.
        </p>
      </section>

      <section className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
          <div>
            <label className="form-label" htmlFor="products-search">
              Tìm kiếm
            </label>
            <input
              id="products-search"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mã hoặc tên món..."
            />
          </div>
          <div>
            <label className="form-label" htmlFor="products-category">
              Nhóm món
            </label>
            <select
              id="products-category"
              className="form-input form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Tất cả nhóm</option>
              {data.categories
                .filter((item) => item.active)
                .map((item) => (
                  <option key={item.id} value={item.key}>
                    {item.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="products-status">
              Trạng thái
            </label>
            <select
              id="products-status"
              className="form-input form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyFilters}
            >
              Áp dụng
            </button>
          </div>
        </div>
      </section>

      <section className="card p-0 overflow-hidden mb-6">
        <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-bold">Danh mục món và topping</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Giá niêm yết, COGS theo size và tình trạng kinh doanh.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/inventory/products/new")}
          >
            Khai báo món mới
          </button>
        </div>
        <DataTable>
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--background)] text-[var(--muted)]">
              <tr>
                {[
                  "Mã / Tên món",
                  "Nhóm món",
                  "Size",
                  "Giá bán",
                  "COGS",
                  "Trạng thái",
                ].map((label) => (
                  <th key={label} className="px-4 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[var(--muted)]"
                  >
                    Không tìm thấy món phù hợp.
                  </td>
                </tr>
              ) : (
                rows.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--background)]"
                  >
                    <td className="px-4 py-3">
                      <button
                        className="text-left"
                        onClick={() =>
                          navigate(`/inventory/products/${product.id}`)
                        }
                      >
                        <span className="font-semibold text-[var(--primary)]">
                          {product.code}
                        </span>
                        <br />
                        {product.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {data.categories.find(
                        (item) => item.key === product.category,
                      )?.name ?? product.category}
                    </td>
                    <td className="px-4 py-3">{sizes(product)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {prices(product)}
                    </td>
                    <td className="px-4 py-3">
                      {Object.values(product.cogsBySize).some(
                        (value) => value !== null,
                      )
                        ? Object.entries(product.cogsBySize)
                            .map(([size, value]) =>
                              value === null
                                ? null
                                : `${size} ${formatCurrency(value)}`,
                            )
                            .filter(Boolean)
                            .join(" · ")
                        : "Chưa có định mức"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(product)}>
                        <Badge variant={STATUS_VARIANT[product.status]}>
                          {product.status === "branch-locked"
                            ? `${product.lockedStoreIds.join(", ")} tạm khóa`
                            : STATUS_LABEL[product.status]}
                        </Badge>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTable>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)] mb-6">
        <span>
          Đang hiển thị {filtered.length ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, filtered.length)} / {filtered.length} món
        </span>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Trước
          </button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Sau
          </button>
        </div>
      </div>

      <Modal
        isOpen={selected !== null}
        title="Thông tin món và trạng thái bán"
        size="lg"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[var(--muted)]">{selected.code}</p>
              <p className="font-semibold">{selected.name}</p>
            </div>
            <p>
              Nhóm:{" "}
              {data.categories.find((item) => item.key === selected.category)
                ?.name ?? selected.category}
            </p>
            <p>Giá chuẩn: {prices(selected)}</p>
            <p>Trạng thái: {STATUS_LABEL[selected.status]}</p>
            <p>
              Cửa hàng tạm khóa:{" "}
              {selected.lockedStoreIds.length
                ? selected.lockedStoreIds.join(", ")
                : "Không có"}
            </p>
            <div>
              <p className="font-semibold">Topping</p>
              {selected.toppings.length ? (
                selected.toppings.map((topping) => (
                  <p key={topping.ingredientId}>
                    {getIngredient(data, topping.ingredientId)?.name ??
                      topping.ingredientId}
                    : {topping.default ? "Mặc định" : "Tùy chọn"},{" "}
                    {topping.optional ? "có thể bỏ" : "bắt buộc"} ·{" "}
                    {topping.quantity} {topping.unit}
                  </p>
                ))
              ) : (
                <p>Chưa khai báo topping.</p>
              )}
            </div>
            <p className="text-sm text-[var(--muted)]">{selected.note}</p>
            <div className="flex justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => setSelected(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
