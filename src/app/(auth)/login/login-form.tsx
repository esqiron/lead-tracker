"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next, email, notice }: { next?: string; email?: string; notice?: string }) {
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
    </form>
  );
}
