"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/src/context/CartContext";

export default function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="rounded-[24px] bg-white border border-slate-200/80 p-10 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-3xl mb-5">
            🛒
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-2">
            Your cart is empty
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            Add something from the menu to get started.
          </p>
          <Link
            href="/#products"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition"
          >
            View menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-6">
        Your cart
      </h1>

      <ul className="space-y-4 mb-8">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-[22px] bg-white border border-slate-200/80 shadow-sm"
          >
            <div className="flex gap-4 flex-1">
              <div className="relative w-24 h-24 rounded-2xl bg-[#f8f9fa] border border-slate-200/70 flex-shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl">
                    🍹
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-semibold text-lg text-slate-900">
                  {item.name}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{item.variantName}</p>
                <p className="text-[#48CAE4] font-bold mt-1.5">
                  PKR {item.price.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="flex items-center rounded-full border border-slate-200 bg-[#f8f9fa]">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2.5 text-slate-700 hover:bg-slate-200/60 rounded-l-full transition"
                  aria-label="Decrease quantity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="px-3.5 py-1.5 min-w-[2.5rem] text-center font-semibold text-sm tabular-nums text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-2.5 text-slate-700 hover:bg-slate-200/60 rounded-r-full transition"
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
                className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
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

      <div className="rounded-[22px] bg-white border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-center text-lg font-bold text-slate-900 mb-6">
          <span>Subtotal</span>
          <span className="text-[#48CAE4]">PKR {subtotal.toLocaleString()}</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center py-3.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition shadow-sm"
        >
          Proceed to checkout
        </Link>
        <Link
          href="/#products"
          className="block text-center mt-4 text-slate-500 hover:text-[#48CAE4] font-medium text-sm transition"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
