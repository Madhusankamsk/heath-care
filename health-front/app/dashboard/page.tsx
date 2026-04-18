import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Car,
  CircleCheck,
  Clock,
  FlaskConical,
  Inbox,
  Receipt,
  Stethoscope,
  TriangleAlert,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { DashboardGlobalSearch } from "@/components/dashboard/DashboardGlobalSearch";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { type BackendMeResponse, backendJson } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

type DashboardSummaryTileItem = {
  id: string;
  title: string;
  subtitle: string;
  detail?: string | null;
};

type DashboardSummaryTile = {
  mode: "list" | "kpi";
  count: number;
  summaryPill: string;
  href: string;
  items: DashboardSummaryTileItem[];
  kpiHint?: string | null;
};

type DashboardSummaryResponse = {
  currencyCode: string;
  tiles: {
    bookingsPending?: DashboardSummaryTile;
    bookingsAccepted?: DashboardSummaryTile;
    dispatchUpcoming?: DashboardSummaryTile;
    dispatchOngoing?: DashboardSummaryTile;
    opdWaiting?: DashboardSummaryTile;
    labPending?: DashboardSummaryTile;
    countPatients?: DashboardSummaryTile;
    countBookings?: DashboardSummaryTile;
    countVehicles?: DashboardSummaryTile;
    statRevenue?: DashboardSummaryTile;
    statOutstanding?: DashboardSummaryTile;
  };
};

type TileSection = "kpi" | "list";

type DashboardTileKey = keyof NonNullable<DashboardSummaryResponse["tiles"]>;

const TILE_LABELS: {
  key: DashboardTileKey;
  title: string;
  section: TileSection;
}[] = [
  { key: "countPatients", title: "Patients", section: "kpi" },
  { key: "countBookings", title: "Total bookings", section: "kpi" },
  { key: "countVehicles", title: "Vehicles", section: "kpi" },
  { key: "statRevenue", title: "Revenue collected", section: "kpi" },
  { key: "statOutstanding", title: "Outstanding", section: "kpi" },
  { key: "bookingsPending", title: "Pending doctor acceptance", section: "list" },
  { key: "bookingsAccepted", title: "Accepted by doctor", section: "list" },
  { key: "dispatchUpcoming", title: "Dispatch — upcoming jobs", section: "list" },
  { key: "dispatchOngoing", title: "Dispatch — ongoing jobs", section: "list" },
  { key: "opdWaiting", title: "OPD — waiting today", section: "list" },
  { key: "labPending", title: "Lab — pending samples", section: "list" },
];

/** CSS variable name only (e.g. `--brand-primary`) — used for light tints, not heavy fills */
const TILE_ACCENT: Record<DashboardTileKey, string> = {
  countPatients: "--brand-primary",
  countBookings: "--brand-secondary",
  countVehicles: "--purple",
  statRevenue: "--success",
  statOutstanding: "--warning",
  bookingsPending: "--warning",
  bookingsAccepted: "--success",
  dispatchUpcoming: "--brand-secondary",
  dispatchOngoing: "--brand-primary",
  opdWaiting: "--brand-primary",
  labPending: "--purple",
};

function DashboardTileIcon({ tileKey }: { tileKey: DashboardTileKey }) {
  const accent = TILE_ACCENT[tileKey];
  const commonProps = {
    className: "h-5 w-5",
    style: { color: `var(${accent})` },
    "aria-hidden": true,
  } as const;

  switch (tileKey) {
    case "countPatients":
      return <Users {...commonProps} />;
    case "countBookings":
      return <CalendarDays {...commonProps} />;
    case "countVehicles":
      return <Car {...commonProps} />;
    case "statRevenue":
      return <Wallet {...commonProps} />;
    case "statOutstanding":
      return <TriangleAlert {...commonProps} />;
    case "bookingsPending":
      return <Clock {...commonProps} />;
    case "bookingsAccepted":
      return <CircleCheck {...commonProps} />;
    case "dispatchUpcoming":
      return <Truck {...commonProps} />;
    case "dispatchOngoing":
      return <Activity {...commonProps} />;
    case "opdWaiting":
      return <Stethoscope {...commonProps} />;
    case "labPending":
      return <FlaskConical {...commonProps} />;
    default:
      return <Receipt {...commonProps} />;
  }
}

