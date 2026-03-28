import { redirect } from "next/navigation";

export default function LegacyClientsPaymentsIndexPage() {
  redirect("/dashboard/payments/record");
}
