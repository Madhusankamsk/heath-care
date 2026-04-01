import { proxyToApi } from "@/app/api/clients/patient-bookings/proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dispatchId: string }> },
) {
  const { dispatchId } = await params;
  const bodyText = await request.text().catch(() => "");
  const contentType = request.headers.get("content-type");
  return proxyToApi(request, `/api/dispatch/${dispatchId}/status`, {
    method: "PATCH",
    body: bodyText,
    contentType,
  });
}
