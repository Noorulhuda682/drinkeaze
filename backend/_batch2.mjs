import fs from "node:fs";
import { execSync } from "node:child_process";

fs.copyFileSync("prisma/schema.prisma", "prisma/schema.prisma.bak");
let s = fs.readFileSync("prisma/schema.prisma", "utf8");

s = s.replace(
  "  isActive    Boolean @default(true)\n\n  categoryId String",
  "  isActive    Boolean @default(true)\n  isFeatured  Boolean @default(false)\n  sortOrder   Int     @default(0)\n\n  categoryId String"
);

s = s.replace(
  "  inventory Inventory?\n  recipes   ProductIngredient[]\n\n  createdAt DateTime        @default(now())\n  updatedAt DateTime        @updatedAt\n  movements StockMovement[]",
  "  purchaseCostPerUnit Decimal @default(0) @db.Decimal(12, 4)\n  supplierName        String?\n\n  inventory Inventory?\n  recipes   ProductIngredient[]\n  purchases IngredientPurchase[]\n\n  createdAt DateTime        @default(now())\n  updatedAt DateTime        @updatedAt\n  movements StockMovement[]"
);

s = s.replace(
  "model ProductIngredient {\n  id       String  @id @default(cuid())\n  quantity Decimal @db.Decimal(12, 3)",
  "model ProductIngredient {\n  id              String  @id @default(cuid())\n  quantity        Decimal @db.Decimal(12, 4)\n  enteredQuantity Decimal @default(0) @db.Decimal(12, 4)\n  enteredUnit     String  @default(\"kg\")"
);

s = s.replace(
  "enum StockMovementType {\n  IN\n  OUT\n}",
  "enum StockMovementType {\n  IN\n  OUT\n  PURCHASE\n  ADJUSTMENT\n  DEDUCTION\n  RESTORATION\n}"
);

s = s.replace(
  "  orderId   String?\n  order     Order?   @relation(fields: [orderId], references: [id], onDelete: Restrict)",
  "  reason     String?\n  adminId    String?\n  purchaseId String?\n  orderId    String?\n  order      Order?   @relation(fields: [orderId], references: [id], onDelete: Restrict)"
);

if (!s.includes("model IngredientPurchase")) {
  s += `
model IngredientPurchase {
  id              String     @id @default(cuid())
  ingredientId    String
  ingredient      Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Restrict)
  enteredQuantity Decimal    @db.Decimal(12, 4)
  enteredUnit     String
  baseQuantity    Decimal    @db.Decimal(12, 4)
  totalCost       Decimal    @db.Decimal(12, 2)
  unitCostInBase  Decimal    @db.Decimal(12, 4)
  supplierName    String?
  notes           String?
  adminId         String?
  purchasedAt     DateTime   @default(now())
  createdAt       DateTime   @default(now())

  @@index([ingredientId, purchasedAt])
}

model StoreSetting {
  id                   String   @id @default("default")
  storeName            String   @default("Drinkeaze")
  tagline              String?  @default("freshly made happiness")
  contactPhone         String?
  contactEmail         String?
  address              String?
  city                 String   @default("Karachi")
  deliveryFee          Decimal  @default(0) @db.Decimal(10, 2)
  freeDeliveryAbove    Decimal? @db.Decimal(10, 2)
  minOrderAmount       Decimal  @default(0) @db.Decimal(10, 2)
  codEnabled           Boolean  @default(true)
  onlinePaymentEnabled Boolean  @default(true)
  updatedAt            DateTime @updatedAt
}
`;
}

fs.writeFileSync("prisma/schema.prisma", s, "utf8");
fs.mkdirSync("src/recipes", { recursive: true });
fs.mkdirSync("scripts", { recursive: true });

fs.writeFileSync("src/recipes/recipe-math.util.ts", `import { Prisma } from "@prisma/client";

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
    throw new Error(\`Cannot convert \${fromUnit} to base unit kg\`);
  }
  if (target === "L") {
    if (from === "l") return qty;
    if (from === "ml") return qty.div(THOUSAND);
    throw new Error(\`Cannot convert \${fromUnit} to base unit L\`);
  }
  if (from === "unit" || from === "pcs" || from === "piece") return qty;
  throw new Error(\`Cannot convert \${fromUnit} to base unit \${targetBaseUnit}\`);
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
`, "utf8");

fs.writeFileSync("scripts/clear-recipes-and-ingredients-only.sql", `-- Safe cleanup of recipes, ingredients, and inventory ONLY.
-- Preserves Admin, Order, OrderItem, Payment, Category, and Product records.
BEGIN;
DELETE FROM "ProductIngredient";
DELETE FROM "StockMovement";
DELETE FROM "IngredientPurchase";
DELETE FROM "Inventory";
DELETE FROM "Ingredient";
COMMIT;
`, "utf8");

console.log("Updated schema.prisma, recipe-math.util.ts, and scripts/clear-recipes-and-ingredients-only.sql");
console.log(execSync("npx prisma validate", { encoding: "utf8" }));
