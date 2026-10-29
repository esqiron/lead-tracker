import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { cx } from "@/components/ui";
import { getTimeline } from "@/lib/activities";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/crm";
import { formatDay, formatMoney } from "@/lib/format";
import { getThread } from "@/lib/inbox";
import { getCandidates, getSession, REVIEW_REASONS, weighted, type Answered, type ReviewScope } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";
import { ThreadView } from "../../../thread-view";
import { finishReview } from "../../actions";
import { ReviewDock } from "../../review-dock";

export const metadata: Metadata = { title: "Weekly review" };

const isUuid = (value: string) => /^[0-9a-f-]{36}$/.test(value);

function answerLabel(a: Answered, org: { date_format: string; timezone: string }) {
  if (a.answer === "pushed") return `Pushed to ${formatDay(a.closeTo, org)}`;
  if (a.answer === "lost") return `Lost${a.lostReason ? ` · ${a.lostReason}` : ""}`;
  if (a.answer === "skipped") return "Skipped";
  return a.nextTaskId ? "Kept · new next step" : "Kept";
}

async function ReviewDeal({ params }: PageProps<"/inbox/review/[sessionId]/[leadId]">) {
  const ctx = await requireReadyOrg();
  const { org, user } = ctx;
  const { sessionId, leadId } = await params;
  if (!isUuid(sessionId) || !isUuid(leadId)) notFound();
  if (!canEditRole(ctx.role)) redirect("/inbox");

  const state = await getSession(org.id, sessionId);
  if (!state || state.session.user_id !== user.id) notFound();
  if (state.session.completed_at) redirect(`/inbox/review/${sessionId}/done`);

  const scope = state.session.scope as ReviewScope;
  const [candidates, thread, timeline, stages, members] = await Promise.all([
    getCandidates(org.id, scope),
    getThread(org.id, leadId),
    getTimeline(org.id, { leadIds: [leadId] }),
    getStages(org.id),
    getMembers(org.id),
  ]);
  if (!thread) notFound();

  // Deals answered so far (some may be closed now), then the ones still to look at.
  const answeredIds = [...state.answered.keys()];
  const supabase = await createClient();
  const { data: answeredLeads } = answeredIds.length
    ? await supabase.from("leads").select("id, title").in("id", answeredIds)
    : { data: [] as { id: string; title: string }[] };
  const titleOf = new Map([...(answeredLeads ?? []).map((l) => [l.id, l.title] as const), ...candidates.map((c) => [c.leadId, c.title] as const)]);
  const remaining = candidates.filter((c) => c.needsLook && !state.answered.has(c.leadId));
  const fine = candidates.filter((c) => !c.needsLook && !state.answered.has(c.leadId));
  const total = answeredIds.length + remaining.length;
  const position = Math.min(total, answeredIds.length + 1);
  const current = candidates.find((c) => c.leadId === leadId);
  const nextUp = remaining.find((c) => c.leadId !== leadId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-full bg-white/80 py-1.5 pr-1.5 pl-4 shadow-sm ring-1 ring-hairline md:mx-auto md:w-fit dark:bg-zinc-900/80">
        <span className="text-sm font-medium">Weekly review</span>
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cx("h-1.5 w-5 rounded-full", i < answeredIds.length ? "bg-accent" : i === answeredIds.length ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700")} />
          ))}
        </span>
        <span className="text-sm text-zinc-500 tabular-nums">
          {position} of {total}
        </span>
        <Link href="/inbox" className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Pause <kbd className="ml-1 opacity-60">Esc</kbd>
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:h-[calc(100dvh-10.5rem)] md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl bg-white/70 p-4 ring-1 ring-hairline md:flex dark:bg-zinc-900/60">
          <div>
            <h2 className="mb-2 text-xs font-medium text-zinc-400">Needs a look</h2>
            <ol className="space-y-1">
              {answeredIds.map((id) => (
                <li key={id}>
                  <Link href={`/inbox/review/${sessionId}/${id}`} className={cx("flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-white dark:hover:bg-zinc-800", id === leadId && "bg-white shadow-sm ring-1 ring-hairline dark:bg-zinc-800")}>
                    <span aria-hidden className="mt-0.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] text-white">✓</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{titleOf.get(id) ?? "A deal"}</span>
                      <span className="block text-xs text-accent-ink">{answerLabel(state.answered.get(id)!, org)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {remaining.map((c) => (
                <li key={c.leadId}>
                  <Link href={`/inbox/review/${sessionId}/${c.leadId}`} className={cx("flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-white dark:hover:bg-zinc-800", c.leadId === leadId && "bg-white shadow-sm ring-1 ring-hairline dark:bg-zinc-800")}>
                    <span aria-hidden className={cx("mt-0.5 size-4 rounded-full border-2", c.leadId === leadId ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-300 dark:border-zinc-600")} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{c.title}</span>
                      <span className="block text-xs text-zinc-500">{c.leadId === leadId ? "Now" : c.reasons.map((r) => REVIEW_REASONS[r]).join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          {fine.length ? (
            <div>
              <h2 className="mb-2 text-xs font-medium text-zinc-400">Look fine · confirmed at the end</h2>
              <ul className="space-y-0.5">
                {fine.map((c) => (
                  <li key={c.leadId}>
                    <Link href={`/inbox/review/${sessionId}/${c.leadId}`} className="block truncate rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-800">
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-auto space-y-2">
            <div className="rounded-2xl bg-accent-soft px-3 py-2.5 text-accent-ink">
              <p className="text-xs">Weighted forecast so far</p>
              <p className="font-display font-semibold tabular-nums">
                {formatMoney(Number(state.session.forecast_before), org.currency)} → {formatMoney(weighted(candidates), org.currency)}
              </p>
            </div>
            <form action={finishReview}>
              <input type="hidden" name="session_id" value={sessionId} />
              <button type="submit" className="w-full rounded-xl px-2 py-1.5 text-left text-xs text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800">
                Finish now: confirm the rest as they are →
              </button>
            </form>
          </div>
        </aside>

        <div className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-hairline dark:bg-zinc-900">
          <ThreadView
            thread={thread}
            timeline={timeline}
            stages={stages}
            members={members}
            org={org}
            userId={user.id}
            canEdit
            path={`/inbox/review/${sessionId}/${leadId}`}
            banner={
              current?.reasons.length ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
                  <span className="font-medium">In the review because:</span>
                  {current.reasons.map((r) => (
                    <span key={r} className="rounded-full bg-white/70 px-2 py-0.5 text-xs dark:bg-amber-900/40">
                      {r === "close_passed" && current.expectedCloseDate ? `Close date passed · ${formatDay(current.expectedCloseDate, org)}` : r === "quiet" ? `${current.daysQuiet} days since last touch` : REVIEW_REASONS[r]}
                    </span>
                  ))}
                </div>
              ) : null
            }
            footer={
              thread.status === "open" ? (
                <ReviewDock
                  key={leadId}
                  sessionId={sessionId}
                  leadId={leadId}
                  closeDate={thread.expectedCloseDate}
                  nextStepBody={thread.nextStep?.body ?? null}
                  nextTitle={nextUp?.title ?? null}
                />
              ) : (
                <p className="border-t border-hairline p-4 text-sm text-zinc-500">This deal is closed now. Pick another one on the left.</p>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function Page(props: PageProps<"/inbox/review/[sessionId]/[leadId]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReviewDeal {...props} />
    </Suspense>
  );
}
