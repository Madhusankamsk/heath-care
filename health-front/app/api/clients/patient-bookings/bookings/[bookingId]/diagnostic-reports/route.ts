import { proxyToApi } from "@/app/api/clients/patient-bookings/proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  const bodyText = await request.text().catch(() => "");
  const contentType = request.headers.get("content-type");
  return proxyToApi(request, `/api/bookings/${bookingId}/diagnostic-reports`, {
    method: "POST",
    body: bodyText,
    contentType,
  });
}
