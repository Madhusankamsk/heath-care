"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CheckboxBase } from "@/components/ui/checkbox-base";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";

export type CompanySettingsDto = {
  id: string;
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  currencyCode: string | null;
  travelCostPerKm: string | number | null;
  taxPercentage: string | number | null;
  invoicePrefix: string | null;
  isSetupCompleted: boolean;
  updatedAt: string;
} | null;

type FormState = {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  currencyCode: string;
  travelCostPerKm: string;
  taxPercentage: string;
  invoicePrefix: string;
  isSetupCompleted: boolean;
};

function fromSettings(settings: CompanySettingsDto): FormState {
  return {
    companyName: settings?.companyName ?? "",
    companyEmail: settings?.companyEmail ?? "",
    companyPhone: settings?.companyPhone ?? "",
    companyAddress: settings?.companyAddress ?? "",
    logoUrl: settings?.logoUrl ?? "",
    primaryColor: settings?.primaryColor ?? "",
    secondaryColor: settings?.secondaryColor ?? "",
    currencyCode: settings?.currencyCode ?? "",
    travelCostPerKm: settings?.travelCostPerKm?.toString?.() ?? "",
    taxPercentage: settings?.taxPercentage?.toString?.() ?? "",
    invoicePrefix: settings?.invoicePrefix ?? "INV-",
    isSetupCompleted: settings?.isSetupCompleted ?? false,
  };
}

export function CompanySettingsForm({
  initialSettings,
}: Readonly<{ initialSettings: CompanySettingsDto }>) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [form, setForm] = useState<FormState>(() => fromSettings(initialSettings));

  const validationError = useMemo(() => {
    if (!form.companyName.trim()) return "Company name is required.";
    return null;
  }, [form.companyName]);

  function applyBrandingFromForm() {
    const primary = form.primaryColor.trim();
    const secondary = form.secondaryColor.trim();
    if (primary.startsWith("#") && (primary.length === 4 || primary.length === 7)) {
      document.documentElement.style.setProperty("--brand-primary", primary);
    }
    if (
      secondary.startsWith("#") &&
      (secondary.length === 4 || secondary.length === 7)
    ) {
      document.documentElement.style.setProperty("--brand-secondary", secondary);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveOk(false);
    setSaveError(null);
    if (validationError) return;

    setIsSaving(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        companyEmail: form.companyEmail.trim() || null,
        companyPhone: form.companyPhone.trim() || null,
        companyAddress: form.companyAddress.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        primaryColor: form.primaryColor.trim() || null,
        secondaryColor: form.secondaryColor.trim() || null,
        currencyCode: form.currencyCode.trim() || null,
        travelCostPerKm: form.travelCostPerKm.trim() || null,
        taxPercentage: form.taxPercentage.trim() || null,
        invoicePrefix: form.invoicePrefix.trim() || null,
        isSetupCompleted: form.isSetupCompleted,
      };

      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Failed to save company settings.");
      }

      setSaveOk(true);
      applyBrandingFromForm();
      toast.success("Company settings saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  const primaryPickerValue =
    form.primaryColor.trim().startsWith("#") && form.primaryColor.trim().length === 7
      ? form.primaryColor.trim()
      : "#000000";
  const secondaryPickerValue =
    form.secondaryColor.trim().startsWith("#") &&
    form.secondaryColor.trim().length === 7
      ? form.secondaryColor.trim()
      : "#000000";

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSave}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Company name"
          name="companyName"
          value={form.companyName}
          onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
          errorMessage={validationError ?? undefined}
        />
        <Input
          label="Company email"
          name="companyEmail"
          type="email"
          value={form.companyEmail}
          onChange={(e) =>
            setForm((p) => ({ ...p, companyEmail: e.target.value }))
          }
        />
        <Input
          label="Company phone"
          name="companyPhone"
          value={form.companyPhone}
          onChange={(e) =>
            setForm((p) => ({ ...p, companyPhone: e.target.value }))
          }
        />
        <Input
          label="Company address"
          name="companyAddress"
          value={form.companyAddress}
          onChange={(e) =>
            setForm((p) => ({ ...p, companyAddress: e.target.value }))
          }
        />
        <Input
          label="Logo URL"
          name="logoUrl"
          placeholder="https://..."
          value={form.logoUrl}
          onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
        />
        <Input
          label="Currency code"
          name="currencyCode"
          placeholder="LKR"
          value={form.currencyCode}
          onChange={(e) =>
            setForm((p) => ({ ...p, currencyCode: e.target.value }))
          }
        />
        <div className="grid gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Primary color
          </span>
          <div className="flex items-center gap-3">
            <input
              aria-label="Primary color picker"
              type="color"
              value={primaryPickerValue}
              onChange={(e) =>
                setForm((p) => ({ ...p, primaryColor: e.target.value }))
              }
              className="h-11 w-11 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <div className="flex-1">
              <Input
                label="Primary color (hex)"
                name="primaryColor"
                placeholder="#3498db"
                value={form.primaryColor}
                onChange={(e) =>
                  setForm((p) => ({ ...p, primaryColor: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Secondary color
          </span>
          <div className="flex items-center gap-3">
            <input
              aria-label="Secondary color picker"
              type="color"
              value={secondaryPickerValue}
              onChange={(e) =>
                setForm((p) => ({ ...p, secondaryColor: e.target.value }))
              }
              className="h-11 w-11 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <div className="flex-1">
              <Input
                label="Secondary color (hex)"
                name="secondaryColor"
                placeholder="#2ecc71"
                value={form.secondaryColor}
                onChange={(e) =>
                  setForm((p) => ({ ...p, secondaryColor: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <Input
          label="Travel cost per km"
          name="travelCostPerKm"
          type="number"
          step="0.01"
          value={form.travelCostPerKm}
          onChange={(e) =>
            setForm((p) => ({ ...p, travelCostPerKm: e.target.value }))
          }
        />
        <Input
          label="Tax percentage"
          name="taxPercentage"
          type="number"
          step="0.01"
          value={form.taxPercentage}
          onChange={(e) =>
            setForm((p) => ({ ...p, taxPercentage: e.target.value }))
          }
        />
        <Input
          label="Invoice prefix"
          name="invoicePrefix"
          placeholder="INV-"
          value={form.invoicePrefix}
          onChange={(e) =>
            setForm((p) => ({ ...p, invoicePrefix: e.target.value }))
          }
        />
        <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <CheckboxBase
            checked={form.isSetupCompleted}
            onChange={(e) =>
              setForm((p) => ({ ...p, isSetupCompleted: e.target.checked }))
            }
          />
          Setup completed
        </label>
      </div>

      {saveError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {saveError}
        </div>
      ) : saveOk ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Saved.
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={Boolean(validationError)}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

