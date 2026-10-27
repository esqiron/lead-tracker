import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { PipelineEditor } from "@/components/pipeline-editor";
import { requireSettingsAdmin } from "@/lib/auth";
import { getStages } from "@/lib/crm";
import { updatePipeline } from "../actions";
import { SettingsSection } from "../settings-section";

export const metadata: Metadata = { title: "Pipeline settings" };

async function PipelineSettingsContent() {
  const { org } = await requireSettingsAdmin();
  const stages = await getStages(org.id);

  return (
    <SettingsSection
      title="Pipeline"
      description="Rename, reorder or add stages. A stage can only be removed once no leads are in it; win chance drives the weighted pipeline on the dashboard."
    >
      <PipelineEditor
        initial={stages.map((s) => ({
          key: s.id,
          id: s.id,
          name: s.name,
          probability: s.probability,
          kind: s.is_won ? "won" : s.is_lost ? "lost" : "open",
        }))}
        action={updatePipeline}
        submitLabel="Save pipeline"
      />
    </SettingsSection>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function PipelineSettingsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PipelineSettingsContent />
    </Suspense>
  );
}
