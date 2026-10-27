import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { requireOnboarding } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PipelineEditor, type EditableStage } from "@/components/pipeline-editor";
import { savePipeline } from "../actions";
import { BackLink, WizardFrame } from "../wizard-frame";

export const metadata: Metadata = { title: "Pipeline" };

async function PipelineStepContent() {
  const { org } = await requireOnboarding("pipeline");
  const supabase = await createClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id, name, probability, is_won, is_lost")
    .eq("org_id", org!.id)
    .order("position");

  const stages: EditableStage[] = (data ?? []).map((s) => ({
    key: s.id,
    id: s.id,
    name: s.name,
    probability: s.probability,
    kind: s.is_won ? "won" : s.is_lost ? "lost" : "open",
  }));

  return (
    <WizardFrame
      step="pipeline"
      furthest={org!.setup_step}
      title="Your sales pipeline"
      description="These are the stages a lead moves through. We've started you with a common setup — rename, reorder or remove stages to match how you sell."
    >
      <PipelineEditor initial={stages} action={savePipeline} back={<BackLink to="organization" />} submitLabel="Continue" />
    </WizardFrame>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function PipelineStep() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PipelineStepContent />
    </Suspense>
  );
}
