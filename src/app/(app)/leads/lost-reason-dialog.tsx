"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";

const COMMON_REASONS = ["Price", "Went with a competitor", "No budget", "Bad timing", "No response", "Not a fit"];

// Asked whenever a lead moves to the Lost stage.
export function LostReasonDialog({
  open,
  leadTitle,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  leadTitle?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <form
        method="dialog"
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(reason);
          setReason("");
        }}
      >
        <div>
          <h2 className="text-lg font-semibold">Why was it lost?</h2>
          {leadTitle ? <p className="mt-1 truncate text-sm text-zinc-500">{leadTitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={
                reason === r
                  ? "rounded-full border border-zinc-900 bg-zinc-900 px-2.5 py-1 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }
            >
              {r}
            </button>
          ))}
        </div>
        <Input aria-label="Lost reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or type a reason" maxLength={200} required autoFocus />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Mark as lost</Button>
        </div>
      </form>
    </dialog>
  );
}
