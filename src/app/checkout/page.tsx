"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/src/context/CartContext";
import { useState } from "react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    note: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemCount === 0) return;
    setLoading(true);
    try {
      // In a real app you would send the order to your backend/API
      // For now we simulate success and redirect
      await new Promise((r) => setTimeout(r, 800));
      clearCart();
      router.push("/checkout/success");
    } catch {
      setLoading(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h1 className="font-display font-bold text-2xl text-drinkeaze-dark mb-4">
          Your cart is empty
        </h1>
        <Link
          href="/#products"
          className="text-drinkeaze-mango font-semibold hover:underline"
        >
          Add items to checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="font-display font-bold text-3xl sm:text-4xl text-drinkeaze-dark mb-8">
        Checkout
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl bg-white border border-drinkeaze-sand/30 p-6 sm:p-8 shadow-sm">
            <h2 className="font-display font-semibold text-lg text-drinkeaze-dark mb-4">
              Contact & delivery
            </h2>
            <div className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                  Name *
                </span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/30 focus:border-drinkeaze-mango focus:ring-2 focus:ring-drinkeaze-mango/20 outline-none transition"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                  Phone *
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/30 focus:border-drinkeaze-mango focus:ring-2 focus:ring-drinkeaze-mango/20 outline-none transition"
                  placeholder="e.g. 0300 1234567"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                  Email
                </span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/30 focus:border-drinkeaze-mango focus:ring-2 focus:ring-drinkeaze-mango/20 outline-none transition"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                  Delivery address *
                </span>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/30 focus:border-drinkeaze-mango focus:ring-2 focus:ring-drinkeaze-mango/20 outline-none transition"
                  placeholder="Area, block, street, house no."
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                  Note
                </span>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/30 focus:border-drinkeaze-mango focus:ring-2 focus:ring-drinkeaze-mango/20 outline-none transition resize-none"
                  placeholder="Any special instructions"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white border border-drinkeaze-sand/30 p-6 sm:p-8 shadow-sm sticky top-24">
            <h2 className="font-display font-semibold text-lg text-drinkeaze-dark mb-4">
              Order summary
            </h2>
            <ul className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg bg-drinkeaze-sand/10 flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xl">
                        🍹
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-drinkeaze-dark truncate">
                      {item.name}
                    </p>
                    <p className="text-sm text-drinkeaze-dark/70">
                      {item.quantity} × PKR {item.price}
                    </p>
                  </div>
                  <p className="font-semibold text-drinkeaze-dark flex-shrink-0">
                    PKR {item.price * item.quantity}
                  </p>
                </li>
              ))}
            </ul>
            <div className="border-t border-drinkeaze-sand/30 pt-4 flex justify-between items-center text-lg font-semibold text-drinkeaze-dark mb-6">
              <span>Subtotal</span>
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-drinkeaze-mango text-white font-semibold hover:bg-drinkeaze-mango/90 transition shadow-md shadow-drinkeaze-mango/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Placing order…" : "Place order"}
            </button>
            <Link
              href="/cart"
              className="block text-center mt-4 text-drinkeaze-dark/70 hover:text-drinkeaze-mango font-medium text-sm transition"
            >
              Back to cart
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
