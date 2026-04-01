import { redirect } from "next/navigation";

/** Old URL; member subscription payments live under /dashboard/payments/member */
export default function LegacyPaymentsRecordRedirect() {
  redirect("/dashboard/payments/member");
}
