import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const backendUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json({ message: "Missing order idempotency key." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${backendUrl}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
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
    console.error("Order API proxy failed:", error);
    return NextResponse.json({ message: "Ordering service is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
