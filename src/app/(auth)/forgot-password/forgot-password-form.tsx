"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
