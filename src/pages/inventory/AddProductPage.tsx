import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { useToast } from "../../contexts/ToastContext";
import { getTodayISO, makeId } from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";
import { usableLotQuantity } from "../shared/business-demo";
import type {
  ProductCategory,
  ProductVariant,
  RecipeIngredient,
} from "../shared/business-demo";

type DrinkSize = "M" | "L";
interface DraftLine {
  id: string;
  ingredientId: string;
  quantity: string;
  note: string;
  useType: RecipeIngredient["useType"];
  optionRule: string;
}
const makeRecipeLine = (
  ingredientId = "ing-tea-base",
  quantity = "100",
  note = "",
  useType: DraftLine["useType"] = "required",
): DraftLine => ({
  id: makeId("line"),
  ingredientId,
  quantity,
  note,
  useType,
  optionRule: "",
});
const INITIAL_LINES: Record<DrinkSize, DraftLine[]> = {
  M: [
    makeRecipeLine("ing-tea-base", "100", "Nền trà"),
    makeRecipeLine("ing-milk", "30"),
    makeRecipeLine("ing-syrup", "25", "Điều chỉnh theo mức đường"),
    makeRecipeLine("ing-cup", "1", "Bao bì"),
  ],
  L: [
    makeRecipeLine("ing-tea-base", "140", "Nền trà"),
    makeRecipeLine("ing-milk", "40"),
    makeRecipeLine("ing-syrup", "35", "Điều chỉnh theo mức đường"),
    makeRecipeLine("ing-cup", "1", "Bao bì"),
  ],
};

type ToppingMode = "optional" | "default-removable" | "default-required";

interface ToppingConfig {
  ingredientId: string;
  price: string;
  quantity: string;
  mode: ToppingMode;
}

function getToppingSettings(mode: ToppingMode) {
  switch (mode) {
    case "optional":
      return {
        default: false,
        optional: true,
        useType: "optional-topping" as const,
        optionRule: "Tùy chọn; chỉ giữ/trừ khi thêm",
      };

    case "default-removable":
      return {
        default: true,
        optional: true,
        useType: "default-topping" as const,
        optionRule: "Mặc định; bỏ thì không giữ/trừ",
      };

    case "default-required":
      return {
        default: true,
        optional: false,
        useType: "default-topping" as const,
        optionRule: "Mặc định, không được bỏ",
      };
  }
}

