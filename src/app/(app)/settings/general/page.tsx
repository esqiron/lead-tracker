import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { requireSettingsAdmin } from "@/lib/auth";
import { timezones } from "@/lib/org-options";
import { SettingsSection } from "../settings-section";
import { DeleteOrganizationCard, OrgSettingsForm, RetentionForm } from "./org-settings-form";
import { buttonClass } from "@/components/ui";

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
      <SettingsSection
        title="Data retention"
        description="Delete personal data you no longer need (GDPR storage limitation). Checked daily; off until you pick a period."
      >
        <RetentionForm initial={{ contacts: org.retention_months, audit: org.audit_retention_months }} />
      </SettingsSection>
      {role === "owner" ? (
        <SettingsSection
          title="Export all data"
          description="Download everything this organization holds as one JSON file: contacts, leads, activity, settings, members and the audit log. Secrets are left out."
        >
          <a href="/settings/general/export" download className={buttonClass("secondary")}>
            Download export
          </a>
        </SettingsSection>
      ) : null}
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
