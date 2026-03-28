import { redirect } from "next/navigation";

export default function DispatchingPage() {
  redirect("/dashboard/dispatching/upcoming-jobs");
}
