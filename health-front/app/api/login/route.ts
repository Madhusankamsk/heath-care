import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = requestBody?.email?.trim() ?? "";
  const password = requestBody?.password ?? "";

  if (!email || !email.includes("@") || password.length < 4) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  }

  const backendBaseUrl =
    process.env.HEALTH_BACKEND_URL?.trim() || "http://localhost:4000";

  const backendResponse = await fetch(`${backendBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

  if (!backendResponse.ok) {
    const backendBody = (await backendResponse.json().catch(() => null)) as
      | { message?: string }
      | null;
    return NextResponse.json(
      { error: backendBody?.message ?? "Login failed." },
      { status: backendResponse.status },
    );
  }

  const backendBody = (await backendResponse.json().catch(() => null)) as
    | { token?: string }
    | null;

  if (!backendBody?.token) {
    return NextResponse.json(
      { error: "Login failed (missing token)." },
      { status: 502 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), backendBody.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true });
}

