import { PatientBookingsHistory } from "@/components/clients/PatientBookingsHistory";
import { Card } from "@/components/ui/Card";
import type { UpcomingBookingRow } from "@/components/dispatch/types";

import type { LabSampleTypeLookup } from "@/components/clients/patient-bookings/shared";

type Props = {
  canSeeBookings: boolean;
  canUpdateDispatch: boolean;
  canSaveVisitDraft: boolean;
  patientBookings: UpcomingBookingRow[] | null;
  labSampleTypeLookups: LabSampleTypeLookup[];
};

export function PatientBookingsSection({
  canSeeBookings,
  canUpdateDispatch,
  canSaveVisitDraft,
  patientBookings,
  labSampleTypeLookups,
}: Props) {
  return (
    <Card
      title="Bookings and Dispatch"
      description="Visit requests, dispatch runs, and crew assignments."
    >
      {canSeeBookings ? (
        patientBookings === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Could not load booking history. Try again or check your network connection.
          </p>
        ) : (
          <PatientBookingsHistory
            bookings={patientBookings}
            canUpdateDispatch={canUpdateDispatch}
            canSaveVisitDraft={canSaveVisitDraft}
            labSampleTypeLookups={labSampleTypeLookups}
          />
        )
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          Booking and dispatch history requires{" "}
          <span className="font-medium text-[var(--text-primary)]">bookings:list</span> or{" "}
          <span className="font-medium text-[var(--text-primary)]">bookings:read</span> permission.
        </p>
      )}
    </Card>
  );
}
