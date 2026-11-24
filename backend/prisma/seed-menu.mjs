import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(here, 'restaurant-catalog.json');

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const categories = catalog?.data?.restaurantCatalog;

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('The restaurant catalog is empty or invalid.');
  }

  let categoryCount = 0;
  let productCount = 0;
  let variantCount = 0;

  for (const [categoryIndex, sourceCategory] of categories.entries()) {
    const categoryName = String(sourceCategory.name ?? '').trim();
    if (!categoryName) continue;

    const categorySlug = slugify(categoryName);
    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      update: {},
      create: {
        name: categoryName,
        slug: categorySlug,
        imageUrl: sourceCategory.imgUrl || null,
        sortOrder: categoryIndex,
        isActive: true,
      },
    });
    categoryCount += 1;

    for (const sourceProduct of sourceCategory.products ?? []) {
      const bvid = String(sourceProduct.bvid ?? '').trim();
      const name = String(sourceProduct.name ?? '').trim();
      if (!bvid || !name) continue;

      const rawPrice = Number(
        sourceProduct.discountedPrice > 0
          ? sourceProduct.discountedPrice
          : sourceProduct.price,
      );
      if (!Number.isFinite(rawPrice) || rawPrice < 0) {
        throw new Error(`Invalid price for catalog product: ${name}`);
      }

      const imageUrl =
        sourceProduct.images?.[0]?.url ||
        sourceProduct.images?.[0]?.thumbnailUrl ||
        null;
      const slug = `${slugify(name) || 'menu-item'}-${bvid.slice(0, 8).toLowerCase()}`;
      const product = await prisma.product.upsert({
        where: { bvid },
        update: {},
        create: {
          bvid,
          name,
          slug,
          description: sourceProduct.description || null,
          imageUrl,
          categoryId: category.id,
          isActive: true,
        },
      });

      const sku = `DRK-${bvid.replace(/[^a-z0-9]/gi, '').slice(0, 16).toUpperCase()}`;
      // The catalog's current price initializes a new variant. Existing
      // database prices and manually managed variants are never overwritten.
      await prisma.productVariant.updateMany({
        where: { productId: product.id, isDefault: true, sku: { not: sku } },
        data: { isDefault: false },
      });

      await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          name: 'Standard',
          sku,
          price: rawPrice,
          isDefault: true,
          isAvailable: true,
        },
      });

      productCount += 1;
      variantCount += 1;
    }
  }

  console.log(
    `Menu sync complete: ${categoryCount} categories, ${productCount} products, ${variantCount} default variants.`,
  );
  console.log(
    'Recipes and stock quantities are intentionally not fabricated. Configure actual recipes and inventory before accepting orders.',
  );
}

main()
  .catch((error) => {
    console.error('Menu sync failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
