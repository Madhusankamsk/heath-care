import { proxyToApi } from "@/app/api/clients/patient-bookings/proxy";

export async function POST(request: Request) {
  const fileBuffer = await request.arrayBuffer().catch(() => new ArrayBuffer(0));
  const contentType = request.headers.get("content-type");
  const fileKey = request.headers.get("x-file-key") ?? "";
  return proxyToApi(request, "/api/files/upload", {
    method: "POST",
    body: fileBuffer,
    contentType,
    extraHeaders: fileKey ? { "x-file-key": fileKey } : {},
  });
}
