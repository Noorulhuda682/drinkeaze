"use client";

import Link from "next/link";
import { useCart } from "@/src/context/CartContext";
import type { CatalogProduct } from "@/src/types/catalog";

type ProductCardProps = {
  product: CatalogProduct;
  accentClass: string;
};

export default function ProductCard({ product, accentClass }: ProductCardProps) {
  const { addItem } = useCart();
  const imageUrl =
    product.images?.[0]?.url ?? product.images?.[0]?.thumbnailUrl ?? null;
  const price = product.discountedPrice ?? product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(
      {
        id: product.bvid,
        name: product.name,
        price,
        imageUrl,
      },
      1
    );
  };

  return (
    <div className="group h-[420px] rounded-2xl bg-white border border-drinkeaze-sand/30 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <Link href={`/product/${encodeURIComponent(product.bvid)}`} className="flex flex-col flex-1 min-h-0">
        <div
          className={`h-48 w-full flex-shrink-0 flex items-center justify-center bg-drinkeaze-sand/10 overflow-hidden ${accentClass}`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl opacity-60">🍹</span>
          )}
        </div>
        <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-0">
          <h3 className="font-display font-semibold text-lg text-drinkeaze-dark mb-1.5 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-drinkeaze-dark/70 text-sm leading-relaxed font-body line-clamp-2 flex-1 min-h-0">
            {product.description}
          </p>
          <p className="text-drinkeaze-dark font-semibold text-sm mt-2 flex-shrink-0">
            PKR {price}
          </p>
        </div>
      </Link>
      <div className="p-4 sm:p-5 pt-0 flex-shrink-0">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-drinkeaze-mango text-white font-semibold text-sm hover:bg-drinkeaze-mango/90 transition shadow-md shadow-drinkeaze-mango/20 hover:shadow-lg hover:shadow-drinkeaze-mango/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Add to cart
        </button>
      </div>
    </div>
  );
}
