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
  bookingTypeLookup?: { id: string; lookupKey: string; lookupValue: string } | null;
  /** Present when this booking was created from an OPD queue pick. */
  opdQueueEntry?: { id: string } | null;
  bookingRemark?: string | null;
  patient?: { id: string; fullName: string; contactNo?: string | null };
  requestedDoctor?: { id: string; fullName: string; email: string } | null;
  doctorStatusLookup?: { id: string; lookupKey: string; lookupValue: string } | null;
  inHouseDetail?: {
    id: string;
    status: "PENDING" | "ADMITTED" | "DISCHARGED";
    admittedAt: string | null;
    dischargedAt: string | null;
    admissionReason?: string | null;
    roomNo?: string | null;
    bedNo?: string | null;
    vitalsSummary?: unknown;
    assignedDoctor?: { id: string; fullName: string; email: string } | null;
  } | null;
  /** Set on GET /api/patients/:id/bookings responses. */
  visitRecord?: {
    id: string;
    admittedAt?: string | null;
    completedAt: string | null;
    remark?: string | null;
    diagnosticReports?: Array<{
      id: string;
      reportName: string;
      fileUrl: string;
      uploadedAt: string;
      uploadedBy: { id: string; fullName: string };
    }>;
    labSamples?: Array<{
      id: string;
      sampleType: string;
      collectedAt: string;
      labName: string | null;
      resultReportUrl: string | null;
      statusLookup: { id: string; lookupKey: string; lookupValue: string } | null;
    }>;
    /** Dispensed to patient during visit (from `DispensedMedicine`). */
    medicines?: Array<{
      id: string;
      quantity: number;
      medicine: { name: string };
      batch: { batchNo: string };
    }>;
  } | null;
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
