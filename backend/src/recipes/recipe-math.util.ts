import { Prisma } from "@prisma/client";

const D = Prisma.Decimal;
const ZERO = new D(0);
const HUNDRED = new D(100);
const THOUSAND = new D(1000);

export function normalizeBaseUnit(unit: string): "kg" | "L" | "unit" {
  const u = unit.trim().toLowerCase();
  if (u === "kg" || u === "g") return "kg";
  if (u === "l" || u === "ml") return "L";
  return "unit";
}

export function toBaseQuantity(
  qtyInput: Prisma.Decimal | number | string,
  fromUnit: string,
  targetBaseUnit: string,
): Prisma.Decimal {
  const qty = new D(qtyInput);
  if (qty.lt(ZERO)) throw new Error("Quantity cannot be negative");
  const from = fromUnit.trim().toLowerCase();
  const target = normalizeBaseUnit(targetBaseUnit);

  if (target === "kg") {
    if (from === "kg") return qty;
    if (from === "g") return qty.div(THOUSAND);
    throw new Error(`Cannot convert ${fromUnit} to base unit kg`);
  }
  if (target === "L") {
    if (from === "l") return qty;
    if (from === "ml") return qty.div(THOUSAND);
    throw new Error(`Cannot convert ${fromUnit} to base unit L`);
  }
  if (from === "unit" || from === "pcs" || from === "piece") return qty;
  throw new Error(`Cannot convert ${fromUnit} to base unit ${targetBaseUnit}`);
}

export function calculateVariantRecipeMetrics(
  items: Array<{
    ingredientId: string;
    ingredientName: string;
    baseUnit: string;
    enteredQuantity: Prisma.Decimal;
    enteredUnit: string;
    baseQuantity: Prisma.Decimal;
    purchaseCostPerUnit: Prisma.Decimal;
    availableStock: Prisma.Decimal;
    reorderLevel: Prisma.Decimal;
  }>,
  sellingPrice?: Prisma.Decimal | number | null,
) {
  let totalCost = ZERO;
  let maxServings: number | null = null;
  let limitingIngredient: { id: string; name: string; available: string; required: string; maxServings: number } | null = null;

  const lines = items.map((item) => {
    const lineCost = item.baseQuantity.mul(item.purchaseCostPerUnit);
    totalCost = totalCost.add(lineCost);
    const possible = item.baseQuantity.gt(ZERO) && item.availableStock.gt(ZERO)
      ? item.availableStock.div(item.baseQuantity).floor().toNumber()
      : 0;

    if (maxServings === null || possible < maxServings) {
      maxServings = possible;
      limitingIngredient = {
        id: item.ingredientId,
        name: item.ingredientName,
        available: item.availableStock.toFixed(3),
        required: item.baseQuantity.toFixed(3),
        maxServings: possible,
      };
    }

    return {
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      enteredQuantity: item.enteredQuantity.toFixed(3),
      enteredUnit: item.enteredUnit,
      baseQuantity: item.baseQuantity.toFixed(3),
      baseUnit: item.baseUnit,
      unitCost: item.purchaseCostPerUnit.toFixed(2),
      lineCost: lineCost.toFixed(2),
      availableStock: item.availableStock.toFixed(3),
      isLowStock: item.availableStock.lte(item.reorderLevel),
      isOutOfStock: item.availableStock.lte(ZERO),
      maxServings: possible,
    };
  });

  const price = sellingPrice !== undefined && sellingPrice !== null ? new D(sellingPrice) : null;
  const grossProfit = price !== null ? price.sub(totalCost) : null;
  const grossProfitMarginPct = price !== null && price.gt(ZERO) && grossProfit !== null
    ? grossProfit.div(price).mul(HUNDRED)
    : null;
  const orderableQty = items.length > 0 ? (maxServings ?? 0) : 0;

  return {
    hasRecipe: items.length > 0,
    totalIngredientCost: totalCost.toFixed(2),
    costPerServing: totalCost.toFixed(2),
    sellingPrice: price !== null ? price.toFixed(2) : null,
    grossProfit: grossProfit !== null ? grossProfit.toFixed(2) : null,
    grossProfitMarginPct: grossProfitMarginPct !== null ? grossProfitMarginPct.toFixed(2) : null,
    maxOrderableQuantity: orderableQty,
    isOrderable: items.length > 0 && orderableQty > 0,
    limitingIngredient,
    ingredients: lines,
  };
}
