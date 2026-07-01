"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const paymentLabel =
    payment === "online" ? "Online Payment" : "Cash on Delivery";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-drinkeaze-mint/20 text-drinkeaze-mint mb-8">
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-drinkeaze-dark mb-3">
        Thank you for your order
      </h1>
      <p className="text-drinkeaze-dark/70 font-body mb-2">
        We&apos;ve received your order and will prepare it soon. You&apos;ll be
        contacted for delivery confirmation.
      </p>
      {payment && (
        <p className="text-drinkeaze-dark/60 font-body text-sm mb-8">
          Payment: {paymentLabel}
        </p>
      )}
      {!payment && <div className="mb-8" />}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/#products"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-drinkeaze-mango text-white font-semibold hover:bg-drinkeaze-mango/90 transition"
        >
          Order again
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-drinkeaze-sand/40 text-drinkeaze-dark font-semibold hover:border-drinkeaze-mango hover:text-drinkeaze-mango transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
