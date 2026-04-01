import { Button } from "@/components/ui/Button";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";

import type { DispatchRecordRow, PendingConfirm } from "./shared";

type Props = {
  booking: UpcomingBookingRow;
  canUpdateDispatch: boolean;
  busyDispatchId: string | null;
  inTransit: DispatchRecordRow | null;
  arrived: DispatchRecordRow | null;
  detailBookingId: string | null;
  setPendingConfirm: (value: PendingConfirm) => void;
  toggleDetails: (bookingId: string) => void;
};

export function BookingHistoryCardHeader({
  booking,
  canUpdateDispatch,
  busyDispatchId,
  inTransit,
  arrived,
  detailBookingId,
  setPendingConfirm,
  toggleDetails,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {formatScheduled(booking.scheduledDate)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {canUpdateDispatch && inTransit ? (
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            disabled={busyDispatchId !== null}
            onClick={() => setPendingConfirm({ type: "arrived", dispatchId: inTransit.id })}
          >
            {busyDispatchId === inTransit.id ? "…" : "Mark arrived"}
          </Button>
        ) : null}
        {canUpdateDispatch && arrived && !inTransit ? (
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            disabled={busyDispatchId !== null}
            onClick={() => setPendingConfirm({ type: "diagnostic", dispatchId: arrived.id })}
          >
            {busyDispatchId === arrived.id ? "…" : "Start diagnostic"}
          </Button>
        ) : null}
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25"
          aria-label="View booking details"
          aria-haspopup="dialog"
          aria-expanded={detailBookingId === booking.id}
          onClick={() => toggleDetails(booking.id)}
        >
          <span aria-hidden className="block translate-y-[-1px]">
            ⋮
          </span>
        </button>
      </div>
    </div>
  );
}
