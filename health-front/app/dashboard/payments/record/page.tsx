import { redirect } from "next/navigation";

/** Old URL; invoices live under /dashboard/payments/invoices */
export default function LegacyPaymentsRecordRedirect() {
  redirect("/dashboard/payments/invoices");
}
