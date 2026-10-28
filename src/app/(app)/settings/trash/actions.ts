"use server";

import { revalidatePath } from "next/cache";
import { requireSettingsAdmin } from "@/lib/auth";
import { userMessage } from "@/lib/errors";
import { field } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const TABLES = ["leads", "contacts", "companies"] as const;
type Table = (typeof TABLES)[number];

function read(formData: FormData): { table: Table; id: string } | null {
  const table = field(formData, "table") as Table;
  const id = field(formData, "id");
  if (!TABLES.includes(table) || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return { table, id };
}

function done() {
  revalidatePath("/settings/trash");
  revalidatePath("/leads");
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
}

export async function restoreRecord(formData: FormData) {
  const { org } = await requireSettingsAdmin();
  const target = read(formData);
  if (!target) return;
  const supabase = await createClient();
  const { error } = await supabase.from(target.table).update({ deleted_at: null }).eq("id", target.id).eq("org_id", org.id);
  if (error) throw new Error(userMessage(error));
  done();
}

// Contacts are erased (with their leads, activity and audit history); leads
// and companies are deleted outright.
export async function deleteForever(formData: FormData) {
  const { org } = await requireSettingsAdmin();
  const target = read(formData);
  if (!target) return;
  const supabase = await createClient();
  const { error } =
    target.table === "contacts"
      ? await supabase.rpc("erase_contact", { p_contact: target.id })
      : await supabase.from(target.table).delete().eq("id", target.id).eq("org_id", org.id).not("deleted_at", "is", null);
  if (error) throw new Error(userMessage(error));
  done();
}
