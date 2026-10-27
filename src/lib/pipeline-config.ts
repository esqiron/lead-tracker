import "server-only";
import { createClient } from "@/lib/supabase/server";

// Validation + save for the pipeline and lead source editors, shared by the
// setup wizard and Settings. Each returns an error message, or null on success.

type StageInput = { id?: string; name: string; probability: number; kind: "open" | "won" | "lost" };

export async function savePipelineStages(orgId: string, raw: string): Promise<string | null> {
  let stages: StageInput[];
  try {
    stages = JSON.parse(raw);
  } catch {
    return "Something went wrong reading the stages. Reload and try again.";
  }

  const names = new Set<string>();
  for (const stage of stages) {
    const name = stage.name?.trim();
    if (!name) return "Every stage needs a name.";
    if (name.length > 60) return `"${name.slice(0, 20)}…" is too long. Keep stage names under 60 characters.`;
    if (names.has(name.toLowerCase())) return `There are two stages called "${name}".`;
    names.add(name.toLowerCase());
    if (!(stage.probability >= 0 && stage.probability <= 100)) {
      return `Win probability for "${name}" must be between 0 and 100.`;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_pipeline_stages", { p_org: orgId, p_stages: stages });
  return error?.message ?? null;
}

export async function saveLeadSources(orgId: string, raw: string): Promise<string | null> {
  let sources: { id?: string; name: string }[];
  try {
    sources = JSON.parse(raw);
  } catch {
    return "Something went wrong reading the sources. Reload and try again.";
  }

  const names = new Set<string>();
  for (const source of sources) {
    const name = source.name?.trim();
    if (!name) return "Every source needs a name.";
    if (name.length > 60) return "Keep source names under 60 characters.";
    if (names.has(name.toLowerCase())) return `"${name}" is listed twice.`;
    names.add(name.toLowerCase());
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_lead_sources", { p_org: orgId, p_sources: sources });
  return error?.message ?? null;
}
