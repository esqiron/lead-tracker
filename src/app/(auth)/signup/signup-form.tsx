"use client";

import { useActionState } from "react";
import { signUp } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TermsConsent } from "@/components/terms-consent";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export function SignupForm() {
  const [state, action] = useActionState(signUp, {});
  const errors = state.fieldErrors ?? {};

  if (state.message) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing after a few minutes? Check your spam folder, or{" "}
          {/* A full load, to start over with an empty form. */}
          <a href="/signup" className="text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
            try again
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Your name" htmlFor="full_name" error={errors.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" maxLength={120} required autoFocus />
      </Field>
      <Field label="Work email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={errors.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password">
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <TermsConsent errors={errors} />
      {/* Spam trap: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <SubmitButton arrow className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
