import { proxyToApi } from "@/app/api/clients/patient-bookings/proxy";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookingId: string; sampleId: string }> },
) {
  const { bookingId, sampleId } = await params;
  return proxyToApi(request, `/api/bookings/${bookingId}/lab-samples/${sampleId}`, {
    method: "DELETE",
  });
}
