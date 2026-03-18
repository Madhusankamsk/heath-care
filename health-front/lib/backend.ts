import { getAuthToken } from "@/lib/auth";

export type BackendMeResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string | null;
    isActive: boolean;
  };
  permissions: string[];
};

export async function getBackendBaseUrl(): Promise<string> {
  return process.env.HEALTH_BACKEND_URL?.trim() || "http://localhost:4000";
}

export async function backendFetch(path: string, init?: RequestInit) {
  const baseUrl = await getBackendBaseUrl();
  const token = await getAuthToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
  });
}

