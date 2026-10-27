import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { AcceptInvitationForm, CreateAccountAndAcceptForm, SignInAndAcceptForm } from "./invite-forms";

export const metadata: Metadata = { title: "Invitation" };

const ROLE_LABELS = { owner: "an owner", admin: "an admin", member: "a member", viewer: "a viewer" } as const;

const STATUS_MESSAGES: Record<string, string> = {
  accepted: "This invitation has already been used. Sign in to continue.",
  revoked: "This invitation was cancelled. Ask an admin to send a new one.",
  expired: "This invitation has expired. Ask an admin to send a new one.",
};

async function accountExists(email: string) {
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .ilike("email", pattern);
  return (count ?? 0) > 0;
}

async function InvitePageContent({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invite = data?.[0];

  if (!invite) {
    return (
      <AuthShell title="Invitation not found" description="Check that you copied the whole link, or ask for a new invite.">
        <Link href="/login" className={buttonClass("secondary", "w-full")}>
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  if (invite.status !== "pending") {
    return (
      <AuthShell title={`Join ${invite.org_name}`} description={STATUS_MESSAGES[invite.status]}>
        <Link href="/login" className={buttonClass("secondary", "w-full")}>
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  const description = (
    <>
      {invite.invited_by_name ? `${invite.invited_by_name} invited you` : "You've been invited"} to join{" "}
      <strong className="font-medium text-zinc-900 dark:text-zinc-100">{invite.org_name}</strong> as {ROLE_LABELS[invite.role]}.
    </>
  );

  const user = await getUser();
  if (user) {
    if (user.email?.toLowerCase() === invite.email.toLowerCase()) {
      return (
        <AuthShell title={`Join ${invite.org_name}`} description={description}>
          <AcceptInvitationForm token={token} />
        </AuthShell>
      );
    }
    return (
      <AuthShell title={`Join ${invite.org_name}`} description={description}>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          This invitation is for <strong className="font-medium">{invite.email}</strong>, but you&apos;re signed in as{" "}
          <strong className="font-medium">{user.email}</strong>.
        </p>
        <form action={`/auth/signout?next=/invite/${encodeURIComponent(token)}`} method="post">
          <button type="submit" className={buttonClass("primary", "w-full")}>
            Sign out and continue
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Join ${invite.org_name}`} description={description}>
      {(await accountExists(invite.email)) ? (
        <SignInAndAcceptForm token={token} email={invite.email} />
      ) : (
        <CreateAccountAndAcceptForm token={token} email={invite.email} />
      )}
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function InvitePage(props: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <InvitePageContent {...props} />
    </Suspense>
  );
}
