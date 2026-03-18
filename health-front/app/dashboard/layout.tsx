import { DashboardChrome } from "@/components/layout/DashboardChrome";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DashboardChrome>{children}</DashboardChrome>;
}

