"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptInvitation, createAccountAndAccept, signInAndAccept } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvitation.bind(null, token), {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton className="w-full" pendingLabel="Joining…">
        Accept invitation
      </SubmitButton>
    </form>
  );
}

export function SignInAndAcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(signInAndAccept.bind(null, token), {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" value={email} disabled readOnly />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in and join
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

export function CreateAccountAndAcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(createAccountAndAccept.bind(null, token), {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" value={email} disabled readOnly />
      </Field>
      <Field label="Your name" htmlFor="full_name" error={errors.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm_password">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account and join
      </SubmitButton>
    </form>
  );
}
