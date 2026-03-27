import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

type Params = { id: string };

export async function GET(_request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  const res = await backendFetch(`/api/invoices/${id}/pdf`).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Failed to reach backend service",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  });

  const body = await res.arrayBuffer().catch(() => new ArrayBuffer(0));
  const contentType = res.headers.get("content-type") ?? "application/pdf";
  const disposition = res.headers.get("content-disposition");

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  return new NextResponse(body, {
    status: res.status,
    headers,
  });
}
