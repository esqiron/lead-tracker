import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clearSampleData } from "@/app/(app)/dashboard/actions";
import { PageSpinner } from "@/components/page-spinner";
import { cx } from "@/components/ui";
import { canEditRole, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getSources, getStages } from "@/lib/crm";
import { env } from "@/lib/env";
import { formatDate, formatMoney, initials, shortWhen } from "@/lib/format";
import {
  FOLDERS,
  folderByKey,
  getInboxSummary,
  getRecentReviews,
  getThreads,
  hasSampleData,
  inboxPath,
  isScope,
  isView,
  REASONS,
  SCOPES,
  VIEWS,
  type FolderKey,
  type Thread,
} from "@/lib/inbox";
import { countCandidates, getReviewStatus, WEEKDAYS } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";
import { InboxPanes, ThreadKeys, ThreadLink } from "../../inbox-panes";
import { NewMenu, StartConversationRow } from "../../new-menu";

type Params = LayoutProps<"/inbox/[scope]/[folder]">["params"];

async function readParams(params: Params) {
  const { scope, folder } = await params;
  if (!isScope(scope) || !folderByKey(folder)) notFound();
  return { scope, folder: folder as FolderKey };
}

export default function InboxLayout({ children, params }: LayoutProps<"/inbox/[scope]/[folder]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <InboxPanes
        sidebar={
          <Suspense fallback={null}>
            <Sidebar params={params} />
          </Suspense>
        }
        list={
          <Suspense fallback={<PageSpinner />}>
            <ThreadList params={params} />
          </Suspense>
        }
      >
        {children}
      </InboxPanes>
    </Suspense>
  );
}

// The hosted lead form to share from the New menu, if there is one.
async function getFormUrl(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("capture_forms").select("public_id").eq("org_id", orgId).eq("is_active", true).order("created_at").limit(1).maybeSingle();
  return data ? `${env.siteUrl}/f/${data.public_id}` : null;
}

