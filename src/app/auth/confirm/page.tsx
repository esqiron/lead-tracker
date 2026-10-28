import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { PageSpinner } from "@/components/page-spinner";
import { buttonClass } from "@/components/ui";
import { param } from "@/lib/forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

// Landing page for emailed password reset links. Using the one-time token
// takes a click (a POST), so email security scanners that open links in
// advance don't burn it.
async function ConfirmContent({ searchParams }: PageProps<"/auth/confirm">) {
  const sp = await searchParams;
  const tokenHash = param(sp.token_hash);
  if (!tokenHash || param(sp.type) !== "recovery") {
    return (
      <AuthShell title="This link isn't valid" description="Request a new password reset link from the sign-in page.">
        <a href="/forgot-password" className={buttonClass("secondary", "w-full")}>
          Get a new link
        </a>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Reset your password" description="Continue to choose a new password. The link works once and expires an hour after it was sent.">
      <form action="/auth/verify" method="post">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <button type="submit" className={buttonClass("primary", "w-full")}>
          Continue
        </button>
      </form>
    </AuthShell>
  );
}

export default function ConfirmPage(props: PageProps<"/auth/confirm">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ConfirmContent {...props} />
    </Suspense>
  );
}
