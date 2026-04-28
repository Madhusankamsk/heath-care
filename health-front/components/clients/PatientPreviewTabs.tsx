"use client";

import { useMemo, useState, type ReactNode } from "react";

type TabId = "bookings" | "admissions";
type TabOption = { id: TabId; label: string };

type PatientPreviewTabsProps = {
  showBookings: boolean;
  showAdmissions: boolean;
  bookingsContent: ReactNode;
  admissionsContent: ReactNode;
};

export function PatientPreviewTabs({
  showBookings,
  showAdmissions,
  bookingsContent,
  admissionsContent,
}: PatientPreviewTabsProps) {
  const availableTabs = useMemo(
    () => {
      const tabs: Array<TabOption | null> = [
        showBookings ? ({ id: "bookings", label: "Bookings" } as const) : null,
        showAdmissions ? ({ id: "admissions", label: "Admissions" } as const) : null,
      ];
      return tabs.filter((tab): tab is TabOption => tab !== null);
    },
    [showAdmissions, showBookings],
  );
  const [activeTab, setActiveTab] = useState<TabId>("bookings");

  if (availableTabs.length === 0) return null;
  if (availableTabs.length === 1) {
    return <section>{availableTabs[0].id === "bookings" ? bookingsContent : admissionsContent}</section>;
  }

  const resolvedTab: TabId = availableTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : availableTabs[0].id;

  return (
    <section className="space-y-4">
      <div
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
        role="tablist"
        aria-label="Patient preview sections"
      >
        {availableTabs.map((tab) => {
          const isActive = resolvedTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`patient-preview-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`patient-preview-panel-${tab.id}`}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                isActive
                  ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
              ].join(" ")}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id="patient-preview-panel-bookings"
        role="tabpanel"
        aria-labelledby="patient-preview-tab-bookings"
        hidden={resolvedTab !== "bookings"}
      >
        {bookingsContent}
      </div>
      <div
        id="patient-preview-panel-admissions"
        role="tabpanel"
        aria-labelledby="patient-preview-tab-admissions"
        hidden={resolvedTab !== "admissions"}
      >
        {admissionsContent}
      </div>
    </section>
  );
}
