import { availableLotQuantity } from "./business-demo";
import type { DemoState, Ingredient, Product, RecipeVersion } from "./business-demo";
import { normalizeVi } from "../../components/shared/ui-kit";

export interface IngredientMatchResult {
  matched: boolean;
  matchType: "direct" | "via-f1" | "both" | null;
  matchedIngredientIds: string[];
  matchedLabels: string[];
}

/**
 * Kiểm tra công thức có chứa 1 nguyên liệu (theo ID chọn sẵn hoặc từ khóa tìm kiếm).
 * Kiểm tra 2 tầng:
 *  1) Trực tiếp trong recipe.ingredients
 *  2) Bắc cầu qua nguyên liệu trung gian F1 (parentF0Items)
 */
export function matchIngredientInRecipe(
  state: DemoState,
  recipe: RecipeVersion,
  options: { ingredientId?: string; keyword?: string },
): IngredientMatchResult {
  const targetId = options.ingredientId && options.ingredientId !== "ALL" ? options.ingredientId : "";
  const kw = normalizeVi((options.keyword ?? "").trim());
  if (!targetId && !kw) {
    return { matched: false, matchType: null, matchedIngredientIds: [], matchedLabels: [] };
  }

  let hasDirect = false;
  let hasViaF1 = false;
  const matchedIds = new Set<string>();
  const matchedLabels = new Set<string>();

  const ingMatches = (ing: Ingredient | undefined): boolean => {
    if (!ing) return false;
    if (targetId && ing.id === targetId) return true;
    if (!targetId && kw) {
      return (
        normalizeVi(ing.name).includes(kw) ||
        normalizeVi(ing.code).includes(kw)
      );
    }
    return false;
  };

  for (const line of recipe.ingredients) {
    const ing = state.ingredients.find((item) => item.id === line.ingredientId);
    if (!ing) continue;

    if (ingMatches(ing)) {
      hasDirect = true;
      matchedIds.add(ing.id);
      matchedLabels.add(`${ing.name} (trực tiếp)`);
    }

    if (ing.tier === "F1" && ing.parentF0Items?.length) {
      for (const f0Ref of ing.parentF0Items) {
        const f0Ing = state.ingredients.find((item) => item.id === f0Ref.ingredientId);
        if (ingMatches(f0Ing)) {
          hasViaF1 = true;
          matchedIds.add(ing.id);
          matchedLabels.add(`${f0Ing?.name ?? f0Ref.ingredientId} (qua cốt F1: ${ing.name})`);
        }
      }
    }
  }

  if (!hasDirect && !hasViaF1) {
    return { matched: false, matchType: null, matchedIngredientIds: [], matchedLabels: [] };
  }

  return {
    matched: true,
    matchType: hasDirect && hasViaF1 ? "both" : hasDirect ? "direct" : "via-f1",
    matchedIngredientIds: [...matchedIds],
    matchedLabels: [...matchedLabels],
  };
}

/**
 * Kiểm tra một Sản phẩm (Món) có chứa nguyên liệu đang lọc/tìm kiếm không
 * bằng cách duyệt qua các công thức của món đó (cả trực tiếp F0 và qua cốt F1).
 */
export function matchIngredientInProduct(
  state: DemoState,
  product: Product,
  options: { ingredientId?: string; keyword?: string },
): IngredientMatchResult {
  const recipes = state.recipes.filter((r) => r.productId === product.id);
  const direct = new Set<string>();
  const labels = new Set<string>();
  let hasDirect = false;
  let hasViaF1 = false;

  for (const recipe of recipes) {
    const res = matchIngredientInRecipe(state, recipe, options);
    if (res.matched) {
      if (res.matchType === "direct" || res.matchType === "both") hasDirect = true;
      if (res.matchType === "via-f1" || res.matchType === "both") hasViaF1 = true;
      res.matchedIngredientIds.forEach((id) => direct.add(id));
      res.matchedLabels.forEach((l) => labels.add(l));
    }
  }

  // Cũng kiểm tra topping khai báo trực tiếp trên sản phẩm
  const targetId = options.ingredientId && options.ingredientId !== "ALL" ? options.ingredientId : "";
  const kw = normalizeVi((options.keyword ?? "").trim());
  for (const tp of product.toppings) {
    const ing = state.ingredients.find((i) => i.id === tp.ingredientId);
    if (!ing) continue;
    const hit =
      (targetId && ing.id === targetId) ||
      (!targetId && kw && (normalizeVi(ing.name).includes(kw) || normalizeVi(ing.code).includes(kw)));
    if (hit) {
      hasDirect = true;
      direct.add(ing.id);
      labels.add(`${ing.name} (topping)`);
    }
  }

  if (!hasDirect && !hasViaF1) {
    return { matched: false, matchType: null, matchedIngredientIds: [], matchedLabels: [] };
  }
  return {
    matched: true,
    matchType: hasDirect && hasViaF1 ? "both" : hasDirect ? "direct" : "via-f1",
    matchedIngredientIds: [...direct],
    matchedLabels: [...labels],
  };
}

/**
 * Tính ước lượng số ly có thể pha tại quầy của 1 chi nhánh từ tồn nguyên liệu hiện có
 * và trả về tên nguyên liệu đang giới hạn sản lượng (nếu có).
 */
export function getBranchProducibleSummary(
  state: DemoState,
  product: Product,
  branchId: string,
): {
  cups: number | null;
  limitingIngredientName: string | null;
  status: "ok" | "low" | "out" | "no-recipe";
} {
  const recipe =
    state.recipes.find((r) => r.kind === "drink" && r.productId === product.id && r.status === "approved") ??
    state.recipes.find((r) => r.kind === "drink" && r.productId === product.id);
  if (!recipe || recipe.ingredients.length === 0) {
    return { cups: null, limitingIngredientName: null, status: "no-recipe" };
  }

  const requiredLines = recipe.ingredients.filter((l) => l.useType !== "optional-topping");
  if (requiredLines.length === 0) {
    return { cups: null, limitingIngredientName: null, status: "no-recipe" };
  }

  let minCups = Infinity;
  let limitingName: string | null = null;

  for (const line of requiredLines) {
    if (line.quantity <= 0) continue;
    const stockAtBranch = state.lots
      .filter((lot) => lot.location === "counter" && lot.locationId === branchId && lot.ingredientId === line.ingredientId)
      .reduce((sum, lot) => sum + availableLotQuantity(lot), 0);

    const possible = Math.floor(stockAtBranch / line.quantity);
    if (possible < minCups) {
      minCups = possible;
      limitingName = state.ingredients.find((i) => i.id === line.ingredientId)?.name ?? null;
    }
  }

  if (!Number.isFinite(minCups)) {
    return { cups: null, limitingIngredientName: null, status: "no-recipe" };
  }

  return {
    cups: minCups,
    limitingIngredientName: limitingName,
    status: minCups === 0 ? "out" : minCups <= 15 ? "low" : "ok",
  };
}
