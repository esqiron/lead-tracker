"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { findOrCreateCompany } from "@/lib/companies";
import { escapeLike, field, isEmail, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { userMessage } from "@/lib/errors";

export async function moveLead(leadId: string, stageId: string, lostReason?: string): Promise<{ error?: string }> {
  const { org, role } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };

  const supabase = await createClient();
  const { data: stage } = await supabase.from("pipeline_stages").select("is_lost").eq("id", stageId).eq("org_id", org.id).single();
  if (!stage) return { error: "That stage no longer exists." };

  const { error } = await supabase
    .from("leads")
    .update({ stage_id: stageId, ...(stage.is_lost ? { lost_reason: lostReason?.trim() || null } : {}) })
    .eq("id", leadId)
    .eq("org_id", org.id);
  if (error) return { error: userMessage(error) };

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function saveLead(leadId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { org, role, user } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };

  const title = field(formData, "title");
  const stageId = field(formData, "stage_id");
  const valueRaw = field(formData, "value").replace(/[\s,]/g, "");
  const value = valueRaw ? Number(valueRaw) : 0;
  const contactChoice = field(formData, "contact_id");
  const companyName = field(formData, "company");

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Give the lead a name.";
  if (title.length > 200) fieldErrors.title = "Keep it under 200 characters.";
  if (!stageId) fieldErrors.stage_id = "Pick a stage.";
  if (!Number.isFinite(value) || value < 0) fieldErrors.value = "Enter a positive amount.";

  const newContact = {
    first_name: field(formData, "contact_first_name"),
    last_name: field(formData, "contact_last_name"),
    email: field(formData, "contact_email").toLowerCase(),
    phone: field(formData, "contact_phone"),
  };
  if (contactChoice === "new") {
    if (!newContact.first_name && !newContact.last_name && !newContact.email) {
      fieldErrors.contact_first_name = "Add a name or email for the new contact.";
    }
    if (newContact.email && !isEmail(newContact.email)) fieldErrors.contact_email = "Enter a valid email address.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const ownerId = field(formData, "owner_id") || null;

  // Company: typed name wins; otherwise inherit the contact's company.
  let companyId: string | null = null;
  if (companyName) {
    const company = await findOrCreateCompany(supabase, org.id, companyName, ownerId ?? user.id);
    if ("error" in company) return { error: company.error };
    companyId = company.id;
  }

  let contactId: string | null = null;
  if (contactChoice === "new") {
    // Reuse an existing contact with the same email instead of failing on the duplicate.
    const existing = newContact.email
      ? (
          await supabase
            .from("contacts")
            .select("id, company_id")
            .eq("org_id", org.id)
            .is("deleted_at", null)
            .ilike("email", escapeLike(newContact.email))
            .maybeSingle()
        ).data
      : null;
    if (existing) {
      contactId = existing.id;
      companyId ??= existing.company_id;
    } else {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          org_id: org.id,
          first_name: newContact.first_name || null,
          last_name: newContact.last_name || null,
          email: newContact.email || null,
          phone: newContact.phone || null,
          company_id: companyId,
          owner_id: ownerId ?? user.id,
        })
        .select("id")
        .single();
      if (error || !data) return { error: userMessage(error, "Couldn't create the contact.") };
      contactId = data.id;
    }
  } else if (contactChoice) {
    contactId = contactChoice;
    if (!companyId) {
      const { data } = await supabase.from("contacts").select("company_id").eq("id", contactChoice).maybeSingle();
      companyId = data?.company_id ?? null;
    }
  }

  const values = {
    title,
    stage_id: stageId,
    value,
    contact_id: contactId,
    company_id: companyId,
    owner_id: ownerId,
    source_id: field(formData, "source_id") || null,
    expected_close_date: field(formData, "expected_close_date") || null,
    lost_reason: field(formData, "lost_reason") || null,
  };

  let id = leadId;
  if (leadId) {
    const { error } = await supabase.from("leads").update(values).eq("id", leadId).eq("org_id", org.id);
    if (error) return { error: userMessage(error) };
  } else {
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...values, org_id: org.id })
      .select("id")
      .single();
    if (error || !data) return { error: userMessage(error, "Couldn't create the lead.") };
    id = data.id;
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  redirect(`/leads/${id}`);
}

export async function trashLead(leadId: string): Promise<FormState> {
  const { org } = await requireReadyOrg();
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("org_id", org.id);
  if (error) return { error: userMessage(error) };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}
