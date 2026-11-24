import ProductDetailClient from "@/src/components/ProductDetailClient";
import type { CatalogProduct } from "@/src/types/catalog";

export const dynamic = "force-dynamic";

async function loadProductByBvid(bvid: string): Promise<CatalogProduct | null> {
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

    const match = rows.find((item) => item.bvid === bvid);
    if (!match || !match.bvid) return null;

    const variants = (match.variants ?? []).map((v) => ({
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

    return {
      name: match.name,
      barcode: null,
      manufacturerCode: null,
      bvid: match.bvid,
      description: match.description ?? "",
      loyaltyPoints: 0,
      images: match.imageUrl ? [{ url: match.imageUrl, thumbnailUrl: match.imageUrl }] : null,
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
      backendProductId: match.id,
      variants,
    };
  } catch {
    return null;
  }
}

export default async function ProductPage({
  params,
}: {
  params: { bvid: string };
}) {
  const bvid = decodeURIComponent(params.bvid);
  const product = await loadProductByBvid(bvid);
  return <ProductDetailClient product={product} />;
}