export default function AddProductPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useDemoState();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [priceM, setPriceM] = useState("35000");
  const [priceL, setPriceL] = useState("42000");
  const [supportsM, setSupportsM] = useState(true);
  const [supportsL, setSupportsL] = useState(true);
  const [selectedSize, setSelectedSize] = useState<DrinkSize>("M");
  const [lines, setLines] =
    useState<Record<DrinkSize, DraftLine[]>>(INITIAL_LINES);
  const [approver, setApprover] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(getTodayISO());
  const [changeReason, setChangeReason] = useState("Tạo công thức ban đầu");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const [toppingConfigs, setToppingConfigs] = useState<ToppingConfig[]>([
    {
      ingredientId: "ing-pearl",
      price: "8000",
      quantity: "30",
      mode: "optional",
    },
  ]);
  const [showSaved, setShowSaved] = useState(false);

  const usableSizes = useMemo(
    () =>
      [supportsM ? "M" : null, supportsL ? "L" : null].filter(
        Boolean,
      ) as DrinkSize[],
    [supportsM, supportsL],
  );
  const toppingIngredients = data.ingredients.filter(
    (item) => item.group === "prepared" || item.group === "topping",
  );
  function toggleTopping(ingredientId: string, checked: boolean) {
    setToppingConfigs((current) => {
      if (checked) {
        if (current.some((item) => item.ingredientId === ingredientId)) {
          return current;
        }

        return [
          ...current,
          {
            ingredientId,
            price: "0",
            quantity: "",
            mode: "optional",
          },
        ];
      }

      return current.filter((item) => item.ingredientId !== ingredientId);
    });
  }
  function updateTopping(
    ingredientId: string,
    patch: Partial<Omit<ToppingConfig, "ingredientId">>,
  ) {
    setToppingConfigs((current) =>
      current.map((item) =>
        item.ingredientId === ingredientId ? { ...item, ...patch } : item,
      ),
    );
  }
  const updateLine = (size: DrinkSize, id: string, patch: Partial<DraftLine>) =>
    setLines((current) => ({
      ...current,
      [size]: current[size].map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    }));
  const addLine = (size: DrinkSize) =>
    setLines((current) => ({
      ...current,
      [size]: [...current[size], makeRecipeLine()],
    }));
  const removeLine = (size: DrinkSize, id: string) =>
    setLines((current) => ({
      ...current,
      [size]: current[size].filter((line) => line.id !== id),
    }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const variants: ProductVariant[] = [
      ...(supportsM ? [{ size: "M" as const, price: Number(priceM) }] : []),
      ...(supportsL ? [{ size: "L" as const, price: Number(priceL) }] : []),
    ];
    if (
      !name.trim() ||
      !code.trim() ||
      !category ||
      variants.length === 0 ||
      variants.some(
        (variant) => !Number.isFinite(variant.price) || variant.price <= 0,
      )
    ) {
      showToast({
        type: "error",
        title: "Thông tin món chưa hợp lệ",
        message:
          "Cần có mã, tên, nhóm món, ít nhất một size và giá bán lớn hơn 0.",
      });
      return;
    }
    if (
      data.products.some(
        (product) =>
          product.code.toLocaleLowerCase("vi-VN") ===
          code.trim().toLocaleLowerCase("vi-VN"),
      )
    ) {
      showToast({
        type: "error",
        title: "Mã món đã tồn tại",
        message: "Hãy dùng một mã món khác trong menu toàn chuỗi.",
      });
      return;
    }
    if (
      usableSizes.some(
        (size) =>
          lines[size].length === 0 ||
          lines[size].some(
            (line) =>
              !line.ingredientId ||
              !Number.isFinite(Number(line.quantity)) ||
              Number(line.quantity) <= 0,
          ),
      )
    ) {
      showToast({
        type: "error",
        title: "Công thức chưa hợp lệ",
        message:
          "Mỗi size cần ít nhất một dòng nguyên liệu có định lượng lớn hơn 0.",
      });
      return;
    }
    const invalidTopping = toppingConfigs.find((config) => {
      const ingredient = data.ingredients.find(
        (item) => item.id === config.ingredientId,
      );

      const price = Number(config.price);
      const quantity = Number(config.quantity);

      return (
        !ingredient ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      );
    });

    if (invalidTopping) {
      const ingredient = data.ingredients.find(
        (item) => item.id === invalidTopping.ingredientId,
      );

      showToast({
        type: "error",
        title: "Thông tin topping chưa hợp lệ",
        message: `Vui lòng kiểm tra giá và định lượng của ${ingredient?.name ?? "topping"}.`,
      });

      return;
    }
    const productId = makeId("product");
    const normalizedCode = code.trim().toUpperCase();
    const recipeIngredientsForSize = (size: DrinkSize): RecipeIngredient[] => {
      // Chuyển các nguyên liệu nền thành dòng công thức.
      const recipeLines: RecipeIngredient[] = lines[size].map((line) => {
        const config = toppingConfigs.find(
          (item) => item.ingredientId === line.ingredientId,
        );

        const ingredient = data.ingredients.find(
          (item) => item.id === line.ingredientId,
        );

        if (!config) {
          return {
            id: line.id,
            ingredientId: line.ingredientId,
            quantity: Number(line.quantity),
            unit: ingredient?.baseUnit ?? "",
            useType: line.useType,
            note: line.note.trim(),
            optionRule: line.optionRule.trim(),
          };
        }

        const settings = getToppingSettings(config.mode);

        return {
          id: line.id,
          ingredientId: line.ingredientId,
          quantity: Number(config.quantity),
          unit: ingredient?.baseUnit ?? "",
          useType: settings.useType,
          note: "Topping theo lựa chọn món",
          optionRule: settings.optionRule,
        };
      });

      // Kiểm tra những topping chưa xuất hiện trong công thức nền.
      const existingIds = new Set(recipeLines.map((line) => line.ingredientId));

      const additionalToppings: RecipeIngredient[] = toppingConfigs
        .filter((config) => !existingIds.has(config.ingredientId))
        .map((config) => {
          const ingredient = data.ingredients.find(
            (item) => item.id === config.ingredientId,
          );

          const settings = getToppingSettings(config.mode);

          return {
            id: makeId("topping"),
            ingredientId: config.ingredientId,
            quantity: Number(config.quantity),
            unit: ingredient?.baseUnit ?? "",
            useType: settings.useType,
            note: "Topping theo lựa chọn món",
            optionRule: settings.optionRule,
          };
        });

      return [...recipeLines, ...additionalToppings];
    };
    const productToppings = toppingConfigs.map((config) => {
      const ingredient = data.ingredients.find(
        (item) => item.id === config.ingredientId,
      );

      const settings = getToppingSettings(config.mode);

      return {
        ingredientId: config.ingredientId,
        price: Number(config.price),
        default: settings.default,
        optional: settings.optional,
        quantity: Number(config.quantity),
        unit: ingredient?.baseUnit ?? "",
      };
    });
    const product = {
      id: productId,
      code: normalizedCode,
      name: name.trim(),
      category,
      variants,
      cogsBySize: Object.fromEntries(
        usableSizes.map((size) => {
          const cost = recipeIngredientsForSize(size)
            .filter((line) => line.useType !== "optional-topping")
            .reduce((sum, line) => {
              const lots = data.lots.filter(
                (lot) =>
                  lot.ingredientId === line.ingredientId &&
                  usableLotQuantity(lot) > 0,
              );
              const quantity = lots.reduce(
                (total, lot) => total + usableLotQuantity(lot),
                0,
              );
              const costPerUnit =
                quantity > 0
                  ? lots.reduce(
                      (total, lot) =>
                        total + usableLotQuantity(lot) * lot.unitCost,
                      0,
                    ) / quantity
                  : 0;
              return sum + line.quantity * costPerUnit;
            }, 0);
          return [size, cost > 0 ? Math.round(cost) : null];
        }),
      ),
      toppings: productToppings,
      lockedStoreIds: [],
      status: "pending-recipe" as const,
      note: description.trim(),
      imageName,
    };
    const recipes = usableSizes.map((size) => ({
      id: makeId("recipe"),
      code: `RC-${normalizedCode}-${size}`,
      kind: "drink" as const,
      productId,
      outputIngredientId: null,
      size,
      yieldQuantity: 1,
      yieldUnit: "ly",
      version: "1.0",
      effectiveDate,
      approver: approver.trim(),
      changeReason: changeReason.trim(),
      status: "draft" as const,
      ingredients: recipeIngredientsForSize(size),
    }));
    setData((current) => ({
      ...current,
      products: [product, ...current.products],
      recipes: [...recipes, ...current.recipes],
    }));
    setShowSaved(true);
    showToast({
      type: "success",
      title: "Đã lưu món và công thức nháp",
      message: `${product.code} đã có ${recipes.length} phiên bản nháp; chưa được mở bán khi chưa duyệt.`,
    });
    navigate(`/inventory/products/${product.id}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/inventory/products">Menu đồ uống</Link>
            <span className="sep">/</span>
            <span className="current">Khai báo món</span>
          </nav>
          <h1 className="page-title">Khai báo món &amp; công thức</h1>
          <p className="page-subtitle">
            Tạo món, khai báo size, giá chuẩn và định lượng nguyên liệu theo
            từng phiên bản công thức.
          </p>
        </div>
        <span className="text-xs text-[var(--muted)]">
          Lưu ở dữ liệu demo của trình duyệt
        </span>
      </div>

      <section className="card mb-6 border-l-4 border-[var(--info)]">
        <h2 className="text-sm font-bold mb-1">Trước khi lưu công thức</h2>
        <p className="text-sm text-[var(--muted)]">
          Mỗi size có công thức riêng. Món mới ở trạng thái chờ duyệt; giá chuẩn
          chỉ được dùng sau khi công thức được duyệt.
        </p>
      </section>

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <section className="card">
            <h2 className="font-bold mb-4 pb-3 border-b border-[var(--border)]">
              Thông tin món
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="product-name">
                  Tên món *
                </label>
                <input
                  id="product-name"
                  className="form-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="product-code">
                  Mã món *
                </label>
                <input
                  id="product-code"
                  className="form-input"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="product-category">
                  Nhóm món *
                </label>
                <select
                  id="product-category"
                  className="form-input form-select"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ProductCategory)
                  }
                  required
                >
                  <option value="">Chọn nhóm món</option>
                  {data.categories
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.key}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>
              <fieldset className="flex flex-wrap items-end gap-4">
                <legend className="form-label w-full">Size hỗ trợ *</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={supportsM}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSupportsM(checked);
                      if (!checked && selectedSize === "M") {
                        setSelectedSize("L");
                      } else if (checked && !supportsL) {
                        setSelectedSize("M");
                      }
                    }}
                  />{" "}
                  Size M
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={supportsL}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSupportsL(checked);
                      if (!checked && selectedSize === "L") {
                        setSelectedSize("M");
                      } else if (checked && !supportsM) {
                        setSelectedSize("L");
                      }
                    }}
                  />{" "}
                  Size L
                </label>
              </fieldset>
              {supportsM && (
                <div>
                  <label className="form-label" htmlFor="price-m">
                    Giá chuẩn size M (đ) *
                  </label>
                  <input
                    id="price-m"
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    value={priceM}
                    onChange={(event) => setPriceM(event.target.value)}
                    required
                  />
                </div>
              )}
              {supportsL && (
                <div>
                  <label className="form-label" htmlFor="price-l">
                    Giá chuẩn size L (đ) *
                  </label>
                  <input
                    id="price-l"
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    value={priceL}
                    onChange={(event) => setPriceL(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="form-label">Topping tùy chọn</label>

                <p className="text-xs text-[var(--muted)] mb-3">
                  Có thể chọn nhiều topping cho cùng một món.
                </p>

                {/* Danh sách checkbox */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {toppingIngredients.map((ingredient) => {
                    const isSelected = toppingConfigs.some(
                      (item) => item.ingredientId === ingredient.id,
                    );

                    return (
                      <label
                        key={ingredient.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--background)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            toggleTopping(ingredient.id, event.target.checked)
                          }
                          className="h-4 w-4 accent-[var(--primary)]"
                        />

                        <span className="text-sm font-medium">
                          {ingredient.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Cấu hình riêng cho từng topping đã chọn */}
              {toppingConfigs.map((config) => {
                const ingredient = data.ingredients.find(
                  (item) => item.id === config.ingredientId,
                );

                if (!ingredient) return null;

                return (
                  <section
                    key={config.ingredientId}
                    className="md:col-span-2 rounded-xl border border-[var(--border)] p-4"
                  >
                    <h3 className="font-semibold mb-4">
                      Cấu hình: {ingredient.name}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label
                          className="form-label"
                          htmlFor={`topping-price-${ingredient.id}`}
                        >
                          Giá topping (đ)
                        </label>

                        <input
                          id={`topping-price-${ingredient.id}`}
                          type="number"
                          min="0"
                          step="1"
                          className="form-input"
                          value={config.price}
                          onChange={(event) =>
                            updateTopping(ingredient.id, {
                              price: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`topping-quantity-${ingredient.id}`}
                        >
                          Định lượng topping *
                        </label>

                        <input
                          id={`topping-quantity-${ingredient.id}`}
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="form-input"
                          value={config.quantity}
                          onChange={(event) =>
                            updateTopping(ingredient.id, {
                              quantity: event.target.value,
                            })
                          }
                          required
                        />

                        <p className="text-xs text-[var(--muted)] mt-1">
                          Đơn vị: {ingredient.baseUnit}
                        </p>
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`topping-rule-${ingredient.id}`}
                        >
                          Quy tắc topping
                        </label>

                        <select
                          id={`topping-rule-${ingredient.id}`}
                          className="form-input form-select"
                          value={config.mode}
                          onChange={(event) =>
                            updateTopping(ingredient.id, {
                              mode: event.target.value as ToppingMode,
                            })
                          }
                        >
                          <option value="optional">Tùy chọn thêm</option>

                          <option value="default-removable">
                            Mặc định, khách có thể bỏ
                          </option>

                          <option value="default-required">
                            Mặc định bắt buộc
                          </option>
                        </select>
                      </div>
                    </div>
                  </section>
                );
              })}

              <div className="md:col-span-2">
                <label className="form-label" htmlFor="product-description">
                  Mô tả
                </label>
                <textarea
                  id="product-description"
                  rows={3}
                  className="form-input form-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Mô tả món / lưu ý pha chế..."
                />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="font-bold">Công thức pha theo size</h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Định lượng theo đơn vị chuẩn; topping chỉ tiêu hao theo tùy
                  chọn thực tế.
                </p>
              </div>
              <Badge variant="warning">Bản nháp</Badge>
            </div>
            <div className="flex gap-2 mb-4">
              {(["M", "L"] as const)
                .filter((size) => (size === "M" ? supportsM : supportsL))
                .map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`btn ${selectedSize === size ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    Size {size}
                  </button>
                ))}
            </div>
            {usableSizes.length === 0 ? (
              <p className="text-sm text-[var(--danger)]">
                Chọn ít nhất một size để khai báo công thức.
              </p>
            ) : (
              <DataTable>
                <table className="w-full min-w-[760px] text-sm text-left">
                  <thead className="bg-[var(--background)] text-[var(--muted)]">
                    <tr>
                      {[
                        "Nguyên liệu",
                        "Định lượng / ly",
                        "Đơn vị chuẩn",
                        "Loại sử dụng",
                        "Quy tắc / ghi chú",
                        "",
                      ].map((label) => (
                        <th key={label} className="px-2 py-3 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines[selectedSize].map((line) => (
                      <tr
                        key={line.id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-2 py-2">
                          <select
                            aria-label="Nguyên liệu"
                            className="form-input form-select min-w-[180px]"
                            value={line.ingredientId}
                            onChange={(event) =>
                              updateLine(selectedSize, line.id, {
                                ingredientId: event.target.value,
                              })
                            }
                          >
                            {data.ingredients.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
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
                              updateLine(selectedSize, line.id, {
                                quantity: event.target.value,
                              })
                            }
                            required
                          />
                        </td>
                        <td className="px-2 py-2">
                          {
                            data.ingredients.find(
                              (item) => item.id === line.ingredientId,
                            )?.baseUnit
                          }
                        </td>
                        <td className="px-2 py-2">
                          <select
                            aria-label="Loại sử dụng"
                            className="form-input form-select min-w-[170px]"
                            value={line.useType}
                            onChange={(event) =>
                              updateLine(selectedSize, line.id, {
                                useType: event.target
                                  .value as DraftLine["useType"],
                              })
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
                            aria-label="Quy tắc hoặc ghi chú"
                            className="form-input min-w-[170px]"
                            value={line.optionRule || line.note}
                            onChange={(event) =>
                              updateLine(selectedSize, line.id, {
                                optionRule: event.target.value,
                                note: event.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={lines[selectedSize].length <= 1}
                            onClick={() => removeLine(selectedSize, line.id)}
                          >
                            Bớt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            )}
            {usableSizes.includes(selectedSize) && (
              <button
                type="button"
                className="btn btn-secondary mt-4"
                onClick={() => addLine(selectedSize)}
              >
                + Thêm nguyên liệu
              </button>
            )}
          </section>

          <section className="card">
            <h2 className="font-bold mb-4">Phiên bản &amp; phê duyệt</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label" htmlFor="effective-date">
                  Ngày hiệu lực *
                </label>
                <input
                  id="effective-date"
                  type="date"
                  className="form-input"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
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
                  value={approver}
                  onChange={(event) => setApprover(event.target.value)}
                  placeholder="Chưa phân công"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="change-reason">
                  Lý do thay đổi
                </label>
                <input
                  id="change-reason"
                  className="form-input"
                  value={changeReason}
                  onChange={(event) => setChangeReason(event.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="font-bold mb-3">Hình ảnh món</h2>
            <label className="form-label" htmlFor="product-image">
              Chọn ảnh món (PNG hoặc JPG)
            </label>
            <input
              id="product-image"
              type="file"
              accept="image/png,image/jpeg"
              className="form-input"
              onChange={(event) =>
                setImageName(event.target.files?.[0]?.name ?? "")
              }
            />
            {imageName && (
              <p className="text-sm text-[var(--muted)] mt-2">
                Đã chọn: {imageName}
              </p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="card">
            <h2 className="font-bold mb-4">Tóm tắt giá</h2>
            <div className="space-y-3 text-sm">
              {supportsM && (
                <p className="flex justify-between gap-3">
                  <span>Giá bán M</span>
                  <b>{Number(priceM).toLocaleString("vi-VN")} đ</b>
                </p>
              )}
              {supportsL && (
                <p className="flex justify-between gap-3">
                  <span>Giá bán L</span>
                  <b>{Number(priceL).toLocaleString("vi-VN")} đ</b>
                </p>
              )}
              <p className="text-xs text-[var(--muted)]">
                COGS được xác định từ định lượng và giá vốn lô; bản demo không
                tự suy ra giá vốn khi chưa có mapping đầy đủ.
              </p>
            </div>
          </section>
          <section className="card">
            <h2 className="font-bold mb-3">Hoàn tất</h2>
            {showSaved && (
              <div className="mb-3">
                <Badge variant="success">Đã lưu demo</Badge>
              </div>
            )}
            <p className="text-sm text-[var(--muted)] mb-4">
              Món và các công thức theo size được lưu nháp trong trình duyệt;
              chưa được mở bán trước khi duyệt.
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Lưu bản nháp
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full mt-2"
              onClick={() => navigate("/inventory/products")}
            >
              Quay lại danh mục
            </button>
          </section>
        </aside>
      </form>
    </div>
  );
}
