"use client";

import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Field, Select } from "@/components/ui";
import { CopyField } from "@/components/copy-field";
import { SubmitButton } from "@/components/submit-button";
import { changeMemberRole, removeMember, sendMemberPasswordReset, transferOwnership, type ResetState } from "../actions";

export function RoleSelect({ membershipId, role, name }: { membershipId: string; role: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Select
        aria-label={`Role for ${name}`}
        defaultValue={role}
        disabled={pending}
        className="h-8 w-28 text-xs"
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          startTransition(async () => {
            const result = await changeMemberRole(membershipId, next);
            if (result.error) setError(result.error);
          });
        }}
      >
        <option value="admin">Admin</option>
        <option value="member">Member</option>
        <option value="viewer">Viewer</option>
      </Select>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

export function RemoveMemberButton({ membershipId, name, isSelf }: { membershipId: string; name: string; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        variant="danger"
        className="h-8 px-2 text-xs"
        disabled={pending}
        onClick={() => {
          const question = isSelf ? "Leave this organization? You'll need a new invite to come back." : `Remove ${name}? Records they own stay in the organization.`;
          if (!window.confirm(question)) return;
          setError(null);
          startTransition(async () => {
            const result = await removeMember(membershipId);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? "…" : isSelf ? "Leave" : "Remove"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, action] = useActionState<ResetState>(() => sendMemberPasswordReset(userId), {});
  return (
    <form action={action}>
      <SubmitButton variant="ghost" className="h-8 px-2 text-xs" pendingLabel="Sending…">
        Reset password
      </SubmitButton>
      {state.error ? <p className="mt-1 max-w-56 text-xs text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.message && !state.link ? <p className="mt-1 max-w-56 text-xs text-emerald-700 dark:text-emerald-400">{state.message}</p> : null}
      {state.link ? (
        <div className="mt-2 w-72 max-w-full text-xs">
          <p className="text-zinc-500">{state.message}</p>
          <CopyField value={state.link} label="Password reset link" />
        </div>
      ) : null}
    </form>
  );
}

export function TransferOwnershipForm({ candidates }: { candidates: { id: string; name: string }[] }) {
  const [state, action] = useActionState(transferOwnership, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Transfer ownership? You'll become an admin and can't undo this yourself.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <Field label="New owner" htmlFor="user_id">
            <Select id="user_id" name="user_id" defaultValue="">
              <option value="" disabled>
                Pick a member…
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <SubmitButton variant="secondary" pendingLabel="Transferring…">
          Transfer ownership
        </SubmitButton>
      </div>
    </form>
  );
}
