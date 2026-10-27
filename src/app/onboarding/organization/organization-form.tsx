"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveOrganization } from "../actions";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CURRENCIES, DATE_FORMATS } from "@/lib/org-options";

type Initial = { name: string; currency: string; timezone: string; dateFormat: string };

export function OrganizationForm({ timezones, initial }: { timezones: string[]; initial?: Initial }) {
  const [state, action] = useActionState(saveOrganization, {});
  const errors = state.fieldErrors ?? {};
  const timezoneRef = useRef<HTMLSelectElement>(null);

  // New orgs default to the browser's time zone.
  useEffect(() => {
    if (initial || !timezoneRef.current) return;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezones.includes(browserTz)) timezoneRef.current.value = browserTz;
  }, [initial, timezones]);

  return (
    <form action={action} className="space-y-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Organization name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" defaultValue={initial?.name} placeholder="Acme Inc." maxLength={120} required autoFocus />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Currency" htmlFor="currency" error={errors.currency} hint="Default for new leads.">
          <Select id="currency" name="currency" defaultValue={initial?.currency ?? "EUR"}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date format" htmlFor="date_format">
          <Select id="date_format" name="date_format" defaultValue={initial?.dateFormat ?? "yyyy-MM-dd"}>
            {DATE_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.example}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Time zone" htmlFor="timezone" error={errors.timezone} hint="Used for reports and due dates.">
        <Select id="timezone" name="timezone" ref={timezoneRef} defaultValue={initial?.timezone ?? "UTC"}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end pt-2">
        <SubmitButton pendingLabel="Saving…">Continue</SubmitButton>
      </div>
    </form>
  );
}
