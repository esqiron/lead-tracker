import "server-only";
import { createClient } from "@/lib/supabase/server";
import { contactName, personName } from "@/lib/format";
import type { Database } from "@/lib/database.types";

export type Stage = Pick<
  Database["public"]["Tables"]["pipeline_stages"]["Row"],
  "id" | "name" | "position" | "probability" | "is_won" | "is_lost"
>;
export type Option = { id: string; name: string };

export async function getStages(orgId: string): Promise<Stage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id, name, position, probability, is_won, is_lost")
    .eq("org_id", orgId)
    .order("position");
  return data ?? [];
}

export async function getSources(orgId: string): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("lead_sources").select("id, name").eq("org_id", orgId).order("position");
  return data ?? [];
}

// Active members, for owner/assignee pickers.
export async function getMembers(orgId: string): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, profiles!memberships_user_id_fkey(full_name, email)")
    .eq("org_id", orgId)
    .eq("status", "active");
  return (data ?? [])
    .map((m) => ({ id: m.user_id, name: personName(m.profiles) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getContactOptions(orgId: string): Promise<(Option & { email: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("first_name")
    .limit(1000);
  return (data ?? []).map((c) => ({ id: c.id, name: contactName(c), email: c.email }));
}

export async function getCompanyNames(orgId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("name")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("name")
    .limit(1000);
  return (data ?? []).map((c) => c.name);
}
