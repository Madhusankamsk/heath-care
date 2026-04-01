import { NextResponse } from "next/server";

type ProxyOptions = {
  method?: string;
  body?: BodyInit | null;
  contentType?: string | null;
  extraHeaders?: Record<string, string>;
};

export async function proxyToApi(request: Request, path: string, options: ProxyOptions = {}) {
  const headers = new Headers();
  if (options.contentType) headers.set("Content-Type", options.contentType);
  for (const [key, value] of Object.entries(options.extraHeaders ?? {})) {
    headers.set(key, value);
  }

  const target = new URL(path, request.url).toString();
  const res = await fetch(target, {
    method: options.method ?? request.method,
    headers,
    body: options.body,
  }).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Failed to reach internal API service",
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