async function Sidebar({ params }: { params: Params }) {
  const { org, role, user } = await requireReadyOrg();
  const { scope, folder } = await readParams(params);
  const canEdit = canEditRole(role);
  const [summary, sample, stages, sources, members, formUrl, review, reviewCounts] = await Promise.all([
    getInboxSummary(org.id, scope, user.id),
    isAdminRole(role) ? hasSampleData(org.id) : Promise.resolve(false),
    canEdit ? getStages(org.id) : Promise.resolve([]),
    canEdit ? getSources(org.id) : Promise.resolve([]),
    canEdit ? getMembers(org.id) : Promise.resolve([]),
    canEdit ? getFormUrl(org.id) : Promise.resolve(null),
    getReviewStatus(org, user.id),
    canEdit ? countCandidates(org.id, "mine") : Promise.resolve(null),
  ]);

  return (
    <nav aria-label="Inbox" className="flex h-full flex-col gap-3 md:gap-5">
      {canEdit ? (
        <NewMenu
          formUrl={formUrl}
          options={{
            members,
            stages: stages.filter((s) => !s.is_won && !s.is_lost).map((s) => ({ id: s.id, name: s.name })),
            sources,
            currentUserId: user.id,
            currency: org.currency,
          }}
        />
      ) : null}
      <div className="inline-flex self-start rounded-full bg-white/70 p-1 ring-1 ring-hairline dark:bg-zinc-900/70" role="group" aria-label="Whose threads">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={inboxPath(s.key, folder)}
            aria-current={s.key === scope ? "page" : undefined}
            className={cx(
              "rounded-full px-3 py-1 text-sm font-medium",
              s.key === scope ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {reviewCounts && reviewCounts.total ? (
        <Link
          href="/inbox/review"
          className={cx(
            "hidden rounded-2xl px-3 py-2.5 ring-1 transition-colors md:block",
            review.done ? "bg-white/50 ring-hairline hover:bg-white dark:bg-zinc-900/50" : "bg-white shadow-sm ring-amber-200 hover:ring-amber-300 dark:bg-zinc-900 dark:ring-amber-900",
          )}
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">Weekly review</span>
            {!review.done ? <span className="text-xs text-zinc-400">{reviewCounts.minutes} min</span> : null}
          </span>
          <span className={cx("block text-xs", review.done ? "text-zinc-500" : "text-amber-700 dark:text-amber-400")}>
            {review.done
              ? `Done ✓ · next on ${WEEKDAYS[org.review_day]}`
              : review.openSessionId
                ? "In progress · pick up where you left off"
                : `Due · ${reviewCounts.needs} need${reviewCounts.needs === 1 ? "s" : ""} a look`}
          </span>
        </Link>
      ) : null}

      <div>
        <h2 className="mb-1.5 hidden px-3 text-xs font-medium text-zinc-400 md:block">Folders</h2>
        {/* A row of chips on phones, a list on wider screens. */}
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-0.5 md:px-0 md:pb-0">
          {FOLDERS.map((f) => {
            const active = f.key === folder;
            return (
              <li key={f.key} className="shrink-0">
                <Link
                  href={inboxPath(scope, f.key)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                    active ? "bg-white shadow-sm ring-1 ring-hairline dark:bg-zinc-900" : "hover:bg-white/60 dark:hover:bg-zinc-900/60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.label}</span>
                    <span className="hidden truncate text-xs text-zinc-500 md:block">
                      {f.key === "going-cold" ? `No touch in ${org.cold_after_days}+ days` : f.hint}
                    </span>
                  </span>
                  <span
                    className={cx(
                      "min-w-6 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums",
                      active && f.key === "needs-reply" && summary.counts[f.key]
                        ? "bg-zinc-900 py-0.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-500",
                    )}
                  >
                    {summary.counts[f.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h2 className="mb-1.5 hidden px-3 text-xs font-medium text-zinc-400 md:block">Views</h2>
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:block md:space-y-0.5 md:px-0">
          {VIEWS.map((v) => {
            const active = v.key === folder;
            return (
              <li key={v.key} className="shrink-0">
                <Link
                  href={inboxPath(scope, v.key)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                    active ? "bg-white shadow-sm ring-1 ring-hairline dark:bg-zinc-900" : "hover:bg-white/60 dark:hover:bg-zinc-900/60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{v.label}</span>
                    <span className="hidden truncate text-xs text-zinc-500 md:block">{v.hint}</span>
                  </span>
                  {/* Views list open deals plus recent wins, like the Won folder. */}
                  <span className="text-xs font-semibold text-zinc-500 tabular-nums">{summary.openCount + summary.counts.won}</span>
                </Link>
              </li>
            );
          })}
          <li className="hidden md:block">
            <Link href="/leads" className="block rounded-xl px-3 py-2 hover:bg-white/60 dark:hover:bg-zinc-900/60">
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Pipeline board</span>
              <span className="block text-xs text-zinc-500">Drag deals between stages</span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="mt-auto hidden space-y-3 md:block">
        {sample ? (
          <div className="rounded-2xl bg-white/70 p-3 text-xs text-zinc-600 ring-1 ring-hairline dark:bg-zinc-900/70 dark:text-zinc-400">
            <p>You&apos;re looking at sample data.</p>
            <form action={clearSampleData} className="mt-2">
              <button type="submit" className="font-medium text-accent hover:underline">
                Clear sample data
              </button>
            </form>
          </div>
        ) : null}
        <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-hairline dark:bg-zinc-900/70">
          <p className="text-xs text-zinc-500">Open pipeline{scope === "mine" ? " (yours)" : ""}</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{formatMoney(summary.openValue, org.currency)}</p>
          <p className="text-xs text-zinc-500">
            {summary.openCount} open conversation{summary.openCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </nav>
  );
}

const EMPTY: Record<FolderKey, string> = {
  "needs-reply": "Nothing needs you right now.",
  waiting: "Nothing is waiting on anyone.",
  "going-cold": "No conversation has gone quiet.",
  won: "No wins in the last 30 days yet.",
  "by-stage": "No open conversations yet.",
  "by-owner": "No open conversations yet.",
};

const REVIEW_FLAGS: Record<string, string> = { pushed: "Pushed in review", kept: "Kept in review", skipped: "Skipped in review" };

async function ThreadList({ params }: { params: Params }) {
  const { org, user, role } = await requireReadyOrg();
  const { scope, folder } = await readParams(params);
  const view = isView(folder);
  const [threads, stages, members] = await Promise.all([getThreads(org.id, folder, scope, user.id), getStages(org.id), getMembers(org.id)]);
  const reviews = view ? await getRecentReviews(org.id, threads.map((t) => t.id)) : new Map<string, string>();
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const probability = new Map(stages.map((s) => [s.id, s.probability]));

  // Views group the list: by stage (pipeline order) or by owner (unowned first).
  type Group = { key: string; label: string; items: Thread[] };
  const groups: Group[] = !view
    ? [{ key: "all", label: "", items: threads }]
    : folder === "by-stage"
      ? stages
          .map((s) => ({ key: s.id, label: s.name, items: threads.filter((t) => t.stageId === s.id) }))
          .filter((g) => g.items.length)
      : [
          { key: "none", label: "Nobody yet", items: threads.filter((t) => !t.ownerId) },
          ...members.map((m) => ({ key: m.id, label: m.name, items: threads.filter((t) => t.ownerId === m.id) })),
          { key: "former", label: "Former members", items: threads.filter((t) => t.ownerId && !memberName.has(t.ownerId)) },
        ].filter((g) => g.items.length);
  const ordered = groups.flatMap((g) => g.items);

  const row = (t: Thread) => {
    const who = t.contact?.name ?? t.company?.name ?? "No contact";
    return (
      <li key={t.id}>
        <ThreadLink id={t.id} href={inboxPath(scope, folder, t.id)}>
          <div className="flex gap-3">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-[11px] font-semibold text-accent-ink">
              {initials(who)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 text-sm">
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{who}</span>
                {t.contact && t.company ? <span className="truncate text-xs text-zinc-400">{t.company.name}</span> : null}
                <span className="ml-auto shrink-0 text-xs text-zinc-400">{shortWhen(t.lastTouchAt, org)}</span>
              </p>
              <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{t.title}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                {t.nextStep ? (
                  <>
                    <span className="truncate">→ {t.nextStep.body}</span>
                    {t.nextStep.dueAt ? (
                      <span
                        className={cx(
                          "shrink-0 rounded-full px-1.5 py-px",
                          t.nextStep.overdue ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-zinc-100 dark:bg-zinc-800",
                        )}
                      >
                        {t.nextStep.overdue ? "Overdue · " : t.nextStep.dueToday ? "Today · " : ""}
                        {formatDate(t.nextStep.dueAt, org)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className={cx(t.reason === "unowned" || t.reason === "inbound" ? "text-amber-700 dark:text-amber-400" : undefined)}>
                    {t.reason === "quiet" ? `Quiet for ${t.daysQuiet} days` : REASONS[t.reason ?? ""]}
                  </span>
                )}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-xs">
                {folder !== "by-stage" ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{stageName.get(t.stageId)}</span>
                ) : null}
                <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{formatMoney(t.value, t.currency ?? org.currency)}</span>
                {view && t.folder && t.folder !== "waiting" && t.folder !== "won" ? (
                  <span className={cx("shrink-0 rounded-full px-1.5 py-px whitespace-nowrap", t.folder === "going_cold" ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300")}>
                    {t.folder === "going_cold" ? "Cold" : "Your move"}
                  </span>
                ) : null}
                {reviews.get(t.id) ? <span className="truncate text-zinc-400">{REVIEW_FLAGS[reviews.get(t.id)!]}</span> : null}
                {t.ownerId && folder !== "by-owner" ? (
                  <span
                    title={memberName.get(t.ownerId)}
                    className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-zinc-200 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {initials(memberName.get(t.ownerId) ?? "?")}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </ThreadLink>
      </li>
    );
  };

  return (
    <section aria-label={folderByKey(folder)!.label} className="flex h-full flex-col">
      <header className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-semibold tracking-tight">{folderByKey(folder)!.label}</h1>
        <span className="text-xs text-zinc-500">{threads.length}</span>
      </header>
      {canEditRole(role) ? <StartConversationRow /> : null}
      <ThreadKeys hrefs={ordered.map((t) => ({ id: t.id, href: inboxPath(scope, folder, t.id) }))} />
      {threads.length ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {groups.map((g) => {
            const open = g.items.filter((t) => t.status === "open");
            const total = g.items.reduce((sum, t) => sum + t.value, 0);
            const weightedTotal = open.reduce((sum, t) => sum + (t.value * (probability.get(t.stageId) ?? 0)) / 100, 0);
            return (
              <section key={g.key} aria-label={g.label || undefined}>
                {g.label ? (
                  <h2 className="sticky top-0 z-[1] flex items-baseline gap-2 bg-zinc-50/95 px-2.5 pt-3 pb-1.5 text-xs backdrop-blur dark:bg-zinc-900/95">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{g.label}</span>
                    <span className="text-zinc-400">{g.items.length}</span>
                    <span className="ml-auto tabular-nums text-zinc-500">
                      {formatMoney(total, org.currency)}
                      {open.length ? <span className="text-zinc-400"> · {formatMoney(weightedTotal, org.currency)} likely</span> : null}
                    </span>
                  </h2>
                ) : null}
                <ul className="space-y-0.5">{g.items.map(row)}</ul>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="px-4 py-8 text-sm text-zinc-500">{EMPTY[folder]}</p>
      )}
      <p className="hidden border-t border-hairline px-4 py-3 text-xs text-zinc-400 md:block">
        {scope === "mine" ? "Showing yours and unowned. " : ""}
        <kbd className="font-sans">J</kbd>/<kbd className="font-sans">K</kbd> next and previous · <kbd className="font-sans">/</kbd> reply · <kbd className="font-sans">E</kbd> mark done ·{" "}
        <kbd className="font-sans">C</kbd> new
      </p>
    </section>
  );
}
