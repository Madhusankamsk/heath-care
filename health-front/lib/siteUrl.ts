import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

