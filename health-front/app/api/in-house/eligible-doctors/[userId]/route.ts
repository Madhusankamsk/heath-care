import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const body = await request.text();
  const res = await backendFetch(`/api/in-house/eligible-doctors/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const res = await backendFetch(`/api/in-house/eligible-doctors/${encodeURIComponent(userId)}`, {
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
