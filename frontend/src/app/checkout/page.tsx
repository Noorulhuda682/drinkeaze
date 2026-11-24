"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useCart } from "@/src/context/CartContext";

type PaymentMethod = "cash" | "online";

type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  note: string;
};

type ApiError = { message?: string | string[] };

async function readApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    if (Array.isArray(data.message)) return data.message.join(" ");
    if (data.message) return data.message;
  } catch {
    // Fall through to a safe generic message.
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "Karachi",
    note: "",
  });
  const orderKeyRef = useRef<string | null>(null);
  const paymentKeyRef = useRef<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (itemCount === 0 || loading) return;

    const invalidItem = items.find((item) => !item.variantId || item.id !== item.variantId);
    if (invalidItem) {
      setError("Your cart contains an outdated product selection. Remove it and add the product again from the menu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      orderKeyRef.current ??= crypto.randomUUID();
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": orderKeyRef.current,
        },
        body: JSON.stringify({
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          ...(form.email.trim() ? { customerEmail: form.email.trim() } : {}),
          deliveryAddress: form.address.trim(),
          deliveryCity: form.city.trim(),
          ...(form.note.trim() ? { deliveryInstructions: form.note.trim(), notes: form.note.trim() } : {}),
          paymentMethod: paymentMethod === "cash" ? "CASH_ON_DELIVERY" : "ONLINE",
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!orderResponse.ok) throw new Error(await readApiError(orderResponse));
      const order = await orderResponse.json() as {
        orderNumber: string;
        trackingToken: string;
      };

      if (!order.orderNumber || !order.trackingToken) {
        throw new Error("The order service returned an incomplete order confirmation. Please contact support before retrying.");
      }

      sessionStorage.setItem("drinkeaze:last-order", JSON.stringify({
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
      }));

      if (paymentMethod === "online") {
        paymentKeyRef.current ??= crypto.randomUUID();
        const paymentResponse = await fetch(
          `/api/payments/orders/${encodeURIComponent(order.orderNumber)}/initiate`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-order-tracking-token": order.trackingToken,
            },
            body: JSON.stringify({
              method: "CARD",
              idempotencyKey: paymentKeyRef.current,
            }),
          },
        );

        if (!paymentResponse.ok) throw new Error(await readApiError(paymentResponse));
        const payment = await paymentResponse.json() as { checkoutUrl?: string };
        if (!payment.checkoutUrl) {
          throw new Error("The payment provider did not return a checkout URL. Your order is saved but payment is not confirmed.");
        }
        window.location.assign(payment.checkoutUrl);
        return;
      }

      clearCart();
      router.push(`/checkout/success?payment=cash&orderNumber=${encodeURIComponent(order.orderNumber)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to place your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="rounded-[24px] bg-white border border-slate-200/80 p-10 shadow-sm">
          <h1 className="font-display font-bold text-2xl text-slate-900 mb-4">Your cart is empty</h1>
          <Link
            href="/#products"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#48CAE4] text-slate-950 font-semibold text-sm hover:bg-[#32b4cf] transition"
          >
            Add items to checkout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-8">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <section className="rounded-[22px] bg-white border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            <h2 className="font-display font-semibold text-lg text-slate-900 mb-4">Contact & delivery</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Name *</span>
                <input name="name" value={form.name} onChange={handleChange} required minLength={2} maxLength={120} autoComplete="name" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8f9fa] text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30" placeholder="Your name" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Phone *</span>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} required minLength={7} maxLength={30} autoComplete="tel" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8f9fa] text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30" placeholder="e.g. 0300 1234567" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} autoComplete="email" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8f9fa] text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30" placeholder="you@example.com" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Delivery address *</span>
                <input name="address" value={form.address} onChange={handleChange} required minLength={5} maxLength={500} autoComplete="street-address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8f9fa] text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30" placeholder="Area, block, street, house no." />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">City *</span>
                <input name="city" value={form.city} onChange={handleChange} required minLength={2} maxLength={100} autoComplete="address-level2" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8f9fa] text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30" placeholder="Karachi" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Delivery instructions</span>
                <textarea name="note" value={form.note} onChange={handleChange} rows={3} maxLength={500} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8f9fa] text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#48CAE4]/30 resize-none" placeholder="Any special instructions" />
              </label>
            </div>
          </section>

          <section className="rounded-[22px] bg-white border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            <h2 className="font-display font-semibold text-lg text-slate-900 mb-4">Payment method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setPaymentMethod("cash")} className={`p-5 rounded-2xl border-2 transition text-left ${paymentMethod === "cash" ? "border-[#48CAE4] bg-cyan-50/40" : "border-slate-200 bg-white"}`}>
                <span className="block font-semibold text-sm text-slate-900">Cash on Delivery</span>
                <span className="block text-xs text-slate-500 mt-1">Pay when your order arrives</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod("online")} className={`p-5 rounded-2xl border-2 transition text-left ${paymentMethod === "online" ? "border-[#48CAE4] bg-cyan-50/40" : "border-slate-200 bg-white"}`}>
                <span className="block font-semibold text-sm text-slate-900">Online Payment</span>
                <span className="block text-xs text-slate-500 mt-1">Secure hosted checkout by Safepay</span>
              </button>
            </div>
            {paymentMethod === "online" && (
              <p className="mt-4 text-xs text-slate-500">You will be redirected to Safepay&apos;s secure checkout to enter your payment details. Drinkeaze does not collect or store your card number or CVV.</p>
            )}
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-6 sm:p-8 shadow-sm sticky top-24">
            <h2 className="font-display font-semibold text-lg text-slate-900 mb-4">Order summary</h2>
            <ul className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-xl bg-[#f8f9fa] border border-slate-200/70 flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" /> : <span className="absolute inset-0 flex items-center justify-center text-xl">🍹</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.variantName}</p>
                    <p className="text-xs text-slate-500">{item.quantity} × PKR {item.price.toLocaleString()}</p>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 flex-shrink-0">PKR {(item.price * item.quantity).toLocaleString()}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200/70 pt-4 flex justify-between items-center text-lg font-bold text-slate-900 mb-6">
              <span>Subtotal</span>
              <span className="text-[#48CAE4]">PKR {subtotal.toLocaleString()}</span>
            </div>
            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? (paymentMethod === "online" ? "Connecting to Safepay…" : "Placing order…") : paymentMethod === "online" ? "Continue to Safepay" : "Place order"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
