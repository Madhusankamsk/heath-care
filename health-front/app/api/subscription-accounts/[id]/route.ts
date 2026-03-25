import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

type Params = { id: string };

export async function GET(_request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  const res = await backendFetch(`/api/subscription-accounts/${id}`).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Failed to reach backend service",
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

export async function PUT(request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  const requestText = await request.text().catch(() => "");
  const res = await backendFetch(`/api/subscription-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" },
    body: requestText,
  }).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Failed to reach backend service",
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

export async function DELETE(_request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  const res = await backendFetch(`/api/subscription-accounts/${id}`, {
    method: "DELETE",
  }).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Failed to reach backend service",
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

