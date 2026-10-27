import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { escapeLike } from "@/lib/forms";

// Companies are created implicitly from a typed name: reuse a match
// (case-insensitive) or add a new one.
export async function findOrCreateCompany(
  supabase: SupabaseClient<Database>,
  orgId: string,
  name: string,
  ownerId: string | null,
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .ilike("name", escapeLike(name))
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("companies")
    .insert({ org_id: orgId, name, owner_id: ownerId })
    .select("id")
    .single();
  return data ?? { error: error?.message ?? "Couldn't save the company." };
}
