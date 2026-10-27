"use client";

import { useActionState, useState } from "react";
import { sendInvitations, type InviteState } from "../actions";
import { Alert, Button, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Row = { key: string };

const newRow = (): Row => ({ key: crypto.randomUUID() });

export function InviteForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [rows, setRows] = useState<Row[]>(() => [{ key: "first" }]);
  const [state, action] = useActionState<InviteState, FormData>(async (prev, formData) => {
    const result = await sendInvitations(prev, formData);
    // Clear the form once invitations went out.
    if (result.results?.length && !result.error) setRows([newRow()]);
    return result;
  }, {});

  return (
    <div className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.results?.length ? <InviteResults results={state.results} emailEnabled={emailEnabled} /> : null}

      <form action={action} className="space-y-3">
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.key} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Input name="email" type="email" aria-label={`Email ${i + 1}`} placeholder="name@company.com" autoComplete="off" />
              </div>
              <div className="w-32 shrink-0">
                <Select name="role" aria-label={`Role ${i + 1}`} defaultValue="member">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                aria-label="Remove row"
                title="Remove"
                className="w-10 shrink-0 px-0 text-base"
                disabled={rows.length === 1}
                onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" className="-ml-2" onClick={() => setRows((all) => [...all, newRow()])}>
            + Add another
          </Button>
          <SubmitButton variant="secondary" pendingLabel="Inviting…">
            {emailEnabled ? "Send invitations" : "Create invite links"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function InviteResults({ results, emailEnabled }: { results: NonNullable<InviteState["results"]>; emailEnabled: boolean }) {
  const needLinks = results.filter((r) => !r.emailed);
  const sent = results.filter((r) => r.emailed);

  return (
    <div className="space-y-3">
      {sent.length ? (
        <Alert tone="success">
          Invitation{sent.length > 1 ? "s" : ""} sent to {sent.map((r) => r.email).join(", ")}.
        </Alert>
      ) : null}
      {needLinks.length ? (
        <Alert tone="info">
          <p className="mb-2">
            {emailEnabled
              ? "Some emails couldn't be sent. Share these links instead:"
              : "Share each link with the person it's for. You won't see these links again:"}
          </p>
          <ul className="space-y-2">
            {needLinks.map((r) => (
              <li key={r.email}>
                <p className="font-medium">{r.email}</p>
                <CopyField value={r.url} />
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex gap-2">
      <Input readOnly value={value} aria-label="Invite link" className="h-9 font-mono text-xs" onFocus={(e) => e.target.select()} />
      <Button
        type="button"
        variant="secondary"
        className="h-9 shrink-0"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
