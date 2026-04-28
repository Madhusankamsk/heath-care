export type LookupLite = { id: string; lookupKey: string; lookupValue: string };

export type NursingAdmissionRow = {
  id: string;
  admittedAt: string;
  dischargedAt: string | null;
  siteLabel: string | null;
  statusLookup: LookupLite;
  patient: {
    id: string;
    fullName: string;
    contactNo?: string | null;
    nicOrPassport?: string | null;
  };
  dailyNotes: Array<{ id: string; recordedAt: string; note: string }>;
};
