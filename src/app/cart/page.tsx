"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/src/context/CartContext";

export default function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-drinkeaze-sand/20 text-4xl mb-6">
          🛒
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-drinkeaze-dark mb-3">
          Your cart is empty
        </h1>
        <p className="text-drinkeaze-dark/70 font-body mb-8">
          Add something from the menu to get started.
        </p>
        <Link
          href="/#products"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-drinkeaze-mango text-white font-semibold hover:bg-drinkeaze-mango/90 transition"
        >
          View menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="font-display font-bold text-3xl sm:text-4xl text-drinkeaze-dark mb-8">
        Your cart
      </h1>

      <ul className="space-y-4 mb-10">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6 rounded-2xl bg-white border border-drinkeaze-sand/30 shadow-sm"
          >
            <div className="flex gap-4 flex-1">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-drinkeaze-sand/10 flex-shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl">
                    🍹
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-semibold text-lg text-drinkeaze-dark">
                  {item.name}
                </h2>
                <p className="text-drinkeaze-mango font-semibold mt-1">
                  PKR {item.price}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="flex items-center rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/50">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2.5 text-drinkeaze-dark hover:bg-drinkeaze-sand/20 rounded-l-xl transition"
                  aria-label="Decrease quantity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="px-4 py-2 min-w-[3rem] text-center font-semibold tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-2.5 text-drinkeaze-dark hover:bg-drinkeaze-sand/20 rounded-r-xl transition"
                  aria-label="Increase quantity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="p-2 rounded-lg text-drinkeaze-dark/60 hover:text-drinkeaze-coral hover:bg-drinkeaze-coral/10 transition"
                aria-label="Remove from cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-white border border-drinkeaze-sand/30 p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-center text-lg font-semibold text-drinkeaze-dark mb-6">
          <span>Subtotal</span>
          <span>PKR {subtotal.toLocaleString()}</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center py-4 rounded-xl bg-drinkeaze-mango text-white font-semibold hover:bg-drinkeaze-mango/90 transition shadow-md shadow-drinkeaze-mango/20"
        >
          Proceed to checkout
        </Link>
        <Link
          href="/#products"
          className="block text-center mt-4 text-drinkeaze-dark/70 hover:text-drinkeaze-mango font-medium text-sm transition"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
