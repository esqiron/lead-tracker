"use server";

import { revalidatePath } from "next/cache";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { field, type FormState } from "@/lib/forms";
import { zonedToISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { userMessage } from "@/lib/errors";

const TYPES = ["note", "call", "email", "meeting", "task"] as const;

// Only revalidate pages this feature renders on. Inbox threads also change the
// folder counts and lists, so the whole inbox layout is refreshed.
function revalidateRecordPath(path: string) {
  if (/^\/(leads|contacts)\/[0-9a-f-]{36}$/.test(path)) revalidatePath(path);
  else if (/^\/inbox\/((mine|everyone)\/[a-z-]+|review\/[0-9a-f-]{36})\/[0-9a-f-]{36}$/.test(path)) revalidatePath("/inbox", "layout");
}

export async function addActivity(_: FormState, formData: FormData): Promise<FormState> {
  const { org, role, user } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };

  const type = field(formData, "type") as (typeof TYPES)[number];
  const body = field(formData, "body");
  const due = field(formData, "due_at");
  const leadId = field(formData, "lead_id") || null;
  const contactId = field(formData, "contact_id") || null;

  if (!TYPES.includes(type)) return { error: "Pick an activity type." };
  if (!body) return { fieldErrors: { body: type === "task" ? "Describe the task." : "Write something first." } };
  if (body.length > 5000) return { fieldErrors: { body: "Keep it under 5,000 characters." } };
  if (!leadId && !contactId) return { error: "Nothing to attach this to." };

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    org_id: org.id,
    type,
    body,
    lead_id: leadId,
    contact_id: contactId,
    due_at: type === "task" && due ? zonedToISO(due, org.timezone) : null,
    assigned_to: type === "task" ? field(formData, "assigned_to") || user.id : null,
  });
  if (error) return { error: userMessage(error) };

  revalidateRecordPath(field(formData, "path"));
  return { message: "saved" };
}

export async function toggleTask(formData: FormData) {
  const { org } = await requireReadyOrg();
  const supabase = await createClient();
  const id = field(formData, "id");
  const done = field(formData, "done") === "true";
  await supabase
    .from("activities")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("org_id", org.id);
  revalidateRecordPath(field(formData, "path"));
}

export async function deleteActivity(formData: FormData) {
  const { org } = await requireReadyOrg();
  const supabase = await createClient();
  await supabase.from("activities").delete().eq("id", field(formData, "id")).eq("org_id", org.id);
  revalidateRecordPath(field(formData, "path"));
}
