import { redirect } from "next/navigation";

export default function PaymentsIndexPage() {
  redirect("/dashboard/payments/invoices");
}
