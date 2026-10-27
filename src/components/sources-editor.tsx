"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { SubmitButton } from "@/components/submit-button";

type EditableSource = { key: string; id?: string; name: string };

export function SourcesEditor({
  initial,
  action: saveAction,
  back,
  submitLabel,
}: {
  initial: EditableSource[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  back?: ReactNode;
  submitLabel: string;
}) {
  const [state, action] = useActionState(saveAction, {});
  const [sources, setSources] = useState(initial);

  const payload = JSON.stringify(sources.map(({ id, name }) => ({ id, name: name.trim() })));

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="sources" value={payload} />

      <ul className="space-y-2">
        {sources.map((source, i) => (
          <li key={source.key} className="flex items-center gap-2">
            <Input
              aria-label={`Source ${i + 1}`}
              value={source.name}
              onChange={(e) =>
                setSources((all) => all.map((s) => (s.key === source.key ? { ...s, name: e.target.value } : s)))
              }
              placeholder="e.g. Google Ads"
              maxLength={60}
              required
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove ${source.name || "source"}`}
              title="Remove"
              className="w-10 shrink-0 px-0 text-base"
              onClick={() => setSources((all) => all.filter((s) => s.key !== source.key))}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        className="-ml-2"
        onClick={() => setSources((all) => [...all, { key: crypto.randomUUID(), name: "" }])}
      >
        + Add source
      </Button>

      <div className="flex items-center justify-between pt-2">
        {back ?? <span />}
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
