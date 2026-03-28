import { redirect } from "next/navigation";

export default function LegacyClientsPaymentsAccountsPage() {
  redirect("/dashboard/payments/accounts");
}
