import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: { orderNumber: string } },
) {
  const backendUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const trackingToken = request.headers.get("x-order-tracking-token");
  if (!trackingToken) {
    return NextResponse.json({ message: "Missing order tracking credentials." }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${backendUrl}/payments/orders/${encodeURIComponent(context.params.orderNumber)}/initiate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-order-tracking-token": trackingToken,
        accept: "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("Payment initiation proxy failed:", error);
    return NextResponse.json({ message: "Payment service is temporarily unavailable. Your order has not been marked as paid." }, { status: 502 });
  }
}
