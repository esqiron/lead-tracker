import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { requireOnboarding } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WizardFrame } from "../wizard-frame";
import { SourcesEditor } from "./sources-editor";

export const metadata: Metadata = { title: "Lead sources" };

async function SourcesStepContent() {
  const { org } = await requireOnboarding("sources");
  const supabase = await createClient();
  const { data } = await supabase.from("lead_sources").select("id, name").eq("org_id", org!.id).order("position");

  return (
    <WizardFrame
      step="sources"
      furthest={org!.setup_step}
      title="Where do your leads come from?"
      description="Tag each lead with a source so reports can show which channels bring in the most business."
    >
      <SourcesEditor initial={(data ?? []).map((s) => ({ key: s.id, id: s.id, name: s.name }))} />
    </WizardFrame>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function SourcesStep() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SourcesStepContent />
    </Suspense>
  );
}
