import { redirect } from "next/navigation";

export default function LegacyClientsPaymentsRecordPage() {
  redirect("/dashboard/payments/invoices");
}
