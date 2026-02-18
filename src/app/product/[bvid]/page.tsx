"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/context/CartContext";
import type { CatalogProduct } from "@/src/types/catalog";
import type { CatalogResponse } from "@/src/types/catalog";

function findProductInCatalog(
  catalog: CatalogResponse,
  bvid: string
): CatalogProduct | null {
  const list = catalog?.data?.restaurantCatalog;
  if (!Array.isArray(list)) return null;
  for (const cat of list) {
    const product = cat.products?.find((p) => p.bvid === bvid);
    if (product) return product;
  }
  return null;
}

export default function ProductPage({
  params,
}: {
  params: { bvid: string };
}) {
  const bvid = decodeURIComponent(params.bvid);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data: CatalogResponse) => {
        if (cancelled) return;
        const found = findProductInCatalog(data, bvid);
        setProduct(found ?? null);
        setNotFound(!found);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bvid]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addItem(
      {
        id: product.bvid,
        name: product.name,
        price: product.discountedPrice ?? product.price,
        imageUrl:
          product.images?.[0]?.url ?? product.images?.[0]?.thumbnailUrl ?? null,
      },
      1
    );
  }, [product, addItem]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="animate-pulse rounded-2xl bg-drinkeaze-sand/10 aspect-[4/3] mb-8" />
        <div className="h-8 w-2/3 rounded bg-drinkeaze-sand/20 mb-4" />
        <div className="h-4 w-full rounded bg-drinkeaze-sand/10" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h1 className="font-display font-bold text-2xl text-drinkeaze-dark mb-4">
          Product not found
        </h1>
        <Link
          href="/#products"
          className="text-drinkeaze-mango font-semibold hover:underline"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  const imageUrl =
    product.images?.[0]?.url ?? product.images?.[0]?.thumbnailUrl ?? null;
  const price = product.discountedPrice ?? product.price;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Link
        href="/#products"
        className="inline-flex items-center gap-2 text-drinkeaze-dark/70 hover:text-drinkeaze-mango font-medium text-sm mb-8 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to menu
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        <div className="relative aspect-[4/3] rounded-2xl bg-drinkeaze-sand/10 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
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
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-drinkeaze-dark mb-4">
            {product.name}
          </h1>
          <p className="text-drinkeaze-mango font-semibold text-xl mb-6">
            PKR {price}
          </p>
          <p className="text-drinkeaze-dark/80 font-body leading-relaxed mb-8 whitespace-pre-line">
            {product.description}
          </p>
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-drinkeaze-mango text-white font-semibold hover:bg-drinkeaze-mango/90 transition shadow-lg shadow-drinkeaze-mango/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
