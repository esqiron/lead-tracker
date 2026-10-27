import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getUser, instanceInitialized } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  link_invalid: "That link is invalid or has expired. Request a new one.",
};

async function LoginPageContent({ searchParams }: PageProps<"/login">) {
  if (!(await instanceInitialized())) redirect("/setup");
  if (await getUser()) redirect("/");

  const { next, error } = await searchParams;
  return (
    <AuthShell title="Sign in" description="Welcome back. Sign in to your workspace.">
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        notice={typeof error === "string" ? NOTICES[error] : undefined}
      />
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginPageContent {...props} />
    </Suspense>
  );
}
