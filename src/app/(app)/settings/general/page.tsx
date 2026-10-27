import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { requireSettingsAdmin } from "@/lib/auth";
import { timezones } from "@/lib/org-options";
import { SettingsSection } from "../settings-section";
import { DeleteOrganizationCard, OrgSettingsForm } from "./org-settings-form";

export const metadata: Metadata = { title: "Organization settings" };

async function GeneralSettingsContent() {
  const { org, role } = await requireSettingsAdmin();

  return (
    <div className="space-y-10">
      <SettingsSection title="Organization" description="Name, defaults for money and dates, and who can see what.">
        <OrgSettingsForm
          timezones={timezones()}
          initial={{
            name: org.name,
            currency: org.currency,
            timezone: org.timezone,
            dateFormat: org.date_format,
            leadVisibility: org.lead_visibility,
          }}
        />
      </SettingsSection>
      {role === "owner" ? <DeleteOrganizationCard orgName={org.name} /> : null}
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function GeneralSettingsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <GeneralSettingsContent />
    </Suspense>
  );
}
