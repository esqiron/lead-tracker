import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { buttonClass, cx } from "@/components/ui";
import { requireReadyOrg } from "@/lib/auth";
import { getMembers } from "@/lib/crm";
import { formatDate, formatDateTime, formatDay, formatMoney } from "@/lib/format";
import { getSession, WEEKDAYS } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";
import { finishReview } from "../../actions";

export const metadata: Metadata = { title: "Review done" };

async function ReviewDone({ params }: PageProps<"/inbox/review/[sessionId]/done">) {
  const { org, user } = await requireReadyOrg();
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) notFound();
  const state = await getSession(org.id, sessionId);
  if (!state) notFound();
  const { session, answered } = state;

  if (!session.completed_at) {
    // Opened before finishing (e.g. from history): offer to finish here.
    if (session.user_id !== user.id) notFound();
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">This review isn&apos;t finished yet</h1>
        <p className="text-zinc-500">Finishing confirms the deals you didn&apos;t open as they are.</p>
        <div className="flex justify-center gap-2">
          <Link href="/inbox/review" className={buttonClass("secondary")}>
            Keep reviewing
          </Link>
          <form action={finishReview}>
            <input type="hidden" name="session_id" value={sessionId} />
            <button type="submit" className={buttonClass("primary")}>
              Finish the review
            </button>
          </form>
        </div>
      </div>
    );
  }

  const ids = [...answered.keys()];
  const taskIds = [...answered.values()].map((a) => a.nextTaskId).filter(Boolean) as string[];
  const supabase = await createClient();
  const [{ data: leads }, { data: tasks }, members] = await Promise.all([
    ids.length ? supabase.from("leads").select("id, title, value, currency").in("id", ids) : Promise.resolve({ data: [] }),
    taskIds.length ? supabase.from("activities").select("id, body, due_at, assigned_to, lead_id").in("id", taskIds) : Promise.resolve({ data: [] }),
    getMembers(org.id),
  ]);
  const lead = new Map((leads ?? []).map((l) => [l.id, l]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const all = [...answered.values()];
  const changed = all.filter((a) => a.answer === "pushed" || a.answer === "lost" || (a.answer === "kept" && a.nextTaskId));
  const kept = all.filter((a) => a.answer === "kept" && !a.nextTaskId);
  const skipped = all.filter((a) => a.answer === "skipped");
  const before = Number(session.forecast_before);
  const after = Number(session.forecast_after ?? 0);
  const delta = after - before;
  const counts = [
    { n: all.filter((a) => a.answer === "pushed").length, label: "date pushed" },
    { n: all.filter((a) => a.answer === "lost").length, label: "lost" },
    { n: (tasks ?? []).length, label: "next step set" },
    { n: kept.length, label: "kept as is" },
    { n: skipped.length, label: "skipped" },
  ].filter((c) => c.n);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-zinc-400 uppercase">Weekly review · {formatDate(session.completed_at, org)}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.035em]">
          {all.length === session.lead_count ? `All ${all.length} deals checked.` : `${all.length} deals checked.`}
        </h1>
        <p className="mt-2 max-w-prose text-zinc-600 dark:text-zinc-400">
          {changed.length
            ? `${changed.length} changed${(tasks ?? []).length ? ` and ${(tasks ?? []).length} next step${(tasks ?? []).length === 1 ? "" : "s"} went out to their owners` : ""}. The forecast now counts only what you said is real.`
            : "Nothing needed changing. The forecast stands."}
        </p>
        <p className="mt-3 flex flex-wrap gap-1.5">
          {counts.map((c) => (
            <span key={c.label} className="rounded-full bg-white px-3 py-1 text-xs ring-1 ring-hairline dark:bg-zinc-900">
              {c.n} {c.label}
            </span>
          ))}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-hairline dark:bg-zinc-900">
          <h2 className="mb-3 font-display text-lg font-semibold">What changed</h2>
          {changed.length ? (
            <ul className="divide-y divide-hairline">
              {changed.map((a) => {
                const l = lead.get(a.leadId);
                return (
                  <li key={a.leadId} className="flex items-start gap-3 py-2.5">
                    <span
                      aria-hidden
                      className={cx(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs",
                        a.answer === "lost" ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : a.answer === "pushed" ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-accent-soft text-accent-ink",
                      )}
                    >
                      {a.answer === "lost" ? "✕" : a.answer === "pushed" ? "→" : "✓"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l?.title ?? "A deal"}</p>
                      <p className="text-xs text-zinc-500">
                        {a.answer === "lost"
                          ? `Marked lost${a.lostReason ? ` · ${a.lostReason}` : ""}`
                          : a.answer === "pushed"
                            ? `Close date → ${formatDay(a.closeTo, org)}`
                            : "Still on track, with a new next step"}
                      </p>
                    </div>
                    {l ? <span className="text-sm tabular-nums">{formatMoney(l.value, l.currency ?? org.currency)}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No deal changed.</p>
          )}
          {kept.length ? (
            <p className="mt-3 rounded-2xl bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
              <b className="font-medium text-zinc-800 dark:text-zinc-200">{kept.length} kept as they are:</b> {kept.map((a) => lead.get(a.leadId)?.title).filter(Boolean).join(", ")}.
            </p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-hairline dark:bg-zinc-900">
          <h2 className="font-display text-lg font-semibold">Forecast</h2>
          <p className="text-xs text-zinc-500">Weighted by stage probability</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60">
              <p className="text-xs text-zinc-500">Before</p>
              <p className="font-display text-xl font-semibold tabular-nums">{formatMoney(before, org.currency)}</p>
            </div>
            <div className="rounded-2xl bg-accent-soft px-3 py-2.5 text-accent-ink">
              <p className="text-xs">After</p>
              <p className="font-display text-xl font-semibold tabular-nums">{formatMoney(after, org.currency)}</p>
            </div>
          </div>
          <p className={cx("text-sm", delta < 0 ? "text-rose-700 dark:text-rose-300" : delta > 0 ? "text-accent-ink" : "text-zinc-500")}>
            {delta === 0 ? "No change." : `${delta > 0 ? "+" : "−"}${formatMoney(Math.abs(delta), org.currency)}`}
          </p>
        </section>
      </div>

      {(tasks ?? []).length ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-hairline dark:bg-zinc-900">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Next steps it set</h2>
            <span className="text-xs text-zinc-500">in each owner&apos;s inbox</span>
          </div>
          <ul className="divide-y divide-hairline">
            {(tasks ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="min-w-0 flex-1">{t.body}</span>
                <span className="text-xs text-zinc-500">{t.lead_id ? lead.get(t.lead_id)?.title : ""}</span>
                <span className="text-xs text-zinc-500">{t.assigned_to ? memberName.get(t.assigned_to) : ""}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{t.due_at ? formatDateTime(t.due_at, org) : "No date"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Next review: {WEEKDAYS[org.review_day]}, same time every week.</p>
        <Link href="/inbox" className={buttonClass("primary")}>
          Back to the inbox
        </Link>
      </div>
    </div>
  );
}

export default function Page(props: PageProps<"/inbox/review/[sessionId]/done">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReviewDone {...props} />
    </Suspense>
  );
}
