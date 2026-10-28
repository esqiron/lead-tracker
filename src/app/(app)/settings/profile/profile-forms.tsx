"use client";

import { useActionState, useState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MIN_PASSWORD_LENGTH, type FormState } from "@/lib/forms";
import { changePassword, updateProfile } from "../actions";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form key={fullName} action={action} className="space-y-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="full_name" error={state.fieldErrors?.full_name}>
          <Input id="full_name" name="full_name" defaultValue={fullName} autoComplete="name" maxLength={120} required />
        </Field>
        <Field label="Email" htmlFor="email" hint="Ask the owner if this needs to change.">
          <Input id="email" value={email} readOnly disabled />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  // Remount after success so the password fields clear.
  const [formKey, setFormKey] = useState(0);
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await changePassword(prev, formData);
    if (result.message) setFormKey((k) => k + 1);
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form key={formKey} action={action} className="space-y-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Current password" htmlFor="current_password" error={errors.current_password}>
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required className="sm:w-80" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="New password" htmlFor="password" error={errors.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_password">
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
      </div>
    </form>
  );
}
