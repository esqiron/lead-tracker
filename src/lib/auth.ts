import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deploymentMode } from "@/lib/env";
import { resumeStep, stepIndex, type WizardStep } from "@/lib/onboarding";
import type { Database } from "@/lib/database.types";

export type OrgRole = Database["public"]["Enums"]["org_role"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type Context = {
  user: { id: string; email: string; fullName: string | null };
  org: Organization | null;
  role: OrgRole | null;
};

export const ORG_COOKIE = "lt_org";

export function isAdminRole(role: OrgRole | null) {
  return role === "owner" || role === "admin";
}

// Viewers are read-only; everyone else can create and edit records.
export function canEditRole(role: OrgRole | null) {
  return role === "owner" || role === "admin" || role === "member";
}

// Mirrors guard_record_update(): admins, or the record's owner.
export function canTrashRecord(ctx: { role: OrgRole | null; user: { id: string } }, ownerId: string | null) {
  return isAdminRole(ctx.role) || (canEditRole(ctx.role) && ownerId === ctx.user.id);
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

// The signed-in user plus their active organization (picked by cookie,
// falling back to their oldest membership).
export const getContext = cache(async (): Promise<Context | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("org_id, role, organizations(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at"),
  ]);

  const preferred = (await cookies()).get(ORG_COOKIE)?.value;
  const active = memberships?.find((m) => m.org_id === preferred) ?? memberships?.[0];

  return {
    user: { id: user.id, email: user.email ?? "", fullName: profile?.full_name ?? null },
    org: active?.organizations ?? null,
    role: active?.role ?? null,
  };
});

export async function setActiveOrg(orgId: string) {
  (await cookies()).set(ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function instanceInitialized() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("instance_initialized");
  return Boolean(data);
}

// A self-hosted instance runs one organization. Once it exists, people
// without a membership need an invite rather than creating their own.
export async function canCreateOrganization() {
  if (deploymentMode() === "hosted") return true;
  const { count } = await createAdminClient()
    .from("organizations")
    .select("id", { count: "exact", head: true });
  return (count ?? 0) === 0;
}

export async function homePath(ctx: Context | null): Promise<string> {
  if (!ctx) return (await instanceInitialized()) ? "/login" : "/setup";
  if (!ctx.org) {
    return (await canCreateOrganization()) ? "/onboarding/organization" : "/no-access";
  }
  if (!ctx.org.setup_completed_at) {
    return isAdminRole(ctx.role) ? `/onboarding/${resumeStep(ctx.org.setup_step)}` : "/pending";
  }
  return "/dashboard";
}

export async function requireContext(): Promise<Context> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}

// For app pages that need a fully set-up organization.
export async function requireReadyOrg() {
  const ctx = await requireContext();
  if (!ctx.org?.setup_completed_at || !ctx.role) redirect(await homePath(ctx));
  return { ...ctx, org: ctx.org, role: ctx.role };
}

// For wizard steps. Admins may revisit earlier steps but not skip ahead.
export async function requireOnboarding(step: WizardStep) {
  const ctx = await requireContext();

  if (!ctx.org) {
    if (step !== "organization" || !(await canCreateOrganization())) {
      redirect(await homePath(ctx));
    }
    return { ...ctx, org: null };
  }
  if (ctx.org.setup_completed_at || !isAdminRole(ctx.role)) {
    redirect(await homePath(ctx));
  }
  if (stepIndex(step) > stepIndex(ctx.org.setup_step)) {
    redirect(`/onboarding/${resumeStep(ctx.org.setup_step)}`);
  }
  return ctx;
}
