import { redirect } from "next/navigation";

export default function VisitInvoicesPage() {
  redirect("/dashboard/payments/invoices");
}
