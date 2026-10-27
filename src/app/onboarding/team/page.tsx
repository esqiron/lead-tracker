import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { requireOnboarding } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { Alert, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { continueFromTeam, revokeInvitation } from "../actions";
import { BackLink, WizardFrame } from "../wizard-frame";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Team" };

const ROLES = [
  { role: "Admin", description: "Everything except deleting the organization: members, pipeline, settings, exports." },
  { role: "Member", description: "Adds and works leads, contacts and tasks. Deletes only their own records." },
  { role: "Viewer", description: "Read-only access to leads, contacts and reports." },
];

async function TeamStepContent() {
  const { org } = await requireOnboarding("team");
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("invitations")
    .select("id, email, role, expires_at")
    .eq("org_id", org!.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at");

  const emailEnabled = isEmailConfigured();

  return (
    <WizardFrame
      step="team"
      furthest={org!.setup_step}
      title="Invite your team"
      description="Invitations are valid for 7 days. You can always invite more people later."
    >
      <div className="space-y-8">
        {!emailEnabled ? (
          <Alert tone="info">
            Email isn&apos;t set up on this server, so you&apos;ll get a link to share with each person yourself. Add SMTP
            settings to send invitations automatically (see docs/email-setup.md).
          </Alert>
        ) : null}

        <InviteForm emailEnabled={emailEnabled} />

        {pending?.length ? (
          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Pending invitations</h2>
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {pending.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {invite.email} <span className="text-zinc-500">· {invite.role}</span>
                  </span>
                  <form action={revokeInvitation}>
                    <input type="hidden" name="id" value={invite.id} />
                    <Button type="submit" variant="danger" className="h-8 px-2">
                      Revoke
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
          <summary className="cursor-pointer font-medium text-zinc-900 dark:text-zinc-100">What can each role do?</summary>
          <dl className="mt-3 space-y-2">
            {ROLES.map((r) => (
              <div key={r.role}>
                <dt className="font-medium text-zinc-800 dark:text-zinc-200">{r.role}</dt>
                <dd className="text-zinc-600 dark:text-zinc-400">{r.description}</dd>
              </div>
            ))}
          </dl>
        </details>

        <form action={continueFromTeam} className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <BackLink to="sources" />
          <SubmitButton variant={pending?.length ? "primary" : "secondary"} pendingLabel="Saving…">
            {pending?.length ? "Continue" : "Skip for now"}
          </SubmitButton>
        </form>
      </div>
    </WizardFrame>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function TeamStep() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <TeamStepContent />
    </Suspense>
  );
}
