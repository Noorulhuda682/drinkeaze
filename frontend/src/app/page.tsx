import HeroBanner from "@/src/components/HeroBanner";
import KarachiBanner from "@/src/components/KarachiBanner";
import ProductsSection from "@/src/components/ProductsSection";
import type { CatalogResponse, RestaurantCategory } from "@/src/types/catalog";

export const dynamic = "force-dynamic";

async function loadInitialCatalog(): Promise<RestaurantCategory[] | null> {
  const backendUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  try {
    const res = await fetch(`${backendUrl}/products`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      id: string;
      bvid: string | null;
      name: string;
      description: string | null;
      imageUrl: string | null;
      category?: { id: string; name: string; slug: string; imageUrl?: string | null };
      variants?: Array<{
        id: string;
        name: string;
        price: string | number;
        compareAtPrice?: string | number | null;
        isDefault: boolean;
        isAvailable: boolean;
        isOrderable?: boolean;
      }>;
    }>;

    const categoryMap = new Map<string, RestaurantCategory>();
    for (const p of rows) {
      if (!p.bvid || !p.category?.id) continue;
      let cat = categoryMap.get(p.category.id);
      if (!cat) {
        cat = {
          uid: p.category.id,
          name: p.category.name,
          bvid: p.category.slug,
          imgUrl: p.category.imageUrl ?? "",
          showTitle: true,
          layout: "grid",
          products: [],
        };
        categoryMap.set(p.category.id, cat);
      }
      const variants = (p.variants ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice == null ? null : Number(v.compareAtPrice),
        isDefault: v.isDefault,
        isAvailable: v.isAvailable,
        isOrderable: v.isOrderable === true,
      }));
      const def = variants.find((v) => v.isDefault) ?? variants[0];
      const price = def?.price ?? 0;
      cat.products.push({
        name: p.name,
        barcode: null,
        manufacturerCode: null,
        bvid: p.bvid,
        description: p.description ?? "",
        loyaltyPoints: 0,
        images: p.imageUrl ? [{ url: p.imageUrl, thumbnailUrl: p.imageUrl }] : null,
        basePrice: price,
        discountedBasePrice: price,
        price,
        quantity: null,
        discountedPrice: price,
        preOrderTime: null,
        prepaidOnly: false,
        taxClass: null,
        cartonSize: null,
        maxOrderQuantity: null,
        minOrderQuantity: null,
        backendProductId: p.id,
        variants,
      });
    }
    return [...categoryMap.values()];
  } catch {
    return null;
  }
}

export default async function Home() {
  const initialCatalog = await loadInitialCatalog();
  return (
    <>
      <HeroBanner />
      <ProductsSection initialCatalog={initialCatalog} />
      <KarachiBanner />
    </>
  );
}
