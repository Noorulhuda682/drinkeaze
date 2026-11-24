import { NextResponse } from "next/server";
import catalogData from "@/src/data/restaurant-catalog.json";
import type {
  CatalogProduct,
  CatalogResponse,
  CatalogVariant,
  RestaurantCategory,
} from "@/src/types/catalog";

export const dynamic = "force-dynamic";

type BackendCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
};

type BackendVariant = {
  id: string;
  name: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  isDefault: boolean;
  isAvailable: boolean;
  isOrderable?: boolean;
};

type BackendProduct = {
  id: string;
  bvid: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: BackendCategory;
  variants?: BackendVariant[];
};

function mapBackendProduct(
  backendProduct: BackendProduct,
  catalogProduct?: CatalogProduct,
): CatalogProduct {
  const variants: CatalogVariant[] = (backendProduct.variants ?? []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    price: Number(variant.price),
    compareAtPrice: variant.compareAtPrice == null ? null : Number(variant.compareAtPrice),
    isDefault: variant.isDefault,
    isAvailable: variant.isAvailable,
    isOrderable: variant.isOrderable === true,
  }));
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
  const price = defaultVariant?.price ?? catalogProduct?.discountedPrice ?? catalogProduct?.price ?? 0;
  const imageUrl = backendProduct.imageUrl ?? catalogProduct?.images?.[0]?.url ?? null;

  return {
    name: backendProduct.name,
    barcode: catalogProduct?.barcode ?? null,
    manufacturerCode: catalogProduct?.manufacturerCode ?? null,
    bvid: backendProduct.bvid!,
    description: backendProduct.description ?? catalogProduct?.description ?? "",
    loyaltyPoints: catalogProduct?.loyaltyPoints ?? 0,
    images: imageUrl
      ? [{ url: imageUrl, thumbnailUrl: catalogProduct?.images?.[0]?.thumbnailUrl ?? imageUrl }]
      : catalogProduct?.images ?? null,
    basePrice: price,
    discountedBasePrice: price,
    price,
    quantity: catalogProduct?.quantity ?? null,
    discountedPrice: price,
    preOrderTime: catalogProduct?.preOrderTime ?? null,
    prepaidOnly: catalogProduct?.prepaidOnly ?? false,
    taxClass: catalogProduct?.taxClass ?? null,
    cartonSize: catalogProduct?.cartonSize ?? null,
    maxOrderQuantity: catalogProduct?.maxOrderQuantity ?? null,
    minOrderQuantity: catalogProduct?.minOrderQuantity ?? null,
    backendProductId: backendProduct.id,
    variants,
  };
}

export async function GET() {
  const staticCatalog = structuredClone(catalogData) as CatalogResponse;
  const backendUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

  try {
    const response = await fetch(`${backendUrl}/products`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Backend products endpoint returned ${response.status}`);

    const backendProducts = (await response.json()) as BackendProduct[];
    const staticProducts = new Map<string, CatalogProduct>();
    const staticProductOrder = new Map<string, number>();
    let order = 0;
    for (const category of staticCatalog.data.restaurantCatalog) {
      for (const product of category.products) {
        staticProducts.set(product.bvid, product);
        staticProductOrder.set(product.bvid, order++);
      }
    }

    // The database is the source of truth for active products, categories,
    // variants and pricing. The original JSON contributes legacy media and
    // optional catalog metadata only.
    const visibleProducts = backendProducts.filter(
      (product) => Boolean(product.bvid && product.category?.id),
    );
    const categoryMap = new Map<string, RestaurantCategory>();

    const sortedProducts = [...visibleProducts].sort((a, b) => {
      const aOrder = staticProductOrder.get(a.bvid!) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = staticProductOrder.get(b.bvid!) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.name.localeCompare(b.name);
    });

    for (const product of sortedProducts) {
      const category = product.category;
      let targetCategory = categoryMap.get(category.id);
      if (!targetCategory) {
        targetCategory = {
          uid: category.id,
          name: category.name,
          bvid: category.slug,
          imgUrl: category.imageUrl ?? "",
          showTitle: true,
          layout: "grid",
          products: [],
        };
        categoryMap.set(category.id, targetCategory);
      }
      targetCategory.products.push(
        mapBackendProduct(product, staticProducts.get(product.bvid!)),
      );
    }

    const categories = [...categoryMap.values()];
    return NextResponse.json(
      { data: { restaurantCatalog: categories } } satisfies CatalogResponse,
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Unable to load the database-backed menu:", error);
    // Keep the menu browsable during a backend outage, but disable checkout
    // because no trustworthy database variant IDs are available.
    for (const category of staticCatalog.data.restaurantCatalog) {
      for (const product of category.products) {
        product.backendProductId = null;
        product.variants = [];
      }
    }
    return NextResponse.json(staticCatalog, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
