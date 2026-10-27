import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { requireOnboarding } from "@/lib/auth";
import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { finishSetup } from "../actions";
import { BackLink, WizardFrame } from "../wizard-frame";

export const metadata: Metadata = { title: "Get started" };

const OPTIONS = [
  {
    mode: "sample",
    title: "Explore with sample data",
    description: "Adds a handful of example companies, contacts and leads across your pipeline. Remove them with one click from the dashboard.",
    cta: "Load sample data",
    variant: "primary" as const,
  },
  {
    mode: "csv",
    title: "Import a CSV",
    description: "Bring in contacts and leads from a spreadsheet or another CRM. You'll map the columns before anything is imported.",
    cta: "Import from CSV",
    variant: "secondary" as const,
  },
  {
    mode: "empty",
    title: "Start with a clean slate",
    description: "Jump straight in and add your first leads yourself.",
    cta: "Start empty",
    variant: "secondary" as const,
  },
];

async function ImportStepContent() {
  const { org } = await requireOnboarding("import");

  return (
    <WizardFrame
      step="import"
      furthest={org!.setup_step}
      title="You're almost done"
      description="Choose how you'd like to start. You can always import or add more later."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <Card key={option.mode} className="flex flex-col p-5">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{option.title}</h2>
            <p className="mt-1 flex-1 text-sm text-zinc-600 dark:text-zinc-400">{option.description}</p>
            <form action={finishSetup} className="mt-5">
              <input type="hidden" name="mode" value={option.mode} />
              <SubmitButton variant={option.variant} className="w-full" pendingLabel="Finishing…">
                {option.cta}
              </SubmitButton>
            </form>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <BackLink to="team" />
      </div>
    </WizardFrame>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ImportStep() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ImportStepContent />
    </Suspense>
  );
}
