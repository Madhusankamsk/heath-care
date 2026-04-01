import { proxyToApi } from "@/app/api/clients/patient-bookings/proxy";

export async function POST(request: Request) {
  const bodyText = await request.text().catch(() => "");
  const contentType = request.headers.get("content-type");
  return proxyToApi(request, "/api/inventory/stock-movements", {
    method: "POST",
    body: bodyText,
    contentType,
  });
}
