import "server-only";
import { createClient } from "@/lib/supabase/server";
import { contactName, todayIn } from "@/lib/format";

// The weekly review (supabase/migrations/…_weekly_review.sql): which deals it
// covers, whether it's due, and how far along a session is.

export type ReviewScope = "mine" | "everyone";

export const REVIEW_REASONS: Record<string, string> = {
  close_passed: "Close date passed",
  quiet: "Gone quiet",
  no_next_step: "No next step",
  no_owner: "No owner",
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type Candidate = {
  leadId: string;
  title: string;
  value: number;
  stageId: string;
  probability: number;
  ownerId: string | null;
  expectedCloseDate: string | null;
  daysQuiet: number;
  nextTaskBody: string | null;
  needsLook: boolean;
  reasons: string[];
  who: string;
};

export async function getCandidates(orgId: string, scope: ReviewScope): Promise<Candidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_candidates", { p_org: orgId, p_scope: scope });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const contactIds = [...new Set(rows.map((r) => r.contact_id).filter(Boolean))] as string[];
  const companyIds = [...new Set(rows.map((r) => r.company_id).filter(Boolean))] as string[];
  const [{ data: contacts }, { data: companies }] = await Promise.all([
    contactIds.length ? supabase.from("contacts").select("id, first_name, last_name, email").in("id", contactIds) : Promise.resolve({ data: [] }),
    companyIds.length ? supabase.from("companies").select("id, name").in("id", companyIds) : Promise.resolve({ data: [] }),
  ]);
  const contact = new Map((contacts ?? []).map((c) => [c.id, contactName(c)]));
  const company = new Map((companies ?? []).map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    leadId: r.lead_id,
    title: r.title,
    value: Number(r.value),
    stageId: r.stage_id,
    probability: r.probability,
    ownerId: r.owner_id,
    expectedCloseDate: r.expected_close_date,
    daysQuiet: r.days_quiet,
    nextTaskBody: r.next_task_body,
    needsLook: r.needs_look,
    reasons: r.reasons ?? [],
    who: [r.contact_id ? contact.get(r.contact_id) : "", r.company_id ? company.get(r.company_id) : ""].filter(Boolean).join(" · "),
  }));
}

export const weighted = (list: { value: number; probability: number }[]) => list.reduce((sum, c) => sum + (c.value * c.probability) / 100, 0);

// About a minute for a deal that needs a look, ten seconds for one that doesn't.
export function estimateMinutes(needsLook: number, fine: number) {
  return Math.max(1, Math.ceil((needsLook * 60 + fine * 10) / 60));
}

// The most recent review day (yyyy-MM-dd, org time), today included.
export function lastReviewDay(timezone: string, reviewDay: number) {
  const today = todayIn(timezone);
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - reviewDay + 7) % 7));
  return d.toISOString().slice(0, 10);
}

export type Answered = {
  leadId: string;
  answer: "kept" | "pushed" | "lost" | "skipped";
  closeTo: string | null;
  lostReason: string | null;
  nextTaskId: string | null;
};

export async function getSession(orgId: string, sessionId: string) {
  const supabase = await createClient();
  const [{ data: session }, { data: reviews }] = await Promise.all([
    supabase.from("review_sessions").select("*").eq("org_id", orgId).eq("id", sessionId).maybeSingle(),
    supabase
      .from("lead_reviews")
      .select("lead_id, answer, close_to, lost_reason, next_task_id, reviewed_at")
      .eq("org_id", orgId)
      .eq("session_id", sessionId)
      .order("reviewed_at", { ascending: true }),
  ]);
  if (!session) return null;
  // Latest answer per deal (going back to a deal answers it again).
  const latest = new Map<string, Answered>();
  for (const r of reviews ?? []) {
    latest.set(r.lead_id, {
      leadId: r.lead_id,
      answer: r.answer as Answered["answer"],
      closeTo: r.close_to,
      lostReason: r.lost_reason,
      nextTaskId: r.next_task_id,
    });
  }
  return { session, answered: latest };
}

// Due, in progress or done, for the inbox sidebar and the start page.
export async function getReviewStatus(org: { id: string; timezone: string; review_day: number }, userId: string) {
  const supabase = await createClient();
  const since = lastReviewDay(org.timezone, org.review_day);
  const { data: last } = await supabase
    .from("review_sessions")
    .select("id, scope, completed_at, started_at, lead_count")
    .eq("org_id", org.id)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Review days are org-local dates; a session counts if it ended on or after one.
  const doneSince = last?.completed_at ? todayLocal(last.completed_at, org.timezone) >= since : false;
  const open = last && !last.completed_at && todayLocal(last.started_at, org.timezone) >= since ? last : null;
  return { since, done: doneSince, openSessionId: open?.id ?? null, openScope: (open?.scope ?? "mine") as ReviewScope };
}

function todayLocal(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return parts; // en-CA formats as yyyy-MM-dd
}

// Counts only, for the inbox sidebar card.
export async function countCandidates(orgId: string, scope: ReviewScope) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("review_candidates", { p_org: orgId, p_scope: scope });
  const rows = data ?? [];
  const needs = rows.filter((r) => r.needs_look).length;
  return { total: rows.length, needs, minutes: estimateMinutes(needs, rows.length - needs) };
}
