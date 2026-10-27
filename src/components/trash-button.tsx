"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function TrashButton({ action, confirmText }: { action: () => Promise<FormState>; confirmText: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="contents"
    >
      <SubmitButton variant="danger" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
      {state.error ? (
        <div className="basis-full">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
    </form>
  );
}
