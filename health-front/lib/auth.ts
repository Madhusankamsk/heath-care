import { cookies } from "next/headers";

const authTokenCookieName = "health_front_auth_token";

export async function getIsAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(authTokenCookieName);

  return Boolean(tokenCookie?.value);
}

export function getSessionCookieName(): string {
  return authTokenCookieName;
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(authTokenCookieName)?.value ?? null;
}

