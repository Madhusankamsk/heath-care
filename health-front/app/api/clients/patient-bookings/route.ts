import { proxyToApi } from "./proxy";

export async function GET(request: Request) {
  return proxyToApi(request, "/api/inventory/batches", { method: "GET" });
}
