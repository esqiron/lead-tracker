"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, buttonClass, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export type ContactFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  owner_id: string;
  tags: string;
  notes: string;
};

export function ContactForm({
  action,
  initial,
  members,
  companies,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: ContactFormValues;
  members: { id: string; name: string }[];
  companies: string[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={errors.first_name}>
          <Input id="first_name" name="first_name" defaultValue={initial.first_name} autoComplete="off" autoFocus />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <Input id="last_name" name="last_name" defaultValue={initial.last_name} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" name="email" type="email" defaultValue={initial.email} autoComplete="off" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} autoComplete="off" />
        </Field>
        <Field label="Job title" htmlFor="title">
          <Input id="title" name="title" defaultValue={initial.title} autoComplete="off" />
        </Field>
        <Field label="Company" htmlFor="company" hint="Pick an existing company or type a new one.">
          <Input id="company" name="company" list="company-options" defaultValue={initial.company} maxLength={200} autoComplete="off" />
          <datalist id="company-options">
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
        <Field label="Tags" htmlFor="tags" hint="Separate with commas.">
          <Input id="tags" name="tags" defaultValue={initial.tags} placeholder="vip, newsletter" autoComplete="off" />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={initial.notes} rows={4} maxLength={5000} />
      </Field>
      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
