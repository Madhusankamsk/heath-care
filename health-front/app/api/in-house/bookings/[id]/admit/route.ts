import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const res = await backendFetch(`/api/in-house/bookings/${encodeURIComponent(id)}/admit`, {
    method: "POST",
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
