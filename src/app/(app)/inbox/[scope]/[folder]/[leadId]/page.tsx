import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleTask } from "@/app/(app)/activities/actions";
import { assignLead } from "@/app/(app)/leads/actions";
import { StageControl } from "@/app/(app)/leads/[id]/stage-control";
import { PageSpinner } from "@/components/page-spinner";
import { buttonClass, cx, Select } from "@/components/ui";
import { getTimeline, type TimelineItem } from "@/lib/activities";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/crm";
import { formatDate, formatDateTime, formatDay, formatMoney, initials } from "@/lib/format";
import { folderByKey, getThread, inboxPath, isScope, type FolderKey } from "@/lib/inbox";
import { StartedToast, ThreadComposer } from "../../../thread-composer";

export const metadata: Metadata = { title: "Conversation" };

const TYPE_LABELS = { note: "Note", call: "Call", email: "Email", meeting: "Meeting", task: "Task" } as const;
const TYPE_ICONS = { note: "✎", call: "☎", email: "✉", meeting: "◷", task: "✓" } as const;

async function ThreadPage({ params, searchParams }: PageProps<"/inbox/[scope]/[folder]/[leadId]">) {
  const ctx = await requireReadyOrg();
  const { org, user } = ctx;
  const { scope, folder, leadId } = await params;
  if (!isScope(scope) || !folderByKey(folder) || !/^[0-9a-f-]{36}$/.test(leadId)) notFound();

  const thread = await getThread(org.id, leadId);
  if (!thread) notFound();
  const [stages, members, timeline] = await Promise.all([getStages(org.id), getMembers(org.id), getTimeline(org.id, { leadIds: [leadId] })]);

  const canEdit = canEditRole(ctx.role);
  const path = inboxPath(scope, folder as FolderKey, leadId);
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const openTasks = timeline.filter((i) => i.kind === "activity" && i.type === "task" && !i.completedAt && i.id !== thread.nextStep?.id);
  // Oldest first, like a conversation. Open tasks are plans, shown above instead;
  // finished ones sit where they were done.
  const when = (i: TimelineItem) => (i.kind === "activity" && i.type === "task" && i.completedAt ? i.completedAt : i.at);
  const conversation = timeline
    .filter((i) => !(i.kind === "activity" && i.type === "task" && !i.completedAt))
    .sort((a, b) => when(a).localeCompare(when(b)));
  const backHref = inboxPath(scope, folder as FolderKey);
  const sp = await searchParams;
  const justStarted = sp.started === leadId;
  const startedPerson = typeof sp.person === "string" && /^[0-9a-f-]{36}$/.test(sp.person) ? sp.person : undefined;
  const startedCompany = typeof sp.company === "string" && /^[0-9a-f-]{36}$/.test(sp.company) ? sp.company : undefined;

  return (
    <article className="flex h-full flex-col">
      <header className="space-y-3 border-b border-hairline px-5 pt-4 pb-4">
        <Link href={backHref} className="text-sm text-zinc-500 hover:text-zinc-900 md:hidden dark:hover:text-zinc-100">
          ← {folderByKey(folder)!.label}
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft font-display text-sm font-semibold text-accent-ink">
            {initials(thread.contact?.name ?? thread.title)}
          </span>
          <div className="min-w-0 flex-1 basis-52">
            <h1 className="font-display text-2xl font-semibold tracking-tight break-words">{thread.title}</h1>
            <p className="text-sm text-zinc-500">
              {thread.contact ? (
                <Link href={`/contacts/${thread.contact.id}`} className="hover:underline">
                  {thread.contact.name}
                </Link>
              ) : (
                "No contact"
              )}
              {thread.company ? ` · ${thread.company.name}` : ""}
            </p>
          </div>
          <div className="pl-14 sm:pl-0 sm:text-right">
            <p className="font-display text-xl font-semibold tabular-nums">{formatMoney(thread.value, thread.currency ?? org.currency)}</p>
            <p className="text-xs text-zinc-500">
              {thread.expectedCloseDate ? `Closes ${formatDay(thread.expectedCloseDate, org)}` : "No close date yet"}
              {thread.ownerId ? ` · ${memberName.get(thread.ownerId) ?? "Former member"}` : ""}
            </p>
          </div>
        </div>
        <StageControl leadId={thread.id} leadTitle={thread.title} stageId={thread.stageId} stages={stages} canEdit={canEdit} />
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {justStarted ? <StartedToast leadId={leadId} personId={startedPerson} companyId={startedCompany} backHref={backHref} /> : null}
        {!thread.ownerId && thread.status === "open" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:ring-amber-900">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Nobody owns this yet</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">Leads from forms wait here until someone takes them.</p>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <form action={assignLead} className="flex items-center gap-2">
                  <input type="hidden" name="lead_id" value={thread.id} />
                  <Select name="owner_id" aria-label="Assign to" defaultValue="" className="h-9 w-40">
                    <option value="" disabled>
                      Assign to…
                    </option>
                    {members
                      .filter((m) => m.id !== user.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </Select>
                  <button type="submit" className={buttonClass("secondary", "h-9")}>
                    Assign
                  </button>
                </form>
                <form action={assignLead}>
                  <input type="hidden" name="lead_id" value={thread.id} />
                  <input type="hidden" name="owner_id" value={user.id} />
                  <button type="submit" className={buttonClass("primary", "h-9")}>
                    Take it
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : null}

        {thread.status === "open" ? (
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-hairline dark:bg-zinc-800/50">
            {thread.nextStep ? (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">Next step:</span> {thread.nextStep.body}
                  </p>
                  <p className={cx("mt-0.5 text-xs", thread.nextStep.overdue ? "font-medium text-amber-700 dark:text-amber-400" : "text-zinc-500")}>
                    {thread.nextStep.dueAt ? `${thread.nextStep.overdue ? "Overdue · was due" : "Due"} ${formatDateTime(thread.nextStep.dueAt, org)}` : "No due date"}
                    {thread.nextStep.assignedTo ? ` · ${memberName.get(thread.nextStep.assignedTo) ?? "Former member"}` : ""}
                  </p>
                </div>
                {canEdit ? (
                  <form action={toggleTask}>
                    <input type="hidden" name="id" value={thread.nextStep.id} />
                    <input type="hidden" name="done" value="true" />
                    <input type="hidden" name="path" value={path} />
                    <button type="submit" className={buttonClass("secondary", "h-8 px-3 text-xs")}>
                      Mark done
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No next step yet. Add one below as a task so this doesn&apos;t slip.</p>
            )}
            {openTasks.length ? (
              <p className="mt-2 text-xs text-zinc-500">
                Also planned: {openTasks.map((t) => (t.kind === "activity" ? t.body : "")).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {conversation.length ? (
          <ol className="space-y-3" aria-label="Conversation">
            {conversation.map((item, i) => {
              const prev = conversation[i - 1];
              const day = formatDate(when(item), org);
              const newDay = !prev || formatDate(when(prev), org) !== day;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  {newDay ? <p className="my-2 text-center text-xs text-zinc-400">{day}</p> : null}
                  <Entry item={item} stageName={stageName} org={org} />
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-zinc-500">Nothing logged yet.</p>
        )}
      </div>

      {canEdit ? (
        <div className="border-t border-hairline p-3">
          <ThreadComposer
            key={thread.id}
            leadId={thread.id}
            stages={stages}
            stageId={thread.stageId}
            nextStep={thread.nextStep ? { id: thread.nextStep.id, body: thread.nextStep.body } : null}
            members={members}
            currentUserId={user.id}
            contactFirstName={thread.contact?.name.split(" ")[0] ?? null}
          />
        </div>
      ) : null}
      <p className="px-5 pb-3 text-xs text-zinc-400">
        <Link href={`/leads/${thread.id}`} className="hover:underline">
          Open the full lead page
        </Link>{" "}
        to edit details or delete entries.
      </p>
    </article>
  );
}

function Entry({ item, stageName, org }: { item: TimelineItem; stageName: Map<string, string>; org: { date_format: string; timezone: string } }) {
  const time = formatDateTime(item.at, org).split(" ")[1];
  if (item.kind === "stage") {
    return (
      <SystemLine>
        {item.fromStageId ? (
          <>
            {item.actor || "Someone"} moved this from <b className="font-medium">{stageName.get(item.fromStageId) ?? "a removed stage"}</b> to{" "}
          </>
        ) : (
          "Created in "
        )}
        <b className="font-medium">{item.toStageId ? (stageName.get(item.toStageId) ?? "a removed stage") : "—"}</b> · {time}
      </SystemLine>
    );
  }
  if (item.type === "task") {
    return (
      <SystemLine>
        ✓ {item.assignee || item.author || "Someone"} did: <span className="line-through decoration-zinc-300">{item.body}</span>
        {item.completedAt ? ` · ${formatDateTime(item.completedAt, org)}` : ""}
      </SystemLine>
    );
  }
  if (item.source || item.direction === "inbound") {
    // From them: a form or API submission (unverified), or an email or call logged as inbound.
    return (
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
        <p className="mb-1 text-xs text-zinc-500">
          {item.source ? (
            <span
              className="rounded-full bg-amber-50 px-1.5 py-px text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              title="Submitted from outside the app; the sender's identity isn't verified."
            >
              via {item.source} · unverified
            </span>
          ) : (
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {item.type === "call" ? "They called" : "They emailed"}
              {item.author ? <span className="font-normal text-zinc-500"> · logged by {item.author}</span> : null}
            </span>
          )}{" "}
          · {time}
        </p>
        <p className="text-sm whitespace-pre-wrap">{item.body}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-xs ring-1 ring-hairline dark:bg-zinc-900">
      <p className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
        <span aria-hidden className="grid size-5 place-items-center rounded-full bg-accent-soft text-[11px] text-accent-ink">
          {TYPE_ICONS[item.type]}
        </span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{TYPE_LABELS[item.type]}</span>
        {item.outcome ? <span className="rounded-full bg-zinc-100 px-1.5 py-px text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{item.outcome}</span> : null}
        {item.author ? <span>by {item.author}</span> : null}
        <span className="ml-auto">{time}</span>
      </p>
      <p className="text-sm whitespace-pre-wrap">{item.body}</p>
    </div>
  );
}

function SystemLine({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-zinc-500">{children}</p>;
}

export default function Page(props: PageProps<"/inbox/[scope]/[folder]/[leadId]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ThreadPage {...props} />
    </Suspense>
  );
}
