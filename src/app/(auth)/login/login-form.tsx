"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next, email, notice, canSignUp }: { next?: string; email?: string; notice?: string; canSignUp?: boolean }) {
  const [state, action] = useActionState(signIn, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : notice ? <Alert>{notice}</Alert> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required autoFocus={!email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus={Boolean(email)} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
          Forgot your password?
        </Link>
      </p>
      {canSignUp ? (
        <p className="border-t border-zinc-200 pt-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          New to Lead Tracker?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100">
            Create an account
          </Link>
        </p>
      ) : null}
    </form>
  );
}
