import "server-only";
import type { QueryData } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/format";

// The inbox: every lead is a conversation thread, sorted into folders by the
// lead_threads view (see supabase/migrations/20261029000000_inbox.sql).

export const FOLDERS = [
  { key: "needs-reply", folder: "needs_reply", label: "Needs reply", hint: "Your move is next" },
  { key: "waiting", folder: "waiting", label: "Waiting on them", hint: "Their move, nothing due" },
  { key: "going-cold", folder: "going_cold", label: "Going cold", hint: "No touch in a while" },
  { key: "won", folder: "won", label: "Won", hint: "Closed in the last 30 days" },
] as const;

// Views list every open conversation (and recent wins), grouped.
export const VIEWS = [
  { key: "by-stage", folder: null, label: "By stage", hint: "The pipeline, as conversations" },
  { key: "by-owner", folder: null, label: "By owner", hint: "Who owes what" },
] as const;

export type FolderKey = (typeof FOLDERS)[number]["key"] | (typeof VIEWS)[number]["key"];

export function isView(key: string) {
  return VIEWS.some((v) => v.key === key);
}
export type Scope = "mine" | "everyone";

export const SCOPES: { key: Scope; label: string }[] = [
  { key: "mine", label: "Mine" },
  { key: "everyone", label: "Everyone" },
];

export function folderByKey(key: string) {
  return FOLDERS.find((f) => f.key === key) ?? VIEWS.find((v) => v.key === key);
}

export function isScope(value: string): value is Scope {
  return value === "mine" || value === "everyone";
}

export function inboxPath(scope: Scope, folder: FolderKey, leadId?: string) {
  return `/inbox/${scope}/${folder}${leadId ? `/${leadId}` : ""}`;
}

// Why a thread is in its folder, in the user's words.
export const REASONS: Record<string, string> = {
  unowned: "Nobody owns this yet",
  inbound: "They wrote last",
  due: "Next step is due",
  quiet: "Gone quiet",
  no_next_step: "No next step set",
  scheduled: "Next step planned",
  won: "Won",
};

const THREAD_SELECT = `id, title, value, currency, status, stage_id, owner_id, expected_close_date, closed_at,
  last_touch_at, days_quiet, last_activity_inbound, reason, folder,
  next_task_id, next_task_body, next_task_due_at, next_task_due_on, next_task_assigned_to, today,
  contact:contacts!leads_org_id_contact_id_fkey(id, first_name, last_name, email),
  company:companies!leads_org_id_company_id_fkey(id, name)`;

type Supabase = Awaited<ReturnType<typeof createClient>>;

const threadQuery = (supabase: Supabase, orgId: string) => supabase.from("lead_threads").select(THREAD_SELECT).eq("org_id", orgId);
type ThreadRow = QueryData<ReturnType<typeof threadQuery>>[number];

// "Mine" = threads I own, whose next step is mine, or that nobody owns yet.
function scoped<Q extends { or: (filter: string) => Q }>(query: Q, scope: Scope, userId: string) {
  return scope === "mine" ? query.or(`owner_id.eq.${userId},next_task_assigned_to.eq.${userId},owner_id.is.null`) : query;
}

export type Thread = ReturnType<typeof toThread>;

function toThread(row: ThreadRow) {
  return {
    id: row.id!,
    title: row.title ?? "",
    value: Number(row.value ?? 0),
    currency: row.currency,
    status: row.status!,
    stageId: row.stage_id!,
    ownerId: row.owner_id,
    expectedCloseDate: row.expected_close_date,
    closedAt: row.closed_at,
    lastTouchAt: row.last_touch_at!,
    daysQuiet: row.days_quiet ?? 0,
    reason: row.reason,
    folder: row.folder,
    nextStep: row.next_task_id
      ? {
          id: row.next_task_id,
          body: row.next_task_body ?? "",
          dueAt: row.next_task_due_at,
          overdue: Boolean(row.next_task_due_on && row.today && row.next_task_due_on < row.today),
          dueToday: Boolean(row.next_task_due_on && row.next_task_due_on === row.today),
          assignedTo: row.next_task_assigned_to,
        }
      : null,
    contact: row.contact ? { id: row.contact.id, name: contactName(row.contact) } : null,
    company: row.company ? { id: row.company.id, name: row.company.name } : null,
  };
}

// Folder counts and the open pipeline total for the sidebar.
export async function getInboxSummary(orgId: string, scope: Scope, userId: string) {
  const supabase = await createClient();
  const { data } = await scoped(
    supabase.from("lead_threads").select("folder, status, value").eq("org_id", orgId).limit(5000),
    scope,
    userId,
  );
  const counts = Object.fromEntries(FOLDERS.map((f) => [f.key, 0])) as Record<FolderKey, number>;
  let openValue = 0;
  let openCount = 0;
  for (const row of data ?? []) {
    const folder = FOLDERS.find((f) => f.folder === row.folder);
    if (folder) counts[folder.key] += 1;
    if (row.status === "open") {
      openCount += 1;
      openValue += Number(row.value ?? 0);
    }
  }
  return { counts, openValue, openCount };
}

// The threads in one folder, most urgent first.
export async function getThreads(orgId: string, folderKey: FolderKey, scope: Scope, userId: string) {
  const folder = folderByKey(folderKey)!;
  const supabase = await createClient();
  let query = scoped(threadQuery(supabase, orgId), scope, userId);
  query = folder.folder ? query.eq("folder", folder.folder) : query.not("folder", "is", null);
  query =
    folder.folder === null
      ? query.order("value", { ascending: false })
      : folder.key === "waiting"
      ? query.order("next_task_due_at", { ascending: true, nullsFirst: false })
      : folder.key === "going-cold"
        ? query.order("days_quiet", { ascending: false })
        : folder.key === "won"
          ? query.order("closed_at", { ascending: false })
          : query.order("last_touch_at", { ascending: false });
  const { data, error } = await query.limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toThread);
}

export async function getThread(orgId: string, leadId: string) {
  const supabase = await createClient();
  const { data } = await threadQuery(supabase, orgId).eq("id", leadId).maybeSingle();
  return data ? toThread(data) : null;
}

// Whether the org still has the onboarding sample data in it.
export async function hasSampleData(orgId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .contains("tags", ["sample"]);
  return Boolean(count);
}

// Every deal with one person, newest activity first (for their People page).
export async function getThreadsForContact(orgId: string, contactId: string) {
  const supabase = await createClient();
  const { data } = await threadQuery(supabase, orgId).eq("contact_id", contactId).order("last_touch_at", { ascending: false }).limit(100);
  return (data ?? []).map(toThread);
}

// The latest weekly review answer per deal, from the last two weeks.
export async function getRecentReviews(orgId: string, leadIds: string[]) {
  if (!leadIds.length) return new Map<string, string>();
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data } = await supabase
    .from("lead_reviews")
    .select("lead_id, answer, reviewed_at")
    .eq("org_id", orgId)
    .in("lead_id", leadIds)
    .gte("reviewed_at", since)
    .order("reviewed_at", { ascending: true });
  return new Map((data ?? []).map((r) => [r.lead_id, r.answer]));
}

// Where a deal's thread lives in the inbox.
export function threadPath(thread: { id: string; folder: string | null }, scope: Scope = "everyone") {
  const key = FOLDERS.find((f) => f.folder === thread.folder)?.key;
  return key ? inboxPath(scope, key, thread.id) : inboxPath(scope, "by-stage", thread.id);
}
