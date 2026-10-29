"use server";

import { revalidatePath } from "next/cache";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { userMessage } from "@/lib/errors";
import { contactName, zonedToISO } from "@/lib/format";
import { escapeLike, isEmail } from "@/lib/forms";
import { FOLDERS } from "@/lib/inbox";
import { isLawfulBasis } from "@/lib/privacy";
import { createClient } from "@/lib/supabase/server";

const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "task"] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];
const isActivityType = (value: string): value is ActivityType => (ACTIVITY_TYPES as readonly string[]).includes(value);
const isDirection = (value: string) => value === "inbound" || value === "outbound";
const isUuid = (value: string) => /^[0-9a-f-]{36}$/.test(value);
const clean = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function refreshInbox(leadId?: string) {
  revalidatePath("/inbox", "layout");
  revalidatePath("/leads");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

// Where a lead's thread lives in the inbox, for links from search results.
function threadFolderKey(folder: string | null) {
  return FOLDERS.find((f) => f.folder === folder)?.key ?? "waiting";
}

export type StartInput = {
  contactId?: string;
  person?: { firstName?: string; lastName?: string; email?: string; phone?: string; title?: string; lawfulBasis?: string };
  company?: string;
  companyWebsite?: string;
  title: string;
  value?: string;
  stageId?: string;
  ownerId?: string;
  sourceId?: string;
  closeDate?: string;
  first?: { type?: string; body?: string; direction?: string; outcome?: string };
  next?: { body?: string; due?: string };
};

export type StartResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  leadId?: string;
  createdContactId?: string;
  createdCompanyId?: string;
  path?: string;
};

// "New conversation": the person, company, deal, first entry and next step in
// one transaction (start_conversation in supabase/migrations/…_compose.sql).
export async function startConversation(input: StartInput): Promise<StartResult> {
  const { org, role } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };

  const title = clean(input.title, 200);
  const valueRaw = clean(input.value).replace(/[\s,€$£]/g, "");
  const value = valueRaw ? Number(valueRaw) : 0;
  const person = {
    first_name: clean(input.person?.firstName, 100),
    last_name: clean(input.person?.lastName, 100),
    email: clean(input.person?.email, 200).toLowerCase(),
    phone: clean(input.person?.phone, 50),
    title: clean(input.person?.title, 100),
    lawful_basis: clean(input.person?.lawfulBasis, 40),
  };
  const contactId = clean(input.contactId, 36);
  const firstType = clean(input.first?.type, 10) || "note";
  const closeDate = clean(input.closeDate, 10);

  const fieldErrors: Record<string, string> = {};
  if (contactId && !isUuid(contactId)) fieldErrors.with = "Pick the person again.";
  if (!contactId && !person.first_name && !person.last_name && !person.email) fieldErrors.with = "Who is it with? Add a name or an email.";
  if (person.email && !isEmail(person.email)) fieldErrors.email = "Enter a valid email address.";
  if (person.lawful_basis && !isLawfulBasis(person.lawful_basis)) fieldErrors.lawful_basis = "Pick a lawful basis.";
  if (!title) fieldErrors.title = "Say what it's about, e.g. the project name.";
  if (!Number.isFinite(value) || value < 0) fieldErrors.value = "Enter a positive amount.";
  if (closeDate && !/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) fieldErrors.close_date = "Pick a date.";
  if (!isActivityType(firstType) || firstType === "task") fieldErrors.first = "Pick what happened.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const due = clean(input.next?.due, 16);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_org: org.id,
    p_payload: {
      contact_id: contactId || null,
      person: contactId ? null : person,
      company_name: clean(input.company, 200) || null,
      company_website: clean(input.companyWebsite, 200) || null,
      lead: {
        title,
        value: String(value),
        stage_id: isUuid(clean(input.stageId)) ? clean(input.stageId) : null,
        owner_id: isUuid(clean(input.ownerId)) ? clean(input.ownerId) : null,
        source_id: isUuid(clean(input.sourceId)) ? clean(input.sourceId) : null,
        expected_close_date: closeDate || null,
      },
      first: {
        type: firstType,
        body: clean(input.first?.body, 5000),
        direction: isDirection(clean(input.first?.direction)) ? clean(input.first?.direction) : null,
        outcome: clean(input.first?.outcome, 40) || null,
      },
      next: { body: clean(input.next?.body, 500), due_at: due ? zonedToISO(due, org.timezone) : null },
    },
  });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { email: "Someone with this email already exists, but you can't see them. Ask an admin." } };
    return { error: userMessage(error) };
  }

  const result = data as { lead_id: string; contact_id: string; company_id: string | null; contact_created: boolean; company_created: boolean };
  const { data: thread } = await supabase.from("lead_threads").select("folder").eq("id", result.lead_id).maybeSingle();
  refreshInbox(result.lead_id);
  revalidatePath("/contacts");
  return {
    leadId: result.lead_id,
    createdContactId: result.contact_created ? result.contact_id : undefined,
    createdCompanyId: result.company_created && result.company_id ? result.company_id : undefined,
    path: `/inbox/mine/${threadFolderKey(thread?.folder ?? null)}/${result.lead_id}`,
  };
}

