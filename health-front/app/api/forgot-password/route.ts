import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => null)) as
    | { email?: string }
    | null;

  const email = requestBody?.email?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const backendBaseUrl =
    process.env.HEALTH_BACKEND_URL?.trim() || "http://localhost:4000";

  const backendResponse = await fetch(`${backendBaseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
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
      { error: backendBody?.message ?? "Request failed." },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json({
    message:
      backendBody?.message ??
      "If an account exists for this email, you will receive reset instructions.",
  });
}
