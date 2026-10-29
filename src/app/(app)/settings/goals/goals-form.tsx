"use client";

import { useActionState, useState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { saveGoals } from "../actions";

export function GoalsForm({
  quarter,
  quarterName,
  currency,
  team,
  members,
}: {
  quarter: string;
  quarterName: string;
  currency: string;
  team: string;
  members: { id: string; name: string; amount: string }[];
}) {
  const [state, action] = useActionState(saveGoals, {});
  const [values, setValues] = useState(() => Object.fromEntries(members.map((m) => [m.id, m.amount])));
  const errors = state.fieldErrors ?? {};
  const money = new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 });
  const sum = Object.values(values).reduce((total, v) => total + (Number(v.replace(/[\s,]/g, "")) || 0), 0);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="quarter" value={quarter} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <Field
        label={`Team goal for ${quarterName} (${currency})`}
        htmlFor="team"
        error={errors.team}
        hint={sum ? `Leave blank to use everyone's goals added up: ${money.format(sum)}.` : "Leave blank for no team goal."}
      >
        <Input id="team" name="team" inputMode="decimal" defaultValue={team} placeholder={sum ? String(sum) : "No goal"} className="sm:w-60" />
      </Field>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">Per person ({currency})</legend>
        {members.map((m) => (
          <div key={m.id} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_15rem]">
            <label htmlFor={`goal-${m.id}`} className="truncate text-sm text-zinc-700 dark:text-zinc-300">
              {m.name}
            </label>
            <Input
              id={`goal-${m.id}`}
              name={`user:${m.id}`}
              inputMode="decimal"
              value={values[m.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
              placeholder="No goal"
            />
            {errors[`user:${m.id}`] ? <p className="text-sm text-red-600 sm:col-start-2 dark:text-red-400">{errors[`user:${m.id}`]}</p> : null}
          </div>
        ))}
      </fieldset>

      <SubmitButton>Save goals</SubmitButton>
    </form>
  );
}
