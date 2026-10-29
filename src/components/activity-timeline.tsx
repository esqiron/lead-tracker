import Link from "next/link";
import { deleteActivity, toggleTask } from "@/app/(app)/activities/actions";
import { cx } from "@/components/ui";
import type { TimelineItem } from "@/lib/activities";
import { formatDateTime } from "@/lib/format";
import { reviewText } from "@/lib/review-text";

const TYPE_LABELS = { note: "Note", call: "Call", email: "Email", meeting: "Meeting", task: "Task" } as const;
const TYPE_ICONS = { note: "✎", call: "☎", email: "✉", meeting: "◷", task: "✓" } as const;

type Org = { date_format: string; timezone: string };
type Viewer = { userId: string; isAdmin: boolean; canEdit: boolean };

export function ActivityTimeline({
  items,
  stageNames,
  org,
  viewer,
  path,
  showLead,
}: {
  items: TimelineItem[];
  stageNames: Map<string, string>;
  org: Org;
  viewer: Viewer;
  path: string;
  // On a contact page, say which lead each entry belongs to.
  showLead?: boolean;
}) {
  const openTasks = items
    .filter((i): i is Extract<TimelineItem, { kind: "activity" }> => i.kind === "activity" && i.type === "task" && !i.completedAt)
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  const history = items.filter((i) => !(i.kind === "activity" && i.type === "task" && !i.completedAt));
  const now = new Date().toISOString();

  return (
    <div className="space-y-8">
      {openTasks.length ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Open tasks</h3>
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
            {openTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 px-3 py-2.5">
                <TaskCheckbox id={task.id} done={false} path={path} disabled={!viewer.canEdit} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">{task.body}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {task.dueAt ? (
                      <span className={task.dueAt < now ? "font-medium text-amber-700 dark:text-amber-400" : undefined}>
                        Due {formatDateTime(task.dueAt, org)}
                      </span>
                    ) : (
                      "No due date"
                    )}
                    {task.assignee ? ` · ${task.assignee}` : ""}
                    {showLead && task.lead ? (
                      <>
                        {" · "}
                        <Link href={`/leads/${task.lead.id}`} className="hover:underline">
                          {task.lead.title}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <DeleteButton item={task} viewer={viewer} path={path} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">Activity</h3>
        {history.length ? (
          <ol className="relative space-y-5 border-l border-zinc-200 pl-6 dark:border-zinc-800">
            {history.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="relative">
                <span
                  aria-hidden
                  className={cx(
                    "absolute -left-[2.0625rem] grid size-6 place-items-center rounded-full border text-xs",
                    item.kind !== "activity"
                      ? "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
                      : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
                  )}
                >
                  {item.kind === "stage" ? "→" : item.kind === "review" ? "◎" : TYPE_ICONS[item.type]}
                </span>
                {item.kind === "review" ? (
                  <p className="pt-0.5 text-sm text-zinc-500">
                    {reviewText(item, org)} · {formatDateTime(item.at, org)}
                  </p>
                ) : item.kind === "stage" ? (
                  <p className="pt-0.5 text-sm text-zinc-500">
                    {item.fromStageId ? (
                      <>
                        Moved from <span className="text-zinc-700 dark:text-zinc-300">{stageNames.get(item.fromStageId) ?? "a removed stage"}</span> to{" "}
                      </>
                    ) : (
                      "Created in "
                    )}
                    <span className="text-zinc-700 dark:text-zinc-300">{item.toStageId ? (stageNames.get(item.toStageId) ?? "a removed stage") : "—"}</span>
                    {item.actor ? ` by ${item.actor}` : ""} · {formatDateTime(item.at, org)}
                  </p>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-500">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{TYPE_LABELS[item.type]}</span>
                        {item.author ? ` · ${item.author}` : ""}
                        {item.source ? (
                          <span className="ml-1 rounded bg-amber-50 px-1 py-px text-amber-800 dark:bg-amber-950 dark:text-amber-300" title="Submitted from outside the app; the sender's identity isn't verified.">
                            via {item.source} · unverified
                          </span>
                        ) : null}{" "}
                        · {formatDateTime(item.at, org)}
                        {item.type === "task" && item.completedAt ? ` · done ${formatDateTime(item.completedAt, org)}` : ""}
                        {showLead && item.lead ? (
                          <>
                            {" · "}
                            <Link href={`/leads/${item.lead.id}`} className="hover:underline">
                              {item.lead.title}
                            </Link>
                          </>
                        ) : null}
                      </p>
                      <p
                        className={cx(
                          "mt-1 text-sm whitespace-pre-wrap text-zinc-900 dark:text-zinc-100",
                          item.type === "task" && "text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-500",
                        )}
                      >
                        {item.body}
                      </p>
                    </div>
                    {item.type === "task" ? <TaskCheckbox id={item.id} done path={path} disabled={!viewer.canEdit} /> : null}
                    <DeleteButton item={item} viewer={viewer} path={path} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-500">Nothing logged yet.</p>
        )}
      </section>
    </div>
  );
}

function TaskCheckbox({ id, done, path, disabled }: { id: string; done: boolean; path: string; disabled: boolean }) {
  return (
    <form action={toggleTask}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="done" value={String(!done)} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        title={done ? "Mark as not done" : "Mark as done"}
        className={cx(
          "mt-0.5 grid size-5 place-items-center rounded border text-[11px] disabled:cursor-not-allowed",
          done
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600",
        )}
      >
        {done ? "✓" : ""}
      </button>
    </form>
  );
}

function DeleteButton({
  item,
  viewer,
  path,
}: {
  item: Extract<TimelineItem, { kind: "activity" }>;
  viewer: Viewer;
  path: string;
}) {
  if (!viewer.isAdmin && item.createdBy !== viewer.userId) return null;
  return (
    <form action={deleteActivity}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        aria-label="Delete"
        title="Delete"
        className="rounded px-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-900"
      >
        ×
      </button>
    </form>
  );
}
