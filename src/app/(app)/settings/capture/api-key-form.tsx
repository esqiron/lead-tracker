"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { CopyField } from "@/components/copy-field";
import { SubmitButton } from "@/components/submit-button";
import { createApiKey, type ApiKeyState } from "./actions";

export function ApiKeyForm() {
  const [state, action] = useActionState<ApiKeyState, FormData>(createApiKey, {});
  return (
    <div className="space-y-3">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.key ? (
        <Alert tone="success">
          <p className="font-medium">{state.message} Copy it now: it won&apos;t be shown again.</p>
          <CopyField value={state.key} label="New API key" />
        </Alert>
      ) : null}
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <Field label="New key name" htmlFor="key_name" error={state.fieldErrors?.name}>
            <Input id="key_name" name="name" placeholder="e.g. Website, Zapier" maxLength={80} required />
          </Field>
        </div>
        <SubmitButton variant="secondary" pendingLabel="Creating…">
          Create API key
        </SubmitButton>
      </form>
    </div>
  );
}
