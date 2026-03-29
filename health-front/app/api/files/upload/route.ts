import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: Request) {
  const key = request.headers.get("x-file-key");
  if (!key?.trim()) {
    return NextResponse.json({ message: "x-file-key header is required" }, { status: 400 });
  }
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const body = await request.arrayBuffer();
  const res = await backendFetch("/api/files/upload", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "x-file-key": key,
    },
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
