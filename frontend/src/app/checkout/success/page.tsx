"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const orderNumber = searchParams.get("orderNumber");
  const paymentLabel = payment === "online" ? "Online payment" : "Cash on Delivery";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <div className="rounded-[24px] bg-white border border-slate-200/80 p-10 shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-[#48CAE4] mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-2">Thank you for your order</h1>
        <p className="text-slate-500 text-sm mb-3">Your order has been recorded successfully.</p>
        {orderNumber && <p className="font-semibold text-slate-900 mb-1">Order number: {orderNumber}</p>}
        {payment && <p className="text-slate-500 text-xs mb-8">Payment: {paymentLabel}</p>}
        {!payment && <div className="mb-8" />}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/#products" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition">
            Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">Loading…</div>}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}
