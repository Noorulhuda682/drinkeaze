"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/src/context/CartContext";
import type { CatalogProduct, CatalogVariant } from "@/src/types/catalog";

type ProductCardProps = {
  product: CatalogProduct;
  accentClass: string;
};

type CartItemLike = {
  id?: string;
  variantId?: string;
  productBvid?: string;
  quantity?: number;
};

type CartShape = {
  items?: CartItemLike[];
  cartItems?: CartItemLike[];
  addItem: (
    item: {
      id: string;
      variantId: string;
      productBvid: string;
      variantName: string;
      name: string;
      price: number;
      imageUrl: string | null;
    },
    qty?: number,
  ) => void;
  updateQuantity?: (id: string, qty: number) => void;
  removeItem?: (id: string) => void;
};

function getDefaultVariant(product: CatalogProduct): CatalogVariant | undefined {
  const available = (product.variants ?? []).filter((variant) => variant.isAvailable);
  return available.find((variant) => variant.isDefault) ?? available[0];
}

export default function ProductCard({ product, accentClass }: ProductCardProps) {
  const cart = useCart() as unknown as CartShape;

  const imageUrl =
    product.images?.[0]?.url ?? product.images?.[0]?.thumbnailUrl ?? null;
  const variant = getDefaultVariant(product);
  const price = variant?.price ?? product.discountedPrice ?? product.price;
  const canOrder = Boolean(variant?.isOrderable);

  const rawItems: CartItemLike[] = Array.isArray(cart.items)
    ? cart.items
    : Array.isArray(cart.cartItems)
      ? cart.cartItems
      : [];

  const matchedItem = variant
    ? rawItems.find(
        (it) =>
          it.variantId === variant.id ||
          it.id === variant.id ||
          it.id === `${product.bvid}:${variant.id}`,
      )
    : undefined;

  const qty = Number(matchedItem?.quantity ?? 0);
  const itemKey = matchedItem?.id ?? variant?.id ?? "";

  const [popping, setPopping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const popTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
    };
  }, []);

  const triggerMotion = () => {
    setPopping(false);
    window.requestAnimationFrame(() => {
      setPopping(true);
      if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
      popTimerRef.current = window.setTimeout(() => setPopping(false), 320);
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const buildPayload = (v: CatalogVariant) => ({
    id: v.id,
    variantId: v.id,
    productBvid: product.bvid,
    variantName: v.name,
    name: product.name,
    price: v.price,
    imageUrl,
  });

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || !canOrder) return;

    cart.addItem(buildPayload(variant), 1);
    triggerMotion();
    showToast(`Added "${product.name}" to cart`);
  };

  const handleIncrement = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || !canOrder) return;

    if (typeof cart.updateQuantity === "function" && itemKey) {
      cart.updateQuantity(itemKey, qty + 1);
    } else {
      cart.addItem(buildPayload(variant), 1);
    }

    triggerMotion();
    showToast(`${product.name} qty: ${qty + 1}`);
  };

  const handleDecrementOrDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant) return;

    if (qty <= 1) {
      if (typeof cart.removeItem === "function" && itemKey) {
        cart.removeItem(itemKey);
      } else if (typeof cart.updateQuantity === "function" && itemKey) {
        cart.updateQuantity(itemKey, 0);
      }
      triggerMotion();
      showToast(`Removed "${product.name}" from cart`);
      return;
    }

    if (typeof cart.updateQuantity === "function" && itemKey) {
      cart.updateQuantity(itemKey, qty - 1);
    } else {
      cart.addItem(buildPayload(variant), -1);
    }

    triggerMotion();
    showToast(`${product.name} qty: ${qty - 1}`);
  };

  return (
    <>
      <style jsx>{`
        @keyframes cartPopBounce {
          0% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.16) rotate(-3deg);
          }
          75% {
            transform: scale(0.95) rotate(2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        .cart-pop-anim {
          animation: cartPopBounce 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div
        className={`group relative rounded-[20px] bg-white border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4 min-h-[176px] ${
          qty > 0
            ? "border-[#48CAE4] ring-2 ring-[#48CAE4]/25"
            : "border-slate-200/80 hover:border-[#48CAE4]/60"
        }`}
      >
        <Link
          href={`/product/${encodeURIComponent(product.bvid)}`}
          className="flex flex-col justify-between flex-1 min-w-0 h-full pr-1"
        >
          <div>
            <h3 className="font-display font-bold text-base sm:text-[17px] text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0d4d61] transition-colors">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed mt-1.5 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#48CAE4] text-slate-950 font-bold text-xs sm:text-sm tracking-tight shadow-xs">
              Rs. {price.toLocaleString()}
            </span>
            {qty > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#48CAE4]/20 text-[#093644] font-semibold text-[11px]">
                {qty} in cart
              </span>
            )}
            {!canOrder && (
              <span className="text-[11px] font-medium text-slate-400">
                Unavailable
              </span>
            )}
          </div>
        </Link>

        <div className="relative w-28 h-32 sm:w-32 sm:h-36 flex-shrink-0">
          <Link
            href={`/product/${encodeURIComponent(product.bvid)}`}
            className={`block w-full h-full rounded-2xl overflow-hidden border border-[#48CAE4]/25 flex items-center justify-center ${accentClass}`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <span className="text-3xl opacity-75">🍹</span>
            )}
          </Link>

          {qty <= 0 ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canOrder}
              title={
                !variant
                  ? "Product is not synced with the ordering database"
                  : !canOrder
                    ? "Recipe setup or sufficient stock is required before this item can be ordered"
                    : `Add ${product.name} to cart`
              }
              aria-label={canOrder ? `Add ${product.name} to cart` : `${product.name} unavailable`}
              className={`absolute -bottom-2 -right-2 h-11 w-11 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-bold text-2xl leading-none flex items-center justify-center shadow-lg border-2 border-white transition disabled:opacity-45 disabled:cursor-not-allowed ${
                popping ? "cart-pop-anim" : ""
              }`}
            >
              +
            </button>
          ) : (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={`absolute -bottom-2 -right-2 h-10 rounded-full bg-[#06222c] text-white border-2 border-[#48CAE4] shadow-lg flex items-center gap-1 px-1.5 ${
                popping ? "cart-pop-anim" : ""
              }`}
            >
              <button
                type="button"
                onClick={handleDecrementOrDelete}
                aria-label={
                  qty === 1
                    ? `Remove ${product.name} from cart`
                    : `Decrease ${product.name} quantity`
                }
                title={qty === 1 ? "Remove item" : "Decrease quantity"}
                className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                  qty === 1
                    ? "bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white"
                    : "bg-white/10 hover:bg-[#48CAE4] text-white hover:text-slate-950 font-bold text-base"
                }`}
              >
                {qty === 1 ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                ) : (
                  "−"
                )}
              </button>

              <span className="min-w-[1.25rem] text-center text-xs sm:text-sm font-bold text-[#48CAE4] tabular-nums px-0.5">
                {qty}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={!canOrder}
                aria-label={`Increase ${product.name} quantity`}
                title="Increase quantity"
                className="h-7 w-7 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-bold text-base leading-none flex items-center justify-center transition disabled:opacity-45"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-[#061c24] text-white border border-[#48CAE4]/60 px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#48CAE4] animate-pulse" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="ml-1 text-slate-300 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
