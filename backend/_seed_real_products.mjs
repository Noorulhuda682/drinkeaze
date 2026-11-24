import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const backendDir = path.resolve(".");
console.log("Backend dir:", backendDir);

// 1. Check current products in backend / DB
try {
  const res = await fetch("http://localhost:3000/products", { cache: "no-store" });
  const data = await res.json();
  console.log("Current /products count:", Array.isArray(data) ? data.length : "non-array", Array.isArray(data) ? data.map((p) => ({ name: p.name, bvid: p.bvid, variants: p.variants?.map((v) => ({ name: v.name, isAvailable: v.isAvailable, isOrderable: v.isOrderable })) })) : data);
} catch (err) {
  console.log("Could not fetch http://localhost:3000/products:", err?.message ?? err);
}

// 2. Run a Prisma seed / DB check script inside backend if Prisma schema exists
const prismaSeedScript = `
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const existingProducts = await prisma.product.findMany({
    include: { variants: true, category: true },
  });
  console.log("DB products count before:", existingProducts.length);

  if (existingProducts.length > 0) {
    for (const p of existingProducts) {
      for (const v of p.variants) {
        if (!v.isAvailable) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: { isAvailable: true },
          });
        }
      }
    }
  }

  // Ensure a default ingredient & stock exist so recipe-backed items are orderable
  let baseIngredient = await prisma.ingredient.findFirst();
  if (!baseIngredient) {
    baseIngredient = await prisma.ingredient.create({
      data: {
        name: "Fresh Fruit & Dairy Base",
        unit: "ml",
        quantity: 100000,
        reorderLevel: 5000,
        supplierName: "Karachi Fresh Supply",
      },
    });
  } else if (Number(baseIngredient.quantity ?? 0) < 1000) {
    await prisma.ingredient.update({
      where: { id: baseIngredient.id },
      data: { quantity: 100000 },
    });
  }

  const categoriesData = [
    {
      name: "Parfaits",
      slug: "parfaits",
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
      products: [
        {
          name: "Mixed Berry Crunch Parfait",
          bvid: "drinkeaze-mixed-berry-parfait",
          description: "Creamy yogurt layered with mixed berries, honey drizzle & toasted granola.",
          price: 680,
          imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
        },
        {
          name: "Mango Chia Parfait",
          bvid: "drinkeaze-mango-chia-parfait",
          description: "Sweet Alphonso mango layers with soaked chia seeds, yogurt & crunch.",
          price: 720,
          imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80",
        },
      ],
    },
    {
      name: "Fresh Juices & Smoothies",
      slug: "juices-smoothies",
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80",
      products: [
        {
          name: "Valencia Orange Cold-Pressed Juice",
          bvid: "drinkeaze-valencia-orange-juice",
          description: "100% freshly pressed citrus juice served chilled with zero added sugar.",
          price: 550,
          imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80",
        },
        {
          name: "Berry Blast Smoothie",
          bvid: "drinkeaze-berry-blast-smoothie",
          description: "Thick strawberry & berry blend chilled to order for a refreshing boost.",
          price: 650,
          imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=900&q=80",
        },
      ],
    },
  ];

  for (const catDef of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: catDef.slug },
      update: { name: catDef.name, imageUrl: catDef.imageUrl },
      create: { name: catDef.name, slug: catDef.slug, imageUrl: catDef.imageUrl },
    });

    for (const prodDef of catDef.products) {
      const product = await prisma.product.upsert({
        where: { bvid: prodDef.bvid },
        update: {
          name: prodDef.name,
          description: prodDef.description,
          imageUrl: prodDef.imageUrl,
          categoryId: category.id,
        },
        create: {
          name: prodDef.name,
          bvid: prodDef.bvid,
          description: prodDef.description,
          imageUrl: prodDef.imageUrl,
          categoryId: category.id,
        },
      });

      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      let variantId = existingVariant?.id;
      if (!existingVariant) {
        const createdVariant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: "Regular",
            price: prodDef.price,
            isDefault: true,
            isAvailable: true,
          },
        });
        variantId = createdVariant.id;
      } else {
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: { price: prodDef.price, isAvailable: true, isDefault: true },
        });
      }

      if (variantId && baseIngredient) {
        const existingRecipe = await prisma.recipeItem?.findFirst?.({
          where: { variantId },
        }).catch(() => null);
        if (!existingRecipe && prisma.recipeItem?.create) {
          await prisma.recipeItem.create({
            data: {
              variantId,
              ingredientId: baseIngredient.id,
              quantityRequired: 100,
            },
          }).catch(() => {});
        }
      }
    }
  }

  const finalCount = await prisma.product.count();
  console.log("DB products count after:", finalCount);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

fs.writeFileSync(path.join(backendDir, "_tmp_seed_products.mjs"), prismaSeedScript, "utf8");
execSync("node _tmp_seed_products.mjs", { stdio: "inherit" });
fs.unlinkSync(path.join(backendDir, "_tmp_seed_products.mjs"));
