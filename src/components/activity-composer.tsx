"use client";

import { useActionState, useState } from "react";
import { addActivity } from "@/app/(app)/activities/actions";
import { Alert, cx, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

const TYPES = [
  { value: "note", label: "Note", placeholder: "Add a note…" },
  { value: "call", label: "Call", placeholder: "What was discussed on the call?" },
  { value: "meeting", label: "Meeting", placeholder: "Meeting notes…" },
  { value: "email", label: "Email", placeholder: "Summary of the email…" },
  { value: "task", label: "Task", placeholder: "What needs to happen next?" },
] as const;

export function ActivityComposer({
  leadId,
  contactId,
  path,
  members,
  currentUserId,
}: {
  leadId?: string;
  contactId?: string;
  path: string;
  members: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("note");
  // Bumping the key remounts the form, clearing it after a successful save.
  const [formKey, setFormKey] = useState(0);
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await addActivity(prev, formData);
    if (result.message) setFormKey((k) => k + 1);
    return result;
  }, {});
  const current = TYPES.find((t) => t.value === type)!;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div role="tablist" aria-label="Activity type" className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-2 pt-2 dark:border-zinc-800">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={type === t.value}
            onClick={() => setType(t.value)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              type === t.value
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form key={formKey} action={action} className="space-y-3 p-3">
        {state.error ? <Alert>{state.error}</Alert> : null}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="path" value={path} />
        {leadId ? <input type="hidden" name="lead_id" value={leadId} /> : null}
        {contactId ? <input type="hidden" name="contact_id" value={contactId} /> : null}
        <Textarea name="body" aria-label={current.label} placeholder={current.placeholder} rows={3} maxLength={5000} />
        {state.fieldErrors?.body ? <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.body}</p> : null}
        {type === "task" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Due" htmlFor="due_at">
              <Input id="due_at" name="due_at" type="datetime-local" className="h-9" />
            </Field>
            <Field label="Assigned to" htmlFor="assigned_to">
              <Select id="assigned_to" name="assigned_to" defaultValue={currentUserId} className="h-9">
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
        <div className="flex justify-end">
          <SubmitButton className="h-9" pendingLabel="Saving…">
            {type === "task" ? "Add task" : `Log ${current.label.toLowerCase()}`}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
