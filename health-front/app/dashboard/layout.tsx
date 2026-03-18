import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="sticky top-0 z-50">
        <Header />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
      </main>

      <div className="sticky bottom-0 z-50">
        <Footer />
      </div>
    </div>
  );
}

