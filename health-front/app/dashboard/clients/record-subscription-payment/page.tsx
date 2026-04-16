import { redirect } from "next/navigation";

export default function LegacyRecordSubscriptionPaymentPage() {
  redirect("/dashboard/payments/invoices");
}
