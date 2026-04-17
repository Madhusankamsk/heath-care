import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function GET(request: Request) {
  const q = new URL(request.url).search;
  const res = await backendFetch(`/api/roles${q}`).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error
            ? error.message
            : "Failed to reach backend service",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  });

  const bodyText = await res.text().catch(() => "");
  return new NextResponse(bodyText, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(request: Request) {
  const requestText = await request.text().catch(() => "");
  const res = await backendFetch("/api/roles", {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" },
    body: requestText,
  }).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error
            ? error.message
            : "Failed to reach backend service",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  });

  const bodyText = await res.text().catch(() => "");
  return new NextResponse(bodyText, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

