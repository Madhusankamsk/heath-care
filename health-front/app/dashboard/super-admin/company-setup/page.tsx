import { Card } from "@/components/Card";

export default function CompanySetupPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Company Setup</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure tenant/company details (placeholder).
        </p>
      </header>

      <Card
        title="Coming next"
        description="We can wire this to backend tables once you define the company model."
      >
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          Typical fields:
          <ul className="mt-2 list-disc pl-5">
            <li>Company name</li>
            <li>Address</li>
            <li>Contact email/phone</li>
            <li>Branding (logo/colors)</li>
            <li>Business rules (fees, tax, etc.)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

