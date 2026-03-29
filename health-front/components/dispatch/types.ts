export type DispatchMemberCandidate = {
  id: string;
  fullName: string;
  email: string;
  role?: { id: string; roleName: string } | null;
};

export type DispatchVehicleOption = {
  id: string;
  vehicleNo: string;
  model?: string | null;
};

export type UpcomingBookingRow = {
  id: string;
  scheduledDate: string | null;
  bookingRemark?: string | null;
  patient?: { id: string; fullName: string; contactNo?: string | null };
  requestedDoctor?: { id: string; fullName: string; email: string } | null;
  doctorStatusLookup?: { id: string; lookupKey: string; lookupValue: string } | null;
  /** Set on GET /api/patients/:id/bookings responses. */
  visitRecord?: { id: string; completedAt: string | null } | null;
  dispatchRecords: Array<{
    id: string;
    dispatchedAt: string;
    statusLookup: { id: string; lookupKey: string; lookupValue: string } | null;
    vehicle: { id: string; vehicleNo: string; model: string | null };
    assignments: Array<{
      id: string;
      isTeamLeader: boolean;
      user: {
        id: string;
        fullName: string;
        email: string;
        role?: { id: string; roleName: string } | null;
      };
    }>;
  }>;
};
