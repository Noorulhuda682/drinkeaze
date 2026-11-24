"use client";

import Link from "next/link";

export default function PaymentCancelledPage() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <div className="rounded-[24px] bg-white border border-slate-200/80 p-10 shadow-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-700 font-bold text-2xl mb-5">!</div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-2">Payment was not completed</h1>
        <p className="text-slate-500 text-sm mb-8">Your order may still be pending. Please check its payment status before attempting another payment.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/checkout/payment-return" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition">Check payment status</Link>
          <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
