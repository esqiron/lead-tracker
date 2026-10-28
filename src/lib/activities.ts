import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ActivityType = "note" | "call" | "email" | "meeting" | "task";

export type TimelineItem =
  | {
      kind: "activity";
      id: string;
      at: string;
      type: ActivityType;
      body: string | null;
      dueAt: string | null;
      completedAt: string | null;
      createdBy: string | null;
      assignedTo: string | null;
      author: string;
      // Set for notes that came in through a form or the API (unverified input).
      source: string | null;
      assignee: string;
      lead: { id: string; title: string } | null;
    }
  | {
      kind: "stage";
      id: string;
      at: string;
      leadId: string;
      fromStageId: string | null;
      toStageId: string | null;
      actor: string;
    };

const ACTIVITY_SELECT = `id, type, body, due_at, completed_at, created_at, created_by, assigned_to, source,
  author:profiles!activities_created_by_fkey(full_name, email),
  assignee:profiles!activities_assigned_to_fkey(full_name, email),
  lead:leads!activities_org_id_lead_id_fkey(id, title)`;

const name = (p: { full_name: string | null; email: string } | null) => (p ? p.full_name || p.email : "");

// Activities attached to a contact or any of the given leads, plus the stage
// changes of those leads, newest first.
export async function getTimeline(orgId: string, opts: { leadIds: string[]; contactId?: string }): Promise<TimelineItem[]> {
  const supabase = await createClient();
  const filters = [
    ...(opts.contactId ? [`contact_id.eq.${opts.contactId}`] : []),
    ...(opts.leadIds.length ? [`lead_id.in.(${opts.leadIds.join(",")})`] : []),
  ];
  if (!filters.length) return [];

  const [{ data: activities }, { data: history }] = await Promise.all([
    supabase.from("activities").select(ACTIVITY_SELECT).eq("org_id", orgId).or(filters.join(",")).order("created_at", { ascending: false }).limit(200),
    opts.leadIds.length
      ? supabase
          .from("lead_stage_history")
          .select("id, lead_id, changed_at, from_stage_id, to_stage_id, actor:profiles!lead_stage_history_changed_by_fkey(full_name, email)")
          .eq("org_id", orgId)
          .in("lead_id", opts.leadIds)
          .order("changed_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  const items: TimelineItem[] = [
    ...(activities ?? []).map((a) => ({
      kind: "activity" as const,
      id: a.id,
      at: a.created_at,
      type: a.type,
      body: a.body,
      dueAt: a.due_at,
      completedAt: a.completed_at,
      createdBy: a.created_by,
      assignedTo: a.assigned_to,
      author: name(a.author),
      source: a.source,
      assignee: name(a.assignee),
      lead: a.lead,
    })),
    ...(history ?? []).map((h) => ({
      kind: "stage" as const,
      id: String(h.id),
      at: h.changed_at,
      leadId: h.lead_id,
      fromStageId: h.from_stage_id,
      toStageId: h.to_stage_id,
      actor: name(h.actor),
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
