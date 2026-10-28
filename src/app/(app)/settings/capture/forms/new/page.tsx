import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { requireSettingsAdmin } from "@/lib/auth";
import { DEFAULT_FIELD_LABELS } from "@/lib/capture-fields";
import { getMembers, getSources, getStages } from "@/lib/crm";
import { saveCaptureForm } from "../../actions";
import { SettingsSection } from "../../../settings-section";
import { CaptureFormEditor } from "../form-editor";

export const metadata: Metadata = { title: "New form" };

async function NewFormContent() {
  const { org } = await requireSettingsAdmin();
  const [stages, sources, members] = await Promise.all([getStages(org.id), getSources(org.id), getMembers(org.id)]);
  const website = sources.find((s) => s.name.toLowerCase() === "website");

  return (
    <SettingsSection title="New form" description="Pick the fields, where leads go, and who gets them. You'll get the embed code after saving.">
      <CaptureFormEditor
        action={saveCaptureForm.bind(null, null)}
        initial={{
          name: "Contact form",
          fields: [
            { key: "first_name", label: DEFAULT_FIELD_LABELS.first_name, required: true },
            { key: "last_name", label: DEFAULT_FIELD_LABELS.last_name, required: false },
            { key: "email", label: DEFAULT_FIELD_LABELS.email, required: true },
            { key: "company", label: DEFAULT_FIELD_LABELS.company, required: false },
            { key: "message", label: DEFAULT_FIELD_LABELS.message, required: false },
          ],
          default_stage_id: "",
          default_source_id: website?.id ?? "",
          owner_mode: "org_owner",
          default_owner_id: "",
          consent_text: "",
          redirect_url: "",
          allowed_origins: "",
          notify_owner: true,
          is_active: true,
        }}
        stages={stages.filter((s) => !s.is_won && !s.is_lost)}
        sources={sources}
        members={members}
        submitLabel="Create form"
      />
    </SettingsSection>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function NewFormPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <NewFormContent />
    </Suspense>
  );
}
