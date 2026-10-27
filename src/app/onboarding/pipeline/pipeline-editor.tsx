"use client";

import { useActionState, useState } from "react";
import { savePipeline } from "../actions";
import { BackLink } from "../wizard-frame";
import { Alert, Button, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type EditableStage = {
  key: string;
  id?: string;
  name: string;
  probability: number;
  kind: "open" | "won" | "lost";
};

export function PipelineEditor({ initial }: { initial: EditableStage[] }) {
  const [state, action] = useActionState(savePipeline, {});
  const [stages, setStages] = useState(initial);

  const open = stages.filter((s) => s.kind === "open");
  const closed = stages.filter((s) => s.kind !== "open");

  const update = (key: string, patch: Partial<EditableStage>) =>
    setStages((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const move = (key: string, delta: -1 | 1) =>
    setStages((all) => {
      const openStages = all.filter((s) => s.kind === "open");
      const i = openStages.findIndex((s) => s.key === key);
      const j = i + delta;
      if (j < 0 || j >= openStages.length) return all;
      [openStages[i], openStages[j]] = [openStages[j], openStages[i]];
      return [...openStages, ...all.filter((s) => s.kind !== "open")];
    });

  const remove = (key: string) => setStages((all) => all.filter((s) => s.key !== key));

  const add = () =>
    setStages((all) => [
      ...all.filter((s) => s.kind === "open"),
      { key: crypto.randomUUID(), name: "", probability: 50, kind: "open" },
      ...all.filter((s) => s.kind !== "open"),
    ]);

  const payload = JSON.stringify(
    stages.map(({ id, name, probability, kind }) => ({ id, name: name.trim(), probability, kind })),
  );

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="stages" value={payload} />

      <section>
        <div className="mb-2 grid grid-cols-[1fr_6.5rem_5.5rem] gap-2 px-1 text-xs font-medium text-zinc-500">
          <span>Open stages</span>
          <span>Win chance</span>
          <span className="sr-only">Actions</span>
        </div>
        <ol className="space-y-2">
          {open.map((stage, i) => (
            <li key={stage.key} className="grid grid-cols-[1fr_6.5rem_5.5rem] items-center gap-2">
              <Input
                aria-label={`Stage ${i + 1} name`}
                value={stage.name}
                onChange={(e) => update(stage.key, { name: e.target.value })}
                placeholder="Stage name"
                maxLength={60}
                required
              />
              <div className="relative">
                <Input
                  aria-label={`Stage ${i + 1} win probability`}
                  type="number"
                  min={0}
                  max={100}
                  value={stage.probability}
                  onChange={(e) => update(stage.key, { probability: Number(e.target.value) })}
                  className="pr-7"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">%</span>
              </div>
              <div className="flex">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(stage.key, -1)}>
                  ↑
                </IconButton>
                <IconButton label="Move down" disabled={i === open.length - 1} onClick={() => move(stage.key, 1)}>
                  ↓
                </IconButton>
                <IconButton label="Remove stage" disabled={open.length === 1} onClick={() => remove(stage.key)}>
                  ×
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="ghost" className="mt-2 -ml-2" onClick={add}>
          + Add stage
        </Button>
      </section>

      <section>
        <p className="mb-2 px-1 text-xs font-medium text-zinc-500">Closed stages</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {closed.map((stage) => (
            <div key={stage.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className={stage.kind === "won" ? "size-2 shrink-0 rounded-full bg-emerald-500" : "size-2 shrink-0 rounded-full bg-zinc-400"}
              />
              <Input
                aria-label={stage.kind === "won" ? "Won stage name" : "Lost stage name"}
                value={stage.name}
                onChange={(e) => update(stage.key, { name: e.target.value })}
                maxLength={60}
                required
              />
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-sm text-zinc-500">
          Leads moved here are marked won or lost. Lost leads ask for a reason.
        </p>
      </section>

      <div className="flex items-center justify-between pt-2">
        <BackLink to="organization" />
        <SubmitButton pendingLabel="Saving…">Continue</SubmitButton>
      </div>
    </form>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" aria-label={label} title={label} className="h-10 w-8 px-0 text-base" {...props}>
      {children}
    </Button>
  );
}
