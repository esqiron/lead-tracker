import type { Database } from "@/lib/database.types";

export type SetupStep = Database["public"]["Enums"]["setup_step"];
export type WizardStep = Exclude<SetupStep, "done">;

export const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: "organization", label: "Organization" },
  { key: "pipeline", label: "Pipeline" },
  { key: "sources", label: "Lead sources" },
  { key: "team", label: "Team" },
  { key: "import", label: "Get started" },
];

const ORDER: SetupStep[] = ["organization", "pipeline", "sources", "team", "import", "done"];

export function stepIndex(step: SetupStep) {
  return ORDER.indexOf(step);
}

export function nextStep(step: WizardStep): SetupStep {
  return ORDER[stepIndex(step) + 1];
}

// The step a returning admin should resume at.
export function resumeStep(step: SetupStep): WizardStep {
  return step === "done" ? "import" : step;
}