// Undo for "Conversation started": moves the new deal (and the person and
// company, if they were created with it) to the trash.
export async function undoStartConversation(leadId: string, createdContactId?: string, createdCompanyId?: string): Promise<{ error?: string }> {
  const { org } = await requireReadyOrg();
  if (!isUuid(leadId)) return { error: "Nothing to undo." };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("leads").update({ deleted_at: now }).eq("id", leadId).eq("org_id", org.id);
  if (error) return { error: userMessage(error) };
  if (createdContactId && isUuid(createdContactId)) {
    await supabase.from("contacts").update({ deleted_at: now }).eq("id", createdContactId).eq("org_id", org.id);
  }
  if (createdCompanyId && isUuid(createdCompanyId)) {
    await supabase.from("companies").update({ deleted_at: now }).eq("id", createdCompanyId).eq("org_id", org.id);
  }
  refreshInbox(leadId);
  revalidatePath("/contacts");
  return {};
}

export type PersonMatch = { id: string; name: string; email: string | null; title: string | null; company: string | null };

// People for the "With" field, by name or email.
export async function searchPeople(query: string): Promise<PersonMatch[]> {
  const { org } = await requireReadyOrg();
  const q = clean(query, 80);
  if (q.length < 2) return [];
  const like = `%${escapeLike(q)}%`;
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, title, company:companies!contacts_org_id_company_id_fkey(name)")
    .eq("org_id", org.id)
    .is("deleted_at", null)
    .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
    .order("first_name")
    .limit(8);
  return (data ?? []).map((c) => ({ id: c.id, name: contactName(c), email: c.email, title: c.title, company: c.company?.name ?? null }));
}

export type Similar = { emailMatch: PersonMatch | null; nameMatches: PersonMatch[]; company: { name: string; website: string | null } | null };

// Duplicate check for a new person: the same email, the same name, and a
// company that already uses the email's domain.
export async function findSimilar(input: { firstName?: string; lastName?: string; email?: string }): Promise<Similar> {
  const { org } = await requireReadyOrg();
  const email = clean(input.email, 200).toLowerCase();
  const first = clean(input.firstName, 100);
  const last = clean(input.lastName, 100);
  const domain = email.includes("@") ? email.split("@")[1] : "";
  const supabase = await createClient();
  const select = "id, first_name, last_name, email, title, company:companies!contacts_org_id_company_id_fkey(name)";
  const toMatch = (c: { id: string; first_name: string | null; last_name: string | null; email: string | null; title: string | null; company: { name: string } | null }) => ({
    id: c.id,
    name: contactName(c),
    email: c.email,
    title: c.title,
    company: c.company?.name ?? null,
  });

  const [byEmail, byName, byDomain] = await Promise.all([
    email && isEmail(email)
      ? supabase.from("contacts").select(select).eq("org_id", org.id).is("deleted_at", null).ilike("email", escapeLike(email)).limit(1)
      : Promise.resolve({ data: [] }),
    first && last
      ? supabase.from("contacts").select(select).eq("org_id", org.id).is("deleted_at", null).ilike("first_name", escapeLike(first)).ilike("last_name", escapeLike(last)).limit(3)
      : Promise.resolve({ data: [] }),
    domain && !/^(gmail|googlemail|outlook|hotmail|yahoo|icloud|proton|protonmail|gmx|live)\./.test(domain)
      ? supabase.from("companies").select("name, website").eq("org_id", org.id).is("deleted_at", null).ilike("website", `%${escapeLike(domain)}%`).limit(1)
      : Promise.resolve({ data: [] }),
  ]);

  const emailMatch = byEmail.data?.[0] ? toMatch(byEmail.data[0]) : null;
  return {
    emailMatch,
    nameMatches: (byName.data ?? []).map(toMatch).filter((m) => m.id !== emailMatch?.id),
    company: byDomain.data?.[0] ?? null,
  };
}

