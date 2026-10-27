import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";
import { stepIndex, WIZARD_STEPS, type SetupStep, type WizardStep } from "@/lib/onboarding";

export function WizardFrame({
  step,
  furthest,
  title,
  description,
  children,
}: {
  step: WizardStep;
  // How far setup has got; steps up to here can be revisited.
  furthest: SetupStep;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const current = stepIndex(step);
  const reachable = stepIndex(furthest);

  return (
    <div>
      <nav aria-label="Setup progress" className="mb-10">
        <p className="mb-3 text-sm text-zinc-500">
          Step {current + 1} of {WIZARD_STEPS.length}
        </p>
        <ol className="flex gap-1.5">
          {WIZARD_STEPS.map((s, i) => {
            const state = i < current ? "done" : i === current ? "current" : "upcoming";
            const bar = (
              <span
                className={cx(
                  "block h-1.5 rounded-full",
                  state === "upcoming" ? "bg-zinc-200 dark:bg-zinc-800" : "bg-zinc-900 dark:bg-zinc-100",
                )}
              />
            );
            const label = (
              <span
                className={cx(
                  "mt-2 hidden text-xs sm:block",
                  state === "current" ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-500",
                )}
              >
                {s.label}
              </span>
            );
            return (
              <li key={s.key} className="flex-1" aria-current={state === "current" ? "step" : undefined}>
                {i !== current && i <= reachable ? (
                  <Link href={`/onboarding/${s.key}`} className="block hover:opacity-80">
                    {bar}
                    {label}
                  </Link>
                ) : (
                  <>
                    {bar}
                    {label}
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function BackLink({ to }: { to: WizardStep }) {
  return (
    <Link
      href={`/onboarding/${to}`}
      className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
    >
      Back
    </Link>
  );
}
