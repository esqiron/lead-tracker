import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { SourcesEditor } from "@/components/sources-editor";
import { requireSettingsAdmin } from "@/lib/auth";
import { getSources } from "@/lib/crm";
import { updateSources } from "../actions";
import { SettingsSection } from "../settings-section";

export const metadata: Metadata = { title: "Lead source settings" };

async function SourcesSettingsContent() {
  const { org } = await requireSettingsAdmin();
  const sources = await getSources(org.id);

  return (
    <SettingsSection title="Lead sources" description="Where leads come from. Removing a source keeps its leads; they just lose the source.">
      <SourcesEditor initial={sources.map((s) => ({ key: s.id, id: s.id, name: s.name }))} action={updateSources} submitLabel="Save sources" />
    </SettingsSection>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function SourcesSettingsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SourcesSettingsContent />
    </Suspense>
  );
}
