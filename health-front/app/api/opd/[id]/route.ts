import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

type Params = { id: string };

async function forwardBackendResponse(res: Response) {
  const status = res.status;
  const contentType = res.headers.get("content-type");

  // 204/205/304 responses must not include a body.
  if (status === 204 || status === 205 || status === 304) {
    return new NextResponse(null, { status });
  }

  const bodyText = await res.text().catch(() => "");
  return new NextResponse(bodyText, {
    status,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}

export async function PATCH(request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  const requestText = await request.text().catch(() => "");
  const res = await backendFetch(`/api/opd/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" },
    body: requestText,
  }).catch((error) => {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Failed to reach backend service",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  });

  return forwardBackendResponse(res);
}

export async function DELETE(_request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  const res = await backendFetch(`/api/opd/${id}`, { method: "DELETE" }).catch((error) => {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Failed to reach backend service",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  });

  return forwardBackendResponse(res);
}
