import { redirect } from "next/navigation";

import { Card } from "@/components/Card";
import { getIsAuthenticated } from "@/lib/auth";

type BackendHealth =
  | { status?: string; service?: string; timestamp?: string }
  | { error: string };

export default async function DashboardPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) {
    redirect("/");
  }

  const backendBaseUrl =
    process.env.HEALTH_BACKEND_URL?.trim() || "http://localhost:4000";

  const backendHealth: BackendHealth = await fetch(`${backendBaseUrl}/health`, {
    cache: "no-store",
  })
    .then(async (res) => {
      if (!res.ok) {
        return { error: `Backend health failed (${res.status})` };
      }
      return (await res.json().catch(() => null)) ?? { error: "Invalid JSON" };
    })
    .catch((error) => ({
      error: error instanceof Error ? error.message : "Failed to reach backend",
    }));

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are signed in.
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Backend connection" description="Live status from health-back.">
          {"error" in backendHealth ? (
            <div className="text-sm text-red-700 dark:text-red-300">
              {backendHealth.error}
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between">
                <span>Service</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {backendHealth.service ?? "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {backendHealth.status ?? "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Timestamp</span>
                <span className="font-mono text-xs">
                  {backendHealth.timestamp ?? "unknown"}
                </span>
              </div>
            </div>
          )}
        </Card>

        <Card
          title="Quick links"
          description="Common actions for your healthcare workflow."
        >
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>View appointments</li>
            <li>Patient records</li>
            <li>Messages</li>
            <li>Billing</li>
          </ul>
        </Card>

        <Card title="Status" description="A placeholder for KPIs / charts.">
          <div className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <span>Today&apos;s appointments</span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                12
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending messages</span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                3
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Open tasks</span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                7
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

