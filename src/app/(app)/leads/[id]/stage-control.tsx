"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Alert, Button, cx } from "@/components/ui";
import { moveLead } from "../actions";
import { LostReasonDialog } from "../lost-reason-dialog";

type Stage = { id: string; name: string; is_won: boolean; is_lost: boolean };

export function StageControl({
  leadId,
  leadTitle,
  stageId,
  stages,
  canEdit,
}: {
  leadId: string;
  leadTitle: string;
  stageId: string;
  stages: Stage[];
  canEdit: boolean;
}) {
  const [current, setCurrent] = useOptimistic(stageId);
  const [, startTransition] = useTransition();
  const [askLost, setAskLost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = stages.filter((s) => !s.is_won && !s.is_lost);
  const won = stages.find((s) => s.is_won);
  const lost = stages.find((s) => s.is_lost);
  const currentStage = stages.find((s) => s.id === current);
  const currentIndex = open.findIndex((s) => s.id === current);

  const move = (target: string, reason?: string) => {
    setError(null);
    startTransition(async () => {
      setCurrent(target);
      const result = await moveLead(leadId, target, reason);
      if (result.error) setError(result.error);
    });
  };

  const choose = (stage: Stage) => {
    if (!canEdit || stage.id === current) return;
    if (stage.is_lost) setAskLost(stage.id);
    else move(stage.id);
  };

  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <ol className="flex flex-1 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800" aria-label="Pipeline stage">
          {open.map((stage, i) => {
            const reached = currentStage && !currentStage.is_lost && (currentStage.is_won || i <= currentIndex);
            return (
              <li key={stage.id} className="min-w-0 flex-1 border-r border-zinc-200 last:border-r-0 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => choose(stage)}
                  disabled={!canEdit}
                  aria-current={stage.id === current ? "step" : undefined}
                  title={stage.name}
                  className={cx(
                    "block h-10 w-full truncate px-2 text-xs font-medium transition-colors disabled:cursor-default",
                    reached
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900",
                  )}
                >
                  {stage.name}
                </button>
              </li>
            );
          })}
        </ol>
        {canEdit ? (
          <div className="flex gap-2">
            {won ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => choose(won)}
                className={cx("flex-1 whitespace-nowrap", current === won.id && "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200")}
              >
                {current === won.id ? `${won.name} ✓` : `Mark ${won.name.toLowerCase()}`}
              </Button>
            ) : null}
            {lost ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => choose(lost)}
                className={cx("flex-1 whitespace-nowrap", current === lost.id && "border-zinc-500 bg-zinc-100 dark:bg-zinc-800")}
              >
                {current === lost.id ? lost.name : `Mark ${lost.name.toLowerCase()}`}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <LostReasonDialog
        open={askLost !== null}
        leadTitle={leadTitle}
        onCancel={() => setAskLost(null)}
        onConfirm={(reason) => {
          if (askLost) move(askLost, reason);
          setAskLost(null);
        }}
      />
    </div>
  );
}
