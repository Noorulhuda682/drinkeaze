import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function forward(request: NextRequest, pathSegments: string[]) {
  const backendUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const cleanPath = pathSegments.join("/");
  const search = request.nextUrl.search ?? "";
  const targetUrl = `${backendUrl}/${cleanPath}${search}`;

  const headers: Record<string, string> = { accept: "application/json" };
  for (const h of ["authorization", "idempotency-key", "x-order-tracking-token", "x-bootstrap-secret", "content-type"]) {
    const val = request.headers.get(h);
    if (val) headers[h] = val;
  }

  const hasBody = !["GET", "HEAD"].includes(request.method.toUpperCase());
  const rawBody = hasBody ? await request.text() : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? rawBody : undefined,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Backend proxy error:", targetUrl, error);
    return NextResponse.json({ message: "Unable to reach backend API service." }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params.path ?? []);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params.path ?? []);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params.path ?? []);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params.path ?? []);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params.path ?? []);
}
