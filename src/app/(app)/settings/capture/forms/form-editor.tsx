"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, buttonClass, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DEFAULT_FIELD_LABELS, FORM_FIELD_KEYS, type FormField, type FormFieldKey } from "@/lib/capture-fields";
import type { FormState } from "@/lib/forms";

type Option = { id: string; name: string };

export type CaptureFormValues = {
  name: string;
  fields: FormField[];
  default_stage_id: string;
  default_source_id: string;
  owner_mode: "org_owner" | "fixed" | "round_robin";
  default_owner_id: string;
  consent_text: string;
  redirect_url: string;
  allowed_origins: string;
  notify_owner: boolean;
  is_active: boolean;
};

type FieldRow = { key: FormFieldKey; label: string; included: boolean; required: boolean };

export function CaptureFormEditor({
  action,
  initial,
  stages,
  sources,
  members,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: CaptureFormValues;
  stages: Option[];
  sources: Option[];
  members: Option[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [ownerMode, setOwnerMode] = useState(initial.owner_mode);
  // Every known field, in the saved order first, then the rest switched off.
  const [rows, setRows] = useState<FieldRow[]>(() => [
    ...initial.fields.map((f) => ({ ...f, included: true })),
    ...FORM_FIELD_KEYS.filter((k) => !initial.fields.some((f) => f.key === k)).map((key) => ({
      key,
      label: DEFAULT_FIELD_LABELS[key],
      included: false,
      required: false,
    })),
  ]);
  const errors = state.fieldErrors ?? {};
  const update = (key: FormFieldKey, patch: Partial<FieldRow>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const fieldsJson = JSON.stringify(rows.filter((r) => r.included).map(({ key, label, required }) => ({ key, label: label.trim() || DEFAULT_FIELD_LABELS[key], required })));

  return (
    <form key={JSON.stringify(initial)} action={formAction} className="space-y-8">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="fields" value={fieldsJson} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Form name" htmlFor="name" error={errors.name} hint="Shown in lead titles, e.g. “Contact form — Ana Popescu”.">
          <Input id="name" name="name" defaultValue={initial.name} maxLength={80} required />
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={initial.is_active} />
            Accepting submissions
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notify_owner" defaultChecked={initial.notify_owner} />
            Email the lead&apos;s owner about each submission
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Fields</legend>
        {errors.fields ? <p className="mb-2 text-sm text-red-600 dark:text-red-400">{errors.fields}</p> : null}
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2">
              <input type="checkbox" aria-label={`Show ${DEFAULT_FIELD_LABELS[row.key]}`} checked={row.included} onChange={(e) => update(row.key, { included: e.target.checked })} />
              <Input
                aria-label={`Label for ${DEFAULT_FIELD_LABELS[row.key]}`}
                value={row.label}
                onChange={(e) => update(row.key, { label: e.target.value })}
                disabled={!row.included}
                maxLength={60}
                className="h-9"
              />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <input type="checkbox" checked={row.required} disabled={!row.included} onChange={(e) => update(row.key, { required: e.target.checked })} />
                Required
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium sm:col-span-2">New leads from this form</legend>
        <Field label="Start in stage" htmlFor="default_stage_id">
          <Select id="default_stage_id" name="default_stage_id" defaultValue={initial.default_stage_id}>
            <option value="">First stage</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source" htmlFor="default_source_id">
          <Select id="default_source_id" name="default_source_id" defaultValue={initial.default_source_id}>
            <option value="">—</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assign to" htmlFor="owner_mode">
          <Select id="owner_mode" name="owner_mode" value={ownerMode} onChange={(e) => setOwnerMode(e.target.value as CaptureFormValues["owner_mode"])}>
            <option value="org_owner">The organization owner</option>
            <option value="fixed">A specific person</option>
            <option value="round_robin">Take turns (round robin)</option>
          </Select>
        </Field>
        {ownerMode === "fixed" ? (
          <Field label="Person" htmlFor="default_owner_id">
            <Select id="default_owner_id" name="default_owner_id" defaultValue={initial.default_owner_id || members[0]?.id}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </fieldset>

      <Field
        label="Consent checkbox (optional)"
        htmlFor="consent_text"
        error={errors.consent_text}
        hint="If set, visitors must tick this before sending. The text and time are saved on the contact (GDPR)."
      >
        <Textarea
          id="consent_text"
          name="consent_text"
          defaultValue={initial.consent_text}
          rows={2}
          maxLength={1000}
          placeholder="I agree that my details are stored to answer my enquiry."
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="After sending, go to (optional)" htmlFor="redirect_url" error={errors.redirect_url} hint="Your own thank-you page. Leave empty for a built-in message.">
          <Input id="redirect_url" name="redirect_url" type="url" defaultValue={initial.redirect_url} placeholder="https://example.com/thanks" />
        </Field>
        <Field
          label="Allowed websites (optional)"
          htmlFor="allowed_origins"
          error={errors.allowed_origins}
          hint="One per line. If set, only these sites can post to the form. The hosted page always works."
        >
          <Textarea id="allowed_origins" name="allowed_origins" defaultValue={initial.allowed_origins} rows={2} placeholder="https://example.com" />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Link href="/settings/capture" className={buttonClass("ghost")}>
          Back
        </Link>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
