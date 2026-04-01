export type OutstandingVisitInvoiceRow = {
  id: string;
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  bookingId: string;
  bookingScheduledDate: string | null;
  patientId: string | null;
  patientName: string | null;
};
