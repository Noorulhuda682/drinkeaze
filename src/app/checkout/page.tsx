"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/src/context/CartContext";
import { useState } from "react";

type PaymentMethod = "cash" | "online";

type CardDetails = {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
};

const emptyCard: CardDetails = { number: "", holder: "", expiry: "", cvv: "" };

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function validateCard(card: CardDetails) {
  const errors: Partial<Record<keyof CardDetails, string>> = {};

  if (!card.holder.trim()) {
    errors.holder = "Enter the name on the card";
  }

  const digits = onlyDigits(card.number);
  if (digits.length < 15 || digits.length > 19 || !passesLuhn(digits)) {
    errors.number = "Enter a valid card number";
  }

  const match = card.expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    errors.expiry = "Use MM/YY";
  } else {
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const now = new Date();
    if (month < 1 || month > 12) {
      errors.expiry = "Invalid month";
    } else if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      errors.expiry = "Card has expired";
    }
  }

  if (!/^\d{3,4}$/.test(card.cvv)) {
    errors.cvv = "3 or 4 digits";
  }

  return errors;
}

function fieldClass(hasError?: string) {
  return `w-full px-4 py-3 rounded-xl border outline-none transition ${hasError
    ? "border-drinkeaze-coral bg-red-50/40 focus:border-drinkeaze-coral focus:ring-2 focus:ring-drinkeaze-coral/20"
    : "border-drinkeaze-sand/40 bg-drinkeaze-cream/30 focus:border-drinkeaze-mango focus:ring-2 focus:ring-drinkeaze-mango/20"
    }`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [card, setCard] = useState<CardDetails>(emptyCard);
  const [cardErrors, setCardErrors] = useState<
    Partial<Record<keyof CardDetails, string>>
  >({});
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

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const next =
      name === "number"
        ? formatCardNumber(value)
        : name === "expiry"
          ? formatExpiry(value)
          : name === "cvv"
            ? onlyDigits(value).slice(0, 4)
            : value;
    setCard((prev) => ({ ...prev, [name]: next }));
    setCardErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemCount === 0) return;

    if (paymentMethod === "online") {
      const errors = validateCard(card);
      setCardErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }

    setLoading(true);
    try {
      // In a real app you would send the order + payment details to a payment gateway
      await new Promise((r) => setTimeout(r, 800));
      clearCart();
      router.push(`/checkout/success?payment=${paymentMethod}`);
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

          <div className="rounded-2xl bg-white border border-drinkeaze-sand/30 p-6 sm:p-8 shadow-sm">
            <h2 className="font-display font-semibold text-lg text-drinkeaze-dark mb-4">
              Payment Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("cash");
                  setCardErrors({});
                }}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 bg-drinkeaze-cream/50 transition text-left ${
                  paymentMethod === "cash"
                    ? "border-drinkeaze-mint ring-2 ring-drinkeaze-mint/30"
                    : "border-drinkeaze-sand/30 hover:border-drinkeaze-sand/50"
                }`}
              >
                <span className="flex items-center justify-center w-14 h-14 rounded-xl bg-drinkeaze-mint/20 text-drinkeaze-mint" aria-hidden>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2M7 15h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11h10" />
                  </svg>
                </span>
                <span className="font-medium text-drinkeaze-dark">Cash on Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("online");
                  setCardErrors({});
                }}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 bg-drinkeaze-cream/50 transition text-left ${
                  paymentMethod === "online"
                    ? "border-drinkeaze-mint ring-2 ring-drinkeaze-mint/30"
                    : "border-drinkeaze-sand/30 hover:border-drinkeaze-sand/50"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5" aria-hidden>
                  <span className="inline-flex items-center justify-center px-2.5 py-1.5 rounded text-[10px] font-bold text-white bg-[#1A1F71]">VISA</span>
                  <span className="inline-flex items-center justify-center px-2.5 py-1.5 rounded text-[10px] font-bold text-white bg-[#EB001B]">MC</span>
                </span>
                <span className="font-medium text-drinkeaze-dark">Online Payment</span>
              </button>
            </div>

            {paymentMethod === "online" && (
              <div className="mt-6 rounded-xl border border-drinkeaze-sand/40 bg-drinkeaze-cream/30 p-5 sm:p-6 space-y-4">
                <p className="text-sm text-drinkeaze-dark/70">
                  Enter your card details to pay PKR {subtotal.toLocaleString()}.
                </p>
                <label className="block">
                  <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                    Card number *
                  </span>
                  <input
                    type="text"
                    name="number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={card.number}
                    onChange={handleCardChange}
                    placeholder="4242 4242 4242 4242"
                    aria-invalid={Boolean(cardErrors.number)}
                    className={fieldClass(cardErrors.number)}
                  />
                  {cardErrors.number && (
                    <span className="mt-1.5 block text-xs font-medium text-drinkeaze-coral">
                      {cardErrors.number}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                    Name on card *
                  </span>
                  <input
                    type="text"
                    name="holder"
                    autoComplete="cc-name"
                    value={card.holder}
                    onChange={handleCardChange}
                    placeholder="As printed on the card"
                    aria-invalid={Boolean(cardErrors.holder)}
                    className={fieldClass(cardErrors.holder)}
                  />
                  {cardErrors.holder && (
                    <span className="mt-1.5 block text-xs font-medium text-drinkeaze-coral">
                      {cardErrors.holder}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                      Expiry *
                    </span>
                    <input
                      type="text"
                      name="expiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={card.expiry}
                      onChange={handleCardChange}
                      placeholder="MM/YY"
                      aria-invalid={Boolean(cardErrors.expiry)}
                      className={fieldClass(cardErrors.expiry)}
                    />
                    {cardErrors.expiry && (
                      <span className="mt-1.5 block text-xs font-medium text-drinkeaze-coral">
                        {cardErrors.expiry}
                      </span>
                    )}
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-drinkeaze-dark mb-1.5">
                      CVV *
                    </span>
                    <input
                      type="password"
                      name="cvv"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={card.cvv}
                      onChange={handleCardChange}
                      placeholder="123"
                      maxLength={4}
                      aria-invalid={Boolean(cardErrors.cvv)}
                      className={fieldClass(cardErrors.cvv)}
                    />
                    {cardErrors.cvv && (
                      <span className="mt-1.5 block text-xs font-medium text-drinkeaze-coral">
                        {cardErrors.cvv}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )}
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
