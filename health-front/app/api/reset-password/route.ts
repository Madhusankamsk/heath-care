import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => null)) as
    | { token?: string; newPassword?: string }
    | null;

  const token = requestBody?.token?.trim() ?? "";
  const newPassword = requestBody?.newPassword ?? "";

  if (!token || newPassword.length < 4) {
    return NextResponse.json(
      { error: "Valid token and password (at least 4 characters) are required." },
      { status: 400 },
    );
  }

  const backendBaseUrl =
    process.env.HEALTH_BACKEND_URL?.trim() || "http://localhost:4000";

  const backendResponse = await fetch(`${backendBaseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  }).catch((error) => {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error
            ? error.message
            : "Failed to reach backend service",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  });

  const backendBody = (await backendResponse.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: backendBody?.message ?? "Reset failed." },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json({
    message: backendBody?.message ?? "Password updated.",
  });
}
