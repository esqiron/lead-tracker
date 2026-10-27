"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { findOrCreateCompany } from "@/lib/companies";
import { field, isEmail, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export async function saveContact(contactId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { org, role, user } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };

  const values = {
    first_name: field(formData, "first_name") || null,
    last_name: field(formData, "last_name") || null,
    email: field(formData, "email").toLowerCase() || null,
    phone: field(formData, "phone") || null,
    title: field(formData, "title") || null,
    owner_id: field(formData, "owner_id") || null,
    notes: field(formData, "notes") || null,
    tags: [
      ...new Set(
        field(formData, "tags")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
  };

  const fieldErrors: Record<string, string> = {};
  if (!values.first_name && !values.last_name && !values.email) fieldErrors.first_name = "Add at least a name or an email.";
  if (values.email && !isEmail(values.email)) fieldErrors.email = "Enter a valid email address.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const companyName = field(formData, "company");
  let companyId: string | null = null;
  if (companyName) {
    const company = await findOrCreateCompany(supabase, org.id, companyName, values.owner_id ?? user.id);
    if ("error" in company) return { error: company.error };
    companyId = company.id;
  }

  const row = { ...values, company_id: companyId };
  let id = contactId;
  if (contactId) {
    const { error } = await supabase.from("contacts").update(row).eq("id", contactId).eq("org_id", org.id);
    if (error) return duplicateOr(error);
  } else {
    const { data, error } = await supabase
      .from("contacts")
      .insert({ ...row, org_id: org.id })
      .select("id")
      .single();
    if (error || !data) return duplicateOr(error);
    id = data.id;
  }

  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

function duplicateOr(error: { code?: string; message: string } | null): FormState {
  if (error?.code === "23505") return { fieldErrors: { email: "Another contact already uses this email." } };
  return { error: error?.message ?? "Couldn't save the contact." };
}

export async function trashContact(contactId: string): Promise<FormState> {
  const { org } = await requireReadyOrg();
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("org_id", org.id);
  if (error) return { error: error.message };

  revalidatePath("/contacts");
  redirect("/contacts");
}
