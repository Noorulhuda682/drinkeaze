"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/src/context/CartContext";

type StoredOrder = { orderNumber: string; trackingToken: string };
type PaymentStatus = "loading" | "success" | "pending" | "failed" | "error";

export default function PaymentReturnPage() {
  const { clearCart } = useCart();
  const [message, setMessage] = useState("Verifying your payment with Safepay…");
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [retrying, setRetrying] = useState(false);

  const verifyPayment = useCallback(async (order: StoredOrder) => {
    const response = await fetch(`/api/payments/orders/${encodeURIComponent(order.orderNumber)}/verify`, {
      method: "POST",
      headers: { "x-order-tracking-token": order.trackingToken },
    });
    const result = await response.json();

    if (response.ok && result.orderPaymentStatus === "PAID") {
      sessionStorage.removeItem("drinkeaze:last-order");
      clearCart();
      setStatus("success");
      setMessage("Your payment has been verified successfully.");
      return;
    }

    if (response.ok && result.orderPaymentStatus === "FAILED") {
      setStatus("failed");
      setMessage(result.message || "The payment was not completed. You can retry securely below.");
      return;
    }

    setStatus("pending");
    setMessage(typeof result.message === "string" ? result.message : "Safepay has not confirmed the payment yet. Check again in a moment.");
  }, [clearCart]);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      try {
        const raw = sessionStorage.getItem("drinkeaze:last-order");
        if (!raw) throw new Error("We could not find this checkout session. Please contact Drinkeaze with your payment receipt.");
        const order = JSON.parse(raw) as StoredOrder;
        if (!order.orderNumber || !order.trackingToken) throw new Error("The saved order details are incomplete.");
        if (!cancelled) {
          setOrderNumber(order.orderNumber);
          setTrackingToken(order.trackingToken);
        }
        await verifyPayment(order);
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Unable to verify payment.");
        }
      }
    }
    void verify();
    return () => { cancelled = true; };
  }, [verifyPayment]);

  const retryPayment = async () => {
    if (!orderNumber || !trackingToken || retrying) return;
    setRetrying(true);
    setMessage("");
    try {
      const response = await fetch(`/api/payments/orders/${encodeURIComponent(orderNumber)}/initiate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-order-tracking-token": trackingToken,
        },
        body: JSON.stringify({ method: "CARD", idempotencyKey: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.message === "string" ? result.message : "Unable to restart payment.");
      }
      if (!result.checkoutUrl) throw new Error("The payment provider did not return a checkout URL.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to restart payment.");
      setRetrying(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-3xl mb-6">
        {status === "success" ? "✓" : status === "loading" ? "…" : "!"}
      </div>
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-3">
        {status === "success" ? "Payment confirmed" : status === "loading" ? "Checking payment" : status === "failed" ? "Payment not completed" : "Payment status"}
      </h1>
      <p className="text-slate-900/70 mb-4">{message}</p>
      {orderNumber && <p className="font-semibold text-slate-900 mb-8">Order number: {orderNumber}</p>}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {status === "success" && <Link href={`/checkout/success?payment=online&orderNumber=${encodeURIComponent(orderNumber)}`} className="px-6 py-3 rounded-full bg-[#48CAE4] text-slate-950 font-semibold">Continue</Link>}
        {status === "failed" && <button type="button" onClick={retryPayment} disabled={retrying} className="px-6 py-3 rounded-full bg-[#48CAE4] text-slate-950 font-semibold disabled:opacity-60">{retrying ? "Connecting…" : "Retry online payment"}</button>}
        {(status === "pending" || status === "error") && <button type="button" onClick={() => window.location.reload()} className="px-6 py-3 rounded-full bg-[#48CAE4] text-slate-950 font-semibold">Check again</button>}
        <Link href="/" className="px-6 py-3 rounded-full border border-slate-200 text-slate-900 font-semibold">Back to home</Link>
      </div>
    </div>
  );
}
