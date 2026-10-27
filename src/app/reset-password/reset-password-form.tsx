"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(auth)/actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="New password" htmlFor="password" error={state.fieldErrors?.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required autoFocus />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm_password">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
