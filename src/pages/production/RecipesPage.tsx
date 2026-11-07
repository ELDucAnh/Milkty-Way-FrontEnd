import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import KpiIcon from "../shared/KpiIcon";
import {
  formatCurrency,
  formatDate,
  makeId,
  getTodayISO,
} from "../shared/formatters";

import { getIngredient, usableLotQuantity } from "../shared/business-demo";
import type {
  RecipeApproval,
  RecipeIngredient,
  RecipeKind,
  RecipeVersion,
} from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

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
  yieldQuantity: string;
  yieldUnit: string;
  version: string;
  effectiveDate: string;
  approver: string;
  changeReason: string;
}
const STATUS_LABEL: Record<RecipeApproval, string> = {
  approved: "Đã duyệt",
  draft: "Bản nháp",
  pending: "Chờ duyệt",
};
const EMPTY_FORM: RecipeForm = {
  kind: "drink",
  productId: "hd-001",
  outputIngredientId: "ing-tea-base",
  size: "M",
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

export default function RecipesPage() {
  const [data, setData] = useDemoState();
  const [search, setSearch] = useState("");
  const [approval, setApproval] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [applied, setApplied] = useState({
    search: "",
    approval: "all",
    kind: "all",
    size: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeVersion | null>(null);
  const [selected, setSelected] = useState<RecipeVersion | null>(null);
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [lines, setLines] = useState<DraftLine[]>([EMPTY_LINE()]);
  const rows = useMemo(
    () =>
      data.recipes.filter((recipe) => {
        const product = data.products.find(
          (item) => item.id === recipe.productId,
        );
        const output = getIngredient(data, recipe.outputIngredientId ?? "");
        const query = applied.search.trim().toLocaleLowerCase("vi-VN");
        return (
          (!query ||
            `${recipe.code} ${product?.name ?? output?.name ?? ""}`
              .toLocaleLowerCase("vi-VN")
              .includes(query)) &&
          (applied.approval === "all" || recipe.status === applied.approval) &&
          (applied.kind === "all" || recipe.kind === applied.kind) &&
          (applied.size === "all" || recipe.size === applied.size)
        );
      }),
    [data.recipes, data.products, data.ingredients, applied],
  );
  const currentCost = (recipe: RecipeVersion) =>
    recipe.ingredients
      .filter((line) => line.useType !== "optional-topping")
      .reduce((sum, line) => {
        const lots = data.lots.filter(
          (lot) =>
            lot.ingredientId === line.ingredientId &&
            usableLotQuantity(lot) > 0,
        );

        const totalQty = lots.reduce(
          (value, lot) => value + usableLotQuantity(lot),
          0,
        );

        const totalValue = lots.reduce(
          (value, lot) => value + usableLotQuantity(lot) * lot.unitCost,
          0,
        );

        const unitCost = totalQty > 0 ? totalValue / totalQty : 0;

        return sum + line.quantity * unitCost;
      }, 0);
  const approvedCount = data.recipes.filter(
    (recipe) => recipe.status === "approved",
  ).length;

  function openNew() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      effectiveDate: getTodayISO(),
    });
    setLines([EMPTY_LINE()]);
    setModalOpen(true);
  }
  function openEdit(recipe: RecipeVersion) {
    setEditing(recipe);
    setForm({
      kind: recipe.kind,
      productId: recipe.productId ?? data.products[0]?.id ?? "",
      outputIngredientId:
        recipe.outputIngredientId ?? data.ingredients[0]?.id ?? "",
      size: recipe.size,
      yieldQuantity: String(recipe.yieldQuantity),
      yieldUnit: recipe.yieldUnit,
      version: recipe.version,
      effectiveDate: recipe.effectiveDate,
      approver: recipe.approver,
      changeReason: recipe.changeReason,
    });
    setLines(
      recipe.ingredients.map((line) => ({
        ...line,
        quantity: String(line.quantity),
      })),
    );
    setModalOpen(true);
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
    )
      return;
    if (
      form.kind === "drink" &&
      !data.products.some((product) => product.id === form.productId)
    )
      return;
    if (
      form.kind === "prep" &&
      !data.ingredients.some(
        (ingredient) => ingredient.id === form.outputIngredientId,
      )
    )
      return;
    if (
      !lines.length ||
      lines.some(
        (line) =>
          !line.ingredientId ||
          !Number.isFinite(Number(line.quantity)) ||
          Number(line.quantity) <= 0,
      )
    )
      return;
    const recipe: RecipeVersion = {
      id: editing?.id ?? makeId("recipe"),
      code:
        editing?.code ??
        (form.kind === "drink"
          ? `RC-${data.products.find((product) => product.id === form.productId)?.code}-${form.size}-${form.version}`
          : `RC-BTP-${form.outputIngredientId}-${form.version}`),
      kind: form.kind,
      productId: form.kind === "drink" ? form.productId : null,
      outputIngredientId: form.kind === "prep" ? form.outputIngredientId : null,
      size: form.kind === "prep" ? "Mẻ" : form.size,
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
        ? current.recipes.map((item) =>
            item.id === editing.id ? recipe : item,
          )
        : [recipe, ...current.recipes],
    }));
    setModalOpen(false);
  }
  function sendForApproval(recipe: RecipeVersion) {
    setData((current) => ({
      ...current,
      recipes: current.recipes.map((item) =>
        item.id === recipe.id ? { ...item, status: "pending" } : item,
      ),
    }));
  }
  function approve(recipe: RecipeVersion) {
    if (recipe.status !== "pending" || !recipe.ingredients.length) {
      return;
    }

    const approverName = recipe.approver.trim() || "Quản lý sản phẩm";

    setData((current) => {
      const recipes = current.recipes.map((item) =>
        item.id === recipe.id
          ? {
              ...item,
              approver: approverName,
              status: "approved" as const,
            }
          : item,
      );

      const productId = recipe.productId;

      if (!productId) {
        return { ...current, recipes };
      }

      const product = current.products.find((item) => item.id === productId);

      if (!product) {
        return { ...current, recipes };
      }

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
          ? current.products.map((item) =>
              item.id === productId
                ? { ...item, status: "active" as const }
                : item,
            )
          : current.products,
      };
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/production/batches">Sản xuất tập trung</Link>
            <span className="sep">/</span>
            <span className="current">Công thức</span>
          </nav>
          <h1 className="page-title">Công thức pha chế &amp; chế biến</h1>
          <p className="page-subtitle">
            Tách công thức món/size khỏi công thức mẻ bán thành phẩm; mỗi phiên
            bản lưu định lượng, đơn vị và trạng thái duyệt.
          </p>
        </div>
        <span className="text-xs text-[var(--muted)]">MVP demo</span>
      </div>
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Công thức đã duyệt"
            value={String(approvedCount)}
            subLabel="Có thể dùng theo hiệu lực"
            tone="success"
            icon={<KpiIcon kind="document-check" />}
          />
          <StatCard
            label="Chờ phê duyệt"
            value={String(
              data.recipes.filter((item) => item.status === "pending").length,
            )}
            subLabel="Chưa dùng cho nghiệp vụ"
            tone="warning"
            icon={<KpiIcon kind="clock" />}
          />
          <StatCard
            label="Thiếu định mức"
            value={String(
              data.recipes.filter((item) => item.ingredients.length === 0)
                .length,
            )}
            subLabel="Cần bổ sung dòng nguyên liệu"
            tone="danger"
            icon={<KpiIcon kind="warning" />}
          />
          <StatCard
            label="COGS tham chiếu"
            value={formatCurrency(
              rows
                .filter((item) => item.status === "approved")
                .reduce((sum, item) => sum + currentCost(item), 0),
            )}
            subLabel="Ước tính theo giá vốn lô demo"
            tone="info"
            icon={<KpiIcon kind="currency" />}
          />
        </div>
      </section>
      <section className="card mb-6 border-l-4 border-[var(--info)]">
        <h2 className="text-sm font-bold mb-1">Công thức có phiên bản</h2>
        <p className="text-sm text-[var(--muted)]">
          Công thức pha một ly được gắn với món/size. Công thức chế biến ghi đầu
          vào và sản lượng của mẻ bán thành phẩm. Mỗi dòng có định lượng, đơn vị
          chuẩn và quy tắc topping nếu có.
        </p>
      </section>
      <section className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div>
            <label className="form-label" htmlFor="recipe-search">
              Tìm kiếm
            </label>
            <input
              id="recipe-search"
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã công thức hoặc tên món..."
            />
          </div>
          <div>
            <label className="form-label" htmlFor="recipe-kind-filter">
              Loại công thức
            </label>
            <select
              id="recipe-kind-filter"
              className="form-input form-select"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="drink">Món/size</option>
              <option value="prep">Mẻ chế biến</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="recipe-size-filter">
              Size / đầu ra
            </label>
            <select
              id="recipe-size-filter"
              className="form-input form-select"
              value={sizeFilter}
              onChange={(event) => setSizeFilter(event.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="Phần">Phần</option>
              <option value="Mẻ">Mẻ</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="recipe-approval">
              Trạng thái duyệt
            </label>
            <select
              id="recipe-approval"
              className="form-input form-select"
              value={approval}
              onChange={(event) => setApproval(event.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="approved">Đã duyệt</option>
              <option value="draft">Bản nháp</option>
              <option value="pending">Chờ duyệt</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch("");
                setApproval("all");
                setKindFilter("all");
                setSizeFilter("all");
                setApplied({
                  search: "",
                  approval: "all",
                  kind: "all",
                  size: "all",
                });
              }}
            >
              Xóa lọc
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setApplied({
                  search,
                  approval,
                  kind: kindFilter,
                  size: sizeFilter,
                })
              }
            >
              Áp dụng
            </button>
          </div>
        </div>
      </section>
      <section className="card p-0 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-bold">Danh sách công thức</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Chỉ phiên bản đã duyệt mới đủ điều kiện dùng.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            Tạo công thức
          </button>
        </div>
        <DataTable>
          <table className="w-full min-w-[1150px] text-sm text-left">
            <thead className="bg-[var(--background)] text-[var(--muted)]">
              <tr>
                {[
                  "Mã",
                  "Loại",
                  "Món / bán thành phẩm",
                  "Size / mẻ",
                  "Phiên bản",
                  "Định mức",
                  "COGS ước tính",
                  "Hiệu lực",
                  "Duyệt",
                  "Thao tác",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-3 font-semibold whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((recipe) => {
                const product = data.products.find(
                  (item) => item.id === recipe.productId,
                );
                const output = getIngredient(
                  data,
                  recipe.outputIngredientId ?? "",
                );
                return (
                  <tr
                    key={recipe.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-3 py-3 font-semibold">{recipe.code}</td>
                    <td className="px-3 py-3">
                      {recipe.kind === "drink" ? "Pha món" : "Chế biến mẻ"}
                    </td>
                    <td className="px-3 py-3">
                      {product?.name ?? output?.name ?? "Không tìm thấy"}
                    </td>
                    <td className="px-3 py-3">
                      {recipe.yieldQuantity} {recipe.yieldUnit} · {recipe.size}
                    </td>
                    <td className="px-3 py-3">{recipe.version}</td>
                    <td className="px-3 py-3">
                      {recipe.ingredients.length} dòng
                    </td>
                    <td className="px-3 py-3">
                      {formatCurrency(currentCost(recipe))}
                    </td>
                    <td className="px-3 py-3">
                      {formatDate(recipe.effectiveDate)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          recipe.status === "approved"
                            ? "success"
                            : recipe.status === "pending"
                              ? "warning"
                              : "info"
                        }
                      >
                        {STATUS_LABEL[recipe.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-secondary"
                          onClick={() => setSelected(recipe)}
                        >
                          Chi tiết
                        </button>
                        {recipe.status === "draft" && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => openEdit(recipe)}
                          >
                            Sửa nháp
                          </button>
                        )}
                        {recipe.status === "draft" && (
                          <button
                            className="btn btn-primary"
                            onClick={() => sendForApproval(recipe)}
                          >
                            Gửi duyệt
                          </button>
                        )}
                        {recipe.status === "pending" && (
                          <button
                            className="btn btn-primary"
                            onClick={() => approve(recipe)}
                          >
                            Duyệt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      </section>

      <Modal
        isOpen={modalOpen}
        title={editing ? "Chỉnh sửa công thức nháp" : "Tạo công thức"}
        size="2xl"
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={saveDraft}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="recipe-kind">
                Loại công thức
              </label>
              <select
                id="recipe-kind"
                className="form-input form-select"
                value={form.kind}
                disabled={!!editing}
                onChange={(event) => {
                  const nextKind = event.target.value as RecipeKind;
                  const prepOutput = getIngredient(
                    data,
                    form.outputIngredientId,
                  );
                  setForm((current) => ({
                    ...current,
                    kind: nextKind,
                    yieldUnit:
                      nextKind === "prep"
                        ? (prepOutput?.baseUnit ?? current.yieldUnit)
                        : "ly",
                  }));
                }}
              >
                <option value="drink">Pha món theo size</option>
                <option value="prep">Chế biến bán thành phẩm</option>
              </select>
            </div>
            {form.kind === "drink" ? (
              <div>
                <label className="form-label" htmlFor="recipe-product">
                  Món *
                </label>
                <select
                  id="recipe-product"
                  className="form-input form-select"
                  value={form.productId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      productId: event.target.value,
                    }))
                  }
                >
                  {data.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} · {product.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="form-label" htmlFor="recipe-output">
                  Bán thành phẩm *
                </label>
                <select
                  id="recipe-output"
                  className="form-input form-select"
                  value={form.outputIngredientId}
                  onChange={(event) => {
                    const nextIngredientId = event.target.value;
                    const nextOutput = getIngredient(data, nextIngredientId);
                    setForm((current) => ({
                      ...current,
                      outputIngredientId: nextIngredientId,
                      yieldUnit: nextOutput?.baseUnit ?? current.yieldUnit,
                    }));
                  }}
                >
                  {data.ingredients
                    .filter((ingredient) => ingredient.group === "prepared")
                    .map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="recipe-size">
                Size / đơn vị đầu ra
              </label>
              <select
                id="recipe-size"
                className="form-input form-select"
                value={form.kind === "prep" ? "Mẻ" : form.size}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    size: event.target.value as RecipeVersion["size"],
                  }))
                }
                disabled={form.kind === "prep"}
              >
                <option>M</option>
                <option>L</option>
                <option>Phần</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="recipe-yield">
                Sản lượng đầu ra *
              </label>
              <input
                id="recipe-yield"
                type="number"
                min="0.001"
                step="0.001"
                className="form-input"
                value={form.yieldQuantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    yieldQuantity: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>
          {form.kind === "prep" && (
            <div>
              <label className="form-label" htmlFor="recipe-yield-unit">
                Đơn vị đầu ra
              </label>
              <input
                id="recipe-yield-unit"
                className="form-input"
                value={form.yieldUnit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    yieldUnit: event.target.value,
                  }))
                }
                required
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label" htmlFor="recipe-version">
                Phiên bản *
              </label>
              <input
                id="recipe-version"
                className="form-input"
                value={form.version}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    version: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="recipe-date">
                Ngày hiệu lực *
              </label>
              <input
                id="recipe-date"
                type="date"
                className="form-input"
                value={form.effectiveDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    effectiveDate: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="recipe-approver">
                Người duyệt
              </label>
              <input
                id="recipe-approver"
                className="form-input"
                value={form.approver}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    approver: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="recipe-change">
              Lý do thay đổi *
            </label>
            <input
              id="recipe-change"
              className="form-input"
              value={form.changeReason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  changeReason: event.target.value,
                }))
              }
              required
            />
          </div>
          <section className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Nguyên liệu định lượng</h3>
                <p className="text-xs text-[var(--muted)]">
                  Đơn vị chuẩn lấy từ danh mục nguyên liệu.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setLines((current) => [
                    ...current,
                    {
                      id: makeId("line"),
                      ingredientId: data.ingredients[0]?.id ?? "",
                      quantity: "",
                      useType: "required",
                      note: "",
                      optionRule: "",
                    },
                  ])
                }
              >
                + Thêm dòng
              </button>
            </div>
            <DataTable>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    {[
                      "Nguyên liệu",
                      "Định lượng",
                      "Đơn vị",
                      "Loại",
                      "Quy tắc / ghi chú",
                      "",
                    ].map((label) => (
                      <th key={label} className="px-2 py-2">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-2 py-2">
                        <select
                          aria-label="Nguyên liệu"
                          className="form-input form-select min-w-[170px]"
                          value={line.ingredientId}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id
                                  ? {
                                      ...item,
                                      ingredientId: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          {data.ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          aria-label="Định lượng"
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="form-input w-28"
                          value={line.quantity}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id
                                  ? { ...item, quantity: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                        />
                      </td>
                      <td className="px-2 py-2">
                        {getIngredient(data, line.ingredientId)?.baseUnit}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          aria-label="Loại sử dụng"
                          className="form-input form-select"
                          value={line.useType}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id
                                  ? {
                                      ...item,
                                      useType: event.target
                                        .value as RecipeIngredient["useType"],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="required">Bắt buộc</option>
                          <option value="default-topping">
                            Topping mặc định
                          </option>
                          <option value="optional-topping">
                            Topping tùy chọn
                          </option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          aria-label="Quy tắc / ghi chú"
                          className="form-input min-w-[170px]"
                          value={line.optionRule || line.note}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id
                                  ? {
                                      ...item,
                                      optionRule: event.target.value,
                                      note: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={lines.length <= 1}
                          onClick={() =>
                            setLines((current) =>
                              current.filter((item) => item.id !== line.id),
                            )
                          }
                        >
                          Bớt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </section>
          <p className="text-xs text-[var(--muted)]">
            Món pha và bán thành phẩm có công thức riêng. Bản nháp chưa được
            dùng để trừ tồn hoặc cấp phát.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu bản nháp
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selected}
        title="Chi tiết công thức"
        size="lg"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-3">
            <p className="font-semibold">
              {selected.code} · {selected.version}
            </p>
            <p>
              {selected.kind === "drink"
                ? data.products.find(
                    (product) => product.id === selected.productId,
                  )?.name
                : getIngredient(data, selected.outputIngredientId ?? "")
                    ?.name}{" "}
              · {selected.size} · {selected.yieldQuantity} {selected.yieldUnit}
            </p>
            <p>
              Ngày hiệu lực: {formatDate(selected.effectiveDate)} · Người duyệt:{" "}
              {selected.approver || "Chưa phân công"}
            </p>
            <p>Lý do: {selected.changeReason || "—"}</p>
            <div>
              <h3 className="font-semibold mb-2">Định lượng</h3>
              {selected.ingredients.map((line) => (
                <p key={line.id} className="text-sm">
                  {getIngredient(data, line.ingredientId)?.name}:{" "}
                  {line.quantity} {line.unit} ·{" "}
                  {line.useType === "required"
                    ? "Bắt buộc"
                    : line.useType === "default-topping"
                      ? "Topping mặc định"
                      : "Topping tùy chọn"}{" "}
                  {line.optionRule && `· ${line.optionRule}`}
                </p>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
