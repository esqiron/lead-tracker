"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, buttonClass, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

type Option = { id: string; name: string };
type StageOption = Option & { is_won: boolean; is_lost: boolean };

export type LeadFormValues = {
  title: string;
  contact_id: string;
  company: string;
  value: string;
  stage_id: string;
  source_id: string;
  owner_id: string;
  expected_close_date: string;
  lost_reason: string;
};

export function LeadForm({
  action,
  initial,
  stages,
  sources,
  members,
  contacts,
  companies,
  currency,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: LeadFormValues;
  stages: StageOption[];
  sources: Option[];
  members: Option[];
  contacts: (Option & { email: string | null })[];
  companies: string[];
  currency: string;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [contactId, setContactId] = useState(initial.contact_id);
  const [stageId, setStageId] = useState(initial.stage_id);
  const errors = state.fieldErrors ?? {};
  const stage = stages.find((s) => s.id === stageId);

  return (
    <form action={formAction} className="space-y-8">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <section className="space-y-5">
        <Field label="Lead name" htmlFor="title" error={errors.title} hint="What's being sold, e.g. “Website redesign — Acme”.">
          <Input id="title" name="title" defaultValue={initial.title} maxLength={200} required autoFocus />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`Value (${currency})`} htmlFor="value" error={errors.value}>
            <Input id="value" name="value" inputMode="decimal" defaultValue={initial.value} placeholder="0" />
          </Field>
          <Field label="Expected close" htmlFor="expected_close_date">
            <Input id="expected_close_date" name="expected_close_date" type="date" defaultValue={initial.expected_close_date} />
          </Field>
          <Field label="Stage" htmlFor="stage_id" error={errors.stage_id}>
            <Select id="stage_id" name="stage_id" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="source_id">
            <Select id="source_id" name="source_id" defaultValue={initial.source_id}>
              <option value="">—</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owner" htmlFor="owner_id">
            <Select id="owner_id" name="owner_id" defaultValue={initial.owner_id}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          {stage?.is_lost ? (
            <Field label="Lost reason" htmlFor="lost_reason">
              <Input id="lost_reason" name="lost_reason" defaultValue={initial.lost_reason} maxLength={200} required />
            </Field>
          ) : null}
        </div>
      </section>

      <section className="space-y-5 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Who&apos;s it with?</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contact" htmlFor="contact_id">
            <Select id="contact_id" name="contact_id" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">No contact</option>
              <option value="new">+ New contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email && c.email !== c.name ? ` (${c.email})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Company" htmlFor="company" hint={contactId && contactId !== "new" ? "Leave empty to use the contact's company." : undefined}>
            <Input id="company" name="company" list="company-options" defaultValue={initial.company} maxLength={200} autoComplete="off" />
            <datalist id="company-options">
              {companies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        {contactId === "new" ? (
          <div className="grid gap-5 rounded-lg border border-zinc-200 p-4 sm:grid-cols-2 dark:border-zinc-800">
            <Field label="First name" htmlFor="contact_first_name" error={errors.contact_first_name}>
              <Input id="contact_first_name" name="contact_first_name" autoComplete="off" />
            </Field>
            <Field label="Last name" htmlFor="contact_last_name">
              <Input id="contact_last_name" name="contact_last_name" autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="contact_email" error={errors.contact_email} hint="If this email already exists, the lead is linked to that contact.">
              <Input id="contact_email" name="contact_email" type="email" autoComplete="off" />
            </Field>
            <Field label="Phone" htmlFor="contact_phone">
              <Input id="contact_phone" name="contact_phone" type="tel" autoComplete="off" />
            </Field>
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