function DashboardKpiTile({
  label,
  tileKey,
  tile,
}: {
  label: string;
  tileKey: DashboardTileKey;
  tile: DashboardSummaryTile;
}) {
  const accent = TILE_ACCENT[tileKey];
  const isMoneyKpi = tileKey === "statRevenue" || tileKey === "statOutstanding";

  return (
    <div
      className="muted-panel flex min-w-0 flex-col gap-3 overflow-hidden p-4 sm:p-5"
      style={{ boxShadow: `inset 3px 0 0 0 var(${accent})` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)]"
            style={{
              background: `color-mix(in srgb, var(${accent}) 14%, var(--surface))`,
            }}
          >
            <DashboardTileIcon tileKey={tileKey} />
          </div>
          <div className="min-w-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            {label}
          </div>
        </div>

        <Link
          href={tile.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg text-xs font-semibold underline-offset-2 hover:underline"
          style={{ color: `var(${accent})` }}
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div
        className={`min-w-0 break-words rounded-lg px-3 py-2.5 text-xl font-semibold leading-snug tracking-tight text-[var(--text-primary)] sm:text-2xl lg:text-3xl ${isMoneyKpi ? "tabular-nums" : ""}`}
        style={{
          background: `color-mix(in srgb, var(${accent}) 7%, var(--surface))`,
        }}
      >
        {tile.summaryPill}
      </div>

      {tile.kpiHint ? (
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tile.kpiHint}</p>
      ) : null}
    </div>
  );
}

function DashboardListTile({
  label,
  tileKey,
  tile,
}: {
  label: string;
  tileKey: DashboardTileKey;
  tile: DashboardSummaryTile;
}) {
  const accent = TILE_ACCENT[tileKey];

  return (
    <div
      className="muted-panel flex flex-col gap-4 overflow-hidden p-4 sm:p-5"
      style={{ boxShadow: `inset 3px 0 0 0 var(${accent})` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)]"
            style={{
              background: `color-mix(in srgb, var(${accent}) 14%, var(--surface))`,
            }}
          >
            <DashboardTileIcon tileKey={tileKey} />
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {label}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="pill text-xs font-medium"
                style={{
                  background: `color-mix(in srgb, var(${accent}) 15%, transparent)`,
                  color: `var(${accent})`,
                }}
              >
                {tile.summaryPill}
              </span>
            </div>
          </div>
        </div>

        <Link
          href={tile.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg text-xs font-semibold underline-offset-2 hover:underline"
          style={{ color: `var(${accent})` }}
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {tile.items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <Inbox className="h-5 w-5 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <p className="text-sm text-[var(--text-muted)]">None right now.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {tile.items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[var(--border)] px-4 py-3"
              style={{
                background: `color-mix(in srgb, var(${accent}) 5%, var(--surface))`,
                boxShadow: `inset 2px 0 0 0 var(${accent})`,
              }}
            >
              <div className="font-medium text-[var(--text-primary)]">{item.title}</div>
              <div className="mt-1 text-[var(--text-secondary)]">{item.subtitle}</div>
              {item.detail ? (
                <div className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{item.detail}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) {
    redirect("/");
  }

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/");

  const summary = await backendJson<DashboardSummaryResponse>("/api/dashboard/summary");
  const tiles = summary?.tiles ?? {};
  const currencyCode = summary?.currencyCode?.trim();
  const countsDescription =
    currencyCode != null && currencyCode.length > 0
      ? `Totals and figures for modules you can access. Amounts use ${currencyCode}.`
      : "Totals and figures for modules you can access.";

  const kpiKeys = TILE_LABELS.filter((t) => t.section === "kpi")
    .map((t) => t.key)
    .filter((k) => tiles[k] != null);
  const listKeys = TILE_LABELS.filter((t) => t.section === "list")
    .map((t) => t.key)
    .filter((k) => tiles[k] != null);
  const hasAnyTile = kpiKeys.length > 0 || listKeys.length > 0;
  const canGlobalSearch = hasAnyPermission(me.permissions, ["dashboard:global_search"]);

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardGlobalSearch canSearch={canGlobalSearch} />
      {!hasAnyTile ? (
        <Card title="Overview" description="No dashboard tiles are enabled for your role yet.">
          <p className="text-sm text-[var(--text-secondary)]">
            Ask an administrator to grant the relevant{" "}
            <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-xs">dashboard:tile_*</code>{" "}
            permissions together with matching module access (patients, bookings, vehicles, invoices,
            dispatch, OPD, lab).
          </p>
        </Card>
      ) : (
        <>
          {kpiKeys.length > 0 ? (
            <Card title="Counts and totals" description={countsDescription}>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {TILE_LABELS.filter((t) => t.section === "kpi").map(({ key, title }) => {
                  const tile = tiles[key];
                  if (!tile) return null;
                  return <DashboardKpiTile key={key} label={title} tileKey={key} tile={tile} />;
                })}
              </div>
            </Card>
          ) : null}

          {listKeys.length > 0 ? (
            <Card
              title="Urgent and queues"
              description="Open items and waiting queues that need attention."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {TILE_LABELS.filter((t) => t.section === "list").map(({ key, title }) => {
                  const tile = tiles[key];
                  if (!tile) return null;
                  return <DashboardListTile key={key} label={title} tileKey={key} tile={tile} />;
                })}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