export type LeadMatch = { id: string; title: string; who: string; path: string };

// "Log something on an existing deal": find the thread to open.
export async function searchLeads(query: string): Promise<LeadMatch[]> {
  const { org } = await requireReadyOrg();
  const q = clean(query, 80);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_threads")
    .select("id, title, folder, contact:contacts!leads_org_id_contact_id_fkey(first_name, last_name, email), company:companies!leads_org_id_company_id_fkey(name)")
    .eq("org_id", org.id)
    .ilike("title", `%${escapeLike(q)}%`)
    .order("last_touch_at", { ascending: false })
    .limit(8);
  return (data ?? []).map((l) => ({
    id: l.id!,
    title: l.title ?? "",
    who: [l.contact ? contactName(l.contact) : "", l.company?.name].filter(Boolean).join(" · "),
    path: `/inbox/everyone/${threadFolderKey(l.folder)}/${l.id}`,
  }));
}

export type LogInput = {
  leadId: string;
  type: string;
  body?: string;
  direction?: string;
  outcome?: string;
  due?: string;
  assignedTo?: string;
  moveToStageId?: string;
  lostReason?: string;
  completeTaskId?: string;
  next?: { body?: string; due?: string };
};

// The thread composer: an entry plus, optionally, a stage move, the current
// next step ticked off and a new one set — in one transaction (log_activity).
export async function logToThread(input: LogInput): Promise<{ error?: string }> {
  const { org, role } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };
  const leadId = clean(input.leadId, 36);
  const type = clean(input.type, 10);
  const body = clean(input.body, 5001);
  if (!isUuid(leadId)) return { error: "Open a conversation first." };
  if (!isActivityType(type)) return { error: "Pick what you're logging." };
  if (body.length > 5000) return { error: "Keep it under 5,000 characters." };
  const moveTo = clean(input.moveToStageId, 36);
  if (!body && !moveTo && !clean(input.next?.body)) return { error: type === "task" ? "Describe the next step." : "Write something first." };

  const due = clean(input.due, 16);
  const nextDue = clean(input.next?.due, 16);
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_activity", {
    p_org: org.id,
    p_payload: {
      lead_id: leadId,
      type,
      body,
      direction: isDirection(clean(input.direction)) ? clean(input.direction) : null,
      outcome: clean(input.outcome, 40) || null,
      due_at: due ? zonedToISO(due, org.timezone) : null,
      assigned_to: isUuid(clean(input.assignedTo)) ? clean(input.assignedTo) : null,
      move_to_stage_id: isUuid(moveTo) ? moveTo : null,
      lost_reason: clean(input.lostReason, 300) || null,
      complete_task_id: isUuid(clean(input.completeTaskId)) ? clean(input.completeTaskId) : null,
      next: { body: clean(input.next?.body, 500), due_at: nextDue ? zonedToISO(nextDue, org.timezone) : null },
    },
  });
  if (error) return { error: userMessage(error) };
  refreshInbox(leadId);
  return {};
}

