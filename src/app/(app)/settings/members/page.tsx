import { Suspense } from "react";
import type { Metadata } from "next";
import { revokeInvitation } from "@/app/actions/invitations";
import { InviteForm } from "@/components/invite-form";
import { PageSpinner } from "@/components/page-spinner";
import { Alert, Badge, Button } from "@/components/ui";
import { requireSettingsAdmin } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { formatDate, initials, personName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SettingsSection } from "../settings-section";
import { RemoveMemberButton, ResetPasswordButton, RoleSelect, TransferOwnershipForm } from "./member-controls";

export const metadata: Metadata = { title: "Members" };

const ROLE_ORDER = { owner: 0, admin: 1, member: 2, viewer: 3 } as const;

async function MembersContent() {
  const ctx = await requireSettingsAdmin();
  const { org } = ctx;
  const supabase = await createClient();

  const [{ data: memberships }, { data: invites }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, status, created_at, profiles!memberships_user_id_fkey(full_name, email)")
      .eq("org_id", org.id),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("org_id", org.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const members = (memberships ?? []).sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || personName(a.profiles).localeCompare(personName(b.profiles)),
  );
  const now = new Date().toISOString();
  const emailEnabled = isEmailConfigured();
  const isOwner = ctx.role === "owner";

  return (
    <div className="space-y-12">
      <SettingsSection title="Members" description={`${members.length} ${members.length === 1 ? "person has" : "people have"} access to ${org.name}.`}>
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {members.map((m) => {
            const name = personName(m.profiles);
            const isSelf = m.user_id === ctx.user.id;
            const canManage = m.role !== "owner";
            return (
              <li key={m.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {name}
                      {isSelf ? <span className="font-normal text-zinc-500"> (you)</span> : null}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {m.profiles.email} · joined {formatDate(m.created_at, org)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                  {canManage ? <RoleSelect membershipId={m.id} role={m.role} name={name} /> : <Badge>Owner</Badge>}
                  {!isSelf && (canManage || isOwner) ? <ResetPasswordButton userId={m.user_id} /> : null}
                  {canManage ? <RemoveMemberButton membershipId={m.id} name={name} isSelf={isSelf} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </SettingsSection>

      <SettingsSection title="Invite people" description="Invitations expire after 7 days. Inviting someone again replaces their old link.">
        <div className="space-y-6">
          {!emailEnabled ? (
            <Alert tone="info">Email isn&apos;t set up on this server, so you&apos;ll get a link to share with each person yourself.</Alert>
          ) : null}
          <InviteForm emailEnabled={emailEnabled} />
          {invites?.length ? (
            <div>
              <h3 className="mb-2 text-sm font-medium">Pending invitations</h3>
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
                {invites.map((invite) => {
                  const expired = invite.expires_at < now;
                  return (
                    <li key={invite.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 truncate">
                        {invite.email} <span className="text-zinc-500">· {invite.role}</span>
                        {expired ? (
                          <span className="ml-2">
                            <Badge tone="warning">Expired</Badge>
                          </span>
                        ) : (
                          <span className="text-zinc-500"> · expires {formatDate(invite.expires_at, org)}</span>
                        )}
                      </span>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={invite.id} />
                        <Button type="submit" variant="danger" className="h-8 px-2 text-xs">
                          {expired ? "Dismiss" : "Revoke"}
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      {isOwner && members.length > 1 ? (
        <SettingsSection
          title="Transfer ownership"
          description="The new owner gets full control, including deleting the organization. You'll stay on as an admin."
        >
          <TransferOwnershipForm
            candidates={members.filter((m) => m.user_id !== ctx.user.id && m.status === "active").map((m) => ({ id: m.user_id, name: personName(m.profiles) }))}
          />
        </SettingsSection>
      ) : null}
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function MembersPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <MembersContent />
    </Suspense>
  );
}
