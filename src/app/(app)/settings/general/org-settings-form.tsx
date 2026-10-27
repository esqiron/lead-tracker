"use client";

import { useActionState } from "react";
import { Alert, Card, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CURRENCIES, DATE_FORMATS } from "@/lib/org-options";
import { deleteOrganization, updateOrganization } from "../actions";

type Values = { name: string; currency: string; timezone: string; dateFormat: string; leadVisibility: "all" | "own" };

const VISIBILITY = [
  { value: "all", label: "Everyone sees all leads", description: "Members can see and work every lead, contact and company." },
  { value: "own", label: "Members see only their own", description: "Members see records they own. Owners, admins and viewers still see everything." },
] as const;

export function OrgSettingsForm({ initial, timezones }: { initial: Values; timezones: string[] }) {
  const [state, action] = useActionState(updateOrganization, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Organization name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" defaultValue={initial.name} maxLength={120} required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Currency" htmlFor="currency" error={errors.currency}>
          <Select id="currency" name="currency" defaultValue={initial.currency}>
            {(CURRENCIES.includes(initial.currency) ? CURRENCIES : [initial.currency, ...CURRENCIES]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date format" htmlFor="date_format">
          <Select id="date_format" name="date_format" defaultValue={initial.dateFormat}>
            {DATE_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.example}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time zone" htmlFor="timezone">
          <Select id="timezone" name="timezone" defaultValue={initial.timezone}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Lead visibility</legend>
        <div className="space-y-2">
          {VISIBILITY.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 p-3 has-checked:border-zinc-900 dark:border-zinc-800 dark:has-checked:border-zinc-300"
            >
              <input type="radio" name="lead_visibility" value={option.value} defaultChecked={initial.leadVisibility === option.value} className="mt-1" />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-sm text-zinc-500">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.lead_visibility ? <p className="mt-1 text-sm text-red-600">{errors.lead_visibility}</p> : null}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteOrganizationCard({ orgName }: { orgName: string }) {
  const [state, action] = useActionState(deleteOrganization, {});
  return (
    <Card className="border-red-200 p-5 dark:border-red-900">
      <h2 className="font-medium text-red-700 dark:text-red-400">Delete organization</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Permanently deletes {orgName} with all its leads, contacts, activities and invitations. Members keep their accounts. This can&apos;t be undone.
      </p>
      <form action={action} className="mt-4 space-y-3">
        {state.error ? <Alert>{state.error}</Alert> : null}
        <Field label={`Type ${orgName} to confirm`} htmlFor="confirm" error={state.fieldErrors?.confirm}>
          <Input id="confirm" name="confirm" autoComplete="off" />
        </Field>
        <SubmitButton variant="danger" className="border border-red-300 dark:border-red-800" pendingLabel="Deleting…">
          Delete organization
        </SubmitButton>
      </form>
    </Card>
  );
}
