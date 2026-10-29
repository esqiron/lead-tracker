import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageSpinner } from "@/components/page-spinner";
import { buttonClass, cx } from "@/components/ui";
import { canEditRole, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/crm";
import { formatDay, formatMoney } from "@/lib/format";
import { estimateMinutes, getCandidates, getReviewStatus, getSession, REVIEW_REASONS, WEEKDAYS, weighted, type ReviewScope } from "@/lib/review";
import { finishReview, startReview } from "./actions";

export const metadata: Metadata = { title: "Weekly review" };

const QUESTIONS = [
  { q: "Is it still on track?", a: "Keep it, push the date, or mark it lost with a reason." },
  { q: "When will it close?", a: "Keep the date, or pick a new one in one tap." },
  { q: "What's the next step?", a: "Who does what, by when. It lands in their inbox." },
];

async function ReviewStart({ searchParams }: PageProps<"/inbox/review">) {
  const { org, role, user } = await requireReadyOrg();
  const sp = await searchParams;
  const status = await getReviewStatus(org, user.id);
  const scope: ReviewScope = status.openSessionId ? status.openScope : sp.scope === "everyone" && isAdminRole(role) ? "everyone" : "mine";
  const [candidates, stages, members, open] = await Promise.all([
    getCandidates(org.id, scope),
    getStages(org.id),
    getMembers(org.id),
    status.openSessionId ? getSession(org.id, status.openSessionId) : Promise.resolve(null),
  ]);
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const needs = candidates.filter((c) => c.needsLook);
  const fine = candidates.filter((c) => !c.needsLook);
  const canEdit = canEditRole(role);
  const resumeAt = open ? needs.find((c) => !open.answered.has(c.leadId)) : undefined;

  return (
    <div className="space-y-6">
      <Link href="/inbox" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← Inbox
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="space-y-6">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-zinc-400 uppercase">Weekly review · {scope === "mine" ? "your deals" : "everyone's deals"}</p>
            {candidates.length ? (
              <h1 className="mt-3 font-display text-5xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
                {candidates.length} open deal{candidates.length === 1 ? "" : "s"}.
                <span className="block text-zinc-400">{needs.length ? `${needs.length} need${needs.length === 1 ? "s" : ""} a look.` : "All look fine."}</span>
              </h1>
            ) : (
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">No open deals to review.</h1>
            )}
          </div>
          {candidates.length ? (
            <p className="max-w-prose text-zinc-600 dark:text-zinc-400">
              About <b className="font-semibold text-zinc-900 dark:text-zinc-100">{estimateMinutes(needs.length, fine.length)} minute{estimateMinutes(needs.length, fine.length) === 1 ? "" : "s"}</b>, one deal at a
              time. Furthest stage first, so the money closest to closing gets checked first.
            </p>
          ) : null}
          {status.done && !open ? (
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-ink">
              You&apos;ve done this week&apos;s review. Running it again is fine; the next one is due on {WEEKDAYS[org.review_day]}.
            </p>
          ) : null}

          {candidates.length ? (
            <div>
              <p className="mb-2 text-sm font-medium">For each deal that needs a look, three questions</p>
              <ol className="space-y-2">
                {QUESTIONS.map((x, i) => (
                  <li key={x.q} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs ring-1 ring-hairline dark:bg-zinc-900">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{i + 1}</span>
                    <span>
                      <span className="block text-sm font-medium">{x.q}</span>
                      <span className="block text-sm text-zinc-500">{x.a}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {canEdit && candidates.length ? (
            <div className="flex flex-wrap items-center gap-3">
              {open && resumeAt ? (
                <Link href={`/inbox/review/${open.session.id}/${resumeAt.leadId}`} className={buttonClass("primary", "h-11 px-5")}>
                  Continue with {resumeAt.title} →
                </Link>
              ) : open ? (
                <form action={finishReview}>
                  <input type="hidden" name="session_id" value={open.session.id} />
                  <button type="submit" className={buttonClass("primary", "h-11 px-5")}>
                    Confirm the rest and finish →
                  </button>
                </form>
              ) : (
                <form action={startReview}>
                  <input type="hidden" name="scope" value={scope} />
                  <button type="submit" className={buttonClass("primary", "h-11 px-5")}>
                    {needs.length ? `Start with ${needs[0].title} →` : "Confirm all and finish →"}
                  </button>
                </form>
              )}
              {isAdminRole(role) && !open ? (
                <Link href={scope === "mine" ? "/inbox/review?scope=everyone" : "/inbox/review"} className="text-sm text-zinc-500 hover:underline">
                  {scope === "mine" ? "Review everyone's deals instead" : "Review only yours instead"}
                </Link>
              ) : null}
            </div>
          ) : null}
          <p className="text-xs text-zinc-500">You can stop at any point. Answers save as you go, and nothing changes on a deal you skip.</p>
        </section>

        {candidates.length ? (
          <aside className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-hairline dark:bg-zinc-900">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Needs a look</h2>
              <span className="text-xs text-zinc-500">in review order</span>
            </div>
            {needs.length ? (
              <ol className="space-y-2">
                {needs.map((c, i) => (
                  <li key={c.leadId} className={cx("rounded-2xl px-3 py-2.5 ring-1 ring-hairline", open?.answered.has(c.leadId) && "opacity-50")}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-medium">{c.title}</span>
                          <span className="ml-auto shrink-0 text-sm tabular-nums">{formatMoney(c.value, org.currency)}</span>
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {[c.who, stageName.get(c.stageId)].filter(Boolean).join(" · ")}
                          {scope === "everyone" && c.ownerId ? ` · ${memberName.get(c.ownerId) ?? ""}` : ""}
                        </p>
                        <p className="mt-1.5 flex flex-wrap gap-1">
                          {c.reasons.map((r) => (
                            <span key={r} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {r === "close_passed" && c.expectedCloseDate
                                ? `Close date passed · ${formatDay(c.expectedCloseDate, org)}`
                                : r === "quiet"
                                  ? `${c.daysQuiet} days since last touch`
                                  : REVIEW_REASONS[r]}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-zinc-500">Nothing needs a look this week.</p>
            )}
            {fine.length ? (
              <div className="border-t border-hairline pt-3">
                <p className="text-sm">
                  <b className="font-medium">{fine.length} look fine.</b> <span className="text-zinc-500">Touched recently, close date ahead, next step set. You confirm them together at the end.</span>
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {fine.map((c) => (
                    <li key={c.leadId} className="flex justify-between gap-2">
                      <span className="truncate">{c.title}</span>
                      <span className="shrink-0 tabular-nums text-zinc-400">{formatMoney(c.value, org.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex items-center justify-between rounded-2xl bg-accent-soft px-4 py-3 text-accent-ink">
              <span className="text-sm">Weighted forecast before the review</span>
              <span className="font-display text-lg font-semibold tabular-nums">{formatMoney(weighted(candidates), org.currency)}</span>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default function Page(props: PageProps<"/inbox/review">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReviewStart {...props} />
    </Suspense>
  );
}
