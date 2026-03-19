import { Card } from "@/components/ui/Card";
import {
  CompanySettingsForm,
  type CompanySettingsDto,
} from "@/components/forms/CompanySettingsForm";
import { backendJson } from "@/lib/backend";

export default async function CompanySetupPage() {
  const settings = await backendJson<CompanySettingsDto>("/api/company-settings");
  return (
    <div className="flex flex-col gap-6">
      <Card title="Company settings" description="Super Admin only.">
        {settings === null ? (
          <div className="text-sm text-[var(--text-secondary)]">
            No company settings found yet.
          </div>
        ) : (
          <CompanySettingsForm initialSettings={settings} />
        )}
      </Card>
    </div>
  );
}

