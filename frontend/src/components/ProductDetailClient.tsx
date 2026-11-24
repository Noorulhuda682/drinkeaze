"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/context/CartContext";
import type { CatalogProduct, CatalogVariant } from "@/src/types/catalog";

export default function ProductDetailClient({
  product,
}: {
  product: CatalogProduct | null;
}) {
  const availableVariants = useMemo(
    () => (product?.variants ?? []).filter((variant) => variant.isAvailable),
    [product],
  );

  const defaultVariant =
    availableVariants.find((variant) => variant.isDefault) ?? availableVariants[0];

  const [selectedVariantId, setSelectedVariantId] = useState(
    defaultVariant?.id ?? "",
  );
  const { addItem } = useCart();

  const selectedVariant = availableVariants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const imageUrl =
    product?.images?.[0]?.url ?? product?.images?.[0]?.thumbnailUrl ?? null;

  const handleAddToCart = useCallback(() => {
    if (!product || !selectedVariant?.isOrderable) return;
    addItem(
      {
        id: selectedVariant.id,
        variantId: selectedVariant.id,
        productBvid: product.bvid,
        variantName: selectedVariant.name,
        name: product.name,
        price: selectedVariant.price,
        imageUrl,
      },
      1,
    );
  }, [product, selectedVariant, imageUrl, addItem]);

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-8 shadow-sm">
          <h1 className="font-display font-bold text-2xl text-slate-900 mb-4">
            Product not found
          </h1>
          <Link
            href="/#products"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#48CAE4] text-slate-950 font-semibold text-sm hover:bg-[#32b4cf] transition"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Link
        href="/#products"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-[#48CAE4] font-medium text-sm mb-6 transition"
      >
        <span aria-hidden>←</span> Back to menu
      </Link>
      <div className="rounded-[24px] bg-white border border-slate-200/80 p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="relative aspect-[4/3] rounded-[20px] bg-[#f8f9fa] border border-slate-200/70 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-7xl">
              🍹
            </span>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-3">
            {product.name}
          </h1>
          <p className="text-[#48CAE4] font-bold text-2xl mb-6">
            PKR{" "}
            {(
              selectedVariant?.price ??
              product.discountedPrice ??
              product.price
            ).toLocaleString()}
          </p>
          {availableVariants.length > 1 && (
            <label className="block mb-6">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Choose size
              </span>
              <select
                value={selectedVariantId}
                onChange={(event) => setSelectedVariantId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#f8f9fa] px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30"
              >
                {availableVariants.map((variant: CatalogVariant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} — PKR {variant.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-slate-600 leading-relaxed mb-8 whitespace-pre-line text-sm sm:text-base">
            {product.description}
          </p>
          {!selectedVariant ? (
            <p className="text-sm text-red-600 mb-4">
              This product is not currently available for ordering.
            </p>
          ) : !selectedVariant.isOrderable ? (
            <p className="text-sm text-slate-500 mb-4">
              This item is currently unavailable or its recipe/stock setup is
              incomplete.
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!selectedVariant?.isOrderable}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
