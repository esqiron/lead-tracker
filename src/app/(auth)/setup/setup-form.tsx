"use client";

import { useActionState } from "react";
import { createFirstOwner } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export function SetupForm() {
  const [state, action] = useActionState(createFirstOwner, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Your name" htmlFor="full_name" error={errors.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" required autoFocus />
      </Field>
      <Field label="Work email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm_password">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create owner account
      </SubmitButton>
    </form>
  );
}
