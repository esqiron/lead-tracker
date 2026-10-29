"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, cx, Input } from "@/components/ui";
import { DUE_CHOICES } from "../compose-sheet";
import { answerReview } from "./actions";

const LOST_REASONS = ["No reply", "Budget", "Went elsewhere", "Timing"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ""}`;
};

// One-tap close dates: two weeks out, end of this month, mid next quarter.
function dateChoices() {
  const now = new Date();
  const twoWeeks = new Date(now);
  twoWeeks.setDate(now.getDate() + 14);
  let endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (endOfMonth.getDate() - now.getDate() < 3) endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const nextQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 15);
  return [
    { key: "1", label: short(ymd(twoWeeks)), hint: "In two weeks", value: ymd(twoWeeks) },
    { key: "2", label: short(ymd(endOfMonth)), hint: "End of month", value: ymd(endOfMonth) },
    { key: "3", label: short(ymd(nextQuarter)), hint: "Next quarter", value: ymd(nextQuarter) },
  ];
}

const typing = (target: EventTarget | null) => target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);

export function ReviewDock({
  sessionId,
  leadId,
  closeDate,
  nextStepBody,
  nextTitle,
}: {
  sessionId: string;
  leadId: string;
  closeDate: string | null;
  nextStepBody: string | null;
  nextTitle: string | null;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState<"kept" | "pushed" | "lost" | null>(null);
  const [closeTo, setCloseTo] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [nextBody, setNextBody] = useState(nextStepBody ?? "");
  const [nextDue, setNextDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [choices] = useState(dateChoices);

  const save = (skip = false) => {
    setError(null);
    if (!skip && !answer) return setError("Pick K, P or L first: is it still on track?");
    if (!skip && answer === "pushed" && !closeTo) return setError("Pick the new close date.");
    startTransition(async () => {
      const result = await answerReview({
        sessionId,
        leadId,
        answer: skip ? "skipped" : answer!,
        closeTo,
        lostReason,
        // Only send a next step that's new or changed.
        next: !skip && answer !== "lost" && nextBody.trim() && (nextBody.trim() !== (nextStepBody ?? "") || nextDue) ? { body: nextBody, due: nextDue } : undefined,
      });
      if (result.error) setError(result.error);
      else if (result.path) router.push(result.path);
    });
  };

  // K/P/L answer, 1–3 pick a date, S skips, Enter saves, Esc pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return router.push("/inbox");
      if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        return save();
      }
      if (typing(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "k") setAnswer("kept");
      else if (key === "p") setAnswer("pushed");
      else if (key === "l") setAnswer("lost");
      else if (key === "s") save(true);
      else {
        const choice = choices.find((c) => c.key === key);
        if (choice) {
          setAnswer("pushed");
          setCloseTo(choice.value);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const option = (on: boolean, tone?: "lost") =>
    cx(
      "flex min-w-0 flex-1 items-start gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-colors",
      on
        ? tone === "lost"
          ? "bg-rose-50 ring-rose-300 dark:bg-rose-950/40 dark:ring-rose-800"
          : "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100"
        : "bg-white ring-hairline hover:ring-zinc-300 dark:bg-zinc-900",
    );
  const kbd = (k: string, on: boolean) => (
    <kbd className={cx("mt-0.5 rounded border px-1.5 text-[10px] uppercase", on ? "border-white/30 text-white/80 dark:border-zinc-900/30 dark:text-zinc-700" : "border-zinc-200 text-zinc-500 dark:border-zinc-700")}>{k}</kbd>
  );

  return (
    <section aria-label="Review this deal" className="border-t border-hairline bg-zinc-50/80 p-4 dark:bg-zinc-900/60">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Review this deal</h2>
        <span className="text-xs text-zinc-500">Three questions, then the next one</span>
      </div>
      {error ? (
        <div className="mb-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
          <p className="pt-2 text-sm font-medium">Still on track?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" aria-pressed={answer === "kept"} onClick={() => setAnswer("kept")} className={option(answer === "kept")}>
              {kbd("k", answer === "kept")}
              <span>
                <span className="block text-sm font-medium">Keep it</span>
                <span className={cx("block text-xs", answer === "kept" ? "opacity-70" : "text-zinc-500")}>Nothing changes.</span>
              </span>
            </button>
            <button type="button" aria-pressed={answer === "pushed"} onClick={() => setAnswer("pushed")} className={option(answer === "pushed")}>
              {kbd("p", answer === "pushed")}
              <span>
                <span className="block text-sm font-medium">Push the date</span>
                <span className={cx("block text-xs", answer === "pushed" ? "opacity-70" : "text-zinc-500")}>Still alive, just later.</span>
              </span>
            </button>
            <button type="button" aria-pressed={answer === "lost"} onClick={() => setAnswer("lost")} className={option(answer === "lost", "lost")}>
              {kbd("l", false)}
              <span>
                <span className="block text-sm font-medium text-rose-700 dark:text-rose-300">Mark lost…</span>
                <span className="block text-xs text-zinc-500">With a reason.</span>
              </span>
            </button>
          </div>
        </div>

        {answer === "lost" ? (
          <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
            <p className="text-sm font-medium">Why?</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {LOST_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={lostReason === r}
                  onClick={() => setLostReason(lostReason === r ? "" : r)}
                  className={cx("rounded-full px-3 py-1 text-xs", lostReason === r ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300")}
                >
                  {r}
                </button>
              ))}
              <Input aria-label="Lost reason" placeholder="Or type a reason" value={LOST_REASONS.includes(lostReason) ? "" : lostReason} onChange={(e) => setLostReason(e.target.value)} className="h-8 w-48 text-xs" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
              <p className="pt-2 text-sm font-medium">
                Close date
                <span className="block text-xs font-normal text-zinc-500">{closeDate ? `was ${short(closeDate)}` : "not set yet"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {choices.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={answer === "pushed" && closeTo === c.value}
                    onClick={() => {
                      setAnswer("pushed");
                      setCloseTo(c.value);
                    }}
                    className={cx(
                      "flex items-start gap-2 rounded-xl px-3 py-2 text-left ring-1",
                      answer === "pushed" && closeTo === c.value ? "bg-accent-soft ring-accent/50" : "bg-white ring-hairline hover:ring-zinc-300 dark:bg-zinc-900",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{c.label}</span>
                      <span className="block text-xs text-zinc-500">{c.hint}</span>
                    </span>
                    {kbd(c.key, false)}
                  </button>
                ))}
                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-hairline dark:bg-zinc-900">
                  <span className="text-zinc-500">Other</span>
                  <input
                    type="date"
                    aria-label="Pick a close date"
                    value={choices.some((c) => c.value === closeTo) ? "" : closeTo}
                    onChange={(e) => {
                      setAnswer("pushed");
                      setCloseTo(e.target.value);
                    }}
                    className="bg-transparent text-sm focus:outline-none"
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
              <p className="pt-2 text-sm font-medium">
                Next step
                <span className="block text-xs font-normal text-zinc-500">who, what, by when</span>
              </p>
              <div className="space-y-1.5">
                <Input aria-label="Next step" placeholder="e.g. Call and ask straight out if the project is still on" value={nextBody} onChange={(e) => setNextBody(e.target.value)} />
                <div className="flex flex-wrap items-center gap-1.5">
                  {DUE_CHOICES.map((c) => {
                    const v = c.value();
                    return (
                      <button
                        key={c.label}
                        type="button"
                        aria-pressed={nextDue === v}
                        onClick={() => setNextDue(nextDue === v ? "" : v)}
                        className={cx("rounded-full px-2.5 py-1 text-xs", nextDue === v ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300")}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                  {nextStepBody && nextBody.trim() !== nextStepBody ? <span className="text-xs text-zinc-400">Replaces “{nextStepBody}”</span> : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <p className="hidden flex-1 text-xs text-zinc-500 md:block">
          <kbd>K</kbd> <kbd>P</kbd> <kbd>L</kbd> answer · <kbd>1</kbd>–<kbd>3</kbd> pick a date · <kbd>↵</kbd> save and next · <kbd>S</kbd> skip · <kbd>Esc</kbd> pause
        </p>
        <Button type="button" variant="secondary" onClick={() => save(true)} disabled={pending} className="h-9">
          Skip
        </Button>
        <Button type="button" onClick={() => save()} disabled={pending} className="h-9">
          {pending ? "Saving…" : nextTitle ? `Save, next: ${nextTitle}` : "Save and finish"}
        </Button>
      </div>
    </section>
  );
}
