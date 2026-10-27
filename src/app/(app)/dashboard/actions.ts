"use server";

import { revalidatePath } from "next/cache";
import { isAdminRole, requireReadyOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function clearSampleData() {
  const { org, role } = await requireReadyOrg();
  if (!isAdminRole(role)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_sample_data", { p_org: org.id });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
