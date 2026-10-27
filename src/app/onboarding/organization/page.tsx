import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { requireOnboarding } from "@/lib/auth";
import { WizardFrame } from "../wizard-frame";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Organization" };

async function OrganizationStepContent() {
  const { org } = await requireOnboarding("organization");
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];

  return (
    <WizardFrame
      step="organization"
      furthest={org?.setup_step ?? "organization"}
      title="Set up your organization"
      description="This is the workspace your team shares. You can change any of this later in settings."
    >
      <OrganizationForm
        timezones={timezones}
        initial={
          org
            ? { name: org.name, currency: org.currency, timezone: org.timezone, dateFormat: org.date_format }
            : undefined
        }
      />
    </WizardFrame>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function OrganizationStep() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <OrganizationStepContent />
    </Suspense>
  );
}
