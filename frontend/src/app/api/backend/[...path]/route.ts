import { NextRequest, NextResponse } from "next/server";

function resolveBackendBaseUrl(): string {
  const raw =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";

  return raw.trim().replace(/\/+$/, "");
}

async function forwardRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams =
    context.params instanceof Promise ? await context.params : context.params;
  const segments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
  const baseUrl = resolveBackendBaseUrl();
  const targetPath = segments.join("/");
  const search = req.nextUrl.search || "";

  const normalizedBase = baseUrl.endsWith("/api") && targetPath.startsWith("api/")
    ? baseUrl.slice(0, -4)
    : baseUrl;

  const targetUrl = `${normalizedBase}/${targetPath}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "content-length" ||
      lower === "transfer-encoding"
    ) {
      return;
    }
    headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "content-encoding" || lower === "transfer-encoding") {
        return;
      }
      responseHeaders.set(key, value);
    });

    const buffer = await upstreamResponse.arrayBuffer();
    return new NextResponse(buffer, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend proxy request failed:", { targetUrl, error });
    return NextResponse.json(
      {
        message: "Unable to reach backend API service",
        targetUrl,
      },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  return forwardRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  return forwardRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  return forwardRequest(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  return forwardRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  return forwardRequest(req, context);
}

export async function OPTIONS(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  return forwardRequest(req, context);
}
