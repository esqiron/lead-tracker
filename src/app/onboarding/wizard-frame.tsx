import Link from "next/link";
import type { ReactNode } from "react";
import { Bezel, Eyebrow, cx } from "@/components/ui";
import { stepIndex, WIZARD_STEPS, type SetupStep, type WizardStep } from "@/lib/onboarding";

export function WizardFrame({
  step,
  furthest,
  title,
  description,
  bare,
  children,
}: {
  step: WizardStep;
  // How far setup has got; steps up to here can be revisited.
  furthest: SetupStep;
  title: string;
  description: string;
  // For steps that lay out their own cards.
  bare?: boolean;
  children: ReactNode;
}) {
  const current = stepIndex(step);
  const reachable = stepIndex(furthest);

  return (
    <div>
      <nav aria-label="Setup progress" className="flex justify-center">
        <ol className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-white/70 p-1 shadow-[0_10px_30px_-12px_rgba(16,24,40,0.18)] ring-1 ring-hairline backdrop-blur dark:bg-zinc-900/70">
          {WIZARD_STEPS.map((s, i) => {
            const state = i < current ? "done" : i === current ? "current" : "upcoming";
            const content = (
              <>
                <span
                  aria-hidden
                  className={cx(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                    state === "current" && "bg-white/15 dark:bg-zinc-900/10",
                    state === "done" && "bg-accent-soft text-accent-ink",
                    state === "upcoming" && "ring-1 ring-zinc-300 ring-inset dark:ring-zinc-700",
                  )}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 20 20" className="size-3.5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
                      <path d="M5 10.5l3.2 3L15 6.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={cx(state !== "current" && "sr-only sm:not-sr-only")}>{s.label}</span>
              </>
            );
            const chip = cx(
              "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 ease-studio sm:px-3",
              state === "current" &&
                "bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_10px_-4px_rgba(16,24,40,0.45)] dark:bg-zinc-100 dark:text-zinc-900",
              state === "done" && "text-zinc-600 dark:text-zinc-300",
              state === "upcoming" && "text-zinc-400 dark:text-zinc-500",
            );
            return (
              <li key={s.key} aria-current={state === "current" ? "step" : undefined}>
                {i !== current && i <= reachable ? (
                  <Link href={`/onboarding/${s.key}`} className={cx(chip, "hover:bg-white dark:hover:bg-zinc-800")}>
                    {content}
                  </Link>
                ) : (
                  <span className={chip}>{content}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-10 text-center">
        <Eyebrow>
          Step {current + 1} of {WIZARD_STEPS.length}
        </Eyebrow>
        <h1 className="mt-4 font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-zinc-900 sm:text-[2.5rem] dark:text-zinc-100">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-pretty text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {bare ? (
        <div className="mt-10">{children}</div>
      ) : (
        <Bezel className="mt-8 sm:mt-10" innerClassName="p-3.5 sm:p-8">
          {children}
        </Bezel>
      )}
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
